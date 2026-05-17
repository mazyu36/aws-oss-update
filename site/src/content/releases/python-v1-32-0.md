---
title: "Strands Python SDK v1.32.0 リリース解説"
version: "v1.32.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-03-20
summary: "イベントループのサイクルメトリクス修正、Mistral 依存関係の互換性修正、ストリーミング時の toolUse ブロック処理修正など、3 つの重要なバグ修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.32.0"
---

## 概要

このリリースでは、イベントループのサイクルメトリクスが正確に記録されない問題、Mistral SDK 2.0 との互換性問題、およびストリーミング時にツール呼び出しがスキップされる問題が修正されています。特にマルチサイクルのエージェント呼び出しや Bedrock 上の Sonnet 4.x モデルを使用している場合に影響する重要な修正です。

**リリース:** [v1.32.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.32.0)

## バグ修正

### イベントループのサイクルメトリクス修正 ([#1903](https://github.com/strands-agents/sdk-python/pull/1903))
- 再帰呼び出しで終了するサイクルで `end_time` と `duration` が記録されなかった問題を修正
- これにより `total_duration` と `average_cycle_time` が不正確になっていた
- マルチサイクルの呼び出しでエージェントのパフォーマンス監視が困難だった問題が解消

**修正前:**
```json
{
  "total_cycles": 2,
  "total_duration": 2.97,
  "traces": [
    {
      "name": "Cycle 1",
      "end_time": null,
      "duration": null
    }
  ]
}
```

**修正後:**
```json
{
  "total_cycles": 2,
  "total_duration": 14.80,
  "traces": [
    {
      "name": "Cycle 1",
      "end_time": 1772825275.644092,
      "duration": 11.16
    }
  ]
}
```

---

### Mistral 依存関係の上限バージョンをピン留め ([#1935](https://github.com/strands-agents/sdk-python/pull/1935))
- `mistralai` SDK 2.0 がリリースされ、既存の Mistral モデルプロバイダーが動作しなくなる問題を修正
- 依存関係に上限バージョンを設定して互換性を確保
- Bedrock Bidi クライアントのバージョンも同様にピン留めし、今後の破壊的変更を防止

---

### ストリーミング時の toolUse ブロック処理を修正 ([#1827](https://github.com/strands-agents/sdk-python/pull/1827))
- 一部のモデル（例: Bedrock 上の Sonnet 4.x）が `toolUse` ブロックを含むレスポンスでも `end_turn` を stop reason として返す問題に対応
- ストリーミングモードでツール実行が完全にスキップされ、未実行のツール呼び出しでエージェントが早期終了してしまう問題を修正
- ストリーミング完了後、メッセージ内容に `toolUse` ブロックが含まれる場合は stop reason を `tool_use` に上書きするよう修正

## まとめ

v1.32.0 はメトリクスの精度向上、依存関係の互換性確保、ストリーミング時のツール実行の信頼性向上など、運用環境での安定性を高める重要なバグ修正を含むリリースです。
