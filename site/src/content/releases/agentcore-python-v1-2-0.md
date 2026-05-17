---
title: "AgentCore Python SDK v1.2.0 リリース解説"
version: "v1.2.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-01-13
summary: "エピソディックメモリ戦略のサポート追加、フレームワーク統合のためのテレメトリ機能強化、ページネーションと関連スコアフィルタリングのバグ修正"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.2.0"
---

## 概要

このリリースでは、エピソディックメモリ戦略のサポートが追加され、より高度なメモリ管理が可能になりました。また、フレームワーク統合のためのテレメトリ機能が強化され、ページネーション動作と関連スコアフィルタリングに関するバグが修正されています。

**リリース:** [v1.2.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.2.0)

## 新機能

### エピソディックメモリ戦略のサポート ([#208](https://github.com/aws/bedrock-agentcore-sdk-python/pull/208))

**この機能でできること:**
- AgentCore Memory でエピソディックメモリ戦略を使用できるようになりました。エピソディックメモリは、特定のイベントや経験を時系列で記憶する機能で、エージェントがより文脈に沿った応答を生成できるようになります。

**使用例:**

```python
from bedrock_agentcore.memory import MemoryClient

# MemoryClient の初期化
client = MemoryClient(region="us-east-1")

# デフォルトのエピソディック戦略を追加
client.add_episodic_strategy(memory_id="your-memory-id")

# 戦略の追加完了を待機する場合
client.add_episodic_strategy_and_wait(memory_id="your-memory-id")

# カスタムエピソディック戦略を追加
client.add_custom_episodic_strategy(
    memory_id="your-memory-id",
    extraction_config={"custom_key": "value"},
    consolidation_config={"custom_key": "value"},
    reflection_config={"custom_key": "value"}
)
```

**ポイント:**
- `StrategyType.EPISODIC` が新たに追加され、エピソディックメモリ戦略が利用可能になりました
- `add_episodic_strategy()` と `add_episodic_strategy_and_wait()` メソッドでデフォルト戦略を簡単に追加できます
- カスタム設定が必要な場合は `add_custom_episodic_strategy()` を使用してください

---

### フレームワーク統合のためのテレメトリパラメータ ([#210](https://github.com/aws/bedrock-agentcore-sdk-python/pull/210))

**この機能でできること:**
- SDK クライアント（CodeInterpreter、BrowserClient、MemoryClient）に `integration_source` パラメータが追加され、どのフレームワーク経由で AgentCore を利用しているかを追跡できるようになりました。

**使用例:**

```python
from bedrock_agentcore.tools.code_interpreter_client import CodeInterpreter
from bedrock_agentcore.tools.browser_client import BrowserClient
from bedrock_agentcore.memory import MemoryClient

# LangChain 統合からの利用を示す
code_interpreter = CodeInterpreter(
    region="us-west-2",
    integration_source="langchain"
)

# CrewAI 統合からの利用を示す
browser_client = BrowserClient(
    region="us-west-2",
    integration_source="crewai"
)

# Strands 統合からの利用を示す
memory_client = MemoryClient(
    region="us-west-2",
    integration_source="strands"
)

# 既存のコードは変更不要（後方互換性あり）
client = CodeInterpreter(region="us-west-2")
```

**ポイント:**
- `integration_source` はオプションパラメータで、デフォルトは `None` です
- User-Agent ヘッダーに統合ソース情報が追加され、AWS のリクエストログで追跡可能になります
- 既存のコードは変更なしで動作します（後方互換性あり）

## バグ修正

### Strands 統合での関連スコアフィルタリング ([#211](https://github.com/aws/bedrock-agentcore-sdk-python/pull/211))

- **修正内容:** `retrieve_customer_context()` メソッドが `RetrievalConfig.relevance_score` の設定を無視していた問題を修正しました
- **影響を受けていた状況:** 高い関連スコア閾値を設定していても、すべてのメモリがコンテキストに注入されていました
- **修正後の動作:** 指定した関連スコア以上のメモリのみがフィルタリングされて返されるようになりました

---

### get_last_k_turns() と list_messages() のページネーション動作改善 ([#209](https://github.com/aws/bedrock-agentcore-sdk-python/pull/209))

- **修正内容:** `get_last_k_turns(k=200)` を呼び出しても、デフォルトの 100 件までしか取得されなかった問題を修正しました
- **影響を受けていた状況:** 100 件を超える会話履歴を取得しようとした場合、期待した件数が返されませんでした
- **修正後の動作:**
  - `max_results` を指定しない場合、自動的にページネーションして指定した `k` 件のターンを取得します
  - `list_messages()` に `fetch_all=True` パラメータが追加され、最大 10,000 件のメッセージを取得可能になりました
  - 明示的に `max_results` を指定した場合は、従来通りその値が尊重されます（後方互換性あり）

## まとめ

このリリースでは、エピソディックメモリ戦略のサポートにより、エージェントのメモリ管理がさらに強化されました。また、ページネーションと関連スコアフィルタリングのバグ修正により、メモリ機能の信頼性が向上しています。
