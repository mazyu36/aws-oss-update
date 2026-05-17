---
title: "Strands Python SDK v1.17.0 リリース解説"
version: "v1.17.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-11-18
summary: "MCP ツールのタイムアウト設定が可能になり、Swarm のハンドオフ動作やファイルデータ処理など複数のバグが修正されました。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.17.0"
---

## 概要

このリリースでは、MCP Agent Tool に対してカスタムタイムアウトを設定できる新機能が追加されました。また、Swarm のハンドオフタイミング、LiteLLM のストリームパラメータ検証、MetadataEvent のオプションフィールド処理、A2A プロトコルのファイルデータデコードに関する複数のバグ修正が含まれています。

**リリース:** [v1.17.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.17.0)

## 新機能

### MCP Agent Tool のタイムアウト設定 ([#1184](https://github.com/strands-agents/sdk-python/pull/1184))

**この機能でできること:**
MCP (Model Context Protocol) エージェントツールを作成する際に、カスタムタイムアウト値を設定できるようになりました。これにより、ツールの実行時間制限をより適切に制御でき、外部 MCP サーバーと連携する際の信頼性が向上します。

**使用例:**

```python
from datetime import timedelta
from strands.tools.mcp import MCPAgentTool
from strands import Agent

# 30秒のカスタムタイムアウトで MCP ツールを作成
mcp_tool = MCPAgentTool(
    server_params={
        "command": "uvx",
        "args": ["mcp-server-fetch"]
    },
    timeout=timedelta(seconds=30)
)

agent = Agent(tools=[mcp_tool])
```

**ポイント:**
- レスポンス時間が異なる MCP サーバーを扱う際に特に有効です
- ユースケースに応じてタイムアウト動作を細かく調整できます
- デフォルトのタイムアウト値を使用する場合は、timeout パラメータを省略できます

## バグ修正

### Swarm ハンドオフのタイミング修正 ([#1147](https://github.com/strands-agents/sdk-python/pull/1147))

Swarm のハンドオフ動作が修正され、現在のノードが実行を完了してからハンドオフ先のノードに切り替わるようになりました。以前は実行途中で切り替わっていたため、以下の問題が発生していました:
- `AfterNodeCallEvent` が不正確なノード ID で発行される
- ハンドオフツールと並行して中断されるツールがある場合、Swarm の状態が無効になる

この修正により、イベントの発行とSwarm の状態管理が正しく行われるようになりました。

### LiteLLM ストリームパラメータの検証 ([#1183](https://github.com/strands-agents/sdk-python/pull/1183))

`stream=False` が指定された場合に LiteLLM で TypeError が発生する問題が修正されました。SDK は、ストリーミングと非ストリーミングの両方のレスポンスを適切に処理し、明確なエラーメッセージを提供するようになりました。

### MetadataEvent のオプションフィールド処理 ([#1187](https://github.com/strands-agents/sdk-python/pull/1187))

カスタムモデル実装が MetadataEvent のオプションフィールド `usage` や `metrics` を省略した場合の処理が修正されました。SDK は適切なデフォルト値を提供するようになり、KeyError 例外を防ぎ、カスタムモデルプロバイダーに対してより柔軟性を提供します。

### A2A プロトコルのファイルデータデコード ([#1195](https://github.com/strands-agents/sdk-python/pull/1195))

A2A (Agent-to-Agent) エグゼキューターが A2A メッセージからファイルバイトを Strands エージェントに渡す前に、base64 デコードを適切に実行するように修正されました。以前は、エージェントが実際のバイナリファイルコンテンツではなく base64 エンコードされた文字列を受信していました。

## まとめ

v1.17.0 では、MCP ツールのタイムアウト設定機能が追加され、Swarm のハンドオフ、LiteLLM のストリーム処理、MetadataEvent の柔軟性、A2A プロトコルのファイル処理に関する重要なバグ修正が行われました。これらの改善により、SDK の信頼性と柔軟性が向上しています。
