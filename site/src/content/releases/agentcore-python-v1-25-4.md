---
title: "AgentCore Python SDK v1.25.4 リリース解説"
version: "v1.25.4"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-11-06
summary: "Strands 統合における Guardrail のレダクション処理のバグが修正されました。大きなメッセージや、バッチ処理中にフラッシュされたメッセージで redaction が反映されないケースに対応しています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.4"
---

## 概要

このリリースでは、Strands 統合における Guardrail のレダクション処理に関する重要なバグ修正が含まれています。これまで、大きなメッセージがブロブとして保存されたり、バッチング中にフラッシュされたメッセージについて、Guardrail によるレダクションが AgentCore Memory 側に反映されず、元のメッセージが残ってしまうケースがありました。

**リリース:** [v1.25.4](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.4)

## バグ修正

### Guardrail のレダクションを確実に保持 ([#735](https://github.com/aws/bedrock-agentcore-sdk-python/pull/735))

**修正内容:**

Strands 統合の `AgentCoreMemorySessionManager` において、Guardrail によるメッセージの redaction が AgentCore Memory に正しく反映されないケースがあり、元のメッセージが残存してしまう問題が修正されました。

**影響を受けていた状況:**

- 大きなメッセージがブロブ (blob) として保存されるケース
- バッチング処理中にフラッシュされたメッセージに対するレダクション
- Guardrails の判定を待っているメッセージが、他のメッセージと一緒にフラッシュされてしまうケース
- フラッシュに失敗した場合に、メッセージの順序が崩れるケース

**主な修正ポイント:**

- **ブロブイベントからのイベント ID 取得**: 永続化されたメッセージをレダクション済みバージョンに正しく置換できるようになりました
- **バッファ内メッセージのマッチング修正**: redaction が意図した対象メッセージに正しく適用されるよう改善
- **フラッシュ時に最新メッセージをバッファに保持**: Guardrails の判定を待っている最新メッセージはバッファに残し、古いメッセージのみを送信、呼び出し完了時に最新メッセージを送信します
- **フラッシュ失敗時のメッセージ順序の保持**: フラッシュが失敗してもメッセージ順序が維持されます
- **Deferred agent snapshot のバッチサイズ対応**: API の最大アイテム数制約（100 件）に合わせて、グループ化して送信されるようになりました

**ポイント:**

- Strands + AgentCore Memory + Guardrails の構成を使用している場合は、本バージョンへのアップデートを推奨します
- 特に、長いメッセージや高頻度の会話を扱うエージェントでは、本修正によってコンプライアンス上重要な redaction が確実に反映されるようになります
- アプリケーションコード側での変更は不要で、依存バージョンを更新するだけで修正が適用されます

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands.session_manager import (
    AgentCoreMemorySessionManager,
)

# Strands + AgentCore Memory の統合利用例
# 本リリースにより、Guardrails によるメッセージの redaction が
# 大きなメッセージやバッチフラッシュ時にも確実に反映されるようになる
session_manager = AgentCoreMemorySessionManager(
    memory_id="your-memory-id",
    region_name="us-west-2",
)

# エージェント実行時、Guardrails がトリガーされたメッセージは
# AgentCore Memory 側でもレダクション済みの内容で永続化される
```

## まとめ

Strands 統合における Guardrails レダクション処理のバグ修正を中心としたリリースです。コンプライアンスやデータ保護の観点で重要な修正のため、該当構成を利用しているユーザーは早めのアップデートを推奨します。
