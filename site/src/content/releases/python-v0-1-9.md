---
title: "sdk-python v0.1.9"
version: "v0.1.9"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-06-24
summary: "Pydantic モデルを使用した構造化出力のサポート、OpenTelemetry メトリクスの追加、Google A2A プロトコルの統合、ストリーミング機能の改善などを含む大型アップデートです。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.1.9"
---

## 概要

このリリースでは、Pydantic モデルを使用した構造化出力のサポート、OpenTelemetry メトリクスの追加、Google A2A プロトコルの統合など、多数の新機能が追加されました。また、OpenAI モデルの画像処理の改善やストリーミング機能の強化も含まれています。

**リリース:** [v0.1.9](https://github.com/strands-agents/sdk-python/releases/tag/v0.1.9)

## 新機能

### Pydantic モデルによる構造化出力のサポート ([#60](https://github.com/strands-agents/sdk-python/pull/60))

**この機能でできること:**
Pydantic モデルを使用して、エージェントからの構造化された出力を簡単に取得できるようになりました。モデル定義から自動的にツール仕様を生成し、型安全な応答を保証します。

**使用例:**

```python
from pydantic import BaseModel, Field
from strands import Agent

# 構造化出力のためのPydanticモデルを定義
class WeatherInfo(BaseModel):
    location: str = Field(description="The location for the weather")
    temperature: float = Field(description="Temperature in Celsius")
    condition: str = Field(description="Weather condition")

# エージェントを初期化
agent = Agent(model="us.anthropic.claude-3-haiku-20240307-v1:0")

# 構造化出力を取得
result = agent.get_structured_output(
    prompt="What's the weather in Tokyo?",
    output_model=WeatherInfo
)

# 型安全なアクセス
print(f"Location: {result.location}")
print(f"Temperature: {result.temperature}°C")
print(f"Condition: {result.condition}")
```

**ポイント:**
- すべての主要モデルプロバイダー（Anthropic、Bedrock、OpenAI、LiteLLM、Ollama）で利用可能
- Pydantic の強力なバリデーション機能を活用できます
- ネストされたモデルや複雑なデータ構造にも対応

---

### OpenTelemetry メトリクスのサポート ([#219](https://github.com/strands-agents/sdk-python/pull/219))

**この機能でできること:**
OpenTelemetry メトリクスを使用して、エージェントのパフォーマンスや使用状況を監視できるようになりました。既存のトレース機能に加えて、メトリクスによる可観測性が向上します。

**使用例:**

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import (
    PeriodicExportingMetricReader,
    ConsoleMetricExporter
)
from opentelemetry.sdk.resources import Resource, ResourceAttributes
from strands import Agent

# OpenTelemetryのセットアップ
resource = Resource.create({
    ResourceAttributes.SERVICE_NAME: "strands-otel-test",
    "environment": "production"
})

console_metric_reader = PeriodicExportingMetricReader(ConsoleMetricExporter())
metrics_provider = MeterProvider(
    resource=resource,
    metric_readers=[console_metric_reader]
)
metrics.set_meter_provider(metrics_provider)

# エージェントを使用すると自動的にメトリクスが収集される
agent = Agent(model="us.anthropic.claude-3-haiku-20240307-v1:0")
response = agent.run(prompt="Hello!")
```

**ポイント:**
- グローバルな MeterProvider を設定することで、自動的にメトリクスが収集されます
- 既存のトレース機能と併用して、包括的な可観測性を実現できます
- カスタムエクスポーター（Prometheus、CloudWatch など）との統合も可能

---

### Google A2A プロトコルの統合 ([#218](https://github.com/strands-agents/sdk-python/pull/218))

**この機能でできること:**
Google の Agent-to-Agent (A2A) プロトコルを使用して、Strands エージェントを A2A サーバーとして公開できるようになりました。これにより、他のエージェントシステムとの相互運用性が向上します。

**使用例:**

```python
import logging
import sys
from strands import Agent
from strands.multiagent.a2a import A2AAgent

# ロギングの設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

# Strandエージェントを作成
strands_agent = Agent(
    model="us.anthropic.claude-3-haiku-20240307-v1:0",
    name="Hello World Agent",
    description="A simple hello world agent"
)

# A2Aエージェントとしてラップして公開
strands_a2a_agent = A2AAgent(agent=strands_agent)
strands_a2a_agent.serve()  # HTTPサーバーとして起動
```

**ポイント:**
- これは基本的な統合であり、現在は `messages` のみをサポートしています
- ネイティブ Strands ツールと MCP ツールの統合は今後のリリースで予定されています
- A2A クライアントから標準的な A2A プロトコルでアクセス可能

---

### イテレーティブストリーミング ([#241](https://github.com/strands-agents/sdk-python/pull/241))

**この機能でできること:**
`stream_messages` 関数がジェネレーターに変換され、モデルストリームの基礎イベントを yield できるようになりました。これにより、よりきめ細かなストリーミング制御が可能になります。

**使用例:**

```python
from strands import Agent

agent = Agent(model="us.anthropic.claude-3-haiku-20240307-v1:0")

# ストリーミングでモデルイベントを処理
for event in agent.stream_messages(prompt="Tell me a story"):
    # 各イベントを処理
    if event.type == "content_block_delta":
        print(event.delta.text, end="", flush=True)
    elif event.type == "message_stop":
        print("\n[Stream completed]")
```

**ポイント:**
- 非同期ストリームメソッドのサポートに向けた基盤となる機能です
- より詳細なイベント処理により、リアルタイム UI の実装が容易になります
- 既存のストリーミング API との互換性を維持しています

---

### `@tool` デコレーターの改善 ([#258](https://github.com/strands-agents/sdk-python/pull/258))

**この機能でできること:**
`@tool` デコレーターで装飾された関数が、関数として呼び出せると同時に `AgentTool` のプロパティとメソッドも持つようになりました。これにより、ツールの操作がより柔軟になります。

**使用例:**

```python
from strands.tools import tool

@tool
def calculate_sum(a: int, b: int) -> int:
    """二つの数値の合計を計算します"""
    return a + b

# 通常の関数として呼び出せる
result = calculate_sum(5, 3)  # 8

# AgentToolとしてのプロパティにもアクセスできる
print(calculate_sum.tool_spec)  # ツールの仕様を取得

# invokeメソッドでToolUseから実行
tool_use = {
    "toolUseId": "test-id",
    "input": {"a": 10, "b": 20}
}
result = calculate_sum.invoke(tool_use)  # 30
```

**ポイント:**
- ツールの統一性が向上し、将来的な `bind` などのユーティリティの追加が容易になります
- `ToolUse` を直接関数に渡すことは非推奨となり、`invoke` メソッドの使用が推奨されます
- 既存のコードとの後方互換性は維持されていますが、警告が表示される場合があります

---

## バグ修正

### OpenAI モデルでの画像データ処理の改善 ([#251](https://github.com/strands-agents/sdk-python/pull/251))

OpenAI モデルプロバイダーが、raw バイトと base64 エンコード済みバイトの両方を受け入れるようになりました。以前は base64 エンコード済みデータのみを期待していましたが、他のプロバイダー（Anthropic、Bedrock）との一貫性のために改善されました。これにより、`generate_image` ツールとの互換性の問題が解決されました。

### デフォルトリージョン変更の警告追加 ([#254](https://github.com/strands-agents/sdk-python/pull/254))

将来のリリースでデフォルトリージョンの動作が変更されることについての警告が追加されました。これにより、ユーザーは事前に準備することができます。

---

## まとめ

v0.1.9 は、構造化出力、可観測性、マルチエージェント機能など、多数の重要な機能を追加する大型アップデートです。Pydantic モデルによる型安全な出力や A2A プロトコルのサポートにより、Strands Agents の柔軟性と相互運用性が大幅に向上しました。
