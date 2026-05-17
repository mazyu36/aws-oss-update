---
title: "bedrock-agentcore-sdk-python v1.6.4"
version: "v1.6.4"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-04-23
summary: "Guardrail のリダクションサポート、extended thinking の変換修正、関連性スコアフィルタリングの修正、プリミティブクライアント向けユーティリティメソッドの追加が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.4"
---

## 概要

このリリースでは、AgentCore Memory と Strands の統合における重要なバグ修正が複数行われました。Guardrail のリダクション機能、extended thinking の変換処理、関連性スコアによるフィルタリングが修正されています。また、今後のプリミティブクライアント追加に向けたユーティリティメソッドが新たに追加されました。

**リリース:** [v1.6.4](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.4)

## 新機能

### プリミティブクライアント向けユーティリティメソッドの追加 ([#424](https://github.com/aws/bedrock-agentcore-sdk-python/pull/424))

**この機能でできること:**
- 今後追加されるプリミティブクライアントで使用されるユーティリティメソッドが追加されました。ポーリング処理や待機設定のための基盤となるモジュールです。

**追加されたモジュール:**

```python
from bedrock_agentcore._utils.config import WaitConfig
from bedrock_agentcore._utils.polling import wait_until, wait_until_deleted

# WaitConfig: 待機設定を定義するデータクラス
wait_config = WaitConfig(
    max_wait_time=300,  # 最大待機時間（秒）
    delay=5             # ポーリング間隔（秒）
)

# wait_until: 条件が満たされるまでポーリングを実行
# wait_until_deleted: リソースが削除されるまでポーリングを実行
```

**ポイント:**
- これらのユーティリティは `*_and_wait` メソッドで使用されます
- 内部ユーティリティとして提供されており、プリミティブクライアントの実装基盤となります

---

## バグ修正

### Guardrail リダクションサポートのための update_message() 実装 ([#388](https://github.com/aws/bedrock-agentcore-sdk-python/pull/388))

**問題:**
- `AgentCoreMemorySessionManager` で `update_message()` が no-op（何もしない）状態でした
- Bedrock Guardrails でブロックされたユーザーメッセージがリダクションされずに永続化されていました
- 結果として、後続のターンや再接続時に同じメッセージで再度ブロックされる問題がありました

**修正内容:**
- AgentCore Memory のイベントは不変のため、create-then-delete パターンで更新を実装
- `batch_size > 1` の場合は、フラッシュ前の送信バッファ内でメッセージを置換

```python
from bedrock_agentcore.memory.integrations.strands import AgentCoreMemorySessionManager

# Strands の redact_latest_message() が正しく動作するようになりました
session_manager = AgentCoreMemorySessionManager(
    memory_client=memory_client,
    session_id="session-123"
)

# Guardrail でブロックされたメッセージのリダクション処理が
# AgentCore Memory に正しく反映されます
```

---

### extended thinking の変換順序修正 ([#419](https://github.com/aws/bedrock-agentcore-sdk-python/pull/419))

**問題:**
- `_openai_to_bedrock()` で `reasoningContent` ブロックが text や toolUse の後に追加されていました
- Bedrock API は thinking ブロックが最初に来ることを要求するため、`ValidationException` が発生していました

**修正内容:**
- `reasoningContent` ブロックを最初に配置するように修正

```python
# 修正前: ValidationException が発生
# content_items = [text, toolUse, reasoningContent]

# 修正後: Bedrock API の要件に準拠
# content_items = [reasoningContent, text, toolUse]
```

**ポイント:**
- `OpenAIConverseConverter` を使用した extended thinking 付きの会話が正しく動作するようになりました
- `reasoningContent` がないメッセージには影響ありません

---

### 関連性スコアフィルタリングの修正 ([#415](https://github.com/aws/bedrock-agentcore-sdk-python/pull/415))

**問題:**
- `retrieve_customer_context` で `relevanceScore` フィールドを参照していましたが、実際の API レスポンスでは `score` フィールドでした
- フィールド名の不一致により、フォールバック値が常に使用され、すべてのメモリがフィルタを通過していました

**修正内容:**
- 正しいフィールド名 `score` を使用するように修正
- スコアがないレコードはデフォルト値 `0.0` で除外されるようになりました

```python
# 修正後: 正しいフィールド名でフィルタリング
memories = [
    m for m in memories 
    if m.get("score", 0.0) >= retrieval_config.relevance_score
]
```

**ポイント:**
- `relevance_score` の閾値設定が意図通りに機能するようになりました
- 関連性の低いメモリが正しく除外されます

## まとめ

このリリースでは、AgentCore Memory と Strands 統合における重要なバグ修正が行われ、Guardrail のリダクション、extended thinking、関連性フィルタリングが正しく動作するようになりました。
