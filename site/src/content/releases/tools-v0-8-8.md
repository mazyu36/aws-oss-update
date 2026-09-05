---
title: "Strands Tools v0.8.8 リリース解説"
version: "v0.8.8"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-09-04
summary: "セキュリティ関連のバグ修正 2 件で構成されたパッチリリースです。`mem0_memory` の `memory_id` を扱う操作について所有権チェックを fail-closed 化し、`http_request` ではクロスホストリダイレクト時にカスタム認証ヘッダー（`X-API-Key` など）が漏洩しないよう非標準ヘッダーを除去する修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.8"
---

## 概要

このリリースは、`mem0_memory` と `http_request` に対するセキュリティ関連のバグ修正 2 件で構成されるパッチリリースです。両方とも情報漏洩やクロステナントアクセスに直結し得る挙動を fail-closed / allowlist 型に締め直す変更のため、該当ツールを利用しているユーザーは早めのアップグレードが推奨されます。

**リリース:** [v0.8.8](https://github.com/strands-agents/tools/releases/tag/v0.8.8)

## バグ修正

### mem0: `memory_id` の所有権チェックを fail-closed 化 ([#596](https://github.com/strands-agents/tools/pull/596))

**修正内容:**

`mem0_memory` ツールは `memory_id` を直接受け取る `get` / `delete` / `history` の各操作について、実行前に呼び出し元がその memory の所有者かどうかを検証する `_verify_memory_ownership` を持っています。しかしこれまでのロジックは、所有権を確認できなかった場合（メタデータ欠落、prefetch 失敗など）に「否定できない = 許可」として振る舞い、事実上のフェイルオープンになっていました。加えて `delete` / `history` の事前チェックは `except Exception: pass` で丸ごと握りつぶされていたため、検証が例外を投げた時点で以降のガードが機能しなくなっていました。

- **修正前**: 所有権を積極的に確認できないケース（メタデータが無い、prefetch でエラー、など）でも操作が通ってしまう。ワースト・ケースでは他テナントの memory への `get` / `delete` / `history` が成功しうる
- **修正後**: バインドされている principal ID のうち少なくとも 1 つがレコードと positive に一致した場合にのみ操作を許可。それ以外はすべて "Access denied" を返す。`delete` / `history` の事前チェックからは `except Exception: pass` を削除し、ownership check は削除確認プレビューよりも前に実行される。LLM が制御可能なメタデータからは identity キーが除去され、否認メッセージも単一の "Access denied" に統一

**ポイント:**
- クロステナント拒否・メタデータ欠落・prefetch 失敗・メタデータのサニタイズを網羅する 14 件のユニットテストが追加されており、`pytest tests/test_mem0.py` の全 36 テストが passing の状態です
- identity キー（呼び出し元 principal を示すキー）は LLM から書き込めるメタデータ経路にも到達しうるため、明示的に除去されています。これにより「LLM が自分で `owner_id` を書き換えてアクセス権を偽装する」経路が塞がれます
- 拒否メッセージが `"Access denied"` に統一されたため、原因ごとの詳細（メタデータが無い / principal が一致しない / prefetch に失敗した）はレスポンスから区別できなくなります。ログ側で原因を確認する運用に切り替えてください

---

### http_request: クロスホストリダイレクト時に非標準ヘッダーを除去 ([#595](https://github.com/strands-agents/tools/pull/595))

**修正内容:**

Python の `requests` ライブラリはクロスホストリダイレクト時に `Authorization` ヘッダーのみを自動でストリップします。一方で `X-API-Key` や `X-Auth-Token` のようなカスタム認証ヘッダーはリダイレクト先へそのまま転送されるため、リダイレクト先ホストへ意図せず認証情報が漏洩する経路がありました。攻撃者が制御するホスト、あるいは信頼レベルの異なるホストへのリダイレクトが発生した場合、そのリクエストの `Headers` にキーがそのまま同梱されて送信されます。

- **修正前**: `requests` が自動でストリップするのは `Authorization` のみ。`X-API-Key` などのカスタムヘッダーはクロスホストリダイレクトでもそのまま送られる
- **修正後**: `http_request` は自前でリダイレクトを追跡し、クロスホストのホップでは安全なトランスポート系ヘッダーの allowlist だけを維持し、それ以外はすべて drop する

**ポイント:**
- 変更は "allowlist" 方式で、既知の安全なヘッダーだけを次のホップに引き継ぐ設計です。新しい / 未知のカスタムヘッダーが将来追加されても、デフォルトで漏れない挙動になります
- 同一ホスト内のリダイレクトについてはヘッダーは維持されるため、通常の API 呼び出しの挙動は変わりません
- テスト側では 449 行の追加があり、クロスホスト時のヘッダー除去、同一ホスト時のヘッダー保持、リダイレクトチェイン、認証情報を含むケースなどが網羅されています

## まとめ

`mem0_memory` の所有権チェックの fail-closed 化、および `http_request` のクロスホストリダイレクトでのカスタム認証ヘッダー漏洩を塞ぐという、いずれも security-hardening 系のバグ修正 2 件で構成されるパッチリリースです。両ツールを利用しているユーザーは早めのアップグレードを推奨します。
