---
title: "tools v0.4.0"
version: "v0.4.0"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2026-04-08
summary: "Exa search ツールに deep search モードが追加され、より包括的な検索結果を取得できるようになりました。また、複数のツールでコンソール出力の抑制が正しく機能するようになりました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.4.0"
---

## 概要

このリリースでは、Exa search ツールに新しい `deep` search モードが追加され、より包括的な検索結果を取得できるようになりました。また、複数のツールでコンソール出力の抑制に関するバグが修正されています。

**リリース:** [v0.4.0](https://github.com/strands-agents/tools/releases/tag/v0.4.0)

## 新機能

### Exa Deep Search ([#411](https://github.com/strands-agents/tools/pull/411))

**この機能でできること:**
- Exa search ツールで `deep` search モードを使用して、より包括的で詳細な検索結果を取得できます。

**使用例:**

```python
from strands import Agent
from strands_tools import exa_search

# deep search モードで包括的な検索結果を取得
agent = Agent(tools=[exa_search])
agent("Do a deep search on quantum computing breakthroughs in 2026")
```

**ポイント:**
- デフォルトの search type は `auto` です
- より詳細な検索結果が必要な場合は `deep` を使用してください
- `fast` は高速な検索結果が必要な場合に使用します

## バグ修正

### コンソール出力の抑制が正しく機能するように修正 ([#436](https://github.com/strands-agents/tools/pull/436), [#378](https://github.com/strands-agents/tools/pull/378))
- `exa`、`tavily`、`mem0_memory` ツールが直接 `Console()` を初期化していたため、埋め込み/ライブラリモードでコンソール出力を抑制できない問題を修正
- `console_util.create()` ファクトリを使用するように変更し、`STRANDS_TOOL_CONSOLE_MODE` 環境変数による出力抑制が正しく機能するようになりました

## 破壊的変更

### 非推奨の search type を削除 ([#411](https://github.com/strands-agents/tools/pull/411))

**変更前:**
```python
# neural または keyword search type を使用
search_type: Literal["keyword", "neural", "fast", "auto"]
```

**変更後:**
```python
# auto、fast、または deep を使用
search_type: Literal["auto", "fast", "deep"]
```

**移行方法:**
- `neural` を使用していた場合は `auto`（デフォルト）または `deep` に変更してください
- `keyword` を使用していた場合は `auto` に変更してください
- `fast` と `auto` はそのまま使用可能です

## まとめ

Exa search ツールに deep search モードが追加され、より包括的な検索が可能になりました。また、埋め込みモードでのコンソール出力抑制が正しく機能するようになっています。
