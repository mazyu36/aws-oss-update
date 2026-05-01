---
title: "bedrock-agentcore-sdk-python v0.1.4"
version: "v0.1.4"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-09-17
summary: "CodeInterpreter のカスタム認証情報管理サポート、AWS Lambda 互換 JSON ロギング実装、boto3 タイムスタンプ解像度問題の修正など、認証管理の柔軟性向上とロギングの改善が含まれるリリース。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.4"
---

## 概要

Bedrock AgentCore SDK Python v0.1.4 では、CodeInterpreter にカスタム認証情報管理機能が追加され、AWS Lambda 互換の JSON ロギング形式が実装されました。また、boto3 のタイムスタンプ解像度に関する重要なバグ修正が含まれています。これらの変更により、エンタープライズアプリケーションでの認証管理の柔軟性が向上し、ロガー出力の構造化が実現されました。

**リリース:** [v0.1.4](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.4)

## 新機能

### CodeInterpreter にカスタムセッションパラメータを追加 ([#41](https://github.com/aws/bedrock-agentcore-sdk-python/pull/41))

**この機能でできること:**
- CodeInterpreter のコンストラクタにオプションの boto3.Session パラメータを渡せるようになりました。これにより、カスタム認証情報設定、ロールの引き受け、クロスアカウントアクセスが可能になります。既存の実装との完全な下位互換性を維持しています。

**使用例:**

```python
import boto3
from bedrock_agentcore.tools import CodeInterpreter

# カスタム認証情報で Session を作成
session = boto3.Session(
    aws_access_key_id='YOUR_ACCESS_KEY',
    aws_secret_access_key='YOUR_SECRET_KEY',
    region_name='us-east-1'
)

# カスタムセッションで CodeInterpreter を初期化
code_interpreter = CodeInterpreter(session=session)

# または、ロールを引き受けたセッションを使用
sts = boto3.client('sts')
assumed_role = sts.assume_role(
    RoleArn='arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME',
    RoleSessionName='code-interpreter-session'
)

credentials = assumed_role['Credentials']
assumed_session = boto3.Session(
    aws_access_key_id=credentials['AccessKeyId'],
    aws_secret_access_key=credentials['SecretAccessKey'],
    aws_session_token=credentials['SessionToken'],
    region_name='us-east-1'
)

code_interpreter_with_role = CodeInterpreter(session=assumed_session)
```

**ポイント:**
- マルチテナントアプリケーションでの動的なロール切り替えが可能
- 環境変数を超えたカスタム認証情報設定に対応
- コンテナ環境での一時的な認証情報管理が容易
- モックセッションを使用したテストシナリオをサポート
- デフォルトの動作は変更されず、session パラメータが提供された場合のみ新機能が有効

---

### AWS Lambda 互換 JSON ロギングの実装 ([#76](https://github.com/aws/bedrock-agentcore-sdk-python/pull/76))

**この機能でできること:**
- テキストベースのロギングから AWS Lambda 互換の JSON 形式に変更されました。構造化されたフィールド（timestamp、level、message、logger、requestId、sessionId）が追加され、例外ログには errorType、errorMessage、stackTrace、location が含まれるようになりました。

**使用例:**

```python
from bedrock_agentcore.runtime import App
from bedrock_agentcore.hooks import HookProvider, AfterModelCallEvent

# ロギングは自動的に JSON 形式で出力されます
app = App()

@app.agent_invocation()
def agent_handler(event):
    # 通常のログは JSON 形式で出力
    # {"timestamp": "2025-09-11T05:24:34.141Z", "level": "INFO",
    #  "message": "response was: Hello!", "logger": "bedrock_agentcore.app",
    #  "requestId": "b6d04912-c263-44c4-b7df-df68dfcabed0",
    #  "sessionId": "e5c9630c-16c5-49e9-9e78-b550ac177aa1"}
    return "Hello!"

# 例外も構造化された形式でログに記録されます
@app.agent_invocation()
def failing_handler(event):
    raise RuntimeError("Agent processing failed: testing")
    # {"timestamp": "2025-09-11T05:30:55.477Z", "level": "ERROR",
    #  "message": "Handler 'agent_invocation' execution failed",
    #  "logger": "bedrock_agentcore.app",
    #  "errorType": "RuntimeError",
    #  "errorMessage": "Agent processing failed: testing",
    #  "stackTrace": [...],
    #  "location": "/path/to/file.py:function:line"}
```

**ポイント:**
- CloudWatch Logs Insights でのクエリが容易になりました
- 例外ログには完全なスタックトレースと発生場所が含まれます
- requestId と sessionId が利用可能な場合はログに自動的に含まれます
- 全 400 ユニットテストがパスし、JSON 構造が AWS Lambda 仕様に準拠

---

## バグ修正

### boto3 タイムスタンプ解像度の修正 ([#83](https://github.com/aws/bedrock-agentcore-sdk-python/pull/83))
- ツールイベントのタイムスタンプが重複し、Converse API で toolUse と toolResult が順不同になる問題を修正しました。boto3 クライアントがタイムスタンプを 1 秒解像度でしか解決しないため、タイムスタンプカウンターを 1 秒単位で増分するように変更しました。
- この修正により、Strands と Bedrock AgentCore Memory の統合で発生していた ValidationException が解消されました。
- 問題のあるスクリプトを 10 回連続で実行してもエラーが発生しないことを確認済みです。

---

## まとめ

v0.1.4 は、認証管理の柔軟性とロギングの改善に焦点を当てたリリースです。CodeInterpreter のカスタムセッション対応により、エンタープライズアプリケーションでの使用が容易になり、JSON ロギングにより運用時の監視とトラブルシューティングが改善されました。また、タイムスタンプの重複問題の修正により、ツール使用時の信頼性が向上しています。
