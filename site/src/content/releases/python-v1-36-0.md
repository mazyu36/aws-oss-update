---
title: "Strands Python SDK v1.36.0 リリース解説"
version: "v1.36.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-04-17
summary: "Agent のスナップショット機能、URL からのスキル読み込み、Agent コンストラクタでの callable フック対応など、多数の新機能とバグ修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.36.0"
---

## 概要

このリリースでは、Agent の状態をスナップショットとして保存・復元できる機能、GitHub などの URL から直接スキルを読み込む機能、Agent コンストラクタで callable なフックコールバックを直接渡せる機能など、多くの新機能が追加されました。また、テレメトリ、Bedrock、LiteLLM など各モデルプロバイダーのバグ修正も含まれています。

**リリース:** [v1.36.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.36.0)

## 新機能

### Agent のスナップショット機能 `take_snapshot()` / `load_snapshot()` ([#1948](https://github.com/strands-agents/sdk-python/pull/1948))

**この機能でできること:**
- Agent の現在の状態をスナップショットとして保存し、後から復元できます。TypeScript SDK に既にあった機能が Python SDK にも追加されました。

**使用例:**

```python
from strands import Agent, Snapshot
import json

agent = Agent(model=my_model, system_prompt="You are a helpful assistant")

# 会話を進める
agent("Hello, my name is Alice")
agent("What's the weather like?")

# チェックポイントとしてスナップショットを取得
snapshot = agent.take_snapshot(preset="session")

# 会話を続ける
agent("Tell me a joke")

# スナップショットから復元 - "What's the weather like?" 後の状態に戻る
agent.load_snapshot(snapshot)

# 選択的なスナップショット: messages と state のみをキャプチャ
snapshot = agent.take_snapshot(include=["messages", "state"])

# アプリケーション固有のメタデータを付与
snapshot = agent.take_snapshot(
    preset="session",
    app_data={"checkpoint_label": "before-tool-call", "user_id": "u-123"},
)

# JSON として永続化
json_str = json.dumps(snapshot.to_dict())

# ストレージから復元
restored = Snapshot.from_dict(json.loads(json_str))
new_agent = Agent(model=my_model)
new_agent.load_snapshot(restored)
```

**ポイント:**
- `preset="session"` で `messages`、`state`、`conversation_manager_state`、`interrupt_state` をキャプチャ
- `include` / `exclude` でキャプチャするフィールドをカスタマイズ可能
- `app_data` でアプリケーション固有のデータを一緒に保存可能
- スナップショットはバージョン管理され、JSON シリアライズ可能

---

### URL からのスキル読み込み ([#2091](https://github.com/strands-agents/sdk-python/pull/2091))

**この機能でできること:**
- GitHub などのリモート Git リポジトリから直接スキルを読み込めるようになりました。

**使用例:**

```python
from strands import Agent, AgentSkills, Skill

# GitHub リポジトリから直接スキルを読み込み
plugin = AgentSkills(skills=["https://github.com/dgallitelli/aws-data-agent-skill"])

# バージョンを指定して読み込み
plugin = AgentSkills(skills=["https://github.com/org/skill-repo@v1.0.0"])

# ローカルスキルと混在させて使用
plugin = AgentSkills(skills=[
    "https://github.com/org/skill-repo",
    "./local-skills/my-skill",
])

# Skill クラスメソッドを直接使用
skills = Skill.from_url("https://github.com/org/skill-repo@main")
```

**ポイント:**
- `https://`、`git@`、`ssh://` 形式の URL に対応
- `@ref` サフィックスでブランチ・タグを指定可能（例: `@v1.0.0`、`@main`）
- リポジトリは `~/.cache/strands/skills/` にキャッシュされ、再読み込みは高速
- シャロークローン（`--depth 1`）で帯域とディスク使用量を最小化

---

### Agent コンストラクタで callable フックコールバックをサポート ([#1992](https://github.com/strands-agents/sdk-python/pull/1992))

**この機能でできること:**
- `Agent` のコンストラクタで、`HookProvider` だけでなく callable な関数を直接フックとして渡せるようになりました。

**使用例:**

```python
from strands import Agent
from strands.types.events import BeforeInvocationEvent, BeforeModelCallEvent

def on_start(event: BeforeInvocationEvent) -> None:
    print('Starting!')

def on_model(event: BeforeModelCallEvent) -> None:
    print('Model call!')

# callable を直接渡せるようになった
agent = Agent(hooks=[on_start])

# HookProvider との混在も可能
agent = Agent(hooks=[on_start, MyHookProvider(), on_model])

# 非同期関数もサポート
async def on_start_async(event: BeforeInvocationEvent) -> None:
    await some_async_operation()

agent = Agent(hooks=[on_start_async])
```

**ポイント:**
- callable には型ヒント付きのイベントパラメータが必要
- 型ヒントのない lambda はサポートされず、`ValueError` が発生
- `agent.add_hook()` との一貫性が向上

---

### A2A Agent に `client_config` パラメータ追加 ([#2103](https://github.com/strands-agents/sdk-python/pull/2103))

**この機能でできること:**
- `A2AAgent` に認証設定を渡すための `client_config` パラメータが追加されました。これにより、カード解決とメッセージ送信の両方で認証済みクライアントを使用できます。

**使用例:**

```python
from strands.agent import A2AAgent
from a2a.client import ClientConfig
import httpx

# 認証済みの httpx クライアントを作成
auth_client = httpx.AsyncClient(...)  # SigV4 署名など

# 新しい方法（推奨）
agent = A2AAgent(
    endpoint="https://protected.endpoint",
    client_config=ClientConfig(httpx_client=auth_client),
)
card = await agent.get_agent_card()  # 認証クライアントでカード解決
```

**ポイント:**
- `a2a_client_factory` は非推奨となり、将来のバージョンで削除予定
- `client_config` と `a2a_client_factory` の両方を指定すると `ValueError` が発生
- 認証が必要なエンドポイントでの 403 エラーが解消

---

### OpenAI プロバイダーでキャッシュトークンをメタデータに追加 ([#2116](https://github.com/strands-agents/sdk-python/pull/2116))

**この機能でできること:**
- OpenAI のプロンプトキャッシュ情報が `metadata` イベントに含まれるようになり、コスト最適化やデバッグに活用できます。

**使用例:**

```python
# metadata イベントの usage データにキャッシュ情報が追加される
# キャッシュヒット時:
{
    "inputTokens": 1861,
    "outputTokens": 10,
    "totalTokens": 1871,
    "cacheReadInputTokens": 1792  # 新しく追加
}
```

**ポイント:**
- `cacheReadInputTokens` フィールドでキャッシュヒットしたトークン数を確認可能
- キャッシュヒットがない場合、フィールドは省略される（後方互換性を維持）
- 既存のテレメトリパイプラインで自動的に処理される

---

### メッセージにメタデータフィールドを追加 ([#2125](https://github.com/strands-agents/sdk-python/pull/2125))

**この機能でできること:**
- `Message` にオプションの `metadata` フィールドが追加され、usage やメトリクス、カスタムデータをメッセージ単位で追跡できるようになりました。

**使用例:**

```python
from strands.types.content import get_message_metadata

# メッセージからメタデータを取得
for message in agent.messages:
    metadata = get_message_metadata(message)
    if metadata:
        print(f"Usage: {metadata.get('usage')}")
        print(f"Metrics: {metadata.get('metrics')}")
```

**ポイント:**
- コンテキスト管理のロードマップの基盤となる機能
- メッセージごとのコスト分析やプロアクティブな圧縮機能の基礎
- モデルプロバイダーへの送信前にメタデータは自動的に除外される

---

### Bidi Agent で `request_state["stop_event_loop"]` フラグをサポート ([#1954](https://github.com/strands-agents/sdk-python/pull/1954))

**この機能でできること:**
- `stop_conversation` ツール名のハードコードを廃止し、汎用的な `request_state["stop_event_loop"]` フラグで会話を停止できるようになりました。

**使用例:**

```python
from strands_tools import stop
from strands.experimental.bidi import BidiAgent

# 新しい方法（推奨）
agent = BidiAgent(tools=[stop, ...])

# カスタムツールでも使用可能
from strands.tools import tool

@tool
def my_stop_tool(request_state: dict) -> str:
    request_state["stop_event_loop"] = True
    return "Goodbye!"
```

**ポイント:**
- `stop_conversation` は非推奨となり、使用時に `DeprecationWarning` が発生
- `strands_tools.stop` ツールへの移行を推奨
- カスタムツールでも `request_state["stop_event_loop"] = True` で停止可能

---

## バグ修正

### 非ストリーミング引用変換で欠落フィールドを処理 ([#2098](https://github.com/strands-agents/sdk-python/pull/2098))

- Nova の Web グラウンディングが `title` や `sourceContent` フィールドなしで引用を返す場合に `KeyError` が発生する問題を修正
- オプションフィールドが存在する場合のみ含めるように変更

---

### テレメトリ: イベントループサイクルスパンに共通の gen_ai 属性を追加 ([#1973](https://github.com/strands-agents/sdk-python/pull/1973))

- `start_event_loop_cycle_span()` に `gen_ai.system`、`gen_ai.provider.name`、`gen_ai.operation.name` 属性が追加され、他のスパンと一貫性が取れるようになりました

---

### テレメトリ: Agent スパンで呼び出しごとの usage を使用 ([#2017](https://github.com/strands-agents/sdk-python/pull/2017))

- マルチターンセッションで累積トークン数ではなく、呼び出しごとのトークン数が報告されるように修正
- OTEL スパンでのトークンメトリクスが正確になりました

---

### MCP クライアントのバックグラウンドスレッドでイベントループのリークを修正 ([#2111](https://github.com/strands-agents/sdk-python/pull/2111))

- `opentelemetry-instrumentation-threading` が有効な場合、親スレッドの実行中のイベントループ参照がバックグラウンドスレッドにリークし、`RuntimeError: Cannot run the event loop while another loop is running` が発生する問題を修正

---

### LiteLLM でのマルチターンツール呼び出しで Gemini の thought_signature を保持 ([#2129](https://github.com/strands-agents/sdk-python/pull/2129))

- LiteLLM モデルプロバイダーを使用する際、Gemini の `thought_signature` がマルチターンのツール呼び出しを通じて保持されるようになりました
- ツール呼び出し ID に `__thought__` セパレーターでエンコードされたシグネチャを抽出・再エンコード

---

### Bedrock: 空の toolResult content 配列を正規化 ([#2123](https://github.com/strands-agents/sdk-python/pull/2123))

- 一部のモデルプロバイダー（Nemotron など）が `toolResult` の `content: []` を拒否する問題を修正
- 空の content 配列を `[{"text": ""}]` に正規化することで、MCP ツールからの空の結果を処理可能に

---

### テレメトリ: トレーサーから force_flush を削除 ([#2142](https://github.com/strands-agents/sdk-python/pull/2142))

- OTLP エンドポイントが到達不能な場合、`force_flush()` の同期呼び出しで指数バックオフによるリトライが発生し、最大 90 秒ブロックされる問題を修正
- スパン終了後の `force_flush()` を削除

---

## まとめ

このリリースでは、Agent のスナップショット機能や URL からのスキル読み込みなど、Agent の状態管理とスキル管理の柔軟性が大幅に向上しました。また、テレメトリの正確性向上や各モデルプロバイダーの互換性改善により、より安定した運用が可能になっています。
