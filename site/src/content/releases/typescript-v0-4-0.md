---
title: "Strands TypeScript SDK v0.4.0 リリース解説"
version: "v0.4.0"
repository: "sdk-typescript"
repositoryDisplayName: "Strands TypeScript SDK"
releaseType: "stable"
date: 2026-02-25
summary: "Zod スキーマによる構造化出力、セッション管理ストレージ、Message/ContentBlock のシリアライゼーション、スナップショット API、ストリームイベントの統一ラッパー、マルチエージェントオーケストレーションプリミティブを追加した機能豊富なリリースです。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.4.0"
---

## 概要

このリリースでは、エージェント開発における主要な機能が多数追加されました。Zod スキーマを使用した構造化出力のサポート、セッション管理のためのストレージレイヤー、Message と ContentBlock のシリアライゼーション対応、低レベルスナップショット API、ストリームイベントの HookEvent ラッパー統一、そしてマルチエージェントオーケストレーションの基盤となるノードプリミティブが実装されています。

**リリース:** [v0.4.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.4.0)

## 新機能

### Zod スキーマによる構造化出力サポート ([#402](https://github.com/strands-agents/sdk-typescript/pull/402))

**この機能でできること:**
- LLM の出力を Zod スキーマで定義した型安全な構造化データとして取得できます。バリデーションエラー時の自動リトライも含まれています。

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'
import { z } from 'zod'

const PersonSchema = z.object({
  name: z.string().describe('Full name'),
  age: z.number().describe('Age in years'),
  occupation: z.string().describe('Job title')
})

// スキーマを指定してエージェントを作成
const agent = new Agent({
  structuredOutputSchema: PersonSchema
})

const result = await agent.invoke('John Smith is a 30 year-old engineer')
console.log(result.structuredOutput)
// { name: "John Smith", age: 30, occupation: "engineer" }
```

**ポイント:**
- `structuredOutput` フィールドの型は Zod スキーマから自動推論されます
- LLM が構造化出力ツールを呼び出さない場合、自動的に `toolChoice` で強制実行されます
- Zod の refinements と transforms は JSON Schema に変換できないためサポートされていません

---

### セッション管理ストレージ実装 ([#520](https://github.com/strands-agents/sdk-typescript/pull/520))

**この機能でできること:**
- スナップショットベースの会話永続化のための、プラガブルなストレージバックエンドを提供します。ファイルシステムと S3 の実装が含まれています。

**使用例:**

```typescript
import { FileStorage, S3Storage } from '@strands-agents/sdk/session'

// ファイルシステムストレージ
const fileStorage = new FileStorage({ basePath: './sessions' })

// S3 ストレージ
const s3Storage = new S3Storage({
  bucket: 'my-bucket',
  prefix: 'sessions/',
  region: 'us-east-1'
})

// スナップショットの保存
await fileStorage.saveSnapshot({
  location: { sessionId: 'session-1', scope: { kind: 'agent', agentId: 'agent-1' } },
  snapshot: snapshotData,
  markAsLatest: true
})

// スナップショットの読み込み
const snapshot = await fileStorage.loadSnapshot({
  location: { sessionId: 'session-1', scope: { kind: 'agent', agentId: 'agent-1' } }
})
```

**ポイント:**
- `SnapshotStorage` インターフェースで独自のストレージバックエンドを実装可能
- ファイル書き込みはアトミック操作で安全性を確保
- マルチエージェントスコープ（`{ kind: 'multiAgent', multiAgentId }`）もサポート

---

### Message/ContentBlock のシリアライゼーション ([#548](https://github.com/strands-agents/sdk-typescript/pull/548))

**この機能でできること:**
- Message と ContentBlock クラスの JSON シリアライゼーション/デシリアライゼーションが可能になり、スナップショットでの永続化に対応します。

**使用例:**

```typescript
import { Message, TextBlock, ImageBlock, ToolUseBlock } from '@strands-agents/sdk'

const original = new Message({
  role: 'assistant',
  content: [
    new TextBlock('Here is the image you requested:'),
    new ImageBlock({ format: 'png', source: { bytes: imageBytes } }),
    new ToolUseBlock({ name: 'save_file', toolUseId: 'abc123', input: { path: '/tmp/out.png' } }),
  ],
})

// シリアライズ → 保存/転送 → デシリアライズ
const json = JSON.stringify(original)
const restored = Message.fromJSON(JSON.parse(json))

// バイナリデータも base64 経由でロスレスに復元
```

**ポイント:**
- `toJSON()` は `JSON.stringify()` により自動的に呼び出されます
- バイナリデータ（画像、動画、ドキュメント）は自動的に base64 エンコード/デコードされます
- Bedrock フォーマットを採用し、新しいシリアライゼーション形式の導入を回避

---

### 低レベルスナップショット API ([#560](https://github.com/strands-agents/sdk-typescript/pull/560))

**この機能でできること:**
- エージェントの状態をポイントインタイムでキャプチャし、復元するための内部スナップショット API を提供します。将来的に `Agent.takeSnapshot()` / `Agent.loadSnapshot()` として公開予定です。

**使用例:**

```typescript
import { takeSnapshot, loadSnapshot } from '@strands-agents/sdk/agent/snapshot'

// プリセットでスナップショットを取得
const snapshot = takeSnapshot(agent, { preset: 'session' })

// 特定のフィールドを指定
const snapshot = takeSnapshot(agent, { include: ['messages', 'state'] })

// プリセットから特定フィールドを除外
const snapshot = takeSnapshot(agent, { preset: 'session', exclude: ['systemPrompt'] })

// スナップショットから復元
loadSnapshot(agent, snapshot)
```

**ポイント:**
- 現在は内部 API として実装、API レビュー後に公開予定
- スナップショットフィールド: `messages`, `state`, `conversationManagerState`, `systemPrompt`
- `StateSerializable` インターフェースでミュータブルな状態コンテナのシリアライゼーションをサポート

---

### エージェントストリームのイベントラッパー統一 ([#544](https://github.com/strands-agents/sdk-typescript/pull/544))

**この機能でできること:**
- `agent.stream()` から yield されるすべてのイベントが `HookEvent` でラップされ、一貫した構造とフック可能性を提供します。

**使用例:**

```typescript
const agent = new Agent({ model })

for await (const event of agent.stream('Hello')) {
  switch (event.type) {
    case 'modelStreamObserverEvent':
      // ストリーミング中のデルタイベント
      console.log(event.event)
      break
    case 'contentBlockCompleteEvent':
      // 完成したコンテンツブロック
      console.log(event.contentBlock)
      break
    case 'toolResultEvent':
      // ツール実行結果
      console.log(event.toolResult)
      break
    case 'agentResultEvent':
      // 最終結果
      console.log(event.result)
      break
  }
}
```

**新しいイベントクラス:**
- `ContentBlockCompleteEvent` - 完成したコンテンツブロック
- `ModelMessageEvent` - 組み立て完了したモデルメッセージ
- `ToolResultEvent` - ツール実行結果
- `ToolStreamObserverEvent` - ツールストリーミング進捗
- `AgentResultEvent` - 最終エージェント結果
- `ModelStreamObserverEvent` - モデルストリーミングデルタ（旧 `ModelStreamEventHook` から改名）

---

### マルチエージェントノードオーケストレーションプリミティブ ([#547](https://github.com/strands-agents/sdk-typescript/pull/547))

**この機能でできること:**
- マルチエージェントオーケストレーション（Graph、Swarm など）の基盤となるノード抽象化を提供します。

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'
import { AgentNode, MultiAgentState, TextBlock } from '@strands-agents/sdk/multiagent'

// エージェントをノードとしてラップ
const agent = new Agent({ model })
const node = new AgentNode('summarizer', agent)
const state = new MultiAgentState()

// スナップショット/リストア分離でストリーミング実行
for await (const event of node.stream([new TextBlock('summarize this')], state)) {
  // MultiAgentNodeStreamEvent が内部イベントをラップ
  console.log(event.nodeId, event.nodeType)
}
// NodeResult（status, content, duration）を返却
```

**公開 API:**
- `Node` - 抽象基底クラス（テンプレートメソッドパターン）
- `AgentNode` - Agent インスタンスをラップするノード
- `NodeResult` - ノード実行結果
- `MultiAgentState` - マルチエージェントパターン間で共有される状態クラス
- `Status` - 実行ライフサイクル定数（`PENDING`, `EXECUTING`, `COMPLETED`, `FAILED`, `CANCELLED`）

---

## 破壊的変更

### ストリームイベントタイプの変更 ([#544](https://github.com/strands-agents/sdk-typescript/pull/544))

ストリームイベントを `type` でフィルタリングしているコードは更新が必要です。

**変更前:**
```typescript
for await (const event of agent.stream(prompt)) {
  if (event.type === 'modelContentBlockDeltaEvent') {
    // ストリーミングデルタを処理
  }
  if (event.type === 'textBlock') {
    // 完成したテキストブロックを処理
  }
  if (event.type === 'toolResultBlock') {
    // ツール結果を処理
  }
}
```

**変更後:**
```typescript
for await (const event of agent.stream(prompt)) {
  if (event.type === 'modelStreamObserverEvent') {
    // event.event でストリーミングデルタにアクセス
    const delta = event.event
  }
  if (event.type === 'contentBlockCompleteEvent') {
    // event.contentBlock で完成したブロックにアクセス
    const block = event.contentBlock
  }
  if (event.type === 'toolResultEvent') {
    // event.toolResult でツール結果にアクセス
    const result = event.toolResult
  }
}
```

**移行マッピング:**

| 変更前（生データ） | 変更後（ラップ） |
|---|---|
| `'modelContentBlockDeltaEvent'` 等 | `'modelStreamObserverEvent'` → `.event` |
| `'textBlock'` / `'toolUseBlock'` / `'reasoningBlock'` | `'contentBlockCompleteEvent'` → `.contentBlock` |
| `'toolStreamEvent'` | `'toolStreamObserverEvent'` → `.toolStreamEvent` |
| `'toolResultBlock'` | `'toolResultEvent'` → `.toolResult` |
| 生の `AgentResult` | `'agentResultEvent'` → `.result` |
| `'modelStreamEventHook'` | `'modelStreamObserverEvent'` |

---

## まとめ

v0.4.0 は TypeScript SDK にとって機能面で大きな進展となるリリースです。構造化出力、セッション管理、シリアライゼーション、スナップショット API により、エージェントの状態管理と永続化が強化されました。また、ストリームイベントの統一とマルチエージェントプリミティブの追加により、より複雑なエージェントアプリケーションの構築が可能になります。
