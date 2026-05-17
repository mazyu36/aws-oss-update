---
title: "Strands TypeScript SDK v1.1.0 リリース解説"
version: "v1.1.0"
repository: "sdk-typescript"
repositoryDisplayName: "Strands TypeScript SDK"
releaseType: "stable"
date: 2026-05-08
summary: "Human-in-the-Loop ワークフロー用の interrupt システム、モデル呼び出しの自動リトライ機能、プロアクティブなコンテキスト圧縮、結果オフロードプラグインなど、多数の新機能とバグ修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v1.1.0"
---

## 概要

このリリースでは、Human-in-the-Loop ワークフローを実現する interrupt システム、モデル呼び出しの自動リトライ機能、プロアクティブなコンテキスト圧縮、大きなツール結果のオフロード機能など、エージェント開発に役立つ多くの新機能が追加されました。また、MCP クライアントの改善、フック機能の強化、マルチエージェントのタイムアウトサポートなども含まれています。

**リリース:** [v1.1.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v1.1.0)

## 新機能

### Human-in-the-Loop ワークフロー用 Interrupt システム ([#784](https://github.com/strands-agents/sdk-typescript/pull/784))

**この機能でできること:**
- エージェントの実行を一時停止し、ユーザーからの入力を待機してから処理を再開できます。ツールコールバック、`BeforeToolCallEvent` フック、`BeforeToolsEvent` フック内で interrupt を発生させることが可能です。

**使用例:**

```typescript
import { Agent, tool } from '@strands-agents/sdk'
import { z } from 'zod'

const transferMoney = tool({
  name: 'transfer_money',
  description: 'Transfer money between accounts',
  inputSchema: z.object({ amount: z.number() }),
  callback: (input, context) => {
    // 金額が大きい場合、ユーザーに確認を求める
    if (input.amount > 1000) {
      const response = context.interrupt({
        name: 'confirm_transfer',
        reason: 'Confirm large transfer?',
      })
      if (!response.confirmed) return 'Transfer cancelled'
    }
    return 'Transfer completed'
  },
})

const agent = new Agent({ model, tools: [transferMoney] })

// 最初の呼び出し — interrupt で一時停止
const result = await agent.invoke('Transfer $5000')
// result.stopReason === 'interrupt'
// result.interrupts === [{ id: '...', name: 'confirm_transfer', reason: 'Confirm large transfer?' }]

// ユーザーの応答で再開
const resumed = await agent.invoke(
  result.interrupts.map((i) => ({
    interruptResponse: { interruptId: i.id, response: { confirmed: true } },
  }))
)
// resumed.stopReason === 'endTurn'
```

**ポイント:**
- 複数のフックコールバックがそれぞれ独自の interrupt を発生させることが可能
- interrupt が発生すると、完了したツール結果は保持され、再開時にモデル呼び出しをスキップして残りのツールのみ実行
- 新しい型: `Interrupt`, `InterruptParams`, `InterruptResponse`, `InterruptResponseContent`

---

### モデルリトライ戦略 ([#888](https://github.com/strands-agents/sdk-typescript/pull/888))

**この機能でできること:**
- モデル呼び出しが失敗した場合（特にスロットリング時）に自動的にリトライを行います。デフォルトで有効になっており、指数バックオフによるリトライが実行されます。

**使用例:**

```typescript
import { 
  Agent, 
  DefaultModelRetryStrategy, 
  ExponentialBackoff 
} from '@strands-agents/sdk'

// デフォルト: 6回のリトライ、baseMs=4s、maxMs=240s、full jitter
const agent = new Agent({ model })

// カスタム設定
const agentWithCustomRetry = new Agent({
  model,
  retryStrategy: new DefaultModelRetryStrategy({
    maxAttempts: 4,
    backoff: new ExponentialBackoff({ 
      baseMs: 500, 
      maxMs: 60_000, 
      jitter: 'full' 
    }),
  }),
})

// リトライを無効化
const agentNoRetry = new Agent({ model, retryStrategy: null })
```

**ポイント:**
- `ModelThrottledError` 発生時にデフォルトでリトライが実行される
- `BackoffStrategy` インターフェースと `ConstantBackoff`, `LinearBackoff`, `ExponentialBackoff` 実装を提供
- ジッターモード: `none`, `full`, `equal`, `decorrelated`
- 将来のツールリトライなど、他のリトライ種別にも拡張可能な設計

---

### プロアクティブなコンテキスト圧縮 ([#965](https://github.com/strands-agents/sdk-typescript/pull/965))

**この機能でできること:**
- コンテキストウィンドウのオーバーフローエラーを待たずに、事前にコンテキストを圧縮します。これにより、ラウンドトリップの無駄を防ぎ、出力トークンの枯渇を回避できます。

**使用例:**

```typescript
import { 
  SlidingWindowConversationManager,
  SummarizingConversationManager 
} from '@strands-agents/sdk'

// 70% のコンテキスト使用率でプロアクティブに圧縮（デフォルト閾値）
const slidingWindow = new SlidingWindowConversationManager({ 
  windowSize: 50, 
  compressProactively: true 
})

// 80% の閾値でカスタム設定
const summarizing = new SummarizingConversationManager({ 
  compressProactively: { compressionThreshold: 0.8 } 
})
```

**ポイント:**
- `BeforeModelCallEvent` フックで `projectedInputTokens / contextWindowLimit` をチェック
- 閾値を超えた場合、モデル呼び出し前に `reduceOnThreshold()` を実行
- `SlidingWindowConversationManager` と `SummarizingConversationManager` の両方で利用可能

---

### 結果オフロードプラグイン ([#974](https://github.com/strands-agents/sdk-typescript/pull/974))

**この機能でできること:**
- 大きなツール結果を外部ストレージにオフロードし、コンテキスト内には短縮されたプレビューと参照のみを保持します。これにより、コンテキストウィンドウを効率的に使用できます。

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'
import { 
  ContextOffloader, 
  InMemoryStorage,
  FileStorage,
  S3Storage 
} from '@strands-agents/sdk/vended-plugins/context-offloader'

// インメモリストレージを使用
const agent = new Agent({
  model,
  plugins: [new ContextOffloader({ storage: new InMemoryStorage() })],
})

// ファイルストレージを使用
const agentWithFileStorage = new Agent({
  model,
  plugins: [new ContextOffloader({ 
    storage: new FileStorage({ directory: '/tmp/offload' }),
    maxResultTokens: 2500, // デフォルト値
  })],
})

// S3 ストレージを使用
const agentWithS3 = new Agent({
  model,
  plugins: [new ContextOffloader({ 
    storage: new S3Storage({ bucket: 'my-bucket' }) 
  })],
})
```

**ポイント:**
- `maxResultTokens`（デフォルト: 2,500）を超えるツール結果を自動的にオフロード
- デフォルトで `retrieve_offloaded_content` ツールを登録（`includeRetrievalTool: false` で無効化可能）
- ストレージ失敗時は元の結果を保持するフェイルセーフ設計
- `InMemoryStorage`, `FileStorage`, `S3Storage` の3つのストレージバックエンドを提供

---

### contextWindowLimit の自動設定 ([#954](https://github.com/strands-agents/sdk-typescript/pull/954))

**この機能でできること:**
- モデル ID から `contextWindowLimit` を自動的に設定します。ユーザーが手動でコンテキストウィンドウサイズを調べて設定する必要がなくなりました。

**使用例:**

```typescript
import { BedrockModel } from '@strands-agents/sdk'

// 以前: 手動で contextWindowLimit を指定
const modelBefore = new BedrockModel({
  modelId: 'anthropic.claude-sonnet-4-20250514-v1:0',
  contextWindowLimit: 1_000_000,
})

// 現在: モデル ID から自動解決
const model = new BedrockModel({
  modelId: 'anthropic.claude-sonnet-4-20250514-v1:0',
})

model.getConfig().contextWindowLimit // 1_000_000
```

**ポイント:**
- Bedrock クロスリージョンモデル ID（例: `us.anthropic.claude-sonnet-4-6`）のリージョンプレフィックスも自動的に除去
- 明示的に指定された `contextWindowLimit` は常に優先
- 不明なモデル ID の場合は `undefined` のまま

---

### MCP クライアントの機能強化 ([#1010](https://github.com/strands-agents/sdk-typescript/pull/1010))

**この機能でできること:**
- MCP サーバーのログをサーフェス化、接続失敗時のフェイルオープン、サーバーメタデータへのアクセスが可能になりました。

**使用例:**

```typescript
import { McpClient } from '@strands-agents/sdk'

const client = new McpClient({
  transport,
  // 接続失敗時にエラーをスローせず、警告をログ出力
  failOpen: true,
  // カスタムログハンドラー（省略時はデフォルトの Strands ロガーを使用）
  logHandler: (level, data, logger) => {
    console.log(`[MCP ${level}]`, data)
  },
})

await client.connect()

// サーバーメタデータにアクセス
console.log(client.serverCapabilities)
console.log(client.serverVersion)
console.log(client.serverInstructions)

// 接続状態を確認
console.log(client.connectionState) // 'disconnected' | 'connected' | 'failed'
```

**ポイント:**
- `failOpen: true` の場合、接続失敗時は `listTools()` が空配列を返し、`callTool()` はエラーをスロー
- サーバーログは Strands ロガー経由でレベルマッピング（`debug`→debug, `info`/`notice`→info など）

---

### MCP クライアントの await using サポート ([#1016](https://github.com/strands-agents/sdk-typescript/pull/1016))

**この機能でできること:**
- `Symbol.asyncDispose` を実装し、`await using` パターンでスコープ終了時に自動的に接続を切断できます。

**使用例:**

```typescript
import { McpClient } from '@strands-agents/sdk'

async function useMcpClient() {
  await using client = new McpClient({ transport })
  await client.connect()
  
  // クライアントを使用...
  
  // スコープ終了時に自動的に disconnect() が呼ばれる
}
```

**ポイント:**
- 手動の `disconnect()` 呼び出しと組み合わせても安全（複数回の close は no-op）

---

### Graph/Swarm のタイムアウトサポート ([#1008](https://github.com/strands-agents/sdk-typescript/pull/1008))

**この機能でできること:**
- Swarm と Graph のオーケストレーターに全体のタイムアウトとノードごとのタイムアウトを設定できます。また、Bedrock クライアントにデフォルトの 120 秒リクエストタイムアウトが追加されました。

**使用例:**

```typescript
import { Swarm, Graph } from '@strands-agents/sdk'

// Swarm 全体と各ノードのタイムアウトを設定
const swarm = new Swarm({
  nodes: [researcher, writer],
  timeout: 60_000,      // Swarm 全体で 60 秒
  nodeTimeout: 20_000,  // 各ノードは 20 秒
})

// ノードごとにタイムアウトをオーバーライド
const graph = new Graph({
  nodes: [
    { agent: fastClassifier },                        // nodeTimeout を使用
    { agent: slowResearcher, timeout: 120_000 },      // オーバーライド
  ],
  edges: [['fastClassifier', 'slowResearcher']],
  nodeTimeout: 30_000,
})

// Bedrock のリクエストタイムアウトをカスタマイズ
import { BedrockModel } from '@strands-agents/sdk'

const model = new BedrockModel({
  region: 'us-west-2',
  clientConfig: { requestHandler: { requestTimeout: 300_000 } },
})
```

**ポイント:**
- Bedrock のデフォルトリクエストタイムアウトは 120 秒（以前は無制限）
- タイムアウトは `AbortSignal` 経由で強制され、キャンセルは協調的
- デフォルトは `Infinity`（タイムアウトなし）

---

### フックの実行順序制御 ([#1005](https://github.com/strands-agents/sdk-typescript/pull/1005))

**この機能でできること:**
- フックの実行優先度を `order` オプションで制御できます。低い値が先に実行されます。

**使用例:**

```typescript
import { Agent, BeforeToolCallEvent, HookOrder } from '@strands-agents/sdk'

const agent = new Agent({ model, tools })

// 最初に実行
agent.addHook(BeforeToolCallEvent, callback, { order: HookOrder.FIRST })

// デフォルト順序（0）
agent.addHook(BeforeToolCallEvent, callback)

// 最後に実行
agent.addHook(BeforeToolCallEvent, callback, { order: HookOrder.LAST })

// 細かい制御
agent.addHook(BeforeToolCallEvent, callback, { order: -50 })
```

**ポイント:**
- `HookOrder.FIRST`, `HookOrder.DEFAULT`, `HookOrder.LAST` の定数を提供
- 同じ順序内では登録順を維持
- `After*` イベントでは同一順序グループ内で登録順が逆転（クリーンアップ対称性のため）

---

### フックイベントの機能強化 ([#957](https://github.com/strands-agents/sdk-typescript/pull/957))

**この機能でできること:**
- `BeforeToolCallEvent` でツールの入力を書き換えたり、別のツールに置き換えたりできます。`AfterToolCallEvent` で結果を変換でき、`AfterInvocationEvent` でフォローアップの呼び出しをチェーンできます。

**使用例:**

```typescript
import { Agent, BeforeToolCallEvent, AfterToolCallEvent, AfterInvocationEvent } from '@strands-agents/sdk'

const agent = new Agent({ model, tools })

// ツールを置き換え
agent.addHook(BeforeToolCallEvent, (event) => {
  if (event.toolUse.name === 'risky_tool') {
    event.selectedTool = safeTool
  }
})

// ツール入力を書き換え
agent.addHook(BeforeToolCallEvent, (event) => {
  event.toolUse.input = redactSecrets(event.toolUse.input)
})

// ツール結果を変換
agent.addHook(AfterToolCallEvent, (event) => {
  event.result = truncateIfOversized(event.result)
})

// フォローアップを実行
agent.addHook(AfterInvocationEvent, (event) => {
  if (shouldAskFollowUp(event.invocationState)) {
    event.resume = 'next question based on previous result'
  }
})
```

**ポイント:**
- `toolUse` と `result` がミュータブルになり、フック内で変更可能
- `selectedTool` を設定するとツールレジストリのルックアップをバイパス
- `resume` を設定すると同じ呼び出しロック内で新しい入力でフォローアップ呼び出しを実行

---

### AfterToolsEvent に endTurn フィールド追加 ([#982](https://github.com/strands-agents/sdk-typescript/pull/982))

**この機能でできること:**
- ツール完了後、次のモデル呼び出し前にエージェントループを停止できます。予算/クォータの強制やガードレールフックに便利です。

**使用例:**

```typescript
import { Agent, AfterToolsEvent } from '@strands-agents/sdk'

const agent = new Agent({ model, tools })

// boolean: サイレントに停止
agent.addHook(AfterToolsEvent, (event) => {
  event.endTurn = true
})

// string: 最終アシスタントメッセージ付きで停止
agent.addHook(AfterToolsEvent, (event) => {
  event.endTurn = 'enough information gathered'
})
```

**ポイント:**
- `endTurn` が truthy の場合、`stopReason: 'endTurn'` でエージェントループが終了
- ツール結果とアシスタントメッセージは会話履歴にコミットされてから停止

---

### LocalAgent インターフェースに model プロパティ追加 ([#938](https://github.com/strands-agents/sdk-typescript/pull/938))

**この機能でできること:**
- プラグイン、フック、ツールからエージェントのモデルプロバイダーにアクセスできます。型キャストなしで `model.countTokens()` などを呼び出せます。

**使用例:**

```typescript
agent.addHook(BeforeModelCallEvent, async (event) => {
  const tokenCount = await event.agent.model.countTokens(messages)
  console.log(`Token count: ${tokenCount}`)
})
```

---

### useNativeTokenCount フラグ追加 ([#1009](https://github.com/strands-agents/sdk-typescript/pull/1009))

**この機能でできること:**
- ネイティブトークンカウント API 呼び出しをスキップし、ヒューリスティック推定器にフォールバックできます。高頻度のプロアクティブ圧縮チェックでレイテンシーやコストを削減したい場合に便利です。

**使用例:**

```typescript
import { BedrockModel } from '@strands-agents/sdk'

// ネイティブ API をスキップし、常にヒューリスティックを使用
const model = new BedrockModel({
  modelId: 'anthropic.claude-sonnet-4-20250514',
  useNativeTokenCount: false,
})
```

**ポイント:**
- `BedrockModel`, `AnthropicModel`, `GoogleModel` で利用可能
- デフォルトは `true`（現在の動作を維持）

---

### 無効なツール名の正規化 ([#1017](https://github.com/strands-agents/sdk-typescript/pull/1017))

**この機能でできること:**
- アシスタントメッセージの無効なツール名を `INVALID_TOOL_NAME` に正規化し、プロバイダー側のバリデーションエラーを防ぎます。

**ポイント:**
- バリデーションルール: 非空、1〜64文字、`^[a-zA-Z0-9_-]+$`
- 正規化はモデルに送信されるメッセージに対してのみ適用され、エージェントの保存履歴は変更されない
- Python SDK の動作と一致

---

## バグ修正

### MCP listTools() のページネーション追加 ([#984](https://github.com/strands-agents/sdk-typescript/pull/984))
- MCP ツール取得時のページネーションが追加され、最初の結果バッチ以降のツールが取得されない問題が修正されました
- ツールの説明がない場合のフォールバック説明も改善されました

### Bedrock トークンカウントの非サポートモデルキャッシュ ([#999](https://github.com/strands-agents/sdk-typescript/pull/999))
- `CountTokens` API をサポートしないモデルの場合、最初の失敗時にモデル ID をキャッシュし、以降の呼び出しで API 呼び出しをスキップしてヒューリスティック推定器に直接フォールバックするようになりました
- これにより、デバッグログの汚染と不要な Bedrock エラーログが解消されました

## まとめ

v1.1.0 は、Human-in-the-Loop ワークフロー、自動リトライ、プロアクティブ圧縮など、エージェント開発の信頼性と柔軟性を大幅に向上させる多くの機能を追加した重要なリリースです。
