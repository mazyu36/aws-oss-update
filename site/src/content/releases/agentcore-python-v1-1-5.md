---
title: "AgentCore Python SDK v1.1.5 リリース解説"
version: "v1.1.5"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-01-13
summary: "Episodic Memory Strategy のサポート追加、Strands 統合での relevance_score フィルタリング修正、ページネーション動作の改善を含むリリースです。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.5"
---

## 概要

このリリースでは、Episodic Memory Strategy のサポートが新たに追加されました。また、Strands 統合での relevance_score フィルタリングが正しく動作するよう修正され、`get_last_k_turns()` と `list_messages()` のページネーション動作が改善されています。

**リリース:** [v1.1.5](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.5)

## 新機能

### Episodic Memory Strategy サポート ([#208](https://github.com/aws/bedrock-agentcore-sdk-python/pull/208))

**この機能でできること:**
- AgentCore Memory で Episodic Strategy を使用できるようになりました。エピソード単位でのメモリ管理が可能になります。

**使用例:**

```python
from bedrock_agentcore.memory import MemoryClient

client = MemoryClient(region="us-west-2")

# デフォルトの Episodic Strategy を追加
client.add_episodic_strategy(memory_id="my-memory-id")

# 完了を待機する場合
client.add_episodic_strategy_and_wait(memory_id="my-memory-id")

# カスタム Episodic Strategy を追加
client.add_custom_episodic_strategy(
    memory_id="my-memory-id",
    extraction_config=my_extraction_config,
    consolidation_config=my_consolidation_config,
    reflection_config=my_reflection_config
)
```

**ポイント:**
- `StrategyType.EPISODIC` が新たに追加され、既存の Strategy と同様に使用可能
- extraction、consolidation、reflection の各設定をカスタマイズ可能

---

### フレームワーク統合のアトリビューション Telemetry ([#210](https://github.com/aws/bedrock-agentcore-sdk-python/pull/210))

**この機能でできること:**
- SDK クライアントに `integration_source` パラメータを追加し、LangChain や CrewAI などのフレームワーク経由での利用を識別できるようになりました。

**使用例:**

```python
from bedrock_agentcore.tools.code_interpreter_client import CodeInterpreter
from bedrock_agentcore.tools.browser_client import BrowserClient
from bedrock_agentcore.memory import MemoryClient

# フレームワーク統合元を指定
code_interpreter = CodeInterpreter(
    region="us-west-2",
    integration_source="langchain"
)

browser = BrowserClient(
    region="us-west-2",
    integration_source="crewai"
)

memory = MemoryClient(
    region="us-west-2",
    integration_source="strands"
)

# 既存のコードはそのまま動作（後方互換性あり）
code_interpreter = CodeInterpreter(region="us-west-2")
```

**ポイント:**
- `integration_source` はオプションパラメータで、デフォルトは `None`
- User-Agent ヘッダーに情報が追加される形式のため、API 契約に変更なし
- 完全な後方互換性を維持

## バグ修正

### Strands 統合での relevance_score フィルタリング修正 ([#211](https://github.com/aws/bedrock-agentcore-sdk-python/pull/211))

- **修正内容:** `retrieve_customer_context()` メソッドが `RetrievalConfig.relevance_score` の設定を無視して、全てのメモリを注入していた問題を修正
- **影響:** 高い relevance_score 閾値を設定していても、低スコアのメモリがコンテキストに含まれていた
- **解決:** `relevanceScore >= relevance_score` のフィルタリングロジックを追加

---

### get_last_k_turns() と list_messages() のページネーション動作改善 ([#209](https://github.com/aws/bedrock-agentcore-sdk-python/pull/209))

- **修正内容:** `get_last_k_turns(k=200)` を呼び出しても、デフォルトの `max_results=100` により 100 イベント分しか取得できなかった問題を修正
- **影響:** 100 件を超える会話ターンを取得しようとしても、最大 100 件までしか返されなかった
- **解決:**
  - `max_results` のデフォルト値を `100` から `None` に変更
  - `max_results=None` の場合、k ターン分が見つかるまで自動的にページネーションを継続
  - `list_messages()` に `fetch_all` パラメータを追加（最大 10,000 メッセージまで取得可能）

**使用例:**

```python
from bedrock_agentcore.memory import MemoryClient

client = MemoryClient(region="us-west-2")

# 200 ターン分を自動ページネーションで取得
turns = client.get_last_k_turns(
    memory_id="my-memory-id",
    session_id="my-session-id",
    k=200
)

# 明示的に max_results を指定した場合は従来通りの動作
turns = client.get_last_k_turns(
    memory_id="my-memory-id",
    session_id="my-session-id",
    k=200,
    max_results=100  # 100 件までに制限
)
```

## まとめ

Episodic Memory Strategy の追加により、より柔軟なメモリ管理が可能になりました。また、Strands 統合とページネーションのバグ修正により、SDK の信頼性が向上しています。
