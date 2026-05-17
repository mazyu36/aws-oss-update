---
title: "bedrock-agentcore-sdk-python v1.9.0"
version: "v1.9.0"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-05-07
summary: "AgentCore Payments モジュールの追加による AI エージェントの決済機能サポート、および Strands ConversationTurn のマルチターン履歴保持に関するバグ修正を含むリリースです。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.9.0"
---

## 概要

このリリースでは、AI エージェントが x402 プロトコルを使用したマイクロトランザクション決済を処理できる AgentCore Payments モジュールが追加されました。また、Strands ConversationTurn でマルチターンの会話履歴が正しく保持されないバグが修正されています。

**リリース:** [v1.9.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.9.0)

## 新機能

### AgentCore Payments モジュール ([#457](https://github.com/aws/bedrock-agentcore-sdk-python/pull/457))

**この機能でできること:**
- AI エージェントが有料 API、MCP サーバー、プレミアムコンテンツにアクセスするためのマイクロトランザクション決済を処理
- x402 Payment Required プロトコルに対応し、HTTP 402 レスポンスを自動的に処理して暗号通貨トランザクションを完了

**主要コンポーネント:**

| コンポーネント | 用途 |
|--------------|------|
| `PaymentClient` | コントロールプレーン - Payment Manager や Connector の作成・管理 |
| `PaymentManager` | データプレーン - 決済処理、x402 ヘッダー生成、セッション管理 |
| `AgentCorePaymentsPlugin` | Strands フレームワーク統合 - HTTP 402 の自動インターセプトとリトライ |

**使用例:**

```python
import os
from bedrock_agentcore.payments import PaymentManager

# PaymentManager の初期化
manager = PaymentManager(
    payment_manager_arn=os.environ["PAYMENT_MANAGER_ARN"],
    region_name="us-east-1",
)

# 決済インストルメント（埋め込み暗号ウォレット）の作成
instrument = manager.create_payment_instrument(
    payment_connector_id=os.environ["PAYMENT_CONNECTOR_ID"],
    payment_instrument_type="EMBEDDED_CRYPTO_WALLET",
    payment_instrument_details={
        "embeddedCryptoWallet": {
            "network": "ETHEREUM",  # または "SOLANA"
            "linkedAccounts": [
                {"email": {"emailAddress": "user@example.com"}}
            ],
        }
    },
    user_id="user-123",
)

# 支出制限付きの決済セッションの作成
session = manager.create_payment_session(
    expiry_time_in_minutes=60,
    user_id="user-123",
    limits={"maxSpendAmount": {"value": "100.00", "currency": "USD"}},
)

# インストルメントの残高確認
balance = manager.get_payment_instrument_balance(
    payment_connector_id=os.environ["PAYMENT_CONNECTOR_ID"],
    payment_instrument_id=instrument["paymentInstrumentId"],
    chain="BASE_SEPOLIA",  # BASE, SOLANA_DEVNET, SOLANA_MAINNET なども対応
    token="USDC",
    user_id="user-123",
)
print(f"Balance: {balance}")
```

**Payment Manager と Connector のセットアップ:**

```python
from bedrock_agentcore.payments.client import PaymentClient

payment_client = PaymentClient(region_name="us-east-1")

# Coinbase CDP プロバイダーを使用した Payment Manager の作成
response = payment_client.create_payment_manager_with_connector(
    payment_manager_name="AgentCorePaymentManager",
    payment_manager_description="Payment Manager for Agent Core",
    authorizer_type="AWS_IAM",
    role_arn="arn:aws:iam::123456789012:role/BedrockAgentCoreFullAccess",
    payment_connector_config={
        "name": "agent-core-connector",
        "description": "Payment Connector for Agent Core",
        "payment_credential_provider_config": {
            "name": "agent-core-provider",
            "credential_provider_vendor": "CoinbaseCDP",  # または "StripePrivy"
            "credentials": {
                "api_key_id": os.environ["COINBASE_API_KEY_ID"],
                "api_key_secret": os.environ["COINBASE_API_KEY_SECRET"],
                "wallet_secret": os.environ["COINBASE_WALLET_SECRET"],
            },
        },
    },
    wait_for_ready=True,  # すべてのリソースが READY になるまで待機
    max_wait=300,
    poll_interval=5,
)

payment_manager_arn = response["paymentManager"]["paymentManagerArn"]
payment_connector_id = response["paymentConnector"]["paymentConnectorId"]
```

**ポイント:**
- 対応プロバイダー: Coinbase CDP、Stripe Privy
- 対応ブロックチェーン: Ethereum（BASE、BASE_SEPOLIA など）、Solana（SOLANA_MAINNET、SOLANA_DEVNET）
- 認証方式: AWS IAM（デフォルト）または Custom JWT（Bearer Token）
- `wait_for_ready=True` を指定すると、リソース作成完了まで待機し、失敗時は自動ロールバック

---

## バグ修正

### Strands ConversationTurn のマルチターン履歴保持 ([#454](https://github.com/aws/bedrock-agentcore-sdk-python/pull/454))

**問題:**
- `StrandsEventParser.extract_conversation_turn` がマルチターンの会話履歴を正しく保持していなかった
- 複数の `gen_ai.user.message` イベントがある場合、最後のメッセージのみが保持され、それ以前のユーザーターンが失われていた
- `gen_ai.assistant.message`（履歴）と `gen_ai.choice`（現在のターンの出力）が同じリストに混在していた

**修正内容:**
- `ConversationTurn` に新しいフィールドを追加:
  - `user_messages: List[str]` - すべてのユーザーターンを順序どおりに保持
  - `history_messages: List[Dict]` - 以前のアシスタントターンを現在のターン出力と分離して保持
- 既存の `user_message` プロパティは後方互換性のために維持（最新のエントリを返し、複数ターンを切り捨てる場合は `DeprecationWarning` を発行）

**修正後の正しい使い方:**

```python
# 新しいフィールドを使用（推奨）
conversation_turn = parser.extract_conversation_turn(span)
all_user_messages = conversation_turn.user_messages  # すべてのユーザーメッセージ
history = conversation_turn.history_messages  # 以前のアシスタントターン
current_output = conversation_turn.assistant_messages  # 現在のターンの出力のみ

# 後方互換性のあるアクセス（非推奨）
latest_user_message = conversation_turn.user_message  # 最新のユーザーメッセージのみ
```

**ポイント:**
- `assistant_messages` は現在のターンの `gen_ai.choice` 出力のみを含むように変更
- 以前のアシスタントターンは `history_messages` から取得
- ADOT ワイヤーフォーマットの形状は維持（`input.messages` により多くのエントリが含まれる）

## まとめ

このリリースでは、AI エージェントの決済機能を実現する AgentCore Payments モジュールが追加され、x402 プロトコルによるマイクロトランザクション処理が可能になりました。また、Strands のマルチターン会話履歴が正しく保持されるようになり、Observability やオンライン評価の精度が向上しています。
