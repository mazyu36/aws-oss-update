---
title: "tools v0.2.16"
version: "v0.2.16"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-11-18
summary: "MongoDB Atlas Memory ツールの追加、Code Interpreter のセッション永続化、cron ツールのセキュリティ修正を含むアップデート。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.16"
---

## 概要

このリリースでは、MongoDB Atlas を使ったセマンティックメモリ管理ツールの追加、Code Interpreter のセッション永続化機能、そして cron ツールの重要なセキュリティ修正が含まれています。これらの機能により、メモリ管理の選択肢が広がり、Code Interpreter の性能が大幅に向上し、セキュリティが強化されました。

**リリース:** [v0.2.16](https://github.com/strands-agents/tools/releases/tag/v0.2.16)

## 新機能

### MongoDB Atlas Memory Tool ([#281](https://github.com/strands-agents/tools/pull/281))

**この機能でできること:**
MongoDB Atlas をバックエンドとして使用したセマンティックメモリ管理ツールです。Amazon Bedrock Titan を使った自動埋め込み生成により、ベクトル類似度検索を用いたセマンティック検索が可能になります。名前空間によるメモリの整理、ページネーション、包括的なエラーハンドリングなど、本格的なメモリ管理機能を提供します。

**使用例:**

```python
from strands_tools.mongodb_memory import mongodb_memory

# MongoDB Atlas Memory ツールの初期化
memory_tool = mongodb_memory(
    mongodb_connection_string="mongodb+srv://user:pass@cluster.mongodb.net/",
    database_name="agent_memory",
    collection_name="memories",
    namespace="user123"
)

# メモリの記録
result = memory_tool.record(
    input_text="ユーザーは Python と機械学習に興味があります",
    metadata={"category": "preferences"}
)

# セマンティック検索でメモリを取得
memories = memory_tool.retrieve(
    query="プログラミングの興味",
    max_results=5
)

# 名前空間内のすべてのメモリをリスト表示
all_memories = memory_tool.list(limit=10)

# 特定のメモリを取得
specific_memory = memory_tool.get(memory_id="...")

# メモリの削除
memory_tool.delete(memory_id="...")
```

**ポイント:**
- Amazon Bedrock Titan v2 embeddings（1024 次元、コサイン類似度）を使用
- `$vectorSearch` 集約パイプラインによる MongoDB Atlas Vector Search のサポート
- マルチテナントシナリオに対応した名前空間ベースのデータ分離
- skip/limit パターンによるページネーションサポート
- 27 個のユニットテストで完全にカバーされた実装
- ベクトル検索インデックスの自動作成と設定

---

### Code Interpreter のセッション永続化と再接続 ([#308](https://github.com/strands-agents/tools/pull/308))

**この機能でできること:**
AgentCore Code Interpreter の統合が強化され、長時間実行される AgentCore ランタイムでの複数の呼び出しにまたがる自動セッション永続化と再接続をサポートします。これにより、セッションライフサイクルの不一致が解消され、ツール実行の失敗が防止され、パフォーマンスが 69-72% 向上します。

**使用例:**

```python
from strands_tools.code_interpreter import AgentCoreCodeInterpreter

# セッション永続化と検証を有効化（デフォルト）
code_interpreter = AgentCoreCodeInterpreter(
    session_name="my-agent-session",
    persist_sessions=True,  # セッションのクリーンアップを防ぐ
    verify_session_before_use=True,  # セッション検証と再接続を有効化
    auto_create=True
)

# 最初の呼び出し: セッションが作成される
result1 = code_interpreter.execute_code("x = 42")

# 2 回目の呼び出し: 既存のセッションに自動的に再接続
# 新しい AgentCoreCodeInterpreter インスタンスでも同じセッションを使用
code_interpreter2 = AgentCoreCodeInterpreter(
    session_name="my-agent-session",
    persist_sessions=True,
    verify_session_before_use=True
)

# 前回の変数にアクセス可能
result2 = code_interpreter2.execute_code("print(x)")  # 出力: 42
```

**ポイント:**
- `persist_sessions` フラグでセッションの早期クリーンアップを防止
- `verify_session_before_use` フラグでセッション検証と再接続を実行
- `list_sessions()` API を使った名前マッチングによるセッション発見
- AWS CodeInterpreter の制約に対応したセッション名の検証とクリーニング
- 信頼性の高いセッションルックアップのためのセッション名-ID マッピングの保存
- マルチターン会話でのツール失敗率 0% を達成
- 短命な Python オブジェクトと長寿命な AgentCore セッション間のライフサイクル不一致を解決

---

## バグ修正

### cron ツールの説明文のサニタイズ ([#315](https://github.com/strands-agents/tools/pull/315))

`cron` ツールの脆弱性が修正されました。description パラメータ内のサニタイズされていない改行文字により、追加の cron エントリが挿入される可能性がありました。例えば、「backup job\n0 * * * * rm -rf /」のような悪意のある説明文は、1 つではなく 2 つの cron エントリを作成してしまいます。

この修正では、正規表現を使用して改行をスペースに置き換える `_sanitize_description()` 関数が追加され、`add_job()` および `edit_job()` 関数でサニタイズが適用されます。また、一貫性のために ruff バージョンが sdk-python リポジトリと同期されました。

**影響を受けていた状況:**
- 改行文字を含む cron ジョブの説明文を使用していた場合
- 外部入力から cron ジョブの説明文を生成していた場合

---

## まとめ

v0.2.16 は、MongoDB Atlas による新しいメモリ管理オプション、Code Interpreter のパフォーマンスと信頼性の大幅な向上、そして重要なセキュリティ修正を提供します。これらの改善により、エージェントアプリケーションの開発がより安全で効率的になりました。
