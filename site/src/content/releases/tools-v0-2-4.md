---
title: "tools v0.2.4"
version: "v0.2.4"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-08-19
summary: "Tavily 検索ツールの追加、A2A プッシュ通知サポート、Python REPL の環境変数対応など、複数の新機能とバグ修正を含むリリース。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.4"
---

## 概要

このリリースでは、Tavily による高度な Web 検索機能の追加、A2A クライアントへのプッシュ通知サポート、Python REPL の環境変数対応など、多数の新機能が導入されました。また、Slack ツールの SDK 変更への対応や code_interpreter の docstring 改善などのバグ修正も含まれています。

**リリース:** [v0.2.4](https://github.com/strands-agents/tools/releases/tag/v0.2.4)

## 新機能

### Tavily 統合 ([#186](https://github.com/strands-agents/tools/pull/186))

**この機能でできること:**
AI エージェント向けに最適化された Web 検索、コンテンツ抽出、クローリング、サイトマッピング機能を提供します。Tavily は、リアルタイムの Web 検索とインテリジェントなコンテンツフィルタリングを実現します。

**使用例:**

```python
from strands_tools import tavily_search
from strands import Agent

# Web 検索ツールの使用
agent = Agent(
    model="claude-3-5-sonnet-20241022",
    tools=[tavily_search]
)

# エージェントが Tavily を使って Web 検索を実行
response = agent.run("最新の AI ニュースを検索してください")
```

**提供される 4 つのツール:**
- `tavily_search` / `tavily_search_async` - AI エージェント向けリアルタイム Web 検索
- `tavily_extract` / `tavily_extract_async` - Web ページからクリーンな構造化コンテンツを抽出
- `tavily_crawl` / `tavily_crawl_async` - ベース URL から始まるインテリジェントな Web サイトクローリング
- `tavily_map` / `tavily_map_async` - コンテンツ抽出なしでサイト構造をマッピング

**ポイント:**
- 各ツールには同期版と非同期版が用意されています
- Tavily API キーが必要です（環境変数 `TAVILY_API_KEY` で設定）
- ニュース検索、ドメイン管理、AI 生成回答など高度な機能を備えています

---

### A2A プッシュ通知サポート ([#209](https://github.com/strands-agents/tools/pull/209))

**この機能でできること:**
A2AClientToolProvider にオプションのプッシュ通知機能が追加され、エージェントタスク完了時にリアルタイムで webhook 通知を受け取ることができます。

**使用例:**

```python
from strands_tools import A2AClientToolProvider
from strands import Agent

# プッシュ通知付きの A2A クライアント
provider = A2AClientToolProvider(
    known_agent_urls=["http://localhost:8081/invocations"],
    webhook_url="https://my-webhook.com/notifications",
    webhook_token="secret-token"
)

agent = Agent(model="claude-3-5-sonnet-20241022", tools=provider.tools)
```

**ポイント:**
- `webhook_url` と `webhook_token` は完全にオプションで、後方互換性が保たれています
- 既存のコードを変更することなく、プッシュ通知機能を追加できます
- webhook 通知には完全なタスクデータと会話履歴が含まれます

---

### Python REPL 環境変数対応と確認フラグ ([#56](https://github.com/strands-agents/tools/pull/56))

**この機能でできること:**
Python REPL ツールに `PYTHON_REPL_INTERACTIVE` と `PYTHON_REPL_RESET_STATE` の環境変数サポートが追加され、environment ツールに `needs_confirmation` チェック条件が追加されました。

**使用例:**

```python
import os
from strands_tools import python_repl
from strands import Agent

# インタラクティブモードと状態リセットの制御
os.environ["PYTHON_REPL_INTERACTIVE"] = "true"
os.environ["PYTHON_REPL_RESET_STATE"] = "true"

agent = Agent(
    model="claude-3-5-sonnet-20241022",
    tools=[python_repl]
)

# Python コードを実行
response = agent.run("リストの合計を計算してください: [1, 2, 3, 4, 5]")
```

**ポイント:**
- `PYTHON_REPL_INTERACTIVE`: インタラクティブモードの有効化
- `PYTHON_REPL_RESET_STATE`: 実行ごとに状態をリセット
- environment ツールでは、危険な操作に対する確認機能が強化されました

---

### Diagram ツールの自動オープン制御 ([#210](https://github.com/strands-agents/tools/pull/210))

**この機能でできること:**
diagram ツールに `open_diagram` フラグが追加され、図を作成後に自動的に開くかどうかを制御できるようになりました。

**使用例:**

```python
from strands_tools import diagram
from strands import Agent

agent = Agent(
    model="claude-3-5-sonnet-20241022",
    tools=[diagram]
)

# 図を作成するが自動的には開かない
response = agent.run(
    "システムアーキテクチャ図を作成してください。作成後は自動的に開かないでください。"
)
```

**ポイント:**
- CI/CD 環境や自動化スクリプトで図を生成する際に便利です
- デフォルトの動作は変更されていないため、既存コードに影響はありません

---

### AgentCoreBrowser の identifier サポート ([#188](https://github.com/strands-agents/tools/pull/188))

**この機能でできること:**
AgentCoreBrowser にカスタムブラウザツール識別子のサポートが追加されました。

**使用例:**

```python
from strands_tools.browser import AgentCoreBrowser
from strands import Agent

browser = AgentCoreBrowser(identifier="my-custom-browser")
agent = Agent(
    model="claude-3-5-sonnet-20241022",
    tools=[browser]
)
```

**ポイント:**
- 複数のブラウザインスタンスを使用する際に識別しやすくなります
- ログやデバッグ時に役立ちます

---

### AWS Boto クライアントへの User-Agent 追加 ([#185](https://github.com/strands-agents/tools/pull/185))

**この機能でできること:**
すべての Boto クライアントに `strands-agents` User-Agent が追加され、AWS サービス使用時のトラッキングと識別が改善されました。

**影響を受けるツール:**
- `generate_image`
- `memory`
- `nova_reels`
- `retrieve`
- `speak`
- `use_aws`

**ポイント:**
- AWS 側でのリクエストトラッキングが容易になります
- 既存のコードに変更は不要で、自動的に適用されます

## バグ修正

### code_interpreter の docstring 改善 ([#215](https://github.com/strands-agents/tools/pull/215))

code_interpreter に詳細な docstring が追加され、LangGraph などの他のエージェントフレームワークでも使用できるようになりました。この変更により、ツールの使用方法がより明確になり、相互運用性が向上しています。

---

### Slack ツールの SDK 変更対応 ([#217](https://github.com/strands-agents/tools/pull/217))

SDK のリファクタリングにより削除された一時的なシステムプロンプトオーバーライド機能に対応しました。この修正により、以下の問題が解決されています:

- 親エージェントのモデルが子エージェントに正しく継承されるようになりました
- システムプロンプトの割り当てが適切に動作するようになりました
- callback_handler の継承が追加され、イベント処理が正しく行われるようになりました

**影響:**
- 以前は、エージェントが親エージェントのモデルではなくデフォルトモデルを使用していた問題が修正されました
- システムプロンプトの変更が正しく反映されるようになりました

## まとめ

v0.2.4 は、Tavily による高度な Web 検索機能や A2A プッシュ通知サポートなど、エージェントの能力を大幅に拡張する新機能を多数導入したリリースです。また、SDK の変更への対応やドキュメント改善により、ツールの安定性と使いやすさも向上しています。
