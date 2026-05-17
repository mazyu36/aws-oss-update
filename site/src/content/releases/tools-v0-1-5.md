---
title: "Strands Tools v0.1.5 リリース解説"
version: "v0.1.5"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-06-09
summary: "sleep tool と batch tool の追加、memory tool での AWS リージョンカスタマイズサポート、Mem0 tool の設定オプション拡張など、複数の新機能とバグ修正が含まれています。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.1.5"
---

## 概要

このリリースでは、実行の一時停止を可能にする sleep tool、複数のツールを並列実行できる batch tool が追加されました。また、memory tool で AWS リージョンのカスタマイズが可能になり、Mem0 tool では複数のバックエンド設定がサポートされるようになりました。

**リリース:** [v0.1.5](https://github.com/strands-agents/tools/releases/tag/v0.1.5)

## 新機能

### Sleep Tool ([#60](https://github.com/strands-agents/tools/pull/60))

**この機能でできること:**
指定した秒数だけエージェントの実行を一時停止できます。SIGINT（Ctrl+C）での中断にも対応しています。

**使用例:**

```python
from strands import Agent
from strands_tools.sleep import sleep_tool

# エージェントに sleep tool を追加
agent = Agent(tools=[sleep_tool()])

# 5秒間スリープ
result = agent.run("5秒間待機してください")
```

**ポイント:**
- 長時間の処理の間に意図的な待機時間を挿入できます
- レート制限のある API 呼び出しの間隔調整に便利です
- Ctrl+C で中断可能なため、デバッグ時にも使いやすいです

---

### Batch Tool - 並列ツール実行 ([#46](https://github.com/strands-agents/tools/pull/46))

**この機能でできること:**
複数のツールを並列で実行し、それぞれの結果を取得できます。各ツールのエラーハンドリングも個別に行われます。

**使用例:**

```python
from strands import Agent
from strands_tools.batch import batch_tool
from strands_tools.calculator import calculator_tool
from strands_tools.file_read import file_read_tool

# 複数のツールを登録
agent = Agent(
    tools=[
        batch_tool(),
        calculator_tool(),
        file_read_tool()
    ]
)

# 複数のツールを並列実行
result = agent.run(
    "計算機で 10 + 20 を計算し、同時に README.md を読み取ってください"
)
```

**ポイント:**
- 複数の独立したタスクを効率的に処理できます
- 各ツール呼び出しのエラーは個別にキャプチャされ、詳細なトレースバック情報が提供されます
- すべての結果は JSON シリアライズ可能な形式で返されます

---

### Memory Tool - AWS リージョンカスタマイズ ([#57](https://github.com/strands-agents/tools/pull/57))

**この機能でできること:**
memory tool で使用する AWS リージョンをカスタマイズできるようになりました。

**使用例:**

```python
from strands import Agent
from strands_tools.memory import memory

# 特定のリージョンを指定
agent = Agent(
    tools=[memory(region_name="ap-northeast-1")]
)

# 東京リージョンの Knowledge Base を使用
result = agent.run("以前の会話内容を覚えていますか？")
```

**ポイント:**
- マルチリージョン展開時に、データ保存先のリージョンを明示的に指定できます
- デフォルトのリージョン以外を使用する場合に便利です
- テストでも region_name が正しく Knowledge Base クライアントに渡されることが検証されています

---

### Mem0 Tool - 複数のバックエンド設定サポート ([#16](https://github.com/strands-agents/tools/pull/16))

**この機能でできること:**
Mem0 tool が 3 つの異なるバックエンド設定をサポートするようになりました。

**使用例:**

```python
from strands import Agent
from strands_tools.mem0_memory import mem0_memory

# 1. Mem0 Platform を使用（本番環境推奨）
agent = Agent(
    tools=[mem0_memory(backend="mem0_platform", api_key="your-mem0-api-key")]
)

# 2. OpenSearch を使用（AWS 環境推奨）
agent = Agent(
    tools=[mem0_memory(
        backend="opensearch",
        opensearch_config={
            "endpoint": "https://your-opensearch-endpoint.amazonaws.com",
            "region": "us-east-1"
        }
    )]
)

# 3. FAISS を使用（ローカル開発用・デフォルト）
agent = Agent(
    tools=[mem0_memory(backend="faiss")]
)
```

**ポイント:**
- **Mem0 Platform**: 本番環境での使用に推奨。Mem0 API キーが必要です
- **OpenSearch**: AWS 環境での使用に推奨。AWS 認証情報と OpenSearch 設定が必要です
- **FAISS**: ローカル開発に推奨。faiss-cpu パッケージが必要です
- 環境に応じて最適なバックエンドを選択できます

---

## バグ修正

### use_llm の callback_handler 処理改善 ([#55](https://github.com/strands-agents/tools/pull/55))

`use_llm` ツールが `callback_handler` を正しく尊重するようになりました。以前は、親エージェントの `callback_handler` を変更しても、`use_llm` は常にデフォルトの callback_handler を使用していました。

**修正内容:**
- 引数として `callback_handler` が渡された場合はそれを使用
- 渡されない場合は親エージェントの `callback_handler` を使用
- どちらも利用できない場合はデフォルトにフォールバック

この修正により、カスタム callback_handler を使用する際の動作が一貫性を持つようになりました。

---

### file_read の冗長な Base64 エンコーディング削除 ([#53](https://github.com/strands-agents/tools/pull/53))

`file_read` ツールでファイルコンテンツが二重にエンコードされていた問題を修正しました。

**問題:**
AWS SDK は自動的にバイナリコンテンツを Base64 エンコードしますが、file_read ツールも独自にエンコードを行っていたため、二重エンコーディングが発生していました。

**修正内容:**
余分な Base64 エンコーディングステップを削除し、bedrock クライアントに処理を任せるようにしました。これにより、ファイルの読み取りが正しく動作するようになりました。

---

## まとめ

v0.1.5 では、実行制御を可能にする sleep tool、効率的な並列処理を実現する batch tool など、エージェントの機能を拡張する重要なツールが追加されました。また、AWS 関連のツールの柔軟性が向上し、より多様な環境での利用が可能になりました。
