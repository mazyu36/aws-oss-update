---
title: "sdk-python v1.21.0"
version: "v1.21.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-01-02
summary: "FastAPI/Starlette カスタマイズサポート、ツールレジストリの動的置き換え機能、MCP メタデータサポート、Web/検索結果の引用サポート、Gemini ビルトインツール、カスタム HTTP クライアント対応、会話マネージャーの per_turn パラメータ、フックによるモデル呼び出しリトライ機能など、多数の新機能を追加。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.21.0"
---

## 概要

Strands Agents Python SDK v1.21.0 では、Agent-to-Agent (A2A) サーバーのカスタマイズ性向上、ツールレジストリの動的更新機能、MCP ツール結果のメタデータサポート、引用機能の拡張、Gemini と OpenAI モデルのカスタムクライアント対応、会話マネージャーの柔軟性向上、フックによるモデル呼び出しのリトライ機能など、多数の新機能が追加されました。また、いくつかの重要なバグ修正も含まれています。

**リリース:** [v1.21.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.21.0)

## 新機能

### FastAPI と Starlette コンストラクタへの追加引数サポート ([#1250](https://github.com/strands-agents/sdk-python/pull/1250))

**この機能でできること:**
- A2A サーバーを FastAPI や Starlette に変換する際、コンストラクタに追加のキーワード引数を渡せるようになりました。これにより、ライフサイクルイベント、ドキュメントエンドポイントの有効/無効、デバッグトレースバックなどをカスタマイズできます。

**使用例:**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from strands import Agent
from strands.multiagent.a2a import A2AServer

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションライフサイクル管理"""
    # 起動時の処理
    yield
    # シャットダウン時の処理

agent = Agent(name="My Agent", description="カスタマイズ可能なエージェント")
a2a_server = A2AServer(agent=agent)

# カスタマイズされた FastAPI アプリケーションを作成
app = a2a_server.to_fastapi_app(
    title="My Agent API",
    docs_url="/docs",  # ドキュメントエンドポイントを有効化
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    debug=True,
    lifespan=lifespan  # カスタムライフサイクル関数を指定
)
```

**ポイント:**
- 非推奨となった startup/shutdown イベントハンドラーの代わりに、lifespan 関数を使用できます
- ドキュメントエンドポイントを None に設定することで無効化できます

---

### ToolRegistry に replace メソッドを追加 ([#1182](https://github.com/strands-agents/sdk-python/pull/1182))

**この機能でできること:**
- 実行時にツールの実装を動的に置き換えられるようになりました。ゼロダウンタイムでのツール更新、セッション中のバグ修正、パフォーマンス最適化の展開が可能です。

**使用例:**

```python
from strands.tools.registry import ToolRegistry
from strands.tools import Tool

# 既存のツール
def old_calculator(a: int, b: int) -> int:
    """旧バージョンの計算機"""
    return a + b

# 改善されたツール
def new_calculator(a: int, b: int) -> int:
    """改善版の計算機（より高速）"""
    return a + b  # より効率的な実装

registry = ToolRegistry()
registry.register(Tool.from_function(old_calculator, name="calculator"))

# ツールを動的に置き換え
new_tool = Tool.from_function(new_calculator, name="calculator")
registry.replace("calculator", new_tool)

# 次回のエージェント呼び出しから新しいツールが使用されます
```

**ポイント:**
- 置き換えは次回のエージェント呼び出しから有効になります
- 存在しないツールの置き換えや、名前が一致しないツールでの置き換えは検証エラーになります

---

### MCP ツール結果への meta フィールドサポート ([#1237](https://github.com/strands-agents/sdk-python/pull/1237))

**この機能でできること:**
- MCP サーバーがツール出力と一緒に任意のメタデータを渡せるようになりました。トークン使用量、パフォーマンスメトリクス、ビジネス固有の情報などを追跡できます。

**使用例:**

```python
from strands.tools.mcp import MCPClient
from strands.hooks import HookProvider, AfterToolCallEvent

class MetadataLogger(HookProvider):
    """ツール実行のメタデータをログに記録"""

    def register_hooks(self, registry, **kwargs):
        registry.add_callback(AfterToolCallEvent, self.log_metadata)

    async def log_metadata(self, event: AfterToolCallEvent):
        if hasattr(event.result, 'meta'):
            # メタデータをログに記録
            print(f"Tool metadata: {event.result.meta}")

# MCP クライアントを使用
mcp_client = MCPClient(server_params={"command": "mcp-server"})
agent = Agent(
    tools=[mcp_client],
    hook_providers=[MetadataLogger()]
)

# ツール呼び出し時にメタデータが利用可能
response = agent("Use the MCP tool")
```

**ポイント:**
- メタデータは Agent には直接公開されませんが、Hook 経由でアクセス可能です
- structuredContent と同様の仕組みで動作します

---

### Web と検索結果の引用サポート ([#1344](https://github.com/strands-agents/sdk-python/pull/1344))

**この機能でできること:**
- Bedrock Converse API で Web ベースの引用と検索結果の引用がサポートされました。これにより、全 5 種類の引用ロケーションタイプが完全にサポートされます。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

model = BedrockModel(
    model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
    region_name="us-east-1"
)

agent = Agent(model=model)

# サーバーサイドツールを使用した場合、引用が返されます
response = agent("最新のニュースについて教えてください")

# 引用情報にアクセス
if hasattr(response, 'citations'):
    for citation in response.citations:
        if hasattr(citation.location, 'url'):
            # Web ベースの引用
            print(f"Web citation: {citation.location.url}")
        elif hasattr(citation.location, 'searchResultIndex'):
            # 検索結果の引用
            print(f"Search result citation: {citation.location.searchResultIndex}")
```

**ポイント:**
- WebLocation タイプ（url、domain）をサポート
- SearchResultLocation タイプ（searchResultIndex、start、end）をサポート
- Anthropic Bedrock モデルでサーバーサイドツールを使用する際に有効です

---

### GeminiModel に gemini_tools フィールドを追加 ([#1050](https://github.com/strands-agents/sdk-python/pull/1050))

**この機能でできること:**
- Gemini API のビルトインツール（GoogleSearch、CodeExecution など）がサポートされました。これらのツールは標準の FunctionDeclaration とは別に管理されます。

**使用例:**

```python
from strands import Agent
from strands.models.gemini import GeminiModel
from google import genai
from google.genai import types

# Google Search でリアルタイムの Web データを使用
model = GeminiModel(
    model_id="gemini-2.5-flash",
    gemini_tools=[
        types.Tool(google_search=types.GoogleSearch())
    ]
)

agent = Agent(model=model)
response = agent("Who won the euro 2024?")
# レスポンスは最新の Web 検索結果に基づいて引用付きで返されます

# 標準の関数ツールと組み合わせることも可能
agent_with_both = Agent(
    model=model,
    tools=[my_custom_function_tool]  # 標準の関数ツールも引き続き動作
)
```

**ポイント:**
- gemini_tools には FunctionDeclaration を含めることはできません（検証エラーになります）
- サーバーサイドで実行されるため、ツール使用履歴は追跡されません
- 標準の関数ツールと併用可能です

---

### OpenAIModel と GeminiModel にカスタムクライアント対応 ([#1366](https://github.com/strands-agents/sdk-python/pull/1366))

**この機能でできること:**
- OpenAI と Gemini モデルにカスタム HTTP クライアントを渡せるようになりました。プロキシ設定、タイムアウト調整、接続プーリングなどの高度なカスタマイズが可能です。

**使用例:**

```python
import asyncio
import httpx
from strands import Agent
from strands.models.openai import OpenAIModel

# カスタム HTTP クライアントを作成
client = httpx.AsyncClient(
    timeout=60.0,
    limits=httpx.Limits(max_keepalive_connections=5)
)

agent = Agent(
    model=OpenAIModel(
        model_id="gpt-4o-mini-2024-07-18",
        client=client
    )
)

async def chat(prompt: str):
    result = await agent.invoke_async(prompt)
    print(result)

async def main():
    await chat("こんにちは")
    await chat("元気ですか？")
    # クライアントをクローズ
    await client.aclose()

if __name__ == "__main__":
    asyncio.run(main())
```

**ポイント:**
- クライアントのクローズは開発者の責任で行う必要があります
- 将来的には client_factory パターンに拡張される予定です

---

### SlidingWindowConversationManager に per_turn パラメータを追加 ([#1374](https://github.com/strands-agents/sdk-python/pull/1374))

**この機能でできること:**
- 会話マネージャーがターンごとにメッセージ管理を適用できるようになりました。長時間実行されるエージェントで、終了時だけでなく定期的にメッセージを管理したい場合に便利です。

**使用例:**

```python
from strands import Agent
from strands.agent.conversation_manager import SlidingWindowConversationManager

# モデル呼び出しごとにメッセージ管理を適用
manager = SlidingWindowConversationManager(
    window_size=40,
    should_truncate_results=True,
    per_turn=True  # または per_turn=5 で 5 回ごと
)

agent = Agent(
    conversation_manager=manager
)

# 動的に変更することも可能
manager.per_turn = 3  # 3 回のモデル呼び出しごとに管理
```

**ポイント:**
- per_turn=False（デフォルト）: 現在の動作を維持（終了時のみ）
- per_turn=True: モデル呼び出しごとに管理を適用
- per_turn=N（整数）: N 回のモデル呼び出しごとに管理を適用

---

### agent_invocations によるメトリクス追跡 ([#1387](https://github.com/strands-agents/sdk-python/pull/1387))

**この機能でできること:**
- 個別のエージェント呼び出しごとのメトリクスが追跡できるようになりました。最新のリクエストや過去の呼び出しのメトリクスにアクセスできます。

**使用例:**

```python
from strands import Agent

agent = Agent(model=model)
response = agent("10+2*10を計算して")

# 最新の呼び出しのメトリクスにアクセス
latest_invocation = response.metrics.latest_agent_invocation
if latest_invocation:
    print(f"Total usage: {latest_invocation.usage}")
    for cycle in latest_invocation.cycles:
        print(f"Cycle {cycle.event_loop_cycle_id}: {cycle.usage}")

# すべての呼び出しにアクセス
for invocation in response.metrics.agent_invocations:
    print(f"Invocation usage: {invocation.usage}")
    for cycle in invocation.cycles:
        print(f"  Cycle {cycle.event_loop_cycle_id}: {cycle.usage}")

# サマリーを出力
print(response.metrics.get_summary())
```

**ポイント:**
- 各呼び出しには複数のサイクルが含まれ、それぞれにトークン使用量が記録されます
- latest_agent_invocation プロパティで最新の呼び出しに簡単にアクセスできます

---

### フックによるモデル呼び出しのリトライ ([#1405](https://github.com/strands-agents/sdk-python/pull/1405))

**この機能でできること:**
- Hook を使用して、例外やレスポンス検証に基づいてモデル呼び出しをリトライできるようになりました。カスタムのリトライロジック、指数バックオフ、条件付きリトライが実装できます。

**使用例:**

```python
from strands.hooks import HookProvider, AfterModelCallEvent, BeforeInvocationEvent
import asyncio

class RetryOnServiceUnavailable(HookProvider):
    """ServiceUnavailable エラー時にリトライ"""

    def __init__(self, max_retries=3):
        self.max_retries = max_retries
        self.retry_count = 0

    def register_hooks(self, registry, **kwargs):
        registry.add_callback(BeforeInvocationEvent, self.reset_counts)
        registry.add_callback(AfterModelCallEvent, self.handle_retry)

    def reset_counts(self, event=None):
        self.retry_count = 0

    async def handle_retry(self, event):
        if event.exception:
            if "ServiceUnavailable" in str(event.exception):
                if self.retry_count < self.max_retries:
                    self.retry_count += 1
                    event.retry = True
                    await asyncio.sleep(2 ** self.retry_count)  # 指数バックオフ
        else:
            self.reset_counts()

# レスポンス検証に基づくリトライ
class MinimumResponseLengthHook(HookProvider):
    """レスポンスが短すぎる場合にリトライ"""

    def __init__(self, min_length=50):
        self.min_length = min_length
        self.max_retries = 2
        self.retry_count = 0

    def register_hooks(self, registry, **kwargs):
        registry.add_callback(BeforeInvocationEvent, self.reset_counts)
        registry.add_callback(AfterModelCallEvent, self.handle_after_model_call)

    def reset_counts(self, event=None):
        self.retry_count = 0

    async def handle_after_model_call(self, event):
        if event.stop_response:
            text = "".join(b.get("text", "") for b in event.stop_response.message.get("content", []))
            if len(text) < self.min_length and self.retry_count < self.max_retries:
                self.retry_count += 1
                event.retry = True

agent = Agent(
    model=model,
    hook_providers=[RetryOnServiceUnavailable(), MinimumResponseLengthHook()]
)
```

**ポイント:**
- AfterModelCallEvent.retry フィールドを True に設定することでリトライを指示
- 例外発生時とレスポンス検証の両方でリトライ可能
- Hook がリトライ回数、遅延戦略、条件を制御します

---

## バグ修正

### 不要な None を dict.get() 呼び出しから削除 ([#956](https://github.com/strands-agents/sdk-python/pull/956))
- コードの簡潔性を向上させるため、dict.get() のデフォルト引数として明示的な None を削除しました。機能的な変更はありません。

### CitationLocation の UnionType 修正とストリーミング時の引用チャンク結合 ([#1341](https://github.com/strands-agents/sdk-python/pull/1341))
- CitationLocation が正しく UnionType として扱われるように修正
- ストリーミング使用時に引用チャンクが正しく結合されるように修正
- マルチターン会話で CitationContentBlock が動作しなかった問題を修正

### テレメトリのトークンメトリクス二重カウント防止 ([#1327](https://github.com/strands-agents/sdk-python/pull/1327))
- Langfuse などの宛先使用時、親スパンと子スパンでメトリクスが重複してカウントされる問題を修正
- OTEL_EXPORTER_OTLP_ENDPOINT または OTEL_EXPORTER_OTLP_TRACES_ENDPOINT をチェックして、必要な場合のみ observation_type 属性を追加

### OpenAI で画像コンテンツを返すツールをサポート ([#1079](https://github.com/strands-agents/sdk-python/pull/1079))
- ツールが画像コンテンツを返す際に発生していた invalid_request_error を修正
- ツールメッセージから画像を分離し、別の user メッセージとして送信するように実装

### 非推奨エイリアスがアクセスされた時のみ警告を表示 ([#1380](https://github.com/strands-agents/sdk-python/pull/1380))
- `strands` をインポートするだけで非推奨警告が表示される問題を修正
- `__getattr__` を使用した遅延警告に変更し、非推奨エイリアスが実際にアクセスされた時のみ警告を表示

---

## まとめ

v1.21.0 は、開発者の柔軟性とカスタマイズ性を大幅に向上させる重要なリリースです。A2A サーバーのカスタマイズ、ツールの動的更新、Gemini ビルトインツールのサポート、カスタム HTTP クライアント対応、会話マネージャーの per_turn パラメータ、フックによるリトライ機能など、多数の新機能が追加されました。また、引用機能やテレメトリ、ストリーミングに関する重要なバグ修正も含まれています。
