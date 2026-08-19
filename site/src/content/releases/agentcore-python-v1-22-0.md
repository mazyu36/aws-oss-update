---
title: "AgentCore Python SDK v1.22.0 リリース解説"
version: "v1.22.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-08-18
summary: "Payments SDK に 3 つの決済機能が追加されました。Machine Payments Protocol (MPP) のネイティブサポート、x402 の `upto` スキーム（Permit2 アローワンス上限）対応、そして OAuth 同意を伴う PaymentConnector の Quick Create プロビジョニングモードです。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.22.0"
---

## 概要

このリリースでは AgentCore Payments SDK に 3 つの新しい決済機能が追加されました。1 つ目は Machine Payments Protocol (MPP) のネイティブサポートで、`WWW-Authenticate: Payment` チャレンジの解析・選択・決済処理を自動化します。2 つ目は x402 プロトコルの `upto` スキームサポートで、Permit2 のアローワンス上限を指定できるようになります。3 つ目は PaymentConnector の Quick Create モードで、OAuth 同意フローを介してクレデンシャルプロバイダをサービス側でプロビジョニングできます。

**リリース:** [v1.22.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.22.0)

## 新機能

### Machine Payments Protocol (MPP) サポートの追加 ([#643](https://github.com/aws/bedrock-agentcore-sdk-python/pull/643))

**この機能でできること:**
- HTTP `402 Payment Required` レスポンスの `WWW-Authenticate: Payment` チャレンジをネイティブに解析・選択できるようになりました
- EVM、Tempo、Solana の `charge` 方式に対応し、ネットワーク優先度と有効期限を考慮した自動選択が可能です
- Strands プラグイン・LangGraph ミドルウェアで MPP の検出、決済、リトライ、レシート処理が自動で行われます
- サーバーが MPP と x402 の両方を広告し、かつ MPP チャレンジがどれも満たせない場合は自動的に x402 にフォールバックします

**使用例（低レベル API での MPP チャレンジ解析）:**

```python
from bedrock_agentcore.payments import (
    extract_challenges,
    is_mpp_payment_required,
    parse_www_authenticate,
    select_challenge,
)

# HTTP レスポンスヘッダから MPP チャレンジを検出
response_headers = {
    "WWW-Authenticate": 'Payment realm="api.example.com", id="...", method="evm", intent="charge", request="..."',
}

# 402 レスポンスかつ Payment スキームを含むか判定
if is_mpp_payment_required(status_code=402, headers=response_headers):
    # WWW-Authenticate ヘッダから複数チャレンジを抽出（不正なチャレンジはスキップ）
    challenges = extract_challenges(response_headers)

    # 支払いインストゥルメントが対応可能なチャレンジを 1 つ選択
    # ネットワーク優先度（Solana mainnet → Base mainnet → Ethereum mainnet の順）に従う
    selected = select_challenge(
        challenges,
        instrument_blockchain="ETHEREUM",  # または "SOLANA"
    )
```

**使用例（Strands プラグインでの自動 MPP 決済）:**

```python
from bedrock_agentcore.payments.integrations.config import AgentCorePaymentsPluginConfig
from bedrock_agentcore.payments.integrations.strands.plugin import AgentCorePaymentsPlugin
from strands import Agent

config = AgentCorePaymentsPluginConfig(
    payment_manager_arn="arn:aws:bedrock-agentcore:us-west-2:123456789012:payment-manager/pm-abc",
    user_id="user-123",
    payment_instrument_id="pi-xyz",
    # MPP 固有: 買い手側でガス代を負担することを許可（None なら未送信、プロトコルのデフォルトに従う）
    # 売り手が feePayer をサポートしていない場合、True でなければサービス側で検証エラーとなる
    buyer_pays_gas_fees=True,
)

plugin = AgentCorePaymentsPlugin(config)
agent = Agent(plugins=[plugin])

# エージェントがツール呼び出しで 402 + WWW-Authenticate: Payment を受け取ると、
# プラグインが自動的に MPP チャレンジを解析・選択し、ProcessPayment を呼び出して
# Authorization: Payment <credential> ヘッダ付きでリトライする
result = agent("Buy me a coffee via https://mpp.dev/coffee")
```

**ポイント:**
- MPP チャレンジは `charge` インテントのみサポートされます。`session` や `subscription` を広告するチャレンジは選択時にフィルタされます
- ネットワーク優先度は「Solana Mainnet → Base Mainnet (低ガス) → Ethereum Mainnet → その他」の順で、`bedrock_agentcore.payments.constants.NETWORK_PREFERENCES` にハードコードされています
- LangGraph ミドルウェアがリトライを行う際、生成済みのクレデンシャルを再利用するため、二重決済が防止されます
- 不正な形式の MPP チャレンジは選択前に拒否されるため、有効な MPP や x402 の代替チャレンジを抑制することはありません
- `boto3>=1.43.72` と `botocore>=1.43.72` が必要です（MPP のネイティブ入出力シェイプが含まれる最初のモデルリリース）
- Solana の `methodDetails.network` は省略時に `mainnet` とみなされ、`localnet` は意図的に別環境として扱われる（`solana-testnet` を satisfying しない）ため誤ランクを防ぎます

---

### x402 `upto` スキーム（`permit2_allowance_limit`）のサポート ([#643](https://github.com/aws/bedrock-agentcore-sdk-python/pull/643))

**この機能でできること:**
- x402 の `upto` 要件に対応するため、`permit2_allowance_limit` オプションが追加されました
- Permit2 コントラクトへのオンチェーン `approve` を実行するためのアローワンス上限を、資産の最小単位（例: USDC なら 6 桁小数の raw 整数）で指定できます
- `exact` スキームでは引き続きこの設定は無視されます（未設定がデフォルト）

**使用例:**

```python
from bedrock_agentcore.payments.integrations.config import AgentCorePaymentsPluginConfig

config = AgentCorePaymentsPluginConfig(
    payment_manager_arn="arn:aws:bedrock-agentcore:us-west-2:123456789012:payment-manager/pm-abc",
    user_id="user-123",
    payment_instrument_id="pi-xyz",
    # x402 upto: Permit2 の最大アローワンス（資産の最小単位, 正の ASCII 整数の文字列）
    # 例: "1000000" は USDC の 1.0 に相当（6 桁小数）
    # exact スキームの要件では無視される。省略時（デフォルト）は upto を使わない
    permit2_allowance_limit="1000000",
)
```

**ポイント:**
- `permit2_allowance_limit` は Smithy 互換の正の ASCII 整数のみ許容されます（`_validation.py` で検証）
- 選択された要件が `upto` の場合のみ、`cryptoX402.permit2AllowanceLimit` として ProcessPayment に渡されます
- Strands プラグイン・LangGraph ミドルウェアの両方でスレッドスルーされます

---

### PaymentConnector Quick Create プロビジョニングモードの追加 ([#643](https://github.com/aws/bedrock-agentcore-sdk-python/pull/643))

**この機能でできること:**
- `PaymentConnectorProvisionMode` 列挙型が追加され、`MANUAL`（デフォルト）または `QUICK_CREATE` を指定できるようになりました
- `QUICK_CREATE` を使用すると、OAuth 同意フローを介してサービスがクレデンシャルプロバイダをプロビジョニングします
- 作成レスポンスから `authorizationUrl` を取得でき、ユーザーがそこを開いて OAuth 同意を完了できます
- 新しいコネクタステータスとして `PENDING_AUTHENTICATION`、`PROVISIONING`、`AUTHENTICATION_EXPIRED`、`AUTHENTICATION_FAILED` が追加されました

**使用例:**

```python
from bedrock_agentcore.payments import PaymentClient, PaymentConnectorProvisionMode

client = PaymentClient(region_name="us-west-2")

# Quick Create: credential_provider_configurations は空リストにする
# サービス側が OAuth 同意後にクレデンシャルプロバイダをプロビジョニングする
response = client.create_payment_connector(
    payment_manager_id="pm-abc",
    name="my-quick-connector",
    connector_type="CoinbaseCDP",
    credential_provider_configurations=[],  # Quick Create では必ず空
    provision_mode=PaymentConnectorProvisionMode.QUICK_CREATE,
    # wait_for_ready=True は QUICK_CREATE では使えない（ValueError）
    # ユーザー同意が先に必要なため、後から get_payment_connector をポーリングする
)

connector_id = response["paymentConnectorId"]
# status は PENDING_AUTHENTICATION、authorizationUrl が付与される
auth_url = response["authorizationUrl"]
print(f"Please open this URL to authorize: {auth_url}")

# ユーザー同意完了後は get_payment_connector でステータス遷移を確認
status_response = client.get_payment_connector(
    payment_manager_id="pm-abc",
    payment_connector_id=connector_id,
)
# 同意前: PENDING_AUTHENTICATION → 同意後: PROVISIONING → READY
# 失敗パス: AUTHENTICATION_EXPIRED / AUTHENTICATION_FAILED
```

**ポイント:**
- `provision_mode` は文字列（`"QUICK_CREATE"` / `"MANUAL"`）と `PaymentConnectorProvisionMode` 列挙型の両方を受け付けます
- 従来の MANUAL の動作は完全に保たれます。`provision_mode` を省略した場合は `provisionMode` パラメータそのものが送信されず、サービスのデフォルト（MANUAL）が適用されます
- `wait_for_ready=True` は `QUICK_CREATE` と同時使用できません。ユーザー同意が先に完了する必要があるため、`ValueError` が投げられます
- `authorizationUrl` は `PENDING_AUTHENTICATION` 状態のときのみ、`create_payment_connector` と `get_payment_connector` の両方で返されます
- 既存の待機用引数（`wait_for_ready`、`max_wait`、`poll_interval`）の位置は変わっていないため、後方互換性が保たれています

## まとめ

このリリースは Payments SDK に MPP のネイティブサポート、x402 `upto` スキーム、PaymentConnector Quick Create という 3 つの決済機能を追加する重要なアップデートです。特に MPP のサポートにより、Strands や LangGraph エージェントが `mpp.dev` 準拠のサーバーに対して自動的に機械間決済を行えるようになります。
