---
title: "sdk-python v1.12.0"
version: "v1.12.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-10-10
summary: "モジュールベースのツールローディング機能、LiteLLM の構造化出力フォールバック、MCP の EmbeddedResource サポート、SageMaker の additional_args 修正など、ツールとモデルの機能強化とバグ修正を実施。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.12.0"
---

## 概要

Strands Agents Python SDK v1.12.0 では、ツールローディングのリファクタリングとモジュールサポート、LiteLLM の構造化出力フォールバックメカニズム、MCP における EmbeddedResource 対応、SageMaker モデルの additional_args 修正など、重要な機能強化とバグ修正が含まれています。これらの改善により、ツールの柔軟性とモデルプロバイダーの互換性が大幅に向上しました。

**リリース:** [v1.12.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.12.0)

## 新機能

### ツールローディングのリファクタリングとモジュールサポート ([#989](https://github.com/strands-agents/sdk-python/pull/989))

**この機能でできること:**
- 文字列によるモジュールベースのツール指定が可能になりました。これにより、ツールを直接インポートせずに、パスで指定できるようになります。

**使用例:**

```python
from strands import Agent

# モジュールパスでツールを指定
agent = Agent(tools=["strands_tools.file_read"])

# 複数のツールを指定
agent = Agent(tools=[
    "strands_tools.file_read",
    "strands_tools.file_write",
    "strands_tools.web_search"
])

# 従来のインポート方式も引き続き動作します
from strands_tools import file_read
agent = Agent(tools=[file_read])
```

**ポイント:**
- ツールローディングのロジックが大幅に簡素化され、理解しやすくなりました
- 一部の理解しづらいメソッドは非推奨となり、v2.0 で削除予定です
- 従来のツール指定方法は引き続き完全にサポートされます

---

### LiteLLM の構造化出力フォールバック ([#957](https://github.com/strands-agents/sdk-python/pull/957))

**この機能でできること:**
- LiteLLM で構造化出力がネイティブにサポートされていないモデルや、プロキシ経由での使用時に、自動的にツールベースのアプローチにフォールバックします。これにより、モデルを変更しても既存のコードが動作し続けます。

**使用例:**

```python
from strands import Agent
from strands.models.litellm import LiteLLMModel
from pydantic import BaseModel, Field

class WeatherQuery(BaseModel):
    """天気情報のクエリ"""
    location: str = Field(description="都市名")
    unit: str = Field(description="温度単位", default="celsius")

# 構造化出力がネイティブにサポートされていないモデルでも動作
model = LiteLLMModel(
    model_id="custom-model",  # supports_response_schema=False でも OK
    api_base="https://your-proxy.com"
)

agent = Agent(model=model)

# 構造化出力を使用
result = agent.generate(
    "東京の天気を教えて",
    response_format=WeatherQuery
)
# 自動的にツールベースのアプローチにフォールバックします
```

**ポイント:**
- `supports_response_schema` が False を返す場合、自動的にツール方式にフォールバック
- LiteLLM のプロキシ使用時の問題も解決
- コードの変更なしで、異なるモデル間でポータビリティが向上

---

### MCP の EmbeddedResource サポート ([#726](https://github.com/strands-agents/sdk-python/pull/726))

**この機能でできること:**
- MCP サーバーが返す EmbeddedResource コンテンツ（特に GitHub ファイルなど）を正しく処理できるようになりました。これまで "unhandled content type" として無視されていたコンテンツが利用可能になります。

**使用例:**

```python
from strands import Agent
from strands.tools.mcp import MCPClient

# GitHub MCP サーバーに接続
mcp_client = MCPClient(server_params={
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"]
})

agent = Agent(tools=[mcp_client])

# GitHub ファイルの内容を取得（EmbeddedResource として返される）
response = agent(
    "このファイルの内容を取得してください: "
    "https://github.com/org-name/repo-name/blob/main/README.md"
)
print(response)
# ファイルの内容が正しく表示されます
```

**ポイント:**
- テキストとして読み取り可能な EmbeddedResource のみ処理します
- GitHub MCP サーバーの `get_file_contents` ツールが正常に動作するようになります
- Audio コンテンツなど、他のリソースタイプのサポートは今後の拡張予定です

---

## バグ修正

### SageMaker の additional_args 修正 ([#983](https://github.com/strands-agents/sdk-python/pull/983))
- SageMakerAIModel に additional_args を dict として渡した際に `AttributeError` が発生する問題を修正
- SageMakerAIPayloadSchema の additional_args がリクエストボディに正しく含まれるように修正
- endpoint_config と payload_config の型定義を適切な TypedDict に修正

---

## まとめ

v1.12.0 は、ツールの柔軟性とモデルプロバイダーの互換性を向上させる重要なリリースです。モジュールベースのツールローディング、LiteLLM の自動フォールバック、MCP の EmbeddedResource サポート、SageMaker の修正により、より堅牢で使いやすい SDK になりました。
