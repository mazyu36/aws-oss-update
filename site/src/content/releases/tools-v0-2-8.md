---
title: "Strands Tools v0.2.8 リリース解説"
version: "v0.2.8"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-09-17
summary: "Knowledge Base Retrieve ツールの S3 URI サポート強化と、Mem0 Memory ツールのデフォルト設定時の環境変数対応を追加したバグ修正リリース。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.8"
---

## 概要

Strands Agents Tools v0.2.8 では、Knowledge Base Retrieve ツールの S3 URI 処理機能の向上と、Mem0 Memory ツールのデフォルト設定時の環境変数サポートが追加されました。これらの改善により、より柔軟で信頼性の高いツール利用が可能になります。

**リリース:** [v0.2.8](https://github.com/strands-agents/tools/releases/tag/v0.2.8)

## バグ修正

### Knowledge Base Retrieve ツールの S3 URI サポート強化 ([#249](https://github.com/strands-agents/tools/pull/249))

**修正内容:**
- Knowledge Base Retrieve ツールがドキュメント ID の抽出を強化し、S3 URI をサポートするようになりました
- ドキュメントのソースロケーション情報を含めるように改善されました

**影響を受けていた状況:**
- S3 URI からドキュメント ID を正しく抽出できないケースがありました
- ドキュメントの取得時にソースロケーション情報が欠落していました

**使用例:**

```python
from strands_tools import create_retrieve_tool

# Knowledge Base からドキュメントを取得
retrieve_tool = create_retrieve_tool(
    knowledge_base_id="your-kb-id",
    region_name="us-east-1"
)

# S3 URI を含むドキュメントの取得がサポートされるようになりました
# ソースロケーション情報も含まれます
result = await retrieve_tool(
    query="検索クエリ",
    number_of_results=5
)

# 結果にはドキュメントのソース情報が含まれます
for doc in result:
    print(f"Content: {doc['content']}")
    print(f"Source: {doc['source']}")  # S3 URI などのソース情報
```

---

### Mem0 Memory ツールのデフォルト設定時の環境変数サポート ([#251](https://github.com/strands-agents/tools/pull/251))

**修正内容:**
- Mem0 Memory ツールがデフォルト設定で初期化される際、コレクション名をハードコードされた 'mem0_memory' ではなく、環境変数から取得するようになりました
- AWS OpenSearch でコレクションを作成する際の検証エラーを回避できるようになりました

**影響を受けていた状況:**
- デフォルト設定で Mem0 Memory ツールを使用すると、'mem0_memory' という無効なコレクション名が AWS OpenSearch で使用されていました
- 環境変数で適切なコレクション名を指定しても、無視されていました

**使用例:**

```python
import os
from strands_tools import create_mem0_memory_tool

# 環境変数でコレクション名を設定
os.environ["MEM0_COLLECTION_NAME"] = "my-valid-collection"

# デフォルト設定で初期化
# コレクション名が環境変数から自動的に取得されます
memory_tool = create_mem0_memory_tool(
    # デフォルト設定を使用（明示的な collection_name 指定なし）
)

# AWS OpenSearch でも正常に動作します
result = await memory_tool(
    operation="add",
    messages=["重要な情報を記憶する"],
    user_id="user123"
)
```

**ポイント:**
- デフォルト設定使用時、MEM0_COLLECTION_NAME 環境変数が自動的に参照されます
- AWS OpenSearch などのサービスで有効なコレクション名を使用できるようになりました

---

## まとめ

v0.2.8 は、Knowledge Base Retrieve ツールの S3 URI 対応と Mem0 Memory ツールの環境変数サポートを改善した、品質向上中心のリリースです。これらの修正により、AWS サービスとの統合がより円滑になり、ドキュメント取得時のソース情報も充実しました。
