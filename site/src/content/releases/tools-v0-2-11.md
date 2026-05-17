---
title: "Strands Tools v0.2.11 リリース解説"
version: "v0.2.11"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-10-10
summary: "Elasticsearch メモリバックエンド機能を追加し、ワークフローで重複タスク名がハングアップする問題を修正したリリースです。Amazon Bedrock Titan 埋め込みによるセマンティック検索が可能になりました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.11"
---

## 概要

このリリースでは、Elasticsearch をメモリバックエンドとして利用できる新機能が追加されました。Amazon Bedrock Titan 埋め込みを使用したセマンティック検索により、Agent の記憶機能を強化できます。また、ワークフローツールで重複するタスク名がハングアップを引き起こす問題も修正されました。

**リリース:** [v0.2.11](https://github.com/strands-agents/tools/releases/tag/v0.2.11)

## 新機能

### Elasticsearch メモリツール ([#277](https://github.com/strands-agents/tools/pull/277))

**この機能でできること:**
- Elasticsearch をメモリバックエンドとして使用し、Agent の記憶を管理できます
- Amazon Bedrock Titan 埋め込みを使用した 1024 次元ベクトルによるセマンティック検索が可能です
- k-NN ベクトル検索とコサイン類似度により、高精度なメモリ検索を実現します
- Elasticsearch Cloud（cloud_id）と Elasticsearch Serverless（URL ベース）の両方の接続に対応しています
- ネームスペースベースのメモリ分離により、マルチテナントアプリケーションでも利用できます

**使用例:**

```python
from strands_tools.elasticsearch_memory import ElasticsearchMemoryToolProvider

# Elasticsearch Cloud を使用する場合
tools = ElasticsearchMemoryToolProvider(
    cloud_id="my-deployment:dXMtZWFz...",
    api_key="your-api-key",
    bedrock_region="us-east-1",
    namespace="user_123"
).get_tools()

# Elasticsearch Serverless を使用する場合
tools = ElasticsearchMemoryToolProvider(
    es_url="https://your-serverless-endpoint.es.amazonaws.com",
    api_key="your-api-key",
    bedrock_region="us-east-1",
    namespace="user_123"
).get_tools()

# Agent で使用
from strands import Agent

agent = Agent(
    name="memory_agent",
    tools=tools,
    instructions="You are a helpful assistant with memory capabilities."
)

# メモリに記録
response = agent.run(
    "Remember that my favorite color is blue.",
    tool_choice_auto=True
)

# メモリから検索
response = agent.run(
    "What is my favorite color?",
    tool_choice_auto=True
)
```

**利用可能なツール:**
- `record_elasticsearch_memory`: メモリに新しい情報を記録
- `retrieve_elasticsearch_memories`: セマンティック検索でメモリを取得
- `list_elasticsearch_memories`: すべてのメモリをリスト表示
- `get_elasticsearch_memory`: ID でメモリを取得
- `delete_elasticsearch_memory`: ID でメモリを削除

**ポイント:**
- 環境変数（`ELASTICSEARCH_CLOUD_ID`、`ELASTICSEARCH_API_KEY`、`AWS_BEDROCK_REGION` など）でも設定可能です
- ネームスペースを使用することで、ユーザーごとや用途ごとにメモリを分離できます
- 自動的にインデックスが作成され、適切なベクトルフィールドマッピングが設定されます
- Elasticsearch への接続には認証情報が必要です

## バグ修正

### ワークフロー重複タスク名ハングアップ問題 ([#279](https://github.com/strands-agents/tools/pull/279))

**修正内容:**
- ワークフローツールで重複するタスク名が存在する場合にハングアップする問題を修正しました
- `workflow_id` と `task_id` を関連付けることで、タスクを一意に識別できるようになりました

**影響を受けていた状況:**
- 同じワークフロー内で同じ名前のタスクを複数定義していた場合
- タスクの完了状態が正しく追跡できず、ワークフローがハングアップしていました

**修正後の動作:**
- タスクは `workflow_id` と `task_id` の組み合わせで識別されるため、同じタスク名でも正しく動作します
- ワークフローの実行が確実に完了するようになりました

## まとめ

このリリースでは、Elasticsearch メモリバックエンドという強力な新機能が追加され、Agent の記憶機能を大幅に強化できるようになりました。また、ワークフローツールの安定性も向上し、より信頼性の高いマルチステップ処理が可能になっています。
