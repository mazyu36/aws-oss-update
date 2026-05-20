---
title: "AgentCore Python SDK v1.10.0 リリース解説"
version: "v1.10.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-05-19
summary: "カスタムリクエストヘッダーの転送機能が拡張され、ランタイムの allowlist ルールに沿った任意のヘッダーを Agent コードに転送できるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.10.0"
---

## 概要

このリリースでは、`BedrockAgentCoreApp`、`BedrockCallContextBuilder` (A2A)、`AGUIApp` におけるカスタムリクエストヘッダーの転送機能が拡張されました。これまでは `Authorization` と `X-Amzn-Bedrock-AgentCore-Runtime-Custom-` プレフィックスを持つヘッダーのみが転送されていましたが、ランタイムサービスの allowlist ルールに沿った任意のカスタムヘッダー（`X-Api-Key`、`X-Custom-Signature` など）を転送できるようになりました。

**リリース:** [v1.10.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.10.0)

## 新機能

### カスタムリクエストヘッダーの転送をランタイム allowlist に合わせて拡張 ([#483](https://github.com/aws/bedrock-agentcore-sdk-python/pull/483))

**この機能でできること:**
- Agent コードに転送できるカスタムヘッダーが、`X-Amzn-Bedrock-AgentCore-Runtime-Custom-` プレフィックス付きのヘッダーに限定されなくなりました
- `X-Api-Key`、`X-Custom-Signature` といった任意のカスタムヘッダーをコンテナ側の Agent コードで受け取れるようになります
- 転送可否は AgentCore ランタイムの header allowlist ルールに従います（`models.py` に定義された `RESTRICTED_HEADERS` および `is_forwardable_header()` で判定）

**Allowlist のルール:**
- `RESTRICTED_HEADERS`（認証・認可、コンテンツネゴシエーション、キャッシュ、CORS、CDN/プロキシ、HTTP/2 擬似ヘッダー、WebSocket ヘッダーなど）に含まれるヘッダーはブロック
- `x-amz-` プレフィックスのヘッダーはブロック（AWS SigV4 署名で予約されているため）
- `x-amzn-` プレフィックスのヘッダーは、レガシーの `X-Amzn-Bedrock-AgentCore-Runtime-Custom-` プレフィックスを除いてブロック
- 上記以外のすべてのヘッダーは Agent コードに転送される

**使用例:**

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.runtime.context import BedrockAgentCoreContext

app = BedrockAgentCoreApp()


@app.entrypoint
def handler(request):
    # クライアントから送信された任意のカスタムヘッダーを取得できる
    headers = BedrockAgentCoreContext.get_request_headers() or {}

    # v1.9.x 以前は X-Amzn-Bedrock-AgentCore-Runtime-Custom- プレフィックス付きでないと取得できなかった
    # v1.10.0 以降は allowlist ルールを満たす任意のヘッダーが取得可能
    api_key = headers.get("X-Api-Key")
    signature = headers.get("X-Custom-Signature")

    # Authorization は従来どおり転送される（HTTP/2 の小文字化を考慮して正規化される）
    auth = headers.get("Authorization")

    return {
        "api_key_present": api_key is not None,
        "signature_present": signature is not None,
        "auth_present": auth is not None,
    }


app.run()
```

**ポイント:**
- 関連 Issue: [#468](https://github.com/aws/bedrock-agentcore-sdk-python/issues/468)
- ランタイムサービス側ではすでに任意ヘッダーの転送がサポートされていましたが、SDK 側で `X-Amzn-Bedrock-AgentCore-Runtime-Custom-` プレフィックス以外のヘッダーが落とされていたため、それを修正したものです
- `Authorization` ヘッダーは HTTP/2 では小文字化される一方、HTTP/1.1 では大文字小文字が混在する可能性があるため、正規化キー (`Authorization`) で取得できるよう統一されています
- ブロック対象のヘッダーは AgentCore ランタイムの公式ドキュメント [Runtime header allowlist](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-header-allowlist.html) に基づいています
- 既存の `X-Amzn-Bedrock-AgentCore-Runtime-Custom-` プレフィックス付きヘッダーは引き続き転送されるため、後方互換性は維持されます

## まとめ

このリリースでは、カスタムリクエストヘッダーの転送機能が AgentCore ランタイムの allowlist ルールに合わせて拡張されました。これにより、API キーや独自署名ヘッダーなど、より柔軟な認証・連携パターンを Agent 実装で扱えるようになります。
