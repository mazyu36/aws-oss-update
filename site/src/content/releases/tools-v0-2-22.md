---
title: "tools v0.2.22"
version: "v0.2.22"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2026-03-04
summary: "hatch 仮想環境の互換性修正と、環境ツールのセキュリティ強化が含まれます。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.22"
---

## 概要

Strands Agents Tools v0.2.22 では、hatch の仮想環境に関する互換性問題の修正と、環境ツールのセキュリティ強化が行われました。

**リリース:** [v0.2.22](https://github.com/strands-agents/tools/releases/tag/v0.2.22)

## バグ修正

### hatch 仮想環境の互換性修正 ([#409](https://github.com/strands-agents/tools/pull/409))

- hatch の `optional-dependencies` キーを PEP 685 に準拠したハイフン形式に正規化しました
- hatch>=1.16.5 にアップグレードし、virtualenv 21.0.0 との互換性問題を解決しました
- pytest および pytest-asyncio の上限バージョンを拡大し、hatch 1.16.5 のテスト環境との互換性を確保しました
- 既存のアンダースコア形式（`pip install strands-agents-tools[mongodb_memory]`）も引き続き使用可能です

---

### BYPASS_TOOL_CONSENT を保護変数に追加 ([#406](https://github.com/strands-agents/tools/pull/406))

- `BYPASS_TOOL_CONSENT` 環境変数を環境ツールの `PROTECTED_VARS` ブロックリストに追加しました
- これにより、エージェントが実行時にこの変数を変更して同意プロンプトを無効化することを防止します
- セキュリティの観点から重要な修正で、ユーザーの承認なしに同意ゲートが無効化されるリスクを排除しました

---

## まとめ

v0.2.22 は、開発環境の互換性改善とセキュリティ強化を含むリリースです。特に hatch を使用した開発環境でビルド問題が発生していた場合は、このバージョンへのアップデートを推奨します。
