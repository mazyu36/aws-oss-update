---
title: "sdk-python v0.1.7"
version: "v0.1.7"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-06-09
summary: "モデルプロバイダーのコンテンツタイプサポート改善、OpenAI ストリーミングのエラーハンドリング強化、ネストされたスキーマの保持、エージェントコールバックハンドラーの修正、プロンプトキャッシング対応を含むバグ修正リリース。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.1.7"
---

## 概要

Strands Agents Python SDK v0.1.7 は、主にバグ修正と安定性向上に焦点を当てたリリースです。モデルプロバイダーでのサポートされていないコンテンツタイプの処理改善、ツール結果フォーマットの修正、OpenAI ストリーミング時の空レスポンス処理、深くネストされたスキーマの保持、エージェントのデフォルトコールバックハンドラーの修正、ContentBlock への CachePoint タイプ定義の追加など、複数の重要な修正が含まれています。

**リリース:** [v0.1.7](https://github.com/strands-agents/sdk-python/releases/tag/v0.1.7)

## 新機能

### ContentBlock に CachePoint タイプ定義を追加 ([#142](https://github.com/strands-agents/sdk-python/pull/142))

**この機能でできること:**
- ContentBlock クラスに新しい CachePoint タイプ定義が追加されました。これにより、プロンプトキャッシング機能を使用する際の型安全性が向上します。

**使用例:**

```python
from strands.types.content import ContentBlock

# CachePoint を含むコンテンツブロックを定義
content_blocks = [
    {
        "text": "長いコンテキスト情報がここに入ります..."
    },
    {
        "cachePoint": {}  # キャッシュポイントを設定
    },
    {
        "text": "追加の質問や指示"
    }
]

# 型安全に ContentBlock として扱えます
```

**ポイント:**
- Bedrock や Anthropic でのプロンプトキャッシング機能を使用する際に有効です
- 型定義が追加されたことで、IDE での補完やタイプチェックが改善されます

---

## バグ修正

### サポートされていないコンテンツタイプの処理を改善 ([#144](https://github.com/strands-agents/sdk-python/pull/144))

モデルプロバイダーがサポートしていないコンテンツタイプ（video、guardContent など）を受け取った場合、以前は json.dumps でテキストに変換しようとしていましたが、バイナリデータを含む場合に失敗していました。この修正により、サポートされていないコンテンツタイプに対しては明示的な例外を投げるようになり、エラーメッセージがより明確になりました。

**影響を受けるモデルプロバイダー:**
- Anthropic: guardContent と video をサポートしません
- OpenAI: cachePoint、guardContent、reasoningContent、video をサポートしません
- LiteLLM: cachePoint と guardContent をサポートしません
- LlamaAPI: cachePoint、document、guardContent、reasoningContent、video をサポートしません
- Ollama: cachePoint、document、guardContent、reasoningContent、video をサポートしません

### ツール結果コンテンツのフォーマットを修正 ([#154](https://github.com/strands-agents/sdk-python/pull/154))

OpenAI、LiteLLM、LlamaAPI、Ollama のモデルプロバイダーで、ツール結果のコンテンツフォーマットを各プロバイダーの仕様により適合するように改善しました。これにより、レスポンスの品質が向上し、バイナリデータを含むツール結果で発生していた json dump エラーが回避されます。

### エージェントのデフォルトコールバックハンドラーを修正 ([#170](https://github.com/strands-agents/sdk-python/pull/170))

エージェントのデフォルトコールバックハンドラーが正しく動作しない問題を修正しました。これにより、カスタムコールバックハンドラーを指定しない場合でも、エージェントが期待通りに動作するようになりました。

### 深くネストされたスキーマを保持 ([#133](https://github.com/strands-agents/sdk-python/pull/133))

ツールスキーマの正規化ロジックを改善し、深くネストされたオブジェクトを含むスキーマが正しく保持されるようになりました。以前は、複雑な入れ子構造を持つスキーマの一部が失われる問題がありました。

**修正前の問題:**
- 複数レベルのネストを持つスキーマで、内部の構造が失われる
- 複雑な Pydantic モデルをツールとして使用する際に問題が発生

**修正後:**
- すべてのネストレベルが再帰的に処理され、完全なスキーマ構造が保持されます

### OpenAI モデルプロバイダーで空の choices を処理 ([#185](https://github.com/strands-agents/sdk-python/pull/185))

OpenAI のストリーミング API 使用時に、choices が空のイベントが送信される場合がある問題に対処しました。以前は IndexError: list index out of range エラーが発生していましたが、空の choices リストに対して適切にガードすることで、ストリーミングが安定して動作するようになりました。

**修正内容:**
- choices リストが空でないことを確認してからアクセス
- OpenAI のストリーミング API の動作に合わせた防御的な実装

---

## まとめ

v0.1.7 は、安定性と信頼性を向上させる重要なバグ修正リリースです。モデルプロバイダーのエラーハンドリング改善、ツール結果のフォーマット修正、OpenAI ストリーミングの堅牢性向上、深くネストされたスキーマのサポート、エージェントコールバックの修正など、本番環境での使用における複数の課題に対処しています。
