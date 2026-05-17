---
title: "Strands Python SDK v1.18.0 リリース解説"
version: "v1.18.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-11-21
summary: "マルチエージェントの割り込み対応強化、MCP クライアントのタイムアウトエラーに対する接続保護、ツールローダーのセキュリティ強化、LiteLLM のキャッシュトークンメトリクス修正などの改善を含むリリース。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.18.0"
---

## 概要

Strands Agents Python SDK v1.18.0 では、マルチエージェントシステムの割り込み機能の強化、MCP クライアントのエラーハンドリング改善、ツールローダーのセキュリティ強化、LiteLLM におけるキャッシュトークンメトリクスの修正など、安定性とセキュリティを向上させる複数の改善が含まれています。

**リリース:** [v1.18.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.18.0)

## 新機能

### MultiAgentInput 型のサポート ([#1196](https://github.com/strands-agents/sdk-python/pull/1196))

**この機能でできること:**
- マルチエージェント入力用の統一された型 `MultiAgentInput` が追加されました。これにより、複数の場所で使用される入力型が簡素化され、AgentInput との対称性が生まれます。

**使用例:**

```python
from strands.types.multiagent import MultiAgentInput
from strands.multiagent import Swarm, Graph

# Swarm でマルチエージェント入力を使用
swarm = Swarm(agents=[agent1, agent2])

# MultiAgentInput 型は以下をサポート:
# - str
# - list[Content]
# - dict (メッセージ辞書)
# - list[dict] (複数のメッセージ)

# 文字列入力
response = swarm.invoke("タスクを実行してください")

# コンテンツリスト
from strands.types import Content, TextContent
response = swarm.invoke([TextContent(text="タスクを実行してください")])

# メッセージ辞書
response = swarm.invoke({
    "role": "user",
    "content": [{"text": "タスクを実行してください"}]
})
```

**ポイント:**
- 今後のリリースで `list[InterruptResponseContent]` もサポートされる予定です
- API ドキュメントは自動的に更新されます

---

### マルチエージェント割り込みインターフェースの強化 ([#1207](https://github.com/strands-agents/sdk-python/pull/1207))

**この機能でできること:**
- マルチエージェントフック向けの割り込みインターフェース `_Interruptible` が更新され、Swarm と Graph での割り込みサポートが強化されました。ユーザーレスポンスが再開時に自動的に割り込み状態コンテキストに追加されます。

**使用例:**

```python
from strands.multiagent import Swarm
from strands.interrupt import interrupt

# Swarm で割り込みを使用
swarm = Swarm(agents=[agent1, agent2])

async def process_with_interruption(swarm, input_text):
    # 割り込み可能な処理を実行
    try:
        response = await swarm.invoke_async(input_text)
    except InterruptException as e:
        # 割り込みが発生した場合、ユーザーに質問
        user_response = await get_user_input(e.interrupt_content)

        # ユーザーレスポンスで再開
        # ユーザーレスポンスは自動的にコンテキストに追加されます
        response = await swarm.resume(user_response)

    return response
```

**ポイント:**
- `source` フィールドを使用してマルチエージェントインスタンスへの参照を保持します
- 再開時にユーザーレスポンスが自動的にコンテキストに追加されるため、Swarm と Graph での処理が簡素化されます

---

### ツールローダーのセキュリティ強化 ([#1214](https://github.com/strands-agents/sdk-python/pull/1214))

**この機能でできること:**
- ツールローダーにプレフィックスを追加することで、ツール名と既存の sys モジュールとの衝突を防ぎます。これにより、意図的または偶発的なモジュール名の衝突によるセキュリティリスクを軽減します。

**使用例:**

```python
from strands.tools.loader import load_tools_from_directory
from strands import Agent

# ツールディレクトリからツールを読み込む
# ツール名は自動的にプレフィックスが付与され、sys モジュールとの衝突を防ぎます
tools = load_tools_from_directory("./my_tools")

agent = Agent(
    name="Secure Agent",
    description="セキュリティ強化されたツールを使用するエージェント",
    tools=tools
)

# 例: 'os.py' という名前のツールファイルがあっても、
# Python の標準 os モジュールと衝突しません
```

**ポイント:**
- ツールモジュールの読み込み時に自動的にプレフィックスが適用されます
- 意図しないモジュールオーバーライドを防ぎ、セキュリティが向上します
- 既存のツールコードの変更は不要です

---

## バグ修正

### MCP クライアントのタイムアウトエラーに対する接続保護 ([#1231](https://github.com/strands-agents/sdk-python/pull/1231))

**修正内容:**
- MCP クライアントが「unknown request id」エラーなど、回復可能なクライアント側タイムアウトエラーによって接続が切断されてしまう問題を修正しました。これらのエラーは、レスポンスがクライアント側のタイムアウト後に到着した場合に発生していました。

**改善点:**
- エラーフィルタリングシステムを実装し、非致命的エラーパターンはログに記録されるのみで、接続を終了しません
- 「unknown request id」などのパターンに一致するエラーは無視され、接続の安定性が維持されます
- 真のサーバーエラーは引き続き正常に伝播します

---

### LiteLLM のキャッシュトークンメトリクス修正 ([#1233](https://github.com/strands-agents/sdk-python/pull/1233))

**修正内容:**
- LiteLLM の `PromptTokensDetailsWrapper` から `cacheWriteInputTokens` を読み取る際、`cache_creation_tokens` プロパティではなく、正しい `cache_creation_input_token` プロパティを使用するように修正しました。

**影響:**
- この問題により、`test_cache_read_tokens_multi_turn` 統合テストでキャッシュ書き込みトークンが正しく表示されませんでした
- Bedrock、Anthropic、または LiteLLM 側の変更により、以前のプロパティが正しく設定されなくなっていました

---

## まとめ

v1.18.0 は、マルチエージェントシステムの割り込み機能の改善、MCP クライアントの接続安定性向上、ツールローダーのセキュリティ強化など、重要な改善を含むリリースです。また、LiteLLM のキャッシュトークンメトリクスに関するバグ修正により、テレメトリの精度も向上しました。
