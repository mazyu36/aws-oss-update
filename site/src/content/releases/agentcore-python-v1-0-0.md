---
title: "bedrock-agentcore-sdk-python v1.0.0"
version: "v1.0.0"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-10-15
summary: "Bedrock AgentCore SDK Python の最初の安定版リリース。BrowserClient へのビューポート設定サポート追加、セッションメモリ機能の改善、依存関係の最適化が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.0"
---

## 概要

このリリースは、Bedrock AgentCore SDK Python の最初の安定版（v1.0.0）です。BrowserClient にビューポート設定のサポートが追加され、セッションメモリ機能の複数のバグ修正、依存関係の最適化が行われました。

**リリース:** [v1.0.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.0)

## 新機能

### BrowserClient へのビューポート設定サポート追加 ([#112](https://github.com/aws/bedrock-agentcore-sdk-python/pull/112))

**この機能でできること:**
- BrowserClient でブラウザセッションを開始する際に、ビューポート（表示領域）のサイズを指定できるようになりました。これにより、特定の画面サイズでのウェブページの表示や操作をテストする際に便利です。

**使用例:**

```python
from bedrock_agentcore.tools import BrowserClient

# BrowserClient インスタンスの作成
browser_client = BrowserClient(
    session_id="your-session-id",
    bedrock_agent_runtime_client=your_bedrock_client
)

# ビューポートサイズを指定してブラウザセッションを開始
browser_client.start(
    viewport={
        "width": 1920,
        "height": 1080
    }
)

# ウェブページへのナビゲーション
browser_client.navigate(url="https://example.com")
```

**ポイント:**
- viewport パラメータは省略可能で、指定しない場合はデフォルトのサイズが使用されます
- StartBrowserSession API を通じてビューポートサイズが適切に設定されます

## バグ修正

### get_last_k_turns のセッション名のタイポ修正 ([#104](https://github.com/aws/bedrock-agentcore-sdk-python/pull/104))
- セッションメモリの `get_last_k_turns` メソッド内で、セッション名の変数名にタイポがあり修正されました
- この問題により、特定の状況下でセッション名が正しく処理されない可能性がありました

### get_last_k_turns メソッドに include_parent_events パラメータを追加 ([#107](https://github.com/aws/bedrock-agentcore-sdk-python/pull/107))
- `get_last_k_turns` メソッドに `include_parent_events` パラメータが追加されました
- このパラメータにより、親イベントを含めるかどうかを制御できるようになり、より柔軟なイベント取得が可能になりました

### パラメータ名を include_parent_branches に変更 ([#108](https://github.com/aws/bedrock-agentcore-sdk-python/pull/108))
- `list_events` メソッドのパラメータ名を `include_parent_events` から `include_parent_branches` に変更しました
- この変更により、boto3 の対応するパラメータ名と一致し、一貫性が向上しました

### Pydantic のバージョン制限 ([#115](https://github.com/aws/bedrock-agentcore-sdk-python/pull/115))
- Pydantic のバージョンを 2.41.3 未満に制限しました
- これにより、uv でのビルド時に発生する圧縮解凍エラー（`deflate decompression error: repeated call with bad state`）を回避します

## まとめ

v1.0.0 は、Bedrock AgentCore SDK Python の最初の安定版リリースとして、ブラウザツールの機能強化とセッションメモリの安定性向上を実現しました。
