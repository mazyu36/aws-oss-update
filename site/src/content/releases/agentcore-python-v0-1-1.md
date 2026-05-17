---
title: "AgentCore Python SDK v0.1.1 リリース解説"
version: "v0.1.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2025-07-23
summary: "OAuth2 パラメータ名の修正、MemoryClient のリージョン検出改善、JSON シリアライゼーションの一貫性向上など、重要なバグ修正を含むリリース。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.1"
---

## 概要

Bedrock AgentCore SDK Python v0.1.1 は、OAuth2 認証、メモリクライアントのリージョン処理、JSON レスポンスのシリアライゼーションに関する重要なバグ修正を含むリリースです。これらの修正により、API の互換性、AWS SDK の標準動作との整合性、高並行性シナリオでのレスポンス処理の信頼性が向上しました。

**リリース:** [v0.1.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.1)

## バグ修正

### Identity OAuth2 パラメータ名の修正 ([#12](https://github.com/aws/bedrock-agentcore-sdk-python/pull/12))

GetResourceOauth2Token API のパラメータ名が誤っていた問題を修正しました。パラメータ名が `callBackUrl` から `resourceOauth2ReturnUrl` に変更され、正しい API 互換性が確保されました。

**影響を受けていた状況:**
- Identity 認証フローで OAuth2 トークンを取得する際に、誤ったパラメータ名が使用されていました
- GetResourceOauth2Token API が正しく動作しない可能性がありました

**改善内容:**
- パラメータ名が API 仕様に準拠した `resourceOauth2ReturnUrl` に変更されました
- OAuth2 トークン取得が正しく機能するようになりました

---

### Memory クライアントのリージョン検出の改善 ([#10](https://github.com/aws/bedrock-agentcore-sdk-python/pull/10))

MemoryClient の初期化時のリージョン処理が改善され、標準的な AWS SDK のリージョン検出順序に従うようになりました。

**影響を受けていた状況:**
- MemoryClient が独自のリージョンデフォルト値とエンドポイントをハードコードしていました
- AWS の標準的なリージョン検出動作に従っていませんでした

**改善内容:**
- 標準的な AWS SDK のリージョン検出順序に従うようになりました
  1. 明示的な `region_name` パラメータ
  2. 環境変数（AWS_DEFAULT_REGION など）
  3. boto3 セッションのデフォルトリージョン
  4. 最後の手段として 'us-west-2'
- 検出されたリージョンに基づいてエンドポイントが動的に設定されます

**使用例:**

```python
from bedrock_agentcore.memory import MemoryClient

# 方法1: 明示的にリージョンを指定（推奨）
memory_client = MemoryClient(
    region_name="us-east-1"
)

# 方法2: 環境変数を使用
# export AWS_DEFAULT_REGION=us-east-1
memory_client = MemoryClient()

# 方法3: boto3 セッションのデフォルトリージョンを使用
import boto3

session = boto3.Session(region_name="ap-northeast-1")
memory_client = MemoryClient()
```

**ポイント:**
- AWS SDK の標準動作に準拠し、予測可能な動作を実現
- 複数リージョンを使用する環境での柔軟性が向上

---

### JSON シリアライゼーションの一貫性向上 ([#14](https://github.com/aws/bedrock-agentcore-sdk-python/pull/14))

ストリーミングおよび非ストリーミングレスポンスにおける JSON シリアライゼーションの一貫性が向上し、複数の問題が修正されました。

**影響を受けていた状況:**
- セマフォの取得制限に達した際に、JSON レスポンスが二重にラップされる問題がありました
- ストリーミング（SSE）と通常のレスポンスで、datetime、Decimal、sets、Unicode 文字などの複雑なオブジェクトの処理方法が異なっていました
- 高並行性シナリオで不正な形式のレスポンスが発生する可能性がありました

**改善内容:**
- 新しい `_safe_serialize_to_json_string` メソッドが追加され、段階的なフォールバック処理を実装
- ストリーミング（SSE）と非ストリーミングレスポンスの両方で同一のシリアライゼーションロジックを使用
- datetime、Decimal、sets、Unicode 文字を一貫して処理
- シリアライズ不可能なオブジェクトのエラーハンドリングが改善
- JSON レスポンスの二重ラップ問題を解決

**技術的な詳細:**
```python
# 段階的なシリアライゼーションフォールバック:
# 1. Unicode サポート付きの直接 JSON シリアライゼーション
# 2. 文字列変換後の JSON エンコード
# 3. エラーオブジェクトの JSON エンコード（最終フォールバック）
```

**ポイント:**
- ストリーミングと非ストリーミングレスポンスで一貫した動作
- 高並行性環境での信頼性向上
- 複雑なデータ型の適切な処理

---

## まとめ

v0.1.1 は、OAuth2 認証、メモリクライアントのリージョン処理、JSON レスポンスのシリアライゼーションに関する重要なバグ修正を含むリリースです。これらの修正により、API の互換性、AWS SDK との整合性、高並行性環境での信頼性が大幅に向上し、より安定した運用が可能になりました。
