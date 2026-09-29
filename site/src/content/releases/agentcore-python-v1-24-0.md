---
title: "AgentCore Python SDK v1.24.0 リリース解説"
version: "v1.24.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-09-28
summary: "Payments SDK の User-Agent 経由での利用元 attribution、AWS 中国リージョン (aws-cn) パーティション対応が追加されました。加えて Evaluation の span ヘルパー公開、`WaitConfig` の公開エクスポートと `region_name` エイリアス対応、Memory session manager の空ペイロード処理などのバグ修正が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.24.0"
---

## 概要

このリリースでは、Payments データプレーンが呼び出し元を計測できるように User-Agent に統合ソースを付与する仕組みと、AWS 中国 (`aws-cn`) パーティションへのエンドポイント対応という 2 つの新機能が追加されました。あわせて、Evaluation の span ヘルパーおよび evaluator level lookup の公開、Runtime クライアントの `WaitConfig` エクスポートと `region_name` エイリアス対応、Memory session manager の空ペイロード時のクラッシュ修正など、複数のバグ修正が含まれます。

**リリース:** [v1.24.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.24.0)

## 新機能

### Payments SDK の User-Agent 経由での利用元 attribution ([#669](https://github.com/aws/bedrock-agentcore-sdk-python/pull/669))

**この機能でできること:**
- `PaymentManager`（データプレーン）と `PaymentClient`（コントロールプレーン）が `integration_source` パラメーターを受け取れるようになり、boto3 の User-Agent に `integration_source=...; feature=payments` として付与されます。これにより Payments データプレーンがリクエスト元のサーフェス（Strands / LangGraph / raw-sdk など）、バージョン、オペレーションを計測できます。
- Strands プラグインは `integration_source="strands"`、LangGraph ミドルウェアは `integration_source="langgraph"` を自動設定し、直接 SDK を使う場合はデフォルトの `raw-sdk` が使われます。呼び出し元から新たに送信されるデータはありません。

**使用例:**

```python
from bedrock_agentcore.payments import PaymentManager, PaymentClient

# デフォルト (raw-sdk) で利用
manager = PaymentManager()

# 独自のインテグレーションソースを付与
manager = PaymentManager(integration_source="my-app")

# コントロールプレーン側も同様
client = PaymentClient(integration_source="my-app")

# Strands / LangGraph の統合を使う場合は自動的に付与されるため
# 明示的な指定は不要
```

**ポイント:**
- **User-Agent の形式**: `bedrock-agentcore/X.Y.Z (integration_source=strands; feature=payments)` の形で付与されます。`feature` トークンは新たに `build_user_agent_suffix` のオプション引数として追加されました。
- **デフォルト値**: `integration_source` を指定しない場合は `raw-sdk` として扱われます。
- **サニタイズ**: 不正な文字を含む値は User-Agent 仕様に沿ってサニタイズされます。
- **プライバシー**: 目的は呼び出し元のサーフェス／バージョン／オペレーションの集計であり、リクエストペイロードなど新規データの送信は行われません。

---

### AWS 中国 (aws-cn) パーティション対応 ([#684](https://github.com/aws/bedrock-agentcore-sdk-python/pull/684))

**この機能でできること:**
- SDK が `aws-cn` パーティションに対応し、`cn-north-1` / `cn-northwest-1` において data / control / gateway の各エンドポイントが `amazonaws.com.cn` サフィックスで解決されます。これまで `.amazonaws.com` がハードコードされていたため、中国リージョンでは正しくエンドポイントに到達できませんでした。
- エンドポイントの DNS サフィックスは botocore の partition データから動的に導出されるため、将来のパーティション追加にも追従します。既存の商用パーティションの挙動は変わりません。

**使用例:**

```python
from bedrock_agentcore.runtime import AgentCoreRuntimeClient
from bedrock_agentcore.payments import PaymentManager

# 中国リージョンを指定すると *.amazonaws.com.cn に接続される
runtime_client = AgentCoreRuntimeClient(region="cn-north-1")

# Payments も同様にパーティション対応
manager = PaymentManager(region="cn-northwest-1")

# 環境変数によるエンドポイントオーバーライドはこれまで通り有効
# BEDROCK_AGENTCORE_CP_ENDPOINT / BEDROCK_AGENTCORE_DP_ENDPOINT
```

**ポイント:**
- **パーティション認識のサフィックス解決**: `_utils/endpoints.py` に、botocore の公開 `EndpointResolver` をキャッシュして DNS サフィックスを取得する実装が入りました。未知のリージョンを指定した場合はサイレントにフォールバックせず、警告を出します。
- **有効パーティションの判定**: `runtime/utils.py` の `is_valid_partition` は botocore のパーティションリストに基づくようになりました。
- **エンドポイントオーバーライド**: `BEDROCK_AGENTCORE_CP_ENDPOINT` / `BEDROCK_AGENTCORE_DP_ENDPOINT` による明示オーバーライドは引き続き尊重され、指定がない場合のみパーティションから解決されます。
- **影響範囲**: Runtime (`a2a.py` の `build_runtime_url` を含む)、Payments (`client.py` / `manager.py`)、Config Bundle、Batch Evaluation Runner がパーティション対応の対象です。
- **ハードコード防止**: `.pre-commit-config.yaml` に、補間値直後の `.amazonaws.com` サフィックスを禁止する pygrep フックが追加されました。
- **検証済みリージョン**: `cn-north-1` / `cn-northwest-1` / `us-east-1` でランタイム CP/DP（`InvokeAgentRuntime` を含む）、ツール（Browser / Code Interpreter の CP+DP）、Gateway CP + MCP URL、Identity CP のライブ動作が確認されています。

## バグ修正

### Evaluation の span ヘルパーおよび evaluator level lookup を公開 ([#674](https://github.com/aws/bedrock-agentcore-sdk-python/pull/674))

- Evaluation の span を読む消費側コードが、これまでプライベートな SDK ヘルパーまたはその複製実装に依存していた問題を解消します。
- `bedrock_agentcore.evaluation.spans` および `bedrock_agentcore.evaluation` パッケージから `is_tool_span` / `tool_span_ids` / `trace_ids` を公開しました。`EvaluationClient` と `OnDemandEvaluationDatasetRunner` はいずれもこの共有実装を通るようになります。
- `EvaluationClient.get_evaluator_level()` も公開 API になりました。既存のコントロールプレーンクライアントとキャッシュを再利用し、`SESSION` フォールバックとキャッシュ挙動は保たれます。

```python
from bedrock_agentcore.evaluation import (
    EvaluationClient,
    is_tool_span,
    tool_span_ids,
    trace_ids,
)

client = EvaluationClient()

# span ヘルパーを直接利用できる
spans = [...]  # OTEL/ADOT の span リスト
tool_ids = tool_span_ids(spans)
traces = trace_ids(spans)

# 評価レベルの取得も公開 API から可能
level = client.get_evaluator_level("my-evaluator")
```

---

### `WaitConfig` の公開エクスポートと `region_name` エイリアス対応 ([#675](https://github.com/aws/bedrock-agentcore-sdk-python/pull/675))

- `AgentCoreRuntimeClient` は `wait_config` を受け付けるにもかかわらず、`WaitConfig` を公開パッケージからインポートできない状態でした。加えて、他の SDK クライアントで一般的な `region_name` キーワードを渡すと `TypeError` になっていました。
- `WaitConfig` を `runtime` / `evaluation` / `gateway` / `knowledge_base` / `policy` の各パッケージから公開し、あわせて利用可能なクライアントとの同時 import を可能にしました。
- `AgentCoreRuntimeClient` と `BatchEvaluationRunner` が `region_name` エイリアスを受け付けるようになりました。既存の位置引数と region 選択順（明示的な `region` → `region_name` → 既存の session / デフォルトフォールバック）は保持されます。

```python
from bedrock_agentcore.runtime import AgentCoreRuntimeClient, WaitConfig

# WaitConfig を public API として import 可能
wait = WaitConfig(...)

# boto3 と同じ region_name キーワードで初期化できる
client = AgentCoreRuntimeClient(region_name="us-east-1", wait_config=wait)

# evaluation / gateway / knowledge_base / policy からも WaitConfig を import 可能
from bedrock_agentcore.evaluation import WaitConfig as EvalWaitConfig
from bedrock_agentcore.gateway import WaitConfig as GwWaitConfig
```

---

### Memory session manager の空ペイロード処理 ([#683](https://github.com/aws/bedrock-agentcore-sdk-python/pull/683))

- `AgentCoreMemorySessionManager.read_session` において、有効だが空のペイロードを持つイベントに対して `IndexError` が発生していた問題を修正します。
- 空ペイロードのイベントを検出した場合は legacy lookup にフォールバックし、legacy 側のイベントもペイロードを持たない場合は `None` を返すようになりました。セッション復元中のクラッシュを防ぎます。

---

### CI: flaky な sleep テストと互換性のある evaluation エラーの整理 ([#677](https://github.com/aws/bedrock-agentcore-sdk-python/pull/677))

- CI 上で flaky だった sleep 依存テストと、evaluation の互換性エラーに関する問題を整理しました。ランタイムの API 挙動には影響しません。

## まとめ

このリリースは、Payments SDK の User-Agent 経由での呼び出し元 attribution と AWS 中国パーティション対応という 2 つの機能追加に加え、Evaluation の内部ヘルパー公開、`WaitConfig` の公開エクスポートと `region_name` エイリアス対応、Memory session manager の空ペイロード時のクラッシュ修正といった、実利用でつまづきやすいポイントを解消するバグ修正が中心のリリースです。中国リージョンで AgentCore を利用するユーザーや、Runtime / Evaluation クライアントを直接扱っているユーザーにとってメリットが大きいアップデートです。
