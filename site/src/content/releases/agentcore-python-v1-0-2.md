---
title: "bedrock-agentcore-sdk-python v1.0.2"
version: "v1.0.2"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-10-16
summary: "OAuth 2.0 3-legged 認証機能の追加とショートタームメモリへのメタデータサポートが含まれています。Identity サービスで 3LO コールバック URL を HTTP ヘッダー経由で設定できるようになり、メモリセッションでイベントにメタデータフィルターを適用できるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.2"
---

## 概要

このリリースでは、OAuth 2.0 3-legged 認証の機能強化、ショートタームメモリ（STM）へのメタデータサポート追加、Identity OAuth 2.0 フェデレーション機能の拡張が行われました。これにより、より柔軟な認証フローとメモリイベントの効率的な検索が可能になります。

**リリース:** [v1.0.2](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.2)

## 新機能

### OAuth2 3LO Identity APIs と HTTP ヘッダーによるコールバック URL 設定 ([#116](https://github.com/aws/bedrock-agentcore-sdk-python/pull/116))

**この機能でできること:**
OAuth 2.0 3-legged 認証用の Identity API が追加され、`GetResourceOauth2Token` API を使用する際に、HTTP ヘッダー経由で 3LO コールバック URL を設定できるようになりました。

**使用例:**

```python
from bedrock_agentcore.runtime.context import RequestContext
from bedrock_agentcore.services.identity import IdentityService

# コンテキストにコールバック URL ヘッダーを設定
context = RequestContext()
context.set_header("X-Oauth2-Callback-Url", "https://example.com/callback")

# Identity サービスのインスタンス作成
identity_service = IdentityService(region_name='us-east-1')

# OAuth2 トークンを取得（コールバック URL が適用される）
token_response = identity_service.get_resource_oauth2_token(
    context=context,
    resource_arn="arn:aws:service:region:account:resource/id"
)
```

**ポイント:**
- HTTP ヘッダー経由でコールバック URL を動的に設定できるため、複数の異なるコールバック先を持つアプリケーションで柔軟に対応可能
- `RequestContext` を使用してヘッダー情報を管理し、認証フローをカスタマイズできる

---

### Identity OAuth 2.0 フェデレーション機能の拡張 ([#106](https://github.com/aws/bedrock-agentcore-sdk-python/pull/106))

**この機能でできること:**
Identity サービスで OAuth 2.0 フェデレーション機能が強化され、より多様な認証シナリオに対応できるようになりました。

**使用例:**

```python
from bedrock_agentcore.identity.auth import OAuth2Authenticator
from bedrock_agentcore.services.identity import IdentityService

# OAuth2 認証の設定
authenticator = OAuth2Authenticator(
    client_id="your-client-id",
    client_secret="your-client-secret",
    token_endpoint="https://auth.example.com/token"
)

# Identity サービスで OAuth2 フェデレーションを使用
identity_service = IdentityService(
    region_name='us-east-1',
    authenticator=authenticator
)

# フェデレーション認証を実行
auth_result = identity_service.authenticate_federated_user(
    identity_provider="example-provider",
    user_id="user@example.com"
)
```

**ポイント:**
- 複数の Identity Provider と連携する際に、統一されたインターフェースで認証処理を実装できる
- OAuth 2.0 標準に準拠したフェデレーション認証をサポート

---

### ショートタームメモリへのメタデータサポート ([#114](https://github.com/aws/bedrock-agentcore-sdk-python/pull/114))

**この機能でできること:**
Bedrock Agent のショートタームメモリ（STM）イベントにメタデータを付与し、メタデータフィルターを使用して効率的にイベントを検索できるようになりました。イベント作成時にキーバリューペアとして追加情報を付与し、後から特定の条件でイベントを絞り込めます。

**使用例:**

```python
from bedrock_agentcore.memory.models import (
    StringValue,
    LeftExpression,
    OperatorType,
    RightExpression,
    EventMetadataFilter
)
from bedrock_agentcore.memory.session import MemorySessionManager

# メモリセッションマネージャーの作成
session_manager = MemorySessionManager(
    memory_id='test-memory-id',
    region_name='us-east-1'
)

# セッションの作成
session = session_manager.create_memory_session(
    actor_id='user-123',
    session_id='test-session'
)

# メタデータ付きでイベントを作成
metadata = {}
metadata_key = "location"
metadata_value = "NYC"
metadata[metadata_key] = StringValue.build(value=metadata_value)

messages = [
    {"role": "user", "content": "ニューヨークへの旅行を計画しています"},
    {"role": "assistant", "content": "素晴らしいですね！どのような情報をお探しですか？"}
]

session.add_turns(messages=messages, metadata=metadata)

# メタデータフィルターを使用してイベントを検索
left_operand = LeftExpression.build(key=metadata_key)
operator = OperatorType.EQUALS_TO
right_operand = RightExpression.build(value=metadata_value)

filter_expression = EventMetadataFilter.build_expression(
    left_operand,
    operator,
    right_operand
)

params = {
    'actor_id': 'user-123',
    'session_id': 'test-session',
    'eventMetadata': [filter_expression]
}

# NYC に関連するイベントのみを取得
filtered_events = session_manager.list_events(**params)
```

**ポイント:**
- 旅行予約エージェントで場所情報、カスタマーサポートエージェントで問い合わせカテゴリなど、ユースケースに応じた柔軟なメタデータを付与可能
- セッション全体をスキャンすることなく、メタデータフィルターで効率的に関連する会話履歴を取得できる
- 複数のフィルター条件を組み合わせて、より詳細な検索が可能

---

## まとめ

このリリースでは、OAuth 2.0 認証の柔軟性向上とメモリ機能の大幅な拡張により、より実用的な Agent アプリケーションの構築が可能になりました。
