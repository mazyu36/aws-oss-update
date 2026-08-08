---
title: "Strands Tools v0.8.6 リリース解説"
version: "v0.8.6"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-08-07
summary: "sleep / editor / shell を含む 14 個のツールを非推奨化し、SDK ネイティブ機能・vended tools・MCP サーバーへの移行を促す大規模な非推奨リリース。加えて use_aws の SSM / KMS レスポンスの秘匿情報保護、environment ツールのマスキング設定の一元化などのセキュリティ修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.6"
---

## 概要

このリリースでは、SDK ネイティブ機能・vended tools・MCP サーバーによって置き換えられる 14 個のツールに非推奨警告が追加されました。警告は v0.8.6 では `warning` レベル、v0.9.0 では `error` レベルへ引き上げられますが、ツール自体は動作し続けます。加えて `use_aws` の SSM / KMS レスポンスに対する秘匿情報の同意ゲートと秘匿化、`environment` ツールにおけるマスキング設定の一元化といったセキュリティ関連の修正も含まれます。

**リリース:** [v0.8.6](https://github.com/strands-agents/tools/releases/tag/v0.8.6)

## 新機能

### sleep / editor / shell の非推奨化 ([#550](https://github.com/strands-agents/tools/pull/550))

**この機能でできること:**
- Strands SDK が `strands.vended_tools` として同等の実装を提供するようになった 3 つのツール (`sleep`, `editor`, `shell`) に非推奨警告が追加されました。二重実装によるドリフト（片方だけ修正されて挙動が乖離する状態）を防ぐことが目的です。
- 警告はツール呼び出しごとにログ出力されるため、リリースノートを読まないユーザーでも実際の使用箇所で気づけます。

**使用例:**

```python
# 非推奨（このリリースから warning ログが出る）
from strands_tools import sleep, editor, shell

# 推奨（SDK vended tools への移行）
from strands.vended_tools import sleep, file_editor, shell
```

**ポイント:**
- ツールは削除されません。v0.9.0 で同じメッセージが `error` レベルになるだけで、動作は継続します
- `sleep`: 上限秒数の設定は `MAX_SLEEP_SECONDS` 環境変数から `make_sleep(max_duration=...)` へ変更
- `editor`: SDK 版 `file_editor` には `pattern_replace` / `find_line` / `undo_edit` がないため、これらを使用している場合は自作またはツールの実装確認が必要
- `shell`: SDK 版はステートレスかつサンドボックスルーティングされており、PTY やコマンドバッチ実行はサポートされていません
- `http_request` は SDK 版が薄い httpx ラッパーで HTML→Markdown 変換をカバーしないため、今回の非推奨化からは除外

---

### 11 個のツールを追加で非推奨化 ([#566](https://github.com/strands-agents/tools/pull/566))

**この機能でできること:**
- SDK ネイティブ機能・vended tools・MCP サーバー・不要（モデルが直接生成可能）で置き換えられる 11 個のツールにも非推奨警告が追加されました。`@typing_extensions.deprecated` マーカーも付与されるため、型チェッカーや IDE でも呼び出し箇所がハイライトされます。
- すべての一対一置き換えではありません — SDK がネイティブでできることをラップし続けること自体が、今回のプロジェクトが避けたい状態だからです。

**置き換え先の対応表:**

| ツール | 置き換え先 | 種別 |
|---|---|---|
| `batch` | 不要（SDK のデフォルトで並行実行） | native |
| `think` | モデルの extended thinking（reasoning config） | native |
| `current_time` | `ContextInjector` | native |
| `memory` | `MemoryManager` + `BedrockKnowledgeBaseStore` | native |
| `retrieve` | 同上（`writable=False`） | native |
| `calculator` | vended `shell`（`python3 -c` with sympy） | SDK tool |
| `cron` | vended `shell`（`crontab`）または EventBridge Scheduler | SDK tool |
| `environment` | vended `shell`（読み取りのみ） | SDK tool |
| `slack` | 公式 Slack MCP サーバー / `slack_bolt`（Socket Mode） | MCP |
| `diagram` | 置き換えなし — モデルが直接 graphviz / mermaid を書ける | none |
| `rss` | 置き換えなし — `feedparser` を直接呼ぶ | none |

**ポイント:**
- `batch` は実は並行実行しておらず、内部は同期 `for` ループでした。SDK の `ConcurrentToolExecutor` が `python/v1.6.0` からデフォルトになったため、削除が純粋な改善になります
- `think` は `sequentialthinking` MCP サーバーではなくモデルのネイティブ reasoning を指し示します — MCP 版は今回廃止しようとしているツールループ型推論と同じパラダイムだからです
- `environment` → `shell` は読み取り専用です。子シェルはエージェント自身の `os.environ` を変更できないため、変数の設定は起動プロセス側で行う必要があります
- `calculator` → `shell` は権限の増加を伴います。`calculator` は AST の許可リストで式を検証していましたが、`shell` は任意コマンドを実行できます
- 今回除外されたもの: `image_reader`（SDK にマルチフォーマットのネイティブファイル読み込みがまだない）、`speak`、`use_computer`（置き換え先の完成度がまだ十分でない）
- これらのツールは、このリポジトリが最終的にアーカイブされることを見据えた段階的な非推奨化の一部です

---

## バグ修正

### environment ツールのマスキング設定を環境変数から一元管理 ([#545](https://github.com/strands-agents/tools/pull/545))

**修正内容:**

`environment` ツールは `masked` プロパティを `inputSchema` に持ち、`list` および `get` アクションで `tool_input` から読み取っていました。`inputSchema` はエージェントがツールを呼び出す際のインターフェースであるため、エージェントが `masked=false` を渡すことで、オペレーターが設定した `ENV_VARS_MASKED_DEFAULT` を上書きして機密値を平文で取得できてしまう問題がありました。

- **修正前**: エージェントが `masked=false` を渡せば、環境変数の値がマスキングなしで返っていた
- **修正後**: マスキング設定は `ENV_VARS_MASKED_DEFAULT`（デフォルト `true`）のみから読み取られる。呼び出し側が `masked` を渡しても効果を持たない

**移行方法:**

```bash
# マスキングを無効化したい場合はオペレーター側で環境変数を設定
export ENV_VARS_MASKED_DEFAULT=false
```

これは `python_repl` が非対話モードを取得する方法（#541）と同じパターンに揃えたものです。

---

### use_aws の SSM Parameter Store / KMS レスポンスを保護 ([#520](https://github.com/strands-agents/tools/pull/520))

**修正内容:**

`use_aws` ツールから返される 2 つの AWS レスポンス形状 — SSM Parameter Store の読み取りと KMS の暗号鍵操作 — が、同意プロンプトも秘匿化もなくモデルコンテキストに機密値を渡していた問題を修正しました。

- **修正前**: `ssm:GetParameter` / `ssm:GetParameters` / `ssm:GetParametersByPath` および `kms:Decrypt` / `kms:GenerateDataKey` / `kms:GenerateDataKeyPair` のレスポンスがそのままモデルに渡っていた
- **修正後**: これらの操作にデフォルトで同意プロンプトが表示され、レスポンス値が秘匿化される

**設定:**

```bash
# 同意プロンプトをスキップしたい場合
export BYPASS_TOOL_CONSENT=true
# レスポンス内の機密値の秘匿化は BYPASS_TOOL_CONSENT に関係なく常に適用される
```

**ポイント:**
- `SENSITIVE_RESPONSE_KEYS` に `"plaintext"` と `"privatekeyplaintext"` を追加し、KMS の平文出力を秘匿化
- SSM の SecureString 値は汎用的な `Value` キー配下にあるため、`ssm` レスポンスに限定した `redact_ssm_parameter_values` ヘルパーで `Parameter.Value` および `Parameters[].Value` のみを対象に秘匿化
- IAM の最小権限設定が依然として一次的な制御であることに変わりはありません

## まとめ

このリリースは、Strands Tools を「SDK ネイティブでできることのラッパー集」から段階的に整理していく方向性を明確に示す非推奨リリースです。合計 14 個のツールに移行案内が付き、v0.9.0 でも動作は継続しますが、警告レベルが引き上げられます。加えて、`use_aws` の SSM / KMS レスポンスと `environment` ツールのマスキング設定に関するセキュリティ上の重要な修正が含まれるため、これらのツールを利用しているユーザーはアップグレードが推奨されます。
