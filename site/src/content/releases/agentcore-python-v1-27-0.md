---
title: "AgentCore Python SDK v1.27.0 リリース解説"
version: "v1.27.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-11-20
summary: "評価機能が GA 版の Dataset API に対応しました。データセットから schemaType が廃止されシナリオタイプがフィールドから推論されるようになったほか、データセット生成 API (start/get/list/delete) が許可リストに追加され、バッチ評価から公開済みデータセットを AgentCore Runtime エージェントに対して実行できるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.27.0"
---

## 概要

このリリースでは、評価 (Evaluation) 機能が GA 版の Dataset API に大きく追従しました。データセット作成時の `schemaType` が廃止され、各行のシナリオタイプ (predefined か simulated か) はフィールドから自動的に推論されます。また、新たにデータセット生成 API (`start_dataset_generation` など) が `EvaluationClient` の許可リストに追加され、`start_batch_evaluation_and_wait` では `datasetExecutionConfig` を指定することで、公開済みデータセットをサービス側で AgentCore Runtime エージェントに対して実行し、その結果だけを採点できるようになりました。あわせて、ローカルのユーザーシミュレーターのプロンプトがサービス側の実装と一致するように刷新されています。

**リリース:** [v1.27.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.27.0)

## 新機能

### データセット生成 API を DP 許可リストに追加 ([#747](https://github.com/aws/bedrock-agentcore-sdk-python/pull/747))

**この機能でできること:**

- `EvaluationClient` のデータプレーンメソッド許可リスト (`_ALLOWED_DP_METHODS`) に、以下 4 つのデータセット生成 API が追加されました。
  - `start_dataset_generation`
  - `get_dataset_generation`
  - `list_dataset_generation`
  - `delete_dataset_generation`
- これにより、`EvaluationClient` 経由でデータセット生成ジョブの起動・状態取得・一覧取得・削除がパススルー呼び出しできるようになります。

**使用例:**

```python
from bedrock_agentcore.evaluation.client import EvaluationClient

client = EvaluationClient(region_name="us-west-2")

# データセット生成ジョブを起動
start_resp = client.start_dataset_generation(
    # 生成ジョブに渡す引数はサービス側の API 仕様に従う
    # (例: ベースとなる仕様、生成件数、出力先データセットなど)
    # ...
)
generation_id = start_resp["datasetGenerationId"]

# 状態を取得
status = client.get_dataset_generation(datasetGenerationId=generation_id)
print(status["status"])

# 実行中のジョブを一覧
jobs = client.list_dataset_generation()

# 生成ジョブを削除
client.delete_dataset_generation(datasetGenerationId=generation_id)
```

**ポイント:**

- これらは `EvaluationClient` の DP (データプレーン) 系メソッドとして許可リストに追加されただけのパススルーです。引数とレスポンスはサービス側 API のスキーマにそのまま従います。
- 許可リストに載っていないメソッドは `EvaluationClient` から呼び出せない設計のため、新しい API を使うにはこの追加が必須でした。従来はクライアントを経由した呼び出しがブロックされていたため、v1.27.0 以降でのみ利用できます。

---

### GA 版 Dataset API への対応 ([#748](https://github.com/aws/bedrock-agentcore-sdk-python/pull/748))

**この機能でできること:**

- データセットから `schemaType` が廃止されました。`create_dataset` / `get_dataset` / `list_datasets` は `schemaType` を受け取らず、各行のシナリオタイプは行のフィールドから推論されます。
  - `turns` を持つ行は複数ターンの **predefined** シナリオ
  - `input` のみを持つ行は単一ターンの **predefined** シナリオ
  - `actor_profile` を持つ行は **simulated** シナリオ (`input` を省略すると、シミュレーターが自身で最初のメッセージを書く)
- `EvaluationClient.start_batch_evaluation_and_wait` が `datasetExecutionConfig` を受け付けるようになりました。これにより、サービス側で公開済みデータセットを AgentCore Runtime エージェントに対して実行し、そのセッションだけを採点する一連の流れを 1 つの呼び出しで実行できます。
- `create_dataset_version_and_wait` は、これまで DRAFT (更新完了直後のデータセット本体) を返していましたが、今後は作成された新バージョンそのものを返すようになります。
- ローカルの `BatchEvaluationRunner` が使う構造化ユーザーシミュレーターのプロンプトが、サービス側 `AgentCoreEvaluationScenarioExecutor` の `SIMULATION_GUIDELINES` と一致するように書き直されました。アクタープロファイルはデータセットのフィールド名 (`traits` / `context` / `goal`) のまま、コンパクトな JSON として `<scenario>` ブロックに差し込まれます。
- 本対応に伴い、`boto3` / `botocore` の下限が `1.44.5` に引き上げられています (`CreateDataset` から `schemaType` が外れ、`StartBatchEvaluation` が `datasetExecutionConfig` を受け付ける最初のバージョン)。

**使用例 — schemaType なしでデータセットを作成する:**

```python
from bedrock_agentcore.evaluation.dataset_client import DatasetClient

client = DatasetClient(region_name="us-west-2")

# schemaType はもう不要。各 example のフィールドからシナリオタイプが推論される
dataset = client.create_dataset_and_wait(
    datasetName="support-dataset",
    source={
        "inlineExamples": {
            "examples": [
                # 単一ターンの predefined (input のみ)
                {"scenario_id": "faq-1", "input": "営業時間を教えてください"},
                # 複数ターンの predefined (turns)
                {
                    "scenario_id": "multi-1",
                    "turns": [
                        {"input": "注文番号 123 の状態は?", "expected_response": "..."},
                        {"input": "キャンセルしたい", "expected_response": "..."},
                    ],
                },
                # simulated (actor_profile あり、input は任意)
                {
                    "scenario_id": "sim-1",
                    "actor_profile": {
                        "traits": {"mood": "困っている"},
                        "context": "商品配送が遅れている",
                        "goal": "配送状況を確認して解決策を得る",
                    },
                    # input を省略すると、シミュレーターが最初のメッセージを書く
                },
            ]
        }
    },
)
```

**使用例 — サービス側でデータセットを AgentCore Runtime エージェントに実行してから採点:**

```python
# start_batch_evaluation_and_wait に datasetExecutionConfig を渡すと、
# サービスが公開済みデータセットをエージェントに対して実行し、
# その結果として生成されたセッションだけを採点する
result = client.start_batch_evaluation_and_wait(
    # 公開済みデータセットを対象に指定
    datasetExecutionConfig={
        "datasetId": dataset["datasetId"],
        "datasetVersion": "1",
        # エージェントの指定(サービス側 API のスキーマに従う)
        "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-west-2:123456789012:runtime/MyAgent",
        # ...
    },
    evaluators=[...],
    max_wait=1800,  # 数分〜十数分かかるため長めに
)
```

ローカルプロセス内でデータセットを実行したい場合は、従来通り `BatchEvaluationRunner` を使います。

**使用例 — simulated シナリオで actor が最初の発話を書く:**

```python
from bedrock_agentcore.evaluation.runner.dataset_types import (
    ActorProfile,
    SimulatedScenario,
)

# input を省略すると、SimulatedScenario.input は None (Optional になった)
scenario = SimulatedScenario(
    scenario_id="sim-opening",
    scenario_description="ユーザーがサポートに問い合わせる",
    actor_profile=ActorProfile(
        traits={"tone": "丁寧"},
        context="先週購入した商品が動かない",
        goal="返品手続きの方法を知る",
    ),
    # input は書かない -> シミュレーターがシナリオから最初の発話を生成する
)
```

**使用例 — 新しいバージョンを作成したら、そのバージョンそのものが返る:**

```python
# 以前は DRAFT (datasetVersion 未指定の get_dataset 結果) が返っていたが、
# 今後は作成されたバージョンそのものを返す
new_version = client.create_dataset_version_and_wait(
    datasetId="ds-xxxx",
    # ...
)
print(new_version["datasetVersion"])  # 新しく作られたバージョン番号
```

**ポイント:**

- **型の指定不要:** データセットはもはや種別を宣言しません。1 つのデータセットに predefined と simulated の行を混在させることも可能です。ただし 1 行の中で `turns` と `actor_profile` を同時に指定するとエラーになります (`"turns" と "actor_profile" は排他")。
- **simulated で `input` を省略できる:** `SimulatedScenario.input` が `Optional[Union[str, dict, BaseModel]] = None` に緩和されました。`None` の場合、シミュレーターは内部で挨拶を受け取り、その返答としてシナリオから最初のユーザー発話を生成します (この挨拶はターン数にはカウントされません)。
- **プロンプトのサービス整合:** ローカル版のシステムプロンプトがサービス側 (`SIMULATION_GUIDELINES`) と同等になったため、ローカル実行とサービス側実行のシミュレーター挙動が揃います。`scenario_description` と `actor_profile` は untrusted データとして `<scenario>` ブロックに閉じ込められ、プロンプトインジェクションから保護されます。
- **カスタムテンプレートの互換性:** 独自の `system_prompt_template` を使っている場合、`actor_profile` 変数は引き続き Strands 側のフィールド名 (`traits` / `context` / `actor_goal`) で渡されます。ビルトインテンプレートのみデータセット側の名前 (`goal`) に揃えられている点に注意してください。
- **依存関係の下限引き上げ:** `boto3` / `botocore` は `1.44.5` 以上が必須になりました。既存環境では `pip install -U bedrock-agentcore` と合わせて boto3 / botocore も更新してください。
- **バージョン作成の戻り値変更:** `create_dataset_version_and_wait` の返り値は DRAFT ではなく新バージョン本体になりました。以前の挙動に依存して DRAFT を参照していたコードがあれば、戻り値の `datasetVersion` を使う形に修正が必要です。

## まとめ

評価機能が GA 版 Dataset API に対応した大きめのリリースです。データセットから `schemaType` が消え、シナリオタイプが行のフィールドから推論されるようになったほか、`start_batch_evaluation_and_wait` でサービス側にエージェント実行と採点を一括依頼できるようになりました。評価機能を利用している場合は、boto3/botocore を 1.44.5 以上に更新したうえで、`create_dataset*` 系の呼び出しから `schemaType` を外し、`create_dataset_version_and_wait` の戻り値取り扱いを確認することをおすすめします。
