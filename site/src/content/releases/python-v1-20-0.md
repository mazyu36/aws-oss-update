---
title: "Strands Python SDK v1.20.0 リリース解説"
version: "v1.20.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-12-15
summary: "Swarm における Human-in-the-Loop パターンを可能にする Interrupt 機能、フック内での AgentResult アクセス、Structured Output の表示修正、Tool Spec の JSON Schema 対応改善、MCP Client のリソースリーク修正を含むリリースです。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.20.0"
---

## 概要

このリリースでは、マルチエージェントシステムにおける重要な新機能として Swarm Interrupts が追加され、承認フローやユーザーインタラクションを伴う Human-in-the-Loop パターンの実装が可能になりました。また、フックから AgentResult への完全なアクセスが可能になり、より高度な観測性とカスタムハンドリングを実現できます。バグ修正では Structured Output の表示、Tool Spec の JSON Schema 対応、MCP Client のリソース管理が改善されました。

**リリース:** [v1.20.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.20.0)

## 新機能

### Swarm における Interrupt による Human-in-the-Loop サポート ([#1193](https://github.com/strands-agents/sdk-python/pull/1193))

**この機能でできること:**
Swarm マルチエージェントシステムで Interrupt がサポートされ、エージェント実行中にユーザーの承認やインタラクションを必要とする Human-in-the-Loop パターンが実装できるようになりました。BeforeNodeCallEvent フックからのトリガー、またはエージェントツール内で ToolContext を使用した直接トリガーが可能です。

**使用例:**

```python
from strands import Agent, tool
from strands.experimental.hooks.multiagent import BeforeNodeCallEvent
from strands.hooks import HookProvider
from strands.multiagent import Swarm
from strands.multiagent.base import Status
from strands.tools import ToolContext

# 例1: フックからの Interrupt
class ApprovalHook(HookProvider):
    def register_hooks(self, registry):
        registry.add_callback(BeforeNodeCallEvent, self.approve)

    def approve(self, event):
        if event.node_id == "info":
            return

        response = event.interrupt(
            "approval",
            reason=f"{event.node_id} needs approval"
        )
        if response != "APPROVE":
            event.cancel_node = "rejected"

info_agent = Agent(name="info")
weather_agent = Agent(name="weather")
swarm = Swarm([info_agent, weather_agent], hooks=[ApprovalHook()])

result = swarm("What is the weather?")

# Interrupt の処理
while result.status == Status.INTERRUPTED:
    responses = []
    for interrupt in result.interrupts:
        user_input = input(f"{interrupt.reason} (y/N): ")
        responses.append({
            "interruptResponse": {
                "interruptId": interrupt.id,
                "response": user_input
            }
        })
    result = swarm(responses)

print(result.results["weather"].result.message)

# 例2: ツール内からの Interrupt
@tool(context=True)
def get_user_info(tool_context: ToolContext) -> str:
    response = tool_context.interrupt(
        "user_info",
        reason="need user name"
    )
    return f"User: {response}"

user_agent = Agent(name="user", tools=[get_user_info])
swarm = Swarm([user_agent])
result = swarm("Who is the user?")

# 同様に interrupt を処理
while result.status == Status.INTERRUPTED:
    responses = []
    for interrupt in result.interrupts:
        user_input = input(f"{interrupt.reason}: ")
        responses.append({
            "interruptResponse": {
                "interruptId": interrupt.id,
                "response": user_input
            }
        })
    result = swarm(responses)
```

**ポイント:**
- BeforeNodeCallEvent フックでノード実行前に承認フローを挟むことができます
- ツール内で ToolContext を使用してユーザー入力を直接要求できます
- セッション管理された Interrupt もサポートされており、状態を保持したインタラクションが可能です
- 詳細は [Interrupts ドキュメント](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/interrupts/) を参照してください

---

### AfterInvocationEvent での AgentResult アクセス ([#1125](https://github.com/strands-agents/sdk-python/pull/1125))

**この機能でできること:**
AfterInvocationEvent フック内で完全な AgentResult にアクセスできるようになり、エージェントの出力、停止理由、メトリクスに基づいたポスト実行アクションが実装できるようになりました。これにより、より豊富な観測性とエージェント結果のカスタムハンドリングが可能になります。

**使用例:**

```python
from strands import Agent
from strands.hooks import AfterInvocationEvent, HookProvider

class ResultLoggingHook(HookProvider):
    def register_hooks(self, registry):
        registry.add_callback(AfterInvocationEvent, self.log_result)

    def log_result(self, event: AfterInvocationEvent):
        # 完全な AgentResult にアクセス
        if event.result:
            print(f"停止理由: {event.result.stop_reason}")
            print(f"使用トークン: {event.result.usage}")
            print(f"レスポンス: {event.result.text}")

            # Structured Output がある場合
            if event.result.structured_output:
                print(f"構造化出力: {event.result.structured_output}")

agent = Agent(
    system_prompt="You are a helpful assistant.",
    hooks=[ResultLoggingHook()]
)
result = agent("2+2 は何ですか？")
```

**ポイント:**
- エージェント実行後のロギング、モニタリング、アラートの実装に活用できます
- 停止理由（max_tokens、end_turn など）に応じた条件分岐処理が可能です
- トークン使用量の追跡やコスト計算にも利用できます
- event.result は読み取り専用で、イミュータブルです

---

## バグ修正

### Structured Output 表示の修正 ([#1290](https://github.com/strands-agents/sdk-python/pull/1290))

**修正内容:**
AgentResult にテキストコンテンツがなく structured_output のみが存在する場合、`__str__()` メソッドが空文字列ではなく structured output の JSON シリアライゼーションを返すようになりました。

**影響を受けていた状況:**
- `print(agent_result)` を実行しても何も表示されない問題
- マルチエージェントグラフで structured output が次のノードに伝播しない問題

```python
from pydantic import BaseModel, Field
from strands import Agent
from typing import Annotated

class Foo(BaseModel):
    foo: Annotated[str, Field(min_length=1, max_length=10)]
    bar: Annotated[str, Field(min_length=1, max_length=10)]

agent = Agent(
    system_prompt="You are a helpful assistant that converts data into Foo.",
    structured_output_model=Foo,
)
result = agent("Hello")

# 修正前: 空の出力または agent のメッセージが表示される
# 修正後: {"foo":"hello","bar":"world"} のような JSON が表示される
print(result)
```

---

### Tool Spec における JSON Schema Composition Keywords の修正 ([#1301](https://github.com/strands-agents/sdk-python/pull/1301))

**修正内容:**
JSON Schema の composition keywords（anyOf、oneOf、allOf、not）を含むツール仕様の処理を修正しました。これにより、`Optional[List[str]]` などのオプショナルパラメータに対してモデルが文字列エンコードされた JSON を返す問題が解決されました。

**影響を受けていた状況:**
- MCP ツールで `List[str] | None` パラメータを使用すると、モデルが `["foo", "bar"]` の代わりに `'["foo", "bar"]'`（文字列）を返していた
- `_normalize_property()` が composition keywords を持つプロパティに誤って `type: "string"` を追加していた

```python
from strands import Agent, tool
from typing import Optional, List

@tool
def tag_processor(item: str, tags: Optional[List[str]] = None) -> str:
    # tags は list として正しく受け取れる
    if tags:
        return f"Processing {item} with tags: {', '.join(tags)}"
    return f"Processing {item}"

agent = Agent(tools=[tag_processor])

# 修正前: tags が文字列 '["important", "urgent"]' として渡される
# 修正後: tags が正しく ["important", "urgent"] のリストとして渡される
result = agent("Process 'document' with tags 'important' and 'urgent'")
```

---

### MCP Client のリソースリーク修正 ([#1321](https://github.com/strands-agents/sdk-python/pull/1321))

**修正内容:**
MCP Client で asyncio イベントループが適切にクローズされるようになり、ファイルディスクリプタのリークが解消されました。

**影響を受けていた状況:**
- マルチテナントアプリケーションで多数の MCP Client を作成する場合、時間経過とともにファイルディスクリプタがリークしてリソースが枯渇する問題がありました
- イベントループが適切にクローズされていなかったため、長時間実行されるアプリケーションでリソース問題が発生していました

---

## まとめ

v1.20.0 では、マルチエージェントシステムにおける Human-in-the-Loop パターンの実装を可能にする Swarm Interrupts、より豊富な観測性を提供する AfterInvocationEvent の AgentResult アクセスといった重要な新機能が追加されました。また、Structured Output の表示、Tool Spec の JSON Schema 対応、MCP Client のリソース管理に関する重要なバグ修正も含まれており、より安定した開発体験を提供します。
