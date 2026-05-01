---
title: "bedrock-agentcore-sdk-python v1.5.0"
version: "v1.5.0"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-03-30
summary: "評価機能の大幅強化: OnDemandEvaluationDatasetRunner と Ground Truth サポートを追加。また、Browser と CodeInterpreter に証明書およびエンタープライズポリシーのサポートを追加しました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.5.0"
---

## 概要

このリリースでは、エージェント評価機能が大幅に強化され、データセットベースの評価を自動実行する `OnDemandEvaluationDatasetRunner` と、Ground Truth（正解データ）を使った評価が可能になる `ReferenceInputs` が追加されました。また、`BrowserClient` と `CodeInterpreter` にエンタープライズ向けの証明書およびポリシー設定機能が追加されました。

**リリース:** [v1.5.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.5.0)

## 新機能

### Ground Truth サポートによる評価機能の強化 ([#376](https://github.com/aws/bedrock-agentcore-sdk-python/pull/376))

**この機能でできること:**
- `ReferenceInputs` を使用して、期待される回答やツール呼び出しの順序を指定し、エージェントの出力を Ground Truth と比較評価
- 特定のトレースのみを対象にした評価も可能

**使用例:**

```python
from bedrock_agentcore.evaluation import EvaluationClient, ReferenceInputs

client = EvaluationClient(region_name="us-west-2")

# Ground Truth を指定して評価
reference_inputs = ReferenceInputs(
    assertions=["回答には製品価格が含まれている", "丁寧な口調で応答している"],
    expected_trajectory=["search_products", "get_price", "format_response"],
    expected_response="お探しの製品は現在 ¥9,800 でご購入いただけます。",
)

results = client.run(
    evaluator_ids=["accuracy", "trajectory_accuracy"],
    session_id="sess-123",
    agent_id="my-agent",
    reference_inputs=reference_inputs,
)

for result in results:
    print(f"{result['evaluatorId']}: {result.get('value')} - {result.get('explanation')}")
```

**ポイント:**
- `assertions`: 自然言語で期待される動作を記述
- `expected_trajectory`: 期待されるツール呼び出しの順序をリストで指定
- `expected_response`: 期待される回答テキスト
- `trace_id` を指定して特定のトレースのみを評価対象にすることも可能

---

### OnDemandEvaluationDatasetRunner によるデータセット評価 ([#376](https://github.com/aws/bedrock-agentcore-sdk-python/pull/376))

**この機能でできること:**
- データセット内の複数のシナリオに対して、エージェント呼び出し → スパン収集 → 評価の一連の流れを自動実行
- 並列実行による効率的なバッチ評価

**使用例:**

```python
from bedrock_agentcore.evaluation import (
    OnDemandEvaluationDatasetRunner,
    EvaluationRunConfig,
    EvaluatorConfig,
    CloudWatchAgentSpanCollector,
    Dataset,
    PredefinedScenario,
    Input,
    Turn,
)

# データセットを定義
dataset = Dataset(
    scenarios=[
        PredefinedScenario(
            scenario_id="scenario-1",
            input=Input(
                turns=[
                    Turn(input="東京の天気を教えて"),
                    Turn(input="明日は？"),
                ]
            ),
        ),
        PredefinedScenario(
            scenario_id="scenario-2",
            input=Input(turns=[Turn(input="製品 A の価格を検索して")]),
        ),
    ]
)

# 評価ランナーを設定
runner = OnDemandEvaluationDatasetRunner(region="us-west-2")
config = EvaluationRunConfig(
    evaluator_config=EvaluatorConfig(evaluator_ids=["accuracy", "toxicity"]),
    max_concurrent_scenarios=5,
    evaluation_delay_seconds=10,  # CloudWatch へのスパン取り込み待ち時間
)

# スパンコレクター
span_collector = CloudWatchAgentSpanCollector(
    log_group_name="/aws/bedrock-agentcore/runtimes/my-agent-DEFAULT",
    region="us-west-2",
)

# エージェント呼び出し関数
def invoke_agent(input):
    # 実際のエージェント呼び出しロジック
    return AgentInvokerOutput(session_id="sess-xxx", trace_ids=["trace-xxx"])

# 評価実行
result = runner.run(
    config=config,
    dataset=dataset,
    agent_invoker=invoke_agent,
    span_collector=span_collector,
)

# 結果を確認
for scenario_result in result.scenario_results:
    print(f"Scenario: {scenario_result.scenario_id}, Status: {scenario_result.status}")
```

**ポイント:**
- 3 フェーズで実行: (1) 全シナリオのエージェント呼び出し → (2) 待機 → (3) スパン収集と評価
- `max_concurrent_scenarios` で並列度を制御
- `evaluation_delay_seconds` で CloudWatch へのログ取り込みを待機

---

### AgentSpanCollector の公開 API 化 ([#376](https://github.com/aws/bedrock-agentcore-sdk-python/pull/376))

**この機能でできること:**
- `CloudWatchAgentSpanCollector` を直接使用してエージェントのスパンを収集
- カスタム評価ワークフローの構築が容易に

**使用例:**

```python
from bedrock_agentcore.evaluation import CloudWatchAgentSpanCollector
from datetime import datetime, timedelta, timezone

collector = CloudWatchAgentSpanCollector(
    log_group_name="/aws/bedrock-agentcore/runtimes/my-agent-DEFAULT",
    region="us-west-2",
    max_wait_seconds=60,
    poll_interval_seconds=2,
)

spans = collector.collect(
    session_id="sess-123",
    start_time=datetime.now(timezone.utc) - timedelta(hours=1),
    end_time=datetime.now(timezone.utc),
)

print(f"収集したスパン数: {len(spans)}")
```

---

### BrowserClient へのポリシーと証明書サポート ([#371](https://github.com/aws/bedrock-agentcore-sdk-python/pull/371))

**この機能でできること:**
- エンタープライズポリシー（Chrome 管理ポリシー）をブラウザに適用
- ルート CA 証明書を追加してプライベート TLS エンドポイントにアクセス

**使用例:**

```python
from bedrock_agentcore.tools import (
    BrowserClient,
    EnterprisePolicy,
    ResourceLocation,
    EnterprisePolicyS3Location,
    Certificate,
)

client = BrowserClient(region="us-west-2")

# エンタープライズポリシーの設定
policy = EnterprisePolicy(
    location=ResourceLocation(
        s3=EnterprisePolicyS3Location(
            bucket="my-config-bucket",
            prefix="policies/browser-policy.json",
        )
    ),
    type="MANAGED",  # CreateBrowser 時は "MANAGED"
)

# ルート CA 証明書の設定
certificate = Certificate.from_secret_arn(
    "arn:aws:secretsmanager:us-west-2:123456789012:secret:my-ca-cert"
)

# ブラウザ作成時に適用
client.create_browser(
    name="enterprise-browser",
    execution_role_arn="arn:aws:iam::123456789012:role/BrowserRole",
    enterprise_policies=[policy.to_dict()],
    certificates=[certificate.to_dict()],
)
```

**ポイント:**
- ポリシータイプは `CreateBrowser` では `"MANAGED"`、`StartBrowserSession` では `"RECOMMENDED"` を使用
- 証明書は Secrets Manager に保存し、ARN で参照

---

### CodeInterpreter への証明書サポート ([#373](https://github.com/aws/bedrock-agentcore-sdk-python/pull/373))

**この機能でできること:**
- Code Interpreter にルート CA 証明書を追加し、プライベート TLS エンドポイントへのアクセスを可能に

**使用例:**

```python
from bedrock_agentcore.tools import CodeInterpreter, Certificate

client = CodeInterpreter(region="us-west-2")

# ルート CA 証明書の設定
certificate = Certificate.from_secret_arn(
    "arn:aws:secretsmanager:us-west-2:123456789012:secret:my-ca-cert"
)

# Code Interpreter 作成時に適用
client.create_code_interpreter(
    name="secure-interpreter",
    execution_role_arn="arn:aws:iam::123456789012:role/CodeInterpreterRole",
    certificates=[certificate.to_dict()],
)
```

**ポイント:**
- `BrowserClient.create_browser()` と同じパターンで証明書を設定可能
- 社内 API やプライベートリポジトリへのアクセスに便利

## まとめ

このリリースでは、エージェントの評価機能が大幅に強化され、Ground Truth を使った精度評価やデータセットベースのバッチ評価が可能になりました。また、Browser と CodeInterpreter にエンタープライズ向けの証明書・ポリシー機能が追加され、企業環境での利用がより容易になりました。
