---
title: "sdk-python v1.9.0"
version: "v1.9.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-09-17
summary: "キャッシュ使用量メトリクスの追加、Swarm のエントリーポイント設定機能、Bedrock の redactedContent サポート、MCP クライアントの安定性向上など、テレメトリと複数エージェント機能の大幅な改善が含まれています。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.9.0"
---

## 概要

このリリースでは、OpenTelemetry によるキャッシュトークン使用量の監視機能、Swarm の柔軟なエントリーポイント設定、Bedrock の推論内容の秘匿化サポート、MCP クライアントの重要なバグ修正など、テレメトリと複数エージェント機能の大幅な改善が行われました。

**リリース:** [v1.9.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.9.0)

## 新機能

### キャッシュ使用量メトリクスの追加 ([#825](https://github.com/strands-agents/sdk-python/pull/825))

**この機能でできること:**
OpenTelemetry スパンにキャッシュトークンの使用量（読み取り・書き込み）を追加し、コスト計算のための監視が可能になりました。`cacheReadInputTokens` と `cacheWriteInputTokens` の属性が `end_model_invoke_span` と `end_agent_span` メソッドに追加されています。

**使用例:**

```python
from strands.agent import Agent
from strands.telemetry import configure_telemetry

# OpenTelemetry の設定
configure_telemetry()

# エージェントを作成して実行
agent = Agent(
    name="my_agent",
    instructions="あなたは親切なアシスタントです",
    model="anthropic.claude-3-5-sonnet-20241022-v2:0"
)

# エージェント実行時にキャッシュ使用量が自動的に記録される
response = agent.run("こんにちは")
```

**ポイント:**
- キャッシュトークンの使用量を監視することで、API コストを正確に追跡できます
- 既存のテレメトリ設定に自動的に統合されるため、追加の設定は不要です

---

### Swarm のエントリーポイント設定機能 ([#851](https://github.com/strands-agents/sdk-python/pull/851))

**この機能でできること:**
Swarm マルチエージェントシステムにおいて、実行を開始するエージェントを指定できるようになりました。以前はリストの最初のエージェントから常に開始されていましたが、`entry_point` パラメータで柔軟に制御できます。

**使用例:**

```python
from strands.agent import Agent
from strands.multiagent import Swarm

# 複数のエージェントを作成
coordinator = Agent(name="coordinator", instructions="タスクを調整します")
analyst = Agent(name="analyst", instructions="データを分析します")
writer = Agent(name="writer", instructions="レポートを作成します")

# 以前: 常に最初のエージェント（coordinator）から開始
swarm = Swarm([coordinator, analyst, writer])

# 新機能: 特定のエージェント（analyst）から開始
swarm = Swarm([coordinator, analyst, writer], entry_point="analyst")

# 実行すると analyst から開始される
response = swarm.run("データを分析してください")
```

**ポイント:**
- 既存のコードとの完全な後方互換性があります（デフォルトは最初のエージェント）
- 指定されたエントリーポイントが存在しない場合は検証エラーが発生します
- ワークフローの柔軟な制御が可能になります

---

### Bedrock の redactedContent サポート ([#848](https://github.com/strands-agents/sdk-python/pull/848))

**この機能でできること:**
Amazon Bedrock の推論モード（thinking mode）で生成される秘匿化された推論内容（`redactedContent`）を適切に処理できるようになりました。新しい `RedactedContentStreamEvent` クラスが追加され、イベントストリーミングパイプライン全体で秘匿化コンテンツが正しく処理されます。

**使用例:**

```python
from strands.agent import Agent
from strands.types import RedactedContentStreamEvent

# Bedrock モデルで推論モードを有効化
agent = Agent(
    name="bedrock_agent",
    instructions="あなたは論理的思考を行うアシスタントです",
    model="anthropic.claude-3-5-sonnet-20241022-v2:0",
    thinking_enabled=True  # 推論モードを有効化
)

# イベントハンドラーで秘匿化コンテンツを処理
def handle_stream_event(event):
    if isinstance(event, RedactedContentStreamEvent):
        print(f"秘匿化された推論: {event.content}")

# ストリーミング実行
for event in agent.stream("複雑な問題を解決してください"):
    handle_stream_event(event)
```

**ポイント:**
- Bedrock の推論モードを使用する際に、秘匿化された内部思考プロセスを適切にハンドリングできます
- 既存のイベントストリーミング API に統合されているため、一貫した方法で処理できます

## バグ修正

### tool_input の型定義を追加 ([#854](https://github.com/strands-agents/sdk-python/pull/854))
- `tool_input` パラメータの型定義を追加し、mypy の型チェックエラーを解決しました
- 型安全性が向上し、開発時のエラー検出が容易になります

### OpenTelemetry でのツール結果メッセージのラベル修正 ([#839](https://github.com/strands-agents/sdk-python/pull/839))
- ツール結果メッセージが誤って `gen_ai.user.message` とラベル付けされていた問題を修正
- OpenTelemetry のセマンティック規約に従い、`gen_ai.tool.message` として正しくラベル付けされるようになりました
- `_get_event_name_for_message()` ヘルパーメソッドを追加し、メッセージタイプに応じた正確なイベント名を決定します

### MCP クライアントの初期化失敗時の自動クリーンアップ ([#833](https://github.com/strands-agents/sdk-python/pull/833))
- MCP クライアントの初期化がタイムアウトで失敗した際にハングする重大なレースコンディションを修正
- `__enter__` が失敗した場合でも、バックグラウンドスレッドが適切にクリーンアップされるようになりました
- `start()` メソッドに防御的なクリーンアップロジックを追加し、初期化失敗時に `stop()` を呼び出すようにしました

### MCP クライアントの stop() メソッドの堅牢性向上 ([#876](https://github.com/strands-agents/sdk-python/pull/876))
- `stop()` メソッドで `_background_thread_session` の存在確認が不要になりました
- セッションが初期化されていない状態でも安全に `stop()` を呼び出せるようになりました
- レースコンディションによるエラーを防ぎ、部分的な初期化状態でも正しく動作します

## まとめ

v1.9.0 では、テレメトリ機能の強化、マルチエージェントシステムの柔軟性向上、Bedrock サポートの拡充、そして MCP クライアントの安定性向上が実現されました。キャッシュトークンの監視、Swarm のエントリーポイント設定、秘匿化コンテンツの適切な処理により、より強力で信頼性の高いエージェントアプリケーションの開発が可能になります。

---
