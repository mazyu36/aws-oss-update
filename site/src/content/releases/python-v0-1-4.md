---
title: "Strands Python SDK v0.1.4 リリース解説"
version: "v0.1.4"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-05-23
summary: "OpenAI モデルプロバイダーの追加、LiteLLM の usage キャプチャ修正、Bedrock の user agent 統合改善、非 ASCII 文字のテレメトリサポート強化などを含むリリースです。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.1.4"
---

## 概要

このリリースでは、OpenAI API を直接サポートする新しいモデルプロバイダーが追加され、LiteLLM と OpenAI の共通基盤クラスによるコード重複の削減が実現されました。また、LiteLLM での usage 情報のキャプチャに関するバグ修正、Bedrock での user agent の適切な統合、テレメトリにおける非 ASCII 文字（日本語、中国語、絵文字など）の正しい処理が実装されました。

**リリース:** [v0.1.4](https://github.com/strands-agents/sdk-python/releases/tag/v0.1.4)

## 新機能

### OpenAI モデルプロバイダー ([#65](https://github.com/strands-agents/sdk-python/pull/65))

**この機能でできること:**
- OpenAI API を直接利用できる新しいモデルプロバイダー `OpenAIModel` が追加されました。LiteLLM を経由せずに、OpenAI のサービスに直接アクセスできます。
- OpenAI 仕様を実装したベースクラス `OpenAIModelProvider` が導入され、LiteLLM と共通の実装を共有することでコードの重複が削減されました。

**使用例:**

```python
from strands.models.openai import OpenAIModel

# OpenAI モデルの初期化
model = OpenAIModel(
    model_id="gpt-4",
    api_key="your-api-key"
)

# モデルの呼び出し
response = model.converse(
    messages=[
        {"role": "user", "content": "Hello, how are you?"}
    ]
)

print(response.output.message.content)
```

**ポイント:**
- OpenAI 互換の API を持つサービス（例: SageMaker でホストされたモデル）でも、このベースクラスを継承して利用できます。
- LiteLLM も内部でこのベースクラスを利用するようにリファクタリングされ、コードの保守性が向上しています。
- 100% のテストカバレッジを達成しており、高い品質が保証されています。

---

## バグ修正

### LiteLLM での usage キャプチャの改善 ([#73](https://github.com/strands-agents/sdk-python/pull/73))

LiteLLM で特定のモデルを実行した際、`finish_reason` メッセージと `usage` メッセージの間に追加のペイロードが返されることがあり、usage 情報のキャプチャに問題が発生していました。この修正により、中間メッセージをスキップして最終的な usage メッセージを正しく取得できるようになりました。

**影響を受けていた状況:**
- LiteLLM 経由で一部のモデルを利用した際、トークン使用量などの usage 情報が正しく取得できないケースがありました。

---

### Bedrock での user agent の統合 ([#76](https://github.com/strands-agents/sdk-python/pull/76))

呼び出し元が botocore の `Config` を提供した場合、strands-agents の user agent が設定されていませんでした。この修正により、既存の Config がある場合でも user agent が適切にマージされ、リトライ設定などの呼び出し元の設定を失うことなく、strands-agents の識別情報が含まれるようになりました。

**影響を受けていた状況:**
- Bedrock を利用する際にカスタムの botocore Config（リトライ設定など）を提供していた場合、strands-agents の user agent が設定されていませんでした。

---

### テレメトリでの非 ASCII 文字のサポート ([#37](https://github.com/strands-agents/sdk-python/pull/37))

テレメトリトレーサーの `json.dumps()` 呼び出しに `ensure_ascii=False` パラメータが追加されました。これにより、日本語、中国語、絵文字などの非 ASCII 文字が `\uXXXX` のようにエスケープされず、そのまま出力されるようになり、ログやテレメトリデータの可読性が大幅に向上しました。

**影響を受けていた状況:**
- 多言語コンテンツや絵文字を含むデータをテレメトリで扱う際、エスケープシーケンスで表示されて読みにくい状態でした。

---

## まとめ

v0.1.4 では、OpenAI モデルプロバイダーの追加による選択肢の拡大と、LiteLLM との共通基盤による保守性の向上が実現されました。また、複数のバグ修正により、usage キャプチャの正確性、user agent の統合、国際化対応が改善され、より堅牢で使いやすい SDK になりました。
