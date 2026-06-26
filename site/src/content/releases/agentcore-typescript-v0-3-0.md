---
title: "AgentCore TypeScript SDK v0.3.0 リリース解説"
version: "v0.3.0"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-06-25
summary: "AgentCore Runtime にインタラクティブシェル機能 (InvokeAgentRuntimeCommand) が追加され、PTY ベースのセッションを WebSocket 経由で操作できるようになりました。また Strands TypeScript SDK 向けの AgentCore Memory 統合 (experimental) も追加されています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.3.0"
---

## 概要

このリリースでは、AgentCore Runtime に対するインタラクティブシェル機能 (`InvokeAgentRuntimeCommand`) が新たに追加され、エージェント実行環境への PTY セッションを WebSocket 経由で確立できるようになりました。さらに、Strands TypeScript SDK の `MemoryManager` に組み込める AgentCore Memory 統合 (experimental) が追加され、シェル接続の自動再接続まわりも仕様準拠に修正されています。

**リリース:** [v0.3.0](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.3.0)

## 新機能

### Runtime にインタラクティブシェル機能を追加 ([#197](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/197))

**この機能でできること:**
- AgentCore Runtime に対して PTY ベースのインタラクティブシェルセッションを WebSocket 経由で確立できます。低レベル API と高レベル API の 2 層構成で、カスタム WebSocket 実装にも統合できます。

**使用例 (高レベル API: マネージドセッション):**

```typescript
import { RuntimeClient } from 'bedrock-agentcore';

const client = new RuntimeClient({ region: 'us-east-1' });

// マネージドな ShellSession を取得
const session = await client.openShell({
  agentRuntimeArn: 'arn:aws:bedrock-agentcore:...',
  // 自動再接続が有効 (指数バックオフ + 25% ジッター)
  // 30 秒ごとに RFC 6455 Ping によるキープアライブを送信
});

// PTY サイズの調整
await session.resize({ cols: 120, rows: 30 });

// 入力送信
await session.send('ls -la\n');

// 出力ストリームを async iterator として受信
for await (const chunk of session) {
  process.stdout.write(chunk);
}

// 明示的なクローズ
await session.close();
```

**使用例 (低レベル API: 認証ヘルパー):**

```typescript
import { RuntimeClient, ShellFramer, ShellChannel } from 'bedrock-agentcore';

const client = new RuntimeClient({ region: 'us-east-1' });

// SigV4 署名済みの接続パラメータを取得
const { url, headers } = await client.connectShellSigV4({
  agentRuntimeArn: 'arn:aws:bedrock-agentcore:...',
});

// プリサインド URL 方式
const presigned = await client.connectShellPresigned({ /* ... */ });

// OAuth 方式
const oauth = await client.connectShellOAuth({ /* ... */ });

// 独自の WebSocket 実装にこれらの接続パラメータを渡して使用可能
// バイナリフレームのエンコード/デコードには ShellFramer を利用
const framer = new ShellFramer();
const frame = framer.encode(ShellChannel.Stdin, Buffer.from('echo hi\n'));
```

**ポイント:**
- 高レベル API の `ShellSession` は async-iterable な PTY セッションで、`send` / `resize` / `close` をサポート
- 自動再接続は二段ループの指数バックオフ (±25% ジッター) で安定化されており、再接続を跨いでも `shellId` / `sessionId` は維持される
- WebSocket クローズコード `1000` / `1001` / `1003` / `4000` を識別して扱い、異常終了時は自動再接続を実施
- バイナリフレームのチャネル定数 (`ShellChannel`) や最大フレームサイズ (`MAX_FRAME_SIZE`) も公開されており、独自実装にも組み込みやすい

---

### AgentCore Memory の Strands 統合を追加 (experimental) ([#187](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/187))

**この機能でできること:**
- Strands TypeScript SDK の `MemoryManager` に直接プラグインできる `AgentCoreMemoryStore` を追加し、AgentCore Memory をリコール元・書き込み先として利用できるようになりました。書き込みは 1 つの `createEvent` に複数ターンをまとめて送信し、サーバー側で抽出・コンソリデーションが行われます。

**使用例:**

```typescript
import {
  AgentCoreMemoryStore,
  createAgentCoreMemoryStores,
} from 'bedrock-agentcore/experimental/memory/strands';
import { MemoryManager } from '@strands-agents/sdk';

// 単一ストアの構築
const store = new AgentCoreMemoryStore({
  memoryId: 'mem-xxxxxxxx',
  actorId: 'user-123',
  sessionId: 'session-abc',
  // 読み取りターゲット: { namespace } (完全一致プレフィックス) または { namespacePath } (サブツリー)
  namespace: 'preferences/{actorId}',
  // 書き込み制御: false (デフォルト) | true (既定 cadence) | { cadence?, filter? }
  writable: true,
  extraction: true,
});

// 複数の名前空間を扱うときは createAgentCoreMemoryStores で共通クライアントを共有
const stores = createAgentCoreMemoryStores({
  memoryId: 'mem-xxxxxxxx',
  actorId: 'user-123',
  sessionId: 'session-abc',
  namespaces: [
    { namespace: 'preferences/{actorId}', writable: true, extraction: true },
    { namespacePath: 'facts/{actorId}' },
  ],
});

const manager = new MemoryManager({ stores });
```

**ポイント:**
- 読み取りターゲットは `{ namespace }` (完全一致プレフィックス) と `{ namespacePath }` (サブツリー) の判別共用体で、`retrieveMemoryRecords` API に直接対応
- 書き込みは `createEvent` 1 回でターン群をまとめて送信し (`maxTurnsPerEvent` でチャンク化)、run 単位の `clientToken` で冪等性を確保。クライアント側の LLM 抽出パスは不要
- `createEvent` は名前空間に依存しないため、`(actorId, sessionId)` ごとに書き込み可能なストアは最大 1 つ。`assertWritableTopology` がこの制約を強制し、ハンドビルドのマルチストア構成からも呼び出し可能
- `extraction` は唯一の書き込み制御スイッチで、`boolean` または `{ cadence?, filter? }` を受け付ける (任意の Strands `ExtractionTrigger` を渡せる)
- パッケージエクスポート: `bedrock-agentcore/experimental/memory/strands`
- 依存: `@aws-sdk/client-bedrock-agentcore` `^3.1065.0`、`@strands-agents/sdk` `>=1.5.0`

---

## バグ修正

### Runtime シェルの再接続を仕様準拠に修正 ([#199](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/199))

- 再接続をソケットの `close` イベントから駆動するように変更し、`for await` ループがアクティブでなくても接続復旧が走るようになりました。同時に観測している複数の利用箇所は `_reconnectPromise` を通じて 1 つの再接続試行を共有します。
- `send()` / `resize()` が自己回復するようになりました。進行中の再接続を待ち、実際のソケット `readyState` を検証してから送信し、生の WebSocket `readyState 3` エラーではなく説明的な `Error` を投げます。
- キープアライブが「約 60 秒以内に Pong が返ってこない場合」を死活異常として扱い、ソケットを `terminate` して再接続を発動するようになりました。
- `bytesDropped` を切断ごとの値 (累積ではなく代入) に変更し、再接続ハンドシェイク中の確認フレームから読み取るようになりました。
- ソケットの `error` がリードループを起こした場合でも、認可された `close` を待ってから再接続することで、終端コード (`4000` 強制切断 / `1003` テキストフレーム) が誤って再接続でプリエンプトされる問題を解消しました。
- `connecting` フェーズもジョインガードの対象に含め、二重起動を防止しています。

エラーから close への競合状態、キープアライブによる死活検知、ドロップ後の `send()` 自己回復について、ユニットテストの回帰カバレッジが追加されています。

## まとめ

AgentCore Runtime のインタラクティブシェル機能と、Strands SDK 向けの AgentCore Memory 統合 (experimental) が追加された大きめのリリースです。シェルの自動再接続まわりも仕様準拠に強化されており、より堅牢な対話型ワークロードの実装が可能になりました。
