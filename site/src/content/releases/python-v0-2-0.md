---
title: "sdk-python v0.2.0"
version: "v0.2.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-07-02
summary: "Agent State によるステートフル情報管理、Mistral モデルサポート、OpenAI 推論コンテンツ対応、A2A ツールのスキル変換機能、ネイティブ非同期イテレータサポート、Bedrock エラー情報の改善など、多数の新機能と破壊的変更を含むマイナーバージョンアップデート。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.2.0"
---

## 概要

Strands Agents Python SDK v0.2.0 は、1.0.0 リリースに向けた重要なマイナーバージョンアップデートです。このリリースでは、Agent State によるステートフル情報管理、Mistral モデルの完全サポート、OpenAI の推論コンテンツ対応、A2A におけるツールからスキルへの変換機能、ネイティブ非同期イテレータサポートなど、多数の新機能が追加されました。同時に、より直感的な API を実現するための複数の破壊的変更も含まれています。

**リリース:** [v0.2.0](https://github.com/strands-agents/sdk-python/releases/tag/v0.2.0)

## 新機能

### Agent State によるステートフル情報管理 ([#292](https://github.com/strands-agents/sdk-python/pull/292))

**この機能でできること:**
- Agent にステートフル情報を保存・管理できる AgentState クラスが追加されました。モデルに渡されるコンテキストとは別に、将来的に永続化や復元が可能な状態情報を管理できます。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

model = BedrockModel(
    model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
    region_name="us-west-2"
)

agent = Agent(
    name="My Agent",
    model=model,
    description="ステートフルなエージェント"
)

# Agent の状態にカスタムデータを保存
agent.state.set("user_preference", "dark_mode")
agent.state.set("conversation_count", 0)

# 状態を取得
preference = agent.state.get("user_preference")
print(f"User preference: {preference}")

# 会話のたびにカウンタを更新
response = agent("こんにちは")
count = agent.state.get("conversation_count", 0)
agent.state.set("conversation_count", count + 1)

# すべての状態を取得
all_state = agent.state.to_dict()
print(f"All state: {all_state}")
```

**ポイント:**
- Agent State はモデルに渡されるコンテキストとは独立して管理されます
- 将来的には、Agent の永続化と復元機能に活用される予定です
- 任意のキーと値のペアを保存できます

---

### Mistral モデルの完全サポート ([#284](https://github.com/strands-agents/sdk-python/pull/284))

**この機能でできること:**
- Mistral AI のモデルが完全にサポートされました。チャット、ストリーミング、ツール呼び出し、構造化出力生成に対応しています。

**使用例:**

```python
from strands import Agent
from strands.models.mistral import MistralModel
from strands.tools import Tool

# Mistral モデルを初期化
model = MistralModel(
    model_id="mistral-large-latest",
    api_key="your-mistral-api-key"
)

# 基本的な使用
agent = Agent(
    model=model,
    description="Mistral を使用したエージェント"
)

# 通常の会話
response = agent("パリの天気はどうですか？")
print(response)

# ストリーミングレスポンス
for event in agent.stream("フランスの歴史について教えてください"):
    if "data" in event:
        print(event["data"], end="", flush=True)

# ツール呼び出しと構造化出力もサポート
def get_weather(location: str) -> str:
    """指定された場所の天気を取得"""
    return f"{location} は晴れです"

agent_with_tools = Agent(
    model=model,
    tools=[Tool.from_function(get_weather)]
)

response = agent_with_tools("東京の天気を教えて")
```

**ポイント:**
- mistral-large-latest、mistral-medium-latest など、すべての主要 Mistral モデルに対応
- ツール呼び出しと構造化出力は、Mistral の関数呼び出し機能を使用して実装
- ストリーミングと非同期操作の両方をサポート

---

### OpenAI 推論コンテンツのサポート ([#187](https://github.com/strands-agents/sdk-python/pull/187))

**この機能でできること:**
- OpenAI モデルプロバイダーで推論コンテンツ（reasoning content）が出力できるようになりました。DeepSeek-R1 などのモデルを使用した際に、推論プロセスをリアルタイムで表示できます。

**使用例:**

```python
from strands import Agent
from strands.models.openai import OpenAIModel

# OpenAI 互換の推論モデルを使用
model = OpenAIModel(
    model_id="deepseek-reasoner",
    api_key="your-api-key",
    base_url="https://api.deepseek.com"
)

agent = Agent(model=model)

# ストリーミングで推論内容を表示
query = "複雑な数学の問題を解いてください: x^2 + 5x + 6 = 0"

async for event in agent.stream_async(query):
    if 'reasoningText' in event:
        # 推論プロセスを表示
        print(event['reasoningText'], end="", flush=True)
    if "data" in event:
        # 最終的な回答を表示
        print(event['data'], end="", flush=True)
```

**ポイント:**
- reasoningText フィールドを使用して推論プロセスにアクセス
- DeepSeek-R1 などの推論特化モデルで特に有効
- ストリーミング中にリアルタイムで推論過程を確認可能

---

### A2A ツールのスキル変換機能 ([#287](https://github.com/strands-agents/sdk-python/pull/287))

**この機能でできること:**
- Strands のツールを Agent スキルとして A2A サーバーに公開できるようになりました。また、A2AAgent が A2AServer にリネームされました。

**使用例:**

```python
from strands import Agent
from strands.tools import Tool
from strands.multiagent.a2a import A2AServer

# ツールを定義
def calculate(expression: str) -> str:
    """数式を計算する"""
    try:
        result = eval(expression)
        return f"結果: {result}"
    except Exception as e:
        return f"エラー: {str(e)}"

# Agent とツールを作成
agent = Agent(
    name="Calculator Agent",
    description="数学計算を実行するエージェント",
    tools=[Tool.from_function(calculate)]
)

# A2A サーバーとして公開（ツールが自動的にスキルに変換される）
server = A2AServer(agent=agent)

# FastAPI アプリケーションとして起動
app = server.to_fastapi_app()

# 他のエージェントから、このエージェントのツールをスキルとして呼び出し可能
```

**ポイント:**
- A2AAgent は A2AServer にリネームされました（より直感的な命名）
- Agent に登録されたツールが自動的にスキルとして公開されます
- 他の Agent からスキルとして呼び出すことができます

---

### Bedrock エラー情報の改善 ([#290](https://github.com/strands-agents/sdk-python/pull/290))

**この機能でできること:**
- Bedrock プロバイダーで発生するエラーに、リージョンやモデル ID などの詳細情報が追加され、ドキュメントへのリンクも含まれるようになりました。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

try:
    model = BedrockModel(
        model_id="anthropic.claude-3-7-sonnet-20250219-v1:0",
        region_name="us-west-2"
    )
    agent = Agent(model=model)
    response = agent("Hello")
except Exception as e:
    # より詳細なエラー情報が含まれます
    # 例:
    # AccessDeniedException: An error occurred (AccessDeniedException) when calling the ConverseStream operation:
    # You don't have access to the model with the specified model ID.
    # └ Bedrock region: us-west-2
    # └ Model id: anthropic.claude-3-7-sonnet-20250219-v1:0
    # └ For more information see https://strandsagents.com/user-guide/concepts/model-providers/amazon-bedrock/#model-access-issue
    print(f"Error: {e}")
```

**ポイント:**
- Python 3.11 以降で有効な add_note メソッドを使用
- エラーメッセージにリージョン、モデル ID、ドキュメントリンクが含まれます
- 一般的な Bedrock エラー（アクセス拒否、オンデマンドスループット非対応など）で特に役立ちます

---

### モデル呼び出しリクエストのデバッグログ追加 ([#297](https://github.com/strands-agents/sdk-python/pull/297))

**この機能でできること:**
- すべてのモデルプロバイダーで、Converse API リクエストボディがデバッグレベルでログに記録されるようになりました。リクエスト内容を正確に確認したい場合に便利です。

**使用例:**

```python
import logging
from strands import Agent
from strands.models.bedrock import BedrockModel

# デバッグログを有効化
logging.basicConfig(level=logging.DEBUG)

model = BedrockModel(
    model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
    region_name="us-west-2"
)

agent = Agent(model=model)

# リクエストボディがデバッグログに出力されます
response = agent("Hello, how are you?")
```

**ポイント:**
- types.models.model.Model 抽象ベースクラスに実装されているため、すべてのモデルプロバイダーで有効
- ConversationManager によるメッセージの切り詰めなど、実際にモデルに送信された内容を確認できます
- デバッグレベルのログなので、本番環境では出力されません

---

## 破壊的変更

### Boto3 セッションからリージョンを使用 ([#299](https://github.com/strands-agents/sdk-python/pull/299))

**変更内容:**
BedrockModelProvider のリージョン動作が変更され、us-west-2 ではなく Boto3 のデフォルトリージョン動作に合わせられました。

**変更前:**
```python
# 明示的にリージョンを指定しない場合、デフォルトで us-west-2 が使用されていました
model = BedrockModel(model_id="anthropic.claude-3-5-sonnet-20241022-v2:0")
```

**変更後:**
```python
# Boto3 セッションのデフォルトリージョンが使用されます
# 環境変数 AWS_DEFAULT_REGION または AWS プロファイル設定に依存
model = BedrockModel(model_id="anthropic.claude-3-5-sonnet-20241022-v2:0")

# 明示的にリージョンを指定することを推奨
model = BedrockModel(
    model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
    region_name="us-west-2"
)
```

**移行方法:**
- 既存のコードでリージョンを明示的に指定していない場合、AWS_DEFAULT_REGION 環境変数を設定するか、region_name パラメータを明示的に指定してください

---

### Agent 呼び出し時のパラメータオーバーライド削除 ([#289](https://github.com/strands-agents/sdk-python/pull/289))

**変更内容:**
Agent 呼び出し時に初期化パラメータをオーバーライドする機能が削除されました。system_prompt などのパラメータを変更したい場合は、Agent の属性を直接更新する必要があります。

**変更前:**
```python
agent = Agent(
    model=model,
    system_prompt="あなたは親切なアシスタントです。"
)

# 呼び出し時にシステムプロンプトをオーバーライド
response = agent("こんにちは", system_prompt="あなたは厳格な先生です。")
```

**変更後:**
```python
agent = Agent(
    model=model,
    system_prompt="あなたは親切なアシスタントです。"
)

# Agent の属性を直接更新
agent.system_prompt = "あなたは厳格な先生です。"
response = agent("こんにちは")
```

**移行方法:**
- agent() 呼び出し時に渡していたパラメータを削除し、代わりに agent.system_prompt などの属性を更新してください

---

### FunctionTool の削除 ([#325](https://github.com/strands-agents/sdk-python/pull/325))

**変更内容:**
非推奨だった FunctionTool クラスが削除されました。@tool デコレータまたは Tool.from_function() を使用する必要があります。

**変更前:**
```python
from strands.tools import FunctionTool

def my_function(x: int) -> int:
    """数値を2倍にする"""
    return x * 2

tool = FunctionTool(function=my_function, name="double")
```

**変更後:**
```python
from strands.tools import Tool

# 方法1: Tool.from_function を使用
def my_function(x: int) -> int:
    """数値を2倍にする"""
    return x * 2

tool = Tool.from_function(my_function, name="double")

# 方法2: @tool デコレータを使用（推奨）
from strands.tools import tool

@tool
def my_function(x: int) -> int:
    """数値を2倍にする"""
    return x * 2
```

**移行方法:**
- FunctionTool を Tool.from_function() または @tool デコレータに置き換えてください
- 詳細は[ツールドキュメント](https://strandsagents.com/latest/user-guide/concepts/tools/tools_overview/#function-decorator-approach)を参照

---

### ネイティブ非同期イテレータサポート ([#83](https://github.com/strands-agents/sdk-python/issues/83#issuecomment-2968194816))

**変更内容:**
非同期イテレータの実装が改善され、stream_async とツールの動作が変更されました。

**変更点:**
- [#295](https://github.com/strands-agents/sdk-python/pull/295): stream_async からツール呼び出しのコールバックイベントが yield されなくなりました
- [#323](https://github.com/strands-agents/sdk-python/pull/323): callback_handler がツールに渡されなくなりました

**変更前:**
```python
# ツール呼び出しイベントが stream_async から返されていました
async for event in agent.stream_async("計算してください"):
    if event.get("type") == "tool_call":
        # ツール呼び出しイベントを処理
        pass
```

**変更後:**
```python
# ツール呼び出しイベントを取得するには Hook を使用
from strands.hooks import HookProvider, AfterToolCallEvent

class ToolCallLogger(HookProvider):
    def register_hooks(self, registry, **kwargs):
        registry.add_callback(AfterToolCallEvent, self.log_tool_call)

    async def log_tool_call(self, event: AfterToolCallEvent):
        print(f"Tool called: {event.tool_name}")

agent = Agent(
    model=model,
    hook_providers=[ToolCallLogger()]
)

async for event in agent.stream_async("計算してください"):
    if "data" in event:
        print(event["data"], end="", flush=True)
```

**移行方法:**
- ツール呼び出しをトラッキングしたい場合は、Hook システムを使用してください
- callback_handler に依存していたコードは、Hook に移行する必要があります

---

### OTEL トレーサーのセットアップ変更 ([#286](https://github.com/strands-agents/sdk-python/pull/286))

**変更内容:**
OTEL エクスポーターの自動セットアップが削除され、関数呼び出しに変更されました。

**変更前:**
```python
# 環境変数で OTEL を有効化
import os
os.environ["STRANDS_OTEL_ENABLE_CONSOLE_EXPORT"] = "true"

from strands import Agent
# OTEL が自動的にセットアップされていました
```

**変更後:**
```python
from strands.observability import setup_tracing

# OTEL を明示的にセットアップ
setup_tracing(console_export=True)

from strands import Agent
```

**移行方法:**
- STRANDS_OTEL_ENABLE_CONSOLE_EXPORT 環境変数を削除し、setup_tracing() 関数を使用してください
- 詳細は[トレースドキュメント](https://strandsagents.com/latest/user-guide/observability-evaluation/traces/#code-configuration)を参照

---

## まとめ

v0.2.0 は、1.0.0 リリースに向けた重要なマイナーバージョンアップデートです。Agent State、Mistral サポート、推論コンテンツなどの新機能が追加される一方、より直感的で一貫性のある API を実現するための破壊的変更も含まれています。既存のコードを移行する際は、上記の破壊的変更セクションを参照し、適切に対応してください。
