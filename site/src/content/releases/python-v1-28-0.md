---
title: "Strands Python SDK v1.28.0 リリース解説"
version: "v1.28.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-02-25
summary: "Plugin システムの導入により Agent の拡張性が大幅に向上。add_hook での union 型・リスト型サポート、PyAudio のオプション依存関係化も含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.28.0"
---

## 概要

このリリースでは、Agent の拡張性を高める **Plugin システム**が導入されました。複数の関連フック処理を再利用可能なプラグインとしてまとめることができます。また、`add_hook` で複数イベントタイプへの一括登録が可能になり、PyAudio がオプション依存関係になることでサーバーサイドデプロイが軽量化されました。

**リリース:** [v1.28.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.28.0)

## 新機能

### Plugin システムの導入 ([#1733](https://github.com/strands-agents/sdk-python/pull/1733), [#1734](https://github.com/strands-agents/sdk-python/pull/1734))

**この機能でできること:**
- 関連するフックやエージェント拡張機能を再利用可能なプラグインとしてまとめられます
- サードパーティやコミュニティによる Agent 拡張の標準インターフェースを提供します

**使用例:**

```python
from strands import Agent, Plugin
from strands.hooks import BeforeModelCallEvent

class LoggingPlugin:
    name = "logging"

    def init_agent(self, agent: Agent) -> None:
        agent.add_hook(self._log_model_call, BeforeModelCallEvent)

    def _log_model_call(self, event: BeforeModelCallEvent) -> None:
        print(f"Model call started: {event}")

# plugins パラメータでプラグインを登録
agent = Agent(plugins=[LoggingPlugin()])
```

**非同期初期化にも対応:**

```python
class AsyncPlugin:
    name = "async-setup"

    async def init_agent(self, agent: Agent) -> None:
        await some_async_setup()
        agent.add_hook(self.on_event, SomeEvent)
```

**ポイント:**
- `init_agent` メソッドは同期・非同期の両方に対応
- プラグインは `Agent` 初期化時に自動的に設定されます

---

### add_hook での union 型・リスト型サポート ([#1719](https://github.com/strands-agents/sdk-python/pull/1719))

**この機能でできること:**
- 同じコールバックを複数のイベントタイプに一度に登録できます
- union 型ヒントまたは明示的なリストでイベントタイプを指定可能です

**使用例:**

```python
from strands import Agent
from strands.hooks import BeforeModelCallEvent, AfterModelCallEvent

agent = Agent()

# 方法1: union 型ヒントで自動登録
def log_event(event: BeforeModelCallEvent | AfterModelCallEvent) -> None:
    print(f"Event: {type(event).__name__}")

agent.add_hook(log_event)  # 両方のイベントタイプに登録される

# 方法2: リストで明示的に指定
def log_event(event) -> None:
    print(f"Event: {type(event).__name__}")

agent.add_hook(log_event, [BeforeModelCallEvent, AfterModelCallEvent])
```

**従来の方法との比較:**

```python
# Before: 同じコールバックを2回登録する必要があった
agent.add_hook(log_event, BeforeModelCallEvent)
agent.add_hook(log_event, AfterModelCallEvent)

# After: 1回で登録可能
agent.add_hook(log_event, [BeforeModelCallEvent, AfterModelCallEvent])
```

**ポイント:**
- ログ記録や分析など、複数イベントで同じ処理を行う場合に便利です

---

### PyAudio のオプション依存関係化 ([#1731](https://github.com/strands-agents/sdk-python/pull/1731))

**この機能でできること:**
- サーバーサイドデプロイで不要な PyAudio 依存を回避できます
- 必要な場合のみ音声 I/O 機能をインストールできます

**使用例:**

```bash
# サーバーサイド向け（PyAudio なし）
pip install strands-agents[bidi]

# ローカルデモ向け（音声 I/O 付き）
pip install strands-agents[bidi,bidi-io]
```

**ポイント:**
- ブラウザやモバイルアプリで音声を処理する場合、サーバー側に PyAudio は不要です
- これによりデプロイサイズが削減され、システム依存（PortAudio など）も不要になります

---

### SteeringHandler の Plugin 移行 ([#1738](https://github.com/strands-agents/sdk-python/pull/1738))

**この機能でできること:**
- 実験的機能の `SteeringHandler` が新しい Plugin パターンに移行されました
- より簡潔な API で Agent 機能を拡張できます

**使用例:**

```python
from strands import Agent
from strands.experimental.steering import LLMSteeringHandler

# Before: hooks パラメータを使用
# agent = Agent(hooks=[LLMSteeringHandler(system_prompt="...")])

# After: plugins パラメータを使用
agent = Agent(plugins=[LLMSteeringHandler(system_prompt="...")])
```

**ポイント:**
- 実験的モジュール内の破壊的変更です
- `LLMSteeringHandler` などのサブクラスはそのまま動作します

## バグ修正

### init_plugin を init_agent にリネーム ([#1765](https://github.com/strands-agents/sdk-python/pull/1765))

- Plugin プロトコルのメソッド名が `init_plugin` から `init_agent` に変更されました
- より直感的な命名により、プラグインが Agent を初期化することが明確になりました
- 1つのプラグインを複数の Agent に適用する際にも意味が通ります

## 破壊的変更

### SteeringHandler の API 変更 ([#1738](https://github.com/strands-agents/sdk-python/pull/1738))

**変更前:**
```python
from strands import Agent
from strands.experimental.steering import LLMSteeringHandler

agent = Agent(hooks=[LLMSteeringHandler(system_prompt="...")])
```

**変更後:**
```python
from strands import Agent
from strands.experimental.steering import LLMSteeringHandler

agent = Agent(plugins=[LLMSteeringHandler(system_prompt="...")])
```

**移行方法:**
- `hooks` パラメータを `plugins` パラメータに変更してください
- これは実験的モジュール（`strands.experimental`）内の変更です

### Plugin の init_plugin が init_agent に変更 ([#1765](https://github.com/strands-agents/sdk-python/pull/1765))

**変更前:**
```python
class MyPlugin:
    name = "my-plugin"

    def init_plugin(self, agent: Agent) -> None:
        agent.add_hook(...)
```

**変更後:**
```python
class MyPlugin:
    name = "my-plugin"

    def init_agent(self, agent: Agent) -> None:
        agent.add_hook(...)
```

**移行方法:**
- カスタムプラグインの `init_plugin` メソッドを `init_agent` にリネームしてください

## まとめ

このリリースでは Plugin システムが導入され、Agent の拡張性が大幅に向上しました。複数のイベントに対するフック登録も簡素化され、サーバーサイドデプロイも軽量化されています。
