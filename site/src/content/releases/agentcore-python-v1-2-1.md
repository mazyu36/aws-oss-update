---
title: "AgentCore Python SDK v1.2.1 リリース解説"
version: "v1.2.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-02-03
summary: "MemoryClient にイベントメタデータサポートを追加、namespace 文字列の末尾スラッシュ修正"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.2.1"
---

## 概要

このリリースでは、MemoryClient のイベントにメタデータサポートが追加され、イベントのフィルタリングや追跡が容易になりました。また、namespace 文字列に末尾スラッシュが追加され、API との一貫性が改善されています。

**リリース:** [v1.2.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.2.1)

## 新機能

### MemoryClient イベントへのメタデータサポート ([#236](https://github.com/aws/bedrock-agentcore-sdk-python/pull/236))

**この機能でできること:**
- `create_event`、`create_blob_event`、`fork_conversation` メソッドにメタデータを付与できるようになりました
- `list_events` メソッドでメタデータを使用したイベントのフィルタリングが可能になりました

**使用例:**

```python
from bedrock_agentcore.memory import MemoryClient

client = MemoryClient(region="us-east-1")

# メタデータ付きでイベントを作成
client.create_event(
    memory_id="your-memory-id",
    session_id="session-123",
    actor_id="user-456",
    event_payload={"role": "user", "content": "Hello"},
    metadata={
        "source": "web",
        "priority": "high",
        "category": "support"
    }
)

# メタデータ付きで blob イベントを作成
client.create_blob_event(
    memory_id="your-memory-id",
    session_id="session-123",
    actor_id="user-456",
    blob_data=b"binary content",
    metadata={"type": "document", "format": "pdf"}
)

# メタデータでイベントをフィルタリング
events = client.list_events(
    memory_id="your-memory-id",
    session_id="session-123",
    event_metadata={
        "source": {"operator": "EQUALS_TO", "value": "web"},
        "priority": {"operator": "EXISTS"}
    }
)

# 会話をフォークする際にメタデータを付与
client.fork_conversation(
    memory_id="your-memory-id",
    source_session_id="session-123",
    target_session_id="session-789",
    metadata={"fork_reason": "branch_experiment"}
)
```

**ポイント:**
- メタデータは最大 15 個のキーバリューペアをサポート
- キーは 1〜128 文字の長さ制限があります
- フィルタリングでは `EQUALS_TO`、`EXISTS`、`NOT_EXISTS` 演算子が利用可能
- 既存のコードは変更なしで動作します（後方互換性あり）

## バグ修正

### namespace 文字列への末尾スラッシュ追加 ([#238](https://github.com/aws/bedrock-agentcore-sdk-python/pull/238))

- **修正内容:** namespace 文字列の末尾にスラッシュが追加され、API との一貫性が改善されました
- **影響を受けていた状況:** 一部のケースで namespace 形式の不整合により、メモリの検索や取得が期待通りに動作しない可能性がありました
- **修正後の動作:** すべての namespace 文字列が末尾スラッシュを持つ形式に統一されました

**変更例:**

```python
# 変更前
namespace_prefix = "/food/user-123"
retrieval_config = {
    "support/facts/{sessionId}": RetrievalConfig(top_k=5)
}

# 変更後
namespace_prefix = "/food/user-123/"
retrieval_config = {
    "support/facts/{sessionId}/": RetrievalConfig(top_k=5)
}
```

## まとめ

このリリースでは、メタデータサポートにより MemoryClient のイベント管理がより柔軟になり、namespace の末尾スラッシュ統一により API との一貫性が向上しました。
