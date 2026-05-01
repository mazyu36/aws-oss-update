---
title: "tools v0.2.12"
version: "v0.2.12"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-10-17
summary: "retrieve ツールのメタデータ出力サポート、Mem0 に Neptune Analytics と Neptune DB のバックエンド対応、AgentCore ブラウザの永続コンテキスト使用によるブラウザ拡張機能の修正を追加。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.12"
---

## 概要

Strands Agents Tools v0.2.12 では、retrieve ツールにメタデータ出力の設定可能なオプションを追加、Mem0 メモリツールに Neptune Analytics と Neptune DB のバックエンドサポートを追加、AgentCore ブラウザで永続コンテキストを使用することでブラウザ拡張機能が正常に動作するようになりました。

**リリース:** [v0.2.12](https://github.com/strands-agents/tools/releases/tag/v0.2.12)

## 新機能

### retrieve ツールに設定可能なメタデータ出力機能を追加 ([#283](https://github.com/strands-agents/tools/pull/283))

**この機能でできること:**
- retrieve ツールの応答にメタデータを含めることができるようになりました。enableMetadata パラメータまたは環境変数を使用して、検索結果のメタデータを取得できます。

**使用例:**

```python
from strands_tools import retrieve

# メタデータを有効化して検索
result = retrieve(
    query="エージェントシステムについて",
    enableMetadata=True
)

# または環境変数で設定
import os
os.environ["RETRIEVE_ENABLE_METADATA"] = "true"

result = retrieve(query="エージェントシステムについて")

# 結果にはメタデータフィールドが含まれます
# - score: 類似度スコア
# - location: ドキュメントの場所
# - type: ドキュメントのタイプ
# など、その他のメタデータ
```

**ポイント:**
- デフォルトではメタデータは無効（後方互換性を維持）
- 環境変数 `RETRIEVE_ENABLE_METADATA` でデフォルト動作を設定可能
- メタデータには類似度スコア、ドキュメントの場所、タイプなどが含まれます

---

### Mem0 メモリに Neptune Analytics のベクトルバックエンドサポートを追加 ([#262](https://github.com/strands-agents/tools/pull/262))

**この機能でできること:**
- Mem0 メモリツールで、ベクトルストアのバックエンドとして Neptune Analytics を使用できるようになりました。既存の Faiss などのバックエンドに加え、AWS Neptune Analytics でスケーラブルなベクトル検索が可能です。

**使用例:**

```python
from strands_tools.mem0_memory import Mem0Memory

# Neptune Analytics をベクトルバックエンドとして設定
memory = Mem0Memory(
    vector_store={
        "provider": "neptune_analytics",
        "config": {
            "graph_identifier": "your-neptune-graph-id",
            "region": "us-east-1"
        }
    },
    embedder={
        "provider": "openai",
        "config": {
            "model": "text-embedding-ada-002"
        }
    }
)

# メモリを使用
memory.add(
    messages=[{"role": "user", "content": "私の名前は太郎です"}],
    user_id="user123"
)

# 検索
results = memory.search(query="ユーザーの名前は？", user_id="user123")
```

**ポイント:**
- Neptune Analytics の強力なグラフデータベース機能を活用
- 複数のベクトルバックエンドを同時に設定した場合はエラーを返します
- Mem0 の設定オブジェクト作成ロジックが柔軟性向上のため改善されました

---

### Mem0 メモリに Neptune DB のグラフバックエンドサポートを追加 ([#272](https://github.com/strands-agents/tools/pull/272))

**この機能でできること:**
- Mem0 メモリツールで、グラフストアのバックエンドとして Neptune DB を使用できるようになりました。関係性の高いメモリ管理が可能になります。

**使用例:**

```python
from strands_tools.mem0_memory import Mem0Memory

# Neptune DB をグラフバックエンドとして設定
memory = Mem0Memory(
    graph_store={
        "provider": "neptune",
        "config": {
            "cluster_endpoint": "your-neptune-cluster.amazonaws.com",
            "region": "us-east-1",
            "port": 8182
        }
    },
    embedder={
        "provider": "openai",
        "config": {
            "model": "text-embedding-ada-002"
        }
    }
)

# メモリを追加
memory.add(
    messages=[{"role": "user", "content": "私は東京に住んでいます"}],
    user_id="user123"
)

# 新しく追加されたグラフ関係が結果に含まれます
```

**ポイント:**
- Neptune DB を使用することで、メモリ間の関係性をグラフ構造で管理できます
- 新しく追加されたグラフリレーションの結果が出力されるように改善されました
- Faiss バックエンドがコサイン類似度を返すように変更されました

---

## バグ修正

### AgentCore ブラウザで永続コンテキストを使用 ([#288](https://github.com/strands-agents/tools/pull/288))

**修正内容:**
- AgentCore ブラウザで非永続コンテキストを使用していたため、ブラウザ拡張機能が正常に動作しない問題を修正しました。永続コンテキストを使用することで、セッション記録などの拡張機能が正しく動作するようになりました。

**影響を受けていた状況:**
- Playwright を使用して AgentCore ブラウザに接続した際、`browser.newContext()` で作成したコンテキストではブラウザ拡張機能が非アクティブになっていました
- セッション記録機能（DOM イベントキャプチャ）が動作しませんでした
- エラーメッセージは表示されず、動作が異なるだけでした

---

## まとめ

v0.2.12 は、retrieve ツールのメタデータ出力機能、Mem0 メモリでの Neptune Analytics と Neptune DB サポート、AgentCore ブラウザの拡張機能修正という、実用性の高い機能追加とバグ修正を含むリリースです。
