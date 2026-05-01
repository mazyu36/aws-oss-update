---
title: "sdk-python v1.14.0"
version: "v1.14.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-10-29
summary: "Agentic Loop による Structured Output、割り込み機能 (Interrupts) の強化、MCP 接続のマネージド化、Agent Config ファイルサポートなど、Agent の機能性と開発体験を大幅に向上させる主要機能を追加。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.14.0"
---

## 概要

Strands Agents Python SDK v1.14.0 では、Agent ループの一部として動作する Structured Output 機能、Human-in-the-loop パターンを実現する Interrupts の強化、MCP 接続の自動管理機能、設定ファイルによる Agent 作成など、開発者体験と Agent の機能性を大幅に向上させる主要機能が追加されました。

**リリース:** [v1.14.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.14.0)

## 新機能

### Agentic Loop による Structured Output ([#943](https://github.com/strands-agents/sdk-python/pull/943))

**この機能でできること:**
- Agent が JSON Schema や Pydantic モデルに対してレスポンスを検証し、定義済みスキーマに準拠した構造化出力を返せるようになりました。検証はレスポンス生成時に行われ、不適合な出力には設定可能なリトライ動作が適用されます。

**使用例:**

```python
from strands import Agent
from pydantic import BaseModel

class PersonInfo(BaseModel):
    """人物情報モデル"""
    name: str
    age: int
    occupation: str

# Agent 呼び出し時に structured_output_model を指定
agent = Agent()
result = agent(
    "John Smith is a 30 year-old software engineer",
    structured_output_model=PersonInfo
)

# 構造化出力にアクセス
person_info: PersonInfo = result.structured_output
print(person_info)  # PersonInfo(name='John Smith', age=30, occupation='software engineer')

# Agent 初期化時に structured_output_model を指定することも可能
agent = Agent(structured_output_model=PersonInfo)
result = agent("Create a profile for Jane Doe who is a 25 year old dentist")
person_info: PersonInfo = result.structured_output
print(person_info)  # PersonInfo(name='Jane Doe', age=25, occupation='dentist')
```

**ポイント:**
- Tool ベースのシステムで自動リトライロジックが組み込まれています
- Agent クラスと `__call__` メソッドの両方で `structured_output_model` パラメータをサポート
- Pydantic によるフル型安全性とバリデーション機能を提供
- 既存のツールエコシステムとの後方互換性を維持

---

### Interrupts による Human-in-the-loop サポート ([#1070](https://github.com/strands-agents/sdk-python/pull/1070))

**この機能でできること:**
- Interrupts が Strands で Human-in-the-loop パターンのファーストクラスサポートを提供します。Hook やツール定義で直接 Interrupt を発生させることができます。また、MCP elicitation が MCPClient で公開されました。

**使用例:**

```python
import json
from typing import Any

from strands import Agent, tool
from strands.hooks import BeforeToolCallEvent, HookProvider, HookRegistry

from my_project import delete_files, inspect_files

class ApprovalHook(HookProvider):
    def __init__(self, app_name: str) -> None:
        self.app_name = app_name

    def register_hooks(self, registry: HookRegistry, **kwargs: Any) -> None:
        registry.add_callback(BeforeToolCallEvent, self.approve)

    def approve(self, event: BeforeToolCallEvent) -> None:
        if event.tool_use["name"] != "delete_files":
            return

        approval = event.interrupt(
            f"{self.app_name}-approval",
            reason={"paths": event.tool_use["input"]["paths"]}
        )
        if approval.lower() != "y":
            event.cancel_tool = "User denied permission to delete files"


agent = Agent(
    hooks=[ApprovalHook("myapp")],
    system_prompt="You delete files older than 5 days",
    tools=[delete_files, inspect_files],
)

paths = ["a/b/c.txt", "d/e/f.txt"]
result = agent(f"paths=<{paths}>")

while True:
    if result.stop_reason != "interrupt":
        break

    responses = []
    for interrupt in result.interrupts:
        if interrupt.name == "myapp-approval":
            user_input = input(f"Do you want to delete {interrupt.reason['paths']} (y/N): ")
            responses.append({
                "interruptResponse": {
                    "interruptId": interrupt.id,
                    "response": user_input
                }
            })

    result = agent(responses)
```

**ポイント:**
- Hook やツール定義で直接 Interrupt を発生させることができます
- ユーザー承認が必要な操作をインタラクティブに制御できます
- MCP elicitation が MCPClient で公開され、高度な統合が可能になりました

---

### MCP 接続のマネージド化 ([#895](https://github.com/strands-agents/sdk-python/pull/895))

**この機能でできること:**
- ToolProvider を介した MCP 接続のマネージド化により、コンテキストマネージャーを使用する必要性が解消されました。Agent が接続ライフサイクルを自動的に管理するため、よりシンプルな構文が可能になります。

**使用例:**

```python
from mcp import stdio_client, StdioServerParameters
from strands import Agent
from strands.tools.mcp import MCPClient

# シンプルな構文で MCP クライアントを使用
stdio_mcp_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(command="python", args=["server.py"]))
)

# Agent が自動的に接続ライフサイクルを管理
agent = Agent(tools=[stdio_mcp_client])
agent("do something")

# ツールフィルタリングと名前の曖昧性解消もサポート
mcp_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(...))
)

# MCPClient は ToolProvider を実装
agent = Agent(tools=[mcp_client])
```

**ポイント:**
- この機能は実験的 (experimental) ですが、安定版として間もなくマークされる予定です
- コンテキストマネージャーの手動管理が不要になります
- ツールフィルタリングと名前の曖昧性解消機能を提供
- Agent が自動的にクリーンアップを処理します

---

### Agent Config による設定ファイルサポート ([#935](https://github.com/strands-agents/sdk-python/pull/935))

**この機能でできること:**
- 設定ファイルまたは辞書を使用して Agent を定義・作成できるようになりました。これにより、Agent の共有や設定ベースの Agent 管理が容易になります。

**使用例:**

```python
from strands.experimental import config_to_agent, AgentConfig

# 辞書から Agent を作成
agent = config_to_agent(
    {
        "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        "prompt": "You are a coding assistant. Help users write, debug, and improve their code.",
        "tools": ["strands_tools.file_read", "strands_tools.editor", "strands_tools.shell"]
    },
    description="My custom description"
)

# ファイルから設定を読み込むことも可能
config = AgentConfig("file://path/to/local/config.json")
agent = config.to_agent()
```

**設定ファイルの例:**

```json
{
  "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  "prompt": "You are a coding assistant. Help users write, debug, and improve their code. You have access to file operations and can execute shell commands when needed.",
  "tools": ["strands_tools.file_read", "strands_tools.editor", "strands_tools.shell"]
}
```

**ポイント:**
- デフォルトで使用可能なツール: file_read、editor、http_request、use_agent、shell
- 設定から Agent への変換時に追加の kwargs を渡すことができます
- 将来的には Strands のより多くの機能がこの設定形式でサポートされる予定です

---

### MCP Elicitation サポート ([#1094](https://github.com/strands-agents/sdk-python/pull/1094))

**この機能でできること:**
- MCPClient で elicitation コールバックを渡せるようになり、MCP サーバーからのユーザー入力要求に対応できるようになりました。

**使用例:**

```python
from mcp import stdio_client, StdioServerParameters
from mcp.types import ElicitResult

from strands import Agent
from strands.tools.mcp import MCPClient

async def elicitation_callback(context, params):
    """Elicitation リクエストを処理"""
    print(f"ELICITATION: {params.message}")

    return ElicitResult(
        action="accept",  # または "decline"
        content={"username": "user123"}
    )

client = MCPClient(
    lambda: stdio_client(
        StdioServerParameters(command="python", args=["/path/to/server.py"])
    ),
    elicitation_callback=elicitation_callback,
)

with client:
    agent = Agent(tools=client.list_tools_sync())
    result = agent("Delete 'a/b/c.txt' and share the name of the approver")
    print(result.message)
```

**ポイント:**
- MCP 仕様の elicitation 機能をサポート
- 非同期コールバックで elicitation リクエストを処理
- MCP サーバーとの接続が開いている間、永続的な接続を維持します

---

### LiteLLM で Structured Output のハンドリング強化 ([#1021](https://github.com/strands-agents/sdk-python/pull/1021))

**この機能でできること:**
- LiteLLM を使用する際の Structured Output ハンドリングが強化され、より堅牢なスキーマ検証とエラーハンドリングが提供されます。

**ポイント:**
- LiteLLM モデルプロバイダーでの Structured Output サポートを改善
- スキーマ検証とエラーハンドリングの堅牢性を向上

---

## バグ修正

### テレメトリのスパン種別を INTERNAL に修正 ([#1055](https://github.com/strands-agents/sdk-python/pull/1055))
- Strands Agent の invoke_agent スパンを INTERNAL spanKind にすることで、テレメトリトレースの整合性を向上させました。

### ToolUse がない場合のエラー回避 ([#1087](https://github.com/strands-agents/sdk-python/pull/1087))
- tool_uses が空の場合に発生していたエラーを修正し、より堅牢なエラーハンドリングを実装しました。

### Bedrock の throttlingexception の様々なケースでのリトライ対応 ([#1096](https://github.com/strands-agents/sdk-python/pull/1096))
- Bedrock の様々な throttlingexception ケースでリトライ処理が正しく動作するように修正しました。

### ダイレクトツール呼び出し時の Interrupt 制約 ([#1097](https://github.com/strands-agents/sdk-python/pull/1097))
- ダイレクトツール呼び出し時に Interrupt が許可されないように制約を追加しました。

### 無効なツール使用の送信時変換 ([#1091](https://github.com/strands-agents/sdk-python/pull/1091))
- 無効なツール使用を検出時ではなく送信時に変換することで、エラーハンドリングを改善しました。

---

## まとめ

v1.14.0 は、Structured Output、Interrupts、MCP 接続の自動管理、Agent Config など、開発者体験と Agent の機能性を大幅に向上させる主要機能を追加した重要なリリースです。これらの機能により、より柔軟で堅牢な Agent システムの構築が可能になります。
