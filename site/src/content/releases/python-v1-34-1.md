---
title: "sdk-python v1.34.1"
version: "v1.34.1"
repository: "python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-04-01
summary: "コンテキストウィンドウのトークン数を追跡する新機能と、テレメトリ関連のバグ修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.34.1"
---

## 概要

このリリースでは、コンテキストウィンドウのサイズ（トークン数）を追跡できる新機能が追加されました。また、テレメトリのスパン終了タイミングに関するリグレッションの修正や、型互換性の問題の解消が含まれています。

**リリース:** [v1.34.1](https://github.com/strands-agents/sdk-python/releases/tag/v1.34.1)

---

## 新機能

### コンテキストトークンの追跡 ([#2009](https://github.com/strands-agents/sdk-python/pull/2009))

**この機能でできること:**
- `EventLoopMetrics` に `latest_context_size` プロパティが追加され、モデルから報告される最新のコンテキストウィンドウサイズ（トークン数）を取得できます
- `AgentResult` に `context_size` プロパティが追加され、簡単にアクセスできます

**使用例:**

```python
from strands import Agent

agent = Agent(tools=[...])
result = agent("Do something with tools")

# AgentResult から直接取得
print(f"コンテキストサイズ: {result.context_size} トークン")

# EventLoopMetrics から取得
print(f"最新のコンテキストサイズ: {agent.event_loop_metrics.latest_context_size} トークン")
```

**ポイント:**
- この値は LLM 呼び出し後に取得できる「遅延指標」です（呼び出し前の推定値ではありません）
- 追加の API 呼び出しは不要で、LLM が返す `inputTokens` を再利用します
- コンテキスト圧縮や外部化などの機能で、閾値ベースの判断を行う際に活用できます
- 全てのプロバイダーで動作します（`Usage` TypedDict の `inputTokens` に正規化されます）

---

## バグ修正

### スパン終了タイミングのリグレッション修正 ([#2032](https://github.com/strands-agents/sdk-python/pull/2032))

- v1.24.0 以降、`execute_event_loop_cycle` スパンがサイクルごとの実際の所要時間を反映しなくなっていた問題を修正
- ツール使用で再帰呼び出しが発生した場合、親サイクルの OTel スパンが全ての再帰的な子が完了するまで開いたままになり、Langfuse や Jaeger などの可観測性バックエンドでサイクルごとのレイテンシーではなく累積レイテンシーが表示されていました
- `end_on_exit=False` に切り替え、`_end_span()` で明示的に `span.end()` を呼び出すように修正されました

### 型の非互換性を修正 ([#2018](https://github.com/strands-agents/sdk-python/pull/2018))

- `Tracer._add_system_prompt_event` で mypy の型エラーが発生していた問題を修正
- `content_blocks` 変数の型が `list[ContentBlock]` として明示的にアノテーションされるようになりました

### テスト環境での Langfuse 環境変数の分離 ([#2022](https://github.com/strands-agents/sdk-python/pull/2022))

- 開発者がローカルで Langfuse 環境変数を設定している場合にテストが失敗する問題を修正
- `moto_env` テストフィクスチャで `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` と `LANGFUSE_BASE_URL` もクリアするようになりました

---

## まとめ

コンテキストウィンドウのトークン数を追跡できる便利な機能が追加され、テレメトリ関連の重要なバグが修正されたリリースです。
