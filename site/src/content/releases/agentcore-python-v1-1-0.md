---
title: "bedrock-agentcore-sdk-python v1.1.0"
version: "v1.1.0"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-12-02
summary: "双方向ストリーミング機能の追加、ミドルウェアデータサポートの強化、WebSocket 依存関係の改善を含む機能更新"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.0"
---

## 概要

このリリースでは、双方向ストリーミングのサポートが追加され、リアルタイムでのエージェント通信が可能になりました。また、ミドルウェアからハンドラーへのデータ受け渡しが簡素化され、WebSocket デコレータの依存関係が改善されています。

**リリース:** [v1.1.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.0)

## 新機能

### 双方向ストリーミングのサポート ([#180](https://github.com/aws/bedrock-agentcore-sdk-python/pull/180))

**この機能でできること:**
- Agent Core Runtime Client を使用して、双方向のストリーミング通信が可能になりました。クライアントとエージェント間でリアルタイムにデータをやり取りできます。

**使用例:**

```python
from bedrock_agentcore.runtime import AgentCoreRuntimeClient

# クライアントの初期化
client = AgentCoreRuntimeClient(
    agent_id="your-agent-id",
    region_name="us-east-1"
)

# 双方向ストリーミングセッションの開始
async with client.start_bidirectional_stream() as stream:
    # メッセージの送信
    await stream.send_message({
        "type": "user_input",
        "content": "Hello, agent!"
    })

    # レスポンスの受信
    async for message in stream:
        print(f"Received: {message}")
```

**ポイント:**
- WebSocket ベースの通信により、低レイテンシーでの双方向通信を実現します
- `@app.websocket` デコレータを使用してエージェント側の WebSocket エンドポイントを定義できます

---

### ミドルウェアデータのリクエストコンテキストサポート ([#178](https://github.com/aws/bedrock-agentcore-sdk-python/pull/178))

**この機能でできること:**
- ミドルウェアで設定したデータを、ハンドラーの `context.processing_data` から直接アクセスできるようになりました。これにより、認証情報やメタデータなどをハンドラーに簡単に渡せます。

**使用例:**

```python
from bedrock_agentcore.runtime import AgentCoreApp
from starlette.middleware.base import BaseHTTPMiddleware

app = AgentCoreApp()

# ミドルウェアでデータを設定
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # 認証処理後、ユーザー情報を設定
        request.state.processing_data = {
            'user_id': 'alice',
            'role': 'admin',
            'timestamp': '2025-12-02T10:00:00Z'
        }
        response = await call_next(request)
        return response

app.add_middleware(AuthMiddleware)

# ハンドラーでデータにアクセス
@app.action(actionGroupName="UserActions", actionName="GetUserInfo")
def get_user_info(event, context):
    # ミドルウェアで設定したデータを取得
    user_id = context.processing_data.get('user_id')
    role = context.processing_data.get('role')

    return {
        "message": f"User {user_id} with role {role}"
    }
```

**ポイント:**
- `RequestContext` に `processing_data` フィールドが追加されました
- 後方互換性があり、既存のコードに影響を与えません
- ミドルウェアとハンドラー間のデータ受け渡しが統一的な方法で実現できます

---

### WebSocket 依存関係のメイン依存関係への追加 ([#181](https://github.com/aws/bedrock-agentcore-sdk-python/pull/181))

**この機能でできること:**
- `@app.websocket` デコレータを使用する際に、`websockets` ライブラリが自動的にインストールされるようになりました。これにより、WebSocket 機能を使用する際の設定が簡素化されます。

**使用例:**

```python
from bedrock_agentcore.runtime import AgentCoreApp

app = AgentCoreApp()

# WebSocket エンドポイントの定義（追加の依存関係インストール不要）
@app.websocket("/ws")
async def websocket_endpoint(websocket):
    await websocket.accept()

    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Echo: {data}")
```

**ポイント:**
- `pip install bedrock-agentcore` だけで WebSocket 機能が利用可能になります
- "No supported WebSocket library detected" 警告が表示されなくなります
- 開発依存関係からメイン依存関係に移動したことで、本番環境での使用がより安定します

## まとめ

このリリースでは、双方向ストリーミング機能の追加により、よりインタラクティブなエージェント体験が可能になりました。また、ミドルウェアとハンドラー間のデータ受け渡しが改善され、より柔軟なアプリケーション設計が実現できます。
