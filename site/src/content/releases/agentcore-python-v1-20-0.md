---
title: "AgentCore Python SDK v1.20.0 リリース解説"
version: "v1.20.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-08-04
summary: "DeepEval / Autoevals をコードベース評価フレームワークから直接利用できるサードパーティ評価アダプタが追加されました。あわせて、A2A ランタイムが必ずコントラクトポート 9000 で待ち受けるように修正され、汎用的な `PORT` 環境変数の反映が廃止されています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.20.0"
---

## 概要

このリリースの目玉は、AgentCore のコードベース評価フレームワークに DeepEval と Autoevals を組み込めるサードパーティ評価アダプタの追加です。加えて、直前の v1.19.0 で導入された `serve_a2a()` の `PORT` 環境変数対応が、AgentCore Runtime の A2A コントラクト（コンテナポート 9000 固定）と衝突する問題を起こしていたため、`A2A_PORT` に置き換える修正が入っています。この変更は v1.19.0 で `PORT` を利用していた場合の後方互換性を破りますが、v1.18.0 以前の挙動には戻る形になります。

**リリース:** [v1.20.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.20.0)

## 新機能

### DeepEval / Autoevals をコードベース評価アダプタとして統合 ([#568](https://github.com/aws/bedrock-agentcore-sdk-python/pull/568))

**この機能でできること:**

- DeepEval の各種メトリクス（`AnswerRelevancyMetric`、`HallucinationMetric`、`ToolCorrectnessMetric` など）や Autoevals のスコアラー（`Factuality`、`ClosedQA` など）を、AgentCore の `evaluate()` API から呼び出せるコードベース評価器としてそのまま実行できるようになった
- Strands / OpenInference LangChain / OpenTelemetry LangChain の各スパン形式を自動検出する `strands-agents-evals` ベースのスパンマッパーが同梱されており、既存のトレースからデフォルトで入力・出力・ツール呼び出しを抽出できる
- 対応外のフレームワークや独自形式のスパンには、`custom_mapper` に自前の変換関数を渡すことでバイパスできる

**インストール:**

`strands-agents-evals>=1.0.0,<2.0.0` に依存するため、DeepEval / Autoevals 本体はプロジェクト側で追加インストールする必要があります。

```bash
pip install bedrock-agentcore==1.20.0
pip install deepeval        # DeepEvalAdapter を使う場合
pip install autoevals       # AutoEvalsAdapter を使う場合
```

**使用例（デフォルトのスパンマッピング）:**

```python
from deepeval.metrics import AnswerRelevancyMetric
from bedrock_agentcore.evaluation.custom_code_based_evaluators.third_party.deepeval import (
    DeepEvalAdapter,
)

# DeepEval のメトリクスをそのまま渡すだけで、
# session_spans から input / actual_output / tools_called / expected_tools / context を
# strands-agents-evals のマッパーが自動抽出してくれる
metric = AnswerRelevancyMetric(threshold=0.7)
adapter = DeepEvalAdapter(metric=metric)

# adapter を通常のコードベース評価器と同じように登録して evaluate() から呼び出す
```

Autoevals も同じ形で利用できます。

```python
from autoevals import Factuality
from bedrock_agentcore.evaluation.custom_code_based_evaluators.third_party.autoevals import (
    AutoEvalsAdapter,
)

# threshold を指定すると、score がしきい値以上のとき label="Pass"、そうでなければ "Fail" を返す
# 未指定時は既定 0.5 で判定される
adapter = AutoEvalsAdapter(metric=Factuality(), threshold=0.6)
```

**使用例（`custom_mapper` で独自スパン形式に対応）:**

対応マッパーが検出されない形式のスパン、あるいは特定フィールドだけを差し替えたい場合は、`custom_mapper` を指定します。

```python
from typing import Any, Dict
from deepeval.test_case import LLMTestCase
from bedrock_agentcore.evaluation.custom_code_based_evaluators.models import EvaluatorInput
from bedrock_agentcore.evaluation.custom_code_based_evaluators.third_party.deepeval import (
    DeepEvalAdapter,
)


def my_deepeval_mapper(ev: EvaluatorInput) -> LLMTestCase:
    # EvaluatorInput.session_spans から任意のフィールドを取り出して LLMTestCase を組み立てる
    attrs = ev.session_spans[0]["attributes"]
    return LLMTestCase(
        input=attrs["user_query"],
        actual_output=attrs["response"],
    )


adapter = DeepEvalAdapter(
    metric=AnswerRelevancyMetric(threshold=0.7),
    custom_mapper=my_deepeval_mapper,
)


# Autoevals では metric.eval(**kwargs) に渡す辞書を返す
def my_autoevals_mapper(ev: EvaluatorInput) -> Dict[str, Any]:
    attrs = ev.session_spans[0]["attributes"]
    return {
        "input": attrs["question"],
        "output": attrs["answer"],
        "expected": "the expected answer",
    }
```

**ポイント:**

- デフォルトのスパンマッピングでは `reference_inputs` の内容が自動的に反映される。`expectedResponse` → `expected_output`、`expectedTrajectory` → `expected_tools`、`assertions` → `context`（`assertions` がなければ `retrieval_context` にフォールバック）というルールで、`ToolCorrectnessMetric` や `HallucinationMetric` などのグラウンドトゥルース付きメトリクスもそのまま動作する
- ツール呼び出しは `execute_tool` スパンから抽出されるため、`tools_called` / `expected_tools` を必要とする DeepEval の `ArgumentCorrectnessMetric` などにも対応する
- アダプタは内部で例外を握りつぶし、常に有効な `EvaluatorOutput` を返す設計になっている。マッピングに必要なフィールドが欠けている場合は `errorCode="MISSING_REQUIRED_FIELD"`、メトリクスの実行に失敗した場合は `errorCode="METRIC_ERROR"` として、`errorMessage` に原因を格納する
- DeepEval / Autoevals は既定で LLM ジャッジ（OpenAI）を呼び出すメトリクスが多いため、実行環境に `OPENAI_API_KEY` の設定が必要になる点に注意する

---

## バグ修正

### `serve_a2a()` が A2A コントラクトポート 9000 を必ず利用するように ([#615](https://github.com/aws/bedrock-agentcore-sdk-python/pull/615))

**修正前の挙動:**

- v1.19.0 で追加された「`serve_a2a()` が `PORT` 環境変数を参照する」挙動により、`PORT=8080` が設定された環境では A2A サーバーが 8080 で待ち受けてしまっていた
- AgentCore Runtime の A2A サービスコントラクトはコンテナポートを 9000 に固定しているため、実際にはランタイム側の 9000 に何もリッスンしておらず、全ての呼び出しがクライアント側のリードタイムアウト後に `HTTP 424 Failed Dependency` になる
- HTTP ランタイム用に `ENV PORT=8080` を設定し、同じイメージから A2A ランタイムも起動するといった構成で問題が顕在化していた

**修正内容:**

- `serve_a2a()` は汎用的な `PORT` ではなく、プロトコル専用の `A2A_PORT` 環境変数を参照するようになった
- 明示的な `port=` 引数がある場合はそちらが最優先。次いで `A2A_PORT` を参照し、どちらも未指定なら既定値 9000 で待ち受ける
- 解決されたポートが 9000 でない場合は警告ログを出力する。デプロイ済みランタイムでは 9000 以外で listen していると必ず失敗するため、原因不明の HTTP 424 を早期に検知できるようになった
- コントラクトポートは `A2A_CONTRACT_PORT` / `A2A_PORT_ENV` 定数として一元化されている

**使用例:**

```python
from bedrock_agentcore.runtime.a2a import serve_a2a
from your_agent import build_executor

if __name__ == "__main__":
    # 1. 明示指定: port=8888 が最優先（ローカル開発などで使用）
    #    serve_a2a(build_executor(), port=8888)
    #
    # 2. 環境変数: A2A_PORT=9003 uv run python main.py で 9003 番待ち受け
    #    （PORT ではなく A2A_PORT を使う点に注意）
    #
    # 3. どちらも未指定: 既定 9000 番で待ち受ける
    #    AgentCore Runtime にデプロイする場合は必ずこの状態にする
    serve_a2a(build_executor())
```

**移行方法:**

v1.19.0 で `PORT` を使って A2A サーバーのポートを切り替えていた場合は、環境変数名を `A2A_PORT` にリネームします。`PORT` へのフォールバックは意図的に設けられていないため、そのまま動作する期待はできません。ローカル開発で複数プロトコルを同じイメージから同時に起動する場合は、HTTP 用の `PORT=8080`、A2A 用の `A2A_PORT=9000`（あるいは代替ポート）のように、プロトコルごとに別々の環境変数で明示的に指定するのが推奨されます。

### サンプル / インテグレーションエージェントで入力バリデーションを追加 ([#612](https://github.com/aws/bedrock-agentcore-sdk-python/pull/612))

**修正内容:**

- サンプルおよびインテグレーションテスト用のエージェントで、`prompt` / `message` が文字列であることを検証する処理が追加された
- `entrypoint` および `AG-UI` のランタイムエントリポイントの docstring に「フレームワークへ入力を渡す前にアプリケーション側でバリデーションすべき」旨が追記された
- README のクイックスタートにも同様のバリデーション例が追加された

**使用例:**

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()


@app.entrypoint
def invoke(payload):
    # フレームワークに渡す前にアプリケーション側で入力を検証する
    prompt = payload.get("prompt")
    if not isinstance(prompt, str):
        return {"error": "prompt must be a string"}

    # ここで Strands / LangGraph などのエージェントを呼び出す
    return {"result": run_agent(prompt)}


if __name__ == "__main__":
    app.run()
```

## まとめ

このリリースは、AgentCore の評価フレームワークに DeepEval と Autoevals を「アダプタを差し込むだけ」で組み込めるようになったのが最大の目玉です。加えて、v1.19.0 で導入された `serve_a2a()` の `PORT` 対応が引き起こしていたコントラクトポート違反の問題が解消され、A2A ランタイムのデプロイ挙動が v1.18.0 以前と同じく安定した状態に戻っています。
