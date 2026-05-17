---
title: "tools v0.5.1"
version: "v0.5.1"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2026-04-22
summary: "Exa ツールに highlights パラメータ、max_age_hours パラメータ、instant 検索タイプ、新しいカテゴリ（research paper、people）が追加されました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.5.1"
---

## 概要

このリリースでは、Exa 検索ツールに複数の新機能が追加されました。トークン効率の良いページ抜粋を取得できる highlights パラメータ、コンテンツの鮮度を制御する max_age_hours パラメータ、最低レイテンシの instant 検索タイプ、そして research paper と people の新しいカテゴリが利用可能になりました。

**リリース:** [v0.5.1](https://github.com/strands-agents/tools/releases/tag/v0.5.1)

## 新機能

### Exa ツールの機能拡張 ([#452](https://github.com/strands-agents/tools/pull/452))

**この機能でできること:**
- `exa_search` と `exa_get_contents` の両方で、トークン効率の良いページ抜粋（highlights）を取得できるようになりました
- コンテンツの鮮度を時間単位で制御できる `max_age_hours` パラメータが追加されました
- 最低レイテンシを実現する `instant` 検索タイプが利用可能になりました
- `research paper`（学術論文）と `people`（人物検索）の新しいカテゴリが追加されました

**使用例:**

```python
from strands import Agent
from strands_tools import exa

agent = Agent(tools=[exa])

# highlights を使用した検索（トークン効率の良い抜粋を取得）
result = agent.tool.exa_search(
    query="AI safety research advances",
    highlights=True,  # シンプルな有効化
    max_age_hours=24,  # 24時間以内のコンテンツのみ
)

# highlights の詳細設定
result = agent.tool.exa_search(
    query="machine learning best practices",
    highlights={
        "maxCharacters": 4000,  # 最大文字数を指定
        "query": "key findings"  # 抜粋のガイドとなるクエリ
    },
)

# instant 検索タイプ（最低レイテンシ）
result = agent.tool.exa_search(
    query="latest news on AI regulation",
    type="instant",  # auto, fast, deep に加えて instant が利用可能
    text=True,
)

# 新しいカテゴリを使用した検索
# research paper カテゴリ
result = agent.tool.exa_search(
    query="transformer architecture improvements",
    category="research paper",  # 学術論文に特化
    text=True,
)

# people カテゴリ
result = agent.tool.exa_search(
    query="AI researchers at Stanford",
    category="people",  # 人物検索に特化
    text=True,
)

# max_age_hours の詳細設定
result = agent.tool.exa_search(
    query="breaking tech news",
    max_age_hours=0,   # 0: 常にライブクロール
    # max_age_hours=-1  # -1: キャッシュのみ使用（ライブクロールしない）
    # max_age_hours=48  # N: N時間より古い場合はライブクロール
    text=True,
)

# exa_get_contents でも highlights と max_age_hours が利用可能
result = agent.tool.exa_get_contents(
    urls=["https://example.com/article"],
    highlights={"maxCharacters": 2000},
    max_age_hours=12,  # 12時間以上古い場合はライブクロール
)
```

**ポイント:**
- `highlights` パラメータは `True` で簡単に有効化でき、オブジェクト形式で `maxCharacters` や `query` を指定することでより詳細な制御が可能です
- `max_age_hours` は既存の `livecrawl` パラメータと併用でき、より細かいキャッシュ制御を実現します
- `instant` 検索タイプはリアルタイムアプリケーションに最適で、`auto`（推奨デフォルト）、`fast`、`deep` と合わせて4つの検索タイプから選択可能です
- 新しいカテゴリは必要な場合のみ使用し、一般的な Web 検索では指定しない方が良い結果が得られます

## まとめ

Exa ツールにトークン効率、コンテンツ鮮度制御、低レイテンシ検索、新しいカテゴリなど、検索機能を強化する複数の新機能が追加されたリリースです。
