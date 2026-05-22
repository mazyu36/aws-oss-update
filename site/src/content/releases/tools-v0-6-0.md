---
title: "Strands Tools v0.6.0 リリース解説"
version: "v0.6.0"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-05-21
summary: "calculator ツール・cron ツール・use_aws ツールにおけるセキュリティ強化、file_read の隠しディレクトリ除外修正、retrieve ツールでの全 RetrievalResultLocation 型サポートを含むリリースです。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.6.0"
---

## 概要

このリリースでは、calculator ツール・cron ツール・use_aws ツールに対する複数のセキュリティ強化が行われ、任意コード実行の防止や認証情報のリダクションが追加されました。また、file_read における隠しディレクトリのスキップ修正と、retrieve ツールにおける全ての RetrievalResultLocation 型のサポートが含まれています。

**リリース:** [v0.6.0](https://github.com/strands-agents/tools/releases/tag/v0.6.0)

## 新機能

### retrieve ツールで全ての RetrievalResultLocation 型をサポート ([#465](https://github.com/strands-agents/tools/pull/465))

**この機能でできること:**
- AWS Bedrock Knowledge Base API がサポートする全てのソース種別から、ドキュメント識別子を抽出して表示できるようになりました。
- これまで `customDocumentLocation` と `s3Location` のみ対応していた `format_results_for_display` 関数が、Kendra・Confluence・SharePoint・Salesforce・Web・SQL の各 Location 型にも対応します。

**使用例:**

```python
from strands import Agent
from strands_tools import retrieve

agent = Agent(tools=[retrieve])

# Knowledge Base から検索した結果が、各ソース種別ごとに正しい識別子で表示されます
response = agent("Search the knowledge base for information about deployment best practices")

# 各 Location 型のフィールドマッピング:
# - webLocation         → url
# - confluenceLocation  → url
# - salesforceLocation  → url
# - sharePointLocation  → url
# - kendraDocumentLocation → uri
# - sqlLocation         → query
# - s3Location          → uri (従来通り)
# - customDocumentLocation → id (従来通り)
```

**ポイント:**
- 修正前は対応外のソース種別では Document ID として "Unknown" が表示されていました
- 未知の Location 型に対するフォールバックも実装されているため、将来的な API 拡張にも安全に対応します

---

## バグ修正

### calculator ツールの任意コード実行防止 (parse_expr 制限) ([#466](https://github.com/strands-agents/tools/pull/466))

calculator ツールが LLM 制御の式文字列を `sympy.sympify()` に渡しており、内部的に Python の `eval()` が呼ばれるため、`__import__('os').system(...)` などのペイロードによる任意コード実行が可能でした。

**修正内容:**
- `sympify()` を `parse_expr` に置き換え、制限された名前空間で式を評価するように変更
- `local_dict`: 安全な数学関数・定数のアロウリスト（sin, cos, pi など）
- `global_dict`: `{"__builtins__": {}}` により `__import__`, `eval`, `exec`, `open` などへのアクセスを無効化
- `calculate_limit` および `calculate_series` の `point` パラメータにも同じ修正を適用

---

### calculator ツールの AST 検証追加 ([#473](https://github.com/strands-agents/tools/pull/473))

[#466](https://github.com/strands-agents/tools/pull/466) で `__builtins__` を空にしていましたが、ローカル名前空間に公開された関数オブジェクト（solve, simplify, N など）の `__globals__` を辿ることで `__builtins__['__import__']` に到達でき、依然として任意コード実行が可能でした。

**修正内容:**
- `parse_expr` 実行前に AST 検証を行い、許可されたノード種別（演算子・呼び出し・リテラル・名前・コンテナ）のみを通過させる
- 属性アクセス・添字アクセス・ラムダ・内包表記・import を全て拒否
- `det`, `transpose`, `trace` をスタンドアロン関数として追加し、メソッド形式の属性アクセスなしで行列操作を可能に

**破壊的変更（実用上の影響）:**

```python
# 修正前: 暗黙の乗算が許容されていた
"2x"        # → 2*x として解釈
"2sin(x)"   # → 2*sin(x) として解釈

# 修正後: 明示的な演算子が必須
"2*x"
"2*sin(x)"
```

```python
# 修正前: メソッド形式の行列操作が可能
"Matrix([[1,2],[3,4]]).det()"

# 修正後: 関数形式に変更
"det(Matrix([[1,2],[3,4]]))"
"transpose(Matrix([[1,2],[3,4]]))"
"trace(Matrix([[1,2],[3,4]]))"
"Matrix([[1,2],[3,4]])**(-1)"  # 逆行列は累乗演算子で
```

---

### cron ツールの consent ゲートと改行サニタイズ追加 ([#468](https://github.com/strands-agents/tools/pull/468))

cron ツールが LLM 提供のスケジュール・コマンド・raw エントリ文字列を、確認プロンプトなしかつ不完全な改行サニタイズで crontab に書き込んでいました。これにより永続的な cron ジョブのサイレントインストールや、改行インジェクションによる隠しエントリの混入が可能でした。

**修正内容:**
- shell・editor・file_write などの他ツールと同様の `BYPASS_TOOL_CONSENT` による consent ゲートを追加
- 共通の `_write_crontab` 関数を経由するように全ての変更パスを統一
- `_sanitize_cron_line` で全ての入力フィールド（schedule, command, description, raw command）に対して改行サニタイズを適用

**使用例:**

```python
import os
from strands import Agent
from strands_tools import cron

# 通常は cron ジョブの追加・編集時にユーザー確認が必要になります
agent = Agent(tools=[cron])
agent("Add a cron job to run backup.sh every day at 2am")

# CI/自動化環境では BYPASS_TOOL_CONSENT で確認をスキップできます
os.environ["BYPASS_TOOL_CONSENT"] = "true"
```

---

### use_aws レスポンスの認証情報リダクション ([#467](https://github.com/strands-agents/tools/pull/467))

`use_aws` ツールが boto3 のレスポンスをそのまま LLM コンテキストに返していたため、`sts.get_session_token`・`secretsmanager.get_secret_value`・`ecr.get_authorization_token` などの認証情報を返す読み取り操作が、会話履歴・テレメトリスパン・セッションストレージに認証情報を残す可能性がありました。

**修正内容:**
- 既知の認証情報キー（`SecretAccessKey`, `SessionToken`, `SecretString`, `authorizationToken`, `Password` など）を boto3 レスポンスから再帰的にリダクション
- リダクションは `BYPASS_TOOL_CONSENT` 設定時にも無条件で適用
- 認証情報を返す `(service, operation)` の組に対して、変更操作でなくても consent ゲートを発動

**使用例:**

```python
from strands import Agent
from strands_tools import use_aws

agent = Agent(tools=[use_aws])

# 認証情報を返す API を呼び出してもレスポンス上の機密値はリダクションされる
response = agent("Get the ECR authorization token for my account")
# - authorizationToken は "[REDACTED]" 等で置換された状態でコンテキストに残る
# - NextToken やページネーションフィールドはリダクション対象外（誤検知なし）
```

**ポイント:**
- shell アクセスを持つエージェントは `aws configure export-credentials` などで認証情報を取得できるため、本修正の主目的はアクセス制御ではなくデータハイジーン（ログ・コンテキストへの認証情報持続防止）です
- IAM の最小権限ポリシーに関するガイダンスがモジュール docstring に追加されました

---

### file_read における隠しディレクトリのスキップ ([#440](https://github.com/strands-agents/tools/pull/440))

`find_files()` が `os.walk()` で隠しファイルはフィルタしていたものの、隠しディレクトリはフィルタしていませんでした。このため `.venv`, `.git`, `.mypy_cache` などへの再帰が発生し、無関係な大量ファイルを収集してコンテキストウィンドウを圧迫していました。

**修正内容:**
- `os.walk` 中に `dirs` をインプレースで変更し、`.` で始まるディレクトリへの降下を抑止
- 既存の隠しファイルフィルタと整合する挙動

**修正効果:**

```text
修正前: 13,769 ファイル（97% が隠しディレクトリ由来）
修正後:  1,257 ファイル（隠しディレクトリはスキップ）
```

## まとめ

このリリースは calculator・cron・use_aws の各ツールに対する重要なセキュリティ強化が中心となっており、任意コード実行の防止や認証情報のリダクションが追加されました。retrieve ツールの Location 型対応拡張や file_read の挙動改善も含まれており、本番環境で Strands Tools を運用する全ユーザーにアップグレードが推奨されます。
