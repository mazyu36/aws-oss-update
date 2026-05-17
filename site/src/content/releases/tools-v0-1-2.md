---
title: "Strands Tools v0.1.2 リリース解説"
version: "v0.1.2"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-05-21
summary: "ツールの相互運用性を向上し、不要な依存関係を削除。think ツールと use_llm ツールが親エージェントのコンテキストを継承するようになり、load_tool の依存関係チェックが簡素化されました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.1.2"
---

## 概要

Strands Agents Tools v0.1.2 では、ツール間の相互運用性が大幅に向上し、不要な依存関係が削除されました。think ツールと use_llm ツールが親エージェントのトレースとツールを継承できるようになり、より一貫性のあるエージェント動作が実現されました。

**リリース:** [v0.1.2](https://github.com/strands-agents/tools/releases/tag/v0.1.2)

## バグ修正

### ツールの相互運用性向上と依存関係削除 ([#14](https://github.com/strands-agents/tools/pull/14))

**修正内容:**
- think ツールが親エージェントのトレースとツールを継承するようになり、コンテキストが維持されるようになりました
- use_llm ツールが親エージェントから trace_attributes を適切に渡すようになりました
- load_tool から不要な hot_reload_tools 依存関係チェックが削除されました
- mem0_memory ツールのコード整形と可読性が改善されました

**修正前の問題:**
- think ツールが新しいエージェントを作成する際、親エージェントのツールやトレース情報にアクセスできませんでした
- load_tool が hot_reload_tools フラグを不必要にチェックしていました

**修正後の改善:**
- think ツールが作成するエージェントは親のツールとトレース属性を継承し、より豊富なコンテキストで動作します
- load_tool は STRANDS_DISABLE_LOAD_TOOL のみをチェックし、依存関係が簡素化されました

**影響を受けるファイル:**
- `src/strands_tools/think.py`: 親エージェントのコンテキスト継承を実装
- `src/strands_tools/use_llm.py`: trace_attributes の適切な伝播を実装
- `src/strands_tools/load_tool.py`: 不要な依存関係チェックを削除
- `src/strands_tools/mem0_memory.py`: コード整形を改善

**ポイント:**
- この修正により、ツール間の連携がよりスムーズになり、トレーサビリティが向上します
- 依存関係の簡素化により、ツールのロード処理がシンプルになりました

---

## まとめ

v0.1.2 は、ツールの相互運用性とコード品質を向上させる重要なバグ修正リリースです。think ツールと use_llm ツールの改善により、エージェント間のコンテキスト共有がより確実に行われるようになり、開発者はより一貫性のあるエージェント動作を期待できます。
