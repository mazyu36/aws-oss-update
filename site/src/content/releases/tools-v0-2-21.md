---
title: "tools v0.2.21"
version: "v0.2.21"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2026-02-19
summary: "Pillow 12.x をサポートし、CVE-2026-25990 に対応するセキュリティ修正。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.21"
---

## 概要

Strands Agents Tools v0.2.21 では、Pillow ライブラリの依存関係を更新し、セキュリティ脆弱性 CVE-2026-25990 に対応しました。

**リリース:** [v0.2.21](https://github.com/strands-agents/tools/releases/tag/v0.2.21)

## バグ修正

### Pillow 12.x サポートによる CVE-2026-25990 対応 ([#399](https://github.com/strands-agents/tools/pull/399))

- Pillow の依存関係を `>=11.2.1,<12.0.0` から `>=12.1.1` に更新しました
- セキュリティ脆弱性 CVE-2026-25990 に対応するための修正です
- 上限バージョンの制限が解除され、Pillow 12.x 以降のバージョンが使用可能になりました
- 画像処理を使用するツール（`image_reader` など）を利用している場合は、依存関係を更新することを推奨します

```bash
# 依存関係の更新
pip install --upgrade strands-agents-tools
```

---

## まとめ

v0.2.21 は、Pillow ライブラリのセキュリティ脆弱性 CVE-2026-25990 に対応するためのセキュリティ修正リリースです。画像処理機能を使用している場合は、早めのアップデートを推奨します。
