---
title: "Strands Tools v0.5.0 リリース解説"
version: "v0.5.0"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-04-17
summary: "RSS ツールのパストラバーサル脆弱性（CWE-22）を修正するセキュリティリリース。feed_id パラメータの検証が追加され、意図しないファイルアクセスを防止します。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.5.0"
---

## 概要

このリリースは、RSS ツールにおけるパストラバーサル脆弱性を修正するセキュリティリリースです。`feed_id` パラメータを通じた意図しないディレクトリへのアクセスを防止します。

**リリース:** [v0.5.0](https://github.com/strands-agents/tools/releases/tag/v0.5.0)

## バグ修正

### RSS ツールのパストラバーサル脆弱性を修正 ([#451](https://github.com/strands-agents/tools/pull/451))

**修正内容:**
- [CWE-22](https://www.cvedetails.com/cwe-details/22/Improper-Limitation-of-a-Pathname-to-a-Restricted-Directory-.html) に該当するパストラバーサル脆弱性を修正しました
- `get_feed_file_path()` メソッドで `feed_id` パラメータが検証なしにファイルパスに連結されていた問題を解決

**影響:**
- 修正前は `../` などのトラバーサルシーケンスを含む `feed_id` を使用することで、意図した `storage_path` 外の `.json` ファイルを読み取り、書き込み、または削除できる可能性がありました
- 影響を受ける操作: `load_feed_data`（読み取り）、`save_feed_data`（書き込み）、`unsubscribe` の `os.remove`（削除）

**修正方法:**
- 構築されたパスを `os.path.realpath()` で解決し、`storage_path` 内に収まっていることを検証してから返すようになりました
- すべての影響を受ける操作は `get_feed_file_path()` を経由するため、この修正で一括して保護されます

**ポイント:**
- v0.5.0 へのアップデートを推奨します
- RSS ツールを使用している場合は、`feed_id` に不正な値が渡されていないかログを確認してください

## まとめ

RSS ツールのセキュリティ脆弱性を修正した重要なリリースです。RSS ツールを使用している場合は、早急に v0.5.0 へのアップデートをお勧めします。
