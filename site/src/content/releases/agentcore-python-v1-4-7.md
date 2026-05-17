---
title: "AgentCore Python SDK v1.4.7 リリース解説"
version: "v1.4.7"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-03-18
summary: "A2A と AG-UI プロトコルのサポート、ResourcePolicyClient の追加、イベントメタデータ機能など、大型の機能追加が含まれるリリースです。また、バッチフラッシュ時の agentId メタデータ欠落や snake_case/camelCase の命名規則に関するバグ修正も含まれています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.7"
---

## 概要

このリリースでは、A2A（Agent-to-Agent）プロトコルと AG-UI プロトコルのサポートが追加され、エージェント間通信やフロントエンド連携が大幅に強化されました。また、リソースベースポリシー管理のための ResourcePolicyClient、イベントメタデータ機能、データプレーン API の追加パススルーなど、多くの新機能が含まれています。

**リリース:** [v1.4.7](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.7)

## 新機能

### A2A プロトコルサポート ([#349](https://github.com/aws/bedrock-agentcore-sdk-python/pull/349))

**この機能でできること:**
- `serve_a2a` を使用して、Agent-to-Agent プロトコルに対応したエージェントをデプロイできます
- Strands、Google ADK、LangGraph など主要なフレームワークとの統合をサポート

**使用例:**

```python
from strands import Agent
from strands.multiagent.a2a.executor import StrandsA2AExecutor
from bedrock_agentcore.runtime import serve_a2a

agent = Agent(
    name="Calculator Agent",
    description="A calculator agent that can perform basic arithmetic operations.",
    callback_handler=None,
)

if __name__ == "__main__":
    serve_a2a(StrandsA2AExecutor(agent))
```

**ポイント:**
- オプション依存: `pip install "bedrock-agentcore[a2a]"` でインストール
- `AgentCard` は `StrandsA2AExecutor` から自動生成されますが、手動で指定も可能
- `/ping` ヘルスチェックエンドポイントを自動提供
- `AGENTCORE_RUNTIME_URL` 環境変数から `agent_card.url` を自動設定

---

### AG-UI プロトコルサポート ([#350](https://github.com/aws/bedrock-agentcore-sdk-python/pull/350))

**この機能でできること:**
- `serve_ag_ui` と `AGUIApp` を使用して、AG-UI プロトコルに対応したエージェントをデプロイできます
- SSE（`POST /invocations`）と WebSocket（`/ws`）の両方のトランスポートをサポート

**使用例（フレームワーク統合）:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel
from ag_ui_strands import StrandsAgent
from bedrock_agentcore.runtime import serve_ag_ui

model = BedrockModel(model_id="us.anthropic.claude-sonnet-4-20250514-v1:0")
strands_agent = Agent(model=model, system_prompt="You are a helpful assistant.")

agui_agent = StrandsAgent(
    agent=strands_agent,
    name="my_agent",
    description="A helpful assistant",
)

# /invocations (SSE)、/ws (WebSocket)、/ping でサーブ
serve_ag_ui(agui_agent)
```

**使用例（カスタムエージェント）:**

```python
from bedrock_agentcore.runtime import AGUIApp
from bedrock_agentcore.runtime.context import BedrockAgentCoreContext, RequestContext
from ag_ui.core import (
    RunAgentInput,
    RunStartedEvent,
    RunFinishedEvent,
    TextMessageStartEvent,
    TextMessageContentEvent,
    TextMessageEndEvent,
)

app = AGUIApp()

@app.entrypoint
async def my_agent(input_data: RunAgentInput, context: RequestContext):
    yield RunStartedEvent(thread_id=input_data.thread_id, run_id=input_data.run_id)

    msg_id = "msg-1"
    yield TextMessageStartEvent(message_id=msg_id, role="assistant")

    for chunk in ["Hello", ", ", "world!"]:
        yield TextMessageContentEvent(message_id=msg_id, delta=chunk)

    yield TextMessageEndEvent(message_id=msg_id)
    yield RunFinishedEvent(thread_id=input_data.thread_id, run_id=input_data.run_id)

app.run()  # ポート 8080 でサーブ
```

**ポイント:**
- オプション依存: `pip install "bedrock-agentcore[ag-ui]"` でインストール
- プリストリームエラーは HTTP 400 / WebSocket close 1003、ミッドストリームエラーは `RunErrorEvent` を送出
- CopilotKit などのフロントエンドと直接統合可能

---

### ResourcePolicyClient の追加 ([#328](https://github.com/aws/bedrock-agentcore-sdk-python/pull/328))

**この機能でできること:**
- リソースベースポリシーを SDK から管理できるようになりました
- Agent Runtime、Endpoint、Gateway リソースへのアクセス制御に使用

**使用例:**

```python
from bedrock_agentcore.services import ResourcePolicyClient

client = ResourcePolicyClient()

# ポリシーの作成/更新
policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
            "Action": "bedrock-agentcore:InvokeAgent",
            "Resource": "*"
        }
    ]
}
client.put_resource_policy(resource_arn="arn:aws:...", policy=policy)

# ポリシーの取得
current_policy = client.get_resource_policy(resource_arn="arn:aws:...")

# ポリシーの削除
client.delete_resource_policy(resource_arn="arn:aws:...")
```

**ポイント:**
- `policy` パラメータは dict または JSON 文字列を受け付けます
- クロスアカウントアクセスや OAuth 認証シナリオで有用

---

### イベントメタデータサポート ([#339](https://github.com/aws/bedrock-agentcore-sdk-python/pull/339))

**この機能でできること:**
- `AgentCoreMemorySessionManager` で、メッセージイベントにカスタムメタデータを付与できるようになりました
- Langfuse の traceId など、動的なメタデータもサポート

**使用例:**

```python
from langfuse.decorators import langfuse_context
from bedrock_agentcore.memory.integrations.strands import (
    AgentCoreMemoryConfig,
    AgentCoreMemorySessionManager,
)
from strands import Agent

config = AgentCoreMemoryConfig(
    memory_id=MEM_ID,
    session_id=SESSION_ID,
    actor_id=ACTOR_ID,
    # 静的メタデータ
    default_metadata={"environment": {"stringValue": "production"}},
    # 動的メタデータ（毎イベント呼び出し）
    metadata_provider=lambda: {
        "traceId": {"stringValue": langfuse_context.get_current_trace_id() or ""}
    },
)

sm = AgentCoreMemorySessionManager(
    agentcore_memory_config=config,
    region_name="us-east-1"
)
agent = Agent(session_manager=sm)
agent("Hello!")  # イベントに traceId が自動付与
```

**ポイント:**
- マージ優先順位: `default_metadata` < `metadata_provider()` < per-call `metadata` < 内部キー
- 予約キー（`stateType`、`agentId`）は拒否され、最大 15 キーの API 制限を適用

---

### データプレーンパススルーの追加 ([#352](https://github.com/aws/bedrock-agentcore-sdk-python/pull/352))

**この機能でできること:**
- `MemoryClient` に欠落していた 7 つのデータプレーン API のパススルーが追加されました

**追加された API:**
- `batch_create_memory_records`
- `batch_delete_memory_records`
- `batch_update_memory_records`
- `start_memory_extraction_job`
- `list_memory_extraction_jobs`
- `list_sessions`
- `list_actors`

**ポイント:**
- 存在しなかった `list_memory_strategies` パススルーが削除され、実行時エラーを防止

## バグ修正

### バッチフラッシュ時の agentId メタデータ欠落を修正 ([#331](https://github.com/aws/bedrock-agentcore-sdk-python/pull/331))

- `batch_size` を使用した際、バッチフラッシュ時に `agentId` メタデータが含まれていなかった問題を修正
- これにより、セッション再開時にエージェントのステート情報が正しく取得できるようになりました

### snake_case/camelCase の命名規則を正規化 ([#348](https://github.com/aws/bedrock-agentcore-sdk-python/pull/348))

- `MemoryClient` と `MemorySessionManager` のパススルーメソッドで、snake_case と camelCase の両方のパラメータ名を受け付けるようになりました
- 例: `memory_id` と `memoryId` の両方が使用可能
- 同じパラメータを両方の形式で渡すと `TypeError` が発生
- 後方互換性を維持しつつ、Python の命名規則に沿った使用が可能

## まとめ

A2A と AG-UI プロトコルのサポートにより、エージェント間通信やフロントエンドとの統合が大幅に強化されました。また、ResourcePolicyClient やイベントメタデータ機能など、エンタープライズユースケースに対応する機能が追加されています。メモリ機能を使用している場合は、agentId メタデータのバグ修正のためアップデートを推奨します。
