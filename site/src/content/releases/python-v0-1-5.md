---
title: "Strands Python SDK v0.1.5 リリース解説"
version: "v0.1.5"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-05-26
summary: "コールバックハンドラーへの推論テキスト対応、システムプロンプトの動的オーバーライド機能、イベントループのモジュール化リファクタリング、Bedrock 検証ルール緩和に対応した SlidingWindowConversationManager の更新、テレメトリのスパン修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.1.5"
---

## 概要

Strands Agents Python SDK v0.1.5 では、コールバックハンドラーに推論テキスト（reasoningText）のサポートが追加され、システムプロンプトの動的オーバーライド機能が実装されました。また、イベントループのリファクタリングによる保守性の向上、Bedrock の検証ルール緩和に対応した会話マネージャーの改善、ストリーミング時のテレメトリ修正など、重要な機能追加とバグ修正が含まれています。

**リリース:** [v0.1.5](https://github.com/strands-agents/sdk-python/releases/tag/v0.1.5)

## 新機能

### コールバックハンドラーへの推論テキストサポート ([#109](https://github.com/strands-agents/sdk-python/pull/109))

**この機能でできること:**
- `PrintingCallbackHandler` が `reasoningText` 引数を処理できるようになりました。モデルの推論過程を可視化できます。

**使用例:**

```python
from strands import Agent
from strands.handlers.callback_handler import PrintingCallbackHandler

# コールバックハンドラーを使用
agent = Agent(
    model=model,
    callback_handler=PrintingCallbackHandler()
)

# reasoningText が存在する場合、自動的に表示されます
response = agent("複雑な問題を解決してください")
# 推論テキストが出力に含まれます
```

**ポイント:**
- `reasoningText` が存在する場合のみ出力されます
- `data` と `reasoningText` の両方が存在する場合も正しく処理されます
- 既存のツール使用追跡機能はそのまま動作します

---

### システムプロンプトの動的オーバーライド機能 ([#108](https://github.com/strands-agents/sdk-python/pull/108))

**この機能でできること:**
- Agent 呼び出し時に `system_prompt` パラメータを指定することで、インスタンス作成時のプロンプトを一時的に上書きできます。単一のエージェントインスタンスで異なる役割を実行できます。

**使用例:**

```python
from strands import Agent
from strands.models.openai import OpenAIModel

# デフォルトのシステムプロンプトを持つエージェント
agent = Agent(
    model=OpenAIModel(),
    system_prompt="You are a helpful assistant."
)

# 1. デフォルトのシステムプロンプトを使用
response1 = agent("Hello")

# 2. コードレビュー用にプロンプトをオーバーライド
response2 = agent(
    "このコードをレビューしてください",
    system_prompt="You are a senior code reviewer."
)

# 3. 創作活動用にプロンプトをオーバーライド
response3 = agent(
    "詩を書いてください",
    system_prompt="You are a creative poet."
)

# 4. デフォルトに戻る（オーバーライド指定なし）
response4 = agent("数学の問題を解いてください")
```

**ポイント:**
- 呼び出しごとに異なるシステムプロンプトを使用可能
- 新しいエージェントインスタンスを作成する必要がありません
- CLI ツールやテストシナリオでの動的なプロンプト切り替えに便利です
- 100% 後方互換性があり、既存のコードは変更不要です

---

### イベントループのモジュール化リファクタリング ([#106](https://github.com/strands-agents/sdk-python/pull/106))

**この機能でできること:**
- イベントループの内部構造が改善され、ツール実行ロジックが専用の関数 `_handle_tool_execution()` に分離されました。コードの可読性と保守性が向上しています。

**主な改善点:**
- ツール実行ロジックを専用関数 `_handle_tool_execution()` に抽出
- リトライ設定を定数化（`MAX_ATTEMPTS = 6`、`INITIAL_DELAY = 4`、`MAX_DELAY = 240`）
- 型ヒントの改善（`initialize_state()` が `Dict[str, Any]` を受け取るように変更）
- コールバックハンドラーの型を `Callable[..., Any]` に明確化

**使用例:**

```python
# 開発者向け: 型ヒントが改善され、IDE のサポートが向上
import strands.event_loop.event_loop

# 新しい関数シグネチャ
kwargs = {"user_input": "Hello"}
initialized_state = strands.event_loop.event_loop.initialize_state(kwargs)
```

**ポイント:**
- ユーザー向けの API には変更はありません
- 内部実装の改善により、将来的な機能追加が容易になります
- リトライ設定の調整が定数の変更だけで可能になりました

---

### SlidingWindowConversationManager の更新 ([#120](https://github.com/strands-agents/sdk-python/pull/120))

**この機能でできること:**
- Bedrock の検証ルール緩和に対応しました。以前は会話履歴の最古メッセージが user メッセージで toolResult を含まない必要がありましたが、現在は toolUse と toolResult のペアが正しく並んでいれば動作します。

**使用例:**

```python
from strands import Agent
from strands.agent.conversation_manager import SlidingWindowConversationManager

# Bedrock の新しい検証ルールに対応
manager = SlidingWindowConversationManager(
    window_size=20,
    should_truncate_results=True
)

agent = Agent(
    model=bedrock_model,
    conversation_manager=manager
)

# toolUse と toolResult のペアが正しく並んでいれば、
# より柔軟に会話履歴を管理できます
response = agent("ツールを使って情報を取得してください")
```

**ポイント:**
- Bedrock API の最新の検証ルールに準拠
- より柔軟な会話履歴管理が可能になりました
- 既存のコードは引き続き動作します

---

## バグ修正

### ストリーミング時のテレメトリスパン修正 ([#119](https://github.com/strands-agents/sdk-python/pull/119))

`Agent.stream_async()` を使用した際にエージェントスパンの開始と終了が正しく記録されなかった問題を修正しました。これにより、Langfuse などのテレメトリバックエンドで正確なトレース情報が記録されるようになります。

**影響を受けていた状況:**
- `stream_async()` メソッドを使用していた場合、テレメトリスパンのタイミングが不正確でした
- トレース分析でエージェントの実行時間が正しく表示されませんでした

---

## まとめ

v0.1.5 は、開発者エクスペリエンスとコードの保守性を向上させる重要なリリースです。システムプロンプトの動的オーバーライド機能により、単一のエージェントインスタンスで柔軟な対応が可能になり、推論テキストのサポートによりモデルの動作を詳細に把握できるようになりました。また、イベントループのリファクタリングにより、今後の機能拡張がより容易になります。
