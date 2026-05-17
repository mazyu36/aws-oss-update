---
title: "Strands TypeScript SDK v1.2.0 リリース解説"
version: "v1.2.0"
repository: "sdk-typescript"
repositoryDisplayName: "Strands TypeScript SDK"
releaseType: "stable"
date: 2026-05-14
summary: "マルチエージェント Interrupt サポート、Agent の takeSnapshot/loadSnapshot 公開 API、MCP クライアントの URL/認証フィールドとツール変更通知対応など多数の新機能を追加。コンテキストオーバーフロー検出の改善、ネイティブトークンカウントのデフォルト無効化などのバグ修正も含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v1.2.0"
---

## 概要

このリリースでは、Graph と Swarm オーケストレーターでのマルチエージェント Interrupt サポート、Agent クラスへの `takeSnapshot`/`loadSnapshot` 公開 API 追加、MCP クライアントの大幅な機能強化（URL/認証フィールド、ツール変更通知、キャンセルシグナル転送）など、多数の新機能が追加されました。また、コンテキストオーバーフロー検出パターンの統一やネイティブトークンカウントのデフォルト無効化など、重要なバグ修正も含まれています。

**リリース:** [v1.2.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v1.2.0)

## 新機能

### マルチエージェント Interrupt サポートと InterruptEvent ([#1044](https://github.com/strands-agents/sdk-typescript/pull/1044))

**この機能でできること:**
- Graph と Swarm オーケストレーターで human-in-the-loop フローを実現する Interrupt 機能が利用可能になりました
- ツールやフックコールバックから実行を一時停止し、ユーザー応答後に再開できます

**使用例:**

```typescript
import { Graph, Swarm, BeforeNodeCallEvent, Status } from '@strands-agents/sdk'

const graph = new Graph({ nodes: [agentA, agentB] })

// オーケストレーターレベルのフックで Interrupt を設定
graph.addHook(BeforeNodeCallEvent, (event) => {
  const { approved } = event.interrupt<{ approved: boolean }>({
    name: 'node_approval',
    reason: `${event.nodeId} の実行を承認しますか？`,
  })
  if (!approved) event.cancel = 'rejected'
})

// 実行して Interrupt を検出
const result = await graph.invoke('タスクを実行')
if (result.status === Status.INTERRUPTED) {
  for (const interrupt of result.interrupts!) {
    console.log(interrupt.id, interrupt.name, interrupt.source, interrupt.reason)
  }
}

// Interrupt に応答して再開
const final = await graph.invoke([
  { interruptResponse: { interruptId: interrupt.id, response: { approved: true } } }
])
```

**ポイント:**
- `NodeResult.status` と `MultiAgentResult.status` に新しい `'INTERRUPTED'` ステータスが追加
- `interrupt.source` は `'tool' | 'hook' | 'multiagent-hook'` の union 型で発生元を識別
- `SessionManager` によるプロセス境界を越えた Interrupt の保存・復元もサポート
- 新しい `InterruptEvent` でフックストリームから Interrupt を監視可能

---

### Agent の takeSnapshot/loadSnapshot 公開 API ([#1045](https://github.com/strands-agents/sdk-typescript/pull/1045))

**この機能でできること:**
- `Agent` クラスで `takeSnapshot` と `loadSnapshot` メソッドが公開され、Python SDK と同様にエージェント状態のスナップショットを直接取得・復元できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk'

const agent = new Agent({ systemPrompt: 'You are a helpful assistant' })
await agent.invoke('Hello!')

// スナップショットをキャプチャ
const snapshot = agent.takeSnapshot({ preset: 'session' })

// 作業を続行...
await agent.invoke('Tell me a joke')

// 以前の状態に復元
agent.loadSnapshot(snapshot)
```

**ポイント:**
- 新しいエクスポート: `TakeSnapshotOptions`, `SnapshotField`, `SnapshotPreset`, `SNAPSHOT_SCHEMA_VERSION`
- 内部のヘルパー関数は共有実装として残り、すべての `LocalAgent` 実装で同じロジックを使用
- `SessionManager`, `AgentAsTool`, マルチエージェントノードなどの内部呼び出しサイトもインスタンスメソッドに移行済み

---

### MCP クライアントの URL/認証フィールド対応 ([#1059](https://github.com/strands-agents/sdk-typescript/pull/1059))

**この機能でできること:**
- `McpClient` で宣言的な接続設定（`url`, `auth`, `headers` フィールド）がサポートされ、手動でトランスポートとプロバイダーを設定する必要がなくなりました

**使用例:**

```typescript
import { McpClient } from '@strands-agents/sdk'

// 以前: 手動でトランスポート + プロバイダーを設定
// const provider = new ClientCredentialsProvider({ clientId: '...', clientSecret: '...' })
// const transport = new StreamableHTTPClientTransport(url, { authProvider: provider })
// new McpClient({ transport })

// 新しい方法: OAuth クライアントクレデンシャル
new McpClient({
  url: 'https://mcp.example.com',
  auth: { clientId: '...', clientSecret: '...' }
})

// カスタムヘッダー（例: 静的 API キー）
new McpClient({
  url: 'https://mcp.example.com',
  headers: { 'X-Api-Key': '...' }
})

// カスタム認証プロバイダー（高度なフロー）
new McpClient({
  url: 'https://mcp.example.com',
  authProvider: myOAuthProvider
})
```

**ポイント:**
- `url` 指定時は StreamableHTTP トランスポートが自動構築される
- `auth` 指定時は OIDC ディスカバリーを介して OAuth トークンの取得と更新を自動処理
- `authProvider` で事前取得トークンなどカスタム OAuth フローもサポート

---

### MCP ツール変更通知の自動同期 ([#1038](https://github.com/strands-agents/sdk-typescript/pull/1038))

**この機能でできること:**
- MCP サーバーがランタイムでツールを追加・削除・変更した際に、エージェントのツールレジストリが自動的に同期されます

**使用例:**

```typescript
import { Agent, McpClient } from '@strands-agents/sdk'

const mcpClient = new McpClient({ url: 'https://mcp.example.com' })
const agent = new Agent({
  model,
  tools: [mcpClient]
})

// MCP サーバーがツールを追加/削除すると
// エージェントのツールレジストリが自動更新される
```

**ポイント:**
- MCP SDK が `notifications/tools/list_changed` を 300ms でデバウンスして処理
- 再入ガードとエラーハンドリングを実装
- 古いツールを削除し、新しいツールを追加する形で同期

---

### MCP キャンセルシグナルのサーバー転送 ([#1069](https://github.com/strands-agents/sdk-typescript/pull/1069))

**この機能でできること:**
- エージェントがツール実行中にキャンセルされた際、MCP SDK が `notifications/cancelled` をサーバーに送信し、サーバー側で不要な作業を中止できます

**使用例:**

```typescript
import { Agent, McpClient } from '@strands-agents/sdk'

const mcpClient = new McpClient({ url: 'https://mcp.example.com' })
const agent = new Agent({ model, tools: [mcpClient] })

// エージェントをキャンセルすると、MCP サーバーにもキャンセル通知が送られる
const controller = new AbortController()
agent.invoke('長時間タスク', { signal: controller.signal })

// キャンセル実行
controller.abort()
// → MCP サーバーが notifications/cancelled を受信して作業を中止
```

**ポイント:**
- `callTool` に `options?: { signal?: AbortSignal }` パラメータが追加
- `toolContext.agent.cancelSignal` が MCP ツール呼び出しに転送される

---

### SlidingWindowConversationManager のオーバーフロー処理改善 ([#1018](https://github.com/strands-agents/sdk-typescript/pull/1018))

**この機能でできること:**
- コンテキストオーバーフロー時の回復処理が改善され、ツール結果を完全に破棄するのではなく、先頭・末尾を保持した部分的な切り詰めを行います

**使用例:**

```typescript
import { Agent, SlidingWindowConversationManager } from '@strands-agents/sdk'

const agent = new Agent({
  model,
  conversationManager: new SlidingWindowConversationManager({
    windowSize: 10
  })
})

// 大きなツール結果は部分的に切り詰められる
// 例: 先頭200文字 + <truncated chars="N"/> + 末尾200文字
```

**ポイント:**
- 大きなテキスト結果は先頭・末尾 200 文字を保持し、中央に `<truncated chars="N"/>` マーカーを挿入
- 画像・動画・バイナリ/リモートドキュメントブロックはフォーマットとソースを識別するプレースホルダーに置換
- 最も古いツール結果から優先的に切り詰め、最新のコンテキストを保持
- 元の `status` と `error` フィールドは保持される

---

### AccessDeniedException のキャッシュ ([#1032](https://github.com/strands-agents/sdk-typescript/pull/1032))

**この機能でできること:**
- Bedrock の CountTokens API で `AccessDeniedException` が発生した場合、失敗をキャッシュして以降の呼び出しをスキップし、ヒューリスティックなトークン推定にフォールバックします

**使用例:**

```typescript
import { Agent, BedrockModel } from '@strands-agents/sdk'

// IAM ロールに bedrock:CountTokens 権限がない場合でも
// 最初の呼び出し後は自動的にスキップされ、パフォーマンスが向上
const agent = new Agent({
  model: new BedrockModel()
})
```

**ポイント:**
- AWS CDK L3 コンストラクトなど、`bedrock:CountTokens` が含まれていない IAM ポリシーでの利用時に有効
- `UNSUPPORTED_COUNT_TOKENS_MODELS` が `SKIP_COUNT_TOKENS_MODELS` にリネームされ、複数の失敗理由に対応

---

### ツール名の正規化 ([#1048](https://github.com/strands-agents/sdk-typescript/pull/1048))

**この機能でできること:**
- `-` と `_` の違いのみで衝突するツール名の登録を拒否します（例: `foo-bar` 登録済みの状態で `foo_bar` を登録しようとするとエラー）

**使用例:**

```typescript
import { Agent, tool } from '@strands-agents/sdk'

const fooBar = tool('foo-bar', /* ... */)
const foo_bar = tool('foo_bar', /* ... */) // ← ToolValidationError がスローされる

const agent = new Agent({
  model,
  tools: [fooBar, foo_bar] // エラー: 名前が衝突
})
```

**ポイント:**
- 一部のモデルプロバイダーがツール名の `-`/`_` を正規化または拒否するため、ローカルで一意に見える名前がリモートで衝突する可能性を防止
- Python SDK の動作と一致
- これは破壊的変更ですが、実際にはほぼすべて潜在的なバグのケース

---

### AgentMetrics のパフォーマンス改善 ([#1063](https://github.com/strands-agents/sdk-typescript/pull/1063))

**この機能でできること:**
- `AgentMetrics.totalDuration` と `averageCycleTime` が O(1) で計算されるようになり、長時間実行エージェントのパフォーマンスが向上しました

**ポイント:**
- 以前は呼び出しごとに全サイクル配列を再計算していたため、多数のリクエストを処理するエージェントで O(N²) のコストが発生
- `totalDuration` が `Meter.endCycle()` で増分的に累積されるようになり、`averageCycleTime` は単純な除算に

## バグ修正

### コンテキストオーバーフロー検出パターンの統一 ([#966](https://github.com/strands-agents/sdk-typescript/pull/966))
- Anthropic と OpenAI プロバイダーのコンテキストウィンドウオーバーフロー検出が Python SDK と統一されました
- Anthropic では追加のオーバーフローメッセージパターンを追加し、大文字小文字を区別しない照合を実装
- OpenAI では構造化された `code === "context_length_exceeded"` 処理を維持しつつ、共有オーバーフロー分類器を拡張

### useNativeTokenCount のデフォルトを false に変更 ([#1056](https://github.com/strands-agents/sdk-typescript/pull/1056))
- すべてのモデルプロバイダーで `useNativeTokenCount` のデフォルト値が `true` から `false` に変更されました
- イベントループがモデル呼び出し前に毎回 `countTokens()` を呼び出していたため、マルチモーダル/画像ワークロードで 25-50% のレイテンシが追加されていた問題を解消
- ネイティブトークンカウントは明示的なオプトイン（`useNativeTokenCount: true`）が必要に

### 構造化出力の user/assistant メッセージ順序バグ修正 ([#1049](https://github.com/strands-agents/sdk-typescript/pull/1049))
- `structuredOutputSchema` 設定時に、モデルが最初のターンでプレーンテキストを返した場合の強制リトライパスで、会話がアシスタントターンで終わる問題を修正
- Bedrock や Anthropic など、アシスタントプレフィルを許可しないプロバイダーでエラーが発生していた

### Bedrock プロバイダーのストリーミング引用修正 ([#1058](https://github.com/strands-agents/sdk-typescript/pull/1058))
- `ConverseStream` でストリーミング引用が正しく処理されるようになりました
- Bedrock は `citation` キーを使用しますが、`deltaHandlers` マップは `citationsContent` のみ定義されていたため、すべてのストリーミング引用がドロップされていた

### strands-dev CLI の Node 20 互換性修正 ([#1062](https://github.com/strands-agents/sdk-typescript/pull/1062))
- Node 22+ でのみ利用可能な `globSync` を `readdirSync` with `recursive: true` に置き換え
- プロジェクトのターゲットである Node 20 で `npm run dev -- bootstrap` が動作するように

## まとめ

TypeScript SDK v1.2.0 は、マルチエージェントワークフローでの human-in-the-loop を実現する Interrupt サポート、MCP クライアントの大幅な機能強化、パフォーマンス改善など、重要な新機能を多数含むリリースです。
