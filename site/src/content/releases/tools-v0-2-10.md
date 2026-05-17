---
title: "Strands Tools v0.2.10 リリース解説"
version: "v0.2.10"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-10-08
summary: "Twelve Labs の AI モデルを使用した動画分析ツール（search_video と chat_video）を追加。バッチツールの出力形式を改善し、エージェントが個別のツール結果を表示できるように修正。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.10"
---

## 概要

Strands Agents Tools v0.2.10 では、Twelve Labs の AI モデルを活用した 2 つの動画分析ツール（search_video と chat_video）が追加されました。また、バッチツールの出力形式が改善され、エージェントが個別のツール実行結果を表示できるようになりました。

**リリース:** [v0.2.10](https://github.com/strands-agents/tools/releases/tag/v0.2.10)

## 新機能

### Twelve Labs ビデオ分析ツール ([#120](https://github.com/strands-agents/tools/pull/120))

**この機能でできること:**
- Twelve Labs の AI モデルを使用して動画コンテンツを分析できる 2 つの新しいツールが追加されました。search_video は自然言語クエリで動画を検索し、chat_video は動画に対する Q&A を可能にします。いずれもマルチモーダル分析（視覚と音声）をサポートしています。

**search_video ツール:**

```python
from strands_tools import search_video
from strands import Agent

# Twelve Labs API キーを環境変数に設定
# export TWELVE_LABS_API_KEY="your_api_key"

agent = Agent(
    name="Video Analyst",
    description="動画コンテンツを分析するエージェント",
    tools=[search_video]
)

# 動画の内容を自然言語で検索
response = agent("インデックス 'my_index_id' から、猫が遊んでいるシーンを検索してください")
print(response)
```

**chat_video ツール:**

```python
from strands_tools import chat_video
from strands import Agent

agent = Agent(
    name="Video Q&A Agent",
    description="動画について質問に答えるエージェント",
    tools=[chat_video]
)

# 動画の URL を指定して質問
response = agent(
    "この動画について教えてください: https://example.com/video.mp4 - 何が起こっていますか？"
)
print(response)

# 動画をアップロードして分析することも可能
```

**ポイント:**
- search_video は Twelve Labs の Marengo モデルを使用し、動画インデックスに対してセマンティック検索を実行します
- chat_video は Pegasus モデルを使用し、動画のアップロード機能とキャッシングをサポートしています
- どちらのツールも視覚と音声の両方を分析できます
- Twelve Labs API キーが必要です（環境変数 `TWELVE_LABS_API_KEY` に設定）

---

## バグ修正

### バッチツールの出力形式を改善 ([#273](https://github.com/strands-agents/tools/pull/273))

**修正内容:**
- バッチツールが「batch call executed successfully」という汎用メッセージのみを表示していた問題を修正しました。エージェントが個別のツール実行結果を正しく表示できるよう、人間が読みやすいテキストと構造化 JSON の両方を返すデュアル出力形式に変更しました。

**改善点:**
- 誤解を招く「Tool missing」エラーメッセージを修正
- バッチメタデータを追加しつつ、元のツール結果を保持
- エージェントが並列実行された各ツールの結果を表示可能に
- ドキュメントの誤字を修正（'Sammple' → 'Sample'）

**影響を受けていた状況:**
- バッチツールを使用して複数のツールを並列実行した際、エージェントが実際のツール結果を表示できず、成功メッセージのみが表示されていました

---

## まとめ

v0.2.10 では、Twelve Labs の強力な AI モデルを活用した動画分析機能が追加され、動画コンテンツに対する高度な検索と対話が可能になりました。また、バッチツールの使いやすさが改善され、並列実行時の結果表示がより明確になりました。
