---
title: "bedrock-agentcore-sdk-python v1.3.3"
version: "v1.3.3"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-02-27
summary: "非同期ハンドラーを専用ワーカーイベントループで実行するように改善し、ヘルスチェックの安定性を向上。また、list_events API の max_results パラメータを修正しました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.3.3"
---

## 概要

このリリースでは、非同期ハンドラーの実行をメインの uvicorn イベントループから分離する専用ワーカーイベントループを導入しました。これにより、ブロッキングコールを含むハンドラーがヘルスチェックをブロックする問題が解決されました。また、`list_events` API の `max_results` パラメータが正しい最大値に修正されました。

**リリース:** [v1.3.3](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.3.3)

## 新機能

### 非同期ハンドラーの専用ワーカーイベントループ実行 ([#273](https://github.com/aws/bedrock-agentcore-sdk-python/pull/273))

**この機能でできること:**
- 非同期ハンドラーの実行を専用の永続的なワーカーイベントループで分離することで、メインの uvicorn イベントループへの影響を防ぎます
- `time.sleep` や同期 HTTP 呼び出しなどのブロッキングコールを含む非同期ハンドラーが `/ping` ヘルスチェックをフリーズさせ、コンテナが終了する問題を解決します

**技術的な詳細:**
- 3 種類のハンドラーディスパッチを実装:
  - 非同期ジェネレータ: `queue.Queue` 経由でブリッジ
  - 通常の非同期: `run_coroutine_threadsafe` 経由
  - 同期: `run_in_threadpool` 経由
- `contextvars` がイベントループ境界を越えて正しく伝播されます（Python 3.10+ 互換）

**使用例:**

```python
import asyncio
import time
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()

@app.handler()
async def my_async_handler(request):
    # ブロッキングコールを含む非同期ハンドラー
    # v1.3.3 以降、これが /ping ヘルスチェックをブロックしなくなりました
    time.sleep(5)  # 重い処理のシミュレーション

    # または非同期処理
    await asyncio.sleep(1)

    return {"result": "success"}

@app.handler()
async def my_streaming_handler(request):
    # 非同期ジェネレータも専用ループで実行されます
    for i in range(10):
        await asyncio.sleep(0.1)
        yield {"chunk": i}
```

**ポイント:**
- 既存のコードは変更なしでこの改善の恩恵を受けられます
- 同期ハンドラーは引き続きスレッドプールで実行されます（ワーカーループは作成されません）
- `create_task` で作成したバックグラウンドタスクはハンドラー終了後も継続して実行されます

## バグ修正

### list_events の max_results パラメータ修正 ([#285](https://github.com/aws/bedrock-agentcore-sdk-python/pull/285))

- **修正内容:** Memory クライアントの `list_events` API で `max_results` パラメータが最大値 100 に更新されました
- **影響:** スパースなメタデータイベントをフィルタリングする際に、API が複数回呼び出される問題が改善されました
- **補足:** `ListEvents` API の `maxResults` パラメータは、結果のマッチ数ではなく、スキャンされるイベント数を制限するため、適切な最大値を設定することで効率的なフィルタリングが可能になります

## まとめ

非同期ハンドラーの実行分離により、ヘルスチェックの信頼性が大幅に向上しました。コンテナ環境でのエージェント運用がより安定します。
