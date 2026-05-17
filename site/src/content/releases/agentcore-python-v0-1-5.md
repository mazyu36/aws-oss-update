---
title: "AgentCore Python SDK v0.1.5 リリース解説"
version: "v0.1.5"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2025-09-24
summary: "run メソッドへの kwargs サポート追加により Uvicorn の柔軟な設定が可能に。リクエストヘッダーの許可リスト機能により、カスタムヘッダーを安全にエージェントに渡せるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.5"
---

## 概要

このリリースでは、`run` メソッドに任意の引数を渡せるようになり、Uvicorn サーバーのカスタマイズが容易になりました。また、リクエストヘッダーの許可リスト機能が追加され、認証情報やカスタムヘッダーを安全にエージェントコンテキストで利用できるようになりました。

**リリース:** [v0.1.5](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.5)

## 新機能

### run メソッドへの kwargs サポート ([#79](https://github.com/aws/bedrock-agentcore-sdk-python/pull/79))

**この機能でできること:**
- `BedrockAgentCoreApp.run()` メソッドに任意のキーワード引数を渡せるようになり、これらは直接 `uvicorn.run()` に渡されます。これにより、ロギング設定、ワーカー数、リロードモードなど、Uvicorn のあらゆる設定をカスタマイズできます。

**使用例:**

```python
from bedrock_agentcore import BedrockAgentCoreApp

app = BedrockAgentCoreApp()

# カスタムロギング設定
app.run(port=8080, log_config=custom_log_config)

# 開発モードで自動リロード有効化
app.run(port=8080, reload=True)

# 本番環境で複数ワーカーを起動
app.run(port=8080, workers=4)
```

**ポイント:**
- Uvicorn がサポートする任意のパラメータを `run` メソッドに渡すことができます。
- 開発時には `reload=True`、本番環境では `workers` を指定するなど、環境に応じた柔軟な設定が可能です。
- これまではポートとホストのみ指定可能でしたが、この変更により Uvicorn の全機能にアクセスできるようになりました。

---

### リクエストヘッダー許可リスト機能 ([#93](https://github.com/aws/bedrock-agentcore-sdk-python/pull/93))

**この機能でできること:**
- Bedrock AgentCore Runtime の最新リリースでサポートされたリクエストヘッダー許可リスト機能に対応しました。特定のパターンに一致するリクエストヘッダー（`Authorization` や `X-Amzn-Bedrock-AgentCore-Runtime-Custom-*` など）が自動的に抽出され、`RequestContext` を通じてエージェントで利用できるようになります。

**使用例:**

```python
from bedrock_agentcore import BedrockAgentCoreApp
from bedrock_agentcore.runtime.context import RequestContext

app = BedrockAgentCoreApp()

@app.entrypoint
def agent_invocation(payload, context: RequestContext):
    """エージェント呼び出しハンドラー"""
    user_message = payload.get(
        "prompt",
        "No prompt found in input"
    )

    # リクエストコンテキストから情報を取得
    print(f"Session ID: {context.session_id}")
    print(f"Request Headers: {context.request_headers}")

    # カスタムヘッダーの利用
    auth_header = context.request_headers.get("Authorization")
    custom_header = context.request_headers.get(
        "X-Amzn-Bedrock-AgentCore-Runtime-Custom-UserId"
    )

    app.logger.info(f"Processing request with session: {context.session_id}")

    response = process_user_message(user_message)
    return response
```

**ポイント:**
- 許可されるヘッダーパターンは `^(Authorization|X-Amzn-Bedrock-AgentCore-Runtime-Custom-[a-zA-Z0-9_-]+)$` です。
- `Authorization` ヘッダーにより、エージェント内でユーザー認証情報を利用できます。
- カスタムヘッダー（`X-Amzn-Bedrock-AgentCore-Runtime-Custom-` プレフィックス）を使用して、ユーザー ID やセッション情報などの任意のメタデータを渡せます。
- セキュリティを考慮した設計で、許可されたパターンに一致するヘッダーのみが抽出されます。
- この機能は [Bedrock AgentCore Starter Toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit/pull/189) とも連携しています。

---

## まとめ

v0.1.5 では、`run` メソッドの柔軟性向上により開発・運用環境に応じた細かな設定が可能になり、リクエストヘッダー許可リスト機能により認証やカスタムメタデータの安全な受け渡しが実現されました。これらの機能により、Bedrock AgentCore を使用したエージェント開発がより柔軟かつセキュアになりました。
