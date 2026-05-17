---
title: "AgentCore Python SDK v1.6.2 リリース解説"
version: "v1.6.2"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-04-13
summary: "OpenTelemetry の threading instrumentation との互換性問題を修正しました。opentelemetry-instrument を使用した async ハンドラーでのランタイムクラッシュが解消されました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.2"
---

## 概要

このリリースでは、OpenTelemetry の threading instrumentation と `agentcore-worker-loop` スレッドの互換性問題を修正しました。v1.3.3 以降、`opentelemetry-instrument` を Dockerfile の CMD として使用している環境で async ハンドラーを呼び出すとランタイムクラッシュが発生する問題がありましたが、本リリースで解消されました。

**リリース:** [v1.6.2](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.2)

## バグ修正

### OpenTelemetry threading instrumentation との互換性問題を修正 ([#405](https://github.com/aws/bedrock-agentcore-sdk-python/pull/405))

**修正内容:**
- `opentelemetry-instrument` を Dockerfile の CMD として使用している環境（ACO の推奨オブザーバビリティパターン）で、async ハンドラー呼び出し時に発生していたランタイムクラッシュを修正しました

**影響を受けていた状況:**
- `bedrock-agentcore >= 1.3.3` を使用
- `opentelemetry-instrument` を Dockerfile の CMD として設定（Starter Toolkit で `observability_enabled=true` を設定した場合のパターン）
- async ハンドラーを使用

**発生していたエラー:**
```
Exception in thread agentcore-worker-loop:
  File "opentelemetry/instrumentation/threading/__init__.py", line 152, in __wrap_threading_run
  File "bedrock_agentcore/runtime/app.py", line 545, in _run_worker_loop
    self._worker_loop.run_forever()
RuntimeError: Cannot run the event loop while another loop is running
```

**根本原因:**
- OpenTelemetry の `opentelemetry-instrumentation-threading` は、すべての `Thread.run()` をラップしてトレースコンテキストを親スレッドから子スレッドに伝播します
- このラッパーが親スレッドの「実行中のイベントループ」状態を子スレッドにリークしていました
- 以前は `_ensure_worker_loop` がメインスレッドでイベントループを作成し、`_run_worker_loop` がワーカースレッドで `run_forever()` を呼び出していました
- OTEL のラッパーがメインスレッドの実行中ループ状態を伝播すると、`run_forever()` が非 None の実行中ループを検出して `RuntimeError` を発生させていました

**修正内容の詳細:**
1. **`asyncio._set_running_loop(None)`** - `_run_worker_loop` の先頭で、親スレッドからリークした実行中ループ状態をクリア
2. **イベントループの作成をワーカースレッド内に移動** - `asyncio.new_event_loop()` と `asyncio.set_event_loop()` を `_run_worker_loop` 内で実行し、クロススレッド状態のリークを排除
3. **`threading.Event` による同期** - 親スレッドがワーカーループの開始を確実に待機するようになり、既存の競合状態も修正

**ポイント:**
- ACO の推奨オブザーバビリティパターン（`opentelemetry-instrument` を使用）を使用している場合、v1.3.3 以降でこの問題が発生していた可能性があります
- 本バージョンにアップデートすることで、`opentelemetry-instrument` を削除したり `OTEL_PYTHON_DISABLED_INSTRUMENTATIONS=threading` を設定したりする回避策は不要になります

## まとめ

このリリースでは、OpenTelemetry との重要な互換性問題が修正されました。ACO のオブザーバビリティ機能（CloudWatch GenAI ダッシュボードへのトレース/スパン送信）を async ハンドラーと組み合わせて使用しているユーザーは、本バージョンへのアップデートを推奨します。
