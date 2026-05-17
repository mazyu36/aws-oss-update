---
title: "Strands Python SDK v1.34.0 リリース解説"
version: "v1.34.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-03-31
summary: "AgentAsTool によるマルチエージェント構成の簡素化、サーバーサイド会話管理のサポート、OpenAI Responses API のビルトインツール対応、MCP elicitation エラーハンドリングなど、多数の新機能を追加しました。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.34.0"
---

## 概要

このリリースでは、マルチエージェントシステムの構築を大幅に簡素化する AgentAsTool 機能が追加されました。また、OpenAI Responses API でのサーバーサイド会話管理やビルトインツールのサポート、MCP プロトコルの elicitation エラーハンドリングなど、多数の機能強化が含まれています。

**リリース:** [v1.34.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.34.0)

## 新機能

### AgentAsTool - エージェントをツールとして使用 ([#1932](https://github.com/strands-agents/sdk-python/pull/1932))

**この機能でできること:**
- エージェントを別のエージェントのツールとして使用し、マルチエージェントシステムを構築できます

**使用例:**

```python
from strands import Agent

# 専門エージェントの定義
research_agent = Agent(
    name="research_agent",
    description="リサーチタスクを担当するエージェント",
    system_prompt="あなたはリサーチの専門家です。",
)

writer_agent = Agent(
    name="writer_agent",
    description="文章作成を担当するエージェント",
    system_prompt="あなたはライティングの専門家です。",
)

# as_tool() でエージェントをツールとして使用
orchestrator = Agent(
    tools=[
        research_agent.as_tool(
            name="researcher",  # カスタム名（オプション）
            description="リサーチを行う",  # カスタム説明（オプション）
            preserve_context=True,  # コンテキストを保持（オプション）
        ),
        writer_agent.as_tool(),
    ],
)

result = orchestrator("AIの最新動向をリサーチして記事を書いてください")
```

**ポイント:**
- `preserve_context=True` を指定すると、呼び出し間でエージェントのコンテキストが保持されます
- カスタムの `name` や `description` を指定しない場合、エージェントの元の設定が使用されます

---

### Agent インスタンスの自動ラップ ([#1997](https://github.com/strands-agents/sdk-python/pull/1997))

**この機能でできること:**
- `tools` リストに Agent インスタンスを直接渡すと、自動的にツールとしてラップされます

**使用例:**

```python
from strands import Agent

research_agent = Agent(name="research_agent", description="リサーチ担当")
writer_agent = Agent(name="writer_agent", description="ライティング担当")

# 変更前: 明示的に as_tool() を呼び出す必要があった
# orchestrator = Agent(tools=[research_agent.as_tool(), writer_agent.as_tool()])

# 変更後: Agent インスタンスを直接渡せる
orchestrator = Agent(
    tools=[research_agent, writer_agent],  # 自動的にラップされる
)

# 通常のツールとエージェントを混在させることも可能
orchestrator = Agent(
    tools=[search_tool, research_agent, calculator],
)
```

**ポイント:**
- デフォルト設定で十分な場合は直接渡すだけで OK
- カスタマイズが必要な場合は従来通り `.as_tool()` を使用してください
- 既存の `.as_tool()` 呼び出しは引き続き動作します（後方互換性あり）

---

### サーバーサイド会話管理のサポート ([#2004](https://github.com/strands-agents/sdk-python/pull/2004))

**この機能でできること:**
- OpenAI Responses API を使用する際、サーバー側で会話状態を管理できます
- クライアントは毎回全履歴を送信する必要がなくなり、効率が向上します

**使用例:**

```python
from strands import Agent
from strands.models.openai_responses import OpenAIResponsesModel

# stateful=True でサーバーサイド会話管理を有効化
model = OpenAIResponsesModel(
    model_id="gpt-4o",
    stateful=True,  # サーバーが会話状態を管理
)

agent = Agent(model=model, system_prompt="あなたは親切なアシスタントです。")

# 最初のターン
agent("私の名前は Alice です。")
# agent.messages は空（サーバーが履歴を管理）

# 2回目のターン - サーバーが previous_response_id で会話を継続
agent("私の名前は何ですか？")
# サーバーは「Alice」を記憶している
```

**ポイント:**
- `stateful=True` を設定すると、自動的に `NullConversationManager` が使用されます
- セッションマネージャーを使用している場合、`_model_state` が永続化され、プロセス再起動後も会話を継続できます
- Graph や Swarm などのマルチエージェント構成でも `_model_state` が適切に保持されます

---

### OpenAI Responses API のビルトインツールサポート ([#2011](https://github.com/strands-agents/sdk-python/pull/2011))

**この機能でできること:**
- OpenAI Responses API のビルトインツール（web_search、file_search、code_interpreter、mcp、shell など）を関数ツールと併用できます

**使用例:**

```python
from strands import Agent
from strands.models.openai_responses import OpenAIResponsesModel

# web_search ビルトインツールを使用
model = OpenAIResponsesModel(
    model_id="gpt-4o",
    params={"tools": [{"type": "web_search"}]},
)
agent = Agent(model=model)
result = agent("strandsagents.com を検索して、Strands Agents とは何か教えてください。")
# result.message["content"][0]["citationsContent"] に URL 引用が含まれる

# shell ビルトインツール（gpt-5.4 以降でホストコンテナ内で実行）
model = OpenAIResponsesModel(
    model_id="gpt-5.4-mini",
    params={"tools": [{"type": "shell", "environment": {"type": "container_auto"}}]},
)

# MCP サーバーをビルトインツールとして使用
model = OpenAIResponsesModel(
    model_id="gpt-4o",
    params={"tools": [
        {"type": "mcp", "server_label": "my-server", "server_url": "https://example.com/mcp", "require_approval": "never"}
    ]},
)

# ビルトインツールと関数ツールを併用
agent = Agent(model=model, tools=[my_function_tool])
```

**ポイント:**
- ビルトインツールは `params` で設定し、関数ツールは `tools` で設定します
- 両方を指定すると自動的にマージされます
- URL 引用は `citationsContent` フィールドに含まれます

---

### テレメトリでシステムプロンプトを出力 ([#1818](https://github.com/strands-agents/sdk-python/pull/1818))

**この機能でできること:**
- OpenTelemetry の chat スパンにシステムプロンプトが含まれるようになり、モデル呼び出しの完全なプロンプトコンテキストを再構築できます

**使用例:**

```python
from strands.telemetry import Tracer

# start_model_invoke_span で system_prompt を渡せるように
tracer.start_model_invoke_span(
    messages=messages,
    parent_span=span,
    model_id=model_id,
    system_prompt=agent.system_prompt,  # 新しいパラメータ
    system_prompt_content=agent._system_prompt_content,  # 新しいパラメータ
)
```

**ポイント:**
- GenAI セマンティック規約に準拠した出力形式
- レガシー規約では `gen_ai.system.message`、最新の実験的規約では `gen_ai.system_instructions` として出力されます
- 既存のコードとの後方互換性があります（新しい引数はオプション）

---

### MCP elicitation -32042 エラーハンドリング ([#1745](https://github.com/strands-agents/sdk-python/pull/1745))

**この機能でできること:**
- MCP サーバーが OAuth 認証を要求する際の `-32042` (URLElicitationRequiredError) エラーを適切に処理し、認可 URL をユーザーに提示できます

**使用例:**

```python
from strands.tools.mcp import MCPClient

# MCP クライアントが -32042 エラーを検出すると、
# URL_ELICITATION_REQUIRED プレフィックスと認可 URL を含むツール結果を返す

# OAuth フローの例:
# 1. エージェントが LinkedInAuthCode___getUserInfo を呼び出す
# 2. Gateway が -32042 エラーと認可 URL を返す
# 3. LLM がツール結果から URL を抽出してユーザーに提示
# 4. ユーザーがブラウザで OAuth 同意を完了
# 5. エージェントがツールを再試行 → 成功
```

**ポイント:**
- MCP 2025-11-25 仕様の URL Mode Elicitation に対応
- 複数の認可 URL がある場合は改行区切りで含まれます
- 不正なデータや他のエラーコードの場合は従来のエラーハンドリングにフォールバック

---

## バグ修正

### Ollama の入力/出力トークン数の修正 ([#2008](https://github.com/strands-agents/sdk-python/pull/2008))

- `inputTokens` と `outputTokens` が逆になっていた問題を修正
- 修正前: `eval_count`（出力）が `inputTokens` に、`prompt_eval_count`（入力）が `outputTokens` にマッピングされていた
- 修正後: 正しく `prompt_eval_count` が `inputTokens` に、`eval_count` が `outputTokens` にマッピングされるようになりました

---

### OpenAIResponsesModel での reasoning content の処理 ([#2013](https://github.com/strands-agents/sdk-python/pull/2013))

- 推論モデル（gpt-oss、o シリーズ）でマルチターン会話を行う際、2 ターン目で `TypeError` が発生する問題を修正
- メッセージ履歴に含まれる `reasoningContent` ブロックがリクエストフォーマット時に処理されていなかった
- 修正後: reasoning content は警告とともにリクエストからフィルタリングされます
- `response.reasoning_summary_text.delta` イベント（o3、o4-mini などの推論サマリー）のストリーミングキャプチャも追加

## まとめ

このリリースでは、マルチエージェントシステムの構築を簡素化する AgentAsTool と自動ラップ機能、OpenAI Responses API の高度な機能サポート、MCP プロトコルの OAuth フロー対応など、実用的な機能強化が多数追加されました。
