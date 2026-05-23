---
title: "AgentCore Python SDK v1.11.0 リリース解説"
version: "v1.11.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-05-22
summary: "Evaluation モジュールに DatasetClient とデータセット管理サービスプロバイダーが追加されました。また、Payments モジュールでは x402 自動決済パスのバグ修正、`http_request` プラグインツールの追加、EIP-3009 タイミング不整合の修正が行われています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.11.0"
---

## 概要

このリリースでは、Evaluation モジュールにマネージドデータセットを管理するための `DatasetClient` と `DatasetManagementServiceProvider` が追加されました。また、Payments モジュールでは `AgentCorePaymentsPlugin` の x402 自動決済パスを実際にオンチェーンで動作させるための複数の修正と、Strands エージェントから直接利用できる `http_request` ツールの追加が行われています。

**リリース:** [v1.11.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.11.0)

## 新機能

### Evaluation: DatasetClient とデータセット管理サービスプロバイダー ([#491](https://github.com/aws/bedrock-agentcore-sdk-python/pull/491))

**この機能でできること:**
- Bedrock AgentCore のデータセット管理 API を高水準でラップする `DatasetClient` を通じて、データセット・バージョンの作成・取得・一覧・削除、署名付き URL によるアップロード/ダウンロードを Python から扱える
- マネージドデータセットから評価シナリオを直接ロードする `DatasetManagementServiceProvider` を使い、ローカルファイルではなくサービス側で管理されたデータセットで Runner ベースの評価を実行できる
- 既存の `FileDatasetProvider` も JSONL ファイルに対応

**使用例（DatasetClient によるデータセットの管理）:**

```python
from bedrock_agentcore.evaluation import DatasetClient

client = DatasetClient(region_name="us-east-1")

# データセットの作成
dataset = client.create_dataset(
    name="my-eval-dataset",
    description="Evaluation scenarios for my agent",
)
dataset_id = dataset["datasetId"]

# JSONL ファイルをデータセットバージョンとしてアップロード
version = client.upload_dataset_version(
    dataset_id=dataset_id,
    file_path="./scenarios.jsonl",
    schema_type="EVALUATION_SCENARIO",
)

# データセットバージョンの一覧取得
versions = client.list_dataset_versions(dataset_id=dataset_id)

# JSONL ストリームとしてダウンロード（メモリ効率的に行単位で処理可能）
for record in client.download_dataset_version(
    dataset_id=dataset_id,
    version_id=version["versionId"],
):
    print(record)
```

**使用例（DatasetManagementServiceProvider による評価実行）:**

```python
from bedrock_agentcore.evaluation.runner.dataset_providers import (
    DatasetManagementServiceProvider,
)

# マネージドデータセットからシナリオをロード
provider = DatasetManagementServiceProvider(
    dataset_id="ds-xxxxxxxx",
    version_id="v-xxxxxxxx",
    agent_arn="arn:aws:bedrock-agentcore:us-east-1:123456789012:agent/my-agent",
)

# Runner と組み合わせて評価実行（リージョンは agent_arn から自動抽出）
for scenario in provider.iter_scenarios():
    # 各 Scenario は schema_type を保持しているため、ファイル/サービス両方の
    # プロバイダーで一貫した処理が可能
    print(scenario.schema_type, scenario)
```

**ポイント:**
- `DatasetClient` はアップロード/ダウンロードの署名付き URL の取り扱いやポーリングをラップしているため、低レベルの API 呼び出しを意識せずに使える
- JSONL のダウンロードはストリーム処理されるため、大規模データセットでもメモリに全件を載せずに処理可能
- リージョンは `agent_arn` から抽出されるようになり、別途 `BEDROCK_TEST_REGION` 環境変数を設定する必要はなくなった
- `Scenario` クラスがそれぞれ `schema_type` を保持するようリファクタリングされ、ファイルベース・サービスベースのプロバイダーで `_parse_scenario` を共有可能になっている

---

### Payments: AgentCorePaymentsPlugin の `http_request` ツール ([#493](https://github.com/aws/bedrock-agentcore-sdk-python/pull/493))

**この機能でできること:**
- `AgentCorePaymentsPlugin` を Strands エージェントに追加するだけで、有料 API への HTTP リクエストを行う `http_request` ツールが自動的に登録される
- `strands-agents-tools` や手書きの `httpx` ラッパーを用意せずに、x402 プロトコルによる有料 HTTP の体験を完結できる
- 自前の `http_request` ツールを使いたい場合は `provide_http_request=False` でオプトアウト可能

**使用例:**

```python
from strands import Agent
from bedrock_agentcore.payments.integrations.strands import (
    AgentCorePaymentsPlugin,
    AgentCorePaymentsPluginConfig,
)

# デフォルト設定: http_request ツールが自動で登録される
plugin = AgentCorePaymentsPlugin(
    config=AgentCorePaymentsPluginConfig(
        payment_manager_arn="arn:aws:bedrock-agentcore:...",
        payment_instrument_id="pi-xxxx",
        # provide_http_request: bool = True (デフォルト)
        #   False にすると http_request ツールは登録されず、
        #   既存の独自 http_request ツールとの重複登録エラーを回避できる
        provide_http_request=True,
        # post_payment_retry_delay_seconds: float = 3.0 (デフォルト)
        #   署名後にチェーンが 1 ブロック進むのを待ってからリトライする
        #   0 にすると待機をスキップ（テスト用途や高速チェーン向け）
        post_payment_retry_delay_seconds=3.0,
    ),
)

agent = Agent(plugins=[plugin])

# エージェントが http_request ツール経由で有料 API を呼び出すと、
# 402 レスポンスを自動的に検出して PAYMENT-SIGNATURE を生成し、リトライする
result = agent("Get the weather from https://x402.example.com/weather")
```

**ポイント:**
- `http_request` ツールが返す 402 エンベロープは、既存の `GenericPaymentHandler` / `HttpRequestPaymentHandler` が解釈する `PAYMENT_REQUIRED:` マーカー形式に従っている
- ツールの戻り値は Strands の `ToolResult` 辞書（`{status, content}`）として返される
- `httpx` は SDK の既存依存に含まれているため、新たな依存関係は追加されない
- `auto_payment` のインターセプトは独立して動作するため、自前の `http_request` を使う場合（`provide_http_request=False`）でも 402 のリトライは引き続き機能する

---

## バグ修正

### Payments: 決済署名後にマーチャント側で拒否された場合に無限リトライしないよう修正 ([#492](https://github.com/aws/bedrock-agentcore-sdk-python/pull/492))

**問題:**
- 署名済みの決済が残高不足などでマーチャント側に拒否されたとき、プラグインが失敗状態を保存し interrupt ベースのリトライをトリガーしていた
- 署名後にサーバー側で拒否された場合はリトライしても回復不可能なため、不必要なリトライが発生していた

**修正内容:**
- `payment_signed_{toolUseId}` フラグを追加し、署名成功を追跡
- 署名成功後にリトライした結果サーバーが再度 402 を返した場合は、即座に処理を停止
- 署名そのものに失敗した場合は引き続き `MAX_PAYMENT_RETRIES` まで再試行
- リトライカウンタの増加を、署名試行が成功した後に行うよう移動
- `_is_post_payment_failure` を削除し、`_has_successful_signing` で代替

---

### Payments: ProcessPayment から未サポートの `paymentConnectorId` を削除 ([#493](https://github.com/aws/bedrock-agentcore-sdk-python/pull/493))

**問題:**
- `AgentCorePaymentsPlugin` の自動決済パスで 402 が発生すると、`process_payment` が `paymentConnectorId` を含めて API を呼び出していた
- パブリックな Data Plane API である `ProcessPayment` は `paymentConnectorId` を受け付けないため、botocore が以下のエラーで失敗していた

```
Parameter validation failed:
Unknown parameter in input: "paymentConnectorId", must be one of:
userId, agentName, paymentManagerArn, paymentSessionId,
paymentInstrumentId, paymentType, paymentInput, clientToken
```

- 既存のユニットテストは `MagicMock` でクライアントをモックしていたためサービスモデルでの検証が行われず、このバグを検出できていなかった

**修正後の使い方:**

```python
from bedrock_agentcore.payments import PaymentManager

manager = PaymentManager(
    payment_manager_arn="arn:aws:bedrock-agentcore:...",
    region_name="us-east-1",
)

# payment_connector_id 引数は後方互換のため残されているが、
# ProcessPayment の呼び出しには含まれなくなった（コネクタはサーバー側で
# 決済インストルメントから解決される）
header = manager.generate_payment_header(
    payment_instrument_id="pi-xxxx",
    payment_connector_id="pc-xxxx",  # ← 受け取られるが ProcessPayment には送られない
    payment_session_id="ps-xxxx",
    user_id="user-123",
    payment_payload={...},
)
```

**ポイント:**
- `payment_connector_id` は `process_payment` / `generate_payment_header` のシグネチャに残されているため、既存コードはそのまま動作する
- `CreatePaymentInstrument` / `GetPaymentInstrument` / `ListPaymentInstruments` / `DeletePaymentInstrument` など、`paymentConnectorId` が有効な API では引き続き値が転送される

---

### Payments: EIP-3009 タイミングレース対策の `post_payment_retry_delay_seconds` 追加 ([#493](https://github.com/aws/bedrock-agentcore-sdk-python/pull/493))

**問題:**
- USDC v2 の `transferWithAuthorization` は `require(now > validAfter, ...)` という厳格な時刻チェックを行っている
- 署名サービスが `validAfter ≈ 現在時刻` で署名を発行し、ファシリテーターが同じ秒のうちにオンチェーン送信すると、`block.timestamp == validAfter` でコントラクトが revert する
- その結果、マーチャントは `invalid_payload` や `invalid_exact_evm_transaction_simulation_failed` で再度 402 を返してしまい、原因がわかりにくい状態になっていた

**修正内容:**
- 設定項目 `post_payment_retry_delay_seconds: float = 3.0` を追加
- `after_tool_call` で `generate_payment_header` 呼び出し後にこの秒数だけ `sleep` してから `event.retry = True` をセット
- これによりリトライ時にはチェーンが 1 ブロック以上進んでおり、`validAfter` 制約をクリアできる
- デフォルトの 3.0 秒は Base Sepolia の 1 ブロック（約 2 秒）＋マージン
- `0` を指定すると待機をスキップ（テストや秒以下のブロック時間のチェーン向け）
- バリデータは負数・非数値・bool を拒否

---

## まとめ

このリリースでは、Evaluation モジュールにマネージドデータセットを直接扱うための `DatasetClient` と `DatasetManagementServiceProvider` が追加され、より本番的な評価フローが組みやすくなりました。Payments モジュールでは、x402 自動決済パスを実際にオンチェーンで成功させるための複数の修正（`paymentConnectorId` の除去、EIP-3009 タイミング待機、署名後拒否時のリトライ抑制）と、`AgentCorePaymentsPlugin` 単体で完結する `http_request` ツールの追加が行われ、エージェントの有料 API 利用がより堅牢かつ簡単になっています。
