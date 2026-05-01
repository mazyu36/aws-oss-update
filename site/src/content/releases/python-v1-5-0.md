---
title: "sdk-python v1.5.0"
version: "v1.5.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-08-19
summary: "循環グラフサポート、MCP Client のタイムアウト設定、ToolContext によるツールへのコンテキスト公開、structured_output スパン、Bedrock キャッシュトークンメトリクスなど、多数の新機能とバグ修正を追加。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.5.0"
---

## 概要

Strands Agents Python SDK v1.5.0 では、マルチエージェントグラフで循環グラフがサポートされ、MCP Client のサーバー起動タイムアウトが設定可能になりました。また、デコレータツールから ToolContext を通じてツール実行メタデータにアクセスできるようになり、Amazon Bedrock のキャッシュトークンメトリクスがサポートされました。さらに、いくつかの重要なバグ修正も含まれています。

**リリース:** [v1.5.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.5.0)

## 新機能

### 循環グラフのサポート ([#497](https://github.com/strands-agents/sdk-python/pull/497))

**この機能でできること:**
- マルチエージェントグラフで循環構造が使用できるようになりました。これにより、「特定条件までループ」パターン、フィードバックループ、再帰的エージェントワークフロー、反復改善プロセスなど、より柔軟なエージェントワークフローが実現できます。

**使用例:**

```python
from strands.multiagent import Graph, Agent

# エージェントを定義
research_agent = Agent(name="researcher", description="調査を実行")
review_agent = Agent(name="reviewer", description="結果をレビュー")
refine_agent = Agent(name="refiner", description="結果を改善")

# 循環グラフを作成（レビュー結果に応じて再調査）
graph = Graph()
graph.add_edge(research_agent, review_agent)
graph.add_edge(review_agent, refine_agent)
graph.add_edge(refine_agent, research_agent)  # フィードバックループ

# 条件付きルーティングで終了条件を設定
def should_continue(state):
    """品質が十分な場合は終了"""
    return state.get("quality_score", 0) < 0.8

graph.add_conditional_edge(
    review_agent,
    should_continue,
    {True: refine_agent, False: None}  # None は終了を意味
)
```

**ポイント:**
- 以前は DAG（有向非巡回グラフ）のみサポートされていましたが、循環検証が削除されました
- ループからの脱出条件を適切に設定することが重要です
- 他のすべての検証チェックは引き続き機能します

---

### MCP Client のサーバー起動タイムアウト設定 ([#657](https://github.com/strands-agents/sdk-python/pull/657))

**この機能でできること:**
- MCP サーバーの起動タイムアウトを設定できるようになりました。uv のように実行時に依存関係をインストールする長時間実行型のサーバー起動に対応できます。

**使用例:**

```python
from strands.tools.mcp import MCPClient

# デフォルトのタイムアウトを使用
mcp_client = MCPClient(
    server_params={
        "command": "uvx",
        "args": ["mcp-server-fetch"]
    }
)

# カスタムタイムアウトを設定（秒単位）
mcp_client_long_startup = MCPClient(
    server_params={
        "command": "uvx",
        "args": ["mcp-server-with-heavy-deps"]
    },
    server_init_timeout=120  # 120秒まで待機
)

# Agent で使用
agent = Agent(tools=[mcp_client_long_startup])
```

**ポイント:**
- デフォルトのタイムアウトは 30 秒です
- uv が初回実行時に依存関係をダウンロード・インストールする場合に便利です
- タイムアウトを超えるとエラーが発生します

---

### structured_output スパンの追加 ([#655](https://github.com/strands-agents/sdk-python/pull/655))

**この機能でできること:**
- Agent の structured_output 機能使用時に、メッセージとレスポンスを含む専用のテレメトリスパンが記録されるようになりました。パフォーマンスの可視化とデバッグが容易になります。

**使用例:**

```python
from strands import Agent
from pydantic import BaseModel

class UserProfile(BaseModel):
    name: str
    age: int
    occupation: str

agent = Agent()

# structured_output を使用
result = agent.structured_output(
    "John は 30 歳のソフトウェアエンジニアです",
    output_schema=UserProfile
)

# テレメトリシステム（OpenTelemetry など）で
# "structured_output" という名前のスパンが記録されます
# スパンにはメッセージとレスポンスが含まれます
```

**ポイント:**
- OpenTelemetry や Langfuse などのテレメトリバックエンドで自動的に記録されます
- structured_output の実行時間やトークン使用量が可視化できます
- デバッグ時にメッセージの流れを追跡しやすくなります

---

### ToolContext によるツールへのコンテキスト公開 ([#557](https://github.com/strands-agents/sdk-python/pull/557))

**この機能でできること:**
- `@tool` デコレータを使用したツールが、ToolContext を通じて `tool_use_id` や Agent インスタンスなどの実行メタデータにアクセスできるようになりました。グローバルストレージのインデックス作成やリクエスト追跡が可能になります。

**使用例:**

```python
from strands import tool, Agent
from strands.types.tools import ToolContext

# context=True を指定して ToolContext を注入
@tool(context=True)
def track_execution(query: str, tool_context: ToolContext) -> str:
    """実行履歴を追跡するツール"""
    # tool_use_id にアクセス
    execution_id = tool_context.tool_use_id

    # Agent インスタンスにアクセス
    agent = tool_context.agent

    # 実行履歴を記録
    print(f"Execution {execution_id} by agent {agent.name}")

    return f"Query '{query}' を実行しました"

# カスタムパラメータ名を使用
@tool(context="ctx")
def custom_name_tool(message: str, ctx: ToolContext) -> str:
    """カスタムパラメータ名で ToolContext を受け取る"""
    return f"Tool use ID: {ctx.tool_use_id}"

agent = Agent(tools=[track_execution, custom_name_tool])
response = agent("何か検索して")
```

**ポイント:**
- `context=True` でデフォルトのパラメータ名 `tool_context` を使用
- `context="custom_name"` でカスタムパラメータ名を指定可能
- 既存のツールで `tool_context` という名前のパラメータがある場合は破壊的変更になりません
- モジュールベースやクラスベースのツールでは invocation_state を通じてアクセス可能

---

### Amazon Bedrock のキャッシュトークンメトリクスサポート ([#531](https://github.com/strands-agents/sdk-python/pull/531))

**この機能でできること:**
- Amazon Bedrock でプロンプトキャッシュを使用する際、キャッシュの読み取り/書き込みトークン数が追跡できるようになりました。コスト最適化とパフォーマンス分析が容易になります。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

model = BedrockModel(
    model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
    region_name="us-east-1"
)

agent = Agent(model=model)

# プロンプトキャッシュを使用する呼び出し
response = agent("長いドキュメントを分析してください")

# キャッシュメトリクスにアクセス
usage = response.metrics.accumulated_usage
if usage.get("cacheReadInputTokens"):
    print(f"キャッシュから読み込み: {usage['cacheReadInputTokens']} トークン")
if usage.get("cacheWriteInputTokens"):
    print(f"キャッシュに書き込み: {usage['cacheWriteInputTokens']} トークン")

# 通常の入力トークンも引き続き利用可能
print(f"総入力トークン: {usage['inputTokens']}")

# メトリクスサマリーにもキャッシュ情報が含まれます
print(response.metrics.get_summary())
```

**ポイント:**
- `cacheReadInputTokens` と `cacheWriteInputTokens` はオプションフィールドです
- 既存の Usage オブジェクトとの 100% 後方互換性を維持
- OpenTelemetry テレメトリにもキャッシュトークン情報が記録されます
- Bedrock のプロンプトキャッシュ機能を使用する際に自動的に追跡されます

---

## バグ修正

### prompt=None 時のハング防止と例外処理 ([#643](https://github.com/strands-agents/sdk-python/pull/643))
- Agent に `prompt=None` が渡された際にハングする問題を修正しました
- `BedrockModel._stream` で全ての例外をキャッチし、`await queue.get()` が必ず完了するようにしました
- エラー時の適切なエラーメッセージ表示を改善しました

### モデルが署名を提供した場合のみ設定 ([#682](https://github.com/strands-agents/sdk-python/pull/682))
- Bedrock の gpt-oss モデルなど、signature フィールドをサポートしないモデルで ValidationException が発生する問題を修正しました
- モデルが実際に署名を提供した場合のみ、メッセージに signature を設定するように変更しました
- Claude Sonnet 4 の interleaved-thinking 機能でも正常に動作するようになりました

### SageMaker 依存関係グループに openai を追加 ([#678](https://github.com/strands-agents/sdk-python/pull/678))
- SageMaker を使用する際に openai パッケージが必要だったにもかかわらず、依存関係グループに含まれていなかった問題を修正しました
- `pip install strands[sagemaker]` で openai が自動的にインストールされるようになりました

### アシスタントコンテンツが空の場合に空白テキストを追加 ([#677](https://github.com/strands-agents/sdk-python/pull/677))
- LLM がツール実行後に何も応答しない場合、空のアシスタントコンテンツが原因で Bedrock モデルから ValidationException が発生する問題を修正しました
- アシスタントメッセージのコンテンツ全体が空の場合、空白テキストを自動的に追加するように変更しました
- 会話履歴をできるだけ元の形で保持するため、メッセージはモデル呼び出し前に変更されます

---

## まとめ

v1.5.0 は、マルチエージェントの柔軟性向上、ツールへのコンテキスト情報公開、テレメトリ機能の強化、そして重要なバグ修正を含む安定性向上のリリースです。循環グラフのサポートにより、より高度なエージェントワークフローが実現でき、ToolContext により開発者はツール実行時により豊富な情報にアクセスできるようになりました。
