---
title: "AgentCore Python SDK v1.0.3 リリース解説"
version: "v1.0.3"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2025-10-16
summary: "Python 3.10 以下のバージョンとの互換性を改善するバグ修正リリース。NotRequired 型ヒントを Optional に置き換えることで、Python 3.11 未満の環境でも問題なく動作するようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.3"
---

## 概要

このリリースは、Python 3.10 以下のバージョンでの互換性問題を修正するバグ修正リリースです。`NotRequired` 型ヒントが Python 3.11 以降でのみサポートされているため、これを `Optional` に置き換えることで、より広範な Python バージョンで SDK が使用できるようになりました。

**リリース:** [v1.0.3](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.3)

## バグ修正

### Python 3.11 未満での互換性問題の修正 ([#125](https://github.com/aws/bedrock-agentcore-sdk-python/pull/125))

`typing.NotRequired` は Python 3.11 以降でのみサポートされている型ヒントのため、Python 3.10 以下の環境で SDK をインポートする際にエラーが発生していました。この問題を修正するため、`EventMetadataFilter.right` フィールドの型ヒントを `NotRequired` から `Optional` に変更しました。

**影響を受けていた状況:**
- Python 3.10 以下の環境で bedrock-agentcore をインポートすると、`ImportError` や `AttributeError` が発生していた
- メモリフィルタ機能を使用する際に型チェックエラーが発生する可能性があった

**修正内容:**
- `EventMetadataFilter` モデルの `right` フィールドの型を `NotRequired[EventMetadataFilter]` から `Optional[EventMetadataFilter]` に変更
- Python 3.8+ の全バージョンで動作する型ヒントに統一

**影響を受けるファイル:**
- `src/bedrock_agentcore/memory/models/filters.py`: フィルタモデルの型定義
- `src/bedrock_agentcore/memory/session.py`: セッション管理での型使用
- テストコードも合わせて更新

## まとめ

このリリースにより、Python 3.8 から 3.13 まで幅広いバージョンで bedrock-agentcore SDK が安定して動作するようになりました。既存のコードに変更は不要で、単に新しいバージョンにアップグレードするだけで修正が適用されます。

---
