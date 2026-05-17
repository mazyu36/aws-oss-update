---
title: "Strands Tools v0.2.15 リリース解説"
version: "v0.2.15"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-11-12
summary: "Workflow Tool において、依存する前のタスクから結果を取得できなかった問題を修正しました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.15"
---

## 概要

このリリースでは、Workflow Tool における重要なバグ修正が含まれています。以前のバージョンでは、ワークフロー内のタスクが依存する前のタスクの実行結果を正しく取得できない問題がありました。この問題により、タスク間でデータを受け渡すワークフローが正常に動作しませんでした。

**リリース:** [v0.2.15](https://github.com/strands-agents/tools/releases/tag/v0.2.15)

## バグ修正

### Workflow タスクが依存タスクの結果にアクセスできない問題を修正 ([#202](https://github.com/strands-agents/tools/pull/202))

**問題:**
Workflow Tool で、あるタスクが前のタスクの実行結果を参照できない不具合がありました。`workflow.py` 内のコードが `AgentResult` オブジェクトから結果を正しく抽出できず、後続のタスクで前のタスクの結果をコンテキストとして利用できませんでした。

**修正内容:**
- `result.get("content", [])` から `result.message.get("content", [])` に変更し、`AgentResult` オブジェクトの構造に正しく対応
- タスク実行結果の抽出ロジックを改善し、`message` 属性を介して content にアクセスするように修正

**影響を受けていた状況:**
- ワークフロー内で複数のタスクを定義し、後続タスクが前のタスクの結果に依存する場合
- タスク間でデータを受け渡す必要があるワークフロー

**修正後の動作:**
ワークフロー内のタスクが正しく前のタスクの結果を取得し、コンテキストとして利用できるようになりました。これにより、複数のタスクを連鎖させる複雑なワークフローが期待通りに動作します。

**変更されたファイル:**
- `src/strands_tools/workflow.py` (workflow.py:448)
- `tests/test_workflow.py` (テストケースの更新)

## まとめ

v0.2.15 では、Workflow Tool の重要なバグ修正が行われ、タスク間のデータ受け渡しが正しく機能するようになりました。複数のタスクを組み合わせた高度なワークフローを構築する際の信頼性が向上しています。
