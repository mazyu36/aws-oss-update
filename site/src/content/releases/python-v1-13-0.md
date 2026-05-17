---
title: "Strands Python SDK v1.13.0 リリース解説"
version: "v1.13.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-10-17
summary: "Agent API の invocation_state パラメータ追加、テレメトリの改善（timeToFirstByteMs メトリクス追加）、ツール呼び出し前の割り込み機能、デコレートされたツールでの割り込みサポート、Python 3.10 での例外ノート対応など、重要な新機能とバグ修正を提供。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.13.0"
---

## 概要

Strands Agents Python SDK v1.13.0 では、Agent API の進化を可能にする invocation_state パラメータの追加、テレメトリ機能の強化、ツール実行前の人間の承認を可能にする割り込み機能、Python 3.10 での例外メッセージの改善など、重要な新機能が追加されました。これらの変更により、より柔軟で堅牢なエージェント開発が可能になります。

**リリース:** [v1.13.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.13.0)

## 新機能

### Agent API に invocation_state パラメータを追加 ([#966](https://github.com/strands-agents/sdk-python/pull/966))

**この機能でできること:**
- Agent の __call__、invoke_async、stream_async メソッドに明示的な invocation_state パラメータが追加されました。これにより、将来的な API の拡張時にユーザー提供の kwargs との競合を避けられるようになります。

**使用例:**

```python
from strands import Agent

agent = Agent(
    system_prompt="あなたは役立つアシスタントです",
    tools=[my_tool]
)

# 新しい invocation_state パラメータを使用
response = agent(
    "Hello",
    invocation_state={"user_id": "123", "session_id": "abc"}
)

# ツール内で invocation_state にアクセス可能
from strands.types.tools import ToolContext

@tool(context=True)
def my_tool(tool_context: ToolContext) -> str:
    user_id = tool_context.invocation_state.get("user_id")
    return f"User {user_id} の処理を実行しました"

# 従来の **kwargs も引き続き動作（後方互換性）
response = agent("Hello", user_id="123", session_id="abc")
```

**ポイント:**
- 既存の **kwargs は引き続きサポートされ、invocation_state にマージされます
- 将来の API 拡張時に破壊的変更を避けるため、新しいコードでは invocation_state の使用が推奨されます
- マルチエージェントワークフロー（Graph、Swarm）でも対応しています

---

### テレメトリの強化: timeToFirstByteMs メトリクスと Semantic Conventions の更新 ([#997](https://github.com/strands-agents/sdk-python/pull/997))

**この機能でできること:**
- OpenTelemetry スパンとメトリクスに timeToFirstByteMs（TTFB）が追加され、モデルの応答遅延を測定できるようになりました。また、ツールリクエスト・レスポンスが OpenTelemetry の最新セマンティック規約に準拠しました。

**使用例:**

```python
from strands import Agent
from strands.telemetry import configure_telemetry

# テレメトリを設定
configure_telemetry(
    service_name="my-agent-service",
    enable_metrics=True,
    enable_traces=True
)

agent = Agent(model=model, tools=[my_tool])
response = agent("タスクを実行してください")

# メトリクスには以下が含まれます:
# - timeToFirstByteMs: モデルからの最初のバイトまでの時間
# - gen_ai.tool.description: ツールの説明
# - gen_ai.tool.json_schema: ツールの JSON スキーマ
# これらは OpenTelemetry の標準形式でエクスポートされます
```

**ポイント:**
- timeToFirstByteMs は LLM の応答遅延を測定するための重要な指標です
- ContentBlock、ToolUse、ToolResponse が OpenTelemetry の入出力スキーマに正しくマッピングされます
- Langfuse などの観測性プラットフォームと統合する際に有用です

---

### ツール呼び出し前の割り込み機能 ([#987](https://github.com/strands-agents/sdk-python/pull/987))

**この機能でできること:**
- BeforeToolCallEvent フックから割り込みを発生させ、ツール実行前に人間の承認を求めることができるようになりました。削除操作など、重要なアクションの前にユーザーの確認を取得できます。

**使用例:**

```python
from strands import Agent, tool
from strands.hooks import BeforeToolCallEvent, HookProvider, HookRegistry

@tool
def delete_tool(key: str) -> bool:
    """オブジェクトを削除する"""
    print(f"削除実行: {key}")
    return True

class ToolInterruptHook(HookProvider):
    """重要なツール実行前に承認を求める"""

    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(BeforeToolCallEvent, self.approve)

    def approve(self, event: BeforeToolCallEvent) -> None:
        if event.tool_use["name"] != "delete_tool":
            return

        # 割り込みを発生させて承認を求める
        approval = event.interrupt("for_delete_tool", reason="APPROVAL")
        if approval != "A":
            event.cancel_tool = "承認が得られませんでした"

agent = Agent(
    hooks=[ToolInterruptHook()],
    tools=[delete_tool],
    system_prompt="オブジェクトを削除します"
)

# エージェントを実行
result = agent("キー X のオブジェクトを削除してください")

if result.stop_reason == "interrupt":
    # 割り込みを処理
    interrupts = result.interrupts
    print(f"割り込みが発生しました: {interrupts}")

    # ユーザーに承認を求める
    approval = input(f"(A)承認 または (R)拒否 {interrupts[0].name}: ")

    # 承認レスポンスを渡して再実行
    prompt = [{
        "interruptResponse": {
            "interruptId": interrupts[0].id,
            "response": approval,
        },
    }]
    result = agent(prompt)

print(f"最終結果: {result.message}")
```

**ポイント:**
- 割り込みはツール実行前に発生し、ユーザーの介入を可能にします
- ストリーミングでも割り込みイベントが利用可能です: `event["tool_interrupt_event"]`
- 複数の割り込みを同時に処理できます

---

### デコレートされたツールでの割り込みサポート ([#1041](https://github.com/strands-agents/sdk-python/pull/1041))

**この機能でできること:**
- @tool デコレーターで定義されたツール内から直接割り込みを発生させることができるようになりました。ツールロジック内で動的に承認を求めることが可能です。

**使用例:**

```python
from strands import Agent, tool
from strands.types.tools import ToolContext

@tool(context=True)
def sensitive_operation(operation: str, tool_context: ToolContext) -> str:
    """機密性の高い操作を実行"""

    # ツール内から直接割り込みを発生
    response = tool_context.interrupt(
        "sensitive_op_approval",
        reason=f"{operation} の実行には承認が必要です"
    )

    if response.lower() == "approved":
        return f"{operation} を実行しました"
    else:
        return f"{operation} は拒否されました"

agent = Agent(
    tools=[sensitive_operation],
    callback_handler=None
)

# エージェントを実行
result = agent("データベースをクリアする操作を実行してください")

if result.stop_reason == "interrupt":
    interrupt = result.interrupts[0]
    print(f"承認が必要: {interrupt.reason}")

    # 承認レスポンスを作成
    response = {
        "interruptResponse": {
            "interruptId": interrupt.id,
            "response": "approved"  # または "rejected"
        }
    }

    # 承認を渡して続行
    result = agent([response])
    print(f"結果: {result.message}")
```

**ポイント:**
- ToolContext パラメータが必要です: `@tool(context=True)`
- Python モジュールツールでは割り込みはサポートされていません（デコレートされたツールのみ）
- フック内の割り込みと組み合わせて、多層的な承認フローを実装できます

---

### Python 3.10 での例外ノートサポート ([#1034](https://github.com/strands-agents/sdk-python/pull/1034))

**この機能でできること:**
- Python 3.10 環境で、Bedrock のモデルとリージョン情報が例外メッセージに含まれるようになりました。Python 3.11+ の add_note() メソッドと同等の機能を提供します。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

# Python 3.10 環境でも詳細なエラー情報が表示される
model = BedrockModel(
    model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
    region_name="us-west-2"
)

agent = Agent(model=model)

try:
    response = agent("タスクを実行してください")
except Exception as e:
    # Python 3.10 でも以下のような詳細情報が含まれます:
    # "Error occurred
    #  Model: anthropic.claude-3-5-sonnet-20241022-v2:0
    #  Region: us-west-2"
    print(str(e))
```

**ポイント:**
- Python 3.11+ では引き続き add_note() を使用します
- Python 3.10 では例外メッセージ本体にノート情報が追加されます
- モデルとリージョン情報がエラーメッセージに自動的に含まれるため、デバッグが容易になります

---

## バグ修正

### ToolContext パラメータ名の検証とエラーメッセージの改善 ([#1028](https://github.com/strands-agents/sdk-python/pull/1028))
- ToolContext を使用する際に、@tool デコレーターの context パラメータとの不一致があった場合、不明瞭な Pydantic エラーが発生していた問題を修正しました
- デコレーション時に ToolContext の使用を検証し、明確な TypeError を発生させるようになりました
- 以下のケースでエラーが発生します:
  - `@tool(context=True)` が指定されていない場合
  - パラメータ名が設定された context 名と一致しない場合

---

## まとめ

v1.13.0 は、Agent API の将来的な拡張性を確保する invocation_state パラメータ、パフォーマンス測定を強化するテレメトリの改善、重要なアクションの前に人間の介入を可能にする割り込み機能、Python 3.10 でのエラーメッセージ改善など、重要な新機能を提供します。これらの機能により、より安全で観測性の高いエージェントシステムの構築が可能になります。
