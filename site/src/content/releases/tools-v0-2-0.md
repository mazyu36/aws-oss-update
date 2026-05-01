---
title: "tools v0.2.0"
version: "v0.2.0"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-07-15
summary: "マルチエージェントツールの SDK ネイティブパターンへの移行と複数モデルプロバイダーサポート、HTTP リクエストツールの HTML-to-Markdown 変換機能、ユーザーハンドオフツールの追加。破壊的変更を含む大規模なアーキテクチャ刷新。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.0"
---

## 概要

Strands Agents Tools v0.2.0 は、マルチエージェントツールの大規模なアーキテクチャ刷新を行ったメジャーリリースです。すべてのマルチエージェントツールが Strands SDK ネイティブパターンに移行され、9 種類以上のモデルプロバイダーがサポートされました。また、HTTP リクエストツールに HTML-to-Markdown 変換機能が追加され、新しいユーザーハンドオフツールが導入されました。**このリリースには破壊的変更が含まれており、既存のコードの更新が必要です。**

**リリース:** [v0.2.0](https://github.com/strands-agents/tools/releases/tag/v0.2.0)

## 破壊的変更

### マルチエージェントツールの SDK ネイティブパターンへの移行 ([#143](https://github.com/strands-agents/tools/pull/143))

このリリースでは、すべてのマルチエージェントツールが Strands SDK ネイティブパターンに移行され、包括的なモデルプロバイダーサポートが追加されました。**これは破壊的変更であり、既存のコードを更新する必要があります。**

#### Graph Tool: `agent_graph` → `graph` へのツール名変更

**変更前:**
```python
result = agent.tool.agent_graph(
    action="create",
    graph_id="analysis_graph",
    topology={
        "type": "star",
        "nodes": [...],
        "edges": [...]
    }
)
```

**変更後:**
```python
result = agent.tool.graph(
    action="create",
    graph_id="analysis_pipeline",
    topology={
        "nodes": [
            {
                "id": "researcher",
                "role": "researcher",
                "system_prompt": "You research thoroughly.",
                "model_provider": "bedrock",
                "model_settings": {
                    "model_id": "us.anthropic.claude-sonnet-4-20250514-v1:0"
                }
            }
        ],
        "edges": [{"from": "researcher", "to": "analyst"}],
        "entry_points": ["researcher"]
    }
)
```

**主な変更点:**
- ツール名が `agent_graph` から `graph` に変更
- Strands SDK の `GraphBuilder` を使用した決定論的 DAG 実行に移行
- `entry_points` 配列の指定が必須に
- ノードごとのモデル設定をサポート

---

#### Agent Creation: `use_llm` → `use_agent` へのツール名変更

**変更前:**
```python
result = agent.tool.use_llm(
    prompt="Calculate 2+2",
    system_prompt="You are a math helper"
)
```

**変更後:**
```python
result = agent.tool.use_agent(
    prompt="Calculate 2+2",
    system_prompt="You are a math helper",
    model_provider="bedrock",  # 新機能: モデル切り替えサポート
    model_settings={
        "model_id": "us.anthropic.claude-sonnet-4-20250514-v1:0"
    },
    tools=["calculator"]  # 新機能: ツールフィルタリング
)
```

**主な変更点:**
- ツール名が `use_llm` から `use_agent` に変更
- `model_provider` パラメータでモデル切り替えが可能に
- `model_settings` パラメータでカスタム設定が可能に
- `tools` パラメータでツールの選択的アクセスが可能に

---

#### Swarm Tool: 完全なアーキテクチャ刷新

**変更前:**
```python
result = agent.tool.swarm(
    task="Analyze this problem",
    swarm_size=3,
    coordination_pattern="collaborative"
)
```

**変更後:**
```python
result = agent.tool.swarm(
    task="Develop comprehensive strategy",
    agents=[  # 必須: カスタムエージェント仕様
        {
            "name": "researcher",
            "system_prompt": "You are a research specialist.",
            "tools": ["retrieve", "calculator"],
            "model_provider": "bedrock"
        },
        {
            "name": "strategist",
            "system_prompt": "You are a strategic planner.",
            "tools": ["file_write"],
            "model_provider": "anthropic"
        }
    ]
)
```

**主な変更点:**
- `swarm_size` と `coordination_pattern` パラメータが削除
- **`agents` パラメータが必須**になり、カスタムエージェント仕様を指定
- Strands SDK の `Swarm` パターンに移行
- エージェントごとのモデルプロバイダーとツール設定が可能に

---

#### Think Tool: 拡張機能追加（後方互換性あり）

**拡張機能（オプション）:**
```python
result = agent.tool.think(
    thought="How can AI be more creative?",
    cycle_count=3,
    system_prompt="You are a creative AI researcher.",
    model_provider="bedrock",  # 新機能: モデル切り替え
    model_settings={"model_id": "claude-sonnet-4"},  # 新機能: カスタム設定
    thinking_system_prompt="Use design thinking methodology"  # 新機能: カスタム方法論
)
```

**主な変更点:**
- `model_provider` と `model_settings` パラメータを追加
- `thinking_system_prompt` でカスタムの思考方法論を指定可能
- 既存のコードは変更なしで動作（後方互換性あり）

---

#### モデルプロバイダーインフラストラクチャ

このリリースでは、包括的なモデルプロバイダーサポートが追加されました。

**サポートされるプロバイダー:**
- Bedrock
- Anthropic
- LiteLLM
- LlamaAPI
- Ollama
- OpenAI
- Writer
- Cohere
- GitHub

**使用例:**
```python
# Bedrock を使用
result = agent.tool.use_agent(
    prompt="Analyze this data",
    model_provider="bedrock",
    model_settings={
        "model_id": "us.anthropic.claude-sonnet-4-20250514-v1:0",
        "region_name": "us-east-1"
    }
)

# OpenAI を使用
result = agent.tool.use_agent(
    prompt="Generate ideas",
    model_provider="openai",
    model_settings={
        "model_id": "gpt-4o"
    }
)

# 混合モデルチームを作成
result = agent.tool.swarm(
    task="Complex analysis",
    agents=[
        {
            "name": "researcher",
            "system_prompt": "Research specialist",
            "model_provider": "bedrock"
        },
        {
            "name": "analyst",
            "system_prompt": "Data analyst",
            "model_provider": "openai"
        }
    ]
)
```

**ポイント:**
- 環境変数ベースの設定とフォールバック機能
- タスク/エージェントごとのモデルカスタマイズ
- 最適化されたパフォーマンスのための混合モデルプロバイダーチーム

---

## 新機能

### HTTP リクエストツールの HTML-to-Markdown 変換機能 ([#63](https://github.com/strands-agents/tools/pull/63))

**この機能でできること:**
- Web コンテンツを自動的に読みやすい Markdown 形式に変換できるようになりました。記事のスクレイピング、HTML ドキュメントの変換、AI 分析用のクリーンなテキスト作成に最適です。

**使用例:**

```python
from strands import Agent
from strands_tools import http_request

agent = Agent(tools=[http_request])

# HTML ウェブページを Markdown に変換
response = agent.tool.http_request(
    method="GET",
    url="https://example.com/article",
    convert_to_markdown=True
)
```

**主な機能:**
- `convert_to_markdown` パラメータで変換を有効化
- Content-Type ヘッダーとドキュメント構造から HTML を自動検出
- `readabilipy` でメインコンテンツを抽出し、`markdownify` でクリーンな Markdown に変換
- 変換失敗時は元のコンテンツを返すグレースフルフォールバック
- 変換成功時にはユーザーに通知

**ポイント:**
- ブログ記事や技術ドキュメントのスクレイピングに便利
- AI がコンテンツを処理しやすくなります
- 変換は自動的に行われ、失敗してもエラーにはなりません

---

### ユーザーハンドオフツール ([#142](https://github.com/strands-agents/tools/pull/142))

**この機能でできること:**
- エージェントがユーザーに制御を渡し、自動化されたワークフローで人間の介入を可能にする新しいツールです。2 つのモードで動作します。

**使用例:**

```python
from strands import Agent
from strands_tools import handoff_to_user, calculator

agent = Agent(tools=[handoff_to_user, calculator])

# インタラクティブモード: ユーザー入力を収集して続行
result = agent.tool.handoff_to_user(
    message="Please pick a number that you'd like me to find the square root of.",
    breakout_of_loop=False  # デフォルト: 実行を一時停止してユーザー入力を収集
)

# 完全ハンドオフモード: イベントループを停止してユーザーに制御を移譲
result = agent.tool.handoff_to_user(
    message="Please review the generated report and decide next steps.",
    breakout_of_loop=True  # イベントループを完全に停止
)
```

**実際の使用例:**
```python
>>> agent("Ask user to pick a number and then get the square root of it")

============================================================
🤝 AGENT REQUESTING USER HANDOFF
============================================================

Please pick a number that you'd like me to find the square root of.

⏳ Waiting for your response...
----------------------------------------
Your response: 29931
============================================================

The square root of 29931 is 173.0057802498.
```

**ポイント:**
- `breakout_of_loop=False`: ユーザー入力を収集してワークフローを続行
- `breakout_of_loop=True`: 完全にユーザーに制御を移譲
- `stop` ツールと同じアーキテクチャパターンを使用
- KeyboardInterrupt などの例外に対する包括的なエラーハンドリング

---

## バグ修正

### A2A ツールのプレフィックス追加とデフォルトタイムアウトの更新 ([#134](https://github.com/strands-agents/tools/pull/134))
- A2A ツールに `a2a` プレフィックスを追加し、ツール名の一貫性を向上
- デフォルトのタイムアウト設定を更新

---

## まとめ

v0.2.0 は、Strands Agents Tools の大規模なアーキテクチャ刷新を行った重要なリリースです。マルチエージェントツールが SDK ネイティブパターンに移行され、9 種類以上のモデルプロバイダーのサポート、HTTP リクエストツールの HTML-to-Markdown 変換機能、新しいユーザーハンドオフツールが追加されました。破壊的変更が含まれているため、既存のコードを更新する際は上記の移行ガイドを参照してください。これらの変更により、より柔軟で強力なマルチエージェントシステムの構築が可能になります。
