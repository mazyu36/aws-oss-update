---
title: "AgentCore Python SDK v1.23.1 リリース解説"
version: "v1.23.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-09-16
summary: "Strands 1.56.0 との互換性を回復する重要なバグ修正リリース。AgentCoreMemorySessionManager が最新の Strands bidi セッションフックを使用するように修正され、BidiAgent との連携も改善されました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.23.1"
---

## 概要

このリリースは、Strands Agents 1.56.0 との互換性問題を修正する重要なバグ修正リリースです。`AgentCoreMemorySessionManager` のインポート失敗を解消し、`BidiAgent` (双方向エージェント) のセッション永続化も適切に動作するようになりました。

**リリース:** [v1.23.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.23.1)

## バグ修正

### Strands の最新 bidi セッションフックに対応 ([#664](https://github.com/aws/bedrock-agentcore-sdk-python/pull/664))

Strands Agents 1.56.0 において、`strands-agents/harness-sdk#4280` により bidi (双方向) 系のフックイベントが削除・整理されました。これにより、従来の実装では `AgentCoreMemorySessionManager` のインポートが失敗する状態になっていました。

**修正内容:**

- `Agent` と `BidiAgent` の両方で共有される初期化・メッセージフックを使用するように変更
- bidi セッション停止時の状態保存に `BidiAgentStopEvent` を使用
- 初期化は同期のまま維持し、`async_mode=True` の場合は永続化コールバックをオフロード
- `AfterInvocationEvent` と `BidiAgentStopEvent` の両方で、最終的な状態同期後に保留中のメッセージ・状態バッチをフラッシュ
- `BidiAgent` については、ローカルのメッセージ履歴を変更してもライブモデルにコンテキストが届かないため、自動的なコンテキスト取得をスキップ
- エージェントの型注釈を `LocalAgent` に更新
- `strands-agents` の最低バージョンを 1.56.0 に引き上げ

**影響を受けていた状況:**

Strands 1.56.0 と `bedrock-agentcore` v1.23.0 以前の組み合わせでは、以下のようなインポートが失敗していました。

```python
# v1.23.0 以前 + Strands 1.56.0 の組み合わせではエラー
from bedrock_agentcore.memory.integrations.strands import AgentCoreMemorySessionManager
```

**修正後の使い方:**

```python
from strands import Agent
from bedrock_agentcore.memory.integrations.strands import AgentCoreMemorySessionManager

# セッションマネージャーの初期化 (同期)
session_manager = AgentCoreMemorySessionManager(
    memory_id="your-memory-id",
    session_id="user-session-001",
    actor_id="user-123",
    async_mode=True,  # True の場合、永続化コールバックはオフロードされる
)

# 通常の Agent での使用
agent = Agent(
    session_manager=session_manager,
    # ... その他の Agent 設定
)

# 会話するたびにメッセージが自動的に永続化される
response = agent("こんにちは")
```

**BidiAgent での使用:**

```python
from strands import BidiAgent
from bedrock_agentcore.memory.integrations.strands import AgentCoreMemorySessionManager

session_manager = AgentCoreMemorySessionManager(
    memory_id="your-memory-id",
    session_id="bidi-session-001",
    actor_id="user-123",
)

bidi_agent = BidiAgent(
    session_manager=session_manager,
    # ... その他の BidiAgent 設定
)

# 双方向セッションの開始・送信・受信・停止
await bidi_agent.start()
await bidi_agent.send("こんにちは")
async for message in bidi_agent.receive():
    print(message)
# stop 時に状態が保存される (BidiAgentStopEvent により)
await bidi_agent.stop()
```

**ポイント:**

- `strands-agents >= 1.56.0` が必須になったため、依存関係の更新が必要です
- `BidiAgent` ではライブモデルにコンテキストを注入できないため、自動的なコンテキスト取得は行われません。過去の会話履歴を利用したい場合は、明示的にコンテキストを構築してモデルに送信する必要があります
- `async_mode=True` を使うと、メッセージ・状態の永続化がバックグラウンドで実行されエージェントの応答性が向上します

## まとめ

このリリースは、Strands Agents 1.56.0 との互換性を回復するための重要なバグ修正リリースです。`AgentCoreMemorySessionManager` を利用しているすべてのユーザーは、v1.23.1 へのアップグレードを推奨します。
