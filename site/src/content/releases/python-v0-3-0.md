---
title: "Strands Python SDK v0.3.0 リリース解説"
version: "v0.3.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-07-11
summary: "フック機能の本格導入、完全非同期 API への移行、複数のモデルプロバイダーの非同期対応、マルチモーダル入力サポート、Graph マルチエージェントオーケストレーター、Cohere と Writer モデルプロバイダーの追加など、多数の新機能と破壊的変更を含む大規模リリース。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.3.0"
---

## 概要

Strands Agents Python SDK v0.3.0 は、SDK のアーキテクチャを大幅に刷新する重要なリリースです。フック機能が実験的機能から正式機能へと昇格し、モデルプロバイダーとツールの API が完全非同期化されました。また、マルチモーダル入力のサポート、Graph ベースのマルチエージェントオーケストレーター、新しいモデルプロバイダー（Cohere、Writer）の追加など、多数の新機能が導入されました。このリリースには多くの破壊的変更が含まれるため、移行時には注意が必要です。

**リリース:** [v0.3.0](https://github.com/strands-agents/sdk-python/releases/tag/v0.3.0)

## 新機能

### フック機能の正式導入 ([#304](https://github.com/strands-agents/sdk-python/pull/304), [#352](https://github.com/strands-agents/sdk-python/pull/352), [#385](https://github.com/strands-agents/sdk-python/pull/385), [#387](https://github.com/strands-agents/sdk-python/pull/387), [#410](https://github.com/strands-agents/sdk-python/pull/410))

**この機能でできること:**
- Agent のライフサイクルの各段階でカスタムロジックを実行できる型付きフックシステムが導入されました。ツール呼び出しの前後、モデル呼び出しの前後、メッセージ追加時などのイベントをフックでき、実験的機能から正式機能へと昇格しました。

**使用例:**

```python
from strands import Agent
from strands.hooks import HookProvider, BeforeToolCallEvent, AfterToolCallEvent, BeforeModelCallEvent, AfterModelCallEvent, MessagesAppendedEvent

class CustomHookProvider(HookProvider):
    """カスタムフックプロバイダー"""

    def register_hooks(self, registry, **kwargs):
        # ツール呼び出しの前後にフック
        registry.add_callback(BeforeToolCallEvent, self.before_tool_call)
        registry.add_callback(AfterToolCallEvent, self.after_tool_call)

        # モデル呼び出しの前後にフック
        registry.add_callback(BeforeModelCallEvent, self.before_model_call)
        registry.add_callback(AfterModelCallEvent, self.after_model_call)

        # メッセージ追加時にフック
        registry.add_callback(MessagesAppendedEvent, self.on_messages_appended)

    async def before_tool_call(self, event: BeforeToolCallEvent):
        """ツール呼び出し前の処理"""
        print(f"Tool {event.tool_use['name']} を呼び出します")
        # ツールの置き換えも可能
        # event.selected_tool = my_custom_tool

    async def after_tool_call(self, event: AfterToolCallEvent):
        """ツール呼び出し後の処理"""
        print(f"Tool {event.tool_use['name']} の実行完了")
        # 結果の修正も可能
        # event.result = modified_result

    async def before_model_call(self, event: BeforeModelCallEvent):
        """モデル呼び出し前の処理"""
        print("モデルを呼び出します")

    async def after_model_call(self, event: AfterModelCallEvent):
        """モデル呼び出し後の処理"""
        if event.stop_response:
            print(f"モデル応答: {event.stop_response}")

    async def on_messages_appended(self, event: MessagesAppendedEvent):
        """メッセージ追加時の処理"""
        print(f"{len(event.messages)} 件のメッセージが追加されました")

# Agent にフックプロバイダーを追加
agent = Agent(
    model=model,
    hook_providers=[CustomHookProvider()]
)

response = agent("計算機を使って 10 + 20 を計算してください")
```

**ポイント:**
- フックでツールやモデルレスポンスを動的に変更できます
- 各イベントには書き込み可能なプロパティと読み取り専用プロパティがあります
- セッション管理、ロギング、監視などのユースケースに最適です

---

### Graph マルチエージェントオーケストレーター ([#336](https://github.com/strands-agents/sdk-python/pull/336))

**この機能でできること:**
- 複数の Agent をグラフ構造で連携させるオーケストレーターが追加されました。ノードとエッジで Agent の実行フローを定義し、条件分岐やループを含む複雑なマルチエージェントワークフローを構築できます。

**使用例:**

```python
from strands import Agent
from strands.multiagent import Graph, GraphNode

# 各 Agent を定義
researcher = Agent(
    agent_id="researcher",
    name="Research Agent",
    description="情報を調査するエージェント"
)

analyst = Agent(
    agent_id="analyst",
    name="Analysis Agent",
    description="データを分析するエージェント"
)

writer = Agent(
    agent_id="writer",
    name="Writer Agent",
    description="レポートを作成するエージェント"
)

# グラフを構築
graph = Graph()

# ノードを追加
graph.add_node(GraphNode(agent=researcher))
graph.add_node(GraphNode(agent=analyst))
graph.add_node(GraphNode(agent=writer))

# エッジで実行順序を定義
graph.add_edge("researcher", "analyst")
graph.add_edge("analyst", "writer")

# グラフを実行
result = await graph.execute("最新の AI トレンドをレポートにまとめて")
print(result)
```

**ポイント:**
- Agent に agent_id パラメータが追加され、グラフ内で識別可能になりました
- 将来的には並行実行、関数ノード、状態管理などの機能が追加予定です
- 複雑なマルチエージェントワークフローの構築に最適です

---

### マルチモーダル入力のサポート ([#367](https://github.com/strands-agents/sdk-python/pull/367))

**この機能でできること:**
- Agent にテキストと画像を組み合わせた入力を渡せるようになりました。画像認識や視覚的な質問応答が可能になります。

**使用例:**

```python
from strands import Agent

agent = Agent(model=model)

# マルチモーダル入力（テキストと画像）
content = [
    {"text": "この画像に何が写っていますか？"},
    {
        "image": {
            "format": "png",
            "source": {
                "bytes": image_bytes,  # 画像のバイトデータ
            },
        },
    },
]

response = agent(content)
print(response)
```

**ポイント:**
- 画像フォーマットは png、jpeg などをサポート
- 複数の画像を一度に渡すことも可能です
- Anthropic、OpenAI、Gemini などのマルチモーダル対応モデルで使用できます

---

### Cohere モデルプロバイダー ([#236](https://github.com/strands-agents/sdk-python/pull/236))

**この機能でできること:**
- Cohere の言語モデルを Strands Agents で使用できるようになりました。OpenAI 互換性レイヤーを通じて実装されています。

**使用例:**

```python
from strands import Agent
from strands.models.openai import OpenAIModel

# Cohere の OpenAI 互換エンドポイントを使用
model = OpenAIModel(
    model_id="command-r-plus",
    base_url="https://api.cohere.ai/v1",
    api_key="your-cohere-api-key"
)

agent = Agent(model=model)
response = agent("Cohere で質問に答えてください")
```

**ポイント:**
- OpenAI 互換性レイヤーを使用するため、特別な実装は不要です
- Cohere の強力な言語理解能力を活用できます

---

### Writer モデルプロバイダー ([#228](https://github.com/strands-agents/sdk-python/pull/228))

**この機能でできること:**
- Writer LLM を Strands Agents で使用できるようになりました。Writer API に直接統合されています。

**使用例:**

```python
from strands import Agent
from strands.models.writer import WriterModel

model = WriterModel(
    model_id="palmyra-x-004",
    api_key="your-writer-api-key"
)

agent = Agent(model=model)
response = agent("Writer モデルで質問に答えてください")
```

**ポイント:**
- Writer 独自の API を使用する専用実装です
- エンタープライズグレードの言語モデルを活用できます

---

### ツール名の柔軟な命名規則 ([#407](https://github.com/strands-agents/sdk-python/pull/407))

**この機能でできること:**
- MCP サーバーなどで使用される、数字で始まるツール名やアンダースコアで始まるツール名がサポートされました。

**使用例:**

```python
from strands import Agent
from strands.tools import tool

@tool(name="5get_default_data")
def get_default_data():
    """デフォルトデータを取得"""
    return "19"

@tool(name="_get_internal_data")
def get_internal_data():
    """内部データを取得"""
    return "secret"

agent = Agent(model=model, tools=[get_default_data, get_internal_data])
response = agent("デフォルトデータを取得してください")
```

**ポイント:**
- 数字やアンダースコアで始まるツール名が正式にサポートされました
- MCP サーバーとの互換性が向上します

---

## バグ修正

### Mistral ストリーミングで複数ツール呼び出しを修正 ([#384](https://github.com/strands-agents/sdk-python/pull/384))
- Mistral モデルのストリーミングレスポンスで複数のツール呼び出しが正しく処理されなかった問題を修正しました。

---

## 破壊的変更

このリリースには多くの破壊的変更が含まれています。既存のコードを更新する際は、以下の変更点に注意してください。

### モデルプロバイダーの API 変更

#### Base64 エンコード画像の自動処理 ([#368](https://github.com/strands-agents/sdk-python/pull/368))

**変更内容:**
OpenAI と LiteLLM モデルプロバイダーは、画像バイトデータを自動的に base64 エンコードするようになりました。

**変更前:**
```python
import base64

# 手動で base64 エンコード
encoded_image = base64.b64encode(image_bytes).decode('utf-8')
content = [
    {"text": "この画像は？"},
    {"image": {"source": {"bytes": encoded_image}}}
]
```

**変更後:**
```python
# 自動的に base64 エンコードされる
content = [
    {"text": "この画像は？"},
    {"image": {"source": {"bytes": image_bytes}}}  # 生のバイトデータを渡す
]
```

**移行方法:**
- 画像データを事前に base64 エンコードしているコードを削除し、生のバイトデータを直接渡すように変更してください

---

#### モデルプロバイダーの非同期化 ([#306](https://github.com/strands-agents/sdk-python/pull/306))

**変更内容:**
すべてのモデルプロバイダーが非同期メソッドを実装する必要があります。

**変更前:**
```python
from strands.models import ModelProvider

class CustomModelProvider(ModelProvider):
    def stream(self, messages, tools, **kwargs):
        # 同期実装
        yield response
```

**変更後:**
```python
from strands.models import ModelProvider

class CustomModelProvider(ModelProvider):
    async def stream(self, messages, tools, **kwargs):
        # 非同期実装
        yield response
```

**移行方法:**
- カスタムモデルプロバイダーのメソッドを async/await に変更してください
- ジェネレーターを非同期ジェネレーターに変更してください

---

#### モデルプロバイダー API の簡素化 ([#400](https://github.com/strands-agents/sdk-python/pull/400))

**変更内容:**
モデルプロバイダーは stream メソッドのみを実装すれば良くなりました。

**変更前:**
```python
class CustomModelProvider(ModelProvider):
    def stream(self, messages, tools, **kwargs):
        pass

    def invoke(self, messages, tools, **kwargs):
        pass
```

**変更後:**
```python
class CustomModelProvider(ModelProvider):
    async def stream(self, messages, tools, **kwargs):
        # stream メソッドのみ実装
        pass
```

**移行方法:**
- invoke メソッドの実装を削除し、stream メソッドのみを実装してください

---

#### モデルプロバイダーのパッケージ移動 ([#409](https://github.com/strands-agents/sdk-python/pull/409))

**変更内容:**
モデルプロバイダーの API インターフェースが strands.models サブパッケージに移動しました。

**変更前:**
```python
from strands import ModelProvider
```

**変更後:**
```python
from strands.models import ModelProvider
```

**移行方法:**
- import 文を更新してください

---

### ツール API の変更

#### AgentTool のストリーミング API ([#345](https://github.com/strands-agents/sdk-python/pull/345))

**変更内容:**
AgentTool は invoke メソッドの代わりに stream API を実装し、非同期化する必要があります。

**変更前:**
```python
from strands.tools import AgentTool

class CustomTool(AgentTool):
    def invoke(self, parameters):
        return result
```

**変更後:**
```python
from strands.tools import AgentTool

class CustomTool(AgentTool):
    async def stream(self, parameters):
        # ストリーミング実装
        yield chunk
```

**移行方法:**
- invoke メソッドを stream メソッドに置き換えてください
- メソッドを async/await に変更し、結果をストリーミングで返してください

---

#### ツールの自動並列実行 ([#391](https://github.com/strands-agents/sdk-python/pull/391))

**変更内容:**
max_parallel_tools パラメータが削除され、ツールは自動的にスレッドプールで並列実行されます。

**変更前:**
```python
agent = Agent(
    model=model,
    tools=tools,
    max_parallel_tools=5
)
```

**変更後:**
```python
# max_parallel_tools は不要
agent = Agent(
    model=model,
    tools=tools
)
```

**移行方法:**
- max_parallel_tools パラメータを削除してください
- ツールは自動的に並列実行されます

---

### Agent API の変更

#### load_tools_from_directory のデフォルト変更 ([#419](https://github.com/strands-agents/sdk-python/pull/419))

**変更内容:**
load_tools_from_directory パラメータのデフォルト値が False に変更されました。

**変更前:**
```python
# 自動的に tools ディレクトリからロード
agent = Agent(model=model)
```

**変更後:**
```python
# 明示的に指定する必要がある
agent = Agent(
    model=model,
    load_tools_from_directory=True
)
```

**移行方法:**
- tools ディレクトリから自動ロードを使用している場合は、load_tools_from_directory=True を明示的に設定してください

---

#### forward compatibility のための kwargs 引数 ([#413](https://github.com/strands-agents/sdk-python/pull/413))

**変更内容:**
サブクラス化やプロトコル実装が必要なクラスに kwargs 引数が追加されました。

**変更前:**
```python
class CustomProvider:
    def register_hooks(self, registry):
        pass
```

**変更後:**
```python
class CustomProvider:
    def register_hooks(self, registry, **kwargs):
        pass
```

**移行方法:**
- カスタム実装に **kwargs を追加してください

---

### その他の変更

#### event_loop_cycle の非公開化 ([#415](https://github.com/strands-agents/sdk-python/pull/415))

**変更内容:**
event_loop_cycle 関数はトップレベルインポートから削除されました。

**変更前:**
```python
from strands import event_loop_cycle
```

**変更後:**
```python
# 内部 API のため、直接使用は推奨されません
from strands.event_loop import event_loop_cycle
```

**移行方法:**
- event_loop_cycle の直接呼び出しを避けてください
- Agent クラスの公開 API を使用してください

---

#### メッセージ自動削除の廃止 ([#418](https://github.com/strands-agents/sdk-python/pull/418))

**変更内容:**
dangling tool messages の自動削除機能が削除されました。

**移行方法:**
- 将来の機能をサポートするための変更です
- 特別な移行作業は不要ですが、メッセージ管理の動作が変わる可能性があります

---

## まとめ

v0.3.0 は SDK のアーキテクチャを大幅に刷新する重要なリリースです。フック機能の正式導入、完全非同期 API への移行、Graph マルチエージェントオーケストレーター、マルチモーダル入力、新しいモデルプロバイダーなど、多数の新機能が追加されました。多くの破壊的変更が含まれますが、より強力で柔軟な SDK へと進化しています。移行ガイドを参考に、既存のコードを更新してください。
