---
title: "tools v0.2.2"
version: "v0.2.2"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-07-24
summary: "diagram ツールと rss ツールの新規追加、shell ツールの @tool デコレーターへの移行、および複数の重要なバグ修正を含むリリース。swarm、think、memory、python_repl、file_read、file_write ツールの信頼性が向上しました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.2"
---

## 概要

このリリースでは、ダイアグラム生成と RSS フィード管理の 2 つの新しいツールが追加されました。また、shell ツールが最新の @tool デコレーターパターンへ移行され、swarm、think、memory、python_repl、file_read、file_write ツールにおける重要なバグ修正が行われました。

**リリース:** [v0.2.2](https://github.com/strands-agents/tools/releases/tag/v0.2.2)

## 新機能

### diagram ツール ([#127](https://github.com/strands-agents/tools/pull/127))

**この機能でできること:**
クラウドアーキテクチャ、ネットワーク図、グラフ、および 14 種類の UML ダイアグラムを生成できる包括的なダイアグラム作成ツールです。複数の出力形式（PNG、SVG、PDF）をサポートし、エージェントがシステム、アーキテクチャ、プロセスの視覚的表現を生成できます。

**使用例:**

```python
from strands_tools.diagram import diagram

# クラス図を生成
result = diagram(
    diagram_type="class",
    description="User class with name and email attributes, and a login method",
    output_format="png",
    output_path="./user_class_diagram.png"
)

# シーケンス図を生成
result = diagram(
    diagram_type="sequence",
    description="User authentication flow: User -> AuthService -> Database",
    output_format="svg",
    output_path="./auth_sequence.svg"
)

# AWS アーキテクチャ図を生成
result = diagram(
    diagram_type="cloud",
    description="Web application with EC2, RDS, and S3 components",
    output_format="png",
    output_path="./aws_architecture.png"
)
```

**ポイント:**
- 構造図（クラス、コンポーネント、デプロイメント等）と振る舞い図（シーケンス、アクティビティ、ステートマシン等）の両方をサポート
- editor ツールと組み合わせることで、コードを分析してダイアグラムを自動生成可能
- Mermaid や ASCII ダイアグラムのリクエストは LLM の推論能力を活用

---

### rss ツール ([#155](https://github.com/strands-agents/tools/pull/155))

**この機能でできること:**
RSS フィードの包括的な管理機能を提供し、情報収集、コンテンツ監視、データ統合タスクを実現します。フィードの取得、購読、購読解除、エントリの読み取り、検索、カテゴリ管理などの操作が可能です。

**使用例:**

```python
from strands_tools.rss import rss

# RSS フィードを取得（購読せずに内容を確認）
result = rss(
    operation="fetch",
    feed_url="https://example.com/feed.xml"
)

# フィードを購読
result = rss(
    operation="subscribe",
    feed_url="https://example.com/feed.xml"
)

# 購読中のフィードからエントリを読み取り
result = rss(
    operation="read",
    feed_url="https://example.com/feed.xml",
    limit=10
)

# キーワードで検索
result = rss(
    operation="search",
    query="artificial intelligence",
    feed_url="https://example.com/feed.xml"
)

# すべての購読フィードをリスト表示
result = rss(
    operation="list"
)
```

**ポイント:**
- 自動化されたコンテンツ集約とキュレーション、リアルタイムのニュース監視に最適
- HTTP Client ツールと組み合わせて包括的な Web データ収集が可能
- NLP ツールと連携して高度なコンテンツ分析やトレンド追跡が実現可能

---

### shell ツールの @tool デコレーター移行 ([#173](https://github.com/strands-agents/tools/pull/173))

**この機能でできること:**
shell ツールが最新の Strands SDK の @tool デコレーターパターンへ移行されました。レガシーな TOOL_SPEC ディクショナリ形式から型付きパラメーターを使用する現代的な関数シグネチャへ更新され、コードの可読性とメンテナンス性が向上しました。

**使用例:**

```python
from strands_tools.shell import shell

# インタラクティブモードでシェルコマンドを実行
result = shell(
    command="ls -la",
    non_interactive_mode=False
)

# 非インタラクティブモードで実行
result = shell(
    command="echo 'Hello World'",
    non_interactive_mode=True
)
```

**ポイント:**
- すべての既存機能が維持され、後方互換性を確保
- 型安全性が向上し、パラメーター検証が改善
- toolUseId 依存関係が削除され、よりシンプルな実装に

---

## バグ修正

### swarm ツール: サブエージェントへのツールオブジェクト受け渡しの修正 ([#164](https://github.com/strands-agents/tools/pull/164))
- サブエージェントがツール名の文字列ではなく、実際のツールオブジェクトを受け取るように修正
- 以前は `./shell.py` のようなファイルパスとして扱われ「Tool file not found」エラーが発生していた問題を解決
- 親エージェントの `tool_registry.registry` から適切にツールオブジェクトを取得するように変更

### think ツール: 自動再帰防止の実装 ([#167](https://github.com/strands-agents/tools/pull/167))
- ネストされたエージェントが think ツールを再帰的に呼び出すことで発生する無限ループとスタックオーバーフローを防止
- ネストされたエージェントから think ツールを自動的に除外するスマートフィルタリングを実装
- 適切な警告/デバッグメッセージを追加し、再帰防止の追跡を改善

### memory ツール: 複数データソースサポートのための型検出の実装 ([#169](https://github.com/strands-agents/tools/pull/169))
- データソースタイプが 'CUSTOM' にハードコードされていた問題を修正
- 最初のデータソースが CUSTOM 型でない場合（例: S3 データソース）に失敗していた不具合を解決
- すべてのデータソースを検索し、CUSTOM データソースを優先して適切な型を検出

### python_repl ツール: UTF-8 処理と PTY リソース管理の強化 ([#131](https://github.com/strands-agents/tools/pull/131))
- 読み取り間で分割された UTF-8 シーケンスを処理するための `incomplete_bytes` バッファを追加
- ファイルディスクリプタの検証とエラーハンドリングを改善
- PTY 操作中の 'utf-8 codec can't decode byte' エラーによるクラッシュを防止

### file_read ツール: コンソール出力前の文字列エスケープ ([#159](https://github.com/strands-agents/tools/pull/159))
- ログファイルに不完全な括弧ペアなどの特殊文字が含まれている場合に発生する例外を修正
- コンソールへ出力する前に文字列をエスケープし、マークアップによるレンダリングエラーを防止

### file_write ツール: プロンプトの色を黄色から赤に変更 ([#158](https://github.com/strands-agents/tools/pull/158))
- ターミナルのアクセシビリティを改善し、確認プロンプトの色を黄色から赤に変更
- 黄色のテキストは明るいテーマのターミナルで読みにくいという問題を解決
- 明暗両方の背景で優れた視認性を提供

### shell ツール: 非インタラクティブモードサポートと終了ロジックの修正 ([#82](https://github.com/strands-agents/tools/pull/82))
- 統合テストで非インタラクティブモードが無限に実行される不具合を修正
- 新しい `non_interactive_mode` パラメーターを通じて両モードの包括的なサポートを追加
- プロセスグループ管理と信号処理を改善し、よりクリーンな終了を実現

---

## まとめ

v0.2.2 では、ビジュアライゼーションとコンテンツ集約のための強力な新ツールが追加され、既存ツールの信頼性と安定性が大幅に向上しました。shell ツールの @tool デコレーター移行は、今後のモダナイゼーションの方向性を示しています。
