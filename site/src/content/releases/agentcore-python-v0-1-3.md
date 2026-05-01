---
title: "bedrock-agentcore-sdk-python v0.1.3"
version: "v0.1.3"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-09-05
summary: "Memory 機能の大幅な機能拡張と、Strands Agents との統合サポートを追加。Browser ツールのバリデーション強化とバグ修正も含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.3"
---

## 概要

このリリースでは、Memory 機能に重要な機能拡張が行われ、より柔軟な Memory 操作が可能になりました。特に、Strands Agents との統合により、AgentCore Memory をセッションマネージャーとして使用できるようになりました。また、Browser ツールのバリデーション機能が追加され、バグ修正も含まれています。

**リリース:** [v0.1.3](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.3)

## 新機能

### Strands Agents との Memory 統合 ([#65](https://github.com/aws/bedrock-agentcore-sdk-python/pull/65))

**この機能でできること:**
- Strands Agents で AgentCore Memory をセッションマネージャーとして使用できるようになりました。短期記憶 (STM) と長期記憶 (LTM) の両方をサポートし、エージェントの会話履歴を効果的に管理できます。

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands.session_manager import (
    AgentCoreMemorySessionManager
)
from bedrock_agentcore.memory.integrations.strands.config import (
    AgentCoreMemoryConfig,
    RetrievalConfig
)

# Memory 設定を作成
config = AgentCoreMemoryConfig(
    memory_id="your-memory-id",
    session_id="session-123",
    retrieval_config=RetrievalConfig(
        max_results=10,
        enable_ltm=True  # 長期記憶を有効化
    )
)

# セッションマネージャーを初期化
session_manager = AgentCoreMemorySessionManager(config)

# Strands エージェントで使用
from strands_agents import Agent

agent = Agent(
    name="MyAgent",
    session_manager=session_manager
)
```

**ポイント:**
- `strands-agents` の追加インストールが必要です: `pip install bedrock-agentcore[strands]`
- STM と LTM の両方を使用することで、エージェントの会話コンテキストをより効果的に管理できます
- Bedrock と Strands 間のメッセージ/イベントフォーマット変換は自動的に処理されます

---

### Memory Client の機能拡張 ([#61](https://github.com/aws/bedrock-agentcore-sdk-python/pull/61))

**この機能でできること:**
- Memory Client に新しい機能が追加され、より高度な Memory 操作が可能になりました。LangChain、CrewAI、LlamaIndex などのフレームワークとの統合をサポートします。

**使用例:**

```python
from bedrock_agentcore.memory import MemoryClient

# Memory Client を初期化
client = MemoryClient(
    region_name="us-east-1",
    memory_id="your-memory-id"
)

# Memory に新しい記録を追加
client.put_memory_record(
    session_id="session-123",
    content="ユーザーは Python の開発者です",
    tags={"category": "user_profile"}
)

# Memory を検索
results = client.search_memory(
    session_id="session-123",
    query="ユーザーの技術スタック",
    max_results=5
)
```

**ポイント:**
- より柔軟な Memory 操作により、さまざまなフレームワークとの統合が容易になります
- タグを使用して Memory レコードを整理できます

---

### Memory の Data Plane / Control Plane 操作のパススルーサポート ([#66](https://github.com/aws/bedrock-agentcore-sdk-python/pull/66))

**この機能でできること:**
- Memory Client で `GetEvent`、`DeleteEvent`、`ListMemoryRecords` などの個別イベント管理および Memory レコードの一覧取得が可能になりました。操作は自動的に適切なプレーン (Data Plane または Control Plane) に転送されます。

**使用例:**

```python
from bedrock_agentcore.memory import MemoryClient

client = MemoryClient(
    region_name="us-east-1",
    memory_id="your-memory-id"
)

# イベントを取得
event = client.get_event(
    session_id="session-123",
    event_id="event-456"
)

# Memory レコードを一覧取得
records = client.list_memory_records(
    session_id="session-123",
    max_results=20
)

# 特定のイベントを削除
client.delete_event(
    session_id="session-123",
    event_id="event-456"
)
```

**ポイント:**
- `__get_attr__` メソッドにより、操作が自動的に適切なプレーン (GMDP/GMCP) に転送されます
- LangChain、CrewAI、LlamaIndex などのフレームワークとの統合に必要な機能を提供します
- サポートされている操作のみがフィルタリングされ、安全に実行されます

---

### Browser Live View URL の有効期限バリデーション ([#57](https://github.com/aws/bedrock-agentcore-sdk-python/pull/57))

**この機能でできること:**
- Browser ツールで Live View URL を生成する際、有効期限タイムアウトが不正な値の場合にクライアント側でエラーを検出できるようになりました。これにより、サービス側で 4xx エラーが発生する前に問題を特定できます。

**使用例:**

```python
from bedrock_agentcore.tools import BrowserClient

browser = BrowserClient()

# 有効な有効期限 (300秒以内)
try:
    url = browser.generate_live_view_url(
        browser_id="browser-123",
        expiry_timeout_seconds=300  # 最大値
    )
    print(f"Live View URL: {url}")
except ValueError as e:
    print(f"エラー: {e}")

# 無効な有効期限 (300秒を超える)
try:
    url = browser.generate_live_view_url(
        browser_id="browser-123",
        expiry_timeout_seconds=600  # ValueError が発生
    )
except ValueError as e:
    print(f"エラー: {e}")  # "expiry_timeout_seconds cannot exceed 300 seconds"
```

**ポイント:**
- 有効期限タイムアウトは最大 300 秒です
- 不正な値が指定された場合、わかりやすいエラーメッセージが表示されます
- サービス側のエラーを事前に防ぐことができます

---

## バグ修正

### Memory の last_k_turns の修正 ([#62](https://github.com/aws/bedrock-agentcore-sdk-python/pull/62))
- `last_k_turns` パラメータが正しく動作しない問題を修正しました
- この修正により、最近の会話ターンを正確に取得できるようになりました
- 関連 Issue: https://github.com/awslabs/amazon-bedrock-agentcore-samples/issues/172

## まとめ

v0.1.3 では、Memory 機能の大幅な機能拡張により、より柔軟で強力な Memory 管理が可能になりました。特に Strands Agents との統合サポートにより、エージェントアプリケーションの開発がさらに容易になります。
