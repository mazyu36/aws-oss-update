---
title: "Strands Tools v0.1.8 リリース解説"
version: "v0.1.8"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-07-02
summary: "Playwright を使用したブラウザ操作ツール、Amazon Bedrock での画像生成モデル拡張サポート、エディタツールの @tool デコレータへの移行など、新機能とバグ修正を含むリリース。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.1.8"
---

## 概要

Strands Tools v0.1.8 では、Playwright を使用したブラウザ自動化ツールの追加、Amazon Bedrock での画像生成モデルの拡張サポート、エディタツールの現代的な @tool デコレータパターンへの移行が行われました。

**リリース:** [v0.1.8](https://github.com/strands-agents/tools/releases/tag/v0.1.8)

## 新機能

### use_browser Tool の追加 ([#102](https://github.com/strands-agents/tools/pull/102))

**この機能でできること:**
- エージェントが Playwright を使用してブラウザを自動操作できるようになりました。Chromium ブラウザでのクリック、入力、ナビゲーションなどのアクションが可能で、persistent_context 機能により Cookie、ローカルストレージ、セッション、ブラウザ履歴、保存されたパスワードなどを保持できます。

**使用例:**

```python
from strands import Agent
from strands_tools.use_browser import use_browser

agent = Agent(
    name="Browser Agent",
    description="ブラウザを操作できるエージェント",
    tools=[use_browser]
)

# ブラウザを起動してページを操作
response = agent(
    "Googleにアクセスして 'Strands Agents' を検索してください"
)

# persistent_context を使用してセッションを保持
response = agent(
    """
    persistent_context を有効にして、user_data_dir を '/path/to/data' に設定し、
    ブラウザを起動してください。
    """
)
# 次回起動時に保存されたデータが読み込まれます
```

**ポイント:**
- persistent_context を true に設定すると、ブラウザのセッションデータが user_data_dir に保存されます
- 現在 Chromium のみサポートされています
- ブックマーク、検索履歴、ログイン情報などを保持して再利用できます

---

### エディタツールの @tool デコレータへの移行 ([#111](https://github.com/strands-agents/tools/pull/111))

**この機能でできること:**
- エディタツールが従来の TOOL_SPEC 辞書パターンから現代的な @tool デコレータパターンに移行されました。これにより、コードの可読性向上、型安全性の強化、メンテナンス性の向上が実現されています。

**使用例:**

```python
from strands import Agent
from strands_tools.editor import editor

# エディタツールを使用
agent = Agent(
    name="Code Editor",
    description="ファイルを編集できるエージェント",
    tools=[editor]
)

# ファイルを表示
response = agent("src/main.py を表示してください")

# テキストを置換
response = agent(
    """
    src/main.py の 'old_function' を 'new_function' に置換してください
    """
)

# 行番号で挿入
response = agent(
    "src/main.py の 10 行目に新しいコメントを挿入してください"
)

# エージェントインターフェースでの直接呼び出しも可能
# agent.tool.editor()
```

**ポイント:**
- 後方互換性は完全に維持されています
- コード量が大幅に削減されました（315 行削除、99 行追加）
- 型ヒントと IDE サポートが改善されています
- すべての既存機能（ファイル表示、作成、置換、挿入、undo など）が正常に動作します

---

## バグ修正

### generate_image Tool での Amazon Bedrock モデル拡張サポート ([#89](https://github.com/strands-agents/tools/pull/89))

- 画像生成ツールがハードコードされた us-west-2 リージョンを使用していた問題を修正
- 段階的に廃止されている古いモデルに代わり、最新の画像生成モデルをサポート
- Stable Diffusion（Ultra、Core、3.5）および Nova Canvas の全モデルに対応
- リージョンの柔軟性が向上し、利用可能なモデルオプションが拡張されました

---

## まとめ

v0.1.8 は、ブラウザ自動化という強力な新機能の追加、画像生成ツールの重要なバグ修正、コードベースの現代化を含む重要なリリースです。use_browser Tool により、エージェントが Web ブラウザを操作して複雑なタスクを実行できるようになり、エディタツールの移行により、将来的なメンテナンスとコード品質が向上しました。
