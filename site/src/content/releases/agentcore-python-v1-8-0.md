---
title: "AgentCore Python SDK v1.8.0 リリース解説"
version: "v1.8.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-04-30
summary: "バッチ評価機能と Config Bundle サポート、On-Behalf-Of トークン交換のサポートが追加されました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.8.0"
---

## 概要

このリリースでは、評価機能のプレビュー機能としてバッチ評価とシミュレートデータセット、Config Bundle のサポートが追加されました。また、認証フローに `ON_BEHALF_OF_TOKEN_EXCHANGE` オプションと `resources` / `audiences` パラメータが追加されています。

**リリース:** [v1.8.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.8.0)

## 新機能

### バッチ評価と Config Bundle サポート ([#446](https://github.com/aws/bedrock-agentcore-sdk-python/pull/446))

**この機能でできること:**
- データセット全体に対してバッチ評価を実行し、結果を非同期で取得できます
- Ground truth サポートとシミュレートデータセットを使用した評価が可能です
- Config Bundle を使用して、OTEL baggage から設定値を読み取りルーティング実験を行えます

**バッチ評価の使用例:**

```python
from bedrock_agentcore.evaluation import (
    BatchEvaluationRunner,
    BatchEvaluationRunConfig,
    Dataset,
    PredefinedScenario,
    Turn,
)

# バッチ評価ランナーを初期化
runner = BatchEvaluationRunner(region="us-west-2")

# エージェント呼び出し関数を定義
async def agent_invoker(input_text: str, session_id: str) -> str:
    # エージェントのロジックを実装
    return "agent response"

# 評価用データセットを作成（Ground truth サポート）
dataset = Dataset(
    scenarios=[
        PredefinedScenario(
            scenario_id="scenario-1",
            turns=[
                Turn(
                    input="注文のステータスを教えてください",
                    expected_response="注文番号を教えてください"
                )
            ],
            # Ground truth としてアサーションを追加
            assertions=["注文番号の確認を行う"],
            # 期待されるツール呼び出し順序を指定
            expected_trajectory=["GetOrderStatus", "FormatResponse"],
        ),
    ]
)

# バッチ評価の設定
config = BatchEvaluationRunConfig(
    agent_id="my-agent-id",
    evaluation_name="my-batch-evaluation",
)

# バッチ評価を実行（非同期で AgentCore Evaluation Service API を使用）
result = runner.run(
    config=config,
    dataset=dataset,
    agent_invoker=agent_invoker,
)

# 結果を確認
print(f"Status: {result.status}")
print(f"Summary: {result.summary}")
```

**シミュレートデータセットの使用例:**

```python
from bedrock_agentcore.evaluation import (
    BatchEvaluationRunner,
    Dataset,
    SimulatedScenario,
)

# シミュレートシナリオを使用したデータセット
dataset = Dataset(
    scenarios=[
        SimulatedScenario(
            scenario_id="simulated-1",
            system_prompt="カスタマーサポートエージェントとして振る舞ってください",
            user_persona="イライラした顧客として振る舞う",
            max_turns=5,
            assertions=["顧客の問題を解決する"],
        ),
    ]
)
```

**Config Bundle の使用例:**

```python
from bedrock_agentcore.config_bundle import (
    ConfigBundleClient,
    ConfigBundleRef,
)
from bedrock_agentcore.runtime import BedrockAgentCoreApp

# Config Bundle クライアントを初期化
client = ConfigBundleClient(region_name="us-west-2")

# Config Bundle バージョンを取得
bundle_version = client.get_configuration_bundle_version(
    bundleId="my-bundle-id",
    version="1",
)

# OTEL baggage から Config Bundle 参照を読み取り
# リクエストヘッダーから baggage を解析
from bedrock_agentcore.config_bundle.baggage import _extract_baggage, _parse_config_bundle_baggage

headers = request.headers  # Starlette Headers など
all_baggage = _extract_baggage(headers)
bundle_ref = _parse_config_bundle_baggage(all_baggage)

if bundle_ref:
    print(f"Bundle ARN: {bundle_ref.bundle_arn}")
    print(f"Bundle Version: {bundle_ref.bundle_version}")
    print(f"Bundle ID: {bundle_ref.bundle_id}")
```

**ポイント:**
- `BatchEvaluationRunner` はプレビュー機能です。将来のリリースで変更される可能性があります
- バッチ評価は AgentCore Evaluation Service の API を使用して非同期で実行されます
- `PredefinedScenario` では `assertions` と `expected_trajectory` を使用して Ground truth を指定できます
- `SimulatedScenario` では LLM を使用してユーザーの振る舞いをシミュレートします
- `ConfigBundleClient` は `bedrock-agentcore-control` の boto3 クライアントをラップし、遅延初期化を行います

---

### On-Behalf-Of トークン交換サポート ([#447](https://github.com/aws/bedrock-agentcore-sdk-python/pull/447))

**この機能でできること:**
- `requires_access_token` デコレーターで `ON_BEHALF_OF_TOKEN_EXCHANGE` 認証フローを使用できます
- `resources` と `audiences` パラメータを指定してトークンリクエストをカスタマイズできます

**使用例:**

```python
from bedrock_agentcore.identity import requires_access_token

@requires_access_token(
    provider_name="my-oauth-provider",
    scopes=["read", "write"],
    # 新しい認証フロー: On-Behalf-Of トークン交換
    auth_flow="ON_BEHALF_OF_TOKEN_EXCHANGE",
    # 新しいパラメータ: resources と audiences を指定
    resources=["https://api.example.com"],
    audiences=["https://api.example.com/v1"],
)
async def call_external_api(query: str, *, access_token: str) -> str:
    """外部 API を On-Behalf-Of トークンで呼び出す"""
    import httpx
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.example.com/data",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"q": query},
        )
        return response.text
```

**`requires_access_token` の新しいパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `auth_flow` | `Literal["M2M", "USER_FEDERATION", "ON_BEHALF_OF_TOKEN_EXCHANGE"]` | 認証フロータイプ。`ON_BEHALF_OF_TOKEN_EXCHANGE` が新たに追加 |
| `resources` | `Optional[List[str]]` | OAuth2 リソースのリスト |
| `audiences` | `Optional[List[str]]` | OAuth2 オーディエンスのリスト |

**ポイント:**
- `ON_BEHALF_OF_TOKEN_EXCHANGE` は、ユーザーの代理としてトークンを取得する場合に使用します
- `resources` と `audiences` は `IdentityClient.get_token()` に渡されます
- 既存の `M2M` と `USER_FEDERATION` フローも引き続きサポートされています

## まとめ

このリリースでは、Bedrock AgentCore の評価機能が大幅に拡張され、バッチ評価、Ground truth サポート、シミュレートデータセットが追加されました。また、Config Bundle を使用したルーティング実験の構成管理と、On-Behalf-Of トークン交換による柔軟な認証オプションが利用可能になりました。
