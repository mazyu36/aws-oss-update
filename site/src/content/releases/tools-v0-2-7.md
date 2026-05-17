---
title: "Strands Tools v0.2.7 リリース解説"
version: "v0.2.7"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-09-10
summary: "カスタム Code Interpreter 識別子のサポート、Bright Data による Web スクレイピングツールの追加、Browser ツールの persistent_context バグ修正、mem0_memory ツールへの Neptune Analytics グラフバックエンドのサポートを含むリリース"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.7"
---

## 概要

このリリースでは、AWS Bedrock AgentCore のカスタム Code Interpreter 環境を指定できるようになり、Bright Data を使用した強力な Web スクレイピングツールが追加され、Browser ツールの persistent_context 使用時のバグが修正されました。また、mem0_memory ツールに Neptune Analytics グラフバックエンドのサポートが追加されています。

**リリース:** [v0.2.7](https://github.com/strands-agents/tools/releases/tag/v0.2.7)

## 新機能

### カスタム Code Interpreter 識別子のサポート ([#219](https://github.com/strands-agents/tools/pull/219))

**この機能でできること:**
AWS Bedrock AgentCore のカスタムコードインタープリター環境を `identifier` パラメータで指定できるようになりました。既存のコードとの完全な後方互換性を維持しながら、カスタム実行環境を利用できます。

**使用例:**

```python
from strands_tools.code_interpreter import AgentCoreCodeInterpreter

# デフォルトの使用方法（既存のコードは変更なしで動作）
interpreter = AgentCoreCodeInterpreter(region="us-west-2")
# デフォルトの識別子を使用: "aws.codeinterpreter.v1"

# カスタム識別子を指定する新しい使用方法
custom_id = "my-custom-interpreter-abc123"
interpreter = AgentCoreCodeInterpreter(region="us-west-2", identifier=custom_id)
```

**ポイント:**
- AWS Bedrock AgentCore サービスは完全な ARN ではなく、識別子（`codeInterpreterId`）のみを期待します
- ✅ 正しい: `"my-custom-interpreter-abc123"` を使用
- ❌ 誤り: 完全な ARN を使用すると `ResourceNotFoundException` が発生します

---

### Bright Data Web スクレイピングツール ([#21](https://github.com/strands-agents/tools/pull/21))

**この機能でできること:**
Bright Data を使用して、Web コンテンツのスクレイピング、スクリーンショットの撮影、検索クエリの実行、構造化データの抽出を行える新しいツールが追加されました。

**使用例:**

```python
from strands_tools.bright_data import BrightData

# Bright Data ツールの初期化
bright_data = BrightData(api_token="your-api-token")

# Web コンテンツを Markdown 形式でスクレイピング
result = bright_data.scrape_url(
    url="https://example.com",
    output_format="markdown"
)

# スクリーンショットの撮影
screenshot = bright_data.take_screenshot(
    url="https://example.com",
    viewport_width=1920,
    viewport_height=1080
)

# 検索クエリの実行
search_results = bright_data.search(
    query="Python web scraping",
    engine="google",
    num_results=10
)
```

**ポイント:**
- Web スクレイピングは Markdown 形式で出力されるため、LLM での処理が容易です
- 高度な検索パラメータを使用して、様々な検索エンジンからデータを取得できます
- 構造化データの抽出により、様々な Web サイトやデータフィードから情報を収集できます

---

### mem0_memory ツールへの Neptune Analytics サポート ([#230](https://github.com/strands-agents/tools/pull/230))

**この機能でできること:**
`mem0_memory` ツールに Neptune Analytics グラフバックエンドのサポートが追加され、環境変数を通じて設定できるようになりました。これにより、メモリ検索機能が強化されます。

**使用例:**

```python
import os
from strands_tools.mem0_memory import Mem0Memory

# Neptune Analytics ホストを環境変数で設定
os.environ["NEPTUNE_ANALYTICS_HOST"] = "your-neptune-analytics-endpoint"

# mem0_memory ツールの初期化
# Neptune Analytics バックエンドが自動的に使用されます
memory = Mem0Memory(
    user_id="user123",
    agent_id="agent456"
)

# メモリの追加と検索
memory.add("ユーザーは Python と機械学習に興味があります")
results = memory.search("ユーザーの興味")
```

**ポイント:**
- `NEPTUNE_ANALYTICS_HOST` 環境変数を設定するだけで、Neptune Analytics グラフバックエンドが有効になります
- 既存の mem0 機能との完全な互換性を維持しながら、グラフデータベースの利点を活用できます
- グラフベースの検索により、より高度なメモリ関連性の分析が可能になります

---

## バグ修正

### Browser ツールの persistent_context 使用時のエラー修正 ([#238](https://github.com/strands-agents/tools/pull/238))

- `persistent_context=True` で LocalChromiumBrowser セッションを初期化する際に発生していたバグを修正しました
- `launch_persistent_context()` が `Browser` ではなく `BrowserContext` を返すため、無効な `new_context()` 呼び出しが試行されていた問題を解決
- persistent セッションと non-persistent セッションを正しく区別するようにセッション作成ロジックを更新しました

**影響を受けていた状況:**
- `persistent_context=True` と `user_data_dir` を指定して LocalChromiumBrowser を使用している場合
- セッション初期化時に `new_context()` 呼び出しでエラーが発生していました

---

## まとめ

このリリースでは、カスタム Code Interpreter 環境のサポート、強力な Web スクレイピング機能の追加、Browser ツールの安定性向上、そして Neptune Analytics による高度なメモリ機能の強化が実現されました。既存の機能との完全な後方互換性を維持しながら、より柔軟で強力なツールセットを提供します。
