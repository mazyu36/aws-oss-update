---
title: "sdk-python v1.31.0"
version: "v1.31.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-03-19
summary: "A2A リクエストコンテキストへのアクセス、OpenAI 2.x サポートなど新機能を追加。S3SessionManager のキー問題、Graph のエッジ評価、OpenAI ツールメッセージ形式など複数のバグ修正も含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.31.0"
---

## 概要

このリリースでは、A2A サーバー経由でのリクエストコンテキストメタデータへのアクセスが可能になりました。また、OpenAI 依存関係が 2.x まで拡張され、LiteLLM との互換性が向上しています。S3SessionManager のキー生成問題、Graph のエッジ評価ロジック、OpenAI 互換エンドポイントでのツールメッセージ形式など、複数の重要なバグ修正も含まれています。

**リリース:** [v1.31.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.31.0)

## 新機能

### A2A リクエストコンテキストへのアクセス ([#1854](https://github.com/strands-agents/sdk-python/pull/1854))

**この機能でできること:**
- A2A サーバー経由で呼び出された際に、リクエストコンテキスト（メタデータ、タスク ID、設定など）にツールやフックからアクセス可能に

**使用例:**

```python
from strands import tool
from strands.tools import ToolContext

@tool
def my_tool(input: str, tool_context: ToolContext) -> str:
    # A2A リクエストコンテキストにアクセス
    a2a_context = tool_context.invocation_state.get("a2a_request_context")
    if a2a_context:
        metadata = a2a_context.metadata
        task_id = a2a_context.task_id
        config = a2a_context.configuration
    return f"Processed: {input}"
```

**フックからのアクセス例:**

```python
from strands.hooks.events import BeforeToolCallEvent

def before_tool(event: BeforeToolCallEvent) -> None:
    a2a_context = event.invocation_state.get("a2a_request_context")
    if a2a_context and a2a_context.metadata.get("priority") == "high":
        logger.info("High-priority A2A request for task %s", a2a_context.task_id)
```

**ポイント:**
- `a2a_request_context` キーは A2A サーバー経由の呼び出し時のみ存在
- `RequestContext` オブジェクト全体が渡されるため、`metadata`、`task_id`、`context_id`、`configuration`、`related_tasks` など全てのプロパティにアクセス可能

---

### OpenAI 2.x サポート ([#1793](https://github.com/strands-agents/sdk-python/pull/1793))

**この機能でできること:**
- OpenAI SDK 2.x との互換性を追加し、LiteLLM の最新バージョン（SAP Generative AI Hub サポートなど）が利用可能に

**使用例:**

```python
# LiteLLM の最新バージョンで SAP Generative AI Hub を使用
from strands import Agent
from strands.models.litellm import LiteLLMModel

model = LiteLLMModel(model_id="sap/gpt-4")
agent = Agent(model=model)
```

**ポイント:**
- `openai` パッケージのバージョン上限が `<2.0.0` から `<3.0.0` に拡張
- `litellm`、`openai`、`sagemaker` の全ての optional dependency で適用
- OpenAI 2.0 の破壊的変更（Responses API 関連）は Strands SDK では影響なし

## バグ修正

### S3SessionManager のキー生成問題を修正 ([#1915](https://github.com/strands-agents/sdk-python/pull/1915))
- 空のプレフィックス (`prefix=""`) 使用時に先頭スラッシュが付与され、MinIO などの S3 互換バックエンドで読み取りに失敗する問題を修正
- 末尾スラッシュ付きプレフィックス (`prefix="sessions/"`) での二重スラッシュ問題も修正
- これにより、以前の会話履歴が破棄されてしまう問題が解消

### Graph のエッジ評価ロジックを修正 ([#1846](https://github.com/strands-agents/sdk-python/pull/1846))
- ノード完了時に全エッジではなく、完了したノードからの出力エッジのみを評価するよう修正
- 依存関係が完了していないノードが誤って実行される問題を解消
- パフォーマンスも `O(all_edges)` から `O(outbound_edges)` に改善

### OpenAI 互換エンドポイントでのツールメッセージ形式を修正 ([#1878](https://github.com/strands-agents/sdk-python/pull/1878))
- ツールメッセージのコンテンツを配列形式ではなく文字列形式で送信するよう修正
- Kimi K2.5、vLLM、SGLang、Ollama など多くの OpenAI 互換エンドポイントで、ツール結果が無視されモデルが幻覚を起こす問題を解消

### Graph/Swarm のマルチモーダルプロンプト永続化を修正 ([#1870](https://github.com/strands-agents/sdk-python/pull/1870))
- バイナリコンテンツ（PDF など）を含むマルチモーダルプロンプトのセッション永続化で `TypeError` が発生する問題を修正
- バイナリ値を Base64 エンコードしてシリアライズするよう修正

### OpenAI Responses API のエラーハンドリングを修正 ([#1931](https://github.com/strands-agents/sdk-python/pull/1931))
- コンテキストウィンドウオーバーフロー時に `ContextWindowOverflowException` が正しく発生するよう修正

## まとめ

v1.31.0 は A2A 統合の強化と OpenAI エコシステムとの互換性向上に加え、セッション管理やマルチエージェント機能の安定性を高める重要なバグ修正を含むリリースです。
