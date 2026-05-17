---
title: "Strands Python SDK v1.8.0 リリース解説"
version: "v1.8.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-09-10
summary: "llama.cpp モデルプロバイダのサポート追加、Bedrock の region-aware モデル ID 対応、マルチエージェントパターンへの kwargs サポート、循環グラフの動作修正など、複数の新機能とバグ修正を含むリリース。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.8.0"
---

## 概要

このリリースでは、llama.cpp モデルプロバイダの追加により、リソースが限られたデバイスでのエッジ AI ワークロードのサポートが強化されました。また、Bedrock の region-aware モデル ID 対応、マルチエージェントパターンへの kwargs サポート、構造化出力の改善など、多数の新機能とバグ修正が含まれています。

**リリース:** [v1.8.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.8.0)

## 新機能

### llama.cpp モデルプロバイダのサポート ([#585](https://github.com/strands-agents/sdk-python/pull/585))

**この機能でできること:**
- ローカルホストされた llama.cpp サーバーと統合し、リソースが限られたデバイス上でエッジ AI ワークロードを実行できます。OpenAI 互換 API を使用した直接統合により、高度なサンプリングパラメータ、文法制約、マルチモーダルコンテンツ、構造化出力をサポートします。

**使用例:**

```python
from strands import Agent
from strands.models.llamacpp import LlamaCppModel

# 基本的な使用方法
model = LlamaCppModel(base_url="http://localhost:8080")
agent = Agent(model=model)
response = agent("Tell me about AI")

# 高度なパラメータを使用
model = LlamaCppModel(
    base_url="http://localhost:8080",
    params={
        "temperature": 0.7,
        "max_tokens": 100,
        "repeat_penalty": 1.1,  # llama.cpp 固有のパラメータ
        "top_k": 40,
        "min_p": 0.05
    }
)

# 文法制約を使用した生成
model.use_grammar_constraint('''
    root ::= answer
    answer ::= "yes" | "no"
''')
```

**ポイント:**
- llama.cpp 固有のパラメータ（mirostat、top_k、min_p、typical_p など）の完全サポート
- GBNF 文法による制約付き生成が可能
- 互換性のあるモデル（例: Qwen2.5-Omni）での音声・画像コンテンツサポート
- ツール呼び出しと JSON スキーマ検証に対応

---

### Bedrock の region-aware デフォルトモデル ID ([#835](https://github.com/strands-agents/sdk-python/pull/835))

**この機能でできること:**
- ユーザーが使用しているリージョンに応じて、Bedrock のデフォルトモデル ID が自動的にフォーマットされます。リージョンが inference エンドポイントをサポートしていない場合は、警告が表示されます。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

# リージョンに応じて自動的に適切なモデル ID が使用されます
model = BedrockModel()
agent = Agent(model=model)
response = agent("Hello, how are you?")
```

**ポイント:**
- リージョンごとに最適化されたエンドポイントが自動選択されます
- サポートされていないリージョンでは警告が表示され、エラーハンドリングが改善されます

---

### Bedrock のデフォルト読み取りタイムアウト設定 ([#829](https://github.com/strands-agents/sdk-python/pull/829))

**この機能でできること:**
- Bedrock モデルのデフォルト読み取りタイムアウトが 120 秒に設定され、大規模なモデルやトークン数の多いリクエストでのタイムアウトエラーが軽減されます。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

# デフォルトで 120 秒のタイムアウトが設定されます
model = BedrockModel()
agent = Agent(model=model)

# 長いコンテキストでもタイムアウトしにくくなります
response = agent("Analyze this long document: " + long_text)
```

**ポイント:**
- AWS のベストプラクティスに従い、デフォルトタイムアウトを 120 秒に設定
- カスタム設定が提供されていない場合に BotocoreConfig が自動的に設定されます

---

### Bedrock/Anthropic の ToolChoice サポート ([#720](https://github.com/strands-agents/sdk-python/pull/720))

**この機能でできること:**
- Bedrock と Anthropic プロバイダで structured_output を使用する際、ツール呼び出しを強制できるようになり、LLM が必ず構造化された出力を返すことが保証されます。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel
from pydantic import BaseModel

class UserInfo(BaseModel):
    name: str
    age: int
    email: str

model = BedrockModel()
agent = Agent(model=model)

# 構造化出力が保証されます
result = agent.get_structured_output(
    "Extract user info: John Doe, 30 years old, john@example.com",
    response_format=UserInfo
)
```

**ポイント:**
- `tool_choice` パラメータが `Model.stream()` メソッドに追加されました
- Bedrock と Anthropic での構造化出力の一貫性が向上
- OpenAI と LiteLLM でも実装済み

---

### 構造化出力ツールの循環参照処理の改善 ([#817](https://github.com/strands-agents/sdk-python/pull/817))

**この機能でできること:**
- Pydantic モデルスキーマ変換における循環参照とオプションフィールドの処理が改善され、より複雑なデータ構造をサポートします。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel
from pydantic import BaseModel
from typing import Optional

class Person(BaseModel):
    name: str
    age: int
    friend: Optional['Person'] = None  # オプションフィールドが正しく処理されます

model = BedrockModel()
agent = Agent(model=model)

# 複雑な構造でもエラーが適切に検出されます
result = agent.get_structured_output(
    "Extract person info with friend",
    response_format=Person
)
```

**ポイント:**
- 循環参照の明示的な検出とエラー処理
- `field.is_required()` を使用したオプションフィールドの判定ロジックの改善
- デフォルト値を持つフィールドが正しくオプションとしてマークされます

---

### マルチエージェントパターンへの kwargs サポート ([#816](https://github.com/strands-agents/sdk-python/pull/816))

**この機能でできること:**
- Graph と Swarm のマルチエージェントパターンで、任意の kwargs を渡せるようになり、エージェント間で情報を共有できます。

**使用例:**

```python
from strands.multiagent import Graph, Node
from strands import Agent
from strands.models.bedrock import BedrockModel

model = BedrockModel()

# カスタム状態を kwargs として渡す
graph = Graph(
    nodes=[
        Node(name="node1", executor=Agent(model=model)),
        Node(name="node2", executor=Agent(model=model))
    ]
)

# kwargs がすべてのエージェント呼び出しに伝播されます
result = await graph.run_async(
    "Process this task",
    shared_context={"key": "value"},
    session_id="123"
)
```

**ポイント:**
- Agent クラスと同様に、Graph と Swarm でも kwargs を使用可能
- マルチエージェントパターンでの状態共有が容易になります
- すべての Agent と MultiAgentBase の呼び出しに kwargs が伝播されます

---

## バグ修正

### 循環グラフの動作修正 ([#768](https://github.com/strands-agents/sdk-python/pull/768))

- Graph マルチエージェントパターンで、`reset_on_revisit` 機能が正しく動作せず、サイクルとフィードバックループが機能しない問題を修正しました。
- `_find_newly_ready_nodes` メソッドを更新し、完了したノードが再訪問可能になるように改善しました。
- 無限ループ防止のための安全機構を追加し、状態リセット機能が正しく動作するようになりました。

### Bedrock での DeepSeek 使用時の reasoningContent フィルタリング ([#652](https://github.com/strands-agents/sdk-python/pull/652))

- Bedrock で DeepSeek モデルを使用する際、ValidationException を回避するために、converse_stream 操作の前に reasoningContent を除去するように修正しました。
- Bedrock API に送信する前にメッセージから推論コンテンツがフィルタリングされるようになりました。

### asyncio イベントループのブロック回避 ([#805](https://github.com/strands-agents/sdk-python/pull/805))

- リトライ間で `time.sleep` が asyncio イベントループをブロックする問題を修正しました。
- `time.sleep` を `asyncio.sleep` に置き換え、非同期コンテキストで正しく動作するようになりました。

### ファイルパスからの複数 @tool デコレータ関数の読み込み ([#742](https://github.com/strands-agents/sdk-python/pull/742))

- ファイルパスに複数の `@tool` デコレート関数が含まれている場合、1 つのツールのみが読み込まれる問題を修正しました。
- ファイルベースのツール読み込みがディレクトリ/モジュールスキャンと一貫性を持つようになり、すべてのデコレートされたツールが読み込まれます。

### LiteLLM での use_litellm_proxy パラメータのサポート ([#808](https://github.com/strands-agents/sdk-python/pull/808))

- LiteLLM で `use_litellm_proxy` を `client_args` として渡す際の不具合を修正しました。
- LiteLLM Proxy Server の使用が容易になり、顧客が環境変数や直接的な設定を使用せずにプロキシを利用できるようになりました。

---

## まとめ

このリリースでは、エッジデバイスでのローカルモデル実行を可能にする llama.cpp サポートの追加、Bedrock の使いやすさの向上、マルチエージェントパターンの柔軟性強化など、重要な新機能が追加されました。また、循環グラフやツール読み込みなどの重要なバグ修正により、SDK の安定性と信頼性が向上しています。
