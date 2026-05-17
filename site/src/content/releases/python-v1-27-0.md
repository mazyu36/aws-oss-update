---
title: "Strands Python SDK v1.27.0 リリース解説"
version: "v1.27.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-02-18
summary: "フック登録の新しい add_hook メソッド、並行呼び出し制御の concurrent_invocation_mode パラメータ、ツール例外の AfterToolCallEvent への伝播機能が追加されました。また、A2AAgent、Gemini、OpenAI モデルに関する複数のバグが修正されています。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.27.0"
---

## 概要

このリリースでは、フック登録をより簡単にする `add_hook` メソッド、並行呼び出しの制御を可能にする `concurrent_invocation_mode` パラメータ、そしてツール例外を `AfterToolCallEvent` に伝播する機能が追加されました。また、A2AAgent、Gemini、OpenAI モデルに関する複数のバグ修正が含まれています。

**リリース:** [v1.27.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.27.0)

## 新機能

### フック登録の便利メソッド add_hook ([#1706](https://github.com/strands-agents/sdk-python/pull/1706))

**この機能でできること:**
- Agent クラスに `add_hook` メソッドが追加され、フックコールバックの登録がより直感的になりました。内部レジストリにアクセスする必要がなくなります。

**使用例:**

```python
from strands import Agent
from strands.types.events import BeforeModelCallEvent

# 明示的にイベントタイプを指定
def my_callback(event):
    print(f"Model call for: {event.agent.name}")

agent = Agent()
agent.add_hook(my_callback, BeforeModelCallEvent)

# 型ヒントからイベントタイプを自動推論
def my_typed_callback(event: BeforeModelCallEvent) -> None:
    print(f"Model call for: {event.agent.name}")

agent.add_hook(my_typed_callback)  # event_type は自動的に推論される
```

**ポイント:**
- イベントタイプは第 2 引数で明示的に指定するか、コールバックの型ヒントから自動推論されます
- 型ヒントがない場合は `ValueError` が発生します

---

### 並行呼び出しモードの制御 ([#1707](https://github.com/strands-agents/sdk-python/pull/1707))

**この機能でできること:**
- `concurrent_invocation_mode` パラメータにより、エージェントの並行呼び出し動作を制御できるようになりました。デフォルトでは並行呼び出し時に `ConcurrencyException` が発生しますが、必要に応じてこの動作を変更できます。

**使用例:**

```python
from strands import Agent
from strands.types.agent import ConcurrentInvocationMode

# デフォルト動作: 並行呼び出しで例外を発生
agent = Agent(model=model)

# 並行呼び出しを許可（自己責任）
agent = Agent(
    model=model,
    concurrent_invocation_mode="unsafe_reentrant"
)
```

**ポイント:**
- `"throw"` (デフォルト): 並行呼び出し時に `ConcurrencyException` を発生
- `"unsafe_reentrant"`: ロック取得をスキップし、並行呼び出しを許可（ユーザーが責任を負う）
- エージェントを途中で中断して再呼び出しする必要があるユースケースで有用です

---

### ツール例外の AfterToolCallEvent への伝播 ([#1566](https://github.com/strands-agents/sdk-python/pull/1566))

**この機能でできること:**
- `@tool` デコレーターで定義されたツールで発生した例外が `AfterToolCallEvent.exception` に伝播されるようになりました。これにより、フックプロバイダーで例外の種類に応じた処理が可能になります。

**使用例:**

```python
from strands.hooks import HookProvider
from strands.types.events import AfterToolCallEvent

class PropagateUnexpectedExceptions(HookProvider):
    def __init__(self, allowed_exceptions=(ValueError,)):
        self.allowed_exceptions = allowed_exceptions

    def register_hooks(self, registry, **kwargs):
        registry.add_callback(AfterToolCallEvent, self._check)

    def _check(self, event: AfterToolCallEvent):
        if event.exception is None:
            return
        if isinstance(event.exception, self.allowed_exceptions):
            return  # モデルにリトライさせる
        raise event.exception  # 予期しないエラーは伝播
```

**ポイント:**
- デフォルトではエラー結果はモデルに返されます。伝播させる場合はフック内で明示的に再 raise する必要があります
- バリデーションエラーなど予期されるエラーとアサーションエラーなど予期しないエラーを区別できます
- 無駄なリトライを防ぎ、フェイルファストを実現できます

---

## バグ修正

### A2AAgent が空の AgentResult content を返す問題を修正 ([#1675](https://github.com/strands-agents/sdk-python/pull/1675))

- **問題:** 最後のイベントが `message=None` の `TaskStatusUpdateEvent` の場合、`A2AAgent` が空の `AgentResult` content を返していました
- **原因:** `task.artifacts` へのフォールバックが `update_event is None` の場合のみ発生していました
- **修正:** イベントからコンテンツを抽出した後、`content` が空の場合は無条件で `task.artifacts` にフォールバックするように変更しました

---

### Gemini の tool use で reasoningSignature を伝播 ([#1703](https://github.com/strands-agents/sdk-python/pull/1703))

- **問題:** Gemini モデルでツール呼び出し時に `reasoningSignature` が正しく伝播されていませんでした
- **修正:** `thought_signature` の base64 エンコード/デコードを修正し、`function_call` パーツに reasoning signature をスレッディングするようにしました

---

### OpenAI モデルのツール呼び出しのみのレスポンスを処理 ([#1562](https://github.com/strands-agents/sdk-python/pull/1562))

- **問題:** 一部の OpenAI モデル（例: openai.gpt-oss-120b）がツール呼び出しのみでテキストコンテンツなしのレスポンスを返す場合、空の content 配列でバリデーションエラーが発生していました
- **エラー:** `BadRequestError: 1 validation error for Message content.0 Input should be a valid dictionary or instance of Content`
- **修正:** `formatted_contents` が空の場合は `content` キーを含めないように変更しました。LiteLLM モデルにも同様の修正が適用されています

---

### MCP の最小依存関係を 1.23.0 に更新 ([#1674](https://github.com/strands-agents/sdk-python/pull/1674))

- **問題:** MCP SDK 1.22.0 以前では `ServerCapabilities` オブジェクトに `tasks` 属性がなく、`AttributeError` が発生していました
- **修正:** `mcp` の最小依存関係バージョンを Tasks サポートが追加された 1.23.0 に更新しました

---

## まとめ

フック登録の簡素化、並行呼び出し制御、例外伝播機能により、エージェントの柔軟な制御が可能になりました。また、A2AAgent、Gemini、OpenAI モデルの複数のバグ修正により安定性が向上しています。
