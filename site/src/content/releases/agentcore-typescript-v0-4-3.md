---
title: "AgentCore TypeScript SDK v0.4.3 リリース解説"
version: "v0.4.3"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-08-06
summary: "Workload Access Token (WAT) を消費・伝播するためのツールが追加されました。関数への自動注入を行う withWAT ラッパーと、AWS SDK クライアントの Invoke 系オペレーションに WAT ヘッダーを自動付与する withWatPropagation ミドルウェアが提供され、新しい標準ヘッダー x-amz-bedrock-agentcore-identity-wat の受け取りにも対応しています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.3"
---

## 概要

このリリースでは、Python SDK に先行して導入されていた Workload Access Token (WAT) の消費・伝播ツールが TypeScript SDK にも移植されました。エージェント実装から WAT を扱いやすくするための高階関数 `withWAT` と、AWS SDK v3 クライアントに WAT ヘッダーを自動付与する `withWatPropagation` ミドルウェアが追加され、あわせて新しい標準ヘッダー `x-amz-bedrock-agentcore-identity-wat` からの WAT 受信にも対応しています (既存の `workloadaccesstoken` ヘッダーもレガシー互換として維持)。

**リリース:** [v0.4.3](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.3)

## 新機能

### Workload Access Token (WAT) の消費・伝播ツール ([#243](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/243))

**この機能でできること:**

- リクエストコンテキストに含まれる WAT を、関数呼び出しの最後の引数として自動注入する `withWAT` ラッパーが利用可能になりました。
- AWS SDK v3 クライアントに対して `withWatPropagation` を呼び出すだけで、`Invoke*` 系オペレーションのアウトバウンドリクエストに WAT ヘッダー (`x-amz-bedrock-agentcore-identity-wat`) を自動付与できるようになりました。
- AgentCore Runtime 側では、新しい標準ヘッダー `x-amz-bedrock-agentcore-identity-wat` を受信できるようになり、既存の `workloadaccesstoken` ヘッダーとの後方互換も維持されています (新ヘッダーが優先)。

**使用例 1: `withWAT` で WAT を関数へ自動注入する**

```typescript
import { withWAT } from 'bedrock-agentcore/identity'
import { BedrockAgentCoreApp } from 'bedrock-agentcore'

// 最後の引数に WAT を受け取る非同期関数をラップする。
// ラップ後の関数を呼び出すときは、WAT を明示的に渡す必要はない。
const callGateway = withWAT(async (query: string, wat: string) => {
  return fetch('https://gateway.example.com/mcp', {
    method: 'POST',
    headers: {
      // WAT はコンテキストから自動的に取り出され、関数呼び出しの最後の引数に注入される。
      'X-Amz-Bedrock-AgentCore-Identity-WAT': wat,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
})

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async (request, context) => {
      // context.workloadAccessToken から WAT を明示的に読み出さなくてもよい。
      // withWAT でラップした関数は、AsyncLocalStorage 経由でコンテキストから WAT を取得する。
      const response = await callGateway('what is the weather?')
      return { status: response.status }
    },
  },
})

await app.run()
```

**使用例 2: AWS SDK クライアントへの WAT 自動伝播**

```typescript
import { BedrockAgentCoreClient, InvokeCodeInterpreterCommand } from '@aws-sdk/client-bedrock-agentcore'
import { withWatPropagation } from 'bedrock-agentcore/identity'
import { BedrockAgentCoreApp } from 'bedrock-agentcore'

const client = new BedrockAgentCoreClient({ region: 'us-west-2' })

// クライアントに WAT 伝播ミドルウェアを登録。
// Invoke* 系のオペレーションに対してのみ、finalizeRequest ステップで
// x-amz-bedrock-agentcore-identity-wat ヘッダーが自動付与される。
// コンテキストに WAT がない場合は何もせず、リクエストはそのまま送信される。
withWatPropagation(client)

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async (request, context) => {
      // このクライアント呼び出しは、リクエストコンテキストの WAT を
      // 自動的にヘッダーに載せて送信する。CreateEvent などの
      // 非 Invoke* オペレーションではヘッダーは付与されない。
      const result = await client.send(
        new InvokeCodeInterpreterCommand({
          codeInterpreterIdentifier: 'my-interpreter',
          name: 'executeCode',
        })
      )
      return { result }
    },
  },
})

await app.run()
```

**ポイント:**

- `withWAT` はラップ対象の関数の**最後の引数**として WAT を注入するため、関数側では通常の引数に加えて末尾に `wat: string` を受け取るシグネチャで宣言してください。
- `withWAT` でラップした関数を、コンテキストに WAT が存在しない状態 (例: AgentCore Runtime 外での実行) で呼び出すと、`"No workload access token in context. Ensure the agent is running on AgentCore Runtime."` というエラーがスローされます。
- `withWatPropagation` は AWS SDK v3 クライアントの `middlewareStack` に `finalizeRequest` ステップ (`priority: 'high'`, `name: 'identityWatPropagation'`) としてミドルウェアを登録します。対象は `Invoke` で始まる `commandName` のみで、それ以外のオペレーションには何も追加されません。
- ヘッダー名の定数は `IDENTITY_WAT_HEADER = 'x-amz-bedrock-agentcore-identity-wat'` として一元管理されており、Runtime 側の受信ヘッダーとフィルタリング (`Authorization` / `x-amzn-bedrock-agentcore-runtime-custom-*` に加えて、この WAT ヘッダーもハンドラーに渡されるヘッダー一覧に含まれます) にも同じ値が使用されます。
- AgentCore Runtime は新ヘッダー `x-amz-bedrock-agentcore-identity-wat` と旧ヘッダー `workloadaccesstoken` の両方から WAT を受け取れますが、両方が指定された場合は**新ヘッダーが優先**されます。既存のクライアントは変更なしで動作し続けます。

## まとめ

Python SDK 側で先行提供されていた WAT の消費 (`withWAT`) と伝播 (`withWatPropagation`) の仕組みが TypeScript SDK にも揃い、AgentCore 上でアウトバウンドの認可トークンを扱う実装が大幅に簡潔になりました。既存の `workloadaccesstoken` ヘッダーは引き続き利用できるため、追加作業なしで v0.4.2 から移行できます。
