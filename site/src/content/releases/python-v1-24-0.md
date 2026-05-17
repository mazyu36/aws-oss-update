---
title: "Strands Python SDK v1.24.0 リリース解説"
version: "v1.24.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-01-29
summary: "Bedrock での自動プロンプトキャッシング、ツール呼び出しのリトライ機構、ToolProvider の正式版化、フックイベントへの invocation_state 追加など、多数の新機能とバグ修正を追加。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.24.0"
---

## 概要

Strands Agents Python SDK v1.24.0 では、Bedrock モデルでの自動プロンプトキャッシングサポート、ツール呼び出し失敗時のリトライ機構、`ToolProvider` の experimental からの正式版化、主要フックイベントへの `invocation_state` 追加など、多数の新機能が追加されました。また、ステアリング機能での `tool_args` 修正、Gemini での reasoning content の処理改善、マルチエージェントでの割り込み時のイベント発火修正など、複数のバグ修正も含まれています。

**リリース:** [v1.24.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.24.0)

## 新機能

### Bedrock での自動プロンプトキャッシングサポート ([#1438](https://github.com/strands-agents/sdk-python/pull/1438))

**この機能でできること:**
- `CacheConfig` を使用して Bedrock モデルで自動プロンプトキャッシングを有効化できます。各モデル呼び出し前に、最後のアシスタントメッセージの末尾にキャッシュポイントが自動的に挿入されます。

**使用例:**

```python
from strands import Agent
from strands.models import BedrockModel, CacheConfig

model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    cache_config=CacheConfig(strategy="auto")
)

agent = Agent(model=model)
result = agent("長いコンテキストを持つ質問")
```

**ポイント:**
- プロンプトキャッシング対応の Claude モデルで利用可能です
- キャッシュヒット時にコストとレイテンシを削減できます
- `strategy="auto"` で自動キャッシュポイント挿入が有効になります

---

### ツール呼び出しのリトライ機構 ([#1556](https://github.com/strands-agents/sdk-python/pull/1556))

**この機能でできること:**
- `AfterToolCallEvent` に `retry` フィールドが追加され、フックコールバックからツールの再実行をトリガーできるようになりました。ツール失敗やタイムアウト、一時的なエラーに対するカスタムリトライ戦略を実装できます。

**使用例:**

```python
from strands import Agent
from strands.hooks.events import AfterToolCallEvent

call_count = 0

def retry_on_first_error(event: AfterToolCallEvent) -> None:
    global call_count
    call_count += 1
    # エラー時に1回だけリトライ
    if event.result.get("status") == "error" and call_count == 1:
        event.retry = True

agent = Agent(tools=[flaky_tool])
agent.hooks.add_callback(AfterToolCallEvent, retry_on_first_error)

result = agent("不安定なツールを実行して")
```

**ポイント:**
- `event.retry = True` を設定すると、現在の結果を破棄してツールを再実行します
- 中間のストリームイベントは全ての試行で発行されます
- 最終の `ToolResultEvent` は最後の試行のみで発行されます

---

### ToolProvider の正式版化 ([#1567](https://github.com/strands-agents/sdk-python/pull/1567))

**この機能でできること:**
- `ToolProvider` 抽象基底クラスが `strands.experimental.tools` から `strands.tools` に移動し、安定した公開 API として正式版になりました。

**使用例:**

```python
# 新しいインポートパス（推奨）
from strands.tools import ToolProvider

# 旧パスも引き続き利用可能（非推奨警告あり）
from strands.experimental.tools import ToolProvider
```

**ポイント:**
- `strands.tools` からのインポートを推奨します
- 旧パスは `DeprecationWarning` を発行しますが、引き続き動作します
- MCP クライアントなどカスタムツールプロバイダーの実装が安定 API になりました

---

### フックイベントへの invocation_state 追加 ([#1550](https://github.com/strands-agents/sdk-python/pull/1550))

**この機能でできること:**
- `BeforeInvocationEvent`、`AfterInvocationEvent`、`BeforeModelCallEvent`、`AfterModelCallEvent` に `invocation_state` が追加されました。リクエストトラッキング、マルチエージェント連携、コンテキスト対応ログなど、リクエストライフサイクル全体を通じた横断的な処理が可能になります。

**使用例:**

```python
from strands import Agent
from strands.hooks import HookProvider
from strands.hooks.events import BeforeInvocationEvent, AfterInvocationEvent

class RequestTracker(HookProvider):
    def register_hooks(self, registry):
        registry.add_callback(BeforeInvocationEvent, self.on_start)
        registry.add_callback(AfterInvocationEvent, self.on_end)

    def on_start(self, event):
        # invocation_state に追跡情報を設定
        event.invocation_state["request_id"] = "req-12345"
        print(f"Request started: {event.invocation_state}")

    def on_end(self, event):
        # 同じ invocation_state にアクセス可能
        print(f"Request ended: {event.invocation_state}")

agent = Agent(hooks=[RequestTracker()])
```

**ポイント:**
- `AgentInitializedEvent` と `MessageAddedEvent` は `invocation_state` を持ちません（呼び出し外で発火するため）
- ツール関連イベントでは既に `invocation_state` が利用可能でした

---

### AgentResult.__str__ の優先順位更新 ([#1553](https://github.com/strands-agents/sdk-python/pull/1553))

**この機能でできること:**
- `AgentResult.__str__()` の優先順位が更新され、(1) 割り込み、(2) 構造化出力、(3) メッセージテキストの順で返すようになりました。最も重要な情報が常に最初に返されます。

**使用例:**

```python
from strands import Agent
from pydantic import BaseModel

class Response(BaseModel):
    answer: str

agent = Agent()

# 構造化出力がある場合、それが優先される
result = agent("質問に答えて", output_model=Response)
print(str(result))  # 構造化出力の内容が表示される
```

**ポイント:**
- 割り込みが存在する場合は割り込み情報が最優先
- 次に構造化出力、最後にメッセージテキスト
- 空の割り込みリストは無視されます

---

## バグ修正

### ステアリングでの tool_args の正しい設定 ([#1531](https://github.com/strands-agents/sdk-python/pull/1531))
- ステアリング機能の ledger で `tool_args` が設定されていなかった問題を修正しました
- `BeforeToolCallEvent` から正しいフィールドを参照するようになりました

### マルチエージェントでの割り込み時のイベント発火修正 ([#1539](https://github.com/strands-agents/sdk-python/pull/1539))
- Graph や Swarm でノードが割り込まれた際に `AfterNodeCallEvent` が発火していた問題を修正しました
- シングルエージェントの `AfterToolCallEvent` と同様、割り込み中はイベントを発火しないようになりました

### Gemini モデルでの reasoning content の処理改善 ([#1557](https://github.com/strands-agents/sdk-python/pull/1557))
- Gemini モデルで `thinking_config` を有効にした際、thinking content がコンソールに出力されるがメッセージ履歴にキャプチャされない問題を修正しました
- `text` と `reasoning_content` タイプ間の切り替えを正しく処理するようになりました

### ツール入力なしの場合のコールバックハンドラ修正 ([#1573](https://github.com/strands-agents/sdk-python/pull/1573))
- 入力パラメータを持たないツールが `PrintCallbackHandler` で表示されない問題を修正しました
- モデルがツール入力デルタをストリーミングしない場合でもツールが正しく報告されるようになりました

---

## まとめ

v1.24.0 は、Bedrock での自動プロンプトキャッシングによりコストとレイテンシの最適化が可能になり、ツール呼び出しのリトライ機構でより堅牢なエージェント実装が実現できます。`ToolProvider` の正式版化やフックイベントへの `invocation_state` 追加により、カスタム拡張やリクエストトラッキングの実装が容易になりました。また、複数のバグ修正により安定性が向上しています。
