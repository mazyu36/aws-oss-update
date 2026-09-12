---
title: "AgentCore Python SDK v1.23.0 リリース解説"
version: "v1.23.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-09-11
summary: "サードパーティ評価メトリクスのための RAGAS アダプター、Gateway 向けの Web Search ターゲット作成ヘルパー、Amazon Web Search を呼び出す WebSearchClient が追加されました。また Runtime のシェルセッションのワイヤープロトコルが簡素化されています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.23.0"
---

## 概要

このリリースでは、サードパーティ評価フレームワークとして RAGAS メトリクスを AgentCore の Code-based Evaluator として利用可能にする `RAGASAdapter` が追加されました。また、Gateway 向けに Amazon Web Search 連携が強化され、ターゲット作成ヘルパー `create_web_search_target()` と Web Search を呼び出すクライアント `WebSearchClient` が新たに提供されます。加えて、Runtime のシェルセッションのワイヤープロトコルが簡素化されています。

**リリース:** [v1.23.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.23.0)

## 新機能

### RAGAS アダプターによるサードパーティ評価メトリクスのサポート ([#618](https://github.com/aws/bedrock-agentcore-sdk-python/pull/618))

**この機能でできること:**
- RAGAS の各メトリクス（Faithfulness、ContextPrecision、ToolCallAccuracy など）を AgentCore の Code-based Evaluator としてラップして利用できます。既存の `DeepEvalAdapter`、`AutoEvalsAdapter` と同じ `BaseAdapter` パターンに従います。
- バッチ `ragas.evaluate()` ではなく `single_turn_score()` / `multi_turn_score()` / `metric.score(**kwargs)` の per-sample API を用いるため、`datasets`/`pyarrow`/`pandas` に依存せず、サイズ制約のある Lambda 環境でもスリムな ragas ビルドと組み合わせて利用できます。

**使用例:**

```python
from bedrock_agentcore.evaluation.custom_code_based_evaluators import custom_code_based_evaluator
from bedrock_agentcore.evaluation.custom_code_based_evaluators.third_party.ragas import RAGASAdapter
from ragas.metrics import Faithfulness
from ragas.llms import LangchainLLMWrapper
from langchain_aws import ChatBedrockConverse

# 評価用 LLM を LangChain 経由で構築
eval_llm = LangchainLLMWrapper(ChatBedrockConverse(
    model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    region_name="us-east-1",
))

# RAGAS の Faithfulness メトリクスをアダプターでラップ
adapter = RAGASAdapter(metric=Faithfulness(), llm=eval_llm)

# AgentCore の Code-based Evaluator として登録
@custom_code_based_evaluator()
def handler(eval_input, context=None):
    return adapter(eval_input, context)
```

**ポイント:**
- **3 種類のディスパッチ**: レガシー single-turn メトリクス（Faithfulness、ExactMatch など）は `SingleTurnSample`、レガシー multi-turn メトリクス（ToolCallAccuracy、AgentGoalAccuracy など）は `MultiTurnSample`、コレクション / デコレーター系メトリクス（`ragas.metrics.collections`、`@discrete_metric`、`@numeric_metric`）は `metric.score(**fields)` で処理されます。
- **必須列の検証**: `metric.required_columns` を事前に検証し、不足時は ragas がサイレントに 0.0 を返すのではなく `MISSING_REQUIRED_FIELD` エラーコードとガイダンスを返します。
- **埋め込みコンテキストのパース**: ADOT のトレースフォーマットには reference answer / retrieval context の専用フィールドがないため、ユーザーメッセージ内の `\n\nReference Answer:\n` と `\n\nContext:\n` 区切りから抽出します。JSON シリアライズされたチャンクリストからランク情報も復元します。
- **Threshold のオーバーライド**: SemanticSimilarity のように `threshold=None` のメトリクスや、閾値を持たないコレクション系メトリクス向けに、アダプター側で `threshold=` を指定できます。
- **依存関係の制約**: `ragas>=0.4.3,<1.0.0`、`langchain-community>=0.3.0,<0.4.2` にピン留めされています（langchain-community 0.4.2 で `chat_models.vertexai` が削除され ragas <1.0 が壊れるため）。
- **エイリアス**: `RAGASAdapter` が正式クラス名ですが、`RagasAdapter` エイリアスも提供されます。

---

### Gateway: `create_web_search_target()` ヘルパーの追加 ([#656](https://github.com/aws/bedrock-agentcore-sdk-python/pull/656))

**この機能でできること:**
- Gateway に対して、マネージドな `web-search` コネクターをタイプ付き 1 コールで接続できます。既存の `create_knowledge_base_target()`（`bedrock-knowledge-bases`）や `create_agentic_retrieve_target()`（`bedrock-agentic-retrieve`）と同じ形状の API で、Web Search 用ターゲットを作成できるようになりました。
- 従来は `targetConfiguration.mcp.connector` ブロックや認証情報プロバイダー設定を手で組み立てる必要がありましたが、それらを内部でハンドリングします。

**使用例:**

```python
from bedrock_agentcore.gateway import GatewayClient

client = GatewayClient()

# 最小構成: exclude_domains を指定しない場合は parameterValues 自体が省略される
client.create_web_search_target(
    gateway_identifier="gw-123",
)

# ドメイン除外フィルターを設定する例
client.create_web_search_target(
    gateway_identifier="gw-123",
    exclude_domains=["example.com"],
    # name のデフォルトは "web-search"
    # 認証は GATEWAY_IAM_ROLE がデフォルト
    # 追加設定は **kwargs で上書き可能
    # wait_config も pass-through
)
```

**ポイント:**
- **送信されるリクエスト形状**: 内部では以下のような `targetConfiguration` が組み立てられ、`CreateGatewayTarget` に渡されます。
  - `source.connectorId`: `"web-search"`
  - `enabled`: `["WebSearch"]`
  - `configurations[].name`: `"WebSearch"`
  - `parameterValues.domainFilter.exclude`: 指定されたドメインリスト
  - `credentialProviderType`: `"GATEWAY_IAM_ROLE"`
- **オプション性**: `exclude_domains` が空または未指定の場合、`parameterValues` 自体を省略し `{"name": "WebSearch"}` のみを送信します。
- **既存 API との違い**: `create_gateway_target_and_wait()` でも同じターゲットは作成可能ですが、このヘルパーはコネクター ID・ツール名・パラメーターパスを知らなくてもよくなる点がメリットです。あくまでタイプ付きの利便性向上であり、新しい機能ではありません。
- **アカウント要件**: `web-search` コネクターはアカウントごとに有効化が必要です。無効なアカウントで呼び出すと `ValidationException: Connector integration web-search is not available for this account.` が返ります。

---

### `WebSearchClient` による Amazon Web Search の呼び出し ([#658](https://github.com/aws/bedrock-agentcore-sdk-python/pull/658))

**この機能でできること:**
- Gateway 経由で Amazon Web Search のツールを Python から直接呼び出せる `WebSearchClient` が `bedrock_agentcore.tools` に追加されました。従来、MCP クライアント以外からは SigV4 署名付きの MCP ハンドシェイクを自前実装する必要がありましたが、その手間が不要になります。
- MCP streamable HTTP のうち検索 1 コールに必要なスライス（`initialize` → `notifications/initialized` → 任意で `tools/list` → `tools/call`）を `urllib3` と `botocore.auth.SigV4Auth` だけで実装しており、新規依存はありません。

**使用例:**

```python
from bedrock_agentcore.tools import WebSearchClient

# gateway_id を指定してクライアントを初期化
client = WebSearchClient(region="us-east-1", gateway_id="my-gateway-abc123")

# シンプルな検索
for result in client.search("what is amazon bedrock agentcore", max_results=5):
    # WebSearchResult は url / title / text / published_date を保持する
    # （利用規約上、ソース引用とリンクを保持する必要があるため）
    print(result.title, result.url)

# target_name を渡すとツール名解決の tools/list ラウンドトリップを省略できる
# Gateway ではツール名が "<targetName>___WebSearch" になるため
client_with_target = WebSearchClient(
    region="us-east-1",
    gateway_id="my-gateway-abc123",
    target_name="my-web-search-target",
)
```

**ポイント:**
- **入力バリデーション**: `query` は必須で 200 文字まで、`max_results` は 1〜25 に制限されます（Web Search ツールスキーマ準拠）。
- **ツール名解決**: Gateway では各ツール名にターゲット名が三連アンダースコアで前置されます（`<targetName>___WebSearch`）。`target_name` を渡せば直接生成でき、指定しない場合は `tools/list` を（`nextCursor` に従って）ページングしながら WebSearch ツールを検出します。複数ターゲットが WebSearch を露出している場合は明示的なエラーになります。
- **2 種類のレスポンスフレーミング対応**: Gateway は `application/json` または `text/event-stream` で応答するため、いずれもパース可能です。
- **セキュリティ**: `get_gateway_mcp_endpoint` は Gateway 識別子を DNS ラベルとして検証してからホスト名に埋め込むため、細工された識別子で AWS 外へリダイレクトされることを防ぎます。`connection` ヘッダーは署名対象から除外されます（含めると署名不一致になるため）。
- **利用可能リージョン**: `us-east-1`、`eu-west-1`、`ap-northeast-1` で提供されており、それ以外のリージョンから呼び出した場合は例外にならず警告ログのみ出力されます（SDK 定数の陳腐化で将来的な新リージョン対応がブロックされないようにするため）。
- **IAM 権限**: 呼び出し元は Gateway ARN に対する `bedrock-agentcore:InvokeGateway` が必要、Gateway サービスロールは コネクターに対する `bedrock-agentcore:InvokeWebSearch` が必要です。
- **フィルター**: `domainFilter`（include / exclude、各 100 ドメイン）や `publishedDateFilter`（ISO-8601 UTC、inclusive）はコネクターバージョン 1.2.0 以降で利用可能です。request 単位の include は target 単位の include と積集合を取るため、disjoint な場合は結果が空になります。

## バグ修正

### Runtime: シェルセッションのワイヤープロトコルの更新 ([#642](https://github.com/aws/bedrock-agentcore-sdk-python/pull/642))

- 接続ハンドシェイクを簡素化し、非推奨機能を削除しました。
- **メタデータフレームハンドシェイクの削除**: WebSocket 101 アップグレード直後に接続が確立された状態となり、`shellId` は STATUS フレームを待たずレスポンスヘッダーから読み取られます。これによりブロッキングだった `_read_metadata_frame()` と `_pending_frames` キューが不要になりました。
- **`encode_close()` フレームの削除**: `close()` は CLOSE フレームを送信しなくなりました。シェルはデタッチされ、再接続ウィンドウ中は生存し続けます。
- **`on_reconnect` コールバックの簡素化**: `reconnected: bool` 引数が渡されなくなり、コールバックは引数なしになります。
- **属性の削除**: メタデータフレームフロー廃止に伴い、`reconnected` と `bytes_dropped` 属性が削除されました。

`on_reconnect` を利用しているコードは、コールバックのシグネチャから `reconnected` 引数を除去する必要があります。

```python
# 変更前
def on_reconnect(reconnected: bool):
    ...

# 変更後
def on_reconnect():
    ...
```

## まとめ

このリリースは、評価 (RAGAS) と Web Search 連携（Gateway ターゲット作成 + クライアント）という 2 つの新しい統合面の追加が中心となる機能リッチなリリースです。Runtime シェルセッションのワイヤープロトコル簡素化も含まれるため、`on_reconnect` コールバックを利用中の場合はシグネチャの変更に注意してください。
