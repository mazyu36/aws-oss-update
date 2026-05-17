---
title: "Strands Python SDK v1.40.0 リリース解説"
version: "v1.40.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-05-14
summary: "プロアクティブなコンテキスト圧縮機能の追加、Bedrock の AccessDenied エラーキャッシュ、Swarm と OpenTelemetry 併用時の不具合修正など。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.40.0"
---

## 概要

このリリースでは、コンテキストウィンドウのオーバーフローを事前に防ぐプロアクティブな圧縮機能が追加されました。また、Bedrock の `CountTokens` API に対する `AccessDeniedException` のキャッシュや、Swarm マルチエージェントパターンで OpenTelemetry を使用する際のバグ修正も含まれています。

**リリース:** [v1.40.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.40.0)

---

## 新機能

### プロアクティブなコンテキスト圧縮 ([#2239](https://github.com/strands-agents/sdk-python/pull/2239))

**この機能でできること:**
- コンテキストウィンドウがオーバーフローする前に、事前にコンテキストを圧縮できるようになりました。従来はモデルが `ContextWindowOverflowException` を返してから圧縮していましたが、新機能では指定した閾値に達した時点で自動的に圧縮を実行します。

**使用例:**

```python
from strands.agent.conversation_manager import (
    SlidingWindowConversationManager,
    SummarizingConversationManager,
)

# スライディングウィンドウ方式: コンテキスト使用率が70%に達したら圧縮
manager = SlidingWindowConversationManager(
    window_size=50,
    compression_threshold=0.7,  # 0より大きく1以下の値を指定
)

# 要約方式: コンテキスト使用率が70%に達したら圧縮
manager = SummarizingConversationManager(
    compression_threshold=0.7,
)
```

**ポイント:**
- `compression_threshold` は 0 より大きく 1 以下の float 値を指定します（例: 0.7 = 70%）
- `compression_threshold` を指定しない場合は従来通りリアクティブな動作（オーバーフロー後に圧縮）となります
- カスタムの ConversationManager を実装している場合は、`reduce_on_threshold()` メソッドをオーバーライドすることでプロアクティブ圧縮に対応できます

---

### Bedrock CountTokens の AccessDenied エラーキャッシュ ([#2279](https://github.com/strands-agents/sdk-python/pull/2279))

**この機能でできること:**
- Bedrock の `CountTokens` API で `AccessDeniedException` が発生した場合、そのエラーをキャッシュして以降の API 呼び出しをスキップします。これにより、IAM 権限が不足している環境でも繰り返しの失敗を回避し、ヒューリスティックなトークン推定にフォールバックします。

**ポイント:**
- 最初の `AccessDeniedException` 発生時に警告ログが出力され、必要な IAM 権限（`bedrock:CountTokens`）が明示されます
- `ValidationException`（モデルが CountTokens をサポートしていない場合）と同様の「一度だけ試行」動作になります

---

## バグ修正

### Ollama の latencyMs メトリクスの戻り値型を修正 ([#2236](https://github.com/strands-agents/sdk-python/pull/2236))

- Ollama モデルプロバイダーの `latencyMs` メトリクスが float ではなく int を返すように修正されました
- 型定義との整合性が取れるようになりました

---

### use_native_token_count のデフォルト値を false に変更 ([#2284](https://github.com/strands-agents/sdk-python/pull/2284))

- すべてのモデルプロバイダー（Bedrock、Anthropic、Gemini、LlamaCpp、OpenAI Responses）で `use_native_token_count` のデフォルト値が `True` から `False` に変更されました
- v1.38.0 以降、イベントループはモデル呼び出しの前に `count_tokens()` を呼び出しますが、ネイティブトークンカウントが有効な場合、画像を含むマルチモーダルワークロードで 25-50% のレイテンシ増加が発生していました
- この変更により、ネイティブトークンカウントはオプトイン方式になりました

**使用例:**

```python
from strands.models import BedrockModel

# ネイティブトークンカウントを有効にする場合は明示的に指定
model = BedrockModel(
    model_id="anthropic.claude-sonnet-4-20250514-v1:0",
    use_native_token_count=True,  # 明示的に有効化
)
```

---

### Swarm + OpenTelemetry 使用時の「Failed to detach context」エラーを修正 ([#2281](https://github.com/strands-agents/sdk-python/pull/2281))

- Swarm マルチエージェントパターンで OpenTelemetry トレーシングを有効にした際に発生していた「Failed to detach context」エラーが修正されました
- 原因は `asyncio.wait_for()` が各 `__anext__()` 呼び出しで新しいコンテキストを作成し、OTEL スパントークンが正しくデタッチできなかったことでした
- Python 3.10 では、無応答の API からのレスポンスを待機中のノードは次のイベントが到着するまで中断されない制限がありますが、Python 3.11 以降ではこの問題は発生しません

---

## まとめ

プロアクティブなコンテキスト圧縮により、コンテキストウィンドウのオーバーフローを事前に防止できるようになりました。また、パフォーマンス改善として `use_native_token_count` のデフォルトが無効化され、マルチモーダルワークロードでのレイテンシが改善されています。
