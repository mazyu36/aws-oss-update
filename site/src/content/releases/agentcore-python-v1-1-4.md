---
title: "bedrock-agentcore-sdk-python v1.1.4"
version: "v1.1.4"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-01-08
summary: "メッセージにバイナリデータ（画像など）が含まれる場合に発生していた JSON シリアライゼーションエラーを修正しました。Tool の結果に画像が含まれる場合でも、正常にメッセージを処理できるようになります。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.4"
---

## 概要

このリリースでは、`message_to_payload` 関数でバイナリデータ（画像など）を含むメッセージを処理する際に発生していた `TypeError: Object of type bytes is not JSON serializable` エラーが修正されました。Tool の結果に画像が含まれるケースでも、メッセージを正常に処理できるようになります。

**リリース:** [v1.1.4](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.4)

## バグ修正

### message_to_payload でのバイナリデータ処理エラーの修正 ([#199](https://github.com/aws/bedrock-agentcore-sdk-python/pull/199))

**問題:**
- v1.1.2 で導入された `_filter_empty_text` 関数が、バイナリデータ（bytes）をエンコードする前に適用されていたため、`json.dumps()` で `TypeError` が発生していました
- Tool の結果に画像などのバイナリデータが含まれる場合、メッセージの処理が失敗していました

**修正内容:**
- 処理順序を変更し、以下の順で実行されるようになりました:
  1. `to_dict()` を呼び出してバイナリデータを base64 エンコード
  2. エンコード済みのメッセージに対して `_filter_empty_text` を適用

**影響を受けていたケース:**
- `bedrock_agentcore.memory.integrations.strands` の `message_to_payload` 関数を使用している場合
- Tool の結果にバイナリデータ（画像、ファイルなど）が含まれる場合

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import message_to_payload
from bedrock_agentcore.structures import SessionMessage

# Tool の結果に画像が含まれるメッセージ
message = SessionMessage(
    role="assistant",
    content=[
        {"type": "text", "text": "画像を生成しました"},
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b"..."}}
    ]
)

# v1.1.3 以前: TypeError が発生
# v1.1.4: 正常に処理される
payload = message_to_payload(message)
```

**ポイント:**
- v1.1.4 にアップグレードすることで、バイナリデータを含むメッセージを正常に処理できるようになります
- コードの変更は不要で、既存のコードはそのまま動作します
- この修正により、マルチモーダルな Agent の実装がより安定します

## まとめ

このリリースでは、バイナリデータ処理に関する重要なバグが修正されました。Tool の結果に画像が含まれる場合でも、メッセージを正常に処理できるようになり、マルチモーダルな Agent の開発がより安定します。
