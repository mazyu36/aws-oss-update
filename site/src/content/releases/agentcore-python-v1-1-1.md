---
title: "AgentCore Python SDK v1.1.1 リリース解説"
version: "v1.1.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2025-12-03
summary: "Strands Evals フレームワークとの統合機能と、AWS STS JWT トークンによる新しい認証フローを追加。エージェントの評価テストと IAM ベースの外部 API 認証がよりシンプルになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.1"
---

## 概要

このリリースでは、Strands Evals フレームワークと AgentCore の On-Demand Evaluation API を統合する評価機能と、AWS STS を利用した JWT トークン認証フローが追加されました。これにより、エージェントの評価テストの実装が容易になり、外部サービスとの M2M 認証がよりシンプルになります。

**リリース:** [v1.1.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.1)

## 新機能

### Strands Evals 統合による AgentCore 評価機能 ([#183](https://github.com/aws/bedrock-agentcore-sdk-python/pull/183))

**この機能でできること:**
- Strands Evals フレームワークを使用して、任意のエージェントを Amazon Bedrock AgentCore の On-Demand Evaluation API で評価できます。
- OpenTelemetry スパンを ADOT 形式に自動変換し、Helpfulness、Accuracy、Harmfulness、Relevance などの組み込み評価指標や、カスタム評価 ARN を使用できます。

**使用例:**

```python
from strands_agents_evals import Dataset, Experiment
from bedrock_agentcore.evaluation.integrations.strands_agents_evals import StrandsEvalsAgentCoreEvaluator

# データセットとエージェントの設定
dataset = Dataset(...)
agent = MyAgent()

# AgentCore 評価器の作成
evaluator = StrandsEvalsAgentCoreEvaluator(
    evaluator_name="Helpfulness",  # 組み込み評価指標
    pass_score=0.7,  # テスト合格スコアの閾値
    region_name="us-east-1"
)

# 評価実験の実行
experiment = Experiment(
    agent=agent,
    dataset=dataset,
    evaluators=[evaluator]
)

results = experiment.run()
```

**ポイント:**
- OTel スパン形式と ADOT 形式の両方を自動検出して変換します
- CloudWatch から本番環境のエージェントスパンを取得して評価することも可能です
- エラー発生時は 0.0 スコアと説明を返すため、評価パイプラインが中断されません
- カスタム評価器を使用する場合は、`evaluator_name` の代わりに `evaluator_arn` パラメータを使用します

---

### AWS STS JWT トークン認証フロー ([#179](https://github.com/aws/bedrock-agentcore-sdk-python/pull/179))

**この機能でできること:**
- `@requires_access_token` デコレータで新しい `AWS_JWT` 認証フローを使用し、AWS IAM Outbound Web Identity Federation を通じて AWS STS から署名付き JWT トークンを直接取得できます。
- クレデンシャルプロバイダーやクライアントシークレット、AgentCore Identity サービスを介さずに、外部サービスとの M2M 認証が可能になります。

**使用例:**

```python
from bedrock_agentcore.tools import tool
from bedrock_agentcore.identity.auth import requires_access_token
import requests

@tool
@requires_access_token(
    auth_flow="AWS_JWT",
    audience=["https://api.example.com"],
    signing_algorithm="ES384",  # オプション: ES384 (デフォルト) または RS256
    duration_seconds=3600  # オプション: トークンの有効期限 (60-3600秒)
)
def call_external_api(*, access_token: str) -> str:
    """外部 API を JWT トークンで認証して呼び出す"""
    response = requests.get(
        "https://api.example.com/data",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    return response.text
```

**ポイント:**
- OIDC トークン検証をサポートする外部サービスとの統合がシンプルになります
- 既存の `M2M` および `USER_FEDERATION` フローには影響しません（後方互換性あり）
- `audience` パラメータは必須で、トークンの受信先 URL を指定します
- タグを追加する場合は、`tags` パラメータを使用できます

**パラメータリファレンス:**

| パラメータ | 必須となる認証フロー | 説明 |
|-----------|---------------------|------|
| `provider_name` | M2M, USER_FEDERATION | クレデンシャルプロバイダー名 |
| `scopes` | M2M, USER_FEDERATION | OAuth スコープ |
| `audience` | AWS_JWT | トークン受信先 URL |
| `signing_algorithm` | AWS_JWT (オプション) | ES384 (デフォルト) または RS256 |
| `duration_seconds` | AWS_JWT (オプション) | トークンの有効期限 (60-3600秒) |

---

## まとめ

v1.1.1 では、エージェント評価と外部 API 認証の 2 つの重要な機能強化が追加されました。Strands Evals との統合により、エージェントの品質評価がより体系的に行えるようになり、AWS STS JWT 認証により、外部サービスとの連携がよりシンプルかつセキュアになります。
