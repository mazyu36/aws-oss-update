---
title: "tools v0.2.9"
version: "v0.2.9"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-09-29
summary: "Mem0 グラフデータ表示の修正、readabilipy 依存関係の削除、A2A クライアントツールの説明改善による LLM の URL ハルシネーション防止など、3 つのバグ修正を含むリリースです。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.9"
---

## 概要

このリリースでは、Mem0 メモリツールのグラフデータ表示の不具合修正、HTTP リクエストツールの依存関係削減、A2A クライアントツールにおける LLM の URL ハルシネーション問題の改善が行われました。

**リリース:** [v0.2.9](https://github.com/strands-agents/tools/releases/tag/v0.2.9)

## バグ修正

### Mem0 グラフデータハンドリングの修正 ([#248](https://github.com/strands-agents/tools/pull/248))

Mem0 メモリツールの `list` および `retrieve` 操作において、グラフバックエンドから返されたデータが画面に表示されず、エージェントワークフローの後続ステップで考慮されない問題を修正しました。

**修正内容:**
- グラフバックエンドからのデータが正しく表示されるようになりました
- `list` 操作で全メモリのグラフ構造（Source、Relationship、Target）がテーブル形式で表示されます
- `retrieve` 操作でクエリに関連するグラフデータが検索結果として表示されます
- エージェントワークフローの後続ステップでグラフデータが正しく利用可能になりました

**使用例:**

```python
# Mem0 メモリの一覧表示
memory_agent.tool.mem0_memory(action="list", user_id=USER_ID)

# クエリに基づくメモリの取得
memory_agent.tool.mem0_memory(
    action="retrieve",
    query="accommodation preferences travel Japan trip",
    user_id=USER_ID
)
```

---

### readabilipy 依存関係の削除 ([#261](https://github.com/strands-agents/tools/pull/261))

HTTP リクエストツールから `readabilipy` 依存関係を削除し、npm パッケージの自動インストールを不要にしました。`convert_to_markdown` 機能は `markdownify` のみを使用するように簡素化されました。

**修正内容:**
- `readabilipy` パッケージへの依存を削除
- `extract_content_from_html` 関数を `markdownify` のみを使用するように簡素化
- API と機能は変更なし
- npm パッケージの自動インストールが不要になり、セットアップが簡単になりました

**ポイント:**
- HTTP リクエストツールの `convert_to_markdown` 機能は引き続き利用可能です
- 外部依存関係が減少し、より軽量で保守しやすくなりました
- 既存のコードに変更は不要です

---

### A2A クライアントツールの説明改善による URL ハルシネーション防止 ([#263](https://github.com/strands-agents/tools/pull/263))

A2A クライアントツールの説明を改善し、LLM が不正確な URL を生成（ハルシネーション）してしまう問題を防止しました。

**問題の詳細:**
- ユーザーがエージェント名で参照（例: "calculator agent にメッセージを送信"）した際、LLM が誤った URL（`https://<agent-name>.<org>.com/api/v1` など）を生成していました
- これにより接続エラーが発生し、当初は A2A プロトコルのバグと誤診されていました

**修正内容:**
- ツールの説明に「URL を推測、生成、またはハルシネートしないこと」という明示的なガイダンスを追加
- エージェント検出と直接 URL 使用の適切なワークフローを明確化
- ユーザー提供の URL とエージェント名解決の両方のワークフローをサポート
- ユーザーがエージェント名で参照する場合、`a2a_list_discovered_agents` を使用するよう LLM をガイド

**使用例:**

```python
# エージェント名でメッセージを送信する正しいワークフロー

# 1. 利用可能なエージェントを一覧表示
discovered_agents = a2a_list_discovered_agents()

# 2. 適切なエージェントの URL を取得してメッセージを送信
a2a_send_message(
    agent_url="http://localhost:8384/",
    message="Please calculate the square root of 200"
)
```

**ポイント:**
- LLM は URL を推測せず、常に `a2a_list_discovered_agents` を使用してエージェントを検出します
- これにより A2A 通信の信頼性が向上しました
- ユーザーがエージェント名で参照しても正しく動作するようになりました

## まとめ

このリリースでは、Mem0 グラフデータの表示、依存関係の削減、A2A クライアントの信頼性向上という 3 つの重要なバグ修正が行われ、Strands Tools の安定性と使いやすさが向上しました。
