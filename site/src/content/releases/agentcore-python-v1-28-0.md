---
title: "AgentCore Python SDK v1.28.0 リリース解説"
version: "v1.28.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-11-25
summary: "AgentCore Runtime の build warmup ライフサイクルフックに対応する @app.warmup デコレータが追加されました。V2 ランタイムが READY になる前に memory / disk の warmup 処理を実行でき、/ping の応答性を保ったまま重い初期化処理を前倒しできます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.28.0"
---

## 概要

このリリースでは、AgentCore Runtime の build warmup ライフサイクルフックに対応する `@app.warmup` デコレータが `BedrockAgentCoreApp` に追加されました。V2 ランタイムで `hooksConfiguration.build.warmup` を設定すると、ランタイムが `READY` になる前に `memory` と `disk` の 2 種類の warmup 呼び出しが順に送信され、モデルのロードやファイルの先読みといった重い初期化処理を前もって実行できます。SDK 側で `/ping` の応答性維持、ヘッダーの解析、エラーのステータスコードへのマッピングを自動で面倒見てくれるため、エージェント側はビジネスロジックに集中できます。

**リリース:** [v1.28.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.28.0)

## 新機能

### `@app.warmup` デコレータの追加 ([#754](https://github.com/aws/bedrock-agentcore-sdk-python/pull/754))

**この機能でできること:**

- `BedrockAgentCoreApp` に、AgentCore Runtime の [build warmup フック](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-lifecycle-hooks.html) 用の `@app.warmup` デコレータが追加されました。V2 ランタイムで warmup を有効化すると、ランタイムが `READY` になる前に `memory` → `disk` の順で `POST` が送信され、それぞれに登録された handler が実行されます。
- `warmup_hook=HookConfig(path=..., port=...)` でフックのパス (`httpPost.path` と揃える必要あり) とポート (任意) を指定できます。ポートを指定しない場合は通常のサービングポートで `/ping` の隣に提供され、指定した場合は 8000〜12000 の範囲で `127.0.0.1` 上に別ポートとして提供されます。
- SDK 側で `X-Amzn-Bedrock-AgentCore-Runtime-Warmup-Type` ヘッダーの解析、handler のディスパッチ (sync はワーカースレッド、async は別イベントループ)、`/ping` の応答性維持、未登録タイプや未知のタイプの `skipped` 応答、エラー時の 500 応答、ジェネレータ handler の登録拒否までを面倒見ます。

**使用例 — 基本:**

```python
from bedrock_agentcore import BedrockAgentCoreApp, HookConfig, WarmupType

# warmup_hook を指定すると、その path で warmup エンドポイントが有効になる
# httpPost.path と同じパスを指定する必要がある
app = BedrockAgentCoreApp(warmup_hook=HookConfig(path="/warmup"))

@app.warmup(WarmupType.MEMORY)
def load_model():
    # セッションごとに必要なモデル等をプロセスに読み込む
    # (ここで読んだものがウォーム起動後の各セッションで使える)
    ...

@app.warmup(WarmupType.DISK)
def read_startup_files():
    # セッション開始時に読むファイルを先読みしてページキャッシュに載せる
    # 効果は build ログに現れるが invoke レスポンスには載らない
    ...

@app.entrypoint
def invoke(payload):
    ...

if __name__ == "__main__":
    app.run()
```

**使用例 — 別ポートで warmup を公開する:**

```python
from bedrock_agentcore import BedrockAgentCoreApp, HookConfig, WarmupType

# エージェントが独自のサーバーを 8080 で動かしていて
# warmup だけ別ポートで待ち受けたい場合
# httpPost.port と HookConfig.port は一致させる必要がある
app = BedrockAgentCoreApp(
    warmup_hook=HookConfig(path="/warmup", port=9000),  # 8000〜12000 の範囲
)

@app.warmup(WarmupType.MEMORY)
async def load_model():
    # async def でも OK (sync はワーカースレッド、async は別イベントループで実行される)
    ...

# 別ポートを使う場合は app.run() で起動する必要がある
# (uvicorn module:app で起動するとエラーで停止する)
if __name__ == "__main__":
    app.run()
```

**挙動の一覧:**

| リクエスト / 登録 | 結果 |
| --- | --- |
| handler を登録済みのタイプへの呼び出し | handler を実行し `200 {"status": "ok", "type": ..., "result": "completed"}` |
| handler 未登録のタイプへの呼び出し | `200 {"status": "ok", "type": ..., "result": "skipped"}` |
| handler が例外を送出 | `500 {"error": ..., "type": ...}`、create / update が失敗 |
| sync handler が awaitable を返した | `500` (「async def で宣言してください」) |
| handler がジェネレータを返した | `500` (`yield` に言及)、ジェネレータ本体は実行されずクローズされる |
| SDK がまだ知らないタイプ (例: `cpu`) | `200 skipped` + `unknown type, nothing to do` のログ |
| ヘッダーが欠落 / 空 | `400 {"error": "X-Amzn-Bedrock-AgentCore-Runtime-Warmup-Type header is missing or empty"}` |
| ジェネレータ関数 (`def` / `async def` + `yield`) の登録 | デコレータ適用時に `ValueError` |
| 未知タイプの登録 / 同じタイプの重複登録 / `warmup_hook=None` で登録 | デコレータ適用時に `ValueError` |
| サービングポートで既に提供中のパス (例: `POST /invocations`) | `BedrockAgentCoreApp` 生成時 (または `app.run()` 時) に `ValueError` |
| 無効なパス、または 8000〜12000 の範囲外のポート (`int` 以外や `bool` 含む) | `HookConfig` 生成時に `ValueError` |

**ポイント:**

- **`/ping` を止めない:** sync handler はワーカースレッド、async handler は別イベントループで実行されるため、重い warmup 実行中も `/ping` が `Healthy` を返し続けます (結合テストでは 1.5 s ブロックする handler の裏で `/ping` が 0.5 s 未満で応答することを確認)。
- **呼び出しは重ならない:** 各フックは独自の `asyncio.Lock` を持ち、同じタイプへの重複呼び出しは直列化されます。
- **未知タイプは skip、将来互換:** サービス側に第 3 の warmup タイプが追加されても、このバージョンでビルドしたエージェントは `skipped` を返して create / update に通過します。
- **ジェネレータは明確に拒否:** `yield` を含む関数は handler として実行されても本体が走らないため、登録時点で `ValueError` にして気付けるようになっています。`functools.partial` でくるんだケースや `__call__` がジェネレータのクラスも検知します。
- **`HookConfig.port` の制約:** 指定したポートは `127.0.0.1` のみでリッスンし (アプリ本体が `0.0.0.0` でも同様)、起動は `app.run()` 経由でないと動きません。`uvicorn module:app` で起動した場合は「`only served by app.run(); …`」のメッセージで exit code 3 で終了し、`lifespan="off"` と組み合わせた場合は `503` を返します。
- **`httpPost.path` と `HookConfig.path` は揃える:** SDK がデフォルトパスを持たないのは、サービス側 API も `path` を必須としているためです。双方に書かせることで、ずれていればすぐ気付けます。
- **worker プロセスには注意:** `uvicorn --workers N` のように複数プロセスで動かすと、warmup 呼び出しは 1 プロセスにしか届かないため、残りのワーカーはウォームアップされません。
- **後方互換性:** `warmup_hook` はキーワード引数で既定値 `None` のため、既存のアプリに影響はありません。

## まとめ

`@app.warmup` デコレータの追加により、モデルのロードやファイルの先読みといった重い初期化処理を V2 ランタイムが `READY` になる前に前倒しでき、初回呼び出しのレイテンシを大幅に抑えられるようになりました。SDK 側で `/ping` の応答性維持、ヘッダー解析、エラーハンドリングを包括的にケアしてくれるため、エージェント側は `@app.warmup(WarmupType.MEMORY)` / `@app.warmup(WarmupType.DISK)` に関数を登録するだけで済みます。AgentCore Runtime の V2 プラットフォームを利用しているアプリケーションは、積極的に取り入れると良いでしょう。
