---
title: "Strands Python SDK v1.23.0 リリース解説"
version: "v1.23.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-01-21
summary: "Graph での割り込みサポート、モデル呼び出しのリトライ戦略設定、AfterModelCallEvent でのステアリング機能、Nova Sonic 2 対応、BeforeInvocationEvent へのメッセージ公開など、多数の新機能とバグ修正を追加。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.23.0"
---

## 概要

Strands Agents Python SDK v1.23.0 では、Graph でのフックベース割り込みサポート、モデル呼び出しのリトライ戦略をカスタマイズできる `retry_strategy` パラメータ、`AfterModelCallEvent` でのモデルレスポンスステアリング機能、BidiAgent での Nova Sonic 2 サポートなど、多数の新機能が追加されました。また、MCP セッションのハング問題、PEP 563 との互換性問題、Bedrock の thinking モードと tool_choice の競合問題など、複数の重要なバグ修正も含まれています。

**リリース:** [v1.23.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.23.0)

## 新機能

### Graph での割り込み（Interrupt）サポート ([#1478](https://github.com/strands-agents/sdk-python/pull/1478))

**この機能でできること:**
- `BeforeNodeCallEvent` フックから割り込み（Interrupt）を発生させ、Graph の実行を一時停止してユーザー承認を待つことができます。ワークフローの重要なポイントで人間の承認を要求するユースケースに対応します。

**使用例:**

```python
from strands import Agent
from strands.hooks import HookProvider
from strands.hooks.events import BeforeNodeCallEvent
from strands.multiagent import GraphBuilder
from strands.multiagent.base import Status


class ApprovalHook(HookProvider):
    def register_hooks(self, registry):
        registry.add_callback(BeforeNodeCallEvent, self.approve)

    def approve(self, event):
        if event.node_id == "info_agent":
            return

        # 割り込みを発生させ、承認を待つ
        response = event.interrupt("my_interrupt", reason=f"{event.node_id} needs approval")
        if response != "APPROVE":
            event.cancel_node = "node rejected"


info_agent = Agent(name="info")
weather_agent = Agent(name="weather")

builder = GraphBuilder()
builder.add_node(info_agent, "info_agent")
builder.add_node(weather_agent, "weather_agent")
builder.add_edge("info_agent", "weather_agent")
builder.set_hook_providers([ApprovalHook()])
graph = builder.build()

result = graph("What is the weather?")
while result.status == Status.INTERRUPTED:
    responses = []
    for interrupt in result.interrupts:
        response = input(f"{interrupt.reason} (y/N): ")
        responses.append({
            "interruptResponse": {
                "interruptId": interrupt.id,
                "response": "APPROVE" if response.lower() == "y" else "REJECT",
            },
        })
    result = graph(responses)

print(result.results)
```

**ポイント:**
- `event.interrupt()` でノード実行前に割り込みを発生させることができます
- `event.cancel_node` を設定するとノードの実行をキャンセルできます
- 割り込み後は `graph(responses)` で再開します

---

### モデル呼び出しのリトライ戦略設定 ([#1424](https://github.com/strands-agents/sdk-python/pull/1424))

**この機能でできること:**
- `ModelRetryStrategy` を使用して、`ModelThrottledException` 発生時のリトライ動作（最大試行回数、初期遅延、最大遅延）をカスタマイズできます。

**使用例:**

```python
from strands import Agent, ModelRetryStrategy

# カスタムリトライ戦略を設定
agent = Agent(
    retry_strategy=ModelRetryStrategy(
        max_attempts=3,      # 最大3回試行
        initial_delay=2,     # 初期遅延2秒
        max_delay=60         # 最大遅延60秒
    )
)

# デフォルトは max_attempts=6, initial_delay=4, max_delay=320
```

**ポイント:**
- 既存のデフォルト動作（6回試行、指数バックオフ）は維持されています
- API のレート制限に応じてリトライ戦略を調整できます

---

### AfterModelCallEvent でのステアリング ([#1429](https://github.com/strands-agents/sdk-python/pull/1429))

**この機能でできること:**
- `steer_after_model()` メソッドにより、モデルレスポンス後にステアリング（誘導）を行えます。モデルの応答が品質基準を満たさない場合にリトライを強制したり、特定のツール使用を要求したりできます。

**使用例:**

```python
from strands import Agent
from strands.experimental.steering import SteeringHandler, Proceed, Guide


class ForceToolUsageHandler(SteeringHandler):
    def __init__(self, required_tool: str):
        super().__init__()
        self.required_tool = required_tool

    async def steer_after_model(self, agent, message, stop_reason, **kwargs):
        if stop_reason != "end_turn":
            return Proceed(reason="Model still processing")

        # 必須ツールが使用されたかチェック
        for block in message.get("content", []):
            if "toolUse" in block and block["toolUse"].get("name") == self.required_tool:
                return Proceed(reason="Required tool was used")

        # ツール使用を強制
        return Guide(reason=f"You MUST use the {self.required_tool} tool before completing.")


# 必須ツールを使用するまでリトライ
agent = Agent(tools=[log_activity], hooks=[ForceToolUsageHandler("log_activity")])
```

**ポイント:**
- `Proceed`: レスポンスをそのまま受け入れる
- `Guide`: レスポンスを破棄し、ガイダンスを追加してリトライ
- 旧 `steer()` メソッドは `steer_before_tool()` にリネームされました（非推奨警告あり）

---

### BeforeInvocationEvent への入力メッセージの公開 ([#1474](https://github.com/strands-agents/sdk-python/pull/1474))

**この機能でできること:**
- `BeforeInvocationEvent` フックで `message` パラメータにアクセスできるようになり、エージェント呼び出し前に入力メッセージを参照・前処理できます。Guardrails やフィルタリングの実装に有用です。

**使用例:**

```python
from strands import Agent
from strands.hooks import HookProvider
from strands.hooks.events import BeforeInvocationEvent


class InputFilterHook(HookProvider):
    def register_hooks(self, registry):
        registry.add_callback(BeforeInvocationEvent, self.filter_input)

    def filter_input(self, event):
        # 入力メッセージにアクセス可能
        messages = event.messages
        for msg in messages:
            # 入力の前処理やバリデーションを実行
            print(f"Input: {msg}")


agent = Agent(hooks=[InputFilterHook()])
```

**ポイント:**
- エージェント呼び出し前のメッセージ検証やログ記録に活用できます
- Guardrails の実装に便利です

---

### Nova Sonic 2 サポート（BidiAgent） ([#1476](https://github.com/strands-agents/sdk-python/pull/1476))

**この機能でできること:**
- `BidiNovaSonicModel` が Nova Sonic v1 と v2 の両方のモデルに対応しました。v2 の `turn_taking` パラメータやテキスト入力機能もサポートしています。

**使用例:**

```python
from strands.experimental.bidi import BidiAgent
from strands.experimental.bidi.models.nova_sonic import BidiNovaSonicModel

# Nova Sonic 2 モデルを使用
model = BidiNovaSonicModel(
    model_id="amazon.nova-sonic-2-v1:0",
    turn_taking={
        "mode": "semantic"  # v2 の turn_taking パラメータ
    }
)

agent = BidiAgent(model=model)
```

**ポイント:**
- Nova Sonic v1 と v2 の両方をサポート
- v2 のテキスト入力機能に対応
- 非同期ツール呼び出しも正常に動作します

---

### S3SessionManager の並列読み込みサポート ([#1186](https://github.com/strands-agents/sdk-python/pull/1186))

**この機能でできること:**
- `S3SessionManager.list_messages()` が `ThreadPoolExecutor` を使用して複数メッセージを並列に読み込むようになり、多数のメッセージを持つセッションでのパフォーマンスが向上しました。

**使用例:**

```python
from strands.session import S3SessionManager

session_manager = S3SessionManager(
    bucket_name="my-bucket",
    region_name="us-east-1"
)

# 並列読み込みにより高速化
messages = session_manager.list_messages(session_id="my-session")
```

**ポイント:**
- 既存のコードは変更不要（後方互換性あり）
- メッセージ順序は保持されます
- 個々のメッセージ読み込み失敗時も処理を継続します

---

### OTEL_SERVICE_NAME 環境変数のサポート ([#1400](https://github.com/strands-agents/sdk-python/pull/1400))

**この機能でできること:**
- `OTEL_SERVICE_NAME` 環境変数でサービス名を上書きできるようになりました。Datadog などの APM ツールとの統合時に便利です。

**使用例:**

```bash
export OTEL_SERVICE_NAME="my-custom-service"
```

```python
from strands import Agent

# サービス名が "my-custom-service" として記録される
agent = Agent()
```

**ポイント:**
- デフォルトは従来通り "strands-agents"
- 環境変数が設定されている場合のみ上書きされます

---

### マルチエージェントフックイベントの正式版化 ([#1498](https://github.com/strands-agents/sdk-python/pull/1498))

**この機能でできること:**
- `BeforeNodeCallEvent` や `AfterNodeCallEvent` などのマルチエージェントフックイベントが experimental から正式版に昇格しました。`strands.hooks.events` から直接インポートできます。

**使用例:**

```python
# 新しいインポートパス（推奨）
from strands.hooks.events import BeforeNodeCallEvent, AfterNodeCallEvent

# 旧パスも引き続き利用可能（非推奨）
from strands.experimental.hooks.multiagent import BeforeNodeCallEvent
```

**ポイント:**
- 新しいインポートパス `strands.hooks.events` を使用してください
- 既存の experimental パスも後方互換性のため利用可能です

---

## バグ修正

### MCP セッションクローズ時のハングを防止 ([#1396](https://github.com/strands-agents/sdk-python/pull/1396))
- MCP クライアントが、バックグラウンドイベントループが終了した後もツール呼び出しをスケジュールしようとして無限にハングする問題を修正しました
- `_is_session_active` が `_close_future` の完了状態をチェックするようになりました

### AgentResult.__str__() での citationsContent テキスト抽出 ([#1489](https://github.com/strands-agents/sdk-python/pull/1489))
- 引用（citations）が有効な場合、`AgentResult.__str__()` が `citationsContent` ブロック内のテキストをスキップしていた問題を修正しました
- 引用付きレスポンスのテキストが正しく抽出されるようになりました

### PEP 563 と @tool デコレータの互換性 ([#1494](https://github.com/strands-agents/sdk-python/pull/1494))
- `from __future__ import annotations` を使用するモジュールで `@tool` デコレータが Pydantic 2.12+ で `PydanticUserError` を発生させる問題を修正しました
- `get_type_hints()` を使用して文字列アノテーションを適切に解決するようになりました

### Bedrock thinking モードと tool_choice の競合を解消 ([#1495](https://github.com/strands-agents/sdk-python/pull/1495))
- `structured_output` と thinking モードを併用した際に、`tool_choice` 強制時に `ValidationException` が発生する問題を修正しました
- `tool_choice` が強制される場合、一時的に thinking 設定を無効化します

### A2A artifact update イベントの使用 ([#1401](https://github.com/strands-agents/sdk-python/pull/1401))
- A2A エグゼキュータがストリーミング中間チャンクに `artifact update` イベントを使用するようになりました
- `enable_a2a_compliant_streaming` フラグで有効化できます

### Gemini モデルの一意な toolUseId 生成 ([#1201](https://github.com/strands-agents/sdk-python/pull/1201))
- Gemini モデルで `toolUseId` がツール名で埋められていた問題を修正し、一意な ID を生成するようになりました

### LiteLLM ストリーミング時の usage 属性エラー ([#1520](https://github.com/strands-agents/sdk-python/pull/1520))
- LiteLLM でストリーミング時に `AttributeError: 'ModelResponseStream' object has no attribute 'usage'` が発生する問題を修正しました

### Swarm の execution_time 累積 ([#1502](https://github.com/strands-agents/sdk-python/pull/1502))
- Swarm で割り込み/再開サイクルをまたいで `execution_time` が正しく累積されるようになりました
- タイムアウトチェックも累積時間を考慮するようになりました

---

## まとめ

v1.23.0 は、Graph での割り込みサポートによりヒューマン・イン・ザ・ループのワークフローが実現可能になり、モデルリトライ戦略のカスタマイズ、モデルレスポンスへのステアリング機能など、エージェント制御の柔軟性が大幅に向上しました。Nova Sonic 2 のサポートや S3SessionManager の並列読み込みなど、パフォーマンスと機能の両面で改善されています。また、MCP セッションのハング問題や PEP 563 との互換性問題など、複数の重要なバグ修正により安定性が向上しています。
