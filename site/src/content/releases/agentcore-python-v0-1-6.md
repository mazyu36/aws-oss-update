---
title: "bedrock-agentcore-sdk-python v0.1.6"
version: "v0.1.6"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-10-01
summary: "Session Manager、Session、Actor の各構造による包括的なセッション管理システムの導入、boto3 クライアント設定のカスタマイズサポート、タイムスタンプ精度の向上、add_turns でのパラメータ順序のバグ修正が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.6"
---

## 概要

このリリースでは、会話型 AI エージェントのためのセッション管理システムが新たに追加され、メモリ機能を持つエージェントの管理が大幅に簡素化されました。`MemorySessionManager`、`MemorySession`、`Actor` の 3 つのコア構造により、短期記憶・長期記憶の管理、会話の分岐、LLM との統合が容易になります。また、boto3 クライアントのカスタマイズやタイムスタンプの精度向上などの改善も含まれています。

**リリース:** [v0.1.6](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.6)

## 新機能

### Session Manager、Session、Actor 構造の導入 ([#87](https://github.com/aws/bedrock-agentcore-sdk-python/pull/87))

**この機能でできること:**
- `MemorySessionManager`、`MemorySession`、`Actor` の 3 つのコア構造により、会話型 AI エージェントのセッション管理とメモリ操作を高レベルの抽象化で実現します。短期記憶（イベントベースの会話履歴）と長期記憶（セマンティック検索可能な永続知識）の管理、会話の分岐、LLM との統合が簡単に行えるようになります。

**使用例:**

```python
from bedrock_agentcore.memory.session import MemorySessionManager
from bedrock_agentcore.memory.models import RetrievalConfig, ConversationalMessage, MessageRole

# Session Manager の作成
manager = MemorySessionManager(memory_id="my-memory", region="us-east-1")

# Memory Session の作成
session = manager.create_memory_session(actor_id="user-123")

# LLM コールバック関数の定義
def my_llm(user_input: str, memories: list) -> str:
    # LLM ロジック（メモリコンテキストを含む）
    return f"Response to: {user_input}"

# 検索設定の定義
retrieval_config = {
    "support/user/{actorId}/{sessionId}": RetrievalConfig(
        top_k=5,
        relevance_score=0.3
    ),
    "user/preferences/{actorId}": RetrievalConfig(
        top_k=3,
        relevance_score=0.5
    )
}

# メモリ統合されたターン処理
memories, response, event = session.process_turn_with_llm(
    user_input="昨日話した内容は何でしたか？",
    llm_callback=my_llm,
    retrieval_config=retrieval_config
)

# 会話の分岐（任意の時点から別の会話パスを作成）
branch_event = session.fork_conversation(
    root_event_id="event-123",
    branch_name="alternative-path",
    messages=[ConversationalMessage("別のアプローチを試しましょう", MessageRole.USER)]
)

# 長期記憶のセマンティック検索
relevant_memories = session.search_long_term_memories(
    query="顧客の好み",
    namespace_prefix="customer/profile/{actorId}",
    top_k=5
)
```

**ポイント:**
- `MemorySessionManager` は boto3 クライアントの自動管理を行い、Bedrock AgentCore のすべてのデータプレーン操作に直接アクセスできます
- `MemorySession` は特定のアクター・セッションペアに対するスコープ化された操作を提供します
- 会話の分岐機能により、任意の時点から複数の会話パスを探索できます
- 自動ページネーション機能により、大規模なデータセットも透過的に処理されます
- 包括的な型ヒントと構造化されたデータモデルにより、開発者体験が向上します

---

### boto3 クライアント設定のカスタマイズサポート ([#98](https://github.com/aws/bedrock-agentcore-sdk-python/pull/98))

**この機能でできること:**
- `MemorySessionManager` に `boto_client_config` パラメータが追加され、カスタムの botocore 設定（リトライ設定、タイムアウト、接続プール設定など）を指定できるようになりました。また、タイムスタンプのマイクロ秒精度が保持されるようになり、時間に敏感なメモリ操作の精度が向上しました。

**使用例:**

```python
from bedrock_agentcore.memory.session import MemorySessionManager
from botocore.config import Config

# カスタムの boto3 クライアント設定
custom_config = Config(
    retries={
        'max_attempts': 10,
        'mode': 'adaptive'
    },
    connect_timeout=5,
    read_timeout=60,
    max_pool_connections=50
)

# カスタム設定で Session Manager を作成
manager = MemorySessionManager(
    memory_id="my-memory",
    region="us-east-1",
    boto_client_config=custom_config
)

# マイクロ秒精度のタイムスタンプが自動的に保持される
from datetime import datetime
session = manager.create_memory_session(actor_id="user-123")
```

**ポイント:**
- カスタム設定は SDK のユーザーエージェント情報とインテリジェントにマージされ、ユーザー提供の設定が保持されます
- タイムスタンプのシリアル化が改善され、datetime オブジェクトのマイクロ秒精度が API 呼び出し時に保持されます
- 初期化ロジックがモジュール化され、保守性とテスト可能性が向上しました

## バグ修正

### add_turns でのパラメータ順序の修正 ([#99](https://github.com/aws/bedrock-agentcore-sdk-python/pull/99))
- `add_turns` メソッドで `event_timestamp` と `branch` のパラメータ順序が誤っていた問題を修正しました
- これにより、ターン追加時のパラメータ指定が正しく動作するようになり、会話の分岐機能が適切に機能します

## まとめ

v0.1.6 では、セッション管理システムの導入により、会話型 AI エージェントの開発が大幅に簡素化されました。短期・長期記憶の管理、会話の分岐、LLM 統合が高レベルの抽象化で提供され、開発者はビジネスロジックに集中できるようになりました。
