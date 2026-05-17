---
title: "AgentCore Python SDK v1.3.2 リリース解説"
version: "v1.3.2"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-02-23
summary: "Claude 4.6+ モデルでの LTM 取得時の prefill エラー修正と、コンテキストタグのカスタマイズ機能を追加しました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.3.2"
---

## 概要

このリリースでは、Claude 4.6+ モデル（Opus 4.6、Sonnet 4.6）で `AgentCoreMemorySessionManager` を使用した際に発生していた prefill エラーを修正しました。また、取得したメモリを囲む XML タグ名をカスタマイズできる機能が追加されました。

**リリース:** [v1.3.2](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.3.2)

## 新機能

### コンテキストタグのカスタマイズ機能 ([#279](https://github.com/aws/bedrock-agentcore-sdk-python/pull/279))

**この機能でできること:**
- `AgentCoreMemoryConfig` に `context_tag` フィールドが追加され、LTM（Long-Term Memory）から取得したメモリを囲む XML タグ名をカスタマイズできるようになりました。デフォルトは `user_context` です。

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import (
    AgentCoreMemoryConfig,
    AgentCoreMemorySessionManager,
)

# デフォルトのタグ名（user_context）を使用
config = AgentCoreMemoryConfig(
    memory_id="my-memory-id",
    region="us-east-1",
)

# カスタムタグ名を指定
config_custom = AgentCoreMemoryConfig(
    memory_id="my-memory-id",
    region="us-east-1",
    context_tag="retrieved_memory",  # カスタムタグ名
)

session_manager = AgentCoreMemorySessionManager(config=config_custom)
```

**ポイント:**
- デフォルトは `user_context` なので、既存のコードは変更なしで動作します
- プロンプトエンジニアリングの観点から、用途に応じたタグ名を指定することでモデルの挙動を調整できます

## バグ修正

### Claude 4.6+ モデルでの LTM 取得時の prefill エラー修正 ([#271](https://github.com/aws/bedrock-agentcore-sdk-python/pull/271))

- **修正内容:** Claude 4.6+ モデル（Opus 4.6、Sonnet 4.6）で `AgentCoreMemorySessionManager` を使用して LTM を取得する際、assistant prefill エラー（`ValidationException: does not support assistant message prefill`）が発生する問題を修正しました
- **原因:** 取得したメモリが最後のユーザーメッセージの後に assistant メッセージとして追加されていたため、「会話はユーザーメッセージで終わる必要がある」という Claude 4.6 の制約に違反していました
- **修正後の動作:**
  - 取得したメモリは最後のユーザーメッセージの**前**に挿入されます
  - 会話の最初のメッセージの場合は、ユーザーメッセージ内にコンテンツブロックとして挿入されます（Bedrock の「会話はユーザーメッセージで始まる必要がある」制約を回避）

## まとめ

Claude 4.6+ モデルとの互換性が向上し、LTM を活用したエージェント開発がより安定しました。また、コンテキストタグのカスタマイズ機能により、より柔軟なプロンプト設計が可能になりました。
