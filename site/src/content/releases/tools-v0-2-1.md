---
title: "Strands Tools v0.2.1 リリース解説"
version: "v0.2.1"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-07-16
summary: "Amazon Bedrock AgentCore との統合を大幅に強化。永続的メモリ管理、安全なコード実行環境、ブラウザ自動化機能を追加し、エージェントの能力が飛躍的に向上しました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.1"
---

## 概要

このリリースでは、Amazon Bedrock AgentCore サービスとの統合により、Strands エージェントに 3 つの強力な新機能が追加されました。永続的なメモリ管理、安全なコード実行環境、そしてブラウザ自動化機能により、エージェントはより洗練された対話的なタスクを実行できるようになります。

**リリース:** [v0.2.1](https://github.com/strands-agents/tools/releases/tag/v0.2.1)

## 新機能

### AgentCore Memory Service 統合 ([#147](https://github.com/strands-agents/tools/pull/147))

**この機能でできること:**
エージェントが Amazon Bedrock の AgentCore Memory Service を活用して、永続的なメモリ機能を持つことができます。ユーザーの好みや過去の決定、重要な文脈を記録し、セマンティック検索を使って関連情報を取得することで、よりパーソナライズされた対話を実現します。

**使用例:**

```python
from strands import Agent
from strands_tools.agent_core_memory import AgentCoreMemoryToolProvider

provider = AgentCoreMemoryToolProvider(
    memory_id="memory-123abc",
    actor_id="user-456",
    session_id="session-789",
    namespace="default",
)

agent = Agent(tools=provider.tools)

# 新しいメモリを記録
agent.tool.agent_core_memory(
    action="record",
    content="ユーザーはSF映画を好み、週末に観ることを好む。"
)

agent("私はベジタリアン料理が好きです")

# セマンティック検索で関連するメモリを取得
agent.tool.agent_core_memory(
    action="retrieve",
    query="ユーザーの映画の好み"
)

agent("私の趣味は何ですか？")

# すべてのメモリをリスト表示
agent.tool.agent_core_memory(
    action="list"
)

agent("最近の10件のメモリをリストして")
```

**ポイント:**
- `record`: イベントとしてメモリを保存
- `retrieve`: 自然言語クエリによるセマンティック検索
- `list`: すべての保存されたメモリレコードを一覧表示
- `get`: 一意の識別子を使った特定のメモリの取得
- `delete`: 不要なメモリの削除により効率的なメモリストアを維持

---

### Bedrock AgentCore Code Interpreter ([#148](https://github.com/strands-agents/tools/pull/148))

**この機能でできること:**
Python、JavaScript、TypeScript など複数のプログラミング言語でコードを安全かつ隔離されたサンドボックス環境で実行できます。モジュラーアーキテクチャにより、ツールインターフェース、プラットフォーム抽象化、実行エンジン間の責任が明確に分離されています。

**使用例:**

```python
from strands import Agent
from strands_tools.code_interpreter import AgentCoreCodeInterpreter

# Code Interpreter の初期化
code_interpreter = AgentCoreCodeInterpreter(
    auto_start=True  # プラットフォームを自動的に開始
)

agent = Agent(tools=code_interpreter.tools)

# Python コードを実行
agent.tool.code_interpreter(
    action_type="executeCode",
    session_name="my-session",
    code="""
import numpy as np
import matplotlib.pyplot as plt

# データを生成
x = np.linspace(0, 10, 100)
y = np.sin(x)

# プロット
plt.figure(figsize=(10, 6))
plt.plot(x, y)
plt.title('Sine Wave')
plt.savefig('sine_wave.png')
    """,
    language="python"
)

# セッションをリスト
agent.tool.code_interpreter(
    action_type="listSessions"
)

# セッションをクリーンアップ
agent.tool.code_interpreter(
    action_type="deleteSession",
    session_name="my-session"
)
```

**ポイント:**
- Pydantic モデルによる入力検証と型安全性
- Discriminated union により各アクションタイプに明確な必須フィールドを定義
- プラットフォーム抽象化により、Docker やクラウドベースのソリューションなど、さまざまな実行バックエンドの統合が容易
- ライフサイクル管理の自動化により、手動でプラットフォームのライフサイクルを管理する必要がない

---

### Bedrock AgentCore Browser Tool ([#149](https://github.com/strands-agents/tools/pull/149))

**この機能でできること:**
既存の `use_browser` ツールをベースクラスとプラットフォーム固有の実装にリファクタリングし、Bedrock AgentCore によるブラウザ自動化機能を追加しました。エージェントは Web ページのナビゲーション、要素との対話、コンテンツの抽出を実行できます。

**使用例:**

```python
from strands import Agent
from strands_tools.browser import AgentCoreBrowser

# AgentCore ブラウザを初期化
browser = AgentCoreBrowser(auto_start=True)

agent = Agent(tools=browser.tools)

# Web ページをナビゲート
agent.tool.browser(
    action_type="navigate",
    url="https://example.com"
)

# 新しいタブを作成（自動的にアクティブタブになる）
agent.tool.browser(
    action_type="newTab",
    url="https://another-site.com"
)

# ページコンテンツを取得
agent.tool.browser(
    action_type="getPageContent"
)

# セッションをクリーンアップ
browser.cleanup()
```

**ポイント:**
- ツール名が `use_browser` から `browser` に変更され、既存の命名規則に準拠（例: `mem0_memory`、`agent_core_memory`）
- 既存の実装は `local_chromium_browser` にリファクタリング
- 新しいタブ作成時に自動的にアクティブタブが更新される修正を含む（以前は LLM がタブ切り替えを誤解していた問題を解決）

## 破壊的変更

### Browser Tool の名称変更 ([#149](https://github.com/strands-agents/tools/pull/149))

**変更前:**
```python
from strands_tools import use_browser

agent = Agent(tools=[use_browser])
agent.tool.use_browser(...)
```

**変更後:**
```python
from strands_tools.browser import LocalChromiumBrowser

browser = LocalChromiumBrowser()
agent = Agent(tools=browser.tools)
agent.tool.browser(...)
```

**移行方法:**
- インポート文を `strands_tools.browser.LocalChromiumBrowser` または `strands_tools.browser.AgentCoreBrowser` に更新
- ツール呼び出しを `use_browser` から `browser` に変更
- プラットフォーム固有の実装（ローカルまたは AgentCore）を選択

## まとめ

v0.2.1 は、Amazon Bedrock AgentCore サービスとの深い統合により、Strands エージェントの能力を大幅に拡張します。永続的なメモリ、安全なコード実行、ブラウザ自動化という 3 つの柱により、エージェントはより複雑で文脈を考慮したタスクを実行できるようになりました。
