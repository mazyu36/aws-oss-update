---
title: "AgentCore Python SDK v1.14.0 リリース解説"
version: "v1.14.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-06-05
summary: "Runtime にインタラクティブシェルサポートが追加されました。WebSocket ベースの PTY セッションを通じて、エージェント VM 内で対話的なコマンド実行が可能になります。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.14.0"
---

## 概要

このリリースでは、Runtime にインタラクティブシェルサポート（invoke runtime shell API）が追加されました。WebSocket ベースの PTY セッションを通じて、エージェント VM 内で対話的なコマンド実行が可能になり、再接続やマルチ認証方式（SigV4、Presigned URL、OAuth）にも対応しています。

**リリース:** [v1.14.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.14.0)

## 新機能

### Runtime インタラクティブシェルサポート ([#505](https://github.com/aws/bedrock-agentcore-sdk-python/pull/505))

**この機能でできること:**
- エージェント VM 内で動作する PTY セッションに WebSocket 経由で接続し、対話的にコマンドを実行できる
- ネットワーク切断時の自動再接続、複数の認証方式、フレームベースの双方向通信に対応

**新規サブパッケージ: `runtime/shell/`**

| モジュール | 役割 |
|-----------|------|
| `session.py` | `ShellSession` - 接続・送信・フレーム反復・再接続を扱う非同期コンテキストマネージャ |
| `protocol.py` | `ShellFramer` - バイナリチャネルプレフィックス方式（Kubernetes `v5.channel.k8s.io`）のエンコード／デコード |
| `auth.py` | `AuthMode` ユニオン - `"sigv4"`（デフォルト）、`PresignedAuth`、`OAuthAuth` |
| `config.py` | `ReconnectConfig` - バックオフパラメータ、再接続ウィンドウ、コールバック |
| `_validation.py` | ARN パースと `shell_id` の文字種バリデーション |

**`AgentCoreRuntimeClient` への追加メソッド:**

| メソッド | 用途 |
|---------|------|
| `open_shell()` | メインエントリーポイント。`ShellSession` を返す |
| `connect_shell()` | SigV4 URL とヘッダーを返す（生 WebSocket 利用向け） |
| `connect_shell_presigned()` | 署名済み `wss://` URL を返す |
| `connect_shell_oauth()` | URL とサブプロトコルリストを返す（ブラウザクライアント向け） |

**使用例:**

```python
import asyncio
from bedrock_agentcore.runtime import AgentCoreRuntimeClient
from bedrock_agentcore.runtime.shell import ReconnectConfig


async def main():
    client = AgentCoreRuntimeClient(region_name="us-east-1")

    # SigV4 認証（デフォルト）でシェルセッションを開く
    # shell_id と session_id は自動生成され、再接続時も同じ VM にルーティングされる
    async with client.open_shell(
        runtime_arn="arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/my-agent",
        auth="sigv4",
        reconnect=ReconnectConfig(
            max_retries=5,            # 内側ループの最大リトライ回数
            reconnect_window=300,     # 再接続を試みる総時間（秒）
        ),
    ) as shell:
        # コマンドを送信（STDIN チャネル）
        await shell.send_stdin(b"ls -la\n")

        # サーバーからのフレームを反復取得
        async for frame in shell:
            if frame.channel == "STDOUT":
                print(frame.data.decode(), end="")
            elif frame.channel == "STDERR":
                print(frame.data.decode(), end="", flush=True)

        # ループ終了後、終了 STATUS フレームから exit_code が設定される
        print(f"Shell exited with code: {shell.exit_code}")

        # 接続が中断され、再接続して復帰した場合は True
        if shell.reconnected:
            print("Session was reconnected during run")


asyncio.run(main())
```

**Presigned URL を使った認証（別プロセスへのハンドオフ）:**

```python
from bedrock_agentcore.runtime.shell import PresignedAuth

# Presigned URL を生成（生成プロセスと利用プロセスを分離可能）
url = client.connect_shell_presigned(
    runtime_arn="arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/my-agent",
    expires_in=3600,
)

# 別プロセスで PresignedAuth を渡してセッションを開く
async with client.open_shell(
    runtime_arn="arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/my-agent",
    auth=PresignedAuth(url=url),
) as shell:
    ...
```

**OAuth Bearer Token を使った認証（ブラウザクライアント向け）:**

```python
from bedrock_agentcore.runtime.shell import OAuthAuth

async with client.open_shell(
    runtime_arn="arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/my-agent",
    auth=OAuthAuth(token="<bearer-token>"),
) as shell:
    # OAuth トークンは Sec-WebSocket-Protocol サブプロトコル経由で送信される
    ...
```

**ポイント:**
- **ワイヤープロトコル**: フレームは Kubernetes `v5.channel.k8s.io` のバイナリプレフィックス方式（先頭 1 バイトでチャネル種別を識別）。STDIN／STDOUT／STDERR／STATUS／RESIZE／CLOSE などのチャネルが用意されている
- **自動 ID 生成**: `ShellSession.__init__` で `shell_id`（PTY 名）と `session_id`（VM ルーティング先）の安定した UUID を事前生成するため、再接続時も同じ VM に確実にルーティングされる
- **2 層の再接続ロジック**: 内側ループはジッター付き指数バックオフで `max_retries` 回までリトライし、外側ループは `reconnect_window` が満了するまでサイクルを継続
- **graceful vs abrupt close**: `__aexit__` は CLOSE フレームを送信して PTY を終了させる。一方、ネットワーク中断時は `_ws = None` となり CLOSE フレームをスキップするため、PTY を生かしたまま再接続できる
- **kicked 検出**: クローズコード `4000` が返された場合、`shell.kicked = True` がセットされ、自動再接続は抑止される
- **終了コード取得**: `async for` ループが完了すると、終了 STATUS フレームから `shell.exit_code` が設定される
- **依存関係**: ランタイム依存に `websockets>=13.0` が追加されている（バイナリフレーム WebSocket プロトコル用）

## まとめ

Runtime にインタラクティブシェルサポートが追加され、エージェント VM への対話的アクセスを SigV4／Presigned URL／OAuth の各認証方式で実現できるようになりました。再接続機構と PTY セッションの永続化により、長時間のシェル操作を安定して扱えます。
