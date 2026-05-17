---
title: "Strands Python SDK v1.39.0 リリース解説"
version: "v1.39.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-05-08
summary: "Bedrock Mantle エンドポイントへのネイティブ接続、コンテキストウィンドウの自動解決、トークンカウント API のスキップオプション、A2A タスクライフサイクルの完全サポートなど、多数の新機能とバグ修正を含むリリースです。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.39.0"
---

## 概要

このリリースでは、Amazon Bedrock の OpenAI 互換エンドポイント (Mantle) への接続が簡単になり、コンテキストウィンドウサイズの自動解決機能が追加されました。また、A2A (Agent-to-Agent) プロトコルにおけるタスクライフサイクルの完全サポートにより、エラー処理やキャンセル、Human-in-the-Loop ワークフローが可能になりました。

**リリース:** [v1.39.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.39.0)

## 新機能

### OpenAI プロバイダーで AWS プロファイルを使用した Bedrock Mantle 接続 ([#2230](https://github.com/strands-agents/sdk-python/pull/2230))

**この機能でできること:**
- Amazon Bedrock の OpenAI 互換エンドポイント (Mantle) への接続が、`bedrock_mantle_config` パラメータを使用して簡単に行えるようになりました。ステートフルな会話や推論制御など、Converse API では利用できない機能にアクセスできます。

**使用例:**

```python
from strands.models.openai import OpenAIModel
from strands.models.openai_responses import OpenAIResponsesModel

# OpenAI モデルで Bedrock Mantle を使用
model = OpenAIModel(
    model_id="openai.gpt-oss-120b",
    bedrock_mantle_config={"region": "us-east-1"}  # リージョンを指定するだけ
)

# OpenAI Responses モデルでステートフル会話と推論制御を使用
model = OpenAIResponsesModel(
    model_id="openai.gpt-oss-120b",
    stateful=True,  # ステートフルな会話を有効化
    params={"reasoning": {"effort": "medium"}},  # 推論制御
    bedrock_mantle_config={"region": "us-east-1"},
)
```

**ポイント:**
- 従来は `aws-bedrock-token-generator` を使用してトークンを生成し、手動で URL を構築する必要がありましたが、この設定により自動化されます
- Mantle エンドポイントは `https://bedrock-mantle.<region>.api.aws/v1` で提供されます

---

### コンテキストウィンドウサイズの自動解決 ([#2249](https://github.com/strands-agents/sdk-python/pull/2249))

**この機能でできること:**
- モデル ID から自動的にコンテキストウィンドウサイズが解決されるようになり、プロアクティブなコンテキスト圧縮機能を使用する際に手動で値を指定する必要がなくなりました。

**使用例:**

```python
from strands.models import BedrockModel

# 以前: context_window_limit を手動で指定する必要があった
model = BedrockModel(
    model_id="anthropic.claude-sonnet-4-20250514-v1:0",
    context_window_limit=1_000_000,  # 手動指定が必要だった
)

# 現在: モデル ID から自動解決される
model = BedrockModel(model_id="anthropic.claude-sonnet-4-20250514-v1:0")
config = model.get_config()
print(config.get("context_window_limit"))  # 1_000_000 が自動設定される
```

**ポイント:**
- 明示的に指定した値は常に優先されます
- 未知のモデル ID の場合は `None` のままとなります
- Bedrock のクロスリージョンモデル ID（例: `us.anthropic.claude-sonnet-4-6`）では、リージョンプレフィックスを除去してから検索されます
- Bedrock、Anthropic、OpenAI、Gemini、Mistral など主要プロバイダーに対応

---

### ネイティブトークンカウント API をスキップするオプション ([#2255](https://github.com/strands-agents/sdk-python/pull/2255))

**この機能でできること:**
- `use_native_token_count=False` を設定することで、プロバイダーのネイティブトークンカウント API 呼び出しをスキップし、ローカルの推定機能を使用できます。高頻度のプロアクティブ圧縮チェックなど、レイテンシやコストが問題になる場合に有用です。

**使用例:**

```python
from strands.models import BedrockModel

# デフォルト: ネイティブ API を使用（エラー時はフォールバック）
model = BedrockModel(model_id="us.anthropic.claude-sonnet-4-20250514")

# ネイティブ API をスキップし、常にローカル推定を使用
model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-20250514",
    use_native_token_count=False,  # ローカル推定を使用
)
```

**ポイント:**
- デフォルトは `True`（従来の動作）
- 対応プロバイダー: Bedrock、Anthropic、Gemini、OpenAI Responses、LlamaCpp
- ネットワーク呼び出しを避けたい場合や、API コストを削減したい場合に有効

---

### A2A タスクライフサイクルの完全サポート ([#2245](https://github.com/strands-agents/sdk-python/pull/2245))

**この機能でできること:**
- A2A (Agent-to-Agent) プロトコルにおいて、`failed`、`canceled`、`input_required`、`rejected`、`auth_required` の各状態が完全にサポートされるようになりました。これにより、エラーハンドリング、タスクキャンセル、Human-in-the-Loop ワークフローが可能になります。

**使用例:**

```python
# Human-in-the-Loop ワークフローの例
# クライアント → サーバー: "Book me a flight to NYC"
# サーバー → クライアント: TaskStatus: working (streaming...)
# サーバー → クライアント: TaskStatus: input_required
#   message: "Agent requires input:
#   - confirm_booking: Please confirm: NYC flight on May 10 for $450"
# クライアント → サーバー: "Yes, confirm it"
# サーバー → クライアント: TaskStatus: working (streaming...)
# サーバー → クライアント: TaskStatus: completed
#   artifact: "Flight booked! Confirmation: ABC123"
```

**主な改善点:**

| 機能 | 以前 | 現在 |
|------|------|------|
| エラー処理 | 例外が未処理のまま伝播し、タスクは `working` 状態のまま残る | `failed` 状態に適切に遷移し、エラーメッセージが返される |
| キャンセル | `UnsupportedOperationError` が発生 | `canceled` 状態に遷移し、エージェントの `cancel()` メソッドが呼び出される |
| 割り込み | 無視されて `completed` として終了 | `input_required` 状態に遷移し、必要な入力がリストされる |

**クライアント側の改善:**
- `AgentResult.stop_reason`: 終了状態では `"end_turn"`、一時停止状態では `"interrupt"` を返す
- `AgentResult.state`: `{"a2a_task_state": "failed"}` などの形式でタスク状態を確認可能

---

## バグ修正

### MCPClientInitializationError に根本原因を含める ([#2238](https://github.com/strands-agents/sdk-python/pull/2238))

- `MCPClient.start()` が失敗した際、エラーメッセージに根本原因が含まれるようになりました
- **以前:** `MCPClientInitializationError: the client initialization failed`
- **現在:** `MCPClientInitializationError: the client initialization failed: Failed to get OAuth token for Gateway (provider=my-provider): Token has expired`
- マネージド環境でのデバッグが大幅に容易になります

---

### Bedrock モデルのトークンカウント修正 ([#2254](https://github.com/strands-agents/sdk-python/pull/2254))

- クロスリージョン推論プロファイル使用時に CountTokens API が `ValidationException` を返した場合、tiktoken へのフォールバックではなくローカルのヒューリスティック推定を使用するようになりました
- 隔離された VPC 環境（AgentCore、プライベートサブネットの Lambda）でエンコーディングファイルのダウンロードがハングする問題を解決

---

### トークンカウント非対応モデルのキャッシュ ([#2250](https://github.com/strands-agents/sdk-python/pull/2250))

- トークンカウント API をサポートしないモデル ID を最初の失敗時にキャッシュし、以降の呼び出しでは API 呼び出しをスキップするようになりました
- デバッグログの汚染と不要な Bedrock エラーログを削減

---

### MCPClient の型アノテーション修正 ([#2248](https://github.com/strands-agents/sdk-python/pull/2248))

- `__exit__` と `stop()` メソッドの型アノテーションがコンテキストマネージャープロトコルに準拠するよう修正されました
- 型チェッカー（例: ty）での `invalid-context-manager` エラーが解消されます

---

## まとめ

このリリースでは、Bedrock Mantle への接続簡素化、コンテキストウィンドウの自動解決、A2A タスクライフサイクルの完全サポートなど、開発者体験を大幅に向上させる機能が追加されました。特に A2A の改善により、エラー処理やキャンセル、Human-in-the-Loop ワークフローが可能になり、より堅牢なマルチエージェントシステムの構築が可能になります。
