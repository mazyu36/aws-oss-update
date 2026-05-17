---
title: "sdk-python v1.35.0"
version: "v1.35.0"
repository: "python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-04-08
summary: "Bedrock サービスティアのサポートが追加され、リクエストごとにレイテンシーとコストのトレードオフを制御できるようになりました。また、スライディングウィンドウの会話管理、MCP メタデータ転送、OpenTelemetry スパンのエラーステータスに関するバグ修正が含まれています。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.35.0"
---

## 概要

このリリースでは、Amazon Bedrock のサービスティア（Priority、Standard、Flex）をサポートする新機能が追加されました。また、スライディングウィンドウ会話管理の user-first 強制、MCP `_meta` フィールドの転送、ツールエラーの OpenTelemetry スパンへの正しい伝播など、重要なバグ修正が含まれています。

**リリース:** [v1.35.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.35.0)

## 新機能

### Bedrock サービスティアのサポート ([#1799](https://github.com/strands-agents/sdk-python/pull/1799))

**この機能でできること:**
- Amazon Bedrock のサービスティア（Priority、Standard、Flex）をリクエストごとに指定し、レイテンシーとコストのトレードオフを制御できます。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

# バッチ処理やコスト最適化に「flex」ティアを使用
model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
    service_tier="flex",  # コスト優先、レイテンシーは高め
)
agent = Agent(model=model)

# リアルタイムチャットなどレイテンシー重視のアプリケーションに「priority」ティアを使用
realtime_model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
    service_tier="priority",  # レイテンシー優先、コストは高め
)
realtime_agent = Agent(model=realtime_model)
```

**ポイント:**
- 有効な値は `"default"`、`"priority"`、`"flex"` の3つ
- 未設定の場合、フィールドはリクエストから省略され、Bedrock のデフォルト動作が適用される
- モデルやリージョンが指定されたティアをサポートしていない場合、Bedrock は `ValidationException` を返す
- **ユースケース:**
  - `"flex"`: バッチ処理、評価、マルチステップのエージェントワークフローなど、レイテンシーを許容できる場合
  - `"priority"`: カスタマー向けチャットアシスタントやリアルタイムインタラクションなど

---

## バグ修正

### スライディングウィンドウ会話管理の user-first 強制 ([#2087](https://github.com/strands-agents/sdk-python/pull/2087))

- **問題:** スライディングウィンドウがトリミング後にアシスタントメッセージで始まる会話を生成することがあり、Bedrock Nova など user-first を要求するプロバイダーで `ValidationException` が発生していた
- **修正内容:**
  - トリムポイントの検証で、最初の残存メッセージが `role == "user"` であることを確認するようになった
  - `toolUse` ガードのショートサーキット評価ロジックのバグも修正され、ウィンドウ境界で孤立した tool-use ブロックが通過する問題を解消

### MCP `_meta` フィールドの転送 ([#1918](https://github.com/strands-agents/sdk-python/pull/1918), [#2081](https://github.com/strands-agents/sdk-python/pull/2081))

- **問題:** `MCPClient` が `_meta` フィールドを `ClientSession.call_tool()` に転送せず、MCP 仕様に従ったカスタムメタデータがサーバーに到達しなかった。また、OTEL インストルメンテーションが `model_dump()` を使用していたため、`"_meta"` ではなく `"meta"` としてシリアライズされ、ペイロードが破損していた
- **修正内容:** `call_tool_sync` と `call_tool_async` にオプションの `meta` パラメータが追加され、MCP サーバーに正しく転送されるようになった

```python
# メタデータを MCP サーバーに転送
result = mcp_client.call_tool_sync(
    tool_use_id="id",
    name="my_tool",
    arguments={"key": "value"},
    meta={"com.example/request_id": "abc-123"}  # MCP サーバーに転送される
)
```

### ツール例外の OpenTelemetry スパンへの伝播 ([#2046](https://github.com/strands-agents/sdk-python/pull/2046))

- **問題:** ツールが例外を発生させた際、元の例外が `end_tool_call_span` に到達する前にドロップされ、すべてのツールスパンがエラー時でも `StatusCode.OK` になっていた
- **修正内容:** ツールエラーが正しく `StatusCode.ERROR` で伝播され、元の例外タイプとトレースバックが Langfuse などの可観測性バックエンドで保持されるようになった

### Anthropic ストリームの早期終了 ([#2047](https://github.com/strands-agents/sdk-python/pull/2047))

- **問題:** Anthropic プロバイダーで、ストリームが最終的な `message_stop` イベントの前に終了した場合、`.message` 属性を持たないイベントタイプで `event.message.usage` にアクセスしようとして `AttributeError` でクラッシュしていた
- **修正内容:** Anthropic SDK の `stream.get_final_message()` を使用して、受信したすべてのイベントから累積使用量を読み取り、早期終了と空のストリームを適切に処理するようになった

### Anthropic Pydantic 非推奨警告 ([#2044](https://github.com/strands-agents/sdk-python/pull/2044))

- `message_stop` イベントの処理を修正し、Pydantic の非推奨警告を回避するようになった

## まとめ

Bedrock サービスティアのサポートにより、ユースケースに応じたコストとレイテンシーの最適化が可能になりました。また、会話管理、MCP 連携、OpenTelemetry の可観測性に関する重要なバグ修正が含まれています。
