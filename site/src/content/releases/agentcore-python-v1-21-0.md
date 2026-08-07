---
title: "AgentCore Python SDK v1.21.0 リリース解説"
version: "v1.21.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-08-06
summary: "Strands 向けの AgentCoreMemoryStore 統合が追加され、AgentCore の長期メモリを Strands の MemoryManager に直接組み込めるようになりました。また、X-Amz-Bedrock-AgentCore-Identity-WAT ヘッダの伝播により、Workload Access Token をサービス間で自動伝播できるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.21.0"
---

## 概要

このリリースでは 2 つの新機能が追加されました。1 つ目は Strands エージェント向けの `AgentCoreMemoryStore` 統合で、AgentCore の長期メモリを Strands の `MemoryManager` に直接プラグインできます。2 つ目は Workload Access Token (WAT) の自動伝播機能で、`X-Amz-Bedrock-AgentCore-Identity-WAT` ヘッダを Runtime/Gateway への outbound な boto3 呼び出しに自動で付与します。

**リリース:** [v1.21.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.21.0)

## 新機能

### Strands 向け AgentCoreMemoryStore 統合の追加 ([#588](https://github.com/aws/bedrock-agentcore-sdk-python/pull/588))

**この機能でできること:**
- AgentCore の長期メモリ機能を Strands の `MemoryManager` に直接統合できる `AgentCoreMemoryStore` が追加されました
- サーバーサイドでの長期メモリ抽出、ネームスペースベースのリコール、複数ネームスペースの構成に対応します
- `strands-agents>=1.46.0` が必要です

**使用例（単一ネームスペース）:**

```python
import os

from strands import Agent
from strands.memory import MemoryManager

from bedrock_agentcore.memory.integrations.strands.memorystore import AgentCoreMemoryStore

# デフォルトは recall-only（読み取り専用）
# writable=True を設定した store のみが AgentCore への書き込みを行う
store = AgentCoreMemoryStore(
    memory_id=os.environ["AGENTCORE_MEMORY_ID"],
    actor_id="demo-user",
    session_id="demo-session",
    namespace="/facts/{actorId}/",  # {actorId} と {sessionId} はクライアント側で解決される
    writable=True,                    # このストアがサーバーサイド抽出のための書き込み先になる
    extraction=True,                  # Strands のデフォルトトリガーで抽出を有効化
    region_name="us-east-1",
)

manager = MemoryManager(stores=[store])
agent = Agent(memory_manager=manager)
agent("Remember that I prefer window seats.")
```

**使用例（複数ネームスペース）:**

```python
import os

from strands.memory import IntervalTrigger, MemoryManager, MemoryMessageFilter

from bedrock_agentcore.memory.integrations.strands.memorystore import (
    create_agentcore_memory_stores,
)

# 複数のネームスペースを 1 つの MemoryClient で共有
# ファクトリは重複書き込みを防ぐため、writer は最大 1 つに制限される
stores = create_agentcore_memory_stores(
    memory_id=os.environ["AGENTCORE_MEMORY_ID"],
    actor_id="demo-user",
    session_id="demo-session",
    namespaces=[
        {
            "namespace": "/preferences/{actorId}/",
            "max_search_results": 5,     # デフォルトは 5
            "min_score": 0.7,             # クライアント側のスコアフィルタ（デフォルトは無し）
        },
        {
            "namespace": "/facts/{actorId}/",
            "max_search_results": 10,
            "min_score": 0.3,
        },
    ],
    extraction={
        # 抽出のカデンス（頻度）を制御するトリガー
        "cadence": IntervalTrigger(turns=10),
        # 抽出時にフィルタするメッセージ種別
        "filter": MemoryMessageFilter(exclude=["toolUse", "toolResult", "image"]),
    },
    region_name="us-east-1",
)
manager = MemoryManager(stores=stores)
```

**ポイント:**
- `AgentCoreMemoryStore` はデフォルトで recall-only（読み取り専用）です。書き込みを行う場合は明示的に `writable=True` を設定する必要があります
- 検索は `namespace` で完全一致プレフィックス検索、`namespace_path` でサブツリー検索を行います
- クライアント側で解決されるプレースホルダは `{actorId}` と `{sessionId}` のみで、それ以外のプレースホルダは事前に置換する必要があります
- `min_score` を指定すると、`over_fetch_factor`（デフォルトは 4）倍の件数を取得してからスコアでフィルタし、最終的に `max_search_results` 件に絞り込みます（内部の `topK` は最大 100 に制限）
- 書き込み時にはユーザー/アシスタントのロールを保持し、空メッセージやツール専用メッセージは無視されます。デフォルトでは 1 つの AgentCore イベントに最大 50 ターン分をバッチ化します（`max_turns_per_event` で調整可能）
- `AgentCoreMemoryStore(...)` を直接構築する場合は `extraction_mode="SKIP"` を指定することで、そのストアからのイベントでは長期メモリ抽出をスキップできます
- カスタムの `MemoryClient` を渡すこともでき、既存のコネクションを再利用できます:

```python
from bedrock_agentcore.memory import MemoryClient
from bedrock_agentcore.memory.integrations.strands.memorystore import AgentCoreMemoryStore

# デフォルト: 統合が MemoryClient(integration_source="strands") を内部で構築
store = AgentCoreMemoryStore(
    memory_id="mem-123",
    actor_id="user-123",
    session_id="session-456",
    namespace="/facts/{actorId}/",
)

# または独自のクライアントを再利用
store = AgentCoreMemoryStore(
    memory_id="mem-123",
    actor_id="user-123",
    session_id="session-456",
    namespace="/facts/{actorId}/",
    client=MemoryClient(region_name="us-west-2"),
)
```

---

### X-Amz-Bedrock-AgentCore-Identity-WAT ヘッダの outbound 呼び出しへの自動伝播 ([#607](https://github.com/aws/bedrock-agentcore-sdk-python/pull/607))

**この機能でできること:**
- Workload Access Token (WAT) を含む `X-Amz-Bedrock-AgentCore-Identity-WAT` ヘッダを、サービス間ホップで自動伝播できるようになりました
- inbound リクエストから WAT ヘッダを抽出し、Runtime/Gateway への outbound な boto3 呼び出しに自動で付与します
- WAT を明示的にミント・伝播したい場合のために、`@requires_wat` デコレータも追加されました

**使用例（自動伝播）:**

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()

@app.entrypoint
def handler(payload):
    # inbound リクエストから WAT ヘッダが自動抽出され、
    # コンテキスト変数 identity_wat に保存される

    # ここで Runtime や Gateway の boto3 呼び出しを行うと、
    # 登録された event handler が X-Amz-Bedrock-AgentCore-Identity-WAT
    # ヘッダを自動で outbound リクエストに付与する
    import boto3
    client = boto3.client("bedrock-agentcore")
    response = client.invoke_agent_runtime(...)  # WAT が自動的に伝播される

    return {"status": "ok"}
```

**使用例（`@requires_wat` デコレータで明示的にミント・伝播）:**

```python
from bedrock_agentcore.identity.auth import requires_wat

@requires_wat
def call_downstream_service():
    # このスコープ内では WAT が明示的にミントされ、
    # 以降の boto3 呼び出しに伝播される
    ...
```

**ポイント:**
- WAT の伝播は Runtime のデータプレーンクライアントに対してのみ登録されます。Identity サービスは WAT の発行者であるため除外されます
- Gateway の MCP 呼び出しなど、boto3 経由でない outbound 呼び出しについては、手動で伝播する必要があります（PR にドキュメントされたパターンを参照）
- `IDENTITY_WAT_HEADER` 定数が追加され、`is_forwardable_header` の allowlist にも登録されました
- `BedrockAgentCoreContext` に `identity_wat` コンテキスト変数が追加され、リクエストスコープで WAT を保持します

## まとめ

このリリースでは、Strands との統合を強化する `AgentCoreMemoryStore` と、サービス間の Workload Access Token 伝播を自動化する仕組みが追加されました。特に Strands ユーザーにとっては、AgentCore の長期メモリ機能をボイラープレートなしで直接活用できるようになる大きなアップデートです。
