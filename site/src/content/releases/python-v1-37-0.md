---
title: "Strands Python SDK v1.37.0 リリース解説"
version: "v1.37.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-04-22
summary: "experimental モジュールに Checkpoint 機能が追加され、モデル設定に context_window_limit が追加されました。また、ツール多用時の会話トリミングと MCP クライアントのクリーンアップに関するバグが修正されています。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.37.0"
---

## 概要

このリリースでは、耐久性のあるエージェント実行を実現する Checkpoint 機能が experimental モジュールに追加されました。また、モデル設定に `context_window_limit` プロパティが追加され、プロアクティブなコンテキスト圧縮が可能になります。バグ修正として、ツールを多用する会話でのトリミング問題と Python 3.14+ での MCP クライアントのクリーンアップ時エラーが解消されています。

**リリース:** [v1.37.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.37.0)

## 新機能

### Checkpoint 機能の追加（experimental）([#2181](https://github.com/strands-agents/sdk-python/pull/2181))

**この機能でできること:**
- エージェントループの特定のポイントで状態を保存し、障害発生時に復元できるようになります。Temporal などの耐久性プロバイダーと組み合わせることで、クラッシュに強いエージェントワークフローを構築できます。

**使用例:**

```python
from strands.experimental.checkpoint import Checkpoint, CheckpointPosition, CHECKPOINT_SCHEMA_VERSION

# Checkpoint の作成
checkpoint = Checkpoint(
    position="after_model",  # "after_model" または "after_tools"
    cycle_index=0,  # ReAct ループのサイクルインデックス（0始まり）
    snapshot={},  # エージェント状態のシリアライズされた辞書
    app_data={  # アプリケーション固有のメタデータ（任意）
        "workflow_id": "wf-123",
        "session_context": {"user_id": "user-456"}
    }
)

# シリアライズ（永続化用）
checkpoint_dict = checkpoint.to_dict()

# デシリアライズ（復元用）
restored = Checkpoint.from_dict(checkpoint_dict)
```

**ポイント:**
- `position` は 2 種類: `"after_model"`（モデル呼び出し完了後、ツール実行前）と `"after_tools"`（全ツール実行完了後、次のモデル呼び出し前）
- スキーマバージョンの不一致時は `ValueError` が発生し、互換性のないチェックポイントからの復元を防止
- これは PR 1 of 2 で、型とテストのみの追加。実際のエージェント統合（`checkpointing=True` フラグ、`checkpointResume` コンテンツブロックなど）は後続の PR で追加予定

---

### モデル設定に context_window_limit を追加 ([#2176](https://github.com/strands-agents/sdk-python/pull/2176))

**この機能でできること:**
- モデルの最大トークン容量（入出力共有）を設定できるようになります。これにより、モデルがリクエストを拒否する前に、会話マネージャーがプロアクティブにコンテキスト圧縮を行えるようになります。

**使用例:**

```python
from strands import Agent
from strands.models import BedrockModel

# context_window_limit を指定してモデルを設定
model = BedrockModel(
    model_id="anthropic.claude-sonnet-4-20250514-v1:0",
    context_window_limit=200000  # モデルの最大トークン容量を指定
)

agent = Agent(model=model)
```

**ポイント:**
- すべてのモデルプロバイダー（Bedrock、Anthropic、OpenAI、Gemini、LiteLLM、Ollama、Mistral など）で利用可能
- モデル ID から自動的にこの値を設定するルックアップテーブルは、後続のリリースで追加予定
- プロアクティブなコンテキスト圧縮機能と組み合わせて使用することで、コンテキストウィンドウオーバーフローを事前に防止可能

---

## バグ修正

### ツール多用時の会話トリミングにフォールバックを追加 ([#2174](https://github.com/strands-agents/sdk-python/pull/2174))

- **問題:** ツールを多用するエージェントループで、最初のプロンプト以降のすべてのユーザーメッセージが `toolResult` を含む場合、有効なトリムポイントが見つからず `ContextWindowOverflowException` が発生していました
- **修正:** プレーンなユーザーメッセージがトリム範囲内に存在しない場合、`assistant(toolUse)` + `user(toolResult)` の境界にフォールバックしてトリミングを行うようになりました
- **影響:** 以前は正常にトリミングできていたツール多用の会話が、再び正常に動作するようになります

---

### MCP クライアントのインタープリター終了時クリーンアップをスキップ ([#2144](https://github.com/strands-agents/sdk-python/pull/2144))

- **問題:** Python 3.14+ で、インタープリター終了時に `threading.Thread.join()` が `PythonFinalizationError` を発生させ、エージェントのレスポンスが正常に完了していても誤解を招くトレースバックが stderr に出力されていました
- **修正:** `MCPClient.stop()` で `sys.is_finalizing()` をチェックし、終了時はクリーンアップパスをスキップするようになりました
- **影響:** MCP ツールプロバイダーを使用するエージェントで、複数の MCP ツール呼び出し後にインタープリターが終了する際の不要なエラーメッセージが解消されます

---

## まとめ

このリリースでは、将来のチェックポイント/リジューム機能の基盤となる Checkpoint データクラスが experimental モジュールに追加され、プロアクティブなコンテキスト管理のための `context_window_limit` 設定が全モデルプロバイダーで利用可能になりました。ツール多用時のトリミングと Python 3.14+ での MCP クリーンアップの問題も修正されています。
