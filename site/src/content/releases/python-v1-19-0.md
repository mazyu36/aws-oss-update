---
title: "Strands Python SDK v1.19.0 リリース解説"
version: "v1.19.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-12-03
summary: "双方向音声会話を実現する BidiAgent（実験的機能）、モジュラープロンプティングのための Steering システム（実験的機能）、ノードキャンセル機能、falsey 値対応の interrupt、およびツール実行とトレーシングの重要なバグ修正を追加。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.19.0"
---

## 概要

Strands Agents Python SDK v1.19.0 では、リアルタイム音声会話を可能にする双方向ストリーミング Agent（BidiAgent）、複雑なワークフローのためのモジュラープロンプティングシステム（Steering）という2つの大きな実験的機能が追加されました。また、マルチエージェントワークフローでのノードキャンセル機能、interrupt での falsey レスポンスのサポート、ツール実行とトレーシングに関する重要なバグ修正も含まれています。

**リリース:** [v1.19.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.19.0)

## 新機能

### 双方向ストリーミング Agent（実験的機能） ([#1276](https://github.com/strands-agents/sdk-python/pull/1276))

**この機能でできること:**
- リアルタイムの音声会話を実現する双方向ストリーミング Agent が利用できるようになりました。持続的な接続を通じて連続的な音声ストリーミング、自然な割り込み、並行ツール実行をサポートし、音声アシスタントやインタラクティブなアプリケーションを構築できます。Amazon Nova Sonic、OpenAI Realtime API、Google Gemini Live がサポートされています。

**使用例:**

```python
import asyncio
from strands.experimental.bidi import BidiAgent
from strands.experimental.bidi.models import BidiNovaSonicModel
from strands.experimental.bidi.io import BidiAudioIO, BidiTextIO
from strands_tools import calculator

async def main():
    # Nova Sonic モデルで BidiAgent を作成
    model = BidiNovaSonicModel()
    agent = BidiAgent(model=model, tools=[calculator])

    # 音声入出力とテキスト出力を設定
    audio_io = BidiAudioIO()
    text_io = BidiTextIO()

    # Agent を実行
    await agent.run(
        inputs=[audio_io.input()],
        outputs=[audio_io.output(), text_io.output()]
    )

asyncio.run(main())
```

**ポイント:**
- Python 3.12+ が必要です（`hatch run bidi:prepare` で専用環境をセットアップ）
- PyAudio を使用したマイク/スピーカーの自動管理と、ユーザーの発話時の自動割り込み検出機能を提供
- マルチモーダル入力（テキスト、音声、画像）をサポート
- すべてのイベントは強く型付けされ、JSON シリアライズ可能です
- 実験的機能のため、API はユーザーフィードバックに基づいて改善される可能性があります

---

### Steering システム（実験的機能） ([#1280](https://github.com/strands-agents/sdk-python/pull/1280))

**この機能でできること:**
- 複雑なマルチステップタスクのために、モジュラープロンプティングと段階的な情報開示（progressive disclosure）を実現する Steering システムが利用できるようになりました。すべての指示を巨大なプロンプトに詰め込む代わりに、関連性が高いタイミングでコンテキストに応じたガイダンスを提供するため、Agent の適応的推論能力を維持しながら効果的にタスクを実行できます。

**使用例:**

```python
from strands import Agent
from strands.experimental.steering import LLMSteeringHandler

# システムプロンプトを使った Steering Handler を作成
handler = LLMSteeringHandler(
    system_prompt="メール送信時には、必ず明るく前向きなトーンを維持してください。"
)

# Agent に Hook として追加
agent = Agent(
    tools=[send_email],
    hooks=[handler]
)

# Agent がツールを呼び出す前に、Steering がガイダンスを提供
response = agent("顧客にメールを送信してください")
```

**ポイント:**
- Hooks の BeforeToolCallEvent を利用して、ツール呼び出し時にコンテキストに応じた介入を行います
- SteeringContextProvider（LedgerProvider など）を使用して、ツール呼び出し履歴やタイミングを追跡
- SteeringHandler は、Proceed（続行）、Guide（キャンセル + フィードバック）、Interrupt（人間の入力）の3つのアクションを返せます
- LLMSteeringHandler は自然言語のガイダンスをシステムプロンプト経由で提供する具象実装です
- カスタム SteeringHandler を実装することで、独自のロジックを追加できます

---

### マルチエージェントでのノードキャンセル機能 ([#1203](https://github.com/strands-agents/sdk-python/pull/1203))

**この機能でできること:**
- BeforeNodeCallEvent Hook からマルチエージェントのノード実行をキャンセルできるようになりました。これにより、Human-in-the-Loop（HIL）の承認/拒否ワークフローを interrupt を使って操作できます。

**使用例:**

```python
from strands.hooks import HookProvider
from strands.experimental.hooks import BeforeNodeCallEvent
from strands.multiagent import Swarm
from strands import Agent

class CancelHook(HookProvider):
    """特定ノードの実行前に承認を求める"""

    def register_hooks(self, registry, **kwargs):
        registry.add_callback(BeforeNodeCallEvent, self.cancel)

    def cancel(self, event: BeforeNodeCallEvent):
        if event.node_id == "delete":
            # ユーザーに承認を求める
            response = event.interrupt("my_interrupt", reason="削除には承認が必要です")
            if response != "APPROVE":
                event.cancel_node = "ノードが拒否されました"

# マルチエージェントシステムのセットアップ
system_agent = Agent(name="system")
delete_agent = Agent(name="delete")
swarm = Swarm([system_agent, delete_agent], hooks=[CancelHook()])

result = swarm("ファイルを削除してください")
# 承認が得られなかった場合、delete ノードは実行されず、swarm は FAILED ステータスで終了
```

**ポイント:**
- ツールのキャンセル機能のミラー実装です
- Swarm と Graph の両方でサポート
- ノードがキャンセルされると、マルチエージェントシステムは FAILED ステータスで終了します

---

### Interrupt での falsey レスポンスのサポート ([#1256](https://github.com/strands-agents/sdk-python/pull/1256))

**この機能でできること:**
- Interrupt のレスポンスとして、False や 0 などの falsey 値を返せるようになりました。これにより、承認/拒否ワークフローをより自然に実装できます。

**使用例:**

```python
from strands.hooks import HookProvider
from strands.experimental.hooks import BeforeToolCallEvent
from strands import Agent

class ApprovalHook(HookProvider):
    """ツール実行の承認を求める"""

    def register_hooks(self, registry, **kwargs):
        registry.add_callback(BeforeToolCallEvent, self.my_hook)

    def my_hook(self, event: BeforeToolCallEvent):
        # ユーザーに承認を求める（True/False を期待）
        response = event.interrupt("my_interrupt", reason="承認してください")
        if not response:  # False、0、None などの falsey 値をチェック
            event.cancel_tool = True

agent = Agent(tools=[my_tool], hook_providers=[ApprovalHook()])

# Agent を呼び出す
result = agent("ツールを呼び出してください")

# Interrupt に応答
if result.stop_reason == "interrupt":
    responses = []
    for interrupt in result.interrupts:
        if interrupt.name == "my_interrupt":
            responses.append({
                "interruptId": interrupt.id,
                "response": False  # falsey 値を返す
            })
    result = agent(responses)
```

**ポイント:**
- 以前は falsey 値（False、0 など）が正しく処理されませんでしたが、このバグが修正されました
- Boolean や整数値を使った承認/拒否フローが自然に実装できます

---

## バグ修正

### ToolContext を使用する直接ツール呼び出しで KeyError を回避 ([#1213](https://github.com/strands-agents/sdk-python/pull/1213))
- ToolContext を利用するツールを Agent 外で直接呼び出した場合に発生していた KeyError を修正しました。これにより、ツールのユニットテストやスタンドアロンでの実行が安全に行えるようになりました。

### すべての Span にカスタム属性をアタッチ ([#1235](https://github.com/strands-agents/sdk-python/pull/1235))
- カスタム属性が Agent Span にのみ追加され、内部の Span（ツール実行、マルチエージェント操作など）には追加されていなかった問題を修正しました。これにより、カスタム属性がすべての Span に伝播されるようになり、トレーシングとオブザーバビリティが向上します。

---

## まとめ

v1.19.0 は、リアルタイム音声会話を実現する BidiAgent と、複雑なワークフローのための Steering システムという2つの革新的な実験的機能を追加する重要なリリースです。また、マルチエージェントワークフローでのノードキャンセル、interrupt での falsey レスポンスのサポート、ツール実行とトレーシングの重要なバグ修正も含まれており、SDK の機能性と堅牢性がさらに向上しています。
