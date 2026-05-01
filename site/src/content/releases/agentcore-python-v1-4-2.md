---
title: "bedrock-agentcore-sdk-python v1.4.2"
version: "v1.4.2"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-03-03
summary: "バッチメッセージの自動フラッシュ機能の追加、メモリセッションマネージャーのパフォーマンス最適化とバグ修正が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.2"
---

## 概要

このリリースでは、`AgentCoreMemorySessionManager` にバッチメッセージの自動フラッシュ機能が追加されました。また、タイムスタンプキャッシュによるパフォーマンス最適化と、テキストコンテンツがないメッセージでの NullPointerException の修正が含まれています。

**リリース:** [v1.4.2](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.2)

## 新機能

### バッチメッセージの自動フラッシュ機能 ([#291](https://github.com/aws/bedrock-agentcore-sdk-python/pull/291))

**この機能でできること:**
- エージェント呼び出し完了後、バッファされたメッセージを自動的にフラッシュ
- 設定可能な間隔で定期的にメッセージを自動フラッシュ（長時間実行エージェント向け）

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import (
    AgentCoreMemorySessionManager,
    AgentCoreMemoryConfig,
)
from strands import Agent

# インターバルベースの自動フラッシュを有効化
config = AgentCoreMemoryConfig(
    memory_id="your-memory-id",
    session_id="session-123",
    actor_id="user-456",
    batch_size=10,  # 10 件ごとにバッチ処理
    flush_interval_seconds=30.0,  # 30 秒ごとに自動フラッシュ
)

session_manager = AgentCoreMemorySessionManager(
    agentcore_memory_config=config,
    region_name="us-east-1",
)

agent = Agent(session_manager=session_manager)

# エージェント呼び出し完了時に AfterInvocationEvent フックで自動フラッシュ
# また、30 秒ごとにインターバルベースの自動フラッシュが実行される
response = agent("長時間のタスクを実行してください")
```

**ポイント:**
- `batch_size > 1` の場合のみ `AfterInvocationEvent` フックが登録される
- `flush_interval_seconds` はオプションで、デフォルトは `None`（無効）
- 長時間実行エージェントでは `flush_interval_seconds` を設定することで、メッセージの定期的な永続化を保証できる

---

## バグ修正

### タイムスタンプキャッシュによる冗長な API 呼び出しの削減 ([#289](https://github.com/aws/bedrock-agentcore-sdk-python/pull/289))
- `update_agent()` 呼び出し時に毎回 `read_agent()` を呼び出して `created_at` タイムスタンプを取得していた問題を修正
- エージェントの `created_at` タイムスタンプをキャッシュすることで、冗長な `list_events` API 呼び出しを排除
- AgentCore Memory は不変であり更新時に新しいイベントが作成されるため、元の `created_at` を保持する必要があるが、毎回取得するのは非効率だった

### テキストコンテンツがないメッセージでの NullPointerException の修正 ([#293](https://github.com/aws/bedrock-agentcore-sdk-python/pull/293))
- メッセージにテキストコンテンツが含まれていない場合に発生していた NullPointerException を修正
- 関連 Issue: [#292](https://github.com/aws/bedrock-agentcore-sdk-python/issues/292)

## まとめ

このリリースでは、バッチメッセージの自動フラッシュ機能が追加され、長時間実行エージェントでのメッセージ永続化が改善されました。また、パフォーマンス最適化とバグ修正により、`AgentCoreMemorySessionManager` の安定性と効率性が向上しています。
