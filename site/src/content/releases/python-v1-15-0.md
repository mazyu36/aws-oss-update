---
title: "sdk-python v1.15.0"
version: "v1.15.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-11-04
summary: "プロバイダ非依存のキャッシング機能、マルチエージェントのセッション永続化、非同期ストリーミング対応など、重要な新機能とバグ修正を含むメジャーアップデート。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.15.0"
---

## 概要

このリリースでは、システムプロンプトのキャッシング機能がプロバイダ非依存で利用可能になり、マルチエージェントシステムにセッション管理と非同期ストリーミングのサポートが追加されました。また、Guardrails のリダクション処理や会話の破損に関する重要なバグ修正も含まれています。

**リリース:** [v1.15.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.15.0)

## 新機能

### プロバイダ非依存のキャッシング機能 - SystemContentBlock サポート ([#1112](https://github.com/strands-agents/sdk-python/pull/1112))

**この機能でできること:**
システムプロンプトで `SystemContentBlock` 配列を使用することで、プロバイダに依存しないキャッシング機能と高度なマルチプロンプトシステム設定が可能になりました。キャッシュポイントをシステムコンテンツ内で明示的に定義できます。

**使用例:**

```python
from strands import Agent
from strands.types.content import SystemContentBlock

# キャッシュポイントを含むシステムコンテンツを定義
system_content: list[SystemContentBlock] = [
    {"text": "You are a helpful assistant with extensive knowledge."},
    {"text": "Your responses should be concise and accurate."},
    {"text": "Always cite sources."},
    {"cachePoint": {"type": "default"}},
]

agent = Agent(system_prompt=system_content)
agent('What is the capital of France?')
```

**ポイント:**
- Bedrock だけでなく、すべてのモデルプロバイダで統一されたインターフェースでキャッシング機能を使用できます
- 既存の `system_prompt` パラメータとの後方互換性が維持されています
- 複数のテキストブロックとキャッシュポイントを組み合わせた高度なシステムプロンプト設定が可能です

---

### マルチエージェントのセッション管理と永続化 ([#1071](https://github.com/strands-agents/sdk-python/pull/1071), [#1110](https://github.com/strands-agents/sdk-python/pull/1110))

**この機能でできること:**
Graph と Swarm のマルチエージェントシステムでセッション管理と状態の永続化がサポートされ、実行を中断しても状態を保存して再開できるようになりました。長時間実行されるワークフローに対応します。

**使用例:**

```python
from strands import Agent
from strands.multiagent import GraphBuilder
from strands.multiagent.base import Status
from strands.session import FileSessionManager

def build_graph(max_nodes: int):
    session_manager = FileSessionManager(
        session_id="my_session_1",
        storage_dir="./sessions"
    )

    builder = GraphBuilder()
    builder.add_node(Agent(
        name="analyzer",
        system_prompt="Explain using 2 paragraphs."
    ))
    builder.add_node(Agent(
        name="summarizer",
        system_prompt="Summarize and be concise. 10 words or less"
    ))

    builder.add_edge("analyzer", "summarizer")
    builder.set_entry_point("analyzer")
    builder.set_max_node_executions(max_nodes)
    builder.set_session_manager(session_manager)

    return builder.build()

# 最初のノード実行後に max_nodes を超えて失敗をシミュレート
result = await build_graph(max_nodes=1).invoke_async("Analyze why 2+2=4")
assert result.status == Status.FAILED

# 新しいセッションで再開 - summarizer から続行
result = await build_graph(max_nodes=10).invoke_async("Analyze why 2+2=4")
assert result.status == Status.COMPLETED
```

**ポイント:**
- 実行状態（完了したノード、ノード結果、次に実行するノードなど）が自動的に保存されます
- 中断したワークフローを同じセッション ID で再開できます
- FileSessionManager と S3SessionManager の両方をサポートしています
- フックシステムと統合され、状態変更時に自動的に永続化されます

---

### マルチエージェントシステムの非同期ストリーミング ([#961](https://github.com/strands-agents/sdk-python/pull/961))

**この機能でできること:**
Graph と Swarm のマルチエージェントシステムで `stream_async` がサポートされ、エージェントチームの実行をリアルタイムでストリーミングできるようになりました。

**使用例:**

```python
from strands import Agent
from strands.multiagent import GraphBuilder

# マルチエージェントグラフを作成
analyzer = Agent(name="analyzer", system_prompt="Analyze the input data")
processor = Agent(name="processor", system_prompt="Process the analysis")

builder = GraphBuilder()
builder.add_node(analyzer)
builder.add_node(processor)
builder.add_edge("analyzer", "processor")
builder.set_entry_point("analyzer")

graph = builder.build()

# エージェントの処理をストリーミング
async for event in graph.stream_async("Analyze this data"):
    event_type = event.get('type', 'unknown')
    print(f"Event: {event_type}")

    if event_type == 'multiAgentNodeStart':
        print(f"Node {event['node']} started")
    elif event_type == 'multiAgentNodeComplete':
        print(f"Node {event['node']} completed")
```

**ポイント:**
- 各ノードの開始・完了イベントをリアルタイムで受信できます
- 並列実行されるノードのイベントもサポートされています
- UI でのプログレス表示やライブアップデートに活用できます
- 単一エージェントのストリーミング API と一貫性のあるインターフェースです

---

## バグ修正

### Guardrails のリダクション処理の修正 ([#1072](https://github.com/strands-agents/sdk-python/pull/1072))
`guardrails_trace="enabled_full"` 設定時に、入力/出力メッセージのリダクション処理が正しく動作していなかった問題を修正しました。トレースに含まれる機密データが適切に保護されるようになりました。

### ツール結果ブロックのリダクション処理 ([#1080](https://github.com/strands-agents/sdk-python/pull/1080))
コンテンツフィルタリングや PII リダクション使用時に、ツール結果ブロックのリダクション処理が不適切で会話が破損する問題を修正しました。

### 孤立した toolUse ブロックの修正 ([#1123](https://github.com/strands-agents/sdk-python/pull/1123))
ツールが失敗または中断された際に孤立した `toolUse` ブロックによって会話が破損する問題を修正し、信頼性が向上しました。

### Reasoning コンテンツの処理 ([#1099](https://github.com/strands-agents/sdk-python/pull/1099))
拡張思考モードをサポートしていないプロバイダでエラーが発生しないよう、リクエストから `reasoningContent` を削除するようにしました。

### Swarm 初期化の最適化 ([#1107](https://github.com/strands-agents/sdk-python/pull/1107))
Swarm の構築時にエージェントを初期化しないようにし、不要なリソース割り当てを防ぎ、起動パフォーマンスを向上させました。

### 構造化出力コンテキストの修正 ([#1128](https://github.com/strands-agents/sdk-python/pull/1128))
ツールエグゼキュータで `None` の構造化出力コンテキストを許可し、構造化レスポンスを必要としないツールのエッジケースを修正しました。

---

## まとめ

v1.15.0 では、プロバイダ非依存のキャッシング機能、マルチエージェントシステムのセッション永続化と非同期ストリーミングなど、重要な新機能が追加されました。また、Guardrails やツール実行に関する複数のバグ修正により、全体的な安定性と信頼性が向上しています。
