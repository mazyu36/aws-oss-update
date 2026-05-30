---
title: "Strands Tools v0.7.0 リリース解説"
version: "v0.7.0"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-05-29
summary: "elasticsearch_memory ツールの認証情報パラメータを廃止し、環境変数経由でのみ受け取るように変更されたリリースです。LLM 経由での認証情報指定を防ぐ破壊的変更が含まれています。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.7.0"
---

## 概要

このリリースでは、`elasticsearch_memory` ツールの関数シグネチャから `es_url`・`cloud_id`・`api_key` の各パラメータが削除され、Elasticsearch への接続情報および認証情報は環境変数経由でのみ提供する形に変更されました。LLM が制御するツール引数として認証情報を渡せなくする、セキュリティ目的の破壊的変更です。

**リリース:** [v0.7.0](https://github.com/strands-agents/tools/releases/tag/v0.7.0)

## 破壊的変更

### elasticsearch_memory の認証情報を環境変数に移行 ([#477](https://github.com/strands-agents/tools/pull/477))

`elasticsearch_memory` ツールでは、これまで `es_url`・`cloud_id`・`api_key` を関数引数として受け取り、引数で指定されない場合に環境変数 (`ELASTICSEARCH_URL`・`ELASTICSEARCH_CLOUD_ID`・`ELASTICSEARCH_API_KEY`) からフォールバックする実装でした。

このシグネチャでは LLM が引数として接続先 URL や API キーを生成・指定できてしまうため、ツール定義としては安全ではありません。本リリースで該当パラメータが関数シグネチャから完全に削除され、接続情報は環境変数からのみ読み込まれるように変更されました。

**変更前:**

```python
from strands import Agent
from strands_tools.elasticsearch_memory import elasticsearch_memory

agent = Agent(tools=[elasticsearch_memory])

# 引数として認証情報を渡せた
elasticsearch_memory(
    action="record",
    content="User prefers vegetarian pizza with extra cheese",
    metadata={"category": "food_preferences", "type": "dietary"},
    cloud_id="your-elasticsearch-cloud-id",
    api_key="your-api-key",
    index_name="memories",
    namespace="user_123",
)
```

**変更後:**

```python
import os
from strands import Agent
from strands_tools.elasticsearch_memory import elasticsearch_memory

# 接続情報・認証情報は環境変数で設定する
os.environ["ELASTICSEARCH_CLOUD_ID"] = "your-elasticsearch-cloud-id"
# もしくは serverless 接続の場合
# os.environ["ELASTICSEARCH_URL"] = "https://your-cluster.es.region.aws.elastic.cloud:443"
os.environ["ELASTICSEARCH_API_KEY"] = "your-api-key"

agent = Agent(tools=[elasticsearch_memory])

# 認証情報パラメータは指定不要
elasticsearch_memory(
    action="record",
    content="User prefers vegetarian pizza with extra cheese",
    metadata={"category": "food_preferences", "type": "dietary"},
    index_name="memories",
    namespace="user_123",
)
```

**移行方法:**

- `elasticsearch_memory(...)` 呼び出しから `es_url`・`cloud_id`・`api_key` の各キーワード引数を削除する
- 同等の値を以下の環境変数に設定する
  - `ELASTICSEARCH_CLOUD_ID`: Elasticsearch Cloud 接続用の Cloud ID（`ELASTICSEARCH_URL` と排他、どちらか一方を設定）
  - `ELASTICSEARCH_URL`: Elasticsearch serverless 接続用の URL（`ELASTICSEARCH_CLOUD_ID` と排他、どちらか一方を設定）
  - `ELASTICSEARCH_API_KEY`: Elasticsearch 認証用の API キー（必須）
- 該当パラメータをキーワード引数で渡し続けると `TypeError: unexpected keyword argument` が発生します

**ポイント:**

- `index_name`・`namespace`・`embedding_model` など、認証情報以外のパラメータは引き続き引数として指定可能です
- 環境変数の設定漏れは従来通り `"Either cloud_id or es_url is required"` および `"api_key is required"` としてエラーレスポンスが返されます
- 同様の意図で他のメモリ系ツールでも認証情報の引数指定が制限されている場合は、同じ運用に揃えることが推奨されます

## まとめ

このリリースは `elasticsearch_memory` ツール 1 件に対する破壊的変更ですが、LLM が接続先・認証情報を指定できるリスクを排除するセキュリティ目的の重要な変更です。引数で認証情報を渡している既存実装は、環境変数ベースへの移行が必須となります。
