---
title: "AgentCore Python SDK v1.16.0 リリース解説"
version: "v1.16.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-06-30
summary: "MemoryClient.create_event に extraction_mode パラメータが追加され、短期メモリに保存しつつ長期メモリの抽出をスキップできるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.16.0"
---

## 概要

このリリースでは、`MemoryClient.create_event()` に `extraction_mode` パラメータが追加され、イベントを短期メモリには保存しつつ長期メモリへの抽出をスキップできるようになりました。機密データを含む会話などを長期メモリの抽出対象から除外したい場合に有用です。

**リリース:** [v1.16.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.16.0)

## 新機能

### MemoryClient.create_event に extraction_mode パラメータを追加 ([#550](https://github.com/aws/bedrock-agentcore-sdk-python/pull/550))

**この機能でできること:**
- `MemoryClient.create_event()` に新しいオプションパラメータ `extraction_mode` が追加されました
- `"SKIP"` を指定すると、イベントは短期メモリに保存されますが、長期メモリへの抽出処理はスキップされます
- 機密データや長期的に記憶させたくない情報を扱う際に、意図的に抽出対象から除外できます

**使用例:**

```python
from bedrock_agentcore.memory import MemoryClient

client = MemoryClient()

# 通常のイベント作成（長期メモリへの抽出も行われる）
client.create_event(
    memory_id="mem-123",
    actor_id="user-123",
    session_id="session-456",
    messages=[("こんにちは、今日の予定を教えて", "USER")],
)

# extraction_mode="SKIP" を指定した場合
# → 短期メモリには保存されるが、長期メモリへの抽出はスキップされる
client.create_event(
    memory_id="mem-123",
    actor_id="user-123",
    session_id="session-456",
    messages=[("クレジットカード番号は 1234-5678-9012-3456", "USER")],
    extraction_mode="SKIP",  # 長期メモリへの抽出をスキップ
)
```

**ポイント:**
- `extraction_mode` はオプションパラメータで、指定しない場合は従来通り長期メモリの抽出が行われます
- `"SKIP"` を指定すると、内部的に API パラメータ `extractionMode` として渡され、長期メモリの抽出処理がスキップされます
- 機密情報を含むメッセージや、コンテキストとしては必要だが長期記憶に残す必要のない一時的な情報の管理に活用できます
- 短期メモリへの保存自体は行われるため、同一セッション内での会話継続には影響しません

## まとめ

このリリースでは、`MemoryClient.create_event()` に `extraction_mode` パラメータが追加され、長期メモリへの抽出をより細かく制御できるようになりました。機密データの扱いや、長期記憶が不要な一時的な会話の管理に活用できます。
