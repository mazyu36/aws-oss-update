---
title: "AgentCore Python SDK v1.6.0 リリース解説"
version: "v1.6.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-03-31
summary: "カスタムコードベース評価器用のデコレーターと型付きモデルを追加。Lambda 関数として評価ロジックを簡単に実装できるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.0"
---

## 概要

このリリースでは、Bedrock AgentCore の評価機能向けにカスタムコードベース評価器を作成するための `@custom_code_based_evaluator()` デコレーターと、`EvaluatorInput` / `EvaluatorOutput` の Pydantic モデルが追加されました。これにより、型安全な Lambda 関数として評価ロジックを簡単に実装できます。

**リリース:** [v1.6.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.0)

## 新機能

### カスタムコードベース評価器デコレーター ([#383](https://github.com/aws/bedrock-agentcore-sdk-python/pull/383))

**この機能でできること:**
- Python 関数を Lambda ハンドラーとしてラップし、Bedrock AgentCore 評価サービスと連携するカスタム評価器を作成できます
- 型付きの入出力モデルにより、安全で保守しやすい評価ロジックを実装できます

**使用例:**

```python
from bedrock_agentcore.evaluation import (
    custom_code_based_evaluator,
    EvaluatorInput,
    EvaluatorOutput,
)


@custom_code_based_evaluator()
def handler(input: EvaluatorInput, context) -> EvaluatorOutput:
    """カスタム評価ロジックを実装する Lambda ハンドラー"""
    
    # セッション span から評価対象のデータを取得
    session_spans = input.session_spans
    evaluation_level = input.evaluation_level  # "SESSION", "TRACE", or "TOOL_CALL"
    
    # 評価ロジックを実装
    # 例: span 数に基づく簡単なスコアリング
    score = min(len(session_spans) / 10.0, 1.0)
    label = "Pass" if score >= 0.5 else "Fail"
    
    return EvaluatorOutput(
        value=score,
        label=label,
        explanation=f"評価対象の span 数: {len(session_spans)}"
    )
```

**EvaluatorInput の属性:**

| 属性 | 型 | 説明 |
|------|-----|------|
| `evaluation_level` | `str` | 評価の粒度（"SESSION", "TRACE", "TOOL_CALL"） |
| `session_spans` | `List[Dict]` | 評価サービスからの ADOT span データ |
| `target_trace_id` | `Optional[str]` | 対象のトレース ID（TRACE レベル時に設定） |
| `target_span_id` | `Optional[str]` | 対象の span ID（TOOL_CALL レベル時に設定） |
| `schema_version` | `str` | Lambda コントラクトのスキーマバージョン |

**EvaluatorOutput の属性:**

| 属性 | 型 | 説明 |
|------|-----|------|
| `value` | `Optional[float]` | 評価の数値スコア |
| `label` | `str` | カテゴリラベル（例: "Pass", "Fail"）**必須** |
| `explanation` | `Optional[str]` | 評価結果の説明 |
| `errorCode` | `Optional[str]` | エラーコード（評価失敗時） |
| `errorMessage` | `Optional[str]` | エラーメッセージ（評価失敗時） |

**ポイント:**
- デコレーターは必ず括弧付きで呼び出す: `@custom_code_based_evaluator()`
- 戻り値は必ず `EvaluatorOutput` 型である必要があります（型チェックが自動的に行われます）
- `.unwrapped` 属性を使用すると、Lambda イベントのオーバーヘッドなしで評価関数をユニットテストできます:

```python
# ユニットテスト例
from bedrock_agentcore.evaluation import EvaluatorInput, EvaluatorOutput

def test_handler():
    test_input = EvaluatorInput(
        evaluation_level="SESSION",
        session_spans=[{"traceId": "abc123"}],
    )
    
    # .unwrapped で元の関数に直接アクセス
    result = handler.unwrapped(test_input, None)
    
    assert isinstance(result, EvaluatorOutput)
    assert result.label in ["Pass", "Fail"]
```

## まとめ

このリリースでは、Bedrock AgentCore の評価機能を拡張するためのカスタムコードベース評価器フレームワークが追加されました。型安全な API により、Lambda 関数として独自の評価ロジックを簡単に実装できます。
