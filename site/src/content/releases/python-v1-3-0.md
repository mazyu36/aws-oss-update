---
title: "Strands Python SDK v1.3.0 リリース解説"
version: "v1.3.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-08-04
summary: "a2a-sdk の依存関係の修正、セッションコードフェンスとテストの改善、max_tokens 到達時の専用例外の追加。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.3.0"
---

## 概要

Strands Agents Python SDK v1.3.0 では、A2A (Agent-to-Agent) 機能の安定性向上と、イベントループでの max_tokens 到達時のエラーハンドリングの改善が行われました。依存関係の問題を修正し、ドキュメントの品質を向上させ、より明確なエラーメッセージを提供します。

**リリース:** [v1.3.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.3.0)

## バグ修正

### a2a-sdk 依存関係のピン ([#581](https://github.com/strands-agents/sdk-python/pull/581))

**修正内容:**
- `a2a-sdk>=0.2.16` にピンすることで、互換性のない古いバージョンがインストールされる問題を解決しました。
- `pip install strands-agents[a2a]` を実行した際に、実行時エラーが発生する問題（[#572](https://github.com/strands-agents/sdk-python/issues/572)）を修正しました。

**影響を受けていた状況:**
- A2AServer を使用する際に、互換性のない a2a-sdk のバージョンが解決され、実行時エラーが発生していました。

**使用例:**

```python
import logging
from strands_tools.calculator import calculator
from strands import Agent
from strands.multiagent.a2a import A2AServer

logging.basicConfig(level=logging.INFO)

# Strands Agent を作成
strands_agent = Agent(
    name="Calculator Agent",
    description="基本的な算術演算を実行できる計算機エージェント",
    tools=[calculator],
    callback_handler=None
)

# A2A サーバーを作成（デフォルトでストリーミング有効）
a2a_server = A2AServer(agent=strands_agent)

# サーバーを起動（エラーなく動作）
a2a_server.serve()
```

**ポイント:**
- この修正により、A2A 機能を使用する際に正しい依存関係が確実にインストールされます
- 既存のインストールコマンドは変更不要です

---

### セッションコードフェンスと A2A テストの修正 ([#591](https://github.com/strands-agents/sdk-python/pull/591))

**修正内容:**
- セッションのドキュメントに `bash` コードフェンスを追加し、ドキュメントサイトで正しく表示されるように修正しました。
- multiagent/a2a が新しい snake_case 型定義を使用するように更新しました。
- テストで新しい snake_case をモックするように修正しました。

**影響を受けていた状況:**
- ドキュメントサイトでセッション関連のコードが正しく表示されていませんでした。
- a2a-sdk の型定義の変更によりテストやリントで問題が発生していました。

---

### max_tokens 到達時の専用例外を追加 ([#576](https://github.com/strands-agents/sdk-python/pull/576))

**修正内容:**
- イベントループで max_tokens に到達した際に `EventLoopMaxTokensReachedException` という専用の例外を発生させるようになりました。
- エラーメッセージにドキュメントへのリンクを含め、トラブルシューティングを容易にしました。

**影響を受けていた状況:**
- max_tokens に到達した際のエラーが不明確で、デバッグが困難でした。

**使用例:**

```python
from strands import Agent
from strands.types.exceptions import EventLoopMaxTokensReachedException

agent = Agent(
    name="My Agent",
    description="エージェントの説明"
)

try:
    response = agent("非常に長い応答を生成するタスク")
except EventLoopMaxTokensReachedException as e:
    print(f"Max tokens に到達しました: {e}")
    # エラーメッセージには詳細なドキュメントリンクが含まれます
    # https://strandsagents.com/latest/user-guide/concepts/agents/agent-loop/#maxtokensreachedexception
```

**ポイント:**
- この変更は [#541](https://github.com/strands-agents/sdk-python/issues/541) の最初のステップです
- 将来的には、Hook イベントと HookProvider の実装により、max_tokens エラーからの回復が可能になります
- 現在は、他の障害タイプと一貫してハードフェイルしますが、より明確なエラーメッセージを提供します

---

## まとめ

v1.3.0 は、A2A 機能の安定性向上とエラーハンドリングの改善に焦点を当てたメンテナンスリリースです。依存関係の問題を修正し、ドキュメントの品質を向上させ、max_tokens エラーに対してより明確なフィードバックを提供します。
