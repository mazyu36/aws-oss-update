---
title: "bedrock-agentcore-sdk-python v0.1.7"
version: "v0.1.7"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-10-01
summary: "AWS リージョンのバリデーションロジックを改善し、デフォルトリージョンとユーザー指定リージョンの不一致による ValidationException を修正。セッション作成前にリージョンを検証することで、より堅牢なエラーハンドリングを実現。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.7"
---

## 概要

Bedrock AgentCore SDK Python v0.1.7 は、AWS リージョンのバリデーション処理を改善する重要なバグ修正リリースです。デフォルト AWS リージョンとユーザーが指定した `region_name` パラメータが一致しない場合に発生していた ValidationException を修正し、より適切なエラーハンドリングを実現しました。

**リリース:** [v0.1.7](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.7)

## バグ修正

### AWS リージョン不一致による ValidationException を修正 ([#102](https://github.com/aws/bedrock-agentcore-sdk-python/pull/102))

デフォルト AWS リージョンとユーザー指定の `region_name` が一致しない場合に、以下のようなエラーが発生していた問題を修正しました。

**修正前に発生していたエラー:**
```
ValueError: Region mismatch: provided region_name 'us-west-2' does not match boto3_session region 'us-east-1'.
Please ensure both parameters specify the same region or omit the region_name parameter to use the session's region.
```

**主な修正内容:**

1. **リージョンバリデーションのタイミングを変更**
   - boto3 セッション作成前にリージョンバリデーションを実行するように変更
   - セッション確立後の競合エラーを防止

2. **セッションパラメータをオプショナルに変更**
   - `_validate_and_resolve_region` メソッドで `Optional[boto3.Session]` を受け入れるように変更
   - 必須パラメータから任意パラメータに変更することで、柔軟性が向上

3. **バリデーションロジックの簡素化**
   - リージョン競合検出ロジックをより堅牢に改善
   - エラーメッセージをより明確に

**影響を受けるケース:**
- AWS CLI や環境変数でデフォルトリージョンを設定している環境で、コード内で異なる `region_name` を指定した場合
- boto3 セッションを事前に作成し、異なるリージョンでメモリセッションを初期化しようとした場合

**使用例:**

```python
import boto3
from bedrock_agentcore.memory import InMemorySession

# ケース 1: 環境変数のデフォルトリージョンと異なるリージョンを指定
# デフォルトが us-east-1 の環境で us-west-2 を指定
session = InMemorySession(
    session_id="my-session",
    region_name="us-west-2"  # v0.1.7 で正しく動作するように修正
)

# ケース 2: 既存の boto3 セッションとは異なるリージョンを指定
boto3_session = boto3.Session(region_name="us-east-1")
session = InMemorySession(
    session_id="my-session",
    region_name="us-west-2",  # v0.1.7 で適切にハンドリング
    boto3_session=boto3_session
)
```

**ポイント:**
- この修正により、リージョン指定時のエラーハンドリングがより明確になり、デバッグしやすくなりました
- マルチリージョン環境での Bedrock AgentCore の使用がより安定します
- エラーメッセージが改善され、問題の原因が特定しやすくなりました

---

## まとめ

v0.1.7 は、AWS リージョン設定に関する重要なバグ修正リリースです。デフォルトリージョンとユーザー指定リージョンの競合を適切にハンドリングすることで、マルチリージョン環境での安定性が向上しました。
