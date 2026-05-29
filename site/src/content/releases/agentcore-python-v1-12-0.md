---
title: "AgentCore Python SDK v1.12.0 リリース解説"
version: "v1.12.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-05-28
summary: "MemorySessionManager に非同期実行のサポートが追加され、Long-Term Memory (LTM) ではメタデータによるインデックス作成とフィルタリングが可能になりました。Strands の async ハンドラや、より絞り込まれた長期記憶検索を実現できます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.12.0"
---

## 概要

このリリースでは、`MemorySessionManager` への非同期 (async) サポートと、Long-Term Memory (LTM) のメタデータ機能 (Indexed Keys / Metadata Filters) が追加されました。Strands の `stream_async` / `invoke_async` を利用するエージェントから AgentCore Memory をブロッキングなしで利用できるようになり、また LTM の検索をメタデータで絞り込めるようになります。

**リリース:** [v1.12.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.12.0)

## 新機能

### MemorySessionManager の非同期サポート ([#478](https://github.com/aws/bedrock-agentcore-sdk-python/pull/478))

**この機能でできること:**
- `AgentCoreMemoryConfig` に `async_mode` オプションが追加され、Strands の非同期実行 (`stream_async` / `invoke_async`) と組み合わせて Memory Session Manager を利用できるようになりました。
- `async_mode=True` のとき、`register_hooks` が同期メソッドを `asyncio.to_thread()` でラップした async コールバックをインストールします。

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import (
    AgentCoreMemoryConfig,
    AgentCoreMemorySessionManager,
)

# async_mode を有効化（デフォルトは False で従来挙動を維持）
config = AgentCoreMemoryConfig(
    memory_id="mem_xxxxxxxx",
    actor_id="user-123",
    session_id="session-abc",
    async_mode=True,  # ← 非同期コールバックを登録
)

session_manager = AgentCoreMemorySessionManager(config=config)

# Strands の非同期 API と組み合わせて利用
async for event in agent.stream_async("こんにちは", session_manager=session_manager):
    print(event)
```

**ポイント:**
- `async_mode` のデフォルトは `False` のため、既存コードの挙動は維持されます (オプトイン)。
- `async_mode=True` を有効にした場合、Strands の同期実行 (`agent(...)`) を呼ぶと `RuntimeError` が発生するため、必ず `stream_async` / `invoke_async` を使用してください。`register_hooks` 時に警告ログも出力されます。
- 内部実装は既存の同期メソッドを `asyncio.to_thread()` でラップする方式のため、I/O 処理がイベントループをブロックすることなく実行されます。

---

### Long-Term Memory のメタデータサポート ([#481](https://github.com/aws/bedrock-agentcore-sdk-python/pull/481))

**この機能でできること:**
- AgentCore Memory の Long-Term Memory (LTM) 向けに、コントロールプレーンでの **Indexed Keys** 設定と、データプレーンでの **Metadata Filters** による絞り込み検索がサポートされました。
- メモリ作成時にインデックス対象のキーと型を宣言し、検索時にメタデータ条件で記憶を絞り込めます。

**使用例 (Indexed Keys: コントロールプレーン):**

```python
from bedrock_agentcore.memory.client import MemoryClient
from bedrock_agentcore.memory.models import IndexedKey, MetadataValueType

client = MemoryClient(region_name="us-west-2")

# IndexedKey.build(key, value_type) でインデックスを定義
indexed_keys = [
    IndexedKey.build("user_id", MetadataValueType.STRING),
    IndexedKey.build("priority", MetadataValueType.NUMBER),
    IndexedKey.build("created_at", MetadataValueType.DATETIME),
    IndexedKey.build("tags", MetadataValueType.STRING_LIST),
]

memory = client.create_memory_and_wait(
    name="my-memory",
    strategies=[...],
    indexed_keys=indexed_keys,  # ← 新規パラメーター
)

# 既存の update_memory でインデックスを後から追加することも可能
client.update_memory(memory_id=memory["id"], addIndexedKeys=indexed_keys)
```

**使用例 (Metadata Filters: データプレーン):**

```python
from bedrock_agentcore.memory.models.filters import (
    MemoryMetadataFilter,
    MemoryRecordRightExpression,
)

# build_expression(left, operator, right) でフィルタを構築
filters = [
    MemoryMetadataFilter.build_expression(
        left="user_id",
        operator="EQUALS",
        right=MemoryRecordRightExpression.build_string("user-123"),
    ),
    MemoryMetadataFilter.build_expression(
        left="priority",
        operator="GREATER_THAN",
        right=MemoryRecordRightExpression.build_number(5),
    ),
]

# retrieve_memories でメタデータフィルタを指定
records = client.retrieve_memories(
    memory_id=memory["id"],
    namespace="user/preferences",
    query="ユーザーの好み",
    metadata_filters=filters,  # ← 新規パラメーター
)

# MemorySessionManager 経由でも利用可能
results = session_manager.search_long_term_memories(
    query="ユーザーの好み",
    namespace="user/preferences",
    metadata_filters=filters,
)
```

**ポイント:**
- `MetadataValueType` には `STRING` / `NUMBER` / `DATETIME` / `STRING_LIST` の 4 種類があり、サービス側の値型と対応しています。
- `MemoryRecordRightExpression` は値型ごとに `build_string` / `build_number` / `build_datetime` / `build_string_list` のファクトリメソッドを提供します。フィルタの右辺を構築する際はこれらを利用してください。
- `create_memory()` / `create_memory_and_wait()` / `create_or_get_memory()` のいずれにも `indexed_keys` を渡せます。
- データプレーン側のフィルタは `MemoryClient.retrieve_memories()` と `MemorySessionManager.search_long_term_memories()` の両方で利用可能です。

## まとめ

`MemorySessionManager` の非同期対応により Strands の async API との親和性が高まり、LTM のメタデータサポートにより記憶の検索精度を向上させられるようになりました。非同期エージェントの実装や、ユーザー属性・優先度などで絞り込んだ長期記憶活用を検討している場合は、本リリースへのアップデートを推奨します。
