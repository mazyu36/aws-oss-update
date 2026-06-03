---
title: "AgentCore Python SDK v1.13.0 リリース解説"
version: "v1.13.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-06-02
summary: "Strands Agents 向けに AgentCore Gateway のセマンティック検索 (`x_amz_bedrock_agentcore_search`) を活用した Tool Search プラグインが追加されました。会話履歴からユーザーインテントを LLM で導出し、関連するツールだけを動的にロードできるようになります。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.13.0"
---

## 概要

このリリースでは、Strands Agents 向けの新しいプラグイン `AgentCoreToolSearchPlugin` が追加されました。AgentCore Gateway のセマンティック検索ツール (`x_amz_bedrock_agentcore_search`) を利用し、会話の文脈から導出したインテントに基づいて関連ツールだけを動的にエージェントへ登録できます。Gateway に数百ものツールが登録されているケースでも、各呼び出しで必要なツールだけを LLM に渡せるようになります。

**リリース:** [v1.13.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.13.0)

## 新機能

### Strands Agents 向け AgentCore Tool Search プラグイン ([#494](https://github.com/aws/bedrock-agentcore-sdk-python/pull/494))

**この機能でできること:**
- Strands Agents の `Plugin` として動作する `AgentCoreToolSearchPlugin` が追加されました。エージェントの呼び出し前 (`before_invocation` フック) に、会話履歴から LLM でインテントを導出し、AgentCore Gateway のセマンティック検索を実行します。
- 検索結果として返ってきたツール定義を `MCPAgentTool` としてエージェントの `tool_registry` に動的登録するため、`list_tools` を呼ぶことなく、その時点の意図にマッチするツールだけを LLM に提示できます。
- インテント導出ロジックは `IntentProvider` 抽象クラスとしてプラガブルで、デフォルトの `StrandsIntentProvider` は親エージェントと同じモデルを再利用してインテントを分類します。

**インストール:**

```bash
pip install 'bedrock-agentcore[strands-agents]'
```

**使用例 (基本):**

```python
from mcp_proxy_for_aws.client import aws_iam_streamablehttp_client
from strands import Agent
from strands.tools.mcp import MCPClient
from bedrock_agentcore.gateway.integrations.strands.plugins import (
    AgentCoreToolSearchPlugin,
)

# AgentCore Gateway の MCP エンドポイントに接続する MCPClient を構築
mcp_client = MCPClient(lambda: aws_iam_streamablehttp_client(
    endpoint="https://<gateway-id>.gateway.bedrock-agentcore.<region>.amazonaws.com/mcp",
    aws_region="us-east-1",
    aws_service="bedrock-agentcore",
))

mcp_client.start()

# プラグインを Agent に渡すだけでツール検索が有効になる
agent = Agent(plugins=[AgentCoreToolSearchPlugin(mcp_client=mcp_client)])

# 呼び出しごとに、会話の文脈に応じたツールだけが動的に登録される
agent("Find me afternoon flights to New York")
```

**使用例 (インテント分類用に別モデルを指定):**

```python
from strands.models.bedrock import BedrockModel
from bedrock_agentcore.gateway.integrations.strands.plugins import (
    AgentCoreToolSearchPlugin,
)
from bedrock_agentcore.gateway.integrations.strands.plugins.agentcore_tool_search.intent_providers import (
    StrandsIntentProvider,
)

# インテント分類は軽量モデル、エージェント本体は別モデルといった使い分けが可能
intent_model = BedrockModel(model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0")

agent = Agent(plugins=[
    AgentCoreToolSearchPlugin(
        mcp_client=mcp_client,
        intent_provider=StrandsIntentProvider(
            model=intent_model,
            # システムプロンプトのカスタマイズも可能
            # system_prompt="Classify the user's intent in one sentence.",
        ),
    )
])
```

**使用例 (カスタム IntentProvider):**

```python
from bedrock_agentcore.gateway.integrations.strands.plugins.agentcore_tool_search.intent_providers import (
    IntentProvider,
)

class MyIntentProvider(IntentProvider):
    def derive_intent(self, messages: list[dict], model=None) -> str:
        # LLM を使わずルールベースで導出する、独自モデルを使うなど
        # 任意のロジックでインテント文字列を返す
        return "search flights"

agent = Agent(plugins=[
    AgentCoreToolSearchPlugin(
        mcp_client=mcp_client,
        intent_provider=MyIntentProvider(),
    )
])
```

**ポイント:**
- `AgentCoreToolSearchPlugin(mcp_client, intent_provider=None)` の `intent_provider` を省略した場合、デフォルトで `StrandsIntentProvider()` が使用されます。`StrandsIntentProvider` は親エージェントの `event.agent.model` を自動的に再利用するため、追加設定なしで動作します。
- 各呼び出しの前に、前回の検索でロードされたツールは `tool_registry` から削除されてから新しい検索が走ります。`Agent` 構築時に渡した静的ツールは保持され、同名の動的ツールは登録がスキップされます。
- 利用には Gateway 側で[セマンティック検索を有効化](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-using-mcp-semantic-search.html)し、各ツールに description を付与しておく必要があります。Gateway の検索ツールの呼び出しに失敗した場合はログにエラーが出力され、ツール登録なしで処理が続行されます。
- `MCPClient` は事前に `start()` するか、`with mcp_client:` のコンテキストマネージャ内で利用してください。

## まとめ

AgentCore Gateway のセマンティック検索を Strands Agents 側から透過的に活用できるようになり、大量のツールを登録した Gateway を運用していても、各呼び出しに必要な分だけを LLM に渡せるようになりました。Gateway にツールを集約しているプロジェクトでは、コンテキスト消費量とツール選択精度の両面で恩恵が得られるため、本リリースへのアップデートを推奨します。
