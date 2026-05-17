---
title: "Strands Python SDK v1.2.0 リリース解説"
version: "v1.2.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-07-30
summary: "Amazon SageMaker AI エンドポイントのサポート、MCP の構造化コンテンツ保持機能、および MCP プロンプト管理機能を追加しました。これにより、AWS SageMaker との統合が可能になり、MCP ツールの応答処理がより柔軟になりました。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.2.0"
---

## 概要

このリリースでは、Amazon SageMaker AI エンドポイントを Model Provider としてサポートし、MCP ツールの構造化コンテンツ保持機能と新しいプロンプト管理メソッドを追加しました。これらの機能により、AWS SageMaker との統合が簡単になり、MCP ツールの応答処理がより強力で柔軟になりました。

**リリース:** [v1.2.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.2.0)

## 新機能

### Amazon SageMaker AI エンドポイントのサポート ([#176](https://github.com/strands-agents/sdk-python/pull/176))

**この機能でできること:**
Amazon SageMaker AI エンドポイントを Model Provider として使用できるようになりました。これにより、AWS SageMaker にデプロイされた機械学習モデルを Strands Agents と統合できます。

**使用例:**

```python
from strands.models.sagemaker import SageMakerModel

# SageMaker エンドポイントをモデルプロバイダーとして設定
model = SageMakerModel(
    endpoint_name="your-sagemaker-endpoint",
    region_name="us-east-1"
)

# Agent と統合して使用
from strands import Agent

agent = Agent(
    name="SageMaker Agent",
    model=model,
    instructions="あなたは AWS SageMaker を使用する AI アシスタントです。"
)

response = agent.run("こんにちは！")
print(response.content)
```

**ポイント:**
- AWS の認証情報が適切に設定されている必要があります
- SageMaker エンドポイントが既にデプロイされている必要があります
- リージョンを明示的に指定することで、異なる AWS リージョンのエンドポイントを使用できます

---

### MCP ツールでの構造化コンテンツ保持 ([#528](https://github.com/strands-agents/sdk-python/pull/528))

**この機能でできること:**
MCP クライアントを使用する際、ツールが返す構造化コンテンツ（JSON データ）を `AgentTool` のレスポンスに保持できるようになりました。構造化コンテンツは既存のコンテンツ配列の最後の要素として追加されるため、後続の処理で簡単にアクセスできます。

**使用例:**

```python
from strands.tools.mcp import MCPClient
from strands import Agent

# MCP クライアントを初期化
mcp_client = MCPClient(server_params={
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/data"]
})

# Agent にツールとして追加
agent = Agent(
    name="MCP Agent",
    tools=[mcp_client],
    instructions="MCP ツールを使用してファイルシステムにアクセスします。"
)

# ツールを実行して構造化コンテンツを取得
response = agent.run("データを取得してください")

# 構造化コンテンツは content 配列の最後の要素として利用可能
for content in response.content:
    if content.type == "json":
        structured_data = content.data
        print(f"構造化データ: {structured_data}")
```

**ポイント:**
- 構造化コンテンツは既存のテキストコンテンツと共存し、後方互換性が保たれています
- MCP の依存関係が 1.11.0 にアップデートされています
- 同期・非同期の両方のツール呼び出しで構造化コンテンツがサポートされています

---

### MCP プロンプト管理メソッドの追加 ([#160](https://github.com/strands-agents/sdk-python/pull/160))

**この機能でできること:**
`MCPClient` クラスに `list_prompts_sync` と `get_prompt_sync` メソッドが追加され、MCP サーバーからプロンプトを取得・管理できるようになりました。

**使用例:**

```python
from strands.tools.mcp import MCPClient

# MCP クライアントを初期化
mcp_client = MCPClient(server_params={
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-prompts"]
})

# 利用可能なプロンプトの一覧を取得
prompts_result = mcp_client.list_prompts_sync()
for prompt in prompts_result.prompts:
    print(f"プロンプト名: {prompt.name}")
    print(f"引数: {prompt.arguments}")

# 特定のプロンプトを引数付きで取得
prompt_response = mcp_client.get_prompt_sync(
    "sum-two-numbers",
    arguments={
        "a": "123",
        "b": "456"
    }
)

if prompt_response.messages:
    print(f"プロンプト内容: {prompt_response.messages[0].content.text}")
```

**ポイント:**
- `list_prompts_sync` は MCP サーバーから利用可能なプロンプトの一覧を取得します
- `get_prompt_sync` は指定した ID のプロンプトを引数と共に取得します
- 両メソッドとも同期的に動作し、既存の非同期メソッドのラッパーとして実装されています

---

### 構造化出力エラーメッセージの改善 ([#563](https://github.com/strands-agents/sdk-python/pull/563))

**この機能でできること:**
構造化出力使用時のエラーメッセージがより分かりやすくなりました。Anthropic および Bedrock モデルプロバイダーで、構造化出力に関連するエラーが発生した際に、より明確なメッセージが表示されます。

**ポイント:**
- エラーメッセージがより具体的になり、問題の特定とデバッグが容易になりました
- Anthropic と Bedrock の両方のプロバイダーで統一されたエラーメッセージが提供されます

## バグ修正

### SageMaker モデルプロバイダーのデバッグ print 文削除 ([#553](https://github.com/strands-agents/sdk-python/pull/553))
- 開発中に残されていた print 文を削除しました
- 本番環境での不要なログ出力がなくなり、クリーンな実行が可能になりました

## まとめ

v1.2.0 では、AWS SageMaker との統合、MCP ツールの強化、エラーメッセージの改善により、より実用的で使いやすい SDK になりました。特に MCP の構造化コンテンツサポートは、複雑なデータを扱うアプリケーションでの利便性を大幅に向上させます。
