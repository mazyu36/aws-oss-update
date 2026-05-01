---
title: "bedrock-agentcore-sdk-python v1.6.3"
version: "v1.6.3"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-04-16
summary: "SSRF 脆弱性の修正: 悪意のある region パラメータによる API リクエストのリダイレクト攻撃を防止します。CVE-2026-22611 と同じ脆弱性クラスに対応。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.3"
---

## 概要

このリリースでは、重要なセキュリティ修正が含まれています。悪意のある `region` パラメータ値（例: `x@attacker.com:443/#`）を使用して、SigV4 署名されたリクエストを含む SDK API 呼び出しを AWS 以外のホストにリダイレクトする SSRF 脆弱性を修正しました。CVE-2026-22611 と同じ脆弱性クラスです。

**リリース:** [v1.6.3](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.6.3)

## バグ修正

### region パラメータのバリデーションによる SSRF リクエストリダイレクションの防止 ([#417](https://github.com/aws/bedrock-agentcore-sdk-python/pull/417))

**修正内容:**
- 悪意のある `region` 値による API リクエストのリダイレクト攻撃（SSRF）を防止するバリデーションを追加しました

**影響を受けていた状況:**
- `region` パラメータにユーザー入力を直接渡している場合
- 悪意のある `region` 値（例: `x@attacker.com:443/#`）により、SigV4 署名付きリクエスト（認証情報を含む）が AWS 以外のホストに送信される可能性がありました

**修正の詳細:**

**1. 手動 URL 構築パスへの region バリデーション追加**

対象ファイル: `endpoints.py`, `a2a.py`, `AgentCoreRuntimeClient`, `BrowserClient`

- **レイヤー 1**: `validate_region()` 関数による正規表現バリデーション（`\A[a-z]{2}(-[a-z]+)+-\d+\Z`、改行バイパス防止のため `\Z` アンカー使用）
- **レイヤー 2**: `_validate_endpoint_url()` による構築済み URL のホスト名検証（`.amazonaws.com` で終わることを確認）
- 後方互換性のため `InvalidRegionError(ValueError)` カスタム例外を追加

```python
from bedrock_agentcore._utils.endpoints import validate_region, InvalidRegionError

# 有効なリージョン
validate_region("us-west-2")  # OK
validate_region("ap-northeast-1")  # OK

# 無効なリージョン - InvalidRegionError が発生
try:
    validate_region("x@attacker.com:443/#")
except InvalidRegionError as e:
    print(f"不正なリージョン: {e}")
```

**2. boto3 クライアントから冗長な endpoint_url を削除**

対象: `CodeInterpreter`, `IdentityClient`, `ResourcePolicyClient`, `MemoryControlPlaneClient`

- boto3 自身のエンドポイント解決は同一の URL を生成し、組み込みの region バリデーションを含みます
- `endpoint_url` は環境変数オーバーライドが明示的に設定されている場合のみ渡されるようになりました（`BEDROCK_AGENTCORE_DP_ENDPOINT`, `BEDROCK_AGENTCORE_CP_ENDPOINT`）

**ポイント:**
- **即時アップデートを推奨**: この脆弱性は認証情報の漏洩につながる可能性があるため、速やかにアップデートしてください
- **後方互換性あり**: `InvalidRegionError` は `ValueError` を継承しているため、既存の例外ハンドリングは引き続き動作します
- **環境変数オーバーライドは引き続き動作**: `BEDROCK_AGENTCORE_DP_ENDPOINT` や `BEDROCK_AGENTCORE_CP_ENDPOINT` を使用したカスタムエンドポイント設定は影響を受けません

## まとめ

このリリースはセキュリティ修正を含む重要なアップデートです。SSRF 脆弱性により認証情報が漏洩する可能性があったため、Bedrock AgentCore SDK を使用しているすべてのユーザーは速やかに v1.6.3 にアップデートすることを強く推奨します。
