---
title: "Strands Python SDK v1.25.0 リリース解説"
version: "v1.25.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-02-05
summary: "A2AAgent クラスの追加、S3 ロケーションサポート、マルチエージェントノードの割り込みサポートなど、多数の新機能とバグ修正が含まれています。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.25.0"
---

## 概要

このリリースでは、リモート A2A エージェントを簡単に利用できる `A2AAgent` クラスの追加、Bedrock での S3 ロケーションサポート、Graph でのマルチエージェントノード割り込み対応など、重要な新機能が追加されました。また、ツールパラメータの nullable セマンティクス保持や並列ツール呼び出し時の LedgerProvider の修正など、複数のバグ修正も含まれています。

**リリース:** [v1.25.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.25.0)

## 新機能

### A2AAgent クラスの追加 ([#1441](https://github.com/strands-agents/sdk-python/pull/1441))

**この機能でできること:**
- リモートの A2A エージェントを通常の Strands Agent と同様に呼び出すことができます
- 同期・非同期・ストリーミングの全ての呼び出しパターンをサポートします

**使用例:**

```python
from strands.agent.a2a_agent import A2AAgent

# リモートエージェントに接続
a2a_agent = A2AAgent(endpoint="http://localhost:9000")

# 通常の Agent と同じように呼び出し
result = a2a_agent("Show me 10 ^ 6")
# AgentResult(stop_reason='end_turn', message={'role': 'assistant', 'content': [{'text': '10^6 = 1,000,000'}]}, ...)

# ストリーミングでの使用
for event in a2a_agent.stream("Tell me a story"):
    if "data" in event:
        print(event["data"], end="")
```

**ポイント:**
- エンドポイントを指定するだけで自動的にエージェントカードを取得し、名前や説明を設定します
- カスタムの httpx クライアントや A2A クライアントファクトリーを渡すことも可能です

---

### S3 ロケーションサポート ([#1572](https://github.com/strands-agents/sdk-python/pull/1572))

**この機能でできること:**
- 画像、ドキュメント、動画を S3 から直接参照できます
- base64 エンコーディングが不要になり、大きなファイルの処理が効率化されます

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

agent = Agent(model=BedrockModel())

# S3 上のドキュメントを直接参照
response = agent(
    [
        {
            "role": "user",
            "content": [
                {"text": "このドキュメントを要約してください:"},
                {
                    "document": {
                        "format": "pdf",
                        "name": "report.pdf",
                        "source": {
                            "s3Location": {
                                "uri": "s3://my-bucket/documents/report.pdf",
                                "bucketOwner": "123456789012"  # オプション（クロスアカウントアクセス用）
                            }
                        }
                    }
                }
            ]
        }
    ]
)
```

**ポイント:**
- 現時点では Bedrock モデルプロバイダーでのみサポートされています
- `bucketOwner` はクロスアカウントアクセス時にのみ必要です

---

### マルチエージェントノードの割り込みサポート ([#1606](https://github.com/strands-agents/sdk-python/pull/1606))

**この機能でできること:**
- Graph 内のマルチエージェントノード（Graph、Swarm など）から割り込みを発生させ、処理できます
- ネストされたグラフでも割り込みが正しく伝播されます

**使用例:**

```python
from strands import Agent, tool
from strands.multiagent import GraphBuilder, Status
from strands.types.tools import ToolContext


@tool(context=True)
def weather_tool(tool_context: ToolContext) -> str:
    response = tool_context.interrupt("weather_interrupt", reason="天気情報が必要です")
    return response


weather_agent = Agent(name="weather", tools=[weather_tool])

# 内側のグラフを作成
inner_builder = GraphBuilder()
inner_builder.add_node(weather_agent, "weather_agent")
inner_graph = inner_builder.build()

# 外側のグラフに内側のグラフをノードとして追加
outer_builder = GraphBuilder()
outer_builder.add_node(inner_graph, "inner_graph")
outer_graph = outer_builder.build()

multiagent_result = outer_graph("天気を教えて")

# 割り込みを処理
while multiagent_result.status == Status.INTERRUPTED:
    responses = []
    for interrupt in multiagent_result.interrupts:
        if interrupt.name == "weather_interrupt":
            response = input(f"{interrupt.reason}: ")
            responses.append(
                {
                    "interruptResponse": {
                        "interruptId": interrupt.id,
                        "response": response,
                    },
                },
            )
    multiagent_result = outer_graph(responses)

print(multiagent_result.results)
```

**ポイント:**
- セッション永続化を使用する場合、MultiAgentBase ノードには独自のセッションマネージャーを渡す必要があります

---

### 構造化出力プロンプトのカスタマイズ ([#1627](https://github.com/strands-agents/sdk-python/pull/1627))

**この機能でできること:**
- 構造化出力用の内部プロンプトメッセージをカスタマイズできます
- Bedrock Guardrails のプロンプト攻撃フィルターとの競合を回避できます

**使用例:**

```python
from strands import Agent
from pydantic import BaseModel


class UserInfo(BaseModel):
    name: str
    age: int


# カスタムプロンプトで Bedrock Guardrails との競合を回避
agent = Agent(
    structured_output_model=UserInfo,
    structured_output_prompt="Please use the output tool now."
)

result = agent("John は 30 歳です")
print(result.output)  # UserInfo(name='John', age=30)
```

**ポイント:**
- デフォルトのプロンプト「You must format the previous response as structured output.」が Guardrails でブロックされる場合に有効です
- どのモデルプロバイダーでも動作します

---

### Graph での AgentBase サポート ([#1615](https://github.com/strands-agents/sdk-python/pull/1615))

**この機能でできること:**
- `A2AAgent` などの `AgentBase` プロトコル実装を Graph ノードとして使用できます
- ローカルエージェントとリモートエージェントを組み合わせたワークフローを構築できます

**使用例:**

```python
from strands import Agent
from strands.agent.a2a_agent import A2AAgent
from strands.multiagent.graph import GraphBuilder

# ローカルエージェントとリモートエージェントを組み合わせ
local_agent = Agent(name="local")
remote_agent = A2AAgent(endpoint="http://remote-agent:9000")

builder = GraphBuilder()
builder.add_node(remote_agent, "remote")
builder.add_node(local_agent, "local")
builder.add_edge("remote", "local")
graph = builder.build()

result = graph("このリクエストを処理してください")
```

**ポイント:**
- `Agent` クラスが明示的に `AgentBase` を継承するようになりました
- カスタムの `AgentBase` 実装も Graph で使用可能です

---

## バグ修正

### ツールパラメータの nullable セマンティクス保持 ([#1584](https://github.com/strands-agents/sdk-python/pull/1584))
- `Union[T, None]` 型のパラメータ（デフォルト値なし）で `null` を正しく渡せるようになりました
- 以前は `anyOf` から `null` が削除され、LLM が文字列 "null" を渡してしまう問題がありました

### LedgerProvider の並列ツール呼び出し対応 ([#1559](https://github.com/strands-agents/sdk-python/pull/1559))
- エージェントが複数のツールを同時に呼び出した際、全てのツールが正しく Ledger に記録されるようになりました
- 以前は最後のツールのみが更新される問題がありました

### OpenAI 互換エンドポイントでのコンテキストオーバーフロー検出 ([#1529](https://github.com/strands-agents/sdk-python/pull/1529))
- Bedrock モデルをラップする OpenAI 互換エンドポイント（Databricks など）でコンテキストオーバーフローが正しく検出されるようになりました
- `SummarizingConversationManager` などが正しくトリガーされるようになりました

### retry_strategy=None でリトライを無効化 ([#1630](https://github.com/strands-agents/sdk-python/pull/1630))
- `retry_strategy=None` を指定することでリトライを明示的に無効化できるようになりました
- 以前は `None` を渡してもデフォルトのリトライ戦略が適用されていました

```python
from strands import Agent

# リトライを無効化
agent = Agent(retry_strategy=None)
```

### A2AServer のエージェントカード URL 修正 ([#1626](https://github.com/strands-agents/sdk-python/pull/1626))
- `A2AServer.serve()` で `host` や `port` を上書きした際、エージェントカードの URL も正しく更新されるようになりました
- 以前はクライアントが誤った URL に接続しようとして 503 エラーが発生していました

## まとめ

このリリースでは A2A エージェントの統合が大幅に強化され、S3 からのメディアファイル直接参照やマルチエージェントワークフローでの割り込み処理など、実用的な機能が多数追加されました。また、並列ツール呼び出しやコンテキストオーバーフロー検出の修正により、安定性も向上しています。
