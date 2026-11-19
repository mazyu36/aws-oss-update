---
title: "AgentCore Python SDK v1.26.1 リリース解説"
version: "v1.26.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-11-18
summary: "バッチ評価の evaluator summaries に evaluation_dimension_name フィールドが追加され、マルチディメンション LLM-as-a-judge 評価器の各ディメンションごとの集計結果を正しく識別できるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.26.1"
---

## 概要

このリリースでは、バッチ評価の `EvaluatorSummary` に `evaluation_dimension_name` フィールドが追加されました。マルチディメンションの LLM-as-a-judge 評価器では、ディメンションごとに個別の集計エントリが返されますが、これまでは SDK 側でディメンション名を失っていたため、同じ evaluator の複数ディメンションの集計を区別できませんでした。本修正により、バッチ評価の結果を正しくディメンション単位で扱えるようになります。

**リリース:** [v1.26.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.26.1)

## 新機能

### バッチ評価の evaluator summaries でディメンション名を保持 ([#744](https://github.com/aws/bedrock-agentcore-sdk-python/pull/744))

**この機能でできること:**

- マルチディメンションの LLM-as-a-judge 評価器は、`GetBatchEvaluation` のレスポンスでディメンションごとに `evaluatorSummaries` エントリを返し、それぞれに `evaluationDimensionName` が付与されます。
- 従来の `EvaluatorSummary` モデルはこの `evaluationDimensionName` を保持していなかったため、同じ `evaluator_id` を持つ複数のサマリを識別できませんでした。
- 本リリースで `EvaluatorSummary` に `evaluation_dimension_name: Optional[str]` が追加され、各ディメンションの集計をそのまま読み取れるようになりました。
- また、`EvaluationClient.run` の docstring 内サンプルも、ディメンション名を表示するように更新されています。

**使用例 — バッチ評価の結果をディメンションごとに取得する:**

```python
from bedrock_agentcore.evaluation.runner.batch.batch_evaluation_models import (
    BatchEvaluationSummary,
)

# GetBatchEvaluation のレスポンス (例)
response = {
    "evaluatorSummaries": [
        # マルチディメンション評価器 "SupportQuality-a1b2c3" の Accuracy 次元
        {
            "evaluatorId": "SupportQuality-a1b2c3",
            "evaluationDimensionName": "Accuracy",
            "statistics": {"averageScore": 4.2},
        },
        # 同じ evaluator の Tone 次元
        {
            "evaluatorId": "SupportQuality-a1b2c3",
            "evaluationDimensionName": "Tone",
            "statistics": {},
        },
        # ディメンションに紐づかない失敗を数える evaluator 全体のエントリ
        {
            "evaluatorId": "SupportQuality-a1b2c3",
            "totalEvaluated": 0,
            "totalFailed": 1,
        },
        # シングルディメンションの組み込み評価器
        {
            "evaluatorId": "Builtin.Helpfulness",
            "statistics": {"averageScore": 0.8},
        },
    ]
}

summary = BatchEvaluationSummary.model_validate(response)

for s in summary.evaluator_summaries:
    # evaluation_dimension_name が入っているので、同じ evaluator_id の
    # 複数サマリを区別できる
    label = (
        f"{s.evaluator_id}/{s.evaluation_dimension_name}"
        if s.evaluation_dimension_name
        else s.evaluator_id
    )
    avg = s.statistics.average_score if s.statistics else None
    print(label, avg, s.total_failed)
```

**使用例 — `EvaluationClient.run` の実行結果でディメンションを表示する:**

```python
# 更新後の docstring サンプルと同じ使い方
# EvaluationClient.run の結果に含まれる evaluationDimensionName を活用する
results = client.run(
    # ... 評価の実行設定 ...
)

for r in results:
    dim = r.get("evaluationDimensionName")
    name = f"{r['evaluatorId']}/{dim}" if dim else r["evaluatorId"]
    print(f"{name}: {r.get('value')} - {r.get('explanation')}")
```

**ポイント:**

- **ディメンション単位のエントリ:** マルチディメンション評価器は、各ディメンションごとに別の `EvaluatorSummary` を返します。`evaluation_dimension_name` にそのディメンション名が入ります。
- **ディメンションに紐づかないエントリ:** ディメンション名が `None` の `EvaluatorSummary` は、特定のディメンションに紐づかない失敗を数えるためのエントリです。
- **セッション全体の失敗:** スパンが見つからないなど、セッション全体として失敗したケースは `number_of_sessions_failed` にのみカウントされ、`EvaluatorSummary` には現れません。
- **依存関係:** `botocore>=1.43.127` の下限はすでに満たされており、`GetBatchEvaluation` の API モデルに `evaluationDimensionName` が含まれています。追加の依存関係更新は不要です。
- **互換性:** `evaluation_dimension_name` は `Optional[str]` でデフォルト `None` のため、既存のシングルディメンション評価器を扱うコードはそのまま動作します。

## まとめ

マルチディメンションの LLM-as-a-judge 評価器を使ってバッチ評価を行っているユーザーにとって、ディメンションごとの集計を正しく識別できるようになる重要な修正です。バッチ評価の結果をディメンション単位で可視化・集計している処理があれば、`evaluation_dimension_name` を使って同じ evaluator の複数エントリを区別するように更新するとよいでしょう。
