---
title: "tools v0.4.1"
version: "v0.4.1"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2026-04-09
summary: "Elasticsearch memory ツールに namespace バリデーションを追加し、TOCTOU 脆弱性を修正しました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.4.1"
---

## 概要

このリリースでは、Elasticsearch memory ツールのセキュリティが強化されました。namespace のバリデーション追加と TOCTOU（Time-of-Check to Time-of-Use）脆弱性の修正により、マルチテナント環境でのデータ分離が確実に行われるようになりました。

**リリース:** [v0.4.1](https://github.com/strands-agents/tools/releases/tag/v0.4.1)

## バグ修正

### Elasticsearch memory ツールの namespace バリデーションと TOCTOU 脆弱性の修正 ([#447](https://github.com/strands-agents/tools/pull/447))

**修正内容:**

このセキュリティ修正は、MongoDB memory ツールで修正された脆弱性（PR #321）と同じクラスの問題を Elasticsearch memory ツールでも修正するものです。

**1. namespace バリデーションの追加**
- 非文字列型（辞書型など）を拒否し、インジェクション攻撃を防止
- `^[A-Za-z0-9_-]{1,64}$` パターンで有効な namespace のみを許可
- すべての操作の前に早期バリデーションを実施

**2. サーバーサイドでの namespace 強制**
- 以前: ドキュメント取得後にクライアントサイドで namespace をチェック
- 修正後: Elasticsearch の `bool` クエリで `memory_id` と `namespace` の両方を条件に検索
- サーバーサイドで namespace が強制されるため、クロステナントアクセスを確実に防止

**3. atomic な削除による TOCTOU の排除**
- 以前: `_get_memory()` でチェック → `es_client.delete()` で削除（レースコンディションの可能性）
- 修正後: `delete_by_query()` で `memory_id` と `namespace` を同時に条件指定
- 検証と削除が atomic に実行され、レースコンディションを完全に排除

**影響を受けていた状況:**
- マルチテナント環境で Elasticsearch memory ツールを使用している場合
- 悪意のある namespace パラメータによるクロステナントメモリアクセスの可能性
- 削除操作におけるレースコンディションによる意図しないデータ削除の可能性

**推奨事項:**
- マルチテナント環境で Elasticsearch memory ツールを使用している場合は、このバージョンへのアップデートを強く推奨します

## まとめ

Elasticsearch memory ツールのセキュリティが強化され、マルチテナント環境でのデータ分離がより確実になりました。
