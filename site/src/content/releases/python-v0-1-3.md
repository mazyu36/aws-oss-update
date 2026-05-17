---
title: "Strands Python SDK v0.1.3 リリース解説"
version: "v0.1.3"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-05-21
summary: "Direct tool call の参照形式が修正され、agent.tool.tool_name 形式での呼び出しが正しく反映されるようになりました。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.1.3"
---

## 概要

このリリースでは、direct tool call の参照形式に関するバグが修正されました。これにより、`agent.tool.tool_name()` 形式でツールを直接呼び出した際の内部記録が正しい形式で行われるようになりました。

**リリース:** [v0.1.3](https://github.com/strands-agents/sdk-python/releases/tag/v0.1.3)

## バグ修正

### Direct tool call の参照形式を修正 ([#56](https://github.com/strands-agents/sdk-python/pull/56))

Direct tool call を使用する際の内部参照が、古い `agent.tool_name` 形式から新しい `agent.tool.tool_name` 形式に更新されました。

**修正内容:**
- ドキュメント内の参照が `agent.tool.tool_name(param1="value")` 形式に統一
- 内部のツール実行記録が正しい形式で行われるように修正
- テストコードも新しい形式に対応

**影響:**
この修正により、direct tool call を使用している既存のコードは引き続き正常に動作し、内部的な記録やログが正しい形式で出力されるようになります。ユーザーコードの変更は不要です。

**関連 Issue:** [#42](https://github.com/strands-agents/sdk-python/issues/42)

## まとめ

このリリースは、direct tool call の内部実装を改善するバグ修正リリースです。既存のコードに影響を与えることなく、より一貫性のある形式でツール呼び出しが記録されるようになりました。
