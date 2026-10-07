---
title: "AgentCore Python SDK v1.24.1 リリース解説"
version: "v1.24.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-10-07
summary: "Payment Connector のサービス管理クレデンシャルをオンデマンドでローテーションできる RotatePaymentConnectorCredentials が追加されました。あわせて get_payment_connector / list_payment_connectors のレスポンスに provisionMode と credentialsUpdatedAt が追加されています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.24.1"
---

## 概要

このリリースでは、Payment Connector のサービス管理クレデンシャルをオンデマンドでローテーションする新機能 `rotate_payment_connector_credentials()` が追加されました。あわせて `get_payment_connector()` / `list_payment_connectors()` のレスポンスに `provisionMode` と `credentialsUpdatedAt` が追加され、クレデンシャルがサービス管理か手動管理かを呼び出し側から判別できるようになりました。

**リリース:** [v1.24.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.24.1)

## 新機能

### Payment Connector のクレデンシャルローテーション対応 ([#676](https://github.com/aws/bedrock-agentcore-sdk-python/pull/676))

**この機能でできること:**
- `provisionMode` が `QUICK_CREATE` の Payment Connector が持つサービス管理クレデンシャルを、支払いプロバイダー側にサインインすることなく置き換えできます。
- Coinbase CDP の `API_KEY` と `WALLET_SECRET` を個別に、あるいは同時にローテーションできます。
- ローテーションはレスポンス返却時点で完了しているため、ポーリングは不要です。失敗時はコネクタと既存クレデンシャルは変更されず、そのまま再試行できます。

**使用例:**

```python
from bedrock_agentcore.payments import CoinbaseCdpSecret, PaymentClient

payment_client = PaymentClient(region_name="us-east-1")

# API_KEY と WALLET_SECRET の両方をローテーション
result = payment_client.rotate_payment_connector_credentials(
    payment_manager_id="payment-manager-id",
    payment_connector_id="payment-connector-id",
    # CoinbaseCdpSecret enum か文字列 ("API_KEY", "WALLET_SECRET") を指定
    secrets=[CoinbaseCdpSecret.API_KEY, CoinbaseCdpSecret.WALLET_SECRET],
    # 省略した場合は UUID が自動生成されます (冪等性トークン)
    client_token=None,
)

# レスポンス:
# {
#   "paymentConnectorId": "...",
#   "paymentManagerId": "...",
#   "status": "READY",        # 成功時は READY のまま
#   "updatedAt": "2026-10-07T...",  # ローテーション完了時刻
# }
print(result["status"], result["updatedAt"])
```

**ポイント:**
- 対象となるのは `provisionMode` が `QUICK_CREATE` のコネクタのみです。`MANUAL` のコネクタはユーザー自身がクレデンシャルを管理しているため、支払いプロバイダー側でローテーションしたうえで `UpdatePaymentCredentialProvider` に反映させる必要があります。
- `StripePrivy` には現時点でローテーション可能なサービス管理シークレットがないためエラーになります。
- ローテーションは Credential Provider 単位で動作するため、同じプロバイダーを共有している他のコネクタにも影響します。AgentCore 外で保持していた旧クレデンシャルは必ず置き換えてください。
- コネクタごとに同時に走れるローテーションは 1 件のみで、並行呼び出しは `ConflictException` になります。
- Coinbase CDP のシークレット名は `CoinbaseCdpSecret.API_KEY` / `CoinbaseCdpSecret.WALLET_SECRET` の enum として追加されています。bool ではなく enum で定義されているため、将来新しいシークレット種別が追加されても後方互換に保てます。

---

### get_payment_connector / list_payment_connectors のレスポンスに provisionMode と credentialsUpdatedAt を追加 ([#676](https://github.com/aws/bedrock-agentcore-sdk-python/pull/676))

**この機能でできること:**
- `get_payment_connector()` と `list_payment_connectors()` の戻り値に `provisionMode` フィールドが追加され、コネクタがサービス管理 (`QUICK_CREATE`) か手動管理 (`MANUAL`) かを判定できるようになりました。
- `get_payment_connector()` の戻り値に `credentialsUpdatedAt` が追加され、サービス管理クレデンシャルの最終更新時刻を参照できるようになりました（サービス側から値が返されたときのみ含まれます）。
- これまでは手書きのレスポンス dict でこれらの値が落ちており、呼び出し側からクレデンシャルの管理方式や鮮度を判別する手段がありませんでした。

**使用例:**

```python
from bedrock_agentcore.payments import PaymentClient

payment_client = PaymentClient(region_name="us-east-1")

connector = payment_client.get_payment_connector(
    payment_manager_id="pm-123",
    payment_connector_id="pc-123",
)

# provisionMode を使ってローテーション可能か判定
if connector["provisionMode"] == "QUICK_CREATE":
    last_rotation = connector.get("credentialsUpdatedAt")  # MANUAL の場合はキー自体が無い
    print(f"サービス管理コネクタ。最終更新: {last_rotation}")
    # 必要に応じて rotate_payment_connector_credentials を呼び出す
else:
    print("MANUAL コネクタ。クレデンシャルの管理はユーザー責任")
```

**ポイント:**
- `credentialsUpdatedAt` は `MANUAL` コネクタでは含まれません。`get()` / `in` でキーの有無をチェックしてください。
- `list_payment_connectors()` にも `provisionMode` が追加されているため、一覧から QUICK_CREATE なコネクタを絞り込む用途にも使えます。

## バグ修正

### Python SDK リリースの Publish 前に承認を必須化 ([#692](https://github.com/aws/bedrock-agentcore-sdk-python/pull/692))

- Python SDK のリリースワークフローで、承認チェックポイントを既存の `manual-approval` 環境経由にルーティングするように修正されました。
- `pypi` 環境と OIDC Trusted Publishing の設定は変更されておらず、リポジトリ内のワークフロー YAML だけが更新されるパッチです。
- SDK 利用側のコードには影響しない CI/CD の安全性向上です。

## まとめ

Payment Connector のサービス管理クレデンシャルを AgentCore 側だけで安全にローテーションできるようになり、合わせてコネクタがサービス管理か手動管理かを判別するためのメタデータも露出されました。Coinbase CDP の Quick Create で Payment Connector を運用している場合、本リリースの `rotate_payment_connector_credentials()` を使うことでクレデンシャルの定期更新が大幅に楽になります。
