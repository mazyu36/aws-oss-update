---
title: "sdk-python v1.16.0"
version: "v1.16.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-11-12
summary: "非同期フック対応、スレッドコンテキスト共有、OpenTelemetry による強化されたテレメトリ機能、そしてツールパラメータのシンプルな記述方法が追加されました。また、Anthropic のコンテキストオーバーフローエラー処理、MCP サーバーの 5xx エラー時のハング問題、Gemini の非 JSON エラーレスポンス処理などの重要なバグ修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.16.0"
---

## 概要

このリリースでは、非同期プログラミングのサポート強化とより良い可観測性を実現する機能が追加されました。非同期フックのサポートにより、async/await パターンを使用したエージェント呼び出しがより効率的になり、スレッドコンテキスト共有により同期呼び出し時のコンテキスト伝播の問題が解決されました。さらに、OpenTelemetry によるテレメトリ機能の強化、ツールパラメータ記述の簡素化、そして複数の重要なバグ修正が含まれています。

**リリース:** [v1.16.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.16.0)

## 新機能

### 非同期フックサポート ([#1119](https://github.com/strands-agents/sdk-python/pull/1119))

**この機能でできること:**
フックが非同期コールバックをサポートするようになり、エージェントを非同期で呼び出す際にイベントループをブロックせずにフックコードを実行できます。これは、I/O 操作を実行するフックや、Bidirectional Agents のような非同期のみで動作するシナリオで特に有用です。

**使用例:**

```python
import asyncio
from strands import Agent
from strands.hooks import BeforeInvocationEvent, HookProvider, HookRegistry

class AsyncHook(HookProvider):
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(BeforeInvocationEvent, self.async_callback)

    async def async_callback(self, event: BeforeInvocationEvent) -> None:
        # イベントループをブロックせずに非同期操作を実行
        await asyncio.sleep(1)
        print("Hook executed asynchronously!")

agent = Agent(hooks=[AsyncHook()])
await agent.invoke_async("Hello!")
```

**ポイント:**
- 非同期フックは引き続き順次実行されます（1つずつ実行）
- `AgentInitializedEvent` は `__init__` から発行されるため、非同期コールバックをサポートしていません
- 同期フックと非同期フックを混在させることができます

---

### スレッドコンテキスト共有 ([#1146](https://github.com/strands-agents/sdk-python/pull/1146))

**この機能でできること:**
同期呼び出しを使用する際に、コンテキスト変数（`contextvars`）がメインスレッドからエージェントスレッドに自動的にコピーされるようになりました。これにより、コンテキストに依存するツールやフックが正しく動作します。

**使用例:**

```python
from contextvars import ContextVar
from strands import Agent, tool

request_id = ContextVar('request_id')

@tool
def my_tool():
    # コンテキスト変数がツール内でアクセス可能になりました
    current_request_id = request_id.get()
    return f"Processing request: {current_request_id}"

request_id.set("abc-123")
agent = Agent(tools=[my_tool])
response = agent.invoke_async("Use my tool")  # コンテキストが適切に伝播されます
```

**ポイント:**
- スレッドの使用は Strands の内部実装の詳細であり、コンテキスト分離ではなく asyncio イベントループの分離を目的としています
- コンテキストのコピーは一方向のみです（サブスレッドでの変更は親スレッドに伝播しません）
- この変更により、リクエスト ID、ユーザー情報、その他のコンテキスト依存データの追跡が容易になります

---

### OpenTelemetry による強化されたテレメトリ機能 ([#1113](https://github.com/strands-agents/sdk-python/pull/1113))

**この機能でできること:**
ツール定義が OpenTelemetry トレースに含まれるようになり、エージェントのツール使用に関するより良い可観測性が提供されます。この機能は [OpenTelemetry の GenAI セマンティック規約](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) に従っています。

**使用例:**

環境変数でオプトイン:

```bash
export OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_tool_definitions
```

```python
from strands import Agent, tool
from strands_tools import calculator

# ツール定義がテレメトリトレースに表示されます
agent = Agent(tools=[calculator])
agent("What is 5 + 3?")
```

**ポイント:**
- この機能はオプトイン方式です（環境変数で有効化が必要）
- 後方互換性のため、`gen_ai.agent.tools` 属性（ツール名のみを含む）は保持されています
- デバッグやパフォーマンス分析に役立ちます

---

### Annotated 型ヒントでの文字列による説明 ([#1089](https://github.com/strands-agents/sdk-python/pull/1089))

**この機能でできること:**
ツールパラメータの `Annotated` 型ヒントで文字列による説明を直接使用できるようになり、コードの可読性が向上し、ボイラープレートが削減されます。

**使用例:**

```python
from typing import Annotated
from strands import tool

@tool
def get_weather(
    location: Annotated[str, "The city and state, e.g., San Francisco, CA"],
    units: Annotated[str, "Temperature units: 'celsius' or 'fahrenheit'"] = "celsius"
):
    """Get weather for a location."""
    return f"Weather in {location}: 72°{units[0].upper()}"
```

**ポイント:**
- 以前は冗長な `Field()` 構文やドキュメント文字列を使用する必要がありました
- 文字列ベースの説明に焦点を当てており、`pydantic.Field` の制約サポートは将来の機能拡張として予定されています
- ドキュメント文字列よりも `Annotated` の説明が優先されます

---

## バグ修正

### Anthropic の「プロンプトが長すぎる」エラーの処理 ([#1137](https://github.com/strands-agents/sdk-python/pull/1137))
SDK が Anthropic の「プロンプトが長すぎる」エラーを適切に処理し、表示するようになりました。これにより、コンテキストウィンドウの問題を診断して修正することが容易になります。

### MCP サーバーの 5xx エラー時の耐障害性 ([#1169](https://github.com/strands-agents/sdk-python/pull/1169))
Model Context Protocol（MCP）サーバーが 5xx エラーを返した際に、SDK がハングしなくなりました。外部サービスとの連携時の信頼性が向上します。エラーが発生した場合、MCP 接続は適切にシャットダウンされ、クライアントは必要に応じてリカバリーできます。

### Gemini の非 JSON エラーメッセージの処理 ([#1062](https://github.com/strands-agents/sdk-python/pull/1062))
Gemini モデルプロバイダーが非 JSON エラーレスポンス（例：無効な API キー）を適切に処理し、予期しないクラッシュを防ぎます。エラーが発生すると、警告がログに記録され、元の `ClientError` が適切に伝播されます。

---

## まとめ

v1.16.0 は、非同期プログラミングのサポート強化、コンテキスト管理の改善、可観測性の向上、そしてより直感的な開発者体験を提供します。非同期フック、スレッドコンテキスト共有、OpenTelemetry 統合により、本番環境でのエージェントの開発とモニタリングがより容易になります。
