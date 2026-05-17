---
title: "Strands Tools v0.2.6 リリース解説"
version: "v0.2.6"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-09-02
summary: "Exa 検索インテグレーションの追加により、Web 検索とコンテンツ取得が可能に。エディターツールでの空文字列による削除機能をサポート。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.6"
---

## 概要

Strands Agents Tools v0.2.6 では、Exa API を活用した高度な Web 検索とコンテンツ取得機能が追加されました。また、エディターツールで空文字列による行削除が可能になり、より柔軟なファイル編集が実現しました。

**リリース:** [v0.2.6](https://github.com/strands-agents/tools/releases/tag/v0.2.6)

## 新機能

### Exa 検索インテグレーション ([#231](https://github.com/strands-agents/tools/pull/231))

**この機能でできること:**
- Exa API を使用したインテリジェントな Web 検索機能が利用できます。`exa_search` ツールで検索を実行し、`exa_get_contents` ツールで特定 URL からコンテンツを抽出できます。

**使用例:**

```python
from strands import Agent
from strands_tools import exa_search, exa_get_contents
import os

# Exa API キーを設定
os.environ["EXA_API_KEY"] = "your-api-key"

# Web 検索を実行
agent_search = Agent(tools=[exa_search])
response = agent_search("最新の AI 技術のトレンドについて検索して")
print(response)

# 特定 URL からコンテンツを取得
agent_contents = Agent(tools=[exa_get_contents])
response = agent_contents("https://example.com からコンテンツを取得して")
print(response)

# 両方のツールを組み合わせて使用
agent_combined = Agent(tools=[exa_search, exa_get_contents])
response = agent_combined("機械学習について検索して、関連する記事の内容を取得して")
print(response)
```

**ポイント:**
- パラメータ検証が実装されており、不正な入力を防止します
- レスポンスフォーマットは適切に処理され、構造化されたデータとして返されます
- エラーハンドリングが実装されており、API エラーを適切に処理します

---

## バグ修正

### エディターツールで空文字列による削除をサポート ([#233](https://github.com/strands-agents/tools/pull/233))

- `editor` ツールの `str_replace` と `pattern_replace` コマンドで、`new_str` パラメータに空文字列 (`""`) を指定できるようになりました
- これにより、マッチしたテキストを削除することが可能になりました
- 以前は空文字列が正しく処理されず、削除操作が実行できませんでした

**使用例:**

```python
from strands import Agent
from strands_tools import editor

agent = Agent(tools=[editor])

# ファイルを作成
agent.tool.editor(command="create", path="file.txt", file_text="Hello World")

# 文字列を削除（空文字列で置き換え）
agent.tool.editor(
    command="str_replace",
    path="file.txt",
    old_str="World",
    new_str=""
)

# 結果: "Hello World" → "Hello "
```

**影響を受けていた状況:**
- ファイル編集時に特定の文字列や行を削除したい場合、空文字列での置き換えができませんでした
- この修正により、より直感的な削除操作が可能になりました

---

## まとめ

v0.2.6 は、Web 検索とコンテンツ取得機能を提供する Exa インテグレーションの追加により、エージェントの情報収集能力が大幅に向上しました。また、エディターツールの改善により、ファイル編集の柔軟性が向上しています。
