---
title: "Strands Tools v0.8.1 リリース解説"
version: "v0.8.1"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-06-16
summary: "code_interpreter のクロスアカウントアクセス対応、http_request のデフォルトタイムアウト追加、environment ツールの保護変数追加など、1 件の新機能と 2 件のバグ修正を含むリリースです。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.1"
---

## 概要

このリリースには 1 件の新機能と 2 件のバグ修正が含まれます。`AgentCoreCodeInterpreter` にカスタム boto3 セッションを渡せるようになり、クロスアカウントアクセスが可能になりました。また `http_request` ツールにデフォルトタイムアウトが追加されて応答のないサーバーで無限にブロックされる問題が解消され、`environment` ツールでは `STRANDS_NON_INTERACTIVE` が保護対象の環境変数に追加されました。

**リリース:** [v0.8.1](https://github.com/strands-agents/tools/releases/tag/v0.8.1)

## 新機能

### code_interpreter: カスタム boto3 セッションによるクロスアカウントアクセス対応 ([#496](https://github.com/strands-agents/tools/pull/496))

**この機能でできること:**

- `AgentCoreCodeInterpreter` の初期化時に `boto_session` パラメータを指定することで、独自の boto3 セッションを渡せるようになりました
- 別アカウントの認証情報や、AssumeRole で取得した一時クレデンシャルを使ってクロスアカウントで Bedrock AgentCore Code Interpreter を呼び出すユースケースに対応します

**使用例:**

```python
import boto3
from strands_tools.code_interpreter import AgentCoreCodeInterpreter

# 別アカウントの IAM ロールを AssumeRole して取得した一時クレデンシャルから boto3 セッションを作成
sts = boto3.client("sts")
credentials = sts.assume_role(
    RoleArn="arn:aws:iam::123456789012:role/CrossAccountCodeInterpreterRole",
    RoleSessionName="strands-tools-session",
)["Credentials"]

cross_account_session = boto3.Session(
    aws_access_key_id=credentials["AccessKeyId"],
    aws_secret_access_key=credentials["SecretAccessKey"],
    aws_session_token=credentials["SessionToken"],
    region_name="us-west-2",
)

# カスタムセッションを渡して AgentCoreCodeInterpreter を初期化
interpreter = AgentCoreCodeInterpreter(
    region="us-west-2",
    boto_session=cross_account_session,
)
```

**ポイント:**

- `boto_session` を指定しない（`None`）場合は、従来通りデフォルトのクレデンシャルチェーンが使われるため、既存コードへの影響はありません
- 渡された `boto3.Session` は、内部で生成される `BedrockAgentCoreCodeInterpreterClient` の `session` 引数として透過的に転送されます
- モジュールキャッシュ経由でセッションを再接続する `_ensure_session` のパスでも同じ `boto_session` が引き継がれるため、セッション永続化との組み合わせでもクロスアカウント認証が維持されます

---

## バグ修正

### http_request: 応答のないサーバーで無限にブロックされる問題を修正 ([#474](https://github.com/strands-agents/tools/pull/474))

`http_request` ツールはこれまで `session.request()` をタイムアウト指定なしで呼び出していました。Python の `requests` ライブラリはデフォルトでタイムアウトが無効のため、応答のないサーバーに対するリクエストでエージェントが永久にブロックされる可能性がありました。

このリリースで、リクエストのデフォルトタイムアウトとして 30 秒が設定されるようになりました。`TOOL_SPEC` の入力スキーマにも `timeout` パラメータが追加され、エージェントから個別のリクエストごとにタイムアウトを上書きできます。

**使用例:**

```python
from strands import Agent
from strands_tools import http_request

agent = Agent(tools=[http_request])

# デフォルトの 30 秒タイムアウトで実行
agent("Fetch https://example.com/api/data")

# エージェントから timeout を指定して上書きすることも可能
agent("Fetch https://slow.example.com/api/data with a 120 second timeout")
```

**ポイント:**

- デフォルトのタイムアウトは 30 秒で、業界標準的な値に揃えられています
- リクエスト単位で `timeout` パラメータを渡すことで、長時間の処理が必要な API には個別に大きな値を指定できます
- 応答するサーバーに対する既存の挙動は変わらず、応答しないサーバーに対してのみ 30 秒で `Timeout` 例外として扱われるようになります

---

### environment: STRANDS_NON_INTERACTIVE を保護対象に追加 ([#498](https://github.com/strands-agents/tools/pull/498))

`environment` ツールには、エージェント実行時に書き換えられると危険な環境変数を `PROTECTED_VARS` として列挙し、ランタイムでの上書きを拒否する仕組みがあります。これまでは `BYPASS_TOOL_CONSENT` は保護対象に含まれていたものの、同じく非対話モードを切り替える `STRANDS_NON_INTERACTIVE` は保護対象から漏れており、エージェント自身が `environment` ツール経由でこの値を変更できてしまう状態でした。

このリリースで `STRANDS_NON_INTERACTIVE` が `PROTECTED_VARS` に追加され、`BYPASS_TOOL_CONSENT` と同じ扱いになりました。`environment` ツール経由でこれらの変数を `set` / `delete` しようとするとエラーになります。

**ポイント:**

- 保護される変数は `PATH`、`PYTHONPATH`、`STRANDS_HOME`, `SHELL`、`USER`、`HOME`、`BYPASS_TOOL_CONSENT`、`STRANDS_NON_INTERACTIVE` の 8 つになりました
- エージェントが自分自身の動作モード（非対話 / 確認スキップ）を勝手に切り替えるのを防ぐ、防御的な変更です
- これらの変数を変更したい場合は、エージェントを起動する側のプロセスで OS の環境変数として設定する必要があります

## まとめ

`code_interpreter` のクロスアカウント対応によって、複数アカウントを跨ぐエンタープライズ環境での運用がしやすくなりました。`http_request` のタイムアウト追加と `environment` の保護変数強化は、エージェント実行時の信頼性とセキュリティを地味ながら底上げする修正です。
