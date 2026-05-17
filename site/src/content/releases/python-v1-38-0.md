---
title: "Strands Python SDK v1.38.0 リリース解説"
version: "v1.38.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-04-30
summary: "大規模ツール結果のオフロード機能、ネイティブトークンカウント、CachePoint の TTL サポート、BedrockModel の strict_tools 設定など、多くの新機能とバグ修正が含まれています。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.38.0"
---

## 概要

このリリースでは、大規模なツール結果を外部ストレージにオフロードする `ContextOffloader` プラグイン、プロバイダーネイティブのトークンカウント機能、CachePoint への TTL サポート、Bedrock の strict_tools 設定など、多くの新機能が追加されました。また、Bedrock のデフォルトモデルが Claude Sonnet 4.5 にアップグレードされ、複数のバグ修正も含まれています。

**リリース:** [v1.38.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.38.0)

## 新機能

### 大規模ツール結果のオフロード機能 ([#2162](https://github.com/strands-agents/sdk-python/pull/2162), [#2222](https://github.com/strands-agents/sdk-python/pull/2222))

**この機能でできること:**
- 大規模なツール結果をコンテキストウィンドウから外部ストレージにオフロードし、トークン消費を削減
- テキスト、JSON、画像、ドキュメントなど、様々なコンテンツタイプに対応

**使用例:**

```python
from strands import Agent
from strands.vended_plugins.context_offloader import (
    ContextOffloader,
    InMemoryStorage,
    FileStorage,
    S3Storage,
)

# インメモリストレージ（プロセス終了時にクリア）
agent = Agent(plugins=[
    ContextOffloader(storage=InMemoryStorage())
])

# ファイルストレージ（ディスクに永続化、カスタムしきい値）
agent = Agent(plugins=[
    ContextOffloader(
        storage=FileStorage("./artifacts"),
        max_result_tokens=5_000,   # オフロードを開始するトークン数
        preview_tokens=2_000,      # コンテキストに残すプレビューのトークン数
    )
])

# S3 ストレージ（取得ツール付き）
agent = Agent(plugins=[
    ContextOffloader(
        storage=S3Storage(
            bucket="my-agent-artifacts",
            prefix="tool-results/",
        ),
        include_retrieval_tool=True,  # デフォルトで True
    )
])
```

**ポイント:**
- `include_retrieval_tool=True`（デフォルト）で、Agent がオフロードされたコンテンツを必要に応じて取得可能
- FileStorage は完全なファイルパス、S3Storage は `s3://` URI をリファレンスとして返す
- Agent はプレビューを使用して回答可能な場合はそれを優先し、必要な場合のみデータを取得

---

### Model.count_tokens() メソッドの追加 ([#2031](https://github.com/strands-agents/sdk-python/pull/2031))

**この機能でできること:**
- モデル呼び出し前にトークン数を推定し、プロアクティブなコンテキスト管理が可能に

**使用例:**

```python
# モデル呼び出し前にトークン数を推定
token_count = await agent.model.count_tokens(
    messages=messages,
    tool_specs=tool_specs,
    system_prompt="You are a helpful assistant.",
)

if token_count > threshold:
    # コンテキスト圧縮をトリガー
    pass
```

**ポイント:**
- 基本実装は tiktoken（`cl100k_base`）を使用し、利用不可の場合は文字ベースのヒューリスティック（テキストは `chars/4`、JSON は `chars/2`）にフォールバック
- プロバイダーサブクラスでネイティブ API を使用したオーバーライドが可能

---

### プロバイダーネイティブのトークンカウント ([#2189](https://github.com/strands-agents/sdk-python/pull/2189), [#2211](https://github.com/strands-agents/sdk-python/pull/2211))

**この機能でできること:**
- サポートされているプロバイダーでネイティブ API を使用した正確なトークンカウントを実現

**使用例:**

```python
# 使用方法は同じ - ネイティブカウントは透過的に動作
token_count = await agent.model.count_tokens(
    messages=messages,
    tool_specs=tool_specs,
    system_prompt="You are a helpful assistant.",
)
```

**ポイント:**
- 対応プロバイダー: Bedrock（`count_tokens`）、Anthropic（`messages.count_tokens`）、OpenAI Responses（`responses.input_tokens.count`）、Gemini（`models.count_tokens`）、llama.cpp（`/tokenize` エンドポイント）
- ネイティブ API が失敗した場合は `ProviderTokenCountError` を発生させ、tiktoken/ヒューリスティックにフォールバック
- 推定誤差 5-15% を排除し、正確なしきい値ベースの圧縮判断が可能に

---

### モデル呼び出し前の入力トークン推定 ([#2221](https://github.com/strands-agents/sdk-python/pull/2221))

**この機能でできること:**
- モデル呼び出し前に `BeforeModelCallEvent` で推定入力トークン数を取得可能に

**使用例:**

```python
from strands.hooks import BeforeModelCallEvent

def on_before_model_call(event: BeforeModelCallEvent):
    print(event.projected_input_tokens)  # 例: 14200

agent.hooks.add_callback(BeforeModelCallEvent, on_before_model_call)

# AgentResult からもコンテキストサイズを取得可能
result = agent("Hello")
print(result.projected_context_size)  # 例: 14250
```

**ポイント:**
- プロアクティブなコンテキスト圧縮の基盤機能
- 前回の呼び出しメタデータから既知のトークン数を取得し、新しいメッセージのみを推定

---

### CachePoint への TTL サポート ([#1660](https://github.com/strands-agents/sdk-python/pull/1660))

**この機能でできること:**
- AWS Bedrock のプロンプトキャッシングで TTL（有効期限）を指定可能に

**使用例:**

```python
from strands.types.content import CachePoint

# 1 時間のキャッシュ TTL を指定
cache_point = CachePoint(type="default", ttl="1h")  # "5m" または "1h" が指定可能
```

**ポイント:**
- Bedrock API の新しい 1 時間キャッシュオプションに対応
- 長時間実行されるエージェントセッションでのコスト最適化に有効

---

### MCP ツール結果に isError フラグを保持 ([#2118](https://github.com/strands-agents/sdk-python/pull/2118))

**この機能でできること:**
- MCP ツールがアプリケーションレベルのエラーを返した場合と、プロトコル/トランスポートエラーを区別可能に

**使用例:**

```python
# MCPToolResult の isError フィールドを確認
if result.get("isError"):
    # ツールが実行されたが、アプリケーションエラーを報告
    pass
elif result["status"] == "error":
    # プロトコル/クライアント例外（ツールが実行されなかった）
    pass
```

**ポイント:**
- `status="error"` かつ `isError=True`: ツール実行成功、アプリケーションエラー報告
- `status="error"` かつ `isError` なし: プロトコル/トランスポートエラー

---

### Bedrock strict_tools 設定 ([#2213](https://github.com/strands-agents/sdk-python/pull/2213))

**この機能でできること:**
- Bedrock の制約付きデコーディングを有効にし、ツール名やパラメータのハルシネーションを防止

**使用例:**

```python
from strands.models import BedrockModel

# strict_tools を有効化
model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-6",
    strict_tools=True,  # ツールスキーマの厳密な検証を有効化
)
```

**ポイント:**
- `@tool` デコレータで生成されたスキーマに自動的に `additionalProperties: false` を注入
- ツール名のハルシネーション（例: `store-case-syummary-tool` → 正しくは `store-case-summary-tool`）を防止
- 入力スキーマへの準拠を強制し、余分なパラメータや誤字を防止

---

## バグ修正

### Bedrock デフォルトモデルを Claude Sonnet 4.5 にアップグレード ([#2193](https://github.com/strands-agents/sdk-python/pull/2193))

**問題:**
- 旧デフォルトの Claude Sonnet 4 (`us.anthropic.claude-sonnet-4-20250514-v1:0`) が Anthropic によりレガシーとしてマークされ、過去 30 日間にそのモデルを使用していないアカウントでエラーが発生

**修正内容:**
- デフォルトモデルを `global.anthropic.claude-sonnet-4-6` に変更
- Global クロスリージョン推論プロファイルを使用し、どのリージョンからでも動作

---

### LiteLLM で CachePoint の TTL が転送されない問題を修正 ([#2153](https://github.com/strands-agents/sdk-python/pull/2153))

**問題:**
- `LiteLLMModel._format_system_messages()` が `CachePoint` の `ttl` フィールドを無視し、常に `{"type": "ephemeral"}` を出力

**修正内容:**
- `ttl` フィールドが存在する場合、`cache_control` ディクショナリに含めるように修正

---

### スキル注入時のキャッシュポイント保持 ([#2134](https://github.com/strands-agents/sdk-python/pull/2134))

**問題:**
- `AgentSkills._on_before_invocation` がシステムプロンプトを文字列として読み取り、構造化された `SystemContentBlock` リスト（`cachePoint` を含む）を単一のテキストブロックに崩壊させていた

**修正内容:**
- コンテンツブロックリストが利用可能な場合、スキル XML を別のブロックとして追加し、キャッシュポイントを保持

---

### Ollama で一意の toolUseId を生成 ([#2053](https://github.com/strands-agents/sdk-python/pull/2053))

**問題:**
- `toolUseId` にツール名を再利用していたため、同じツールを複数回呼び出すと ID が衝突

**修正内容:**
- UUID を生成して `toolUseId` として使用するように変更

---

### Nova Sonic の履歴再生時の問題を修正 ([#2188](https://github.com/strands-agents/sdk-python/pull/2188))

**問題:**
- `BidiAgent` セッション更新時に、Nova Sonic が以前のアシスタント応答を繰り返す
- 会話履歴メッセージが `interactive: True` で送信され、新しい入力として扱われていた

**修正内容:**
- 履歴メッセージとシステムプロンプトを `interactive: False` で送信
- 履歴サイズを制限（個別メッセージ 50KB、合計 200KB）

---

### SlidingWindowConversationManager の window_size=0 処理 ([#2208](https://github.com/strands-agents/sdk-python/pull/2208))

**問題:**
- `window_size=0` で全メッセージをクリアすることが期待されるが、実際にはメッセージが変更されない
- 負の `window_size` 値が検証されていない

**修正内容:**
- `window_size=0` で全メッセージをクリアするように修正
- `window_size < 0` の場合に `ValueError` を発生させるように追加

---

### キャンセルされたツールに例外を合成しない ([#2106](https://github.com/strands-agents/sdk-python/pull/2106))

**問題:**
- `cancel_tool` 設定後、`AfterToolCallEvent.exception` に合成された例外が設定され、ツールキャンセルが失敗として表示

**修正内容:**
- キャンセルされたツールの `AfterToolCallEvent.exception` を `None` に変更
- キャンセル検出には `cancel_message` フィールドを使用

---

## まとめ

このリリースでは、大規模ツール結果のオフロード、ネイティブトークンカウント、プロアクティブなコンテキスト管理の基盤機能など、コンテキスト管理に関する大幅な機能強化が行われました。また、Bedrock のデフォルトモデルが Claude Sonnet 4.5 に更新され、新規ユーザーが即座に開始できるようになりました。
