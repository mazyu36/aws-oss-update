---
title: "sdk-typescript v0.7.0"
version: "v0.7.0"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2026-03-19
summary: "A2A プロトコルサポート、Plugin システム、Bedrock プロンプトキャッシング、OpenTelemetry メトリクス、ConversationManager の型付け強化など、多数の新機能が追加されました。agentId から id へのリネームと HookProvider から Plugin への移行を含む破壊的変更があります。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.7.0"
---

## 概要

このリリースでは、A2A（Agent-to-Agent）プロトコルサポート、HookProvider を置き換える新しい Plugin システム、Bedrock のプロンプトキャッシング、OpenTelemetry メトリクス出力、ConversationManager の型付け強化など、多数の重要な新機能が追加されました。`agentId` から `id` へのリネームと HookProvider から Plugin への移行を含む破壊的変更があります。

**リリース:** [v0.7.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.7.0)

## 新機能

### A2A プロトコルサポート ([#601](https://github.com/strands-agents/sdk-typescript/pull/601))

**この機能でできること:**
- A2A（Agent-to-Agent）プロトコルを使用して、異なるシステム間でエージェントを連携できます
- `A2AServer` で Strands Agent を HTTP エンドポイントとして公開できます
- `A2AAgent` でリモートの A2A エージェントをローカルエージェントとして使用できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'
import { A2AServer, A2AAgent } from '@strands-agents/sdk/a2a'

// A2A サーバーとしてエージェントを公開
const agent = new Agent({
  id: 'my-agent',
  systemPrompt: 'あなたは質問に答えるアシスタントです',
})

const server = new A2AServer({
  agent,
  port: 9000,
})
await server.start()
// /.well-known/agent-card.json でエージェントカードを提供

// リモートの A2A エージェントに接続
const remoteAgent = new A2AAgent({
  url: 'http://localhost:9000',
  id: 'remote-agent',
})

const result = await remoteAgent.invoke('こんにちは')
console.log(result.content)
```

**ポイント:**
- `AgentBase` インターフェースが導入され、`Agent` と `A2AAgent` の共通契約を定義します
- A2A SDK は動的インポートされるため、オプショナルなピア依存関係として設定されています
- 現在のバージョンではテキストコンテンツのみがサポートされ、画像やファイルは送信されません

---

### Plugin システム ([#619](https://github.com/strands-agents/sdk-typescript/pull/619))

**この機能でできること:**
- `HookProvider` を置き換える新しい `Plugin` システムでエージェントの機能を拡張できます
- プラグインは一意の名前を持ち、重複を防ぎ、ログで識別しやすくなります
- プラグインからツールを自動登録できます

**使用例:**

```typescript
import { Agent, Plugin, BeforeInvocationEvent } from '@strands-agents/sdk'

// カスタムプラグインの作成
class LoggingPlugin extends Plugin {
  get name(): string {
    return 'logging-plugin'
  }

  override initAgent(agent: AgentData): void {
    agent.addHook(BeforeInvocationEvent, (event) => {
      console.log('エージェント呼び出し開始')
    })
  }

  override getTools(): Tool[] {
    return [myCustomTool]
  }
}

// プラグインを使用
const agent = new Agent({
  model,
  plugins: [new LoggingPlugin()],
})

// ランタイムでフックを追加
const cleanup = agent.addHook(BeforeInvocationEvent, (event) => {
  console.log('Before invocation')
})
```

**ポイント:**
- `AgentConfig.hooks` は `AgentConfig.plugins` に置き換わりました（破壊的変更）
- Strands 提供のプラグイン名は `strands:` プレフィックスが付きます
- `MultiAgentPlugin` でマルチエージェントオーケストレーターにもプラグインを適用できます

---

### Bedrock プロンプトキャッシング ([#595](https://github.com/strands-agents/sdk-typescript/pull/595))

**この機能でできること:**
- Bedrock モデルプロバイダーでプロンプトキャッシングを有効にし、コストとレイテンシを削減できます
- `cacheConfig: { strategy: 'auto' }` で自動的にキャッシュポイントが挿入されます

**使用例:**

```typescript
import { BedrockModel } from '@strands-agents/sdk'

const model = new BedrockModel({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  cacheConfig: {
    strategy: 'auto',
  },
})

const agent = new Agent({ model })
// システムプロンプトやツール定義が自動的にキャッシュされます
```

**ポイント:**
- `strategy: 'auto'` でシステムプロンプトとツール定義にキャッシュポイントが自動挿入されます
- 旧 `cachePrompt` と `cacheTools` フィールドは削除されました

---

### Document/Image/Video ブロックサポート ([#576](https://github.com/strands-agents/sdk-typescript/pull/576))

**この機能でできること:**
- ツールからドキュメント、画像、動画などのメディアコンテンツを返せるようになりました
- 各モデルプロバイダーの API 機能に応じて適切に処理されます

**使用例:**

```typescript
import { tool, DocumentBlock, ImageBlock } from '@strands-agents/sdk'
import { z } from 'zod'

const documentTool = tool({
  name: 'getDocument',
  description: 'ドキュメントを取得します',
  inputSchema: z.object({ id: z.string() }),
  callback: async (input): Promise<DocumentBlock> => {
    const data = await fetchDocument(input.id)
    return {
      type: 'document',
      source: {
        type: 'base64',
        mediaType: 'application/pdf',
        data: data,
      },
    }
  },
})

const imageTool = tool({
  name: 'getImage',
  description: '画像を取得します',
  inputSchema: z.object({ url: z.string() }),
  callback: async (input): Promise<ImageBlock> => {
    const imageData = await fetchImage(input.url)
    return {
      type: 'image',
      source: {
        type: 'base64',
        mediaType: 'image/png',
        data: imageData,
      },
    }
  },
})
```

**ポイント:**
- Bedrock、Anthropic、Gemini、OpenAI の各プロバイダーで対応しています
- プロバイダーがサポートしない形式は適切に変換またはフォールバックされます

---

### OpenTelemetry メトリクス出力 ([#655](https://github.com/strands-agents/sdk-typescript/pull/655))

**この機能でできること:**
- `setupMeter()` で OpenTelemetry メトリクスを有効にし、エージェントのパフォーマンスを監視できます
- サイクル数、トークン使用量、ツール実行統計などが自動的に出力されます

**使用例:**

```typescript
import { Agent, telemetry } from '@strands-agents/sdk'

// メトリクスを設定
telemetry.setupMeter({
  exporters: { otlp: true },
})

const agent = new Agent({ model, tools })
await agent.invoke('タスクを実行してください')

// 出力されるメトリクス:
// - gen_ai.agent.cycle.count
// - gen_ai.agent.invocation.count
// - gen_ai.agent.tokens.input / output
// - gen_ai.agent.tool.call.count
// - gen_ai.agent.model.latency
```

**ポイント:**
- `@opentelemetry/sdk-metrics` と `@opentelemetry/exporter-metrics-otlp-http` はオプショナルなピア依存関係です
- MeterProvider が未登録の場合は no-op で動作し、オーバーヘッドはありません

---

### TTFB メトリクスと Langfuse サポート ([#681](https://github.com/strands-agents/sdk-typescript/pull/681))

**この機能でできること:**
- Time-to-first-byte（TTFB）メトリクスでストリーミングレイテンシを追跡できます
- Langfuse エンドポイント検出で、Langfuse ダッシュボードでの二重トークンカウントを防止します
- システムプロンプトがチャットスパンにイベントとして出力されます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'

const agent = new Agent({ model })
const result = await agent.invoke('質問です')

// TTFB メトリクスにアクセス
console.log(result?.metrics.timeToFirstByteMs)
```

**ポイント:**
- Langfuse 使用時は自動的に `langfuse.observation.type = 'span'` が付与されます
- Python SDK と同等のテレメトリ機能が実装されました

---

### Bedrock ガードレールの guardLatestUserMessage オプション ([#635](https://github.com/strands-agents/sdk-typescript/pull/635))

**この機能でできること:**
- マルチターン会話でガードレール評価を最新のユーザーメッセージのみに限定し、パフォーマンスとコストを最適化できます

**使用例:**

```typescript
import { BedrockModel } from '@strands-agents/sdk'

const model = new BedrockModel({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  guardrailConfig: {
    guardrailIdentifier: 'my-guardrail-id',
    guardrailVersion: '1',
    guardLatestUserMessage: true, // 最新メッセージのみ評価
  },
})
```

**ポイント:**
- 以前に検証済みのメッセージを再評価しないため、レイテンシとコストが削減されます
- ツール結果メッセージではなく、実際のユーザー入力メッセージが正しく検出されます

---

### ConversationManager の型付け強化 ([#664](https://github.com/strands-agents/sdk-typescript/pull/664))

**この機能でできること:**
- `ConversationManager` が抽象基底クラスとなり、カスタム実装のガイダンスが明確になりました
- `reduce()` メソッドの実装だけでコンテキストウィンドウオーバーフローの回復処理が自動的に組み込まれます

**使用例:**

```typescript
import { ConversationManager, ReduceOptions } from '@strands-agents/sdk'

class MyConversationManager extends ConversationManager {
  readonly name = 'my:conversation-manager'

  reduce({ agent, error }: ReduceOptions): boolean {
    // ContextWindowOverflowError 発生時に自動的に呼び出される
    if (agent.messages.length <= 5) return false
    agent.messages.splice(0, agent.messages.length - 5)
    return true // 削減成功
  }
}

const agent = new Agent({
  model,
  conversationManager: new MyConversationManager(),
})
```

**ポイント:**
- `reduce()` が `true` を返すとモデル呼び出しがリトライされます
- `false` を返すとエラーが伝播します
- プロアクティブな管理（各呼び出し後のトリミングなど）は `initAgent` でフックを登録して実装します

---

### Swarm の start オプション化 ([#657](https://github.com/strands-agents/sdk-typescript/pull/657))

**この機能でできること:**
- `Swarm` の `start` パラメータが省略可能になり、デフォルトで最初のノードが開始点になります

**使用例:**

```typescript
import { Swarm } from '@strands-agents/sdk/multiagent'

// start を省略可能に
const swarm = new Swarm({
  nodes: [agentA, agentB],
  // start: 'agentA' は省略可能、agentA が自動的に開始点に
})

console.log(swarm.start.id) // 'agentA'
```

**ポイント:**
- 既存のコードは変更なしで動作します
- 空の `nodes` 配列はコンストラクタでエラーになります

---

### MultiAgentState のストリーミングイベント追加 ([#661](https://github.com/strands-agents/sdk-typescript/pull/661))

**この機能でできること:**
- マルチエージェントのストリーミングイベントに `MultiAgentState` が追加され、オーケストレーションの状態を追跡できます

**使用例:**

```typescript
import { Swarm } from '@strands-agents/sdk/multiagent'

const swarm = new Swarm({ nodes: [agentA, agentB] })

for await (const event of swarm.stream('質問')) {
  if (event.type === 'nodeStreamUpdateEvent') {
    console.log('現在のエージェント:', event.state?.currentNodeId)
    console.log('ステップ数:', event.state?.stepCount)
  }
}
```

---

### S3 ロケーションパターンの Python SDK との統一 ([#679](https://github.com/strands-agents/sdk-typescript/pull/679))

**この機能でできること:**
- メディアファイルの S3 ロケーションパターンが Python SDK と統一されました

**ポイント:**
- Python SDK と TypeScript SDK 間でメディアファイルの互換性が向上しました

## 破壊的変更

### agentId から id へのリネーム ([#663](https://github.com/strands-agents/sdk-typescript/pull/663))

`AgentConfig.agentId` が `AgentConfig.id` にリネームされ、デフォルト値が `"default"` から `"agent"` に変更されました。

**変更前:**
```typescript
const agent = new Agent({ agentId: 'my-agent' })
console.log(agent.agentId)
```

**変更後:**
```typescript
const agent = new Agent({ id: 'my-agent' })
console.log(agent.id)
```

**移行方法:**
- `agentId` を `id` に置き換えてください
- 既存のセッションとの互換性を維持する場合は、`id: 'default'` を明示的に指定してください

---

### HookProvider から Plugin への移行 ([#619](https://github.com/strands-agents/sdk-typescript/pull/619))

`AgentConfig.hooks` が `AgentConfig.plugins` に置き換わりました。

**変更前:**
```typescript
const agent = new Agent({
  model,
  hooks: [myHookProvider],
})
```

**変更後:**
```typescript
const agent = new Agent({
  model,
  plugins: [myPlugin],
})
```

**移行方法:**
- `HookProvider` を実装していた場合は、`Plugin` クラスを継承するように変更してください
- ランタイムでのフック登録は `agent.addHook()` を使用してください

## バグ修正

### ピア依存関係の型エラー修正 ([#671](https://github.com/strands-agents/sdk-typescript/pull/671))
- `skipLibCheck: false` を使用している環境でのピア依存関係の型エラーが解決されました

### LocalAgent と MultiAgent 型のエクスポート ([#683](https://github.com/strands-agents/sdk-typescript/pull/683))
- プラグイン作成者向けに `LocalAgent` と `MultiAgent` 型が正しくエクスポートされるようになりました

### マルチエージェント入力型の絞り込み ([#684](https://github.com/strands-agents/sdk-typescript/pull/684))
- マルチエージェントの入力型から `Message[]` と `MessageData[]` が除外され、より厳密な型チェックが可能になりました

### エクスポート型バグ修正 ([#674](https://github.com/strands-agents/sdk-typescript/pull/674))
- 一部の型のエクスポートに関するバグが修正されました

### モデルエラー上書きの修正 ([#680](https://github.com/strands-agents/sdk-typescript/pull/680))
- `maxTokens` エラーと構文エラーが同時に発生した際に、構文エラーが無視される問題が修正されました

### File Editor の replace バグ修正 ([#688](https://github.com/strands-agents/sdk-typescript/pull/688))
- ファイルエディターツールの置換機能のバグが修正されました

### エージェントリトライ時の引数渡しバグ修正 ([#687](https://github.com/strands-agents/sdk-typescript/pull/687))
- エージェントのリトライ時に同一の引数が正しく渡されない問題が修正されました

## まとめ

このリリースでは、A2A プロトコルサポート、Plugin システム、Bedrock プロンプトキャッシング、OpenTelemetry メトリクス出力など、多数の重要な新機能が追加されました。`agentId` から `id` へのリネームと HookProvider から Plugin への移行という破壊的変更があるため、アップグレード時には移行作業が必要です。
