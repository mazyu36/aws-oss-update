---
title: "sdk-typescript v0.5.0"
version: "v0.5.0"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2026-03-04
summary: "マルチエージェントオーケストレーションの基盤コンポーネント、OpenTelemetry ベースのテレメトリ機能、構造化出力のインボケーションごとのオーバーライドが追加されました。AgentState から AppState への破壊的変更を含みます。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.5.0"
---

## 概要

このリリースでは、マルチエージェントオーケストレーションのための基盤コンポーネント、OpenTelemetry ベースのテレメトリ機能、構造化出力のインボケーションごとのオーバーライド機能が追加されました。また、`AgentState` から `AppState` への名前変更という破壊的変更が含まれています。

**リリース:** [v0.5.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.5.0)

## 新機能

### マルチエージェントオーケストレーション基盤コンポーネント ([#574](https://github.com/strands-agents/sdk-typescript/pull/574))

**この機能でできること:**
- Graph オーケストレーションパターンをサポートするための基盤コンポーネントが追加されました
- ノード間の関係を定義する Edge、実行進捗を伝播するストリーミングイベントシステム、並列ノード実行を調整する非同期キューが利用可能になりました

**使用例:**

```typescript
import {
  Status,              // PENDING | EXECUTING | COMPLETED | FAILED | CANCELLED
  NodeState,           // ノードごとの実行状態
  NodeResult,          // 単一ノード実行の結果
  MultiAgentResult,    // マルチエージェント実行の集約結果
  MultiAgentState,     // ノードごとの追跡を含む共有状態
  Edge,
  EdgeDefinition,
  EdgeHandler,
  NodeStreamUpdateEvent,     // ノードからの内部ストリーミングイベントをラップ
  NodeResultEvent,           // ノード完了時に発行
  MultiAgentHandoffEvent,    // ノード間遷移時に発行
  MultiAgentResultEvent,     // 集約結果を含む最終イベント
} from '@strands-agents/sdk/multiagent'
```

**ポイント:**
- `Status` で実行ライフサイクルの状態を追跡できます
- `Edge` でノード間の関係と遷移ロジックを定義できます

---

### マルチエージェントオーケストレーション拡張機能 ([#589](https://github.com/strands-agents/sdk-typescript/pull/589))

**この機能でできること:**
- ネストされたオーケストレーション構成、ライフサイクルフック、キューのバックプレッシャーをサポートします
- 任意のマルチエージェントオーケストレーターをグラフノードとしてラップできます

**使用例:**

```typescript
import { MultiAgentBase, MultiAgentNode } from '@strands-agents/sdk/multiagent'

// MultiAgentBase インターフェースでオーケストレーターを定義
const orchestrator: MultiAgentBase = {
  id: 'my-orchestrator',
  invoke: async (input) => { /* ... */ },
  stream: async function* (input) { /* ... */ },
}

// オーケストレーターをグラフノードとしてラップ
const node = new MultiAgentNode({ orchestrator: innerGraph })

// Graph でのネスト構成例
const graph = new Graph({
  nodes: [
    { type: 'multiAgent', orchestrator: innerGraph },
    { type: 'agent', agent }
  ],
  edges: [{ source: 'a', target: 'g' }]
})
```

**ライフサイクルフックイベント:**

```typescript
import {
  MultiAgentInitializedEvent,      // オーケストレーター初期化後
  BeforeMultiAgentInvocationEvent, // 実行全体の前
  AfterMultiAgentInvocationEvent,  // 実行全体の後
  BeforeNodeCallEvent,             // ノード実行前（cancel でスキップ可能）
  AfterNodeCallEvent,              // ノード実行後
} from '@strands-agents/sdk/multiagent'
```

**キューのバックプレッシャー:**

```typescript
// Fire-and-forget
queue.push(data)

// バックプレッシャー: コンシューマーが処理して ack するまで待機
await queue.send(data)

// コンシューマー側
const entry = queue.shift()
// ... entry.data を処理 ...
entry.ack()
```

**ポイント:**
- `MultiAgentState.user` でフック、エッジハンドラー、カスタムノードからアクセス可能なユーザー定義ストレージを利用できます
- `BeforeNodeCallEvent` で `cancel` を呼び出すことでノードの実行をスキップできます

---

### OpenTelemetry ベースのテレメトリ機能 ([#579](https://github.com/strands-agents/sdk-typescript/pull/579))

**この機能でできること:**
- エージェントの実行をトレースし、Jaeger や Zipkin などの OpenTelemetry 互換のバックエンドにスパンをエクスポートできます
- エージェントループの各サイクル、ツール呼び出し、MCP 操作などの詳細なトレーシングが可能です

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

// トレーサープロバイダーのセットアップ
const provider = new NodeTracerProvider()
provider.addSpanProcessor(
  new SimpleSpanProcessor(
    new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' })
  )
)
provider.register()

// エージェントの実行（自動的にトレースされる）
const agent = new Agent({ model })
const result = await agent.invoke('Hello')
```

**ポイント:**
- エージェントスパン、サイクルスパン、ツールスパンが自動的に作成されます
- 構造化出力との連携もサポートされています
- `examples/telemetry` ディレクトリに Docker Compose を使用したサンプルが含まれています

---

### 構造化出力のインボケーションごとのオーバーライド ([#596](https://github.com/strands-agents/sdk-typescript/pull/596))

**この機能でできること:**
- `invoke()` や `stream()` の呼び出しごとに構造化出力スキーマをオーバーライドできます
- コンストラクタで設定したデフォルトスキーマを上書きせずに、特定の呼び出しでのみ別のスキーマを使用できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'
import { z } from 'zod'

const defaultSchema = z.object({
  summary: z.string(),
})

const overrideSchema = z.object({
  agentName: z.string(),
  message: z.string(),
  context: z.record(z.unknown()),
})

const agent = new Agent({
  model,
  structuredOutputSchema: defaultSchema,
})

// 単一の呼び出しで構造化出力スキーマをオーバーライド
const result = await agent.invoke('Analyze this', {
  structuredOutputSchema: overrideSchema,
})

// 次の呼び出しはコンストラクタのスキーマを使用
const result2 = await agent.invoke('Follow up')
```

**ポイント:**
- Swarm オーケストレーションでエージェント間のハンドオフ決定に構造化出力を使用する際に便利です
- Python SDK の `Agent.__call__()` の `structured_output_model` パラメータと同等の機能です

---

### AgentState から AppState への名前変更 ([#591](https://github.com/strands-agents/sdk-typescript/pull/591))

**この機能でできること:**
- `AgentState` が `AppState` に名前変更され、アプリ定義のストレージであることが明確になりました
- マルチエージェントモジュールでも `MultiAgentState.app` として同じ概念を再利用できます

**使用例:**

```typescript
import type { AppState } from '@strands-agents/sdk'

const agent = new Agent({ state: { userId: 'user-123' } })
agent.state // AppState
```

**ポイント:**
- ツールやアプリケーションロジックからアクセス可能なキーバリューストアです
- 単一エージェントの `Agent.state` とマルチエージェントの `MultiAgentState.app` の両方で統一的に使用されます

## 破壊的変更

### AgentState から AppState への名前変更 ([#591](https://github.com/strands-agents/sdk-typescript/pull/591))

`AgentState` クラスが `AppState` に名前変更されました。後方互換性のエイリアスは提供されていません。

**変更前:**
```typescript
import type { AgentState } from '@strands-agents/sdk'

const agent = new Agent({ state: { userId: 'user-123' } })
agent.state // AgentState
```

**変更後:**
```typescript
import type { AppState } from '@strands-agents/sdk'

const agent = new Agent({ state: { userId: 'user-123' } })
agent.state // AppState
```

**移行方法:**
- コード内の `AgentState` への参照をすべて `AppState` に置き換えてください
- インポート文とタイプアノテーションの両方を更新する必要があります

## バグ修正

### イベントループからエージェントループへの名前変更 ([#570](https://github.com/strands-agents/sdk-typescript/pull/570))
- 内部の命名規則を「event loop」から「agent loop」に統一しました
- テレメトリ実装との整合性を確保するための変更です

### Rollup の固定バージョン削除 ([#584](https://github.com/strands-agents/sdk-typescript/pull/584))
- セキュリティ修正を含む Rollup の安全なバージョンを使用できるようになりました
- [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) の脆弱性に対応

### ビルドエラーの修正 ([#599](https://github.com/strands-agents/sdk-typescript/pull/599))
- multiagent モジュールのインポートエラーを修正し、ビルドが正常に完了するようになりました

### docstring の修正 ([#598](https://github.com/strands-agents/sdk-typescript/pull/598))
- docstring 内の不正な形式のタグを修正しました

## まとめ

このリリースでは、マルチエージェントオーケストレーションの基盤となるコンポーネント、OpenTelemetry テレメトリ、構造化出力のインボケーションごとのオーバーライドが追加され、より高度なエージェントアプリケーションの構築が可能になりました。`AgentState` から `AppState` への名前変更は破壊的変更となりますので、アップグレード時にはコードの更新が必要です。
