---
title: "AgentCore Python SDK v1.0.7 リリース解説"
version: "v1.0.7"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2025-11-25
summary: "Short-Term Memory のメタデータサポートドキュメント追加、OAuth2 トークン取得時のカスタムパラメータ対応、複数ネームスペース からのメモリ取得の並列化によるパフォーマンス向上が含まれています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.7"
---

## 概要

このリリースでは、Short-Term Memory のメタデータサポートに関するドキュメント追加、OAuth2 トークン取得時のカスタムパラメータ対応、複数ネームスペースからのメモリ取得の並列化によるパフォーマンス向上が含まれています。

**リリース:** [v1.0.7](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.7)

## 新機能

### Short-Term Memory のメタデータサポートドキュメント追加 ([#156](https://github.com/aws/bedrock-agentcore-sdk-python/pull/156))

**この機能でできること:**
- Short-Term Memory (STM) でメタデータをサポートする方法についてのドキュメントが追加されました。セッション内のすべてのイベントとセッション内のブランチに関連するイベントにわたって、メタデータの作成とフィルタリングのワークフローが含まれています。

**使用例:**

詳細なワークフロー例は、新しく追加された [metadata-workflow.ipynb](https://github.com/aws/bedrock-agentcore-sdk-python/blob/v1.0.7/src/bedrock_agentcore/memory/metadata-workflow.ipynb) をご参照ください。

**ポイント:**
- セッション全体およびブランチ単位でのメタデータフィルタリングが可能です
- Jupyter Notebook 形式で詳細なワークフロー例が提供されています

---

### OAuth2 トークン取得時のカスタムパラメータ対応 ([#157](https://github.com/aws/bedrock-agentcore-sdk-python/pull/157))

**この機能でできること:**
- SDK デコレータを通じて `GetResourceOauth2Token` API にカスタムパラメータを渡すことができるようになりました。Slack などの IdP で使用される非標準の OAuth2 パラメータ（RFC 標準の `scopes` ではなく `user_scopes` など）をサポートします。

**使用例:**

```python
from bedrock_agentcore.identity.auth import authenticate

# Slack のような非標準 OAuth2 パラメータを使用する IdP に対応
@authenticate(
    resource_id="slack-resource",
    custom_parameters={
        "user_scopes": "channels:read,chat:write"  # Slack 固有のパラメータ
    }
)
def my_slack_action():
    # Slack API を使用したアクション
    pass
```

**ポイント:**
- RFC 6749 で定義されていない非標準 OAuth2 パラメータに対応
- Slack などのプラットフォーム固有の OAuth2 実装をサポート
- Bot アクションで `user_scopes` を使用する際のブロッカーが解消されました

---

### 複数ネームスペースからのメモリ取得の並列化 ([#163](https://github.com/aws/bedrock-agentcore-sdk-python/pull/163))

**この機能でできること:**
- 複数のネームスペースからメモリを取得する際に、`ThreadPoolExecutor` を使用して並列処理を行うことでレイテンシが大幅に改善されました。以前は順次処理されていたため、すべての API 呼び出しの合計時間がかかっていましたが、並列化により最も遅い呼び出しの時間まで短縮されます。

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import SessionManager

session_manager = SessionManager(
    session_id="example-session",
    namespaces=["namespace1", "namespace2", "namespace3"]
)

# 内部的に並列処理でメモリ取得が実行され、レイテンシが改善される
context = session_manager.retrieve_customer_context(query="user question")
```

**ポイント:**
- 複数ネームスペース設定時のレスポンス時間が大幅に改善
- ネームスペース単位でエラーハンドリングが実装され、1つのネームスペースで失敗しても他のネームスペースからの取得は継続されます（Graceful Degradation）
- 手動テストによりトレースで並列実行が確認されています

## バグ修正

### メタデータワークフロー README リンク修正 ([#171](https://github.com/aws/bedrock-agentcore-sdk-python/pull/171))
- Short-Term Memory のメタデータワークフローサポートに関する README のリンクが壊れていたため修正されました

## まとめ

このリリースでは、OAuth2 の柔軟性向上、パフォーマンス改善、ドキュメント充実化が行われ、より実用的で高性能な SDK となっています。
