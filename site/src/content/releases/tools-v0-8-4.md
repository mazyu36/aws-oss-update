---
title: "Strands Tools v0.8.4 リリース解説"
version: "v0.8.4"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-07-17
summary: "python_repl ツールの non_interactive モードの制御方法を、呼び出し側からの kwargs 引数指定から STRANDS_NON_INTERACTIVE 環境変数のみに変更するバグ修正リリースです。shell ツールと同じくオペレーター制御の設定に統一されます。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.4"
---

## 概要

このリリースには 1 件のバグ修正が含まれます。`python_repl` ツールの `non_interactive_mode` フラグの解決元を `kwargs` から `STRANDS_NON_INTERACTIVE` 環境変数のみに変更し、`shell` ツールと同じくオペレーターが制御する設定に統一されました。呼び出し側が `non_interactive_mode` 引数を渡して確認プロンプトをバイパスすることはできなくなります。

**リリース:** [v0.8.4](https://github.com/strands-agents/tools/releases/tag/v0.8.4)

## バグ修正

### python_repl: non_interactive モードを環境変数から解決するように変更 ([#541](https://github.com/strands-agents/tools/pull/541))

これまで `python_repl` ツールの `non_interactive_mode` フラグは `kwargs.get("non_interactive_mode", False)` として呼び出し側の引数から取得していました。この設計では LLM やツール呼び出し側が引数を追加するだけで確認プロンプトをバイパスできてしまうため、オペレーターがハードニングとして設計した確認フローが呼び出し側から無効化できる状態でした。

このリリースでは、`non_interactive_mode` の値を環境変数 `STRANDS_NON_INTERACTIVE` からのみ読み取るように変更されました。これは同じフラグを解決する `shell` ツールと一致する挙動であり、確認プロンプトの抑制はオペレーターが環境変数を設定することでのみ可能になります。

**使用例:**

```bash
# オペレーターが環境変数で確認プロンプトを抑制する
export STRANDS_NON_INTERACTIVE=true
```

```python
from strands import Agent
from strands_tools import python_repl

agent = Agent(tools=[python_repl])

# STRANDS_NON_INTERACTIVE=true の環境では確認プロンプトなしで実行される
agent("Compute the first 10 Fibonacci numbers with Python")
```

**ポイント:**

- `STRANDS_NON_INTERACTIVE` はオペレーター制御の環境変数として位置づけられ、ツール呼び出し側からは変更できません
- 従来の `BYPASS_TOOL_CONSENT=true`（開発モードの完全バイパス）は引き続き利用可能で、確認プロンプトのみを抑制する場合は `STRANDS_NON_INTERACTIVE` を使い分けます
- 同じフラグ解決方式を採用する `shell` ツールと動作が揃うため、両ツールを併用する運用がシンプルになります
- 呼び出し側で `python_repl(code=..., non_interactive_mode=True)` のように渡していた場合、その引数は無視され確認プロンプトが表示されるようになります。移行が必要な場合は環境変数の設定に切り替えてください

## まとめ

`python_repl` ツールの `non_interactive_mode` の制御方法を `kwargs` から `STRANDS_NON_INTERACTIVE` 環境変数へ移行し、`shell` ツールと同じくオペレーター制御の設定に統一するバグ修正リリースです。呼び出し側から `non_interactive_mode` 引数を渡していた場合は環境変数への移行が必要です。
