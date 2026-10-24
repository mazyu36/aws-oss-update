---
title: "AgentCore Python SDK v1.25.0 リリース解説"
version: "v1.25.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-10-23
summary: "Evaluation モジュールへの大幅な機能追加を含むリリースです。既存セッションのバッチ評価、FailureAnalysis の insight 結果の公開、新しい RecommendationClient の追加に加え、Payments 統合のセキュリティハードニングも行われています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.0"
---

## 概要

このリリースは Evaluation モジュールに対する大幅な機能追加が中心です。`BatchEvaluationRunner` が `Builtin.FailureAnalysis` などの分析 evaluator の `insightResults` を結果に反映するようになり、既に AgentCore Runtime 上で実行済みの CloudWatch Logs のセッションを再実行なしで評価できるようになりました。あわせて、新しい `RecommendationClient` が追加され、Payments 統合には defense-in-depth のセキュリティハードニングが施されています。

**リリース:** [v1.25.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.25.0)

## 新機能

### バッチ評価の insight 結果を結果モデルに反映 ([#704](https://github.com/aws/bedrock-agentcore-sdk-python/pull/704))

**この機能でできること:**
- `GetBatchEvaluation` は `Builtin.FailureAnalysis` のような分析 evaluator を含めると `insightResults` を返しますが、これまで `BatchEvaluationRunner` は固定のレスポンスフィールドだけから結果を組み立てていたため、`insightResults` は捨てられていました。
- このリリースで insight shape 用のモデルが追加され、`BatchEvaluationResult` に `insight_results` フィールドが追加されました。

**使用例:**

```python
from bedrock_agentcore.evaluation.runner.batch.batch_evaluation_runner import BatchEvaluationRunner

runner = BatchEvaluationRunner(region_name="us-west-2")
result = runner.run(
    batch_evaluation_name="nightly",
    evaluators=[
        {"evaluatorId": "Builtin.GoalSuccessRate"},
        {"evaluatorId": "Builtin.FailureAnalysis"},  # 分析 evaluator
    ],
    # ... 他のパラメータ
)

# insight_results に Builtin.FailureAnalysis の分析結果が入る
if result.insight_results is None:
    # 分析 evaluator が実行されなかった、または結果を読み取れなかった
    print("no insight results")
elif len(result.insight_results) == 0:
    # 分析は実行されたが失敗は見つからなかった
    print("no failures detected")
else:
    for insight in result.insight_results:
        print(insight)
```

**ポイント:**
- `insight_results` が `None` か空リストかで意味が異なります。`None` は分析 evaluator が実行されなかった（または結果を読み取れなかった）ことを示し、空リストは「分析は実行されたが失敗は検出されなかった」ことを示します。この違いはランナーが意識的に保っています。
- insight shape は botocore に同梱される service model を経由してクライアントに届くため、本リリースでは boto3 および botocore の最低バージョンがこれらのシェイプを含む最初のリリースに引き上げられています。

---

### 既存セッションの評価と `RecommendationClient` の追加 ([#708](https://github.com/aws/bedrock-agentcore-sdk-python/pull/708))

**この機能でできること:**
- `EvaluationClient` にバッチ評価 API（start / get / list / stop / delete）がフレームワーク非依存で allowlist され、新しい `start_batch_evaluation_and_wait` メソッドが追加されました。これにより、Agent を再度呼び出すことなく、CloudWatch Logs に既に存在するセッションに対してスコアリングを行えます。
- 新しい `RecommendationClient` が追加され、4 つの recommendation API を snake_case キーワード引数でそのまま呼び出せるほか、`start_recommendation_and_wait` でポーリング付きの実行が可能になります。
- 内部的に `wait_until` がターゲットステータスの集合を受け取れるようになり、`COMPLETED_WITH_ERRORS` で終了する実行がタイムアウトにならず戻るようになりました。

**使用例:**

```python
from bedrock_agentcore.evaluation import EvaluationClient, RecommendationClient
from bedrock_agentcore._utils.polling import WaitConfig

# 既存の CloudWatch Logs 上のセッションをスコアリング（Agent 再実行なし）
batch = EvaluationClient(region_name="us-west-2").start_batch_evaluation_and_wait(
    wait_config=WaitConfig(max_wait=1800),
    batch_evaluation_name="nightly",
    evaluators=[
        {"evaluatorId": "Builtin.GoalSuccessRate"},
        {"evaluatorId": "Builtin.FailureAnalysis"},
    ],
    data_source_config={"cloudWatchLogs": {
        # ... セッション ID や期間などを指定
    }},
)
# スコアは evaluationResults、Builtin.FailureAnalysis の insight は insightResults に入る

# Recommendation の実行
rec = RecommendationClient(region_name="us-west-2").start_recommendation_and_wait(
    wait_config=WaitConfig(max_wait=1800),
    name="promptrec",
    type="SYSTEM_PROMPT_RECOMMENDATION",
    recommendation_config={
        "systemPromptRecommendationConfig": {
            "systemPrompt": {"text": prompt},
            "agentTraces": {"batchEvaluation": {
                "batchEvaluationArn": batch["batchEvaluationArn"],
            }},
            "evaluationConfig": {
                "evaluators": [{"evaluatorArn": goal_success_arn}],
            },
        },
    },
)
```

**ポイント:**
- 両クライアントともフレームワーク非依存で、既に AgentCore Runtime 上で動いている Agent に対して追加設定なしで利用できます。
- `RecommendationClient` は `DatasetClient` と同じパターンで実装されており、snake_case 引数で呼び出せます。
- `CloudWatchDataSourceConfig.to_data_source_config` は、`sessionIds` が空リストのときにフィールドを省略するようになりました。空リストはあらゆるセッションを除外するフィルタとして解釈されるためです。
- 公式サンプルでは、us-west-2 で既存の 2 セッションに対して `GoalSuccessRate` と `FailureAnalysis` が 102 秒、バッチ評価からの recommendation が 123 秒で完了したことが確認されています。

---

### Payments 統合のセキュリティハードニング ([#706](https://github.com/aws/bedrock-agentcore-sdk-python/pull/706))

**この機能でできること:**
- AgentCore Payments 統合（Strands plugin / LangGraph middleware）に、2 つの defense-in-depth のハードニングが追加されました。いずれも後方互換で、既存のインテグレーションの挙動はそのまま維持されます。
- 1 つ目は、設定された `user_id` を authoritative（権威的）に扱う変更です。これまで Strands plugin / LangGraph tools では `user_id` が LLM 制御可能なツール引数として露出しており、prompt injection によって異なる `user_id` を渡されると設定済み ID が上書きされてしまうリスクがありました。マネージドサービス側では常にサーバー解決済みの ID でスコープされるためテナント境界は越えませんが、SDK レベルでそもそもモデルに上書きを試させないようにします。
- 2 つ目は、LangGraph middleware における content-inferred 402 検出のゲート化と pre-sign ポリシーの追加です。これまで LangGraph middleware は、信頼できる `PAYMENT_REQUIRED:` マーカーを持たないツール出力からも x402 の支払いチャレンジを推論していました。この結果、任意のツール出力から取得した recipient / amount に対して署名付き authorization が発行される可能性がありました（CWE-863）。Strands plugin はマーカーのみを信頼する実装で、この影響は受けません。

**使用例（LangGraph の opt-in コントロール）:**

```python
from bedrock_agentcore.payments.integrations.config import AgentCorePaymentsPluginConfig

def allowlist_only(payment_required_request) -> bool:
    # 許可された recipient / amount だけ True を返す
    return payment_required_request.payTo in TRUSTED_RECIPIENTS

config = AgentCorePaymentsPluginConfig(
    # マーカーなしの 402 検出を無効化（True がデフォルト、後方互換）
    allow_unmarked_402_detection=False,

    # 署名直前のチョークポイントで呼ばれるコールバック。
    # False を返す、または例外を送出すると署名はブロックされる（fail-closed）。
    pre_sign_policy=allowlist_only,
)
```

**ポイント:**
- `resolve_authoritative_user_id()` ヘルパーが新設され、Identity が設定されている場合はそれが authoritative となり、ツールから渡された異なる `user_id` は無視・ログ出力されます。Identity が設定されていない場合（bearer / JWT 認証でサーバー側がトークンからユーザーを解決するケース）は、渡された値がそのまま通ります。
- Strands plugin と LangGraph middleware の計 8 つのツール呼び出しサイトがこのヘルパー経由に変更されましたが、ツールのシグネチャ自体は変更されていません（スキーマ破壊なし）。
- `allow_unmarked_402_detection` のデフォルトは `True` で、既存の挙動を維持します。`False` に設定すると、信頼できるマーカーを持つ自前の payment-bearing tool からのみ検出するようになります。
- `pre_sign_policy` は、marked / unmarked / error-retry すべての検出パスを含む `_generate_payment_header` の単一のチョークポイントで呼ばれます。falsy を返すか例外を送出すると署名がブロックされる fail-closed 設計です。recipient / amount の allowlist を強制したい場合、検出デフォルトに関わらずここで止められます。

## まとめ

本リリースは Evaluation モジュールに対する機能追加（既存セッションの評価・`RecommendationClient` の新設・insight 結果の公開）が中心で、既に Runtime 上で稼働している Agent に対する評価と改善のループを SDK から直接回しやすくなっています。あわせて Payments 統合に opt-in のセキュリティハードニング設定が追加されており、Payments を利用している環境では新しい `allow_unmarked_402_detection` や `pre_sign_policy` の採用を検討する価値があります。
