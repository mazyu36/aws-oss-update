---
title: "tools v0.3.0"
version: "v0.3.0"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2026-03-26
summary: "http_request ツールのセキュリティ強化、Code Interpreter のセッションタイムアウト設定、X402 プロトコルサポートが追加されました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.3.0"
---

## 概要

Strands Agents Tools v0.3.0 では、http_request ツールのセキュリティが大幅に強化されました。SSL 検証の無効化がオプトイン方式になり、認証トークンの環境変数もドメインスコープの許可リスト方式に変更されています。また、Code Interpreter のセッションタイムアウト設定と X402 プロトコルのサポートが追加されました。

**リリース:** [v0.3.0](https://github.com/strands-agents/tools/releases/tag/v0.3.0)

## 新機能

### SSL 検証無効化のオプトイン化 ([#425](https://github.com/strands-agents/tools/pull/425))

**この機能でできること:**
- `verify_ssl=False` の使用が環境変数による明示的なオプトインに変更されました
- これにより、エージェントが暗黙的に SSL 検証を無効化することを防ぎ、セキュリティが向上します

**使用例:**

```python
import os
from strands import Agent
from strands_tools import http_request

# SSL 検証の無効化を許可する場合、環境変数を設定
os.environ["STRANDS_HTTP_ALLOW_INSECURE_SSL"] = "true"

agent = Agent(tools=[http_request])

# 自己署名証明書を使用する内部サーバーへのリクエスト
result = agent("https://internal-server.local/api/data へアクセスして（SSL検証を無効化）")
```

**ポイント:**
- 環境変数 `STRANDS_HTTP_ALLOW_INSECURE_SSL=true` が設定されていない状態で `verify_ssl=False` を使用するとエラーになります
- 自己署名証明書を使用する内部環境など、本当に必要な場合のみ使用してください

---

### Code Interpreter セッションタイムアウト設定 ([#418](https://github.com/strands-agents/tools/pull/418))

**この機能でできること:**
- AgentCoreCodeInterpreter のセッションタイムアウトを設定できるようになりました
- 長時間実行されるエージェントでセッションが切断される問題を解決できます

**使用例:**

```python
from strands import Agent
from strands_tools import AgentCoreCodeInterpreter

# セッションタイムアウトを30分に設定（デフォルトは15分）
code_interpreter = AgentCoreCodeInterpreter(session_timeout_seconds=1800)

agent = Agent(tools=[code_interpreter])

# 長時間のデータ処理タスク
result = agent("大規模なデータセットを分析して、処理に時間がかかっても構いません")
```

**ポイント:**
- デフォルト値は 900 秒（15 分）です
- 長時間実行されるエージェントセッションでは、より長いタイムアウトを設定することをお勧めします

---

### X402 プロトコルの payment-required ヘッダーサポート ([#423](https://github.com/strands-agents/tools/pull/423))

**この機能でできること:**
- http_request ツールが X402 プロトコルの `payment-required` ヘッダーをレスポンスに含めるようになりました
- ペイウォール付きリソースへのアクセスで、支払い情報を呼び出し元に伝達できます

**使用例:**

```python
from strands import Agent
from strands_tools import http_request

agent = Agent(tools=[http_request])

# ペイウォール付きエンドポイントにアクセス
response = agent("https://api.example.com/premium-content へアクセス")

# レスポンスに payment-required ヘッダーが含まれている場合、
# 呼び出し元が支払い処理を行ってコンテンツにアクセス可能
```

**ポイント:**
- X402 プロトコルを使用する API との統合に役立ちます
- `payment-required` ヘッダーはレスポンスの重要なヘッダーとして自動的に含まれます

## バグ修正

### auth_env_var のドメインスコープ許可リスト ([#424](https://github.com/strands-agents/tools/pull/424))

- http_request ツールの `auth_env_var` パラメータにドメインスコープの許可リストが導入されました
- 環境変数から認証トークンを使用する際、明示的にドメインを登録する必要があります
- セキュリティが向上し、意図しないドメインへのトークン漏洩を防止します

**設定例:**

```python
from strands_tools.http_request import HTTP_REQUEST_TOKEN_CONFIG

# GitHub API へのトークン使用を許可
HTTP_REQUEST_TOKEN_CONFIG["GITHUB_TOKEN"] = ["api.github.com"]

# GitLab API へのトークン使用を許可
HTTP_REQUEST_TOKEN_CONFIG["GITLAB_TOKEN"] = ["gitlab.com"]
```

**ポイント:**
- 登録されていないドメインへのリクエストでは `auth_env_var` は使用されません
- より柔軟な制御が必要な場合は、Hooks を使用して `BeforeToolCallEvent` でトークンを注入できます

---

### 認証トークン解決時の info レベルログ出力 ([#428](https://github.com/strands-agents/tools/pull/428))

- `auth_env_var` から認証トークンが正常に解決された際に、info レベルのログが出力されるようになりました
- ログには環境変数名と対象ドメインが含まれ、トークン解決の可視性が向上します
- http_request ツールにモジュールレベルのロガーが追加され、他のツールと一貫性が取れました

---

## まとめ

v0.3.0 は http_request ツールのセキュリティを大幅に強化したリリースです。SSL 検証の無効化と認証トークンの使用がオプトイン方式に変更され、エージェントが暗黙的にセキュリティ設定を変更することを防ぎます。また、Code Interpreter のセッションタイムアウト設定により、長時間実行されるタスクの信頼性が向上しました。
