---
title: "AgentCore Python SDK v1.25.2 リリース解説"
version: "v1.25.2"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-10-30
summary: "Runtime セッションエンドポイント用の新しいクライアントとローカルエンドポイントが追加されました。また、OpenAI メモリコンバーターでのバイト値エンコード、トレーシングスパンのフラッシュ、A2A フォローアップメッセージの context 分離に関する複数のバグ修正が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.2"
---

## 概要

このリリースでは、Runtime のセッションエンドポイントに対する認証付き HTTP / WebSocket アクセスを行うための新しいクライアント、およびブラウザからのアクセスを可能にするローカルループバックリレーが追加されました。加えて、OpenAI メモリコンバーターでの redacted reasoning バイト値のシリアライズ失敗、トレーシングスパンの欠落、A2A のフォローアップメッセージが古い contextvars を参照する問題などが修正されています。

**リリース:** [v1.25.2](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.2)

## 新機能

### Session Endpoint Client と Local Endpoint の追加 ([#724](https://github.com/aws/bedrock-agentcore-sdk-python/pull/724))

**この機能でできること:**
- `SessionEndpointClient` により、Runtime のセッションエンドポイントおよび許可されたポートに対して、認証付きの HTTP / WebSocket リクエストを送信できます。
- `LocalEndpoint` は、SigV4 または OAuth 認証を適用しつつ、ブラウザからのアクセスを可能にするループバックリレーを提供します。
- Runtime ストリーミングと Web search クライアントで共用される、インクリメンタルな SSE パースも追加されました。
- バイナリレスポンスボディを保持しつつ、`text` および `json()` ヘルパーも利用可能です。

**使用例:**

```python
from bedrock_agentcore.runtime import SessionEndpointClient, LocalEndpoint

# セッションエンドポイントクライアントの作成
# agent_runtime_arn と session_id を指定して、認証付き HTTP リクエストを発行する
client = SessionEndpointClient(
    agent_runtime_arn="arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/my-agent",
    session_id="session-123",
    region_name="us-east-1",
)

# 許可されたポートに対して HTTP リクエストを送信
response = client.request(
    method="GET",
    port=8080,
    path="/health",
)
print(response.text)       # テキストとして取得
print(response.json())     # JSON として取得
# バイナリボディは response.content で取得可能

# WebSocket による通信も可能
with client.websocket(port=8081, path="/ws") as ws:
    ws.send("hello")
    message = ws.recv()

# ブラウザからのアクセス用に、ローカルループバックリレーを起動
# SigV4 または OAuth 認証を自動的に付与しつつ、ローカルの URL を経由してアクセスできる
local = LocalEndpoint(
    agent_runtime_arn="arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/my-agent",
    session_id="session-123",
    region_name="us-east-1",
)
local.start()
print(f"Browse at: {local.url}")
# 利用後は local.stop() で停止
```

**ポイント:**
- `SessionEndpointClient` は Runtime レベルの URL / WebSocket 認証ヘルパーを再利用するため、既存の Runtime 認証と一貫した挙動になります。
- `LocalEndpoint` を利用すると、ブラウザベースのツールや開発環境から、認証付きで Runtime のセッションエンドポイントにアクセスできます。
- 追加された SSE パーサーはインクリメンタル処理に対応しており、ストリーミングレスポンスの消費を効率化します。

---

## バグ修正

### OpenAI コンバーターの reasoning ブロックでバイト値をエンコード ([#718](https://github.com/aws/bedrock-agentcore-sdk-python/pull/718))

- `AgentCoreMemorySessionManager` と `OpenAIConverseConverter` を併用する構成において、モデルが `reasoningContent.redactedContent` として生のバイト列を返した場合、`json.dumps` が `TypeError: Object of type bytes is not JSON serializable` を発生させ、エージェント呼び出しが毎ターン失敗していました。
- 修正後は `_bedrock_to_openai` 内で reasoning ブロックに対して `encode_bytes_values` を適用し、バイト値を base64 エンコードした形式で保存します。復元時は `_openai_to_bedrock` 内で `decode_bytes_values` によって元の `bytes` に戻すため、モデルは次のターンでも redacted reasoning を正しく受け取れます。
- テキストのみの reasoning ブロック、ツール呼び出し、通常のメッセージはこれまでと同じく保存・復元されます。

### Runtime の呼び出し後にトレーシングスパンをフラッシュ ([#721](https://github.com/aws/bedrock-agentcore-sdk-python/pull/721))

- AgentCore Runtime は呼び出しレスポンスの完了直後に microVM をフリーズすることがあるため、`BatchSpanProcessor` のようなバッファリング処理が未送信のスパンをエクスポートできず、リクエストのトレースが失われるケースがありました。
- 修正では、非ストリーミング呼び出しが return する前と、同期・非同期いずれのストリーミング応答の完了後に、アクティブな OpenTelemetry トレーサープロバイダーの `force_flush` を呼び出します。
- トレーシングはオプションのままで、エクスポーターの失敗が呼び出し結果に影響しないよう防御的に実装されています。

### A2A のフォローアップメッセージを独自の request contextvars で実行 ([#693](https://github.com/aws/bedrock-agentcore-sdk-python/pull/693))

- `a2a-sdk` 1.x では、2 件目以降のメッセージが最初のリクエストで作成された producer タスクを通して処理されるため、フォローアップ実行時に古い contextvars（workload access token、request ID、session ID、callback URL、転送ヘッダーなど）が参照されてしまう問題がありました。
- 修正では、各 A2A メッセージごとに送信元リクエストの `contextvars` スナップショットを取得し、ユーザー実行コードをそのスナップショット内で実行します。`message/send` と `message/stream` の両方のフォローアップリクエストが対象です。
- スナップショットが利用できない場合でも安全にフォールバックするように実装されています。

## まとめ

Runtime のセッションエンドポイントへの認証付きアクセスを支援する新機能に加えて、メモリ・トレーシング・A2A といった運用上重要な領域における複数のバグ修正を含むリリースです。
