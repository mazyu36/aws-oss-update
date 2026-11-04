---
title: "AgentCore Python SDK v1.25.3 リリース解説"
version: "v1.25.3"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-11-03
summary: "v1.25.2 で導入されたトレーシングスパンのフラッシュ処理が、VPC ネットワーク環境でストリーミング応答のタイムアウトを引き起こしていたため、revert されました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.3"
---

## 概要

このリリースでは、v1.25.2 で追加された Runtime 呼び出し後の OpenTelemetry トレーシングスパンフラッシュ処理が revert されました。VPC ネットワークモードで X-Ray へのルートが存在しない環境において、OTLP エクスポートがリクエストパス上でブロックし、ストリーミング応答が完了しない (clients 側で `ReadTimeoutError` となる) 問題が確認されたためです。

**リリース:** [v1.25.3](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.3)

## バグ修正

### Runtime 呼び出し後のトレーシングスパンフラッシュを revert ([#731](https://github.com/aws/bedrock-agentcore-sdk-python/pull/731))

- v1.25.2 の [#721](https://github.com/aws/bedrock-agentcore-sdk-python/pull/721) で導入された、`/invocations` レスポンス完了時に `TracerProvider.force_flush()` を待機する処理が revert されました。
- **問題の内容:**
  - フラッシュ処理が OTLP エクスポートをリクエストパス上に乗せる形になっており、VPC ネットワークモードで X-Ray へのルートが存在しない環境では、エクスポート用の接続が完了せず、ストリーミング応答が全イベントを配信した後も close されないままとなっていました。
  - その結果、クライアント側では boto3 の `ReadTimeoutError` が発生していました。特に同期ストリーム経路では待機時間に上限が設定されていませんでした。
- **再現検証の結果:**
  - [#721](https://github.com/aws/bedrock-agentcore-sdk-python/pull/721) が解決しようとしていた「microVM が応答直後にフリーズしてスパンが失われる」問題は、SDK 1.25.1 (フラッシュなし) で AgentCore Runtime のデフォルトライフサイクル設定 (900 秒 idle、8 時間 max lifetime)、パブリックネットワーク、us-west-2 の code-zip / container 両ランタイム上で検証した結果、再現しませんでした。
  - microVM は応答後もアイドルタイムアウトまで動作し続けており、`BatchSpanProcessor` の通常の 5 秒エクスポート周期でリクエストスパンは問題なく送信されます。
- **影響範囲:**
  - 修正対象: `src/bedrock_agentcore/runtime/app.py`、`src/bedrock_agentcore/runtime/tracing.py` および関連テスト。
  - v1.25.2 を利用していて VPC 環境でストリーミング応答がタイムアウトしていたユーザーは、v1.25.3 へのアップグレードで解消されます。
- 既存の [Issue #629](https://github.com/aws/bedrock-agentcore-sdk-python/issues/629) は、スパンが失われる個別環境の原因を引き続き調査するために reopen されています。

## まとめ

v1.25.2 で意図された改善が、VPC 構成下で副作用を引き起こしていたため revert するホットフィックスリリースです。VPC ネットワークモードで AgentCore Runtime を利用している場合は、v1.25.3 への更新を推奨します。
