---
title: "AgentCore TypeScript SDK v0.5.0 リリース解説"
version: "v0.5.0"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-11-25
summary: "BedrockAgentCoreApp に build warmup ライフサイクルフックのサポートが追加されました。AgentCore Runtime V2 の build warmup から呼ばれる memory / disk の 2 種類の warmup を、`warmupHook` オプションで宣言的にハンドルできるようになっています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.5.0"
---

## 概要

このリリースでは、`BedrockAgentCoreApp` に `warmupHook` オプションが追加され、AgentCore Runtime V2 の build warmup ライフサイクルフックを TypeScript SDK から直接ハンドルできるようになりました。V2 Runtime が `hooksConfiguration.build.warmup` を設定している場合、ランタイムが `READY` になる前に `memory` と `disk` の 2 種類の `POST` リクエストがエージェントに送られますが、従来はこのルートを追加するために自前のサーバを書く必要がありました。本リリースにより、`BedrockAgentCoreApp` のコンフィグとしてハンドラを渡すだけでこのフックを扱えるようになっています。

**リリース:** [v0.5.0](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.5.0)

## 新機能

### `BedrockAgentCoreApp` に build warmup ライフサイクルフックを追加 ([#332](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/332))

**この機能でできること:**

- V2 Runtime の `hooksConfiguration.build.warmup` 経由で送られてくる `memory` / `disk` 2 種類の warmup 呼び出しを、`BedrockAgentCoreApp` の設定として宣言的にハンドルできます。
- モデルのロードや起動時に読むファイルの事前読み込みなど、「新しいインスタンスがセッションを受け取るまでに毎回必要になる処理」を、`READY` になる前のタイミングで実行できます。
- フック用のパスやポートを Runtime 側 (`httpPost.path` / `httpPost.port`) と揃えることで、サービングポートとは別の listener を同じプロセス内で立てて、そこで warmup を受けることもできます。

**使用例:**

```typescript
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'

let model: Model | undefined

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    process: async (request) => model!.predict(request),
  },
  warmupHook: {
    // Runtime 側の httpPost.path と揃える (1〜32 文字、^/[A-Za-z0-9._~/-]*$)
    path: '/warmup',
    // port を省略するとサービングポート上に POST ルートを生やす。
    // port を指定すると、同一プロセス内で 127.0.0.1 のみに別 listener を立てる。
    // port: 9000,
    handlers: {
      // memory warmup: すべてのセッションが必要とする状態をメモリに載せる
      memory: async () => {
        model = await loadModel()
      },
      // disk warmup: セッション開始時に読むファイルをあらかじめ warm しておく
      disk: async () => {
        await readStartupFiles()
      },
    },
  },
})

app.run()
```

**ハンドラごとの挙動:**

| リクエスト / 設定 | 結果 |
| --- | --- |
| ハンドラがある type の呼び出し | ハンドラを `await` し、`200 {"status": "ok", "type": ..., "result": "completed"}` |
| ハンドラがない type の呼び出し | `200 {"status": "ok", "type": ..., "result": "skipped"}` |
| ハンドラが reject した場合 (`Error` やそれ以外の値) | `500 {"error": ..., "type": ...}` を返し、Create / Update を失敗させる |
| ハンドラが iterator を返した場合 (例: `() => gen()`) | `500` (body が実行されないため) |
| 未知の type (正規化後に `memory` / `disk` 以外) | `200` で `result: "skipped"`。将来の type 追加で既存エージェントが落ちない設計 |
| ヘッダが欠落 / 空 | `400` |
| `handlers` のキーに `memory` / `disk` 以外 (例: `memroy` タイポ)、非関数値、非オブジェクト | コンストラクタで `Error` (構築時 fail-fast) |
| Generator function (`function*` / `async function*`) をハンドラに指定 | コンストラクタで `Error` (body が実行されないため) |
| `path` / `port` が不正 | コンストラクタで `Error`。`path` は 1〜32 文字で `^/[A-Za-z0-9._~/-]*$`、canonical 形式。`port` は 8000〜12000 の整数 |
| フックのルートがそのポートの既存ルートと衝突 (例: `POST /invocations`) | コンストラクタで `Error` |
| `port` がサービングポートと同じで path 衝突 | `app.run()` で `Error`、プロセスは exit code 1 で終了 |
| `port` がサービングポートと異なる | `127.0.0.1` のみで listen する別 listener を同一プロセスに起動 (`app.run()` 内でサービングポートより先に up する) |
| `warmupHook` 未指定 | 追加ルートなし、従来挙動と同じ |

**ポイント:**

- **ハンドラは必ず async に書く**: SDK はハンドラをイベントループ上で実行し、別スレッドには逃がしません。CPU バウンドな処理を同期的にブロックすると、warmup 中の `/ping` ヘルスチェックが返らなくなる可能性があるため、重い処理は worker thread や子プロセスに逃がして `await` する形にしてください。
- **呼び出しが重ならない**: 各フックルートは Mutex を持っており、同一フックに対する `memory` / `disk` の並行呼び出しは直列化されます。別ポートの別フックを立てた場合は、フック同士は並列に動きます。
- **型エクスポート**: `HookConfig` / `WarmupType` (`'memory' | 'disk'`) / `WarmupHandler` / `WarmupHookConfig` が `bedrock-agentcore/runtime` からエクスポートされているため、ハンドラや設定を独自の関数に切り出して渡す場合に型を使えます。
- **1 プロセス = 1 回の warmup**: `memory` 呼び出しは 1 プロセスにしか届かないため、worker プロセスを複数動かすセットアップでは 1 つしか暖まらない点に注意してください。
- **Python SDK との差分**: API シェイプ、レスポンスボディ、バリデーションメッセージは Python SDK と揃っていますが、TypeScript 版は async 専用で、`port` が最初からサポートされており、起動は `app.run()` 経由のみです。
- **`hooksConfiguration` との整合**: ランタイム側の `httpPost.path` / `httpPost.port` と、`warmupHook.path` / `warmupHook.port` の両方を揃える必要があります。片方だけ指定すると warmup 呼び出しが 404 / connect error になり、Create / Update が失敗します。

## まとめ

`BedrockAgentCoreApp` に `warmupHook` が追加されたことで、AgentCore Runtime V2 の build warmup ライフサイクルを TypeScript エージェントから正式にハンドルできるようになりました。モデルのプリロードや起動時ファイルの事前読み込みを `READY` 前に済ませたいワークロードでは、これまでの自前サーバ実装を置き換えるかたちで導入できます。
