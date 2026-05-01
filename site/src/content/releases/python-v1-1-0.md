---
title: "sdk-python v1.1.0"
version: "v1.1.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-07-24
summary: "コンテナ化されたデプロイメント向けの A2A Server マウント機能、ネストされたツールコレクションの自動フラット化、Agent as Tool のトレース改善が追加されました。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.1.0"
---

## 概要

このリリースでは、コンテナ環境での Agent-to-Agent (A2A) デプロイメントを大幅に改善する新機能が追加されました。パスベースのルーティングをサポートする `http_url` パラメータ、ネストされたツールコレクションの自動フラット化、Agent as Tool 使用時のトレース可視性の向上が含まれます。

**リリース:** [v1.1.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.1.0)

## 新機能

### コンテナ化デプロイメント向けマウント機能 ([#524](https://github.com/strands-agents/sdk-python/pull/524))

**この機能でできること:**
- コンテナ環境やロードバランサー配下での A2A Server のデプロイが容易になります
- 内部バインドアドレスと外部公開 URL を分離して管理できます
- パスベースルーティングによる複数エージェントの配置が可能になります

**使用例:**

```python
from strands import Agent
from strands.multiagent.a2a import A2AServer

# エージェントの定義
agent = Agent(
    name="my-agent",
    instructions="サンプルエージェント",
)

# ケース1: ALB 配下でのパスベースルーティング（パス保持）
# ALB がパスを保持してコンテナに転送する場合
server = A2AServer(
    agent,
    host="0.0.0.0",  # コンテナ内部バインド
    port=8080,
    http_url="https://my-alb.amazonaws.com/agent1"  # 外部公開 URL
)
# → /agent1 にマウントされ、/agent1/.well-known/agent.json を提供

# ケース2: パス除去型 ALB の場合
# ALB がパスを除去してから転送する場合は serve_at_root=True を使用
server = A2AServer(
    agent,
    host="0.0.0.0",
    port=8080,
    http_url="https://my-alb.amazonaws.com/agent1",
    serve_at_root=True  # ルートで提供するが、agent card には完全な URL を使用
)
# → ルート (/) で提供されるが、agent card には https://my-alb.amazonaws.com/agent1/ が表示される

# ケース3: ローカル開発（従来通り）
server = A2AServer(agent, host="localhost", port=9000)
# → http://localhost:9000/ でルート提供

# サーバー起動
server.run()
```

**ポイント:**
- `http_url` パラメータで外部公開 URL を指定することで、内部バインドアドレス（`host`/`port`）と分離管理できます
- パスを含む URL を指定すると、自動的にそのパスにマウントされます
- ロードバランサーがパスを除去する構成の場合は `serve_at_root=True` を使用してください
- 既存のコードは変更不要で後方互換性があります

---

### ネストされたツールコレクションの自動フラット化 ([#508](https://github.com/strands-agents/sdk-python/pull/508))

**この機能でできること:**
- ネストされたツールのリストや辞書を自動的にフラット化して、エージェントに渡すことができます
- ツールを論理的にグループ化しながら、エージェント登録時に手動でフラット化する必要がなくなります

**使用例:**

```python
from strands import Agent
from strands.tools import tool

@tool
def calculator_add(a: int, b: int) -> int:
    """2つの数を加算します"""
    return a + b

@tool
def calculator_subtract(a: int, b: int) -> int:
    """2つの数を減算します"""
    return a - b

@tool
def text_uppercase(text: str) -> str:
    """テキストを大文字に変換します"""
    return text.upper()

@tool
def text_lowercase(text: str) -> str:
    """テキストを小文字に変換します"""
    return text.lower()

# ツールを論理的にグループ化
calculator_tools = [calculator_add, calculator_subtract]
text_tools = [text_uppercase, text_lowercase]

# ネストされたリストをそのまま渡せます（自動的にフラット化されます）
agent = Agent(
    name="multi-tool-agent",
    instructions="計算とテキスト処理ができるエージェント",
    tools=[calculator_tools, text_tools]  # ネストされたリストでも OK
)

# 辞書形式でもネストできます
tools_by_category = {
    "math": calculator_tools,
    "text": text_tools
}

agent = Agent(
    name="organized-agent",
    instructions="整理されたツールを持つエージェント",
    tools=tools_by_category  # 辞書もフラット化されます
)
```

**ポイント:**
- ツールの論理的なグループ化が簡単になり、コードの可読性が向上します
- 手動でフラット化する必要がなくなります
- リスト、タプル、辞書などのネスト構造に対応しています

## バグ修正

### Agent as Tool 使用時のトレース統合 ([#526](https://github.com/strands-agents/sdk-python/pull/526))

**修正内容:**
- Agent をツールとして使用する際、子エージェントのトレースが親エージェントのトレース階層に正しく含まれるようになりました
- これにより、Langfuse などのトレーシングツールでエージェント呼び出しの完全な階層を可視化できます

**影響:**
- 以前は Agent as Tool を使用した際、子エージェントのトレースが親のトレーススパンに統合されていませんでした
- この修正により、マルチエージェントシステムのトレースがより直感的で理解しやすくなります

## まとめ

v1.1.0 では、コンテナ化環境での A2A デプロイメントの改善、開発者体験の向上、トレーシング機能の強化が行われました。既存のコードに影響を与えることなく、より柔軟で強力な機能を利用できるようになっています。

---
