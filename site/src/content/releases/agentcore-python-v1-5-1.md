---
title: "AgentCore Python SDK v1.5.1 リリース解説"
version: "v1.5.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-03-31
summary: "プライバシー保護のため、OTEL span 属性へのユーザープロンプト・エージェント応答の自動出力を削除しました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.5.1"
---

## 概要

このリリースでは、顧客フィードバックに基づき、OTEL（OpenTelemetry）span 属性にユーザープロンプトとエージェント応答を自動的に出力する機能が削除されました。共有 span ストレージでの機密情報露出リスクを防ぐための変更です。

**リリース:** [v1.5.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.5.1)

## バグ修正

### OTEL span 属性への機密情報出力の削除 ([#380](https://github.com/aws/bedrock-agentcore-sdk-python/pull/380))

- デフォルトでユーザープロンプトとエージェント応答が OTEL span 属性として出力される機能を削除
- **影響:** この機能が有効だった場合、顧客が保持期間やマスキングを制御できない共有 span ストレージで、機密性の高い個人情報（SPII）が露出するリスクがありました
- **対応:** 自動出力機能が削除されたため、特別な対応は不要です。今後、より安全な方法でこの機能を再実装する予定です

## まとめ

このリリースは、プライバシー保護の観点から OTEL span への機密情報自動出力機能を削除したセキュリティ修正リリースです。
