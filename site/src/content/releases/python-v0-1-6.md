---
title: "sdk-python v0.1.6"
version: "v0.1.6"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-05-30
summary: "Bedrock の非ストリーミングサポート、ドキュメント処理機能の拡張、テレメトリー設定の修正など、Python SDK の機能性と信頼性を向上させる重要な更新が含まれています。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.1.6"
---

## 概要

このリリースでは、Bedrock モデルの非ストリーミングサポート、OpenAI と LiteLLM モデルプロバイダーへのドキュメント処理機能の追加、Anthropic モデルでのプレーンテキストドキュメント処理の修正など、重要な新機能とバグ修正が含まれています。また、ツール名のバリデーションやテレメトリー設定の問題も修正されています。

**リリース:** [v0.1.6](https://github.com/strands-agents/sdk-python/releases/tag/v0.1.6)

## 新機能

### Bedrock モデルの非ストリーミングサポート ([#75](https://github.com/strands-agents/sdk-python/pull/75))

**この機能でできること:**
- BedrockModel で非ストリーミングレスポンスを取得できるようになりました。ストリーミングが不要な場合や、一度に完全なレスポンスが必要な場合に便利です。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

# 非ストリーミングモードで BedrockModel を使用
agent = Agent(
    model=BedrockModel(
        model_id="anthropic.claude-3-sonnet-20240229-v1:0",
        streaming=False  # 非ストリーミングモードを有効化
    )
)

response = agent("こんにちは、元気ですか?")
print(response)
```

**ポイント:**
- `streaming=False` を指定することで非ストリーミングモードに切り替わります
- デフォルトはストリーミングモード（`streaming=True`）です
- 非ストリーミングモードでは、完全なレスポンスが一度に返されます

---

### OpenAI と LiteLLM モデルプロバイダーへのドキュメントサポート ([#138](https://github.com/strands-agents/sdk-python/pull/138))

**この機能でできること:**
- OpenAI と LiteLLM モデルプロバイダーで PDF などのドキュメントを直接処理できるようになりました。Agent にドキュメントを添付して質問や要約などのタスクを実行できます。

**使用例:**

```python
from strands import Agent
from strands.models.litellm import LiteLLMModel

# PDF ドキュメントを読み込み
with open("document.pdf", "rb") as fp:
    doc = fp.read()

# ドキュメントを含むメッセージで Agent を初期化
agent = Agent(
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "document": {
                        "format": "pdf",
                        "name": "ドキュメント",
                        "source": {
                            "bytes": doc,
                        },
                    },
                },
            ],
        },
    ],
    model=LiteLLMModel(model_id="us.anthropic.claude-3-7-sonnet-20250219-v1:0")
)

# ドキュメントについて質問
response = agent("提供されたドキュメントを要約してください")
print(response)
```

**ポイント:**
- `format` には `pdf`、`txt` などのドキュメント形式を指定します
- `source.bytes` にはドキュメントのバイトデータを渡します
- OpenAI と LiteLLM の両方のモデルプロバイダーで利用可能です

## バグ修正

### ツール名バリデーションでハイフンを許可 ([#55](https://github.com/strands-agents/sdk-python/pull/55))

- ツール名のバリデーションでハイフン（`-`）が許可されるようになりました
- Tavily MCP サーバーの `tavily-search` や `tavily-extract` などのツール名をサポートするための修正です
- これまではツール名にハイフンを含めることができず、一部の MCP サーバーとの統合に問題がありました

### Anthropic モデルでのプレーンテキストドキュメント処理 ([#141](https://github.com/strands-agents/sdk-python/pull/141))

- Anthropic モデルプロバイダーでプレーンテキストドキュメント（`.txt` ファイル）の処理が正しく動作するようになりました
- Anthropic API はプレーンテキストドキュメントに特別な処理が必要でしたが、この修正により適切に処理されるようになりました

**使用例:**

```python
from strands import Agent
from strands.models.anthropic import AnthropicModel

# テキストドキュメントを読み込み
with open("document.txt", "rb") as fp:
    doc = fp.read()

agent = Agent(
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "document": {
                        "format": "txt",
                        "name": "テキストドキュメント",
                        "source": {
                            "bytes": doc,
                        },
                    },
                },
            ],
        },
    ],
    model=AnthropicModel(
        client_args={"api_key": "your-api-key"},
        model_id="claude-3-5-sonnet-latest",
        max_tokens=8000
    )
)

response = agent("提供されたドキュメントを要約してください")
print(response)
```

### テレメトリー設定の環境変数優先順位の修正 ([#86](https://github.com/strands-agents/sdk-python/pull/86))

- OpenTelemetry (OTEL) 設定の環境変数の優先順位が正しく処理されるようになりました
- Langfuse などのテレメトリープロバイダーとの統合がより確実に動作します
- 環境変数を使用したテレメトリー設定のカスタマイズがより予測可能になりました

## まとめ

このリリースは、Bedrock の柔軟性向上、複数のモデルプロバイダーでのドキュメント処理サポート、ツール名のバリデーション改善など、Python SDK の実用性を大幅に向上させる内容となっています。
