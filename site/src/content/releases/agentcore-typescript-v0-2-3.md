---
title: "AgentCore TypeScript SDK v0.2.3 リリース解説"
version: "v0.2.3"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-04-30
summary: "BrowserLiveView の複数インスタンスサポート、on-behalf-of トークン交換機能の追加、SSE ストリーミングレスポンスとヘルスチェックのバグ修正が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.2.3"
---

## 概要

このリリースでは、BrowserLiveView コンポーネントで同一ページに複数インスタンスを表示できるようになり、OAuth2 で on-behalf-of トークン交換がサポートされました。また、SSE ストリーミングレスポンス時のエラーハンドリングとヘルスチェックエンドポイントのタイムスタンプ形式に関するバグが修正されています。

**リリース:** [v0.2.3](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.2.3)

## 新機能

### BrowserLiveView の複数インスタンスサポート ([#97](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/97))

**この機能でできること:**
- 同一ページ上で複数の `BrowserLiveView` コンポーネントを同時に表示できるようになりました。各インスタンスには一意の `divId` が自動的に割り当てられます。

**使用例:**

```typescript
import { BrowserLiveView } from 'bedrock-agentcore';

// 複数の BrowserLiveView を同時に表示
function MultiViewerPage() {
  return (
    <div>
      {/* 各インスタンスには自動的に一意の divId が割り当てられる */}
      {/* (dcv-display-1, dcv-display-2, etc.) */}
      <BrowserLiveView
        connectionUrl="wss://stream1.example.com"
        httpExtraSearchParams={{ token: 'session1-token' }}
      />
      <BrowserLiveView
        connectionUrl="wss://stream2.example.com"
        httpExtraSearchParams={{ token: 'session2-token' }}
      />
    </div>
  );
}
```

**ポイント:**
- DCV Web Client SDK の DOM 要素 ID がハードコードされていた問題を修正し、各インスタンスが独立して動作するようになりました
- 接続順序に関係なく、両方のセッションが正しくレンダリングされます

---

### on-behalf-of トークン交換と追加パラメータのサポート ([#149](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/149))

**この機能でできること:**
- `ON_BEHALF_OF_TOKEN_EXCHANGE` 認証フローを使用してトークン交換が可能になりました。また、`resources` と `audiences` パラメータを指定できるようになりました。

**使用例:**

```typescript
import { IdentityClient } from 'bedrock-agentcore';

const identityClient = new IdentityClient({
  // クライアント設定
});

// on-behalf-of トークン交換
const tokenResponse = await identityClient.getOAuth2Token({
  authFlow: 'ON_BEHALF_OF_TOKEN_EXCHANGE',
  // オプション: リソースとオーディエンスを指定
  resources: ['urn:example:resource:api'],
  audiences: ['https://api.example.com']
});

// withAccessToken ラッパーでも使用可能
const wrappedClient = identityClient.withAccessToken({
  authFlow: 'ON_BEHALF_OF_TOKEN_EXCHANGE',
  resources: ['urn:example:resource:api'],
  audiences: ['https://api.example.com']
});
```

**ポイント:**
- `ON_BEHALF_OF_TOKEN_EXCHANGE` は即座にトークンを返します（USER_FEDERATION フローのようなポーリングは不要）
- `resources` と `audiences` は USER_FEDERATION フローのポーリングリクエストにも転送されます

---

## バグ修正

### SSE ストリーミングレスポンス時の FST_ERR_REP_INVALID_PAYLOAD_TYPE エラーを修正 ([#118](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/118))

- **問題:** async generator でストリーミングハンドラーから `data` フィールドを持たないオブジェクトを yield すると、`@fastify/sse` がエラーをスローし、最終的に `FST_ERR_REP_INVALID_PAYLOAD_TYPE` エラーが発生していました
- **原因:** SSE ストリーミングでは既に HTTP ヘッダーが送信済みのため、エラーハンドラーで `reply.send()` を呼び出すと Fastify がペイロードを拒否していました
- **修正後:** `data` フィールドを持たないオブジェクトは自動的に `{ data: chunk }` としてラップされるようになりました

```typescript
// 修正前: このコードはクラッシュしていた
app.streamHandler(async function* (input, context) {
  yield { type: 'meta', sessionId: ctx.sessionId }; // data フィールドなし → クラッシュ
  yield { type: 'chunk', content: 'hello world' };
  yield { type: 'done' };
});

// 修正後: オブジェクトは自動的にラップされる
// SSE 出力:
// data: {"type":"meta","sessionId":"test"}
// data: {"type":"chunk","content":"hello world"}
// data: {"type":"done"}
```

---

### time_of_last_update を Unix タイムスタンプ（秒）で返すよう修正 ([#129](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/129))

- **問題:** `/ping` エンドポイントが `time_of_last_update` を ISO 8601 文字列（例: `"2026-04-09T06:26:53.699Z"`）で返していましたが、AgentCore ランタイムは Unix タイムスタンプ（秒）を期待していました
- **影響:** ランタイムが `HealthyBusy` ステータスを認識できず、バックグラウンドタスクが実行中でも `idleRuntimeSessionTimeout` 後にコンテナが停止されていました
- **修正後:** `time_of_last_update` は Unix タイムスタンプ（秒）として返されるようになりました

```typescript
// 修正前
{
  "status": "HealthyBusy",
  "time_of_last_update": "2026-04-09T06:26:53.699Z"  // string
}

// 修正後
{
  "status": "HealthyBusy",
  "time_of_last_update": 1744177613  // number (Unix timestamp in seconds)
}
```

---

## まとめ

v0.2.3 では BrowserLiveView の複数インスタンス対応と on-behalf-of トークン交換機能が追加され、SSE ストリーミングとヘルスチェックに関する重要なバグが修正されました。
