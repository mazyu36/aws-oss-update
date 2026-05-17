---
title: "Strands Python SDK v0.1.8 リリース解説"
version: "v0.1.8"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-06-18
summary: "AI による会話要約機能、ツール名の柔軟な呼び出し、エクスポネンシャルバックオフの修正を含む重要なアップデート。会話履歴を効率的に管理する SummarizingConversationManager が追加され、長時間実行エージェントのコンテキスト管理が改善されました。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.1.8"
---

## 概要

Strands Agents Python SDK v0.1.8 では、AI による会話要約機能を持つ新しい SummarizingConversationManager の追加、ツール名の柔軟な呼び出しサポート、リトライロジックのバグ修正など、重要な機能追加と改善が含まれています。特に、長時間実行されるエージェントでのコンテキスト管理が大幅に改善されました。

**リリース:** [v0.1.8](https://github.com/strands-agents/sdk-python/releases/tag/v0.1.8)

## 新機能

### AI による会話要約機能 ([#112](https://github.com/strands-agents/sdk-python/pull/112))

**この機能でできること:**
- 新しい SummarizingConversationManager により、古いメッセージを単純に削除するのではなく、AI を使って要約してコンテキストを保持できるようになりました。これにより、モデルのコンテキスト制限内に収まりながら、会話の意味的な情報を維持できます。

**使用例:**

```python
from strands import Agent
from strands.agent.conversation_manager import SummarizingConversationManager

# 要約機能を持つ会話マネージャーを作成
manager = SummarizingConversationManager(
    max_tokens=100000,  # 最大トークン数
    summarization_threshold=0.7  # この割合に達したら要約を開始
)

agent = Agent(
    name="Long Running Agent",
    description="長時間実行されるエージェント",
    conversation_manager=manager
)

# 長い会話でも、古いメッセージが要約されてコンテキストが保持されます
response = agent("これまでの会話を踏まえて、次の提案をしてください")
```

**ポイント:**
- 従来の SlidingWindow 方式と異なり、メッセージを削除せず要約して保持します
- 長時間実行されるエージェントで、過去の会話の文脈を失わずに動作できます
- summarization_threshold でいつ要約を開始するかを制御できます

---

### ツール名の柔軟な呼び出しサポート ([#178](https://github.com/strands-agents/sdk-python/pull/178))

**この機能でできること:**
- ツールを直接メソッドとして呼び出す際、ハイフン付きのツール名（例: `example-tool`）をアンダースコア付き（例: `example_tool`）でも呼び出せるようになりました。Python の命名規則に従いながら、ツール名の柔軟性が向上しました。

**使用例:**

```python
from strands import Agent
from strands.tools import Tool

def my_calculation_tool(a: int, b: int) -> int:
    """2つの数値を計算するツール"""
    return a + b

agent = Agent(
    tools=[Tool.from_function(my_calculation_tool, name="my-calculation-tool")]
)

# どちらの呼び出し方でも動作します
result1 = agent.tools.invoke("my-calculation-tool", {"a": 5, "b": 3})
result2 = agent.tools.invoke("my_calculation_tool", {"a": 5, "b": 3})  # アンダースコアでもOK
```

**ポイント:**
- Python の命名規則（アンダースコア）を使いながら、ツール名（ハイフン）との互換性を保てます
- 複数のツールがマッチする場合はエラーが発生し、曖昧さを回避します
- 既存のコードへの影響はなく、下位互換性が保たれています

---

## バグ修正

### エクスポネンシャルバックオフの修正 ([#223](https://github.com/strands-agents/sdk-python/pull/223))
- リトライロジックでエクスポネンシャルバックオフが正しく適用されていなかった問題を修正しました
- 以前は `current_delay` が破棄されており、すべてのリトライで同じ待機時間になっていました
- 現在は遅延時間が正しく増加し、適切なバックオフが機能します

### Docstring パーサーの依存関係修正 ([#239](https://github.com/strands-agents/sdk-python/pull/239))
- 未使用の依存関係 swagger-parser を削除し、docstring パーサーの依存関係を適切に設定しました
- パッケージサイズが削減され、依存関係の管理が改善されました

---

## まとめ

v0.1.8 は、長時間実行エージェントのコンテキスト管理を大幅に改善する SummarizingConversationManager の追加、開発者体験を向上させるツール名の柔軟な呼び出しサポート、リトライロジックの重要なバグ修正を含む、安定性と使いやすさを向上させるリリースです。
