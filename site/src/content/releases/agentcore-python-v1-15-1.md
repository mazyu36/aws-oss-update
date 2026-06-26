---
title: "AgentCore Python SDK v1.15.1 リリース解説"
version: "v1.15.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-06-25
summary: "Custom Code-Based Evaluators の入力モデル拡張と Batch Evaluation での KMS / タグ / オンラインデータソース対応に加え、A2A / AG-UI の ping 応答や Memory の取得処理など複数のバグ修正を含むリリースです。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.15.1"
---

## 概要

AgentCore Python SDK v1.15.1 は、Evaluation 機能の API カバレッジを拡充するマイナーアップデートと、Runtime / Memory / パッケージング周りのバグ修正を中心としたリリースです。Custom Code-Based Evaluator が Ground Truth (`evaluationReferenceInputs`) を型付きで受け取れるようになり、Batch Evaluation では KMS や Online Evaluation データソースを指定できるようになりました。あわせて、A2A / AG-UI の `/ping` で `time_of_last_update` を毎回更新してしまいアイドルタイムアウトが効かなかった問題などが修正されています。

**リリース:** [v1.15.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.15.1)

## 新機能

### Evaluation: `EvaluatorInput` で `evaluationReferenceInputs` を公開 ([#540](https://github.com/aws/bedrock-agentcore-sdk-python/pull/540))

**この機能でできること:**

- Code-Based Evaluator の Lambda イベントに含まれる Ground Truth (`evaluationReferenceInputs`) を、型付きの `ReferenceInput` モデルとして `EvaluatorInput.reference_inputs` から参照できるようになりました
- 各 `ReferenceInput` は `context` / `expected_response` / `assertions` / `expected_trajectory` を保持し、`expected_response_text` というショートカットプロパティで本文テキストへ直接アクセスできます
- どの評価器設定から呼び出されたかをログ・分岐に使うための `evaluator_id` / `evaluator_name` も `EvaluatorInput` に追加されています

**使用例:**

```python
from bedrock_agentcore.evaluation import (
    custom_code_based_evaluator,
    EvaluatorInput,
    EvaluatorOutput,
    ReferenceInput,
)


@custom_code_based_evaluator()
def exact_match(inp: EvaluatorInput, context) -> EvaluatorOutput:
    # Ground Truth から最初の expected_response テキストを取り出す
    expected = next(
        (
            ref.expected_response_text
            for ref in inp.reference_inputs
            if ref.expected_response_text
        ),
        None,
    )
    if expected is None:
        return EvaluatorOutput(
            label="Skip",
            explanation="No ground truth provided",
        )

    # どの評価器設定から呼ばれたかを使った分岐も可能
    if inp.evaluator_name == "strict_match":
        ...

    actual = inp.agent_output_text or ""
    return EvaluatorOutput(
        label="Pass" if actual.strip() == expected.strip() else "Fail",
        explanation=f"evaluator={inp.evaluator_id}",
    )
```

**ポイント:**

- 既存の評価器を壊さない後方互換アップデートです。`reference_inputs` のデフォルトは空リスト、`evaluator_id` / `evaluator_name` のデフォルトは `None` です
- `expected_response` は文字列ではなくオブジェクト (`{"text": "..."}`) として伝送される契約に揃っており、`expected_response_text` プロパティで安全に文字列を取り出せます
- `ReferenceInput` は `extra="allow"` で定義されているため、将来追加されるキーは `ref.model_extra` で参照可能です
- 既存の `ReferenceInputs` (クライアント側の入力モデル) に対し、本 PR で追加された `ReferenceInput` は評価器側で 1 件分のエントリを表す対になるモデルです
- `ReferenceInput` は `bedrock_agentcore.evaluation` と `custom_code_based_evaluators` の双方からインポートできます

---

### Evaluation: Batch Evaluation に KMS / タグ / オンラインデータソース / `updated_at` を追加 ([#533](https://github.com/aws/bedrock-agentcore-sdk-python/pull/533))

**この機能でできること:**

- `StartBatchEvaluation` がもともとサポートしていながら SDK が公開していなかったオプションが、`BatchEvaluationRunConfig` から指定できるようになりました
- `kms_key_arn` で評価データを Customer-Managed KMS Key で保存時暗号化でき、`tags` でリソースタグを付与できます
- 新しい `OnlineEvaluationDataSourceConfig` により、既存の `OnlineEvaluationConfig` が収集したセッションを入力にしたバッチ評価を起動できます
- `GetBatchEvaluation` から返ってくる `kms_key_arn` と `updated_at` も `BatchEvaluationResult` に公開されました

**使用例:**

```python
from bedrock_agentcore.evaluation import (
    BatchEvaluationRunConfig,
    OnlineEvaluationDataSourceConfig,
)

# Online Evaluation で収集したセッションをそのままバッチ評価へ
data_source = OnlineEvaluationDataSourceConfig(
    online_evaluation_config_arn=(
        "arn:aws:bedrock-agentcore:us-west-2:123456789012:"
        "online-evaluation-config/abcd1234"
    ),
    # 任意: 時間範囲などのフィルタ
    session_filter_config={
        "timeRange": {
            "startTime": "2026-06-01T00:00:00Z",
            "endTime": "2026-06-25T00:00:00Z",
        },
    },
)

run_config = BatchEvaluationRunConfig(
    name="weekly-online-eval",
    data_source=data_source,
    # 顧客管理 KMS キーで暗号化
    kms_key_arn=(
        "arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012"
    ),
    tags={"team": "agent-platform", "env": "prod"},
    # 既存の評価器設定 (evaluator config) は従来通り
    ...,
)
```

**ポイント:**

- いずれのフィールドもオプショナルで、未指定時はリクエストから除外されるため、既存の利用方法に影響はありません
- `OnlineEvaluationDataSourceConfig` はサービス側の `onlineEvaluationConfigSource` (`onlineEvaluationConfigArn` + 任意の `sessionFilterConfig`) を出力する `DataSourceConfig` のサブクラスとして実装されています
- 本変更にあわせて `boto3` / `botocore` の最低バージョンが **1.43.31** に引き上げられています (新パラメータを含む最初のサービスモデル)
- `BatchEvaluationResult.kms_key_arn` / `.updated_at` は `GetBatchEvaluation` のレスポンスからそのまま反映されます
- `OnlineEvaluationDataSourceConfig` は `bedrock_agentcore.evaluation` 直下からインポート可能です

---

## バグ修正

### Runtime: A2A / AG-UI の ping 応答から `time_of_last_update` を削除 ([#542](https://github.com/aws/bedrock-agentcore-sdk-python/pull/542))

- A2A (`a2a.py`) と AG-UI (`ag_ui.py`) の `/ping` ハンドラが、毎回の ping のたびに `time_of_last_update` を現在時刻で再スタンプしていたため、Runtime プラットフォーム側がセッションを常に「状態変化あり」とみなしてしまい、`IdleRuntimeSessionTimeout` が発火しない問題が修正されました
- 結果として、アイドル状態のはずのセッションが `MaxLifetime` まで残り、高負荷時には `ServiceQuotaExceededException` を引き起こすケースがありました
- 修正後は `/ping` 応答は `{"status": <status>}` のみを返し、`time_of_last_update` は省略されます。プラットフォーム側はオプショナル扱いで省略を受け付けるため、過去バージョン SDK との混在環境でも互換性は維持されます
- HTTP アプリ (`app.py`) はもともとステータス遷移時のみ `time_of_last_update` を更新しており、正しく動作していたため変更されていません

### Memory: `retrieve_customer_context` で content が空のメッセージに対するクラッシュを修正 ([#544](https://github.com/aws/bedrock-agentcore-sdk-python/pull/544))

- `AgentCoreMemorySessionManager.retrieve_customer_context` (Strands の `MessageAddedEvent` コールバック) が、最後のメッセージの `content` リストが空 (`[]`) のときに `messages[-1].get("content")[0]` で `IndexError` を起こし、エージェント呼び出し全体が AgentCore Runtime 上で 500 になっていました
- 修正により `content` の空チェックが追加され、空の場合は早期 return するようになりました。回帰テストも追加されています

### Memory: メモリ関連スコアの判定に `score` フィールドを使用 ([#480](https://github.com/aws/bedrock-agentcore-sdk-python/pull/480))

- `MemorySessionManager._retrieve_memories_for_llm()` が、API レスポンスに存在しない `relevanceScore` フィールドを参照しており、`record.get("relevanceScore", config.relevance_score)` でしきい値そのものをフォールバックとして返してしまい、関連度フィルタが実質的に機能していませんでした
- 実 API が返す正しいフィールド名 `score` を使用するよう修正され、しきい値以下のレコードが正しく除外されるようになりました。Strands インテグレーション (`session_manager.py`) で既に使われているパターンに揃った形です

### Evaluation: エラーレスポンス時に `EvaluatorOutput.label` を任意化 ([#545](https://github.com/aws/bedrock-agentcore-sdk-python/pull/545))

- Code-Based Evaluator の Lambda 契約では、`errorCode` を返すエラーレスポンスでは `label` を省略できるにもかかわらず、SDK のモデルが `label: str` を無条件に必須としていたため、`EvaluatorOutput(error_code="VALIDATION_FAILED", error_message=...)` が Pydantic の `ValidationError` で失敗していました
- 修正後は `label: Optional[str] = None` となり、`errorCode` が設定されている場合のみ `label` を省略できます。`errorCode` なしで `label` も省略した場合は従来どおりバリデーションエラーになります

**修正後の使い方:**

```python
from bedrock_agentcore.evaluation import EvaluatorOutput

# 成功レスポンス: label は必須 (従来どおり)
EvaluatorOutput(label="Pass", explanation="...")

# エラーレスポンス: label を省略できる
EvaluatorOutput(
    error_code="VALIDATION_FAILED",
    error_message="reference inputs missing",
)
```

### パッケージング: `pyproject.toml` から無効な CLI エントリーポイントを削除 ([#521](https://github.com/aws/bedrock-agentcore-sdk-python/pull/521))

- `[project.scripts]` セクションに `bedrock-agentcore` コマンドが `bedrock_agentcore.cli:main` を指す形で宣言されていましたが、対応する `cli` モジュールはパッケージ内に存在せず、インストール後にコマンドを実行すると `ModuleNotFoundError: No module named 'bedrock_agentcore.cli'` で失敗していました
- 該当エントリーポイントを削除し、誤って公開されていた壊れた CLI コマンドが取り除かれています

## まとめ

v1.15.1 は Evaluation 機能の入出力モデルを拡張しつつ、Runtime / Memory / パッケージングまわりの実害のあったバグをまとめて解消するリリースです。特に A2A / AG-UI のアイドルタイムアウト不具合は本番影響が大きいため、該当プロトコルを利用している場合は早めにアップデートすることをおすすめします。
