---
title: "bedrock-agentcore-sdk-python v1.1.2"
version: "v1.1.2"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-12-26
summary: "WebSocket 接続に session_id サポートが追加され、Converse API の互換性問題と依存関係の問題が修正されました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.2"
---

## 概要

このリリースでは、WebSocket 接続メソッドに session_id サポートが追加され、セッション追跡機能が強化されました。また、空のテキストメッセージが Converse API でエラーを引き起こす問題と、不要な pre-commit 依存関係の問題が修正されました。

**リリース:** [v1.1.2](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.2)

## 新機能

### WebSocket 接続メソッドに session_id サポートを追加 ([#186](https://github.com/aws/bedrock-agentcore-sdk-python/pull/186))

**この機能でできること:**
- WebSocket 接続で session_id を指定することで、適切なセッション追跡が可能になります。`generate_ws_connection` と `generate_presigned_url` の両方のメソッドで session_id パラメータがサポートされています。

**使用例:**

```python
from bedrock_agentcore.runtime import AgentCoreRuntimeClient

# クライアントの初期化
client = AgentCoreRuntimeClient()

# WebSocket 接続の生成（session_id を指定）
websocket_connection = client.generate_ws_connection(
    agent_id="your-agent-id",
    session_id="your-session-id"
)

# または、署名付き URL の生成（session_id を指定）
presigned_url = client.generate_presigned_url(
    agent_id="your-agent-id",
    session_id="your-session-id"
)
```

**ポイント:**
- `generate_ws_connection` メソッドでは、session_id が `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` ヘッダーに設定されます
- `generate_presigned_url` メソッドでは、session_id がクエリパラメータとして追加されます
- User-Agent が `AgentCoreRuntimeClient/1.0` に更新されました

## バグ修正

### 空のテキストメッセージを保存しない ([#185](https://github.com/aws/bedrock-agentcore-sdk-python/pull/185))

空のテキストを含むメッセージが保存されると、Converse API で `ValidationException` エラーが発生し、会話が中断される問題が修正されました。この修正により、テキストが空の ContentBlock は保存されず、エージェントが正常に動作し続けます。

**影響を受けていた状況:**
- Strands メモリ統合を使用していて、空のテキストメッセージが保存される場合
- Converse API の検証エラー: "The text field in the ContentBlock object at messages.X.content.Y is blank"

### 依存関係から pre-commit を削除 ([#195](https://github.com/aws/bedrock-agentcore-sdk-python/pull/195))

開発用の依存関係である pre-commit がプロダクション依存関係に含まれていた問題が修正されました。この修正により、不要な依存関係がインストールされなくなり、パッケージサイズが削減されます。

## まとめ

v1.1.2 では、WebSocket 接続のセッション追跡機能が強化され、Converse API との互換性が向上しました。また、依存関係の最適化により、より軽量なパッケージとなりました。
