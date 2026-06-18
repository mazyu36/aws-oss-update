---
title: "AgentCore Python SDK v1.15.0 リリース解説"
version: "v1.15.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-06-17
summary: "Knowledge Base クライアントの新規追加と、Gateway 経由で Knowledge Base を MCP ツールとして公開する Knowledge Base Target / Agentic Retrieve Target ヘルパーを追加するリリースです。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.15.0"
---

## 概要

AgentCore Python SDK v1.15.0 では、Amazon Bedrock Knowledge Base を扱う新しい `KnowledgeBaseClient` が追加され、AgentCore Gateway から Knowledge Base を MCP の `Retrieve` / `AgenticRetrieveStream` ツールとして公開するためのヘルパーメソッドも実装されました。CRUD と完了待機を組み合わせた `*_and_wait` メソッドにより、エージェントから利用する RAG 基盤を SDK だけで構築できるようになっています。

**リリース:** [v1.15.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.15.0)

## 新機能

### KnowledgeBaseClient の追加 ([#532](https://github.com/aws/bedrock-agentcore-sdk-python/pull/532))

**この機能でできること:**

- Amazon Bedrock Knowledge Base のコントロールプレーン (`bedrock-agent`) とデータプレーン (`bedrock-agent-runtime`) の両方を扱う統合クライアント `KnowledgeBaseClient` が追加されました
- パラメータは camelCase / snake_case の両方を受け付け、自動的に変換されます
- リソースの作成・更新・削除・ドキュメント取り込みについて、終了状態まで待機する `*_and_wait` メソッドが用意されています

**使用例（Knowledge Base の作成からドキュメント取り込みまで）:**

```python
from bedrock_agentcore.knowledge_base import KnowledgeBaseClient

client = KnowledgeBaseClient(region_name="us-east-1")

# Knowledge Base を作成し、ACTIVE になるまで待機
kb = client.create_knowledge_base_and_wait(
    name="my-kb",
    roleArn="arn:aws:iam::123456789012:role/KBRole",
    knowledgeBaseConfiguration={
        "type": "VECTOR",
        "vectorKnowledgeBaseConfiguration": {
            "embeddingModelArn": (
                "arn:aws:bedrock:us-east-1::foundation-model/"
                "amazon.titan-embed-text-v2:0"
            ),
        },
    },
    storageConfiguration={...},
)
kb_id = kb["knowledgeBaseId"]

# Data Source を作成
ds = client.create_data_source(
    knowledgeBaseId=kb_id,
    name="my-ds",
    dataSourceConfiguration={...},
)

# Ingestion ジョブを開始し COMPLETE まで待機
client.start_ingestion_job_and_wait(
    knowledgeBaseId=kb_id,
    dataSourceId=ds["dataSource"]["dataSourceId"],
)

# データプレーン: 取得 (Retrieve)
results = client.retrieve(
    knowledgeBaseId=kb_id,
    retrievalQuery={"text": "What is AgentCore?"},
)
```

**ポイント:**

- `KnowledgeBaseClient` のコンストラクタは `region_name` / `integration_source` / `boto3_session` を受け取り、`boto3.Session` 経由で名前付きプロファイルや独自のクレデンシャルを差し込めます
- `*_and_wait` メソッドは `WaitConfig`（デフォルト: `max_wait=300`、`poll_interval=10` 秒）を受け取り、`FAILED` 系ステータスに到達した場合は `RuntimeError`、タイムアウトした場合は `TimeoutError` を送出します
- 許可されたコントロールプレーン API: `create_knowledge_base` / `get_knowledge_base` / `update_knowledge_base` / `delete_knowledge_base` / `list_knowledge_bases`、`create_data_source` / `get_data_source` / `update_data_source` / `delete_data_source` / `list_data_sources`、`start_ingestion_job` / `get_ingestion_job` / `stop_ingestion_job` / `list_ingestion_jobs`、`ingest_knowledge_base_documents` / `get_knowledge_base_documents` / `delete_knowledge_base_documents` / `list_knowledge_base_documents`、`tag_resource` / `untag_resource` / `list_tags_for_resource`
- 許可されたデータプレーン API: `retrieve` / `retrieve_and_generate` / `retrieve_and_generate_stream` / `generate_query` / `rerank` / `agentic_retrieve_stream`
- `*_and_wait` のバリエーション: `create_knowledge_base_and_wait` / `update_knowledge_base_and_wait` / `delete_knowledge_base_and_wait` / `start_ingestion_job_and_wait` / `ingest_knowledge_base_documents_and_wait`

---

### Gateway: Knowledge Base Target ヘルパーの追加 ([#532](https://github.com/aws/bedrock-agentcore-sdk-python/pull/532))

**この機能でできること:**

- `GatewayClient.create_knowledge_base_target()` で、既存の Knowledge Base を AgentCore Gateway から MCP の `Retrieve` ツールとして公開できます
- ターゲット設定 (`targetConfiguration.mcp.connector`) や `credentialProviderConfigurations`（デフォルトは `GATEWAY_IAM_ROLE`）を内部で組み立てるため、利用側は Knowledge Base ID を渡すだけで済みます

**使用例:**

```python
from bedrock_agentcore.gateway.client import GatewayClient

gateway_client = GatewayClient(region_name="us-west-2")

# Gateway を作成
gateway = gateway_client.create_gateway_and_wait(
    name="my-gateway",
    roleArn="arn:aws:iam::123456789012:role/gateway-role",
    authorizerType="NONE",
    protocolType="MCP",
)

# 最小構成: KB を Retrieve ツールとして公開（target 名はデフォルトで "kb-{kb_id}"）
target = gateway_client.create_knowledge_base_target(
    gateway_identifier=gateway["gatewayId"],
    knowledge_base_id="KB1234567",
)

# オプションを指定した例
target = gateway_client.create_knowledge_base_target(
    gateway_identifier=gateway["gatewayId"],
    knowledge_base_id="KB1234567",
    name="docs-kb-target",
    description="Search the product documentation KB",
    retrieval_configuration={
        "vectorSearchConfiguration": {"numberOfResults": 3},
    },
    parameter_overrides=[
        {
            "path": "$.retrievalQuery.text",
            "visible": True,
            "description": "The search query",
        },
    ],
)
```

**ポイント:**

- `name` を省略した場合は `kb-{knowledge_base_id}` が使われます
- `description` はエージェントから見える `Retrieve` ツールの説明として埋め込まれます
- `retrieval_configuration` を指定すると、`vectorSearchConfiguration` などの取得パラメータをデフォルト値として固定できます
- `parameter_overrides` で個々のパラメータの可視性 (`visible`) や説明文を上書きできます
- 認証情報は既定で `GATEWAY_IAM_ROLE` が使われ、必要なら `credentialProviderConfigurations` を `**kwargs` 経由で上書きできます
- ターゲットは内部で `create_gateway_target_and_wait` を呼び出し、`READY` 状態に到達するまでブロックします

---

### Gateway: Agentic Retrieve Target ヘルパーの追加 ([#532](https://github.com/aws/bedrock-agentcore-sdk-python/pull/532))

**この機能でできること:**

- `GatewayClient.create_agentic_retrieve_target()` で、複数の Knowledge Base に跨る Agentic Retrieval を `AgenticRetrieveStream` ツールとして公開できます
- 内部のオーケストレーションに使う Foundation Model の ARN や、各 retriever の説明・最大反復回数といった設定を引数で組み立てられます

**使用例:**

```python
target = gateway_client.create_agentic_retrieve_target(
    gateway_identifier=gateway["gatewayId"],
    retrievers=[
        {
            "knowledgeBaseId": "KB1234567",
            "description": "Product documentation KB",
        },
        {
            "knowledgeBaseId": "KB7654321",
            "description": "Internal runbooks KB",
        },
    ],
    model_arn=(
        "arn:aws:bedrock:us-west-2::foundation-model/"
        "anthropic.claude-3-5-sonnet-20241022-v2:0"
    ),
    description="Search across product docs and runbooks",
    max_agent_iteration=5,
)
```

**ポイント:**

- `retrievers` は `knowledgeBaseId` を含む辞書のリストで、各 KB ごとに `description` などの上書きを指定できます
- `model_arn` は内部の `foundationModelConfiguration.bedrock.modelArn` に渡され、Agentic Retrieval のオーケストレーションに使用されます
- `max_agent_iteration` を省略するとサービス側のデフォルトが使われます
- `name` を省略すると `agentic-retrieve-{timestamp}` が自動付与されます
- `Retrieve` ターゲットと同様に、認証情報は既定で `GATEWAY_IAM_ROLE`、`parameter_overrides` でツールパラメータの可視性・説明を調整できます

## まとめ

このリリースでは Knowledge Base 操作を 1 つのクライアントに集約しつつ、AgentCore Gateway から MCP ツールとして公開するための薄いヘルパーが揃いました。Knowledge Base + Gateway を組み合わせた RAG 構成を Python SDK だけで完結できるようになり、検証・運用の手数を大きく減らせます。
