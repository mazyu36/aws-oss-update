---
title: "sdk-python v1.4.0"
version: "v1.4.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-08-08
summary: "Agent-to-Agent サーバーのカスタマイズ可能なリクエストハンドラー、MCP トレーシングコンテキスト伝播の修正、max_tokens 後の tool_use コンテンツブロックの検証、structured_output での会話履歴の変更防止などの機能とバグ修正を含むリリース。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.4.0"
---

## 概要

Strands Agents Python SDK v1.4.0 では、Agent-to-Agent (A2A) サーバーの拡張性を向上させる新機能と、テレメトリ、イベントループ、structured_output に関する重要なバグ修正が含まれています。A2A サーバーのコンポーネントをカスタム実装に置き換えられるようになり、max_tokens に関連するいくつかの問題も解決されました。

**リリース:** [v1.4.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.4.0)

## 新機能

### A2A サーバーのカスタマイズ可能なリクエストハンドラー ([#601](https://github.com/strands-agents/sdk-python/pull/601))

**この機能でできること:**
- A2A サーバーの内部コンポーネント（タスクストレージ、キューマネージャー、プッシュ通知など）をカスタム実装に置き換えられるようになりました。これにより、データベース統合、分散キュー、カスタム通知システムなどを実装できます。

**使用例:**

```python
from strands import Agent
from strands.multiagent.a2a import A2AServer
from strands.multiagent.a2a.server.tasks import TaskStore

# 基本的な使用方法（変更なし）
agent = Agent(name="My Agent", description="基本的なエージェント")
server = A2AServer(
    strands_agent=agent,
    host="localhost",
    port=8000
)

# カスタムタスクストレージを使用
class CustomTaskStore(TaskStore):
    """データベースを使用したタスクストレージ"""

    async def get_task(self, task_id: str):
        # データベースからタスクを取得
        pass

    async def save_task(self, task):
        # データベースにタスクを保存
        pass

server_with_custom_storage = A2AServer(
    strands_agent=agent,
    host="localhost",
    port=8000,
    task_store=CustomTaskStore()
)

# プッシュ通知を使用した完全なカスタマイズ例
from strands.multiagent.a2a.server.tasks import PushNotificationConfigStore, PushNotificationSender

server_with_push = A2AServer(
    strands_agent=agent,
    host="localhost",
    port=8000,
    task_store=CustomTaskStore(),
    push_config_store=MyPushConfigStore(),
    push_sender=MyPushSender()
)
```

**ポイント:**
- すべての新しいパラメータはオプションで、後方互換性が保たれています
- カスタム実装は SDK が定義するインターフェースに準拠する必要があります
- task_store、queue_manager、push_config_store、push_sender のカスタマイズが可能です

---

## バグ修正

### MCP トレーシングコンテキスト伝播の追加 ([#569](https://github.com/strands-agents/sdk-python/pull/569))
- MCP ツール呼び出し時に OpenTelemetry コンテキストが _meta フィールドを通じてツールに伝播されるようになりました
- これにより、同じ親リクエストからの MCP 呼び出しのトレースがグループ化され、分散トレーシングが改善されます

### max_tokens の型を int に変更 ([#588](https://github.com/strands-agents/sdk-python/pull/588))
- max_tokens のタイプアノテーションを文字列から整数に修正しました
- 以前の型では Anthropic API 呼び出し時に BadRequestError が発生していました

### max_tokens 後の tool_use コンテンツブロックの検証 ([#607](https://github.com/strands-agents/sdk-python/pull/607))
- LLM が tool_use コンテンツブロックを生成中に max_tokens に達した場合に、エージェントが回復不可能な状態になる問題を修正しました
- 新しいイベント処理メカニズムにより、不完全な tool_use コンテンツブロックが自動的にフィルタリングされるようになりました
- これにより、MaxTokensReachedException の発生後もエージェントを再起動できるようになりました

### structured_output での会話履歴の変更を回避 ([#628](https://github.com/strands-agents/sdk-python/pull/628))
- agent.structured_output() に prompt パラメータを渡した際に、会話履歴が不必要に変更される問題を修正しました
- structured_output はユーティリティ関数であり、エージェント呼び出しではないため、会話履歴を汚染すべきではありません

---

## まとめ

v1.4.0 は、A2A サーバーのカスタマイズ性を向上させる重要な新機能と、max_tokens、テレメトリ、structured_output に関する重要なバグ修正を含むリリースです。これらの改善により、より柔軟で堅牢なエージェントアプリケーションの構築が可能になります。
