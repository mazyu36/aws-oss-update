---
title: "Strands Python SDK v1.11.0 リリース解説"
version: "v1.11.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-10-08
summary: "OTEL v1.37 セマンティック規約への対応、セッションマネージャーのパフォーマンス向上、フック機能によるツール呼び出しのキャンセル機能を追加"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.11.0"
---

## 概要

このリリースでは、テレメトリー機能の強化として OpenTelemetry v1.37 のセマンティック規約に対応しました。また、セッションマネージャーに並行メッセージ読み込み機能を実装し、長い会話履歴の読み込みパフォーマンスが向上しました。さらに、フック機能を使ってツール呼び出しをキャンセルできる新機能により、Human-in-the-Loop フローがより柔軟に実装できるようになりました。

**リリース:** [v1.11.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.11.0)

## 新機能

### OTEL v1.37 セマンティック規約への対応 ([#952](https://github.com/strands-agents/sdk-python/pull/952))

**この機能でできること:**
OpenTelemetry v1.37 の最新セマンティック規約に準拠したトレース情報を出力できるようになりました。環境変数 `OTEL_SEMCONV_STABILITY_OPT_IN` に `gen_ai_latest_experimental` を設定することで、新しい規約形式に切り替えることができます。

**使用例:**

```python
import os
from strands import Agent

# 最新の OTEL セマンティック規約を有効化
os.environ["OTEL_SEMCONV_STABILITY_OPT_IN"] = "gen_ai_latest_experimental"

# Agent を初期化（テレメトリーが自動的に有効化される）
agent = Agent(
    model="claude-3-5-sonnet-20241022",
    system="あなたは親切なアシスタントです"
)

# トレース情報が新しい規約形式で記録される
response = agent.run("こんにちは")
```

**ポイント:**
- `gen_ai.system` が `gen_ai.provider.name` に変更されました
- イベント名が `gen_ai.client.inference.operation.details` に統一されました
- 入力は `gen_ai.input.messages`、出力は `gen_ai.output.messages` 属性に格納されます

---

### セッションマネージャーの並行メッセージ読み込み ([#897](https://github.com/strands-agents/sdk-python/pull/897))

**この機能でできること:**
S3SessionManager と FileSessionManager で複数のメッセージを並行して読み込めるようになり、長い会話履歴を持つセッションの読み込み速度が大幅に向上しました。

**使用例:**

```python
from strands.session import FileSessionManager
from strands import Agent

# セッションマネージャーを使用
session_manager = FileSessionManager(session_dir="./sessions")

agent = Agent(
    model="claude-3-5-sonnet-20241022",
    session_id="user-123",
    session_manager=session_manager
)

# 長い会話履歴を持つセッションでも高速に読み込まれる
response = agent.run("前回の会話について教えて")
```

**ポイント:**
- `asyncio.gather()` を使用した並行読み込みにより、複数メッセージを同時に取得します
- メッセージの順序は適切に保持されます
- S3 と ファイルシステム両方のセッションマネージャーで利用可能です

---

### フックからのツール呼び出しキャンセル ([#964](https://github.com/strands-agents/sdk-python/pull/964))

**この機能でできること:**
`BeforeToolCallEvent` フックからツール呼び出しをキャンセルできるようになりました。Human-in-the-Loop フローで、ユーザーがツール実行を拒否した場合に、そのツールの実行を中止できます。

**使用例:**

```python
from strands import Agent
from strands.hooks import HookProvider
from strands.hooks.events import BeforeToolCallEvent

class ApprovalHook(HookProvider):
    def register_hooks(self, registry) -> None:
        registry.add_callback(BeforeToolCallEvent, self.require_approval)

    def require_approval(self, event: BeforeToolCallEvent) -> None:
        # 重要なツールには承認が必要
        if event.tool_use["name"] == "delete_database":
            response = event.interrupt("データベース削除の承認が必要です。実行しますか？")
            if response.lower() == "reject":
                event.cancel_tool = "ユーザーによりツール実行が拒否されました"

# フックを登録
agent = Agent(
    model="claude-3-5-sonnet-20241022",
    hooks=[ApprovalHook()]
)

response = agent.run("データベースを削除して")
# ユーザーが拒否した場合、ツールは実行されず、エラー結果がモデルに返される
```

**ポイント:**
- キャンセルされたツールは実行されず、`status: "error"` の結果が返されます
- 他の並行実行中のツールには影響しません
- エージェントループは継続し、すべての結果が次のイテレーションでモデルに送信されます

## バグ修正

### テレメトリーイベントの二重シリアライゼーション修正 ([#977](https://github.com/strands-agents/sdk-python/pull/977))
- スパンにイベントを追加する際の二重シリアライゼーションを削除しました
- トレースデータの正確性が向上し、不要なオーバーヘッドが削減されました

### LiteLLM コンテキストウィンドウエラーのマッピング ([#994](https://github.com/strands-agents/sdk-python/pull/994))
- LiteLLM が発生させるコンテキストウィンドウエラーを `ContextWindowOverflowException` に適切にマッピングするようになりました
- エージェントがコンテキストウィンドウオーバーフローをより確実に処理できるようになりました

## まとめ

v1.11.0 では、テレメトリー機能の標準化、パフォーマンスの向上、Human-in-the-Loop フローの柔軟性向上など、重要な機能強化とバグ修正が行われました。
