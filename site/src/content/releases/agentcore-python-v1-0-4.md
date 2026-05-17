---
title: "AgentCore Python SDK v1.0.4 リリース解説"
version: "v1.0.4"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2025-10-22
summary: "Starlette Middleware のサポートを追加し、非同期 LLM コールバックに対応しました。メモリセッションマネージャーで async/await パターンを使用できるようになり、より柔軟なアプリケーション構築が可能になりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.4"
---

## 概要

このリリースでは、Starlette Middleware のサポートと非同期 LLM コールバック機能が追加されました。これにより、ランタイムアプリケーションの柔軟性が向上し、メモリセッションマネージャーで async/await パターンを使用できるようになりました。既存の同期コールバックとの完全な後方互換性も維持されています。

**リリース:** [v1.0.4](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.4)

## 新機能

### Middleware サポートの追加 ([#121](https://github.com/aws/bedrock-agentcore-sdk-python/pull/121))

**この機能でできること:**
- Starlette Middleware を Bedrock AgentCore のランタイムアプリケーションに追加できるようになりました。これにより、認証、ログ、CORS など、ミドルウェアを使用したカスタム処理をアプリケーションに追加できます。

**使用例:**

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from starlette.middleware.cors import CORSMiddleware

# アプリケーションの作成
app = BedrockAgentCoreApp()

# ミドルウェアの追加
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**ポイント:**
- Starlette の標準的なミドルウェア API を使用できるため、既存のミドルウェアをそのまま利用可能です
- カスタムミドルウェアを作成して、アプリケーション固有の処理を追加することもできます

---

### 非同期 LLM コールバックのサポート ([#131](https://github.com/aws/bedrock-agentcore-sdk-python/pull/131))

**この機能でできること:**
- メモリセッションマネージャーで非同期 LLM コールバックを使用できるようになりました。`process_turn_with_llm_async()` メソッドが追加され、`Awaitable[str]` を返す非同期コールバック関数をサポートします。

**使用例:**

```python
import asyncio
from bedrock_agentcore.memory import MemorySessionManager

# 非同期 LLM コールバックの定義
async def async_llm_callback(messages, retrieval_config):
    # 非同期で LLM を呼び出す処理
    response = await call_llm_async(messages)
    return response

# 非同期でセッションを処理
async def process_conversation():
    manager = MemorySessionManager(...)

    response = await manager.process_turn_with_llm_async(
        actor_id="user-123",
        session_id="session-456",
        user_input="こんにちは",
        llm_callback=async_llm_callback,
        retrieval_config=config
    )

    return response

# 実行
asyncio.run(process_conversation())
```

**ポイント:**
- 既存の同期 `process_turn_with_llm()` メソッドとの完全な後方互換性があります
- 非同期処理により、複数のリクエストを効率的に処理できます
- 内部的に共通のヘルパーメソッド（`_retrieve_memories_for_llm()` と `_save_conversation_turn()`）を使用してコードの重複を削減しています

---

## バグ修正

### メモリモジュールの Linter 問題の修正 ([#132](https://github.com/aws/bedrock-agentcore-sdk-python/pull/132))

- メモリセッションモジュールのコーディングスタイルの問題を修正し、Linter の警告を解消しました
- コードの品質と保守性が向上しています

## まとめ

このリリースでは、Middleware サポートと非同期 LLM コールバック機能の追加により、より柔軟で効率的なアプリケーション開発が可能になりました。既存のコードとの互換性を保ちながら、モダンな Python の async/await パターンを活用できます。

---
