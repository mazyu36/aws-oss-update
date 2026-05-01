---
title: "sdk-python v1.29.0"
version: "v1.29.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-03-04
summary: "OpenAI Responses API モデルの追加、プラグイン開発を簡素化する @hook/@tool デコレータ、ツール結果の切り詰め戦略の改善などを含むリリースです。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.29.0"
---

## 概要

このリリースでは、OpenAI Responses API を新しいモデルプロバイダーとして追加し、プラグイン開発を簡素化する `@hook` および `@tool` デコレータを導入しました。また、ツール結果の切り詰め戦略の改善や、複数のバグ修正も含まれています。

**リリース:** [v1.29.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.29.0)

## 新機能

### OpenAI Responses API モデル実装の追加 ([#975](https://github.com/strands-agents/sdk-python/pull/975))

**この機能でできること:**
- OpenAI の Responses API を独立したモデルプロバイダーとして使用できます
- ストリーミング、構造化出力、ツール呼び出しをサポートしています

**使用例:**

```python
from strands import Agent
from strands.models import OpenAIResponses

# OpenAI Responses API モデルを使用してエージェントを作成
model = OpenAIResponses(
    model_id="gpt-4o",
)

agent = Agent(model=model)

response = agent("Hello, how are you?")
print(response)
```

**ポイント:**
- 既存の OpenAI Chat Completions API とは別のプロバイダーとして実装されています
- 現時点では Responses API 固有の組み込みツールやステートフルな会話実行機能は含まれていません

---

### プラグイン開発の改善: @hook と @tool デコレータ ([#1740](https://github.com/strands-agents/sdk-python/pull/1740))

**この機能でできること:**
- `@hook` デコレータを使用して、フックを宣言的に登録できます
- `@tool` デコレータを使用して、ツールを宣言的に登録できます
- 冗長な `init_plugin()` メソッドでの手動登録が不要になります

**使用例:**

```python
from strands.plugins import Plugin, hook, tool
from strands.hooks import BeforeModelCallEvent, AfterModelCallEvent

class MyPlugin(Plugin):
    name = "my-plugin"

    # 型ヒントからイベントタイプを推論して自動登録
    @hook
    def on_model_call(self, event: BeforeModelCallEvent):
        print(f"Model call started: {event}")

    # Union 型で複数のイベントに登録
    @hook
    def on_any_model_event(self, event: BeforeModelCallEvent | AfterModelCallEvent):
        print(f"Model event: {event}")

    # ツールも宣言的に登録可能
    @tool
    def printer(self, log: str):
        """ログを出力するツール"""
        print(log)
        return "Printed log"
```

**ポイント:**
- 従来の `agent.add_hook()` を使用した手動登録も引き続きサポートされています
- 型ヒントからイベントタイプが自動的に推論されるため、登録コードが大幅に簡素化されます

---

### ツール結果の切り詰め戦略の改善 ([#1756](https://github.com/strands-agents/sdk-python/pull/1756))

**この機能でできること:**
- `SlidingWindowConversationManager` でのコンテキストサイズ削減が、より優雅に行われるようになりました
- 大きなツール結果を完全に削除せず、部分的に切り詰めて先頭と末尾を保持します
- 画像ブロックは説明的なテキストプレースホルダーに置き換えられます
- 最も古いツール結果から優先的に処理され、最新の結果がより長く保持されます

**使用例:**

```python
from strands import Agent
from strands.agent.conversation_manager import SlidingWindowConversationManager

# カスタム設定でコンバセーションマネージャーを作成
conversation_manager = SlidingWindowConversationManager(
    window_size=10,
)

agent = Agent(conversation_manager=conversation_manager)
```

**ポイント:**
- 400 文字を超える大きなツール結果は、先頭 200 文字と末尾 200 文字を保持して部分的に切り詰められます
- エラーメッセージで完全に置き換えられていた従来の動作と比較して、エージェントにより多くのコンテキストが提供されます

## バグ修正

### Langfuse 用の semantic conventions を span attributes に追加 ([#1768](https://github.com/strands-agents/sdk-python/pull/1768))
- Langfuse がイベント属性ではなく span 属性から semantic conventions を読み取る問題を修正
- Langfuse ユーザーに対して、最新の semantic conventions が正しく適用されるようになりました

### ツール実行後の guardrail_latest_message ラッピングの保持 ([#1658](https://github.com/strands-agents/sdk-python/pull/1658))
- ツール実行後、最後のメッセージが `toolResult` でテキスト/画像コンテンツがない場合に、`guardrail_latest_message` のラッピングが失われる問題を修正
- フォーマットループの前に、テキストまたは画像コンテンツを含む最後のユーザーメッセージのインデックスを事前計算することで、`guardContent` ラッピングが正しいメッセージをターゲットにするようになりました

### ConcurrentToolExecutor からの例外の正しいスロー ([#1797](https://github.com/strands-agents/sdk-python/pull/1797))
- ツールが例外を発生させ、`AfterToolCallEvent` フックが再スローした場合、`ConcurrentToolExecutor` が例外を黙って飲み込んでいた問題を修正
- 例外がキューに入れられ、`_execute()` で再スローされるようになり、呼び出し元がツールの失敗を検出して処理できるようになりました
- 終了時にすべての残りのタスクがキャンセルされ、コルーチンのリークを防止します

## まとめ

このリリースでは、OpenAI Responses API のサポート追加、プラグイン開発体験の大幅な改善、そしてツール結果の切り詰め戦略の改善により、エージェント開発の利便性と信頼性が向上しました。
