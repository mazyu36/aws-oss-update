---
title: "sdk-python v1.10.0"
version: "v1.10.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-09-29
summary: "Gemini モデルプロバイダーの追加、MCP ツール仕様への outputSchema サポート、PythonAgentTool のホットリロード対応、ModelCall と ToolCall イベントの安定版化、マルチエージェント用新しい HookEvent、および Gemini と MCP の重要なバグ修正。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.10.0"
---

## 概要

Strands Agents Python SDK v1.10.0 では、Google Gemini モデルプロバイダーのサポート、MCP ツールの outputSchema 対応、関数ベースツールのホットリロード機能、Hook イベントの安定版化、マルチエージェント用 HookEvent の追加など、多数の新機能が追加されました。また、Gemini のイベントループエラーと MCP タイムアウト問題の重要なバグ修正も含まれています。

**リリース:** [v1.10.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.10.0)

## 新機能

### Gemini モデルプロバイダー ([#725](https://github.com/strands-agents/sdk-python/pull/725))

**この機能でできること:**
- Google の Gemini モデル（Gemini 2.5 Flash など）を Strands Agents で使用できるようになりました。Anthropic Claude、OpenAI GPT、Amazon Bedrock と並ぶ新しいモデルプロバイダーです。

**使用例:**

```python
from strands import Agent
from strands.models.gemini import GeminiModel

# Gemini モデルを使用してエージェントを作成
model = GeminiModel(
    model_id="gemini-2.5-flash",
    api_key="your-api-key"  # または環境変数 GOOGLE_API_KEY から取得
)

agent = Agent(
    name="My Gemini Agent",
    model=model,
    instructions="あなたは親切なアシスタントです。"
)

# エージェントを使用
response = agent("こんにちは、元気ですか？")
print(response)

# ストリーミングレスポンスも利用可能
for chunk in agent.stream("長い文章を生成してください"):
    print(chunk, end="", flush=True)
```

**ポイント:**
- Gemini API の主要機能をすべてサポート（ストリーミング、ツール呼び出し、マルチターン会話）
- 今後のリリースで Gemini のビルトインツール（Google Search、Code Execution）やプロンプトキャッシング機能が追加予定です

---

### MCP ツール仕様への outputSchema サポート ([#818](https://github.com/strands-agents/sdk-python/pull/818))

**この機能でできること:**
- MCP（Model Context Protocol）仕様に準拠した outputSchema をツール定義に含められるようになりました。これにより、ツールの期待される出力構造を明示的に定義でき、LLM エージェントがツールの機能とレスポンスをより適切に理解できます。

**使用例:**

```python
from strands.tools.mcp import MCPClient
from strands import Agent

# outputSchema をサポートする MCP サーバーに接続
mcp_client = MCPClient(
    server_params={
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-example"]
    }
)

# outputSchema 付きツールをエージェントで使用
agent = Agent(
    name="MCP Agent",
    tools=[mcp_client]
)

# ツールの outputSchema は内部的に管理され、
# カスタムツールローダーなどで活用できます
response = agent("Use the MCP tool to get information")
```

**ポイント:**
- outputSchema は現在、LLM に自動的に送信されません（将来的に一部のモデルでサポート予定）
- カスタムの動的ツールローダーを作成する際に outputSchema を活用できます
- Bedrock モデルは明示的にサポートされるフィールドのみを管理し、他のプロバイダーは認識しないフィールドを自然にドロップします

---

### PythonAgentTool に supports_hot_reload プロパティを追加 ([#928](https://github.com/strands-agents/sdk-python/pull/928))

**この機能でできること:**
- 関数ベースのツール（TOOL_SPEC + function() パターン）が、コード変更時に自動的にホットリロードされるようになりました。開発中にエージェントを再起動せずにツールの変更を反映できます。

**使用例:**

```python
from strands.tools import Tool

# 関数ベースのツールを定義
def calculate_sum(a: int, b: int) -> int:
    """2つの数値を足し算します"""
    return a + b

# ツールを作成（自動的にホットリロード対応）
calculator_tool = Tool.from_function(calculate_sum)

# supports_hot_reload プロパティが True になります
print(calculator_tool.supports_hot_reload)  # True

# エージェントで使用
from strands import Agent
agent = Agent(tools=[calculator_tool])

# 開発中に calculate_sum 関数を変更しても、
# 次回のエージェント呼び出しで自動的に最新版が使用されます
```

**ポイント:**
- 関数ベースのツールのみが対象です（クラスベースのツールは対象外）
- PR #772 のツールリロードロジックと連携して動作します
- 開発時の生産性が向上します

---

### ModelCall と ToolCall Hook イベントの安定版化 ([#926](https://github.com/strands-agents/sdk-python/pull/926))

**この機能でできること:**
- これまで実験的機能だったモデル呼び出しとツール呼び出しの Hook イベントが、正式に安定版として公開されました。名前も簡潔でわかりやすく変更されています。

**変更内容:**
- `BeforeModelInvocationEvent` → `BeforeModelCallEvent`
- `AfterModelInvocationEvent` → `AfterModelCallEvent`
- `BeforeToolInvocationEvent` → `BeforeToolCallEvent`
- `AfterToolInvocationEvent` → `AfterToolCallEvent`

**使用例:**

```python
from strands.hooks import HookProvider, BeforeModelCallEvent, AfterModelCallEvent
from strands import Agent

class ModelCallLogger(HookProvider):
    """モデル呼び出しをログに記録"""

    def register_hooks(self, registry, **kwargs):
        registry.add_callback(BeforeModelCallEvent, self.before_call)
        registry.add_callback(AfterModelCallEvent, self.after_call)

    async def before_call(self, event: BeforeModelCallEvent):
        print(f"モデル呼び出し開始: {event.request}")

    async def after_call(self, event: AfterModelCallEvent):
        print(f"モデル呼び出し完了: {event.stop_response}")

# エージェントで使用
agent = Agent(
    model=model,
    hook_providers=[ModelCallLogger()]
)

response = agent("こんにちは")
```

**ポイント:**
- 旧名称のイベントはエイリアスとして残っており、後方互換性があります
- 今後数リリースでエイリアスは削除される予定です
- 名前が簡潔になり、BeforeInvocationEvent と混同しにくくなりました

---

### マルチエージェント用の新しい HookEvent ベースクラス ([#925](https://github.com/strands-agents/sdk-python/pull/925))

**この機能でできること:**
- マルチエージェントシステム向けに、Agent プロパティを持たない新しい HookEvent ベースクラスが追加されました。複数のエージェントが関与するイベントで、特定のエージェントインスタンスに依存しない Hook を作成できます。

**使用例:**

```python
from strands.hooks import HookProvider
from strands.multiagent import AgentGraph

# マルチエージェント環境での Hook
class MultiAgentLogger(HookProvider):
    """複数のエージェントにまたがるイベントをログ記録"""

    def register_hooks(self, registry, **kwargs):
        # 新しいベースクラスを使用したイベント処理
        # 特定のエージェントインスタンスに依存しない
        pass

# AgentGraph で使用
graph = AgentGraph(
    agents=[agent1, agent2, agent3],
    hook_providers=[MultiAgentLogger()]
)
```

**ポイント:**
- 既存のシングルエージェント用 Hook は変更なく動作します
- マルチエージェントシステムでより柔軟な Hook 設計が可能になります
- 将来的に Hook システムがマルチエージェントを考慮して設計されます

---

## バグ修正

### Gemini のイベントループクローズエラーを修正 ([#932](https://github.com/strands-agents/sdk-python/pull/932))
- マルチターン会話で Gemini モデルを使用した際に発生していた `RuntimeError: Event loop is closed` エラーを修正
- 複数の同期エージェント呼び出しが順次実行される際、それぞれが新しいイベントループを作成する問題に対応
- 単一の genai.Client インスタンスを再利用する代わりに、各非同期操作ごとに新しいクライアントを作成するように変更
- これにより、マルチターン会話が正常に動作するようになりました

### MCP タイムアウト問題を修正 ([#922](https://github.com/strands-agents/sdk-python/pull/922))
- MCP サーバーがタイムアウトする前にツールが完了しなかった場合、アプリケーションがハングする問題を修正
- MCP クライアントが例外を自動的に発生させない特殊な動作に対応
- メッセージハンドラーを実装し、例外メッセージを適切に処理して発生させるように変更
- これにより、タイムアウトエラーが正しく伝播し、アプリケーションがハングしなくなりました

---

## まとめ

v1.10.0 は、Gemini モデルプロバイダーのサポートと Hook システムの安定化により、Strands Agents の機能を大幅に拡張する重要なリリースです。MCP ツールの outputSchema サポートや関数ベースツールのホットリロード機能により、開発体験も向上しました。また、Gemini と MCP に関する重要なバグ修正により、プロダクション環境での安定性が向上しています。
