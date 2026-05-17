---
title: "sdk-typescript v1.0.0"
version: "v1.0.0"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2026-04-30
summary: "正式版 v1.0.0 リリース。並列ツール実行がデフォルトに、OpenAI Responses API サポート、MCP マルチモーダル対応、ネイティブトークンカウント、invocationState による呼び出し状態管理など、多数の新機能が追加されました。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v1.0.0"
---

## 概要

TypeScript SDK の正式版 v1.0.0 がリリースされました。並列ツール実行がデフォルトになり、OpenAI Responses API のサポート、MCP ツールのマルチモーダル対応、ネイティブトークンカウント、invocationState による呼び出し状態管理など、多数の重要な新機能が追加されています。

**リリース:** [v1.0.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v1.0.0)

## 新機能

### 並列ツール実行がデフォルトに ([#854](https://github.com/strands-agents/sdk-typescript/pull/854), [#970](https://github.com/strands-agents/sdk-typescript/pull/970))

**この機能でできること:**
- モデルが複数のツール呼び出しを同時にリクエストした場合、並列で実行されるようになりました
- 独立した複数のツール呼び出しのレイテンシが大幅に短縮されます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'

// v1.0.0 からは並列実行がデフォルト
const agent = new Agent({
  tools: [fetchUser, fetchOrders, fetchInventory],
  // toolExecutor: 'concurrent' は省略可能（デフォルト）
})

// 以前の逐次実行に戻したい場合
const sequentialAgent = new Agent({
  tools: [fetchUser, fetchOrders],
  toolExecutor: 'sequential',
})
```

**ポイント:**
- 同一ターンで要求された独立したツール呼び出しが並列実行され、I/O バウンドな処理で大幅な高速化が期待できます
- キャンセルシグナル（`agent.cancelSignal`）は各ツールに伝播されます
- 逐次実行が必要な場合は `toolExecutor: 'sequential'` を指定してください

---

### OpenAI Responses API サポートとステートフルモデル ([#820](https://github.com/strands-agents/sdk-typescript/pull/820))

**この機能でできること:**
- OpenAI の Responses API を使用して、サーバーサイドで会話状態を管理できます
- `web_search` や `code_interpreter` などの OpenAI 組み込みツールにアクセスできます

**使用例:**

```typescript
import { Agent, OpenAIModel } from '@strands-agents/sdk'

// Responses API（デフォルト）- サーバーサイドで状態管理
const model = new OpenAIModel({
  api: 'responses',
  modelId: 'gpt-4o',
})

const agent = new Agent({ model, systemPrompt: 'You are helpful.' })

// マルチターン: サーバーがコンテキストを追跡
await agent.invoke('My name is Alice.')
const result = await agent.invoke('What is my name?') // サーバーが "Alice" を記憶

// Web 検索を有効化
const searchModel = new OpenAIModel({
  api: 'responses',
  modelId: 'gpt-4o',
  params: { tools: [{ type: 'web_search' }] },
})

// Chat Completions API を使用する場合
const chatModel = new OpenAIModel({
  api: 'chat',
  modelId: 'gpt-4o',
})
```

**ポイント:**
- `api: 'responses'` でサーバーサイド状態管理が有効になり、クライアント側でメッセージ履歴を管理する必要がなくなります
- `stateful: false` を指定すると、毎回フル履歴を送信するステートレスモードになります
- `modelState` がスナップショットに含まれ、セッション永続化が可能です

---

### MCP ツール結果のマルチモーダルサポート ([#865](https://github.com/strands-agents/sdk-typescript/pull/865))

**この機能でできること:**
- MCP ツールから返される画像やドキュメントなどのマルチモーダルコンテンツを適切に処理できるようになりました
- モデルが視覚コンテンツを正しく解釈できます

**使用例:**

```typescript
import { Agent, BedrockModel, McpClient } from '@strands-agents/sdk'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

// MCP サーバーが画像を返す場合、ImageBlock として正しく処理される
const client = new McpClient({
  applicationName: 'my-app',
  transport: new StdioClientTransport({
    command: 'node',
    args: ['./image-server.js'],
  }),
})

const agent = new Agent({
  model: new BedrockModel({ modelId: 'us.anthropic.claude-sonnet-4-20250514' }),
  tools: [client],
})

// MCP ツールが画像を返すと、モデルが視覚的に解釈
const result = await agent.invoke('この画像を分析してください')
```

**ポイント:**
- 以前は MCP ツールの画像データが JSON（base64 文字列）として渡されていました
- 現在は適切な `ImageBlock` として処理され、モデルが画像を視覚的に解釈できます

---

### MCP Elicitation コールバックサポート ([#876](https://github.com/strands-agents/sdk-typescript/pull/876))

**この機能でできること:**
- MCP サーバーからのユーザー入力リクエスト（elicitation）に応答できます
- 破壊的操作の確認、認証情報の収集、OAuth フローの完了などが可能です

**使用例:**

```typescript
import { Agent, BedrockModel, McpClient } from '@strands-agents/sdk'
import type { ElicitationCallback } from '@strands-agents/sdk'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const elicitationCallback: ElicitationCallback = async (_context, params) => {
  if (params.mode === 'url') {
    // URL モード: OAuth フローなどでブラウザを開く
    console.log(`Please visit: ${params.url}`)
    return { action: 'accept' }
  }

  // フォームモード: ユーザーに確認を求める
  const userConfirmed = await promptUser(params.message) // UI ロジック
  if (userConfirmed) {
    return { action: 'accept', content: { confirmed: true } }
  }
  return { action: 'decline' }
}

const client = new McpClient({
  applicationName: 'my-app',
  transport: new StdioClientTransport({
    command: 'node',
    args: ['./my-mcp-server.js'],
  }),
  elicitationCallback,
})

const agent = new Agent({
  model: new BedrockModel({ modelId: 'us.anthropic.claude-sonnet-4-20250514' }),
  tools: [client],
})

// サーバーのツールが elicitInput() を呼び出すと、elicitationCallback が発火
const result = await agent.invoke('Deploy to production')
```

**ポイント:**
- `elicitationCallback` を省略すると、サーバーはユーザー入力をリクエストできません
- `form` モードと `url` モードの両方をサポートしています

---

### invocationState による呼び出し状態管理 ([#887](https://github.com/strands-agents/sdk-typescript/pull/887))

**この機能でできること:**
- 呼び出しごとにカスタムデータを渡し、フックやツール間で共有できます
- `userId`、`requestId`、`traceId` などのリクエストスコープのコンテキストを管理できます

**使用例:**

```typescript
import { Agent, BeforeModelCallEvent, tool } from '@strands-agents/sdk'
import { z } from 'zod'

// invocationState を渡して結果で受け取る
const result = await agent.invoke('Hi', {
  invocationState: { userId: 'u-1', requestId: 'r-42' },
})
console.log(result.invocationState.userId) // 'u-1'

// フックコールバックで読み書き可能
agent.addHook(BeforeModelCallEvent, (event) => {
  event.invocationState.modelCalls = (event.invocationState.modelCalls ?? 0) + 1
})

// ツールから ToolContext 経由でアクセス
const getUserTool = tool({
  name: 'getUser',
  description: 'Get current user',
  inputSchema: z.object({}),
  callback: (_input, ctx) => `User: ${ctx.invocationState.userId}`,
})
```

**ポイント:**
- 全てのフックイベントとツールコールバックで `invocationState` にアクセスできます
- `appState`（永続化される）とは異なり、`invocationState` は呼び出しごとに独立しています
- マルチエージェント構成やエージェント as ツールでも正しく伝播されます

---

### トークンカウント機能 ([#853](https://github.com/strands-agents/sdk-typescript/pull/853), [#886](https://github.com/strands-agents/sdk-typescript/pull/886), [#890](https://github.com/strands-agents/sdk-typescript/pull/890))

**この機能でできること:**
- モデル呼び出し前に入力トークン数を推定できます
- プロアクティブなコンテキスト管理（しきい値での圧縮トリガーなど）が可能になります

**使用例:**

```typescript
import { Agent, BedrockModel } from '@strands-agents/sdk'

const model = new BedrockModel({
  modelId: 'us.anthropic.claude-sonnet-4-20250514',
})

// トークン数をカウント
const tokenCount = await model.countTokens({
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }],
  systemPrompt: 'You are helpful.',
  toolSpecs: [],
})

console.log(tokenCount) // 推定トークン数
```

**ポイント:**
- Bedrock、Anthropic、Google Gemini ではネイティブ API を使用した正確なカウントが行われます
- OpenAI やネイティブ API がないプロバイダーでは文字ベースのヒューリスティック（`chars/4`）が使用されます
- API エラー時は自動的にヒューリスティックにフォールバックします

---

### BeforeInvocationEvent と BeforeModelCallEvent のキャンセルサポート ([#908](https://github.com/strands-agents/sdk-typescript/pull/908))

**この機能でできること:**
- フックコールバックでエージェント呼び出しやモデル呼び出しを事前にキャンセルできます
- エージェントレベルの認可やモデル呼び出し前のガードレール実装が可能です

**使用例:**

```typescript
import { Agent, BeforeInvocationEvent, BeforeModelCallEvent } from '@strands-agents/sdk'

// エージェント呼び出しレベルでのキャンセル（例: 認可チェック）
agent.addHook(BeforeInvocationEvent, (event) => {
  if (!isAuthorized(event.invocationState.userId)) {
    event.cancel = 'User not authorized'
  }
})

// モデル呼び出しレベルでのキャンセル（例: プロンプトインジェクション検出）
agent.addHook(BeforeModelCallEvent, (event) => {
  if (detectPromptInjection(event.messages)) {
    event.cancel = 'Prompt injection detected'
  }
})
```

**ポイント:**
- `BeforeInvocationEvent.cancel` を設定すると、ユーザー入力がメッセージに追加されずに終了します
- `BeforeModelCallEvent.cancel` を設定すると、モデル呼び出しがスキップされます
- 既存の `BeforeToolCallEvent`、`BeforeToolsEvent`、`BeforeNodeCallEvent` と同じパターンです

---

### AfterToolCallEvent.result の変更可能化 ([#907](https://github.com/strands-agents/sdk-typescript/pull/907))

**この機能でできること:**
- フックコールバックでツール結果を変更してから会話履歴に追加できます
- 大きすぎる結果のトリミングや変換が可能になります

**使用例:**

```typescript
import { Agent, AfterToolCallEvent } from '@strands-agents/sdk'

agent.addHook(AfterToolCallEvent, (event) => {
  // 大きなツール結果をトリミング
  if (event.result.content.length > 10000) {
    event.result = {
      ...event.result,
      content: event.result.content.slice(0, 10000) + '...(truncated)',
    }
  }
})
```

**ポイント:**
- `event.result` への代入が会話履歴に反映されるようになりました
- 既存の読み取り専用の使用方法は影響を受けません

---

### モデルデフォルト値の集中管理と警告 ([#909](https://github.com/strands-agents/sdk-typescript/pull/909))

**この機能でできること:**
- モデル設定のデフォルト値が集中管理され、デフォルト値が使用された場合に警告が出力されます
- 意図しないデフォルト設定の使用を防ぎます

**使用例:**

```typescript
import { BedrockModel } from '@strands-agents/sdk'

// modelId を指定しない場合、警告が出力される
const model = new BedrockModel({})
// Warning: No modelId provided, using default...

// 明示的に指定すれば警告なし
const explicitModel = new BedrockModel({
  modelId: 'us.anthropic.claude-sonnet-4-20250514',
})
```

**ポイント:**
- Bedrock、Anthropic、OpenAI、Google の各プロバイダーで同じ警告パターンが適用されます
- 同じ警告は一度だけ出力されます

---

### browser-agent への Session Token サポート ([#960](https://github.com/strands-agents/sdk-typescript/pull/960))

**この機能でできること:**
- browser-agent サンプルで一時的な AWS 認証情報（SSO、Assumed Role など）を使用できるようになりました

**使用例:**

```typescript
// browser-agent の設定で Session Token を追加
{
  accessKeyId: 'AKIA...',
  secretAccessKey: '...',
  sessionToken: '...', // 一時認証情報用（オプション）
}
```

**ポイント:**
- 長期 IAM キーを持つユーザーは Session Token を空のままにできます
- SSO や Federated Identity を使用するユーザーが browser-agent を利用できるようになりました

## バグ修正

### トークンカウントフォールバックログレベルの修正 ([#942](https://github.com/strands-agents/sdk-typescript/pull/942))
- ネイティブトークンカウントが失敗した際のフォールバックログが `warn` から `debug` に変更されました
- 通常のフォールバック動作で不要な警告が出力されなくなりました

### MCP StreamableHTTPClientTransport の型キャスト修正 ([#939](https://github.com/strands-agents/sdk-typescript/pull/939))
- `StreamableHTTPClientTransport` のトランスポートタイプキャストが修正されました

### 内部エラー型のエクスポート除外 ([#937](https://github.com/strands-agents/sdk-typescript/pull/937))
- 内部用の `ProviderTokenCountError` がパブリックエクスポートから除外されました

### npm パッケージに README と LICENSE を含める ([#969](https://github.com/strands-agents/sdk-typescript/pull/969))
- 公開された npm パッケージに README と LICENSE ファイルが正しく含まれるようになりました

### examples のスタンドアロンインストール修正 ([#961](https://github.com/strands-agents/sdk-typescript/pull/961))
- examples ディレクトリのスタンドアロンインストール用に prepare スクリプトが追加されました

## 破壊的変更

### invocationState が全イベントで必須に ([#887](https://github.com/strands-agents/sdk-typescript/pull/887))

フックイベントと `AgentResult` のコンストラクタで `invocationState` が必須になりました。

**変更前:**
```typescript
new BeforeInvocationEvent({ agent })
new AgentResult({ stopReason, lastMessage, metrics })
```

**変更後:**
```typescript
new BeforeInvocationEvent({ agent, invocationState })
new AgentResult({ stopReason, lastMessage, metrics, invocationState })
```

**移行方法:**
- カスタムプラグインやテストフィクスチャでイベントを直接構築している場合は、`invocationState` パラメータを追加してください
- 通常のエージェント使用、フック登録、ツール作成には影響ありません

---

### 並列ツール実行がデフォルトに ([#970](https://github.com/strands-agents/sdk-typescript/pull/970))

`toolExecutor` のデフォルト値が `'sequential'` から `'concurrent'` に変更されました。

**変更前:**
```typescript
const agent = new Agent({ tools })
// デフォルト: sequential（逐次実行）
```

**変更後:**
```typescript
const agent = new Agent({ tools })
// デフォルト: concurrent（並列実行）

// 逐次実行が必要な場合
const agent = new Agent({
  tools,
  toolExecutor: 'sequential',
})
```

**移行方法:**
- ほとんどの場合、並列実行への移行で問題は発生しません
- ツール間に暗黙の依存関係がある場合は `toolExecutor: 'sequential'` を明示的に指定してください

## まとめ

TypeScript SDK v1.0.0 は正式版リリースとして、並列ツール実行のデフォルト化、OpenAI Responses API サポート、MCP マルチモーダル対応、ネイティブトークンカウント、invocationState による柔軟な状態管理など、多数の重要な新機能を含んでいます。破壊的変更として invocationState の必須化と並列ツール実行のデフォルト化がありますが、移行は比較的容易です。
