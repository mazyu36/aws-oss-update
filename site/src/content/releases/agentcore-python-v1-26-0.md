---
title: "AgentCore Python SDK v1.26.0 リリース解説"
version: "v1.26.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-11-10
summary: "WebSearchClient から新しい Web Search API (InvokeWebSearch) を直接呼び出せるようになりました。Gateway を介さずに Web 検索が可能になり、クライアント側で固定フィルタや UTC 対応の日付バウンドも扱えます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.26.0"
---

## 概要

このリリースの最大の目玉は、`WebSearchClient` が bedrock-agentcore データプレーンの新 API である `InvokeWebSearch` をネイティブに呼び出せるようになった点です。これまで Web 検索は Gateway 経由でしか行えませんでしたが、本リリースから Gateway を介さず直接 API を利用できます。あわせて、クライアントレベルで固定可能なフィルタや、パースされた日時プロパティ (`published_at` / `acquired_at`) といった、実運用で有用な拡張も入っています。

**リリース:** [v1.26.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.26.0)

## 新機能

### WebSearchClient から Web Search API (InvokeWebSearch) を直接呼び出せるように ([#738](https://github.com/aws/bedrock-agentcore-sdk-python/pull/738))

**この機能でできること:**

- `WebSearchClient` を Gateway 設定なしで初期化すると、新しい `InvokeWebSearch` API を使って Web 検索を実行できます。
- 既存の Gateway 経由の挙動（`gateway_id` / `gateway_arn` / `gateway_endpoint` を指定した場合）は従来どおりで、破壊的変更はありません。
- クライアント側に設定した `include_domains` / `exclude_domains` / `published_after` / `published_before` が「固定フィルタ」として扱われ、個別の `search()` 呼び出しは条件を狭めることはできても広げることはできません。モデルから制御を切り離したいポリシーを適用する用途に向きます。
- 検索結果 (`WebSearchResult`) にタイムゾーン対応の `datetime` として `published_at` / `acquired_at` が追加されました（API の ISO 8601 形式と Gateway コネクタのロケール依存文字列の両方をパース）。

**使用例 — API バックエンドでの基本利用:**

```python
from bedrock_agentcore.tools import WebSearchClient

# gateway_id などを指定しないので、新しい InvokeWebSearch API を使う
# web_search_id のデフォルトは "web-search.v1"
client = WebSearchClient(region="us-east-1")

response = client.search("aws news this week", max_results=5)
for result in response:
    # published_at / acquired_at は tz-aware な datetime (UTC)
    print(result.published_at, result.title, result.url)
```

**使用例 — クライアントレベルで固定フィルタを設定する:**

```python
from datetime import datetime, timezone
from bedrock_agentcore.tools import WebSearchClient

# クライアントに設定したフィルタは「上限」として機能する
# ここで指定した include/exclude や日付条件を、呼び出し側は広げられない
client = WebSearchClient(
    region="us-east-1",
    include_domains=["aws.amazon.com", "docs.aws.amazon.com"],
    exclude_domains=["example.com"],
    published_after=datetime(2026, 1, 1, tzinfo=timezone.utc),
    published_before=datetime(2026, 12, 31, tzinfo=timezone.utc),
)

# search() の include は client の include と等しいか、
# そのサブドメインである場合のみ有効 (大文字小文字は区別しない)
# マッチしない場合は API 呼び出しを行わず空レスポンスを返す
response = client.search(
    "bedrock agentcore release notes",
    include_domains=["docs.aws.amazon.com"],  # client 側に含まれるので OK
    max_results=10,
)
```

**使用例 — Gateway 経由（従来どおり）:**

```python
from bedrock_agentcore.tools import WebSearchClient

# gateway_id を指定すると、以前と同じ Gateway 経由の挙動
client = WebSearchClient(
    region="us-east-1",
    gateway_id="your-gateway-id",
)
response = client.search("latest aws announcements", max_results=5)
```

**ポイント:**

- **API バックエンドの導入経路:** `WebSearchClient(region=...)` を Gateway 引数なしで作ると、以前は `ValueError` でしたが、本リリース以降は API バックエンド (`WebSearchApiBackend`) が自動選択されます。既存のコードで Gateway 引数を省略していたケースは存在しないため、互換性に影響はありません。
- **`web_search_id` オプション:** API バックエンド向けの新パラメータで、デフォルトは `"web-search.v1"`。
- **固定フィルタの挙動:**
  - `exclude_domains` は client と call を合算し、100 ドメインの上限は合算後にチェックされます。
  - `include_domains` は client の include と等しいか、そのサブドメインである場合のみ call 側の値が有効になります。一致しない場合は API を呼び出さず空レスポンスを返します（call の引数バリデーションは先に実行）。
  - `published_after` / `published_before` は、より厳しい方向にだけ狭められます。
  - client レベルの日付バウンドはコンストラクタ時に検証されます。
- **日付の扱い:**
  - API は UTC の日時のみ受け付けるため、オフセット付きで渡した値は自動的に UTC に変換されます。
  - 日付のみ (`date`) の `published_before` は、その日全体をカバーします（Gateway 経由と同じ挙動）。
  - 秒の端数 (fractional seconds) は保持されます。
  - Gateway コネクタ由来の `"05:00PM, Wednesday, October 28 2026, PDT"` 形式は、プロセスのロケールに依存せずパースされます。
- **スレッドセーフ:** boto3 クライアントがスレッドセーフであるため、`WebSearchApiBackend` はロックを持たず、1 つのクライアントで並行検索を扱えます。
- **エラー / タイムアウト:** API 経路では `ClientError`（例: `ThrottlingException`、`AccessDeniedException`）はそのまま伝播します。`timeout` は boto3 の connect / read タイムアウトに反映されます。
- **依存関係の下限:** `InvokeWebSearch` が公開された最初のバージョンに合わせて、`boto3` / `botocore` の下限が **1.43.127** に引き上げられています。
- **既知リージョン:** `KNOWN_API_REGIONS` が追加され、未対応リージョン指定時には警告のみ発出されます（`KNOWN_REGIONS` と同じ方針）。

## バグ修正

### Strands 統合の integration test と README で、プラグイン同梱の HTTP ツールを使うよう修正 ([#736](https://github.com/aws/bedrock-agentcore-sdk-python/pull/736))

- `strands-agents-tools` v0.9.0 で `strands_tools.http_request` が削除され、Payments の integration test が CI で失敗するようになっていた問題を修正しました。
- `AgentCorePaymentsPlugin` は、支払い対応の `http_request` ツールを自前で登録するため、テストおよび README のサンプルから旧来の `strands_tools.http_request` の import を除去しています。
- 修正はテストと README のみで、SDK のランタイムコード (`src/bedrock_agentcore/payments/`) 側には変更はありません。Strands + Payments プラグインを利用しているユーザーは、プラグインが登録する `http_request` をそのまま使えば問題ありません。

## まとめ

WebSearchClient の API ネイティブ対応により、Gateway のセットアップなしで Web 検索ツールを使えるようになった大きめのリリースです。固定フィルタや tz-aware な日時パースなど、運用面で嬉しい改善も入っています。利用時は `boto3` / `botocore` を 1.43.127 以上にアップデートしてください。
