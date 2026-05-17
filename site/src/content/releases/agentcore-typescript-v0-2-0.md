---
title: "AgentCore TypeScript SDK v0.2.0 リリース解説"
version: "v0.2.0"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-01-22
summary: "Runtime SDK と Identity SDK が追加され、AgentCore Runtime 準拠のサーバー構築や OAuth2 M2M フローによる認証管理が可能になりました。また、Code Interpreter のバグ修正も含まれています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.2.0"
---

## 概要

このリリースでは、**Runtime SDK** と **Identity SDK** という2つの重要な新機能が追加されました。これにより、AgentCore Runtime 準拠のサーバー構築や、OAuth2 M2M フローを使用した認証管理が可能になります。また、Code Interpreter の `listFiles` コマンドのバグ修正も含まれています。

**リリース:** [v0.2.0](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.2.0)

## 新機能

### Bedrock AgentCore Runtime と Identity プリミティブの追加 ([#45](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/45))

**この機能でできること:**
- **Runtime SDK**: AgentCore Runtime 準拠のサーバーを構築し、リクエストパース、ストリーミングレスポンス、セッション管理を実装できます
- **Identity SDK**: OAuth2 M2M フローによる認証、API キー管理、ワークロード ID 処理を行えます
- **WebSocket サポート**: リアルタイムエージェント通信のための WebSocket 接続処理
- **ヘルスチェック**: カスタムステータスレポート機能付きの動的ヘルスチェックシステム

**Runtime SDK の使用例:**

```typescript
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime';

// AgentCore Runtime 準拠のサーバーを作成
const app = new BedrockAgentCoreApp({
  name: 'my-agent',
  version: '1.0.0',
});

// エージェントハンドラーを登録
app.agent(async (request, context) => {
  const { prompt, sessionId } = request;

  // エージェントのロジックを実装
  return {
    response: `処理結果: ${prompt}`,
    sessionId,
  };
});

// サーバーを起動
await app.listen({ port: 3000 });
```

**Identity SDK の使用例:**

```typescript
import { IdentityClient, getWorkloadIdentity } from 'bedrock-agentcore/identity';

// Identity クライアントを初期化
const identityClient = new IdentityClient({
  region: 'us-east-1',
});

// ワークロード ID を取得
const workloadIdentity = await getWorkloadIdentity();

// OAuth2 M2M フローでトークンを取得
const tokenResponse = await identityClient.getAccessToken({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  scope: 'bedrock:agent:invoke',
});

console.log('Access Token:', tokenResponse.accessToken);
```

**ポイント:**
- Runtime SDK は Fastify ロガーと統合されたリクエストスコープのロギングをサポート
- Identity SDK は API キー管理とワークロード ID 処理の両方に対応
- 331 件のユニットテストと 111 件の統合テストで検証済み

---

## バグ修正

### サンプルの信頼性向上とトークン使用量の削減 ([#23](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/23))
- サンプルコードでのレートリミットエラーとトークンエラーを修正
- `agent-with-browser.ts` と `agent-with-code-interpreter.ts` の例が改善され、より安定して動作するようになりました

### Code Interpreter の listFiles コマンドのパラメータ修正 ([#44](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/44))
- `listFiles` コマンドで使用されていたパラメータ名 `path` を、AWS Bedrock AgentCore API の仕様に準拠した `directoryPath` に修正
- Python SDK の実装および AWS API 仕様との整合性が取れるようになりました

## まとめ

v0.2.0 は Runtime SDK と Identity SDK の追加により、AgentCore を使用した本格的なエージェントサーバーの構築が可能になる重要なリリースです。Code Interpreter のバグ修正も含まれており、より安定した開発体験を提供します。
