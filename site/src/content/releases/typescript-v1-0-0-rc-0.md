---
title: "sdk-typescript v1.0.0-rc.0"
version: "v1.0.0-rc.0"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "prerelease"
date: 2026-03-26
summary: "1.0 リリース候補版。デフォルトモデルを Claude Sonnet 4 に更新、ツールキャンセル機能、ローカルトレースとマルチエージェントトレース、ストリーミングイベントの toJSON() サポートなど多数の新機能を追加。GeminiModel から GoogleModel へのリネーム、モデルインポートパスの変更、Swarm の自己ハンドオフ防止など破壊的変更を含みます。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v1.0.0-rc.0"
---

## 概要

TypeScript SDK の 1.0 リリース候補版です。デフォルトモデルが Claude Sonnet 4 (claude-sonnet-4-6) に更新され、ツールキャンセル機能、ローカルトレース（`AgentResult.traces`）、マルチエージェントの OpenTelemetry トレース対応など、多数の新機能が追加されました。また、`GeminiModel` から `GoogleModel` へのリネーム、モデルのインポートパス変更、`OpenAIModel` への必須 `api` フィールド追加など、1.0 に向けた破壊的変更が含まれています。

**リリース:** [v1.0.0-rc.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v1.0.0-rc.0)

## 新機能

### デフォルトモデルを Claude Sonnet 4 に更新 ([#692](https://github.com/strands-agents/sdk-typescript/pull/692))

**この機能でできること:**
- 1.0 リリースに向けて、デフォルトモデルが Claude Sonnet 4 (claude-sonnet-4-6) に更新されました
- モデル ID を明示的に指定しない場合、自動的に最新の Claude Sonnet 4 が使用されます

**使用例:**

```typescript
import { Agent, BedrockModel, AnthropicModel } from '@strands-agents/sdk'

// BedrockModel のデフォルト: global.anthropic.claude-sonnet-4-6
const bedrockAgent = new Agent({
  model: new BedrockModel(),
})

// AnthropicModel のデフォルト: claude-sonnet-4-6
const anthropicAgent = new Agent({
  model: new AnthropicModel(),
})
```

**ポイント:**
- 既存のコードでモデル ID を明示的に指定している場合は影響ありません
- BedrockModel ではグローバル推論プロファイルがデフォルトで使用されます

---

### ツールキャンセル機能 ([#696](https://github.com/strands-agents/sdk-typescript/pull/696))

**この機能でできること:**
- `BeforeToolsEvent` と `BeforeToolCallEvent` フックで `cancel` プロパティを設定し、ツール実行を阻止できます
- 危険なツールの実行をブロックしたり、条件付きでツール実行を制御できます

**使用例:**

```typescript
import { Agent, BeforeToolCallEvent, BeforeToolsEvent } from '@strands-agents/sdk'

const agent = new Agent({ model, tools })

// 特定のツールをキャンセル
agent.addHook(BeforeToolCallEvent, (event) => {
  if (event.toolUse.name === 'dangerousTool') {
    event.cancel = 'このツールは許可されていません'
  }
})

// すべてのツールをキャンセル
agent.addHook(BeforeToolsEvent, (event) => {
  event.cancel = true // デフォルトメッセージ "tool cancelled by hook" を使用
})
```

**ポイント:**
- `cancel = true` でデフォルトエラーメッセージ、`cancel = 'カスタムメッセージ'` でカスタムエラーメッセージを返せます
- キャンセルされたツールは `status: 'error'` の `ToolResultBlock` を返します
- `AfterToolCallEvent.retry` によるリトライもサポートされています

---

### ローカルトレース ([#620](https://github.com/strands-agents/sdk-typescript/pull/620))

**この機能でできること:**
- `AgentResult.traces` でエージェント実行のトレース情報にアクセスできます
- OpenTelemetry の設定なしで、サイクル、モデル呼び出し、ツール実行の階層構造とタイミングデータを取得できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'

const agent = new Agent({ model, tools })
const result = await agent.invoke('15 * 8 + 42 を計算してください')

// トレース情報にアクセス
console.log(result.traces)
// [
//   {
//     id: "a1b2c3d4-...",
//     name: "Cycle 1",
//     startTime: 1709983200000,
//     endTime: 1709983201243,
//     duration: 1243,
//     metadata: { cycleId: "cycle-1" },
//     children: [
//       { name: "stream_messages", duration: 891, ... },
//       { name: "Tool: calculator", duration: 352, ... }
//     ]
//   }
// ]
```

**ポイント:**
- トレースは常に収集され、外部のオブザーバビリティインフラなしで利用可能です
- `toJSON()` で JSON シリアライズして保存・分析できます

---

### マルチエージェントトレース ([#666](https://github.com/strands-agents/sdk-typescript/pull/666))

**この機能でできること:**
- Graph と Swarm オーケストレーターに OpenTelemetry トレーシングが追加されました
- マルチエージェント実行全体と各ノードの実行をスパンとして追跡できます

**使用例:**

```typescript
import { Swarm } from '@strands-agents/sdk/multiagent'
import { telemetry } from '@strands-agents/sdk'

// OpenTelemetry の設定
telemetry.setupTracer({ exporters: { otlp: true } })

const swarm = new Swarm({ nodes: [agentA, agentB] })
await swarm.invoke('タスクを実行')

// 出力されるスパン:
// - multiAgentSpan (オーケストレーター全体)
//   - nodeSpan (agentA の実行)
//   - nodeSpan (agentB の実行)
```

**ポイント:**
- オーケストレータータイプ、ノード ID、ステータス、所要時間、トークン使用量、エラーが記録されます
- エラー発生時もスパンライフサイクルが適切に管理されます

---

### ストリーミングイベントの toJSON() サポート ([#708](https://github.com/strands-agents/sdk-typescript/pull/708), [#741](https://github.com/strands-agents/sdk-typescript/pull/741))

**この機能でできること:**
- すべてのストリーミングイベントに `toJSON()` メソッドが追加され、SSE やWebSocket での転送時に適切なサイズでシリアライズできます
- `LocalAgent` や `MultiAgentState` などの重いオブジェクトが除外され、必要なデータのみが出力されます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'

const agent = new Agent({ model })

// SSE ストリーミング
for await (const event of agent.stream('こんにちは')) {
  // 変更前: ~54KB（エージェント全体がシリアライズ）
  // 変更後: ~100-200 bytes（必要なデータのみ）
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}
```

**ポイント:**
- `event.agent` は引き続きフック内でのアクセスに使用可能です
- エージェントレベル（16 イベント）、マルチエージェント（10 イベント）、A2A（2 イベント）すべてに対応

---

### Swarm の自己ハンドオフ防止 ([#697](https://github.com/strands-agents/sdk-typescript/pull/697))

**この機能でできること:**
- Swarm エージェントが自分自身にハンドオフすることによる無限ループを防止します
- ノードごとに自身を除外したハンドオフスキーマが動的に生成されます

**使用例:**

```typescript
import { Swarm } from '@strands-agents/sdk/multiagent'

const swarm = new Swarm({
  nodes: [agentA, agentB, agentC],
})

// agentA が実行中の場合、ハンドオフ先は agentB, agentC のみ
// 自分自身（agentA）は選択肢に表示されない
```

**ポイント:**
- 単一ノードの Swarm では `z.never().optional()` が使用され、最終応答のみ可能です
- これは破壊的変更です（詳細は「破壊的変更」セクションを参照）

## 破壊的変更

### モデルインポートパスとリネーム ([#711](https://github.com/strands-agents/sdk-typescript/pull/711))

モデルのインポートパスが `@strands-agents/sdk/models/*` に統一され、`GeminiModel` が `GoogleModel` にリネームされました。また、`OpenAIModel` に必須の `api` フィールドが追加されました。

**変更前:**
```typescript
import { BedrockModel } from '@strands-agents/sdk/bedrock'
import { OpenAIModel } from '@strands-agents/sdk/openai'
import { AnthropicModel } from '@strands-agents/sdk/anthropic'
import { GeminiModel } from '@strands-agents/sdk/gemini'

const openai = new OpenAIModel({ modelId: 'gpt-4o' })
const gemini = new GeminiModel({ modelId: 'gemini-2.5-flash' })
```

**変更後:**
```typescript
import { BedrockModel } from '@strands-agents/sdk/models/bedrock'
import { OpenAIModel } from '@strands-agents/sdk/models/openai'
import { AnthropicModel } from '@strands-agents/sdk/models/anthropic'
import { GoogleModel } from '@strands-agents/sdk/models/google'

const openai = new OpenAIModel({ api: 'chat', modelId: 'gpt-4o' })
const google = new GoogleModel({ modelId: 'gemini-2.5-flash' })
```

**移行方法:**
- インポートパスを `@strands-agents/sdk/models/*` に更新
- `GeminiModel` を `GoogleModel` にリネーム
- `OpenAIModel` に `api: 'chat'` を追加（Responses API サポート時にデフォルトが変更される予定）
- `BedrockModel` はトップレベルからのインポートも引き続き可能

---

### A2AExpressServer のインポートパス変更 ([#721](https://github.com/strands-agents/sdk-typescript/pull/721))

ブラウザ互換性のため、`A2AExpressServer` が専用のサブパスエクスポートに移動しました。

**変更前:**
```typescript
import { A2AExpressServer } from '@strands-agents/sdk/a2a'
```

**変更後:**
```typescript
import { A2AExpressServer } from '@strands-agents/sdk/a2a/express'
```

**移行方法:**
- `A2AExpressServer` のインポートパスを更新
- `A2AAgent` と `A2AServer` は `@strands-agents/sdk/a2a` から引き続きインポート可能

---

### StructuredOutputException から StructuredOutputError へ ([#709](https://github.com/strands-agents/sdk-typescript/pull/709))

`StructuredOutputException` が `StructuredOutputError` にリネームされ、メインエントリーポイントからエクスポートされるようになりました。

**変更前:**
```typescript
import { StructuredOutputException } from '@strands-agents/sdk/structured-output/exceptions'
```

**変更後:**
```typescript
import { StructuredOutputError } from '@strands-agents/sdk'
```

---

### Swarm の NodeInputOptions 導入 ([#697](https://github.com/strands-agents/sdk-typescript/pull/697))

`structuredOutputSchema` が `MultiAgentState` から削除され、`NodeInputOptions` を通じてノードごとに渡されるようになりました。これは設定情報であり、共有可変状態ではないためです。

## バグ修正

### Gemini モデルのスロットリング対応 ([#691](https://github.com/strands-agents/sdk-typescript/pull/691))
- Gemini API の `RESOURCE_EXHAUSTED` と `UNAVAILABLE` ステータスが `ModelThrottledError` として適切に処理されるようになりました
- `AfterModelCallEvent.retry` によるスロットリング回復パターンが Gemini でも利用可能に

### Swarm の maxSteps 正常終了時のエラー修正 ([#678](https://github.com/strands-agents/sdk-typescript/pull/678))
- Swarm が `maxSteps` でちょうど正常終了した場合に「swarm reached step limit」エラーがスローされる問題を修正

### 構造化出力の無限ループ修正 ([#709](https://github.com/strands-agents/sdk-typescript/pull/709))
- OpenAI モデルで構造化出力使用時に無限ループが発生する問題を修正
- 構造化出力取得後の不要なモデル呼び出しを削除し、Python SDK と同じ動作に

### スナップショットの null systemPrompt 復元 ([#704](https://github.com/strands-agents/sdk-typescript/pull/704))
- `loadSnapshot` で `null` の `systemPrompt` が正しく復元されるようになりました

### スライディングウィンドウの windowSize 0 対応 ([#716](https://github.com/strands-agents/sdk-typescript/pull/716))
- `SlidingWindowConversationManager` で `windowSize: 0` が no-op として正しく扱われるようになりました

### デフォルト OpenAI モデル ID の更新 ([#723](https://github.com/strands-agents/sdk-typescript/pull/723))
- OpenAI のデフォルトモデル ID が最新世代に更新されました

### bash ツールの永続性修正 ([#738](https://github.com/strands-agents/sdk-typescript/pull/738))
- vended bash ツールのプロセスが早期終了する問題を修正
- `FinalizationRegistry` によるエージェントのガベージコレクション時のクリーンアップを追加

### SessionManager ガードレール追加 ([#730](https://github.com/strands-agents/sdk-typescript/pull/730))
- セッション復元時に既存のメッセージが上書きされる場合に警告ログを出力
- スナップショット/セッション API の型が `Agent` から `LocalAgent` に拡張

### フックエラー時の after イベント保証 ([#737](https://github.com/strands-agents/sdk-typescript/pull/737))
- フックエラーやストリームクリーンアップ時に after イベントが確実に発火するようになりました

### slidingWindowConversationManager のユーザーメッセージ強制 ([#739](https://github.com/strands-agents/sdk-typescript/pull/739))
- スライディングウィンドウがユーザーメッセージで始まることを保証

### 内部ノードステータスの伝播 ([#726](https://github.com/strands-agents/sdk-typescript/pull/726))
- マルチエージェントの内部ノードステータスが正しく伝播されるようになりました

### ログ形式の統一 ([#698](https://github.com/strands-agents/sdk-typescript/pull/698), [#706](https://github.com/strands-agents/sdk-typescript/pull/706), [#722](https://github.com/strands-agents/sdk-typescript/pull/722))
- `console.log` の代わりに構造化ログシステムを使用するよう統一

## まとめ

TypeScript SDK 1.0 に向けた重要なリリース候補版です。デフォルトモデルの Claude Sonnet 4 への更新、ツールキャンセル機能、トレーシング機能の強化など、多くの新機能が追加されています。1.0 に向けた API の安定化として、モデルインポートパスの統一や命名規則の整理などの破壊的変更が含まれているため、アップグレード時には移行作業が必要です。
