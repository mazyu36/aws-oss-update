---
title: "tools v0.1.6"
version: "v0.1.6"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-06-18
summary: "use_llm と think メタツールにツールフィルタリング機能を追加し、無限再帰を防止。また、batch ツールと Mem0 ツールのバグを修正。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.1.6"
---

## 概要

このリリースでは、`use_llm` と `think` メタツールにツールフィルタリング機能が追加され、親エージェントが子エージェントに渡すツールを細かく制御できるようになりました。これにより、メタツールが自身を呼び出すことによる無限再帰の問題が解決されます。また、batch ツールと Mem0 ツールのバグ修正も含まれています。

**リリース:** [v0.1.6](https://github.com/strands-agents/tools/releases/tag/v0.1.6)

## 新機能

### use_llm と think ツールのツールフィルタリング機能 ([#72](https://github.com/strands-agents/tools/pull/72))

**この機能でできること:**
- 親エージェントが子エージェントに渡すツールのサブセットを指定できます
- メタツールが自身を呼び出すことによる無限再帰を防止できます
- エージェントに特定のツールのみを持たせた専門的なタスクを実行できます

**使用例:**

```python
from strands import Agent

# エージェントの作成
agent = Agent()

# 無限再帰を防止するツールフィルタリング
# use_llm 自身を除外して、calculator と file_read のみを子エージェントに渡す
result = agent.tool.use_llm(
    prompt="2 + 2 を計算して、ファイルを読み込んでください",
    system_prompt="あなたはヘルパーです",
    tools=["calculator", "file_read"]  # use_llm 自身は含まれない
)

# 専門的な分析タスクのための think ツール
result = agent.tool.think(
    thought="量子コンピューティングの影響を分析する",
    cycle_count=3,
    system_prompt="あなたは量子コンピューティングの専門家です",
    tools=["journal", "file_read"]  # 集中的な分析のための特定ツールのみ
)

# メタツール開発のための安全な使用
result = agent.tool.use_llm(
    prompt="新しい計算ツールを設計してください",
    system_prompt="あなたはツール開発者です",
    tools=["editor", "file_write", "calculator"]  # メタツールを含まない開発ツール
)
```

**ポイント:**
- `tools` パラメータはオプションです。省略すると、親エージェントの全てのツールが子エージェントに継承されます（後方互換性あり）
- 存在しないツール名を指定した場合、警告ログが出力され、そのツールは無視されます
- 空のリストを指定すると、子エージェントはツールを持たない状態で実行されます
- この機能により、複雑なマルチエージェントシステムでのツールアクセス制御が可能になります

## バグ修正

### batch ツールの結果バグ修正 ([#77](https://github.com/strands-agents/tools/pull/77))
- batch ツールの結果処理に関するバグを修正しました
- issue #76 と #46 で報告された問題に対応しています

### Mem0 ツール仕様から allOf を削除 ([#85](https://github.com/strands-agents/tools/pull/85))
- Mem0 ツールの仕様で問題を引き起こしていた `allOf` を削除しました
- ツール仕様の互換性が向上しました

## まとめ

このリリースでは、メタツールの安全性と制御性が大幅に向上し、複雑なマルチエージェントシステムの構築がより容易になりました。また、既存ツールのバグ修正により、全体的な安定性も向上しています。
