---
title: "Strands Python SDK v1.7.0 リリース解説"
version: "v1.7.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-09-02
summary: "Claude Citation サポート、MultiAgent でのフック有効化、ToolContext への invocation_state 追加、BedrockModel での VPC エンドポイントサポートなど、機能追加とバグ修正を含むリリースです。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.7.0"
---

## 概要

このリリースでは、Claude 3.5 Sonnet v2 以降で利用可能な Citation サポート、MultiAgent でのフック有効化、ToolContext への invocation_state の追加、BedrockModel での VPC エンドポイントサポートなど、複数の新機能とバグ修正が含まれています。

**リリース:** [v1.7.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.7.0)

## 新機能

### Claude Citation サポート ([#631](https://github.com/strands-agents/sdk-python/pull/631))

**この機能でできること:**
BedrockModel で Anthropic Claude 3.5 Sonnet v2 以降のモデルを使用する際に、Citation（引用）機能をサポートしました。これにより、モデルの応答がどのソースから引用されたかを追跡できます。

**使用例:**

```python
from strands.models import BedrockModel
from strands.agent import Agent

# Citation サポートを持つモデルを使用
model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
    region_name="us-west-2"
)

agent = Agent(model=model)

# Citation を含むドキュメントを処理
response = agent.run("このドキュメントから重要な情報を抽出してください")

# イベントから Citation 情報を取得
for event in agent.stream("質問に答えてください"):
    if event.get("type") == "content":
        citations = event.get("citations", [])
        for citation in citations:
            print(f"引用元: {citation}")
```

**ポイント:**
- Claude 3.5 Sonnet v2 以降のモデルでのみ利用可能
- PDF などのドキュメントを処理する際に特に有用

---

### MultiAgent でのフック有効化 ([#760](https://github.com/strands-agents/sdk-python/pull/760))

**この機能でできること:**
MultiAgent（Graph、Swarm）でカスタムフックを使用できるようになりました。以前は制限されていましたが、ドキュメントで注意点を説明することで、顧客の要望に応じて有効化されました。

**使用例:**

```python
from strands.multiagent import Graph
from strands.agent import Agent

# カスタムフックの定義
class MyCustomHook:
    def before_agent_call(self, event):
        print(f"エージェント呼び出し前: {event}")

    def after_agent_call(self, event):
        print(f"エージェント呼び出し後: {event}")

# MultiAgent でフックを使用
agent1 = Agent(name="agent1")
agent2 = Agent(name="agent2")

graph = Graph(
    agents=[agent1, agent2],
    hooks=[MyCustomHook()]  # フックが使用可能に
)

result = graph.run("タスクを実行")
```

**ポイント:**
- エージェント間で状態がリセットされるため、単一エージェント向けのフックは動作が異なる可能性がある
- MultiAgent の特性を理解した上で使用することが推奨される

---

### ToolContext への invocation_state 追加 ([#761](https://github.com/strands-agents/sdk-python/pull/761))

**この機能でできること:**
ツール内から Agent の invocation_state（呼び出し時に渡されたキーワード引数）にアクセスできるようになりました。これにより、ツールの実行時にコンテキスト情報を活用できます。

**使用例:**

```python
from strands.tools import tool, ToolContext

@tool
def process_data(context: ToolContext):
    """データを処理するツール"""
    # invocation_state から情報を取得
    user_id = context.invocation_state.get("user_id")
    session_id = context.invocation_state.get("session_id")

    return f"ユーザー {user_id} のセッション {session_id} でデータを処理しました"

from strands.agent import Agent

agent = Agent(tools=[process_data])

# invocation_state を渡してエージェントを実行
result = agent.run(
    "データを処理して",
    user_id="user123",
    session_id="session456"
)
```

**ポイント:**
- ツール実行時にエージェント呼び出しのコンテキスト情報を活用できる
- AgentTool.stream() と同様の invocation_state の命名規則を使用

---

### BedrockModel での VPC エンドポイントサポート ([#502](https://github.com/strands-agents/sdk-python/pull/502))

**この機能でできること:**
BedrockModel で AWS VPC エンドポイント（PrivateLink）を使用できるようになりました。セキュリティとコンプライアンス要件により、すべての Bedrock トラフィックを VPC エンドポイント経由で流す必要がある組織に対応します。

**使用例:**

```python
from strands.models import BedrockModel

# VPC エンドポイントを使用
model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
    endpoint_url="https://vpce-1234567-abcd.bedrock-runtime.us-west-2.vpce.amazonaws.com",
    region_name="us-west-2"
)

# 通常通り使用
from strands.agent import Agent
agent = Agent(model=model)
result = agent.run("こんにちは")
```

**ポイント:**
- 既存のコードとの後方互換性を維持
- endpoint_url はオプションパラメータなので、VPC エンドポイントを使用しない場合は省略可能

---

## バグ修正

### BedrockModel の stop_reason 修正 ([#767](https://github.com/strands-agents/sdk-python/pull/767))

Bedrock が一部のツール使用ケースで stop_reason に "end_turn" を返す問題に対応しました。これにより、Strands SDK のイベントループでツール呼び出しが正しく実行されるようになりました。

---

### ツール結果イベントの修正 ([#771](https://github.com/strands-agents/sdk-python/pull/771))

ツール呼び出しの結果として誤ったメッセージが発行されていた問題を修正しました。また、ユニットテストを拡張して、実際のツール呼び出しのイベントを検証できるようにしました。

---

### 同名ツールの読み込み修正 ([#772](https://github.com/strands-agents/sdk-python/pull/772))

同じ名前のツールが登録される際に適切なエラーを発生させるように修正しました。ただし、tool.support_hot_reload が true の場合は例外として許可されます。これにより、MCP サーバーなどで重複するツール名が存在する場合に、明確なエラーメッセージが表示されるようになりました。

---

## まとめ

v1.7.0 では、Citation サポート、MultiAgent でのフック、ToolContext の拡張、VPC エンドポイントサポートなど、重要な機能追加が行われました。また、複数のバグ修正により、より安定した動作が実現されています。
