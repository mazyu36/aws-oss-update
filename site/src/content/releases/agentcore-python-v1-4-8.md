---
title: "AgentCore Python SDK v1.4.8 リリース解説"
version: "v1.4.8"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-03-26
summary: "AgentCore Evaluation サポートのための OTEL 属性出力機能が追加されました。また、画像のみのメッセージ処理時のクラッシュや、strands-agents-evals 未インストール時の ImportError に関するバグ修正が含まれています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.8"
---

## 概要

このリリースでは、AgentCore Evaluation のためのワークフローエージェント対応として、OTEL スパン属性の自動出力機能が追加されました。また、画像のみのメッセージで `retrieve_customer_context` がクラッシュする問題と、`strands-agents-evals` 未インストール時の ImportError が修正されています。

**リリース:** [v1.4.8](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.8)

## 新機能

### AgentCore Evaluation 用 OTEL 属性の出力 ([#368](https://github.com/aws/bedrock-agentcore-sdk-python/pull/368))

**この機能でできること:**
- `BedrockAgentCoreApp` がルートスパンに `agentcore.invocation.user_prompt` と `agentcore.invocation.agent_response` を自動出力
- カスタムステートスキーマを使用するワークフローエージェントの評価が可能に

**使用例:**

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()

# prompt_key と response_key でペイロード/レスポンスのキーを指定
@app.entrypoint(prompt_key="user_input", response_key="final_response")
async def my_workflow_agent(payload: dict):
    user_input = payload["user_input"]
    # ワークフロー処理...
    return {"final_response": "処理結果"}

app.run()
```

**ポイント:**
- `prompt_key` と `response_key` パラメータで、どのキーを OTEL 属性として出力するか制御可能
- `TypedDict` など `MessagesState` 以外のスキーマを使用するワークフローエージェントで特に有用
- CloudWatch スパンで属性を確認し、AgentCore Evaluation でスコアリング可能

## バグ修正

### 画像のみのメッセージでの KeyError を修正 ([#299](https://github.com/aws/bedrock-agentcore-sdk-python/pull/299))

- `retrieve_customer_context` が画像のみのメッセージで `KeyError: 'text'` を発生させていた問題を修正
- テキストコンテンツを含まないメッセージ（画像のみなど）で LTM 検索をスキップするように修正

### strands-agents-evals 未インストール時の ImportError を修正 ([#367](https://github.com/aws/bedrock-agentcore-sdk-python/pull/367))

- `strands-agents-evals` をインストールしていないユーザーが `EvaluationClient` を使用できるようになりました
- `StrandsEvalsAgentCoreEvaluator` と `create_strands_evaluator` は遅延インポートに変更
- Strands 依存のシンボルにアクセスした際、未インストールの場合は明確なエラーメッセージを表示

## まとめ

ワークフローエージェントの評価サポートが強化され、カスタムスキーマを使用するエージェントでも AgentCore Evaluation を活用できるようになりました。画像を含むマルチモーダルメッセージを扱う場合や、評価機能を使用している場合はアップデートを推奨します。
