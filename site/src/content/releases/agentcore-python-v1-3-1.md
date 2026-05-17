---
title: "AgentCore Python SDK v1.3.1 リリース解説"
version: "v1.3.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-02-17
summary: "評価クライアントで誤った boto3 サービス名が使用されていた問題を修正しました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.3.1"
---

## 概要

このリリースでは、評価クライアント（`StrandsEvalsAgentCoreEvaluator`）が誤った boto3 サービス名を使用していた問題が修正されました。

**リリース:** [v1.3.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.3.1)

## バグ修正

### 評価クライアントの boto3 サービス名を修正 ([#267](https://github.com/aws/bedrock-agentcore-sdk-python/pull/267))

- `StrandsEvalsAgentCoreEvaluator` が無効な boto3 サービス名 `agentcore-evaluation-dataplane` を使用していたため、`botocore.exceptions.UnknownServiceError` が発生する問題を修正しました
- 正しいサービス名 `bedrock-agentcore`（`Evaluate` API が存在するサービス）に変更されました
- `create_strands_evaluator("Builtin.Correctness")` などの評価機能が正常に動作するようになりました

## まとめ

評価クライアントのサービス名誤りを修正した軽微なバグ修正リリースです。評価機能を使用している場合は、このバージョンへのアップデートを推奨します。
