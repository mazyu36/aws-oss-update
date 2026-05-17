---
title: "Strands TypeScript SDK v0.6.0 リリース解説"
version: "v0.6.0"
repository: "sdk-typescript"
repositoryDisplayName: "Strands TypeScript SDK"
releaseType: "stable"
date: 2026-03-11
summary: "Swarm/Graph マルチエージェントオーケストレーション、セッション管理機能、ドキュメント引用サポート、Bedrock ガードレールリダクション、エージェントループメトリクス追跡など、多数の新機能が追加されました。MCP タスクがオプトイン方式に変更される破壊的変更を含みます。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.6.0"
---

## 概要

このリリースでは、Swarm および Graph マルチエージェントオーケストレーションパターン、セッション管理機能、ドキュメント引用サポート、Bedrock ガードレールリダクション、エージェントループのローカルメトリクス追跡など、多数の重要な新機能が追加されました。MCP タスクがオプトイン方式に変更される破壊的変更を含みます。

**リリース:** [v0.6.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.6.0)

## 新機能

### Swarm マルチエージェントオーケストレーション ([#606](https://github.com/strands-agents/sdk-typescript/pull/606))

**この機能でできること:**
- 複数のエージェントが順次実行され、構造化出力を使用してハンドオフを行う Swarm オーケストレーションパターンを実装できます
- 各エージェントは次のエージェントへのハンドオフまたは最終レスポンスの生成を決定します

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'
import { Swarm, Status } from '@strands-agents/sdk/multiagent'

const researcher = new Agent({
  agentId: 'researcher',
  description: 'トピックを調査し、ライターにハンドオフします',
  systemPrompt: 'トピックを調査した後、ライターにハンドオフしてください',
})

const writer = new Agent({
  agentId: 'writer',
  description: '調査に基づいて要約を書きます',
  systemPrompt: '簡潔な要約を書いてください',
})

const swarm = new Swarm({
  nodes: [researcher, writer],
  start: 'researcher',
  maxSteps: 10,
})

// invoke で実行（ストリームを消費して結果を返す）
const result = await swarm.invoke('量子コンピューティングについて説明してください')
console.log(result.status) // Status.COMPLETED
console.log(result.content) // 最終エージェントの出力

// stream でライフサイクルイベントを取得
for await (const event of swarm.stream('量子コンピューティングについて説明してください')) {
  console.log(event.type) // beforeNodeCallEvent, nodeStreamUpdateEvent, multiAgentHandoffEvent など
}
```

**ポイント:**
- Python SDK の `Swarm` クラスの TypeScript 版です
- 構造化出力スキーマを使用してルーティングロジックを実現しています
- `maxSteps` で総エージェント実行回数を制限できます

---

### Graph マルチエージェントオーケストレーション ([#632](https://github.com/strands-agents/sdk-typescript/pull/632))

**この機能でできること:**
- 有向グラフとしてエージェントを構成し、エッジで実行順序と条件付きルーティングを定義できます
- 並列実行をサポートし、`maxConcurrency` で同時実行数を制限できます

**使用例:**

```typescript
import { Graph } from '@strands-agents/sdk'

const graph = new Graph({
  nodes: [researcher, writer, reviewer],
  edges: [
    ['researcher', 'writer'],
    ['writer', 'reviewer'],
    { source: 'reviewer', target: 'writer', handler: (state) => needsRevision(state) },
  ],
  maxConcurrency: 2,
  maxSteps: 10,
})

// invoke で実行
const result = await graph.invoke('量子コンピューティングについて説明してください')

// stream でイベントを取得
for await (const event of graph.stream('量子コンピューティングについて説明してください')) {
  // nodeStreamUpdateEvent, nodeResultEvent, multiAgentHandoffEvent など
}
```

**ポイント:**
- TypeScript 版は AND セマンティクス（すべての入力エッジが完了してからノードを実行）を採用
- 継続的スケジューリングでノードが準備でき次第実行されます
- 条件付きエッジでルーティングロジックをカスタマイズできます

---

### セッションマネージャー ([#569](https://github.com/strands-agents/sdk-typescript/pull/569))

**この機能でできること:**
- エージェントの会話状態を永続化し、セッションをまたいで復元できます
- ファイルシステムまたは S3 をストレージバックエンドとして使用できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'
import { SessionManager, S3Storage } from '@strands-agents/sdk/session'

const session = new SessionManager({
  sessionId: 'my-session',
  storage: { snapshot: new S3Storage({ bucket: 'my-bucket', region: 'us-east-1' }) },
  saveLatestOn: 'invocation',
  snapshotTrigger: ({ agentData }) => agentData.messages.length >= 10,
})

const agent = new Agent({ sessionManager: session })
await agent.invoke('Hello!')

// 別のセッションで復元
const newAgent = new Agent({ sessionManager: session })
await session.restoreSnapshot({ target: newAgent })
await newAgent.invoke('前回の続きです')
```

**ポイント:**
- `FileStorage` または `S3Storage` をストレージバックエンドとして選択できます
- `saveLatestOn` で自動保存タイミングを設定できます（'message'、'invocation'、'trigger'）
- スナップショット ID は UUIDv7 を使用し、時系列でソート可能です

---

### セッション削除とリストのページネーション ([#623](https://github.com/strands-agents/sdk-typescript/pull/623))

**この機能でできること:**
- セッションデータを削除できます
- スナップショットリストのページネーションをサポートします

**使用例:**

```typescript
import { SessionManager, S3Storage } from '@strands-agents/sdk/session'

const storage = new S3Storage({ bucket: 'my-bucket', region: 'us-east-1' })

// ページネーションでスナップショットを取得
const page1 = await storage.listSnapshotIds({ location, limit: 10 })
const page2 = await storage.listSnapshotIds({ location, limit: 10, startAfter: page1.at(-1)! })

// セッションを削除
await sessionManager.deleteSession()
```

**ポイント:**
- `limit` と `startAfter` でカーソルベースのページネーションが可能です
- `deleteSession` はセッション内のすべてのスナップショットとマニフェストを削除します

---

### ドキュメント引用サポート ([#568](https://github.com/strands-agents/sdk-typescript/pull/568))

**この機能でできること:**
- `CitationsBlock` でモデルからのドキュメント引用を処理できます
- マルチターン会話で引用を維持できます

**使用例:**

```typescript
import { Agent, DocumentBlock, CitationsBlock } from '@strands-agents/sdk'

// ドキュメント入力で引用を有効化
const document: DocumentBlock = {
  type: 'document',
  source: { type: 'base64', mediaType: 'application/pdf', data: base64Data },
  citations: { enabled: true },
}

const agent = new Agent({ model })
const result = await agent.invoke([
  { type: 'text', text: 'このドキュメントを要約してください' },
  document,
])

// レスポンスに CitationsBlock が含まれる場合があります
for (const block of result.message.content) {
  if (block.type === 'citationsContent') {
    console.log(block.citations) // 引用情報
  }
}
```

**ポイント:**
- Python SDK の `CitationsContentBlock` と同等の機能です
- プロバイダー非依存の型設計で、Bedrock 形式は内部でマッピングされます
- 引用はマルチターン会話でフィルタリングされて送信されます

---

### Bedrock ガードレールリダクションサポート ([#631](https://github.com/strands-agents/sdk-typescript/pull/631))

**この機能でできること:**
- Bedrock のガードレールがトリガーされた際に入力/出力をリダクション（編集）できます
- `ModelRedactEvent` でリダクションの発生を検知できます

**使用例:**

```typescript
import { Agent, ModelRedactEvent } from '@strands-agents/sdk'

const agent = new Agent({
  model,
  hooks: {
    onModelRedact: (event: ModelRedactEvent) => {
      console.log('入力リダクション:', event.inputRedactionMessage)
      console.log('出力リダクション:', event.outputRedactionMessage)
    },
  },
})
```

**ポイント:**
- 入力ガードレールがトリガーされると最新のユーザーメッセージがリダクションされます
- 出力ガードレールがトリガーされるとアシスタントのレスポンスがリダクションされます
- セッションマネージャーはリダクション後にスナップショットを更新します

---

### tool() ファクトリで Zod と JSON Schema の両方をサポート ([#617](https://github.com/strands-agents/sdk-typescript/pull/617))

**この機能でできること:**
- `tool()` ファクトリで Zod スキーマに加えて JSON Schema オブジェクトも使用できます
- スキーマの種類は自動検出されます

**使用例:**

```typescript
import { tool } from '@strands-agents/sdk'
import { z } from 'zod'

// Zod スキーマ - 型付き + バリデーション
const calculator = tool({
  name: 'calculator',
  description: '2つの数値を加算します',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  callback: (input) => input.a + input.b,
})

// JSON Schema - バリデーションなし、input は unknown
const greeter = tool({
  name: 'greeter',
  description: '人に挨拶します',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
  callback: (input) => `Hello, ${(input as { name: string }).name}!`,
})
```

**ポイント:**
- Zod スキーマを使用すると型推論とランタイムバリデーションが有効になります
- JSON Schema を使用するとバリデーションなしで `unknown` 型として処理されます
- 既存の Zod ベースのツールは変更なしで動作します

---

### エージェントループのローカルメトリクス追跡 ([#597](https://github.com/strands-agents/sdk-typescript/pull/597))

**この機能でできること:**
- エージェントループのサイクル数、トークン使用量、ツール実行統計、モデルレイテンシを追跡できます
- メトリクスは `AgentResult.metrics` で取得できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'

const agent = new Agent({ tools: [myTool] })
const result = await agent.invoke('このドキュメントを要約してください')

// トークン使用量
console.log(result?.metrics.accumulatedUsage)
// { inputTokens: 1200, outputTokens: 350, totalTokens: 1550 }

// サイクルとツール統計
console.log(result?.metrics.cycleCount) // 3
console.log(result?.metrics.toolMetrics)
// { myTool: { callCount: 2, successCount: 2, errorCount: 0, totalTime: 1.23 } }
```

**ポイント:**
- `AgentResult.metrics` はオプショナルですが、Agent 内部では常に設定されます
- Python SDK の `EventLoopMetrics` と同等の機能です
- `totalDuration`、`averageCycleTime`、`toolUsage` などのヘルパーメソッドを提供します

---

### テレメトリ API に getTracer を追加 ([#604](https://github.com/strands-agents/sdk-typescript/pull/604))

**この機能でできること:**
- OpenTelemetry のグローバルトレース API をラップした `getTracer` メソッドでカスタムスパンを作成できます

**使用例:**

```typescript
import { telemetry } from '@strands-agents/sdk'

// テレメトリをセットアップ
telemetry.setupTracer({ exporters: { otlp: true } })

// トレーサーを取得してカスタムスパンを作成
const tracer = telemetry.getTracer()
const span = tracer.startSpan('test-operation')
span.setAttribute('custom.key', 'value')
// 処理...
span.end()
```

**ポイント:**
- `setupTracer` でテレメトリを初期化した後に使用します
- OpenTelemetry API と完全互換です

---

### ブラウザ互換のトレーサー ([#622](https://github.com/strands-agents/sdk-typescript/pull/622))

**この機能でできること:**
- ブラウザ環境でもテレメトリ機能を使用できます
- Node.js 環境では自動的に `NodeTracerProvider` を検出します

**使用例:**

```typescript
import { telemetry } from '@strands-agents/sdk'

// ブラウザでも Node.js でも動作
telemetry.setupTracer({ exporters: { otlp: true } })
```

**ポイント:**
- `@opentelemetry/sdk-trace-node` はオプショナルなピア依存関係になりました
- ブラウザでは `BasicTracerProvider` にフォールバックします
- CI に `check:browser-bundle` ステップが追加され、Node.js 専用の依存関係がバンドルされないことを検証します

## 破壊的変更

### MCP タスクがオプトイン方式に変更 ([#516](https://github.com/strands-agents/sdk-typescript/pull/516))

MCP のタスク機能がデフォルトで無効になり、`tasksConfig` オプションで明示的に有効化する必要があります。

**変更前:**
```typescript
import { MCPClient } from '@strands-agents/sdk'

// タスクが自動的に有効
const client = new MCPClient({ /* ... */ })
```

**変更後:**
```typescript
import { MCPClient } from '@strands-agents/sdk'

// タスクを有効にするには tasksConfig を指定
const client = new MCPClient({
  // ...
  tasksConfig: {
    // タスク設定
  },
})
```

**移行方法:**
- MCP タスク機能を使用している場合は、`tasksConfig` オプションを追加してください
- タスク機能を使用していない場合は変更不要です

## バグ修正

### agent.ts での循環インポートの修正 ([#605](https://github.com/strands-agents/sdk-typescript/pull/605))
- `agent.ts` が `../index.js` からインポートしていたことで発生していた循環依存を修正しました
- 直接のソースモジュールからのインポートに変更されました

### マルチエージェントオーケストレーションでノード実行失敗時の警告ログ追加 ([#640](https://github.com/strands-agents/sdk-typescript/pull/640))
- ノード実行が失敗した際に `logger.warn` で警告ログを出力するようになりました
- CI ログでエラーの診断が容易になりました

## まとめ

このリリースでは、Swarm と Graph のマルチエージェントオーケストレーションパターン、セッション管理機能、ドキュメント引用サポート、Bedrock ガードレールリダクション、エージェントループのローカルメトリクス追跡など、多数の重要な新機能が追加されました。MCP タスクがオプトイン方式に変更される破壊的変更があるため、アップグレード時には確認が必要です。
