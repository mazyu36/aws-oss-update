---
title: "sdk-python v1.26.0"
version: "v1.26.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-02-11
summary: "MCP Tasks のサポートが追加され、SummarizingConversationManager の再入ロック問題や Bedrock のコンテキストウィンドウオーバーフロー検出の問題が修正されました。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.26.0"
---

## 概要

このリリースでは、MCP（Model Context Protocol）の Tasks 機能のサポートが追加されました。また、SummarizingConversationManager の並行処理に関する問題や、Bedrock プロバイダーのコンテキストウィンドウオーバーフロー検出の問題が修正されています。

**リリース:** [v1.26.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.26.0)

## 新機能

### MCP Tasks のサポート ([#1475](https://github.com/strands-agents/sdk-python/pull/1475))

**この機能でできること:**
- MCP サーバーが提供する Tasks 機能を利用できるようになりました。Tasks は長時間実行されるツール呼び出しを非同期で処理するための MCP の仕組みです。

**使用例:**

```python
from strands import Agent
from strands.tools.mcp import MCPClient

# MCP クライアントを作成
mcp_client = MCPClient(
    server_command=["python", "task_server.py"],
    server_args=["--mode", "stdio"]
)

# MCP クライアントをツールとして使用
with mcp_client:
    agent = Agent(tools=[mcp_client])

    # Tasks 対応のツールを呼び出し
    response = agent("長時間かかる処理を実行してください")
```

**ポイント:**
- Tasks は両方の実行モード（同期・非同期）を統一的に処理するアダプターモデルで実装されています
- MCP サーバー側が Tasks をサポートしている必要があります

---

## バグ修正

### SummarizingConversationManager の再入ロック問題を修正 ([#1653](https://github.com/strands-agents/sdk-python/pull/1653))

- **問題:** `SummarizingConversationManager` を専用の `summarization_agent` なしで使用している場合、`ContextWindowOverflowException` 発生時に `ConcurrencyException: Agent is already processing a request` エラーでクラッシュしていました
- **原因:** サマリー生成時に同じエージェントインスタンスの `stream_async()` を再入呼び出ししていたため、非再入ロックがデッドロックを引き起こしていました
- **修正:** 専用エージェントが設定されていない場合、エージェント全体ではなく `model.stream()` を直接呼び出すように変更し、ロックの問題を回避しました

---

### Bedrock のコンテキストウィンドウオーバーフロー検出を改善 ([#1663](https://github.com/strands-agents/sdk-python/pull/1663))

- **問題:** Claude Opus 4.6 を Bedrock 経由で使用する際、コンテキストウィンドウ超過時に `prompt is too long` というエラーメッセージが返されますが、これが認識されず `ContextWindowOverflowException` ではなく生の `ClientError` が発生していました
- **影響:** エージェントの `reduce_context()` リカバリーメカニズムが動作せず、エラーで停止していました
- **修正:** `BEDROCK_CONTEXT_WINDOW_OVERFLOW_MESSAGES` に `"prompt is too long"` を追加し、正しく検出されるようになりました

---

### A2A Artifact の parts が空になる問題を修正 ([#1643](https://github.com/strands-agents/sdk-python/pull/1643))

- **問題:** マルチエージェント機能で、最終的な `TaskArtifactUpdateEvent` が `parts` データなしで送信されていました
- **影響:** A2A 仕様では `parts` に少なくとも 1 つの part が必要とされているため、仕様違反の状態でした
- **修正:** 空の `TextPart` を設定することで A2A 仕様に準拠するようになりました

---

## まとめ

MCP Tasks のサポートにより非同期ツール実行の選択肢が広がり、複数のバグ修正によって安定性が向上したリリースです。
