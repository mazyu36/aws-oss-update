---
title: "AgentCore Python SDK v1.4.3 リリース解説"
version: "v1.4.3"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-03-04
summary: "エージェントステートイベントのバッファリング機能を追加し、create_event API 呼び出しを最大 60% 削減するパフォーマンス最適化が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.3"
---

## 概要

このリリースでは、`AgentCoreMemorySessionManager` にエージェントステートイベントのバッファリング機能が追加されました。これにより、`create_event` API の呼び出し回数が最大 60% 削減され、パフォーマンスが大幅に向上します。

**リリース:** [v1.4.3](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.3)

## 新機能

### エージェントステートイベントのバッファリング ([#295](https://github.com/aws/bedrock-agentcore-sdk-python/pull/295))

**この機能でできること:**
- エージェントステートの更新をバッファリングし、バッチ処理で効率的に送信
- `create_event` API 呼び出しを最大 60% 削減し、コスト削減とパフォーマンス向上を実現
- 前バージョンで追加されたメッセージバッファリングと組み合わせて、さらなる効率化が可能

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import (
    AgentCoreMemorySessionManager,
    AgentCoreMemoryConfig,
)
from strands import Agent

# バッチ処理を有効化してエージェントステートのバッファリングを活用
config = AgentCoreMemoryConfig(
    memory_id="your-memory-id",
    session_id="session-123",
    actor_id="user-456",
    batch_size=10,  # バッチサイズを 1 より大きくするとバッファリングが有効化
    flush_interval_seconds=30.0,  # オプション: 定期的な自動フラッシュ
)

session_manager = AgentCoreMemorySessionManager(
    agentcore_memory_config=config,
    region_name="us-east-1",
)

agent = Agent(session_manager=session_manager)

# エージェントステートの更新がバッファリングされ、
# バッチサイズに達するか、インターバルで自動フラッシュされる
response = agent("タスクを実行してください")

# 明示的にフラッシュすることも可能
session_manager.close()
```

**ポイント:**
- `batch_size > 1` を設定するとエージェントステートのバッファリングが有効化される
- バッファリングはメッセージとエージェントステートの両方に適用される
- `flush_interval_seconds` と組み合わせることで、長時間実行エージェントでも確実にデータを永続化できる
- テスト結果では `create_event` 呼び出しが 60% 削減されることが確認されている

## まとめ

このリリースでは、エージェントステートイベントのバッファリング機能により、API 呼び出しの効率化とパフォーマンス向上が実現されました。前バージョンのメッセージバッファリング機能と合わせて、`AgentCoreMemorySessionManager` の総合的なパフォーマンスが大幅に改善されています。
