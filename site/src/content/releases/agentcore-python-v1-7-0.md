---
title: "bedrock-agentcore-sdk-python v1.7.0"
version: "v1.7.0"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-04-28
summary: "5 つの新しいプリミティブクライアント（Policy、Gateway、Evaluation、Runtime、Identity）にパススルー機能と *_and_wait ポーリングメソッドを追加。boto3 API を直接利用しながら snake_case サポートや便利なヘルパーメソッドが使えるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.7.0"
---

## 概要

このリリースでは、Bedrock AgentCore SDK の主要なプリミティブクライアント（PolicyEngineClient、GatewayClient、EvaluationClient、AgentCoreRuntimeClient、IdentityClient）に `__getattr__` パススルー機能が追加されました。これにより、boto3 のコントロールプレーン/データプレーン API を直接呼び出しながら、snake_case キーワード引数のサポートや `*_and_wait` ポーリングメソッドなどの便利な機能を利用できます。

**リリース:** [v1.7.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.7.0)

## 新機能

### PolicyEngineClient の追加 ([#427](https://github.com/aws/bedrock-agentcore-sdk-python/pull/427))

**この機能でできること:**
- Policy Engine と Policy の CRUD 操作を実行できます
- 自然言語から Cedar ポリシーを生成する機能を利用できます
- `*_and_wait` メソッドでリソースの作成/更新/削除完了を待機できます

**使用例:**

```python
from bedrock_agentcore.policy import PolicyEngineClient

# クライアントの初期化
client = PolicyEngineClient(region_name="us-east-1")

# Policy Engine を作成して完了を待機
engine = client.create_policy_engine_and_wait(
    name="my-policy-engine",
    description="アクセス制御用ポリシーエンジン",
)

# ポリシーを作成して完了を待機
policy = client.create_policy_and_wait(
    policy_engine_identifier=engine["policyEngineId"],
    name="read-only-policy",
    definition={
        "cedar": {
            "statement": 'permit(principal, action == Action::"read", resource);'
        }
    },
)

# 自然言語からポリシーを生成（end-to-end フロー）
generated_policy = client.generate_and_create_policy(
    policy_engine_identifier=engine["policyEngineId"],
    name="generated-policy",
    description="管理者のみ書き込み可能",
    prompt="管理者ロールを持つユーザーのみが書き込み操作を実行できるようにする",
)

# 冪等な作成（既存リソースがあれば取得）
engine = client.create_or_get_policy_engine(
    name="my-policy-engine",
)

# ポリシーの一覧取得（snake_case でも OK）
policies = client.list_policies(policy_engine_identifier=engine["policyEngineId"])

# クリーンアップ
client.delete_policy_and_wait(
    policy_engine_identifier=engine["policyEngineId"],
    policy_identifier=policy["policyId"],
)
client.delete_policy_engine_and_wait(
    policy_engine_identifier=engine["policyEngineId"],
)
```

**主要メソッド:**

| カテゴリ | メソッド |
|---------|---------|
| Policy Engine CRUD | `create_policy_engine`, `get_policy_engine`, `list_policy_engines`, `update_policy_engine`, `delete_policy_engine` |
| Policy CRUD | `create_policy`, `get_policy`, `list_policies`, `update_policy`, `delete_policy` |
| ポリシー生成 | `start_policy_generation`, `get_policy_generation`, `list_policy_generations`, `list_policy_generation_assets` |
| 待機メソッド | `create_policy_engine_and_wait`, `update_policy_engine_and_wait`, `delete_policy_engine_and_wait`, `create_policy_and_wait`, `delete_policy_and_wait` |
| ヘルパー | `generate_policy_asset_and_wait`, `generate_and_create_policy`, `create_policy_from_generation_asset`, `create_or_get_policy_engine`, `create_or_get_policy` |

---

### GatewayClient の追加 ([#428](https://github.com/aws/bedrock-agentcore-sdk-python/pull/428))

**この機能でできること:**
- Gateway、Gateway Target、Gateway Rule の CRUD 操作を実行できます
- 名前ベースでリソースを検索できます
- `*_and_wait` メソッドでリソースの作成/更新/削除完了を待機できます

**使用例:**

```python
from bedrock_agentcore.gateway import GatewayClient

# クライアントの初期化
client = GatewayClient(region_name="us-east-1")

# Gateway を作成して完了を待機
gateway = client.create_gateway_and_wait(
    name="my-gateway",
    protocol_type="MCP",  # snake_case キーワードがサポートされる
)

# Gateway Target を作成して完了を待機
target = client.create_gateway_target_and_wait(
    gateway_identifier=gateway["gatewayId"],
    name="my-target",
    endpoint_configuration={
        "lambdaTarget": {
            "lambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:my-function"
        }
    },
)

# 名前で Gateway を検索
found_gateway = client.get_gateway_by_name(name="my-gateway")

# 名前で Gateway Target を検索
found_target = client.get_gateway_target_by_name(
    gateway_identifier=gateway["gatewayId"],
    name="my-target",
)

# ターゲットの同期
client.synchronize_gateway_targets(gateway_identifier=gateway["gatewayId"])

# クリーンアップ
client.delete_gateway_target_and_wait(
    gateway_identifier=gateway["gatewayId"],
    target_identifier=target["targetId"],
)
client.delete_gateway_and_wait(gateway_identifier=gateway["gatewayId"])
```

**主要メソッド:**

| カテゴリ | メソッド |
|---------|---------|
| Gateway CRUD | `create_gateway`, `get_gateway`, `list_gateways`, `update_gateway`, `delete_gateway` |
| Gateway Target CRUD | `create_gateway_target`, `get_gateway_target`, `list_gateway_targets`, `update_gateway_target`, `delete_gateway_target` |
| Gateway Rule CRUD | `create_gateway_rule`, `get_gateway_rule`, `list_gateway_rules`, `update_gateway_rule`, `delete_gateway_rule` |
| 待機メソッド | `create_gateway_and_wait`, `update_gateway_and_wait`, `delete_gateway_and_wait`, `create_gateway_target_and_wait`, `update_gateway_target_and_wait`, `delete_gateway_target_and_wait` |
| ヘルパー | `get_gateway_by_name`, `get_gateway_target_by_name`, `synchronize_gateway_targets` |

---

### EvaluationClient へのパススルー追加 ([#430](https://github.com/aws/bedrock-agentcore-sdk-python/pull/430))

**この機能でできること:**
- Evaluator と Online Evaluation Config の CRUD 操作を実行できます
- コントロールプレーンとデータプレーン API の両方にアクセスできます
- 既存の `run()` メソッドに加えて、より細かい制御が可能になります

**使用例:**

```python
from bedrock_agentcore.evaluation import EvaluationClient

# クライアントの初期化
client = EvaluationClient(region_name="us-east-1")

# カスタム Evaluator を作成して完了を待機
evaluator = client.create_evaluator_and_wait(
    name="my-custom-evaluator",
    evaluator_type="CODE_BASED",
    code_based_evaluator_config={
        "lambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:my-evaluator"
    },
)

# Online Evaluation Config を作成して完了を待機
config = client.create_online_evaluation_config_and_wait(
    name="my-eval-config",
    memory_id="my-memory-id",
    evaluator_ids=[evaluator["evaluatorId"]],
)

# ビルトイン Evaluator の取得
builtin = client.get_evaluator(evaluator_identifier="builtin-evaluator-id")

# 評価の実行（データプレーン）
result = client.evaluate(
    evaluator_identifier=evaluator["evaluatorId"],
    evaluation_input={...},
)

# 一覧取得（snake_case でも OK）
evaluators = client.list_evaluators(max_results=10)

# クリーンアップ
client.delete_online_evaluation_config_and_wait(
    online_evaluation_config_identifier=config["onlineEvaluationConfigId"],
)
client.delete_evaluator_and_wait(evaluator_identifier=evaluator["evaluatorId"])
```

**主要メソッド:**

| カテゴリ | メソッド |
|---------|---------|
| Evaluator CRUD | `create_evaluator`, `get_evaluator`, `list_evaluators`, `update_evaluator`, `delete_evaluator` |
| Online Evaluation Config | `create_online_evaluation_config`, `get_online_evaluation_config`, `list_online_evaluation_configs`, `update_online_evaluation_config`, `delete_online_evaluation_config` |
| 待機メソッド | `create_evaluator_and_wait`, `update_evaluator_and_wait`, `delete_evaluator_and_wait`, `create_online_evaluation_config_and_wait`, `update_online_evaluation_config_and_wait`, `delete_online_evaluation_config_and_wait` |
| データプレーン | `evaluate` |

---

### AgentCoreRuntimeClient へのパススルー追加 ([#434](https://github.com/aws/bedrock-agentcore-sdk-python/pull/434))

**この機能でできること:**
- Agent Runtime と Agent Runtime Endpoint の CRUD 操作を実行できます
- Runtime とエンドポイントの集約ステータスを一度に取得できます
- エンドポイントとランタイムを順序通りに削除できます

**使用例:**

```python
from bedrock_agentcore.runtime import AgentCoreRuntimeClient

# クライアントの初期化
client = AgentCoreRuntimeClient(region_name="us-east-1")

# Agent Runtime を作成して完了を待機
runtime = client.create_agent_runtime_and_wait(
    name="my-runtime",
    role_arn="arn:aws:iam::123456789012:role/AgentRuntimeRole",
    agent_runtime_artifact={
        "s3Artifact": {
            "s3Uri": "s3://my-bucket/agent-code.zip"
        }
    },
)

# Agent Runtime Endpoint を作成して完了を待機
endpoint = client.create_agent_runtime_endpoint_and_wait(
    agent_runtime_id=runtime["agentRuntimeId"],
    name="my-endpoint",
)

# 集約ステータスを取得（Runtime + Endpoint のステータスを一度に）
status = client.get_aggregated_status(
    agent_runtime_id=runtime["agentRuntimeId"],
    endpoint_name="my-endpoint",
)
print(f"Runtime: {status['runtime_status']}, Endpoint: {status['endpoint_status']}")

# Runtime の呼び出し（データプレーン）
response = client.invoke_agent_runtime(
    agent_runtime_id=runtime["agentRuntimeId"],
    agent_runtime_endpoint_id=endpoint["agentRuntimeEndpointId"],
    input_payload={...},
)

# 一覧取得（snake_case でも OK）
runtimes = client.list_agent_runtimes(max_results=10)

# 順序通りにクリーンアップ（エンドポイント → Runtime）
client.teardown_endpoint_and_runtime(
    agent_runtime_id=runtime["agentRuntimeId"],
    agent_runtime_endpoint_id=endpoint["agentRuntimeEndpointId"],
)
```

**主要メソッド:**

| カテゴリ | メソッド |
|---------|---------|
| Runtime CRUD | `create_agent_runtime`, `get_agent_runtime`, `list_agent_runtimes`, `update_agent_runtime`, `delete_agent_runtime` |
| Endpoint CRUD | `create_agent_runtime_endpoint`, `get_agent_runtime_endpoint`, `list_agent_runtime_endpoints`, `update_agent_runtime_endpoint`, `delete_agent_runtime_endpoint` |
| バージョン管理 | `list_agent_runtime_versions`, `delete_agent_runtime_version` |
| 待機メソッド | `create_agent_runtime_and_wait`, `update_agent_runtime_and_wait`, `delete_agent_runtime_and_wait`, `create_agent_runtime_endpoint_and_wait`, `update_agent_runtime_endpoint_and_wait` |
| データプレーン | `invoke_agent_runtime`, `stop_runtime_session` |
| ヘルパー | `get_aggregated_status`, `teardown_endpoint_and_runtime` |

---

### IdentityClient へのパススルー追加 ([#429](https://github.com/aws/bedrock-agentcore-sdk-python/pull/429))

**この機能でできること:**
- OAuth2/API Key Credential Provider の CRUD 操作を実行できます
- Workload Identity の管理ができます
- 各種トークンの取得ができます

**使用例:**

```python
from bedrock_agentcore.services.identity import IdentityClient

# クライアントの初期化
client = IdentityClient(region_name="us-east-1")

# OAuth2 Credential Provider を作成
provider = client.create_oauth2_credential_provider(
    name="my-oauth2-provider",
    credential_provider_vendor="GOOGLE",
    oauth2_provider_config_custom={
        "authorizationEndpoint": "https://accounts.google.com/o/oauth2/auth",
        "tokenEndpoint": "https://oauth2.googleapis.com/token",
        "clientId": "your-client-id",
        "clientSecretSecretArn": "arn:aws:secretsmanager:...",
    },
)

# API Key Credential Provider を作成
api_key_provider = client.create_api_key_credential_provider(
    name="my-api-key-provider",
    api_key_secret_arn="arn:aws:secretsmanager:...",
)

# Workload Identity を取得
identity = client.get_workload_identity(workload_identity_id="my-workload-id")

# OAuth2 トークンを取得
token = client.get_resource_oauth2_token(
    oauth2_credential_provider_id=provider["oauth2CredentialProviderId"],
    scopes=["read", "write"],
)

# 一覧取得（snake_case でも OK）
providers = client.list_oauth2_credential_providers(max_results=10)

# クリーンアップ
client.delete_oauth2_credential_provider(
    oauth2_credential_provider_id=provider["oauth2CredentialProviderId"],
)
client.delete_api_key_credential_provider(
    api_key_credential_provider_id=api_key_provider["apiKeyCredentialProviderId"],
)
```

**主要メソッド:**

| カテゴリ | メソッド |
|---------|---------|
| OAuth2 Credential Provider | `create_oauth2_credential_provider`, `get_oauth2_credential_provider`, `list_oauth2_credential_providers`, `update_oauth2_credential_provider`, `delete_oauth2_credential_provider` |
| API Key Credential Provider | `create_api_key_credential_provider`, `get_api_key_credential_provider`, `list_api_key_credential_providers`, `delete_api_key_credential_provider` |
| Workload Identity | `get_workload_identity`, `update_workload_identity`, `create_workload_identity` |
| トークン取得 | `get_resource_oauth2_token`, `get_resource_api_key`, `get_workload_access_token`, `get_workload_access_token_for_jwt`, `get_workload_access_token_for_user_id` |

---

## 共通機能

すべての新しいクライアントは以下の共通機能をサポートしています:

**snake_case キーワード引数:**
```python
# camelCase でも snake_case でも OK
client.create_policy_engine(name="test", policyEngineId="123")
client.create_policy_engine(name="test", policy_engine_id="123")
```

**WaitConfig によるポーリング設定:**
```python
from bedrock_agentcore.utils.wait import WaitConfig

# カスタムのポーリング設定
config = WaitConfig(
    max_wait_time=300,  # 最大待機時間（秒）
    delay=5,            # ポーリング間隔（秒）
)
client.create_policy_engine_and_wait(name="test", wait_config=config)
```

## まとめ

このリリースでは、Bedrock AgentCore SDK の主要なプリミティブクライアントに包括的なパススルー機能が追加されました。boto3 API を直接利用しながら、snake_case サポート、`*_and_wait` ポーリングメソッド、便利なヘルパーメソッドを活用して、より簡潔で保守しやすいコードを書くことができます。
