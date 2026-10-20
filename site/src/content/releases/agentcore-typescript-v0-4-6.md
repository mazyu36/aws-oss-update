---
title: "AgentCore TypeScript SDK v0.4.6 リリース解説"
version: "v0.4.6"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-10-19
summary: "Runtime の shell session のワイヤプロトコルが更新され、接続レイテンシの短縮と再接続時のライフサイクル改善が行われました。あわせて、再接続中に失敗した初期化で出力ストリームが終了してしまう不具合も修正されています。shell セッションの API には破壊的変更が含まれるため、既存コードの移行が必要です。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.6"
---

## 概要

このリリースでは、AgentCore Runtime の shell session で使用するワイヤプロトコルが更新され、WebSocket オープン直後からコマンドを受け付けられるようになったほか、`close()` の挙動が「切断（detach）」に変更され、再接続ウィンドウ内でセッションを再開できるようになりました。あわせて、再接続後の初期化が失敗し次回の試行で成功するケースで出力ストリームが途切れてしまう不具合も修正されています。shell セッションの一部プロパティ・コールバックシグネチャが削除・変更されており、既存コードの移行が必要です。

**リリース:** [v0.4.6](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.6)

## バグ修正

### 再接続失敗時に shell output が途切れる問題を修正 ([#291](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/291))

- WebSocket の再接続が成功したあとに shell の初期化が一度失敗し、次の試行で成功するケースがあります。この間、失敗側の STATUS が active な出力ストリームを終了させてしまい、CLI 利用者が復旧済みの shell を失うという問題がありました。
- 本修正では、連続した再接続試行の間、出力ストリームを維持するように挙動を変更しています。shell 側で明示的に exit した場合のストリーム終了は従来どおりに保持されます。
- また、接続が返るタイミングは WebSocket オープン時のままで、[#249](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/249) で削除された確認待ちは復活しません。

**影響を受けていた状況:**

- `onReconnect` 設定下で長時間稼働の shell セッションを運用し、ネットワーク瞬断などで再接続が発生したあと、1 回だけ初期化が失敗して次の試行で成功するというシーケンス。従来は復旧した shell の stdout/stderr が消えて見える状態になっていました。

## 破壊的変更

### shell session のワイヤプロトコル更新 ([#249](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/249))

shell session の接続・ライフサイクルが更新され、以下の破壊的変更が含まれます。

**変更内容:**

- **接続の高速化**: WebSocket がオープンした直後から shell が利用可能になり、従来存在した最大 10 秒程度のハンドシェイク待ちが削除されました。
- **`close()` が detach 動作に変更**: セッションを `close()` しても、サーバー側の shell プロセスは終了せず WebSocket のみ切断されます。再接続ウィンドウ内であれば同じ shell に再接続可能です。
- **プロパティ削除**: `shell.reconnected` (`boolean`) と `shell.bytesDropped` (`number`) が削除されました。参照している箇所は TypeScript のコンパイルエラーで検出されます。
- **`onReconnect` のシグネチャ変更**: `(reconnected: boolean) => void` → `() => void | Promise<void>` に変更されました。引数が無くなり、非同期ハンドラにも対応します。

**変更前:**

```typescript
const shell = await runtime.shell.connect({
  onReconnect: (reconnected: boolean) => {
    // reconnected 引数で再接続かどうかを分岐していた
    if (reconnected) {
      console.log('reconnected, bytes dropped:', shell.bytesDropped)
    }
  },
})

// close() は shell プロセスを終了させる想定だった
await shell.close()
```

**変更後:**

```typescript
const shell = await runtime.shell.connect({
  // 引数なし。同期・非同期どちらのハンドラも渡せる。
  onReconnect: async () => {
    // reconnected / bytesDropped プロパティは参照不可。
    // 再接続か初回接続かを区別する用途がある場合は、呼び出し側で
    // onReconnect の呼ばれた回数を数えるなどの対応が必要。
    console.log('reconnected')
  },
})

// close() はサーバー側の shell を終了せず detach する。
// 再接続ウィンドウ内であれば、同一セッションに再接続できる。
await shell.close()
```

**移行方法:**

- `shell.reconnected` / `shell.bytesDropped` を参照している箇所を削除し、必要なら呼び出し側で状態管理に置き換えます (例: `onReconnect` が呼ばれた回数をカウントする)。
- `onReconnect` コールバックから引数宣言 (`reconnected: boolean`) を削除します。Promise を返すシグネチャにも対応したため、非同期処理をそのまま書けます。
- 「`close()` を呼ぶと shell が完全に終了する」ことを前提にしていたコードがある場合、現在は detach 動作になるため、サーバー側のリソースライフサイクルの扱いを確認してください。再接続ウィンドウを超えた段階でサーバー側がクリーンアップします。
- 終了コードや自動再接続など、その他の shell 機能は従来どおり動作します。

## まとめ

shell session の接続レイテンシ短縮と再接続時のセッション維持により、長時間稼働のインタラクティブ用途が扱いやすくなりました。ワイヤプロトコル更新に伴う破壊的変更が含まれるため、`shell.reconnected` / `shell.bytesDropped` を参照している箇所と `onReconnect` のシグネチャを更新してください。
