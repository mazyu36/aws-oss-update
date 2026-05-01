---
title: "bedrock-agentcore-sdk-python v0.1.0"
version: "v0.1.0"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-07-16
summary: "Bedrock AgentCore Python SDK の初回リリース。AI エージェントのランタイムフレームワーク、会話管理のためのメモリクライアント、OAuth2 / API キー認証デコレータ、Browser / Code Interpreter ツール統合を提供。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.0"
---

## 概要

Bedrock AgentCore Python SDK の初回リリースです。このSDKは、AWS Bedrock 上で AI エージェントを構築するための包括的なフレームワークを提供します。ランタイム実行環境、会話履歴の管理、認証機能、ツール統合など、エージェント開発に必要な基本機能が含まれています。

**リリース:** [v0.1.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.0)

## 新機能

### AI エージェントのランタイムフレームワーク ([#1](https://github.com/aws/bedrock-agentcore-sdk-python/pull/1))

**この機能でできること:**
- AI エージェントの実行環境を構築するためのランタイムフレームワークが提供されます。FastAPI ベースのアプリケーションとして、エージェントのエンドポイントを簡単にデプロイできます。

**使用例:**

```python
from bedrock_agentcore.runtime import AgentApp
from bedrock_agentcore.runtime import AgentRequest, AgentResponse

# エージェントアプリケーションを作成
app = AgentApp()

@app.agent()
def my_agent(request: AgentRequest) -> AgentResponse:
    """シンプルなエージェント実装"""
    user_input = request.input_text

    # エージェントのロジックを実装
    response_text = f"あなたの入力: {user_input}"

    return AgentResponse(
        output_text=response_text
    )

# アプリケーションを起動
# uvicorn main:app --reload
```

**ポイント:**
- FastAPI と統合されており、REST API として簡単にデプロイできます
- 非同期処理をサポートしており、高スループットなエージェントを構築できます
- リクエストコンテキストを通じて、セッション情報やメタデータにアクセスできます

---

### メモリクライアントによる会話管理 ([#1](https://github.com/aws/bedrock-agentcore-sdk-python/pull/1))

**この機能でできること:**
- Bedrock のメモリサービスを使用して、会話履歴を永続化し管理できます。セッションごとに会話コンテキストを保存し、後から取得できます。

**使用例:**

```python
from bedrock_agentcore.memory import MemoryClient

# メモリクライアントを作成
memory_client = MemoryClient(
    region_name="us-east-1",
    memory_id="my-agent-memory-id"
)

# 会話ターンを追加
memory_client.add_turn(
    session_id="user-session-123",
    user_message="こんにちは、天気はどうですか?",
    assistant_message="今日は晴れです。気温は25度です。"
)

# 過去の会話を取得
turns = memory_client.get_last_k_turns(
    session_id="user-session-123",
    k=5  # 最新5ターンを取得
)

for turn in turns:
    print(f"User: {turn.user_message}")
    print(f"Assistant: {turn.assistant_message}")
```

**ポイント:**
- セッション ID ごとに会話履歴を分離して管理できます
- ネームスペースを使用して、異なるコンテキストを分けて保存できます
- メタデータを付加して、会話に追加情報を含められます

---

### OAuth2 と API キー認証デコレータ ([#1](https://github.com/aws/bedrock-agentcore-sdk-python/pull/1))

**この機能でできること:**
- エージェントのエンドポイントに認証機能を簡単に追加できます。OAuth2 や API キーベースの認証をデコレータで実装できます。

**使用例:**

```python
from bedrock_agentcore.identity import requires_oauth2_token, requires_api_key
from bedrock_agentcore.runtime import AgentApp, AgentRequest, AgentResponse

app = AgentApp()

# OAuth2 トークン認証が必要なエージェント
@app.agent()
@requires_oauth2_token(
    resource_name="my-api-resource",
    scopes=["read", "write"]
)
def secure_agent(request: AgentRequest) -> AgentResponse:
    # 認証されたユーザーのみがアクセス可能
    return AgentResponse(
        output_text="セキュアなレスポンス"
    )

# API キー認証が必要なエージェント
@app.agent()
@requires_api_key()
def api_key_agent(request: AgentRequest) -> AgentResponse:
    # API キーを持つクライアントのみがアクセス可能
    return AgentResponse(
        output_text="API キー認証済み"
    )
```

**ポイント:**
- AWS のワークロードアイデンティティと統合されています
- デコレータを使用することで、認証ロジックをビジネスロジックから分離できます
- OAuth2 の 3-legged フローをサポートしています

---

### Browser と Code Interpreter ツール統合 ([#1](https://github.com/aws/bedrock-agentcore-sdk-python/pull/1))

**この機能でできること:**
- Bedrock の Browser ツールと Code Interpreter ツールをエージェントに統合できます。これにより、エージェントが Web ブラウジングやコード実行を行えるようになります。

**使用例:**

```python
from bedrock_agentcore.tools import BrowserClient, CodeInterpreterClient
from bedrock_agentcore.runtime import AgentApp, AgentRequest, AgentResponse

app = AgentApp()

# Browser クライアントを作成
browser = BrowserClient(region_name="us-east-1")

# Code Interpreter クライアントを作成
code_interpreter = CodeInterpreterClient(region_name="us-east-1")

@app.agent()
def research_agent(request: AgentRequest) -> AgentResponse:
    # Web ページを取得
    page_content = browser.get_page("https://example.com")

    # Python コードを実行
    result = code_interpreter.execute_code(
        code="import pandas as pd; df = pd.DataFrame({'a': [1, 2, 3]}); df.sum()"
    )

    return AgentResponse(
        output_text=f"ページ内容: {page_content}, 計算結果: {result}"
    )
```

**ポイント:**
- Browser ツールは、動的な Web コンテンツの取得とスクレイピングをサポートします
- Code Interpreter は、サンドボックス環境で Python コードを安全に実行できます
- 両ツールとも AWS の管理サービスとして提供され、スケーラビリティと信頼性が確保されています

---

## セキュリティ

### TLS 1.2+ の強制 ([#1](https://github.com/aws/bedrock-agentcore-sdk-python/pull/1))

- すべての通信で TLS 1.2 以上が強制されます。データの暗号化とセキュリティが確保されます。

### AWS SigV4 署名による API 認証 ([#1](https://github.com/aws/bedrock-agentcore-sdk-python/pull/1))

- AWS の標準的な SigV4 署名メカニズムを使用して、API リクエストが認証されます。

### AWS 認証情報チェーンによる安全な認証情報管理 ([#1](https://github.com/aws/bedrock-agentcore-sdk-python/pull/1))

- 環境変数、IAM ロール、認証情報ファイルなど、AWS の標準的な認証情報チェーンを通じて認証情報が管理されます。

---

## まとめ

Bedrock AgentCore Python SDK v0.1.0 は、AWS Bedrock 上で AI エージェントを構築するための包括的なフレームワークを提供する初回リリースです。ランタイム環境、会話管理、認証機能、ツール統合など、エージェント開発に必要な基本機能が揃っており、エンタープライズグレードのセキュリティとスケーラビリティを備えています。
