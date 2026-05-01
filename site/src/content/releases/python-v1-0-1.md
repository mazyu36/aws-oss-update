---
title: "sdk-python v1.0.1"
version: "v1.0.1"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-07-18
summary: "グラフワークフローの並列実行サポート、非シリアライズ可能なツールパラメータのエラー修正、Agent をツールとして使用する際のトレースグループ化の改善を含む、安定性とパフォーマンスを向上させるバグ修正リリース。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.0.1"
---

## 概要

このリリースは、Python SDK の安定性とパフォーマンスを向上させる 3 つの重要なバグ修正を提供します。グラフワークフローでの並列実行の有効化、非シリアライズ可能なツールパラメータの適切な処理、Agent をツールとして使用する際のトレースグループ化の改善が含まれます。

**リリース:** [v1.0.1](https://github.com/strands-agents/sdk-python/releases/tag/v1.0.1)

## バグ修正

### グラフワークフローでの並列実行を有効化 ([#485](https://github.com/strands-agents/sdk-python/pull/485))

グラフワークフロー内の独立した Agent が逐次実行されることによるパフォーマンスのボトルネックを修正しました。この変更により、依存関係のない Agent（researcher、analyst、writer など）が `asyncio.gather()` を使用して並行実行されるようになり、全体の実行時間が大幅に短縮されます。

**影響:**
- 独立した Agent が順次実行されることによる不要な遅延が発生していた
- 複数の Agent を持つグラフワークフローのパフォーマンスが改善されます

**改善点:**
- 独立した Agent の並列実行により実行時間を短縮
- 依存関係の順序は正しく維持（例: synthesizer は全 Agent の完了後に実行）

```python
from strands.multiagent import Graph
from strands.agent import Agent

# 3つの独立したAgentが並列実行されるようになりました
graph = Graph()
graph.add_agent("researcher", researcher_agent)
graph.add_agent("analyst", analyst_agent)
graph.add_agent("writer", writer_agent)
graph.add_agent("synthesizer", synthesizer_agent,
               dependencies=["researcher", "analyst", "writer"])

# 以前: researcher -> analyst -> writer -> synthesizer（逐次実行）
# 現在: researcher | analyst | writer -> synthesizer（並列実行）
result = await graph.execute()
```

---

### 非シリアライズ可能なツールパラメータの JSON シリアライゼーションエラーを防止 ([#498](https://github.com/strands-agents/sdk-python/pull/498))

Agent インスタンス、カスタムクラス、関数などの非シリアライズ可能なオブジェクトをツールパラメータとして渡した際に、ツール呼び出しの記録中に JSON シリアライゼーションエラーが発生し、Agent がクラッシュする問題を修正しました。

**影響を受けていた状況:**
- 複雑なオブジェクトをツールパラメータとして渡すと、記録時にシリアライゼーションエラーが発生
- Agent の実行が中断され、不明瞭なエラーメッセージが表示されていた

**修正内容:**
- スマートなパラメータフィルタリングにより、各パラメータを記録前に検証
- シリアライズ不可能なオブジェクトは `<non-serializable: TypeName>` のような説明的な文字列に置き換え
- ツール実行は正常に継続し、記録履歴に明確な指標を提供

```python
from strands.agent import Agent
from strands.tools import Tool

# カスタムクラスやAgent instanceなどをパラメータとして渡しても
# エラーが発生せず、適切に処理されるようになりました
class CustomConfig:
    def __init__(self, value):
        self.value = value

def my_tool(config: CustomConfig, agent: Agent):
    # ツール実行は正常に動作
    return f"Processed: {config.value}"

agent = Agent(
    name="main_agent",
    tools=[Tool.from_function(my_tool)]
)

# 以前: JSON serialization error で失敗
# 現在: 正常に動作し、記録には <non-serializable: CustomConfig> と表示
```

**ポイント:**
- API の破壊的変更なし、既存の機能はそのまま維持
- ツール実行履歴で非シリアライズ可能なパラメータが明確に識別可能

---

### Agent をツールとして使用する際のトレースグループ化を修正 ([#493](https://github.com/strands-agents/sdk-python/pull/493))

Agent を別の Agent のツールとして使用する際に、トレースが正しくグループ化されない問題を修正しました。この改善により、Langfuse や CloudWatch などのトレーシングツールで、ネストされた Agent の実行を正しく追跡できるようになります。

**影響を受けていた状況:**
- Agent をツールとして使用すると、トレースが分離され、実行フローの可視性が低下
- テレメトリデータの分析が困難になっていた

**修正内容:**
- トレーシングロジックを改善し、親 Agent と子 Agent のトレースを正しくグループ化
- Langfuse、CloudWatch などのテレメトリプラットフォームで正確な実行追跡が可能に

```python
from strands.agent import Agent

# サブエージェントを定義
sub_agent = Agent(
    name="research_assistant",
    instruction="Research and provide detailed information"
)

# メインエージェントがサブエージェントをツールとして使用
main_agent = Agent(
    name="main_agent",
    instruction="Coordinate tasks using sub-agents",
    tools=[sub_agent]
)

# トレースが正しくグループ化され、階層構造が保持されます
# Langfuse/CloudWatchで親子関係が正確に表示されます
response = await main_agent.execute("task description")
```

**ポイント:**
- テレメトリの可視性が向上し、デバッグが容易に
- ネストされた Agent アーキテクチャのパフォーマンス分析が改善

## まとめ

v1.0.1 は、安定性とパフォーマンスに焦点を当てた重要なバグ修正リリースです。グラフワークフローの並列実行サポート、堅牢なエラーハンドリング、改善されたテレメトリにより、本番環境での Agent システムの信頼性が向上します。
