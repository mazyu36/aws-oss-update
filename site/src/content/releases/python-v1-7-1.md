---
title: "sdk-python v1.7.1"
version: "v1.7.1"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-09-05
summary: "非同期ジェネレータツールのサポートを追加し、Bedrock モデルプロバイダの互換性を向上させるバグ修正を含むリリース。ツールストリーミング機能により、ツールからリアルタイムでイベントを受け取ることが可能になりました。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.7.1"
---

## 概要

このリリースでは、ツールストリーミング機能を実現する非同期ジェネレータツールのサポートが追加されました。また、AWS Bedrock モデルプロバイダにおける複数の互換性問題が修正され、Claude 3 以外のモデルや古いバージョンの boto3 ライブラリとの統合が改善されました。

**リリース:** [v1.7.1](https://github.com/strands-agents/sdk-python/releases/tag/v1.7.1)

## 新機能

### 非同期ジェネレータツールのサポート ([#788](https://github.com/strands-agents/sdk-python/pull/788))

**この機能でできること:**
ツールが async generator として定義できるようになり、処理中に中間結果をストリーミングできます。これにより、長時間実行されるツールからリアルタイムでフィードバックを受け取ることが可能になります。

**使用例:**

```python
import strands
from strands import Agent

# ストリーミング可能なツールの定義
@strands.tool
async def streaming_search():
    """検索を実行し、進捗状況をストリーミングします"""
    yield {"status": "検索を開始しています..."}
    yield {"progress": 50, "message": "データベースを検索中..."}
    yield {"progress": 100, "message": "検索完了"}
    return "検索結果: 3件のドキュメントが見つかりました"

# エージェントの設定
agent = Agent(
    model="claude-3-5-sonnet-20241022",
    tools=[streaming_search]
)

# イベントのハンドリング
def event_handler(event: dict):
    if "tool_stream_event" in event:
        tool_use = event["tool_stream_event"]["tool_use"]
        data = event["tool_stream_event"]["data"]
        print(f"ツールからのストリーム: {data}")

# エージェントの実行
for event in agent.stream("最新のドキュメントを検索してください"):
    event_handler(event)
```

**ポイント:**
- ツールは `async def` で定義し、`yield` を使用して中間結果をストリーミングします
- 最後の `return` 値がツールの最終結果として LLM に渡されます
- `tool_stream_event` イベントをリスニングすることで、ストリーミングデータを受け取れます
- 通常の非ジェネレータツールは `ToolStreamEvent` を発行しないため、既存の動作に影響しません

---

## バグ修正

### 非ジェネレータ関数の ToolStream イベント発行を停止 ([#773](https://github.com/strands-agents/sdk-python/pull/773))
- 非ジェネレータツールが不要な `ToolStreamEvent` を発行していた問題を修正
- ツールが実際にジェネレータである場合のみストリーミングイベントを発行するように変更
- SDK 内部のツール実装で型付きイベントを直接発行できるように特別な処理を追加

### Bedrock の非 Claude 3 モデルで status フィールドを削除 ([#686](https://github.com/strands-agents/sdk-python/pull/686))
- AWS Bedrock で Claude 3 以外のモデル（Writer Palmyra など）を使用した際にエラーが発生していた問題を修正
- `toolResult` ブロックの `status` フィールドは Claude 3 モデルでのみサポートされているため、他のモデルでは除外するように変更
- Bedrock の公式ドキュメントに準拠した実装に改善

### Bedrock レスポンスから SDK_UNKNOWN_MEMBER をフィルタリング ([#798](https://github.com/strands-agents/sdk-python/pull/798))
- 古いバージョンの boto3 を使用している場合に `SDK_UNKNOWN_MEMBER` がレスポンスコンテンツに含まれていた問題を修正
- レスポンスの処理時に `SDK_UNKNOWN_MEMBER` を自動的にフィルタリングするように改善
- boto3 のバージョンに関わらず一貫した動作を保証

### reasoning ブロックへの署名追加条件を修正 ([#806](https://github.com/strands-agents/sdk-python/pull/806))
- すべての reasoning コンテンツに空の署名が追加されていた問題を修正
- 署名を提供しないプロバイダ（openai.gpt-oss-120b-1:0 など）との互換性が向上
- 署名が実際に提供されている場合のみ reasoning ブロックに追加するように変更

## まとめ

このリリースは、ツールストリーミング機能という重要な新機能を追加し、AWS Bedrock との統合における複数の互換性問題を解決しました。これにより、より幅広いモデルプロバイダとライブラリバージョンで安定した動作が保証されます。
