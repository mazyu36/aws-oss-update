---
title: "bedrock-agentcore-sdk-python v1.6.1"
version: "v1.6.1"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-04-10
summary: "AgentCoreMemorySessionManager に read_only フラグを追加し、メモリへの書き込みを無効化できるようになりました。また、install_packages() のパッケージ検証がアローリスト方式に変更されセキュリティが強化されました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.1"
---

## 概要

このリリースでは、`AgentCoreMemorySessionManager` に `read_only` フラグが追加され、AgentCore Memory への永続化を無効化しながらメモリインジェクション機能のみを使用できるようになりました。また、`install_packages()` 関数のパッケージ検証がブロックリスト方式からアローリスト方式に変更され、セキュリティが強化されました。

**リリース:** [v1.6.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.1)

## 新機能

### AgentCoreMemorySessionManager に read_only フラグを追加 ([#389](https://github.com/aws/bedrock-agentcore-sdk-python/pull/389))

**この機能でできること:**
- `read_only=True` を設定することで、AgentCore Memory への書き込み操作（`create_event` 呼び出し）を無効化し、メモリインジェクション（LTM 取得）のみを有効にできます
- エージェントの状態を永続化せずに、メモリからのコンテキスト取得のみを行いたい場合に便利です

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import (
    AgentCoreMemoryConfig,
    AgentCoreMemorySessionManager,
)

# read_only モードで設定
config = AgentCoreMemoryConfig(
    memory_id="my-memory",
    session_id="session-123",
    actor_id="user-456",
    read_only=True,  # AgentCore Memory への書き込みを無効化
)

session_manager = AgentCoreMemorySessionManager(agentcore_memory_config=config)

# 以下の操作は ACM への書き込みをスキップしますが、
# ローカル状態の管理は引き続き機能します
session = session_manager.create_session()
agent = session_manager.create_agent(session_id=session.session_id, agent_id="agent-1")
message = session_manager.create_message(session_id=session.session_id, role="user", content="Hello")

# 読み取り操作は通常通り機能します
context = session_manager.retrieve_customer_context(session_id=session.session_id)
```

**read_only=True で無効化される操作:**
- `create_session` - ACM への `create_event` をスキップ（ローカル検証とセッション返却は継続）
- `create_agent` / `update_agent` - ACM への `create_event` をスキップ（ローカルキャッシュは継続）
- `create_message` - ACM への `create_event` をスキップ（`append_message` でのローカル追跡は継続）
- `_flush_messages_only` / `_flush_agent_states_only` - no-op

**影響を受けない操作:**
- すべての読み取り操作（`read_session`、`read_agent`、`list_messages`）
- LTM 取得（`retrieve_customer_context`）

**ポイント:**
- メモリインジェクションのみを使用し、エージェント状態の永続化が不要なユースケースに最適です
- ローカルのセッション/エージェント状態管理は `read_only=True` でも引き続き機能します

## バグ修正

### install_packages() のパッケージ検証をアローリスト方式に変更 ([#403](https://github.com/aws/bedrock-agentcore-sdk-python/pull/403))

- **修正内容:** `install_packages()` 関数のパッケージ名検証が、ブロックリスト方式（特定の文字を禁止）からアローリスト方式（有効な PyPI パッケージ名のみを許可）に変更されました
- **影響:** 以前のブロックリスト方式では、`-r` や `--index-url` などの pip フラグがブロック対象の文字を含まないため、検証をバイパスできる可能性がありました。新しいアローリスト方式では、有効な PyPI パッケージ名構文に一致する文字列のみが受け入れられ、フラグインジェクションやパス走査攻撃が防止されます

## まとめ

このリリースでは、`AgentCoreMemorySessionManager` の柔軟性が向上し、メモリへの書き込みを無効化するオプションが追加されました。また、`install_packages()` のセキュリティが強化され、パッケージ検証がより堅牢になりました。
