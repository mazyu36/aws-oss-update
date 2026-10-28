---
title: "AgentCore Python SDK v1.25.1 リリース解説"
version: "v1.25.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-10-27
summary: "Evaluation 機能において、カスタムシミュレーションテンプレートのレンダリング処理を分離するバグ修正が含まれるリリースです。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.1"
---

## 概要

このリリースでは、Evaluation 機能におけるカスタムシミュレーションテンプレートのレンダリング処理が修正されました。カスタムプロンプト文字列と、バンドルされているプロンプトファイルで別々の Jinja2 環境を使用するように改善されています。

**リリース:** [v1.25.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.1)

## バグ修正

### カスタムシミュレーションテンプレートのレンダリング処理を分離 ([#714](https://github.com/aws/bedrock-agentcore-sdk-python/pull/714))

- カスタムシミュレーションプロンプト文字列を、専用の Jinja2 環境でレンダリングするように修正
- バンドルされているプロンプトファイルについては、従来通りファイルベースの Jinja2 環境を使用
- シミュレーション extra の依存関係として Jinja2 3.1.6 が必要になりました

**修正の背景:**

従来はカスタムシミュレーションテンプレート（ユーザーが指定したプロンプト文字列）と、SDK にバンドルされているプロンプトファイルが同じ Jinja2 環境を共有していました。この修正により、両者が独立した環境で処理されるようになり、カスタムテンプレートのレンダリング時にファイルシステム由来のテンプレートと干渉しなくなります。

**使用例:**

```python
# カスタムシミュレーションテンプレートを利用する場合、
# ユーザー指定の文字列テンプレートは文字列ベースの Jinja2 環境で、
# バンドルプロンプトはファイルベースの Jinja2 環境で、それぞれ分離してレンダリングされます。
from bedrock_agentcore.evaluation.runner.dataset_types import (
    SimulatedScenarioDataset,
)

dataset = SimulatedScenarioDataset(
    # カスタムテンプレート文字列を渡す場合も、
    # SDK 内部で安全に分離されて処理されるようになりました
    custom_prompt_template="あなたは {{ persona }} として振る舞ってください。",
    # 他の設定項目...
)
```

**ポイント:**
- Evaluation の simulation extra を利用する場合は、`jinja2>=3.1.6` が必要です
- カスタムテンプレートとバンドルプロンプトのスコープが明確に分離されたため、意図しないテンプレート参照が防止されます

## まとめ

Evaluation 機能のカスタムシミュレーションテンプレート処理に関する修正が入ったリリースです。カスタムテンプレートを利用しているユーザーは、この修正により安定した動作が期待できます。
