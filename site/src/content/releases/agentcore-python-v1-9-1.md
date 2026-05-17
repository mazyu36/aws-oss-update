---
title: "bedrock-agentcore-sdk-python v1.9.1"
version: "v1.9.1"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-05-12
summary: "ファイルアップロード・ダウンロード時の二重 base64 エンコーディング問題の修正、ランタイムエラーハンドリングの改善、バウンドメソッドの entrypoint 登録サポートなど、複数のバグ修正が含まれています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.9.1"
---

## 概要

このリリースでは、Code Interpreter クライアントのファイルアップロード・ダウンロード機能における二重 base64 エンコーディング問題の修正、ランタイムのエラーハンドリング改善、バウンドメソッドの `entrypoint()` 登録サポートなど、複数の重要なバグ修正が含まれています。

**リリース:** [v1.9.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.9.1)

## バグ修正

### upload_file/download_file の二重 base64 エンコーディング問題を修正 ([#464](https://github.com/aws/bedrock-agentcore-sdk-python/pull/464))

**問題:**
- `upload_file`/`upload_files` が botocore の blob shape に渡す前に冗長に base64 エンコードを行っていたため、botocore が再度エンコードしていました
- `download_file`/`download_files` も同様に、botocore が既にデコードしたレスポンスを冗長にデコードしていました
- これにより、バイナリファイルのアップロード時にデータが破損し、ダウンロード時にクラッシュやガベージデータが返される問題が発生していました

**修正内容:**
- `upload_file`/`upload_files` から `base64.b64encode()` を削除し、生のバイトデータを直接 botocore に渡すようになりました
- `download_file`/`download_files` から `base64.b64decode()` を削除し、botocore がデコード済みのバイトデータをそのまま使用するようになりました

**使用例:**

```python
from bedrock_agentcore.tools import CodeInterpreterClient

client = CodeInterpreterClient(session_id="my-session")

# バイナリファイルのアップロード（v1.9.1 で正常に動作）
with open("image.png", "rb") as f:
    binary_data = f.read()

client.upload_file("image.png", binary_data)

# バイナリファイルのダウンロード
downloaded_data = client.download_file("image.png")

# ラウンドトリップが正常に動作
assert downloaded_data == binary_data
```

**ポイント:**
- v1.9.1 にアップグレードすることで、バイナリファイルのアップロード・ダウンロードが正常に動作するようになります
- 既存のコードの変更は不要です

---

### リクエストパースエラーとハンドラーの JSON エラーを区別 ([#472](https://github.com/aws/bedrock-agentcore-sdk-python/pull/472))

**問題:**
- ハンドラー内で `json.JSONDecodeError` が発生した場合（例：モデル出力のパース時）、誤って「Invalid JSON in request」というエラーメッセージが返されていました
- これにより、実際のエラー原因が分かりにくくなっていました

**修正内容:**
- `JSONDecodeError`/`UnicodeDecodeError` のキャッチ範囲を `request.json()` のパース処理のみに限定しました
- ハンドラーで発生した例外は HTTP 500 で実際のエラーメッセージを返すようになりました

**影響を受けていたケース:**
- ハンドラー内で JSON のパース処理を行っている場合
- モデル出力の JSON パースでエラーが発生した場合

**修正後の動作:**
- リクエスト JSON が無効な場合: HTTP 400「Invalid JSON in request」
- ハンドラー内で `JSONDecodeError` が発生した場合: HTTP 500 と実際のエラーメッセージ

---

### entrypoint() でバウンドメソッドの登録をサポート ([#474](https://github.com/aws/bedrock-agentcore-sdk-python/pull/474))

**問題:**
- クラスベースの Agent パターンで、バウンドメソッドを `entrypoint()` に登録しようとすると `AttributeError` が発生していました
- バウンドメソッドやその他の書き込み可能な `__dict__` を持たない callable を登録できませんでした

**修正内容:**
- `entrypoint()` 内の `.run` 属性の割り当てを `try/except AttributeError` でガードしました
- バウンドメソッドでも問題なく登録できるようになりました

**使用例:**

```python
from bedrock_agentcore.runtime import App

app = App()

class MyAgent:
    def __init__(self, config):
        self.config = config
    
    def handle_request(self, request):
        # Agent のロジック
        return {"result": "success", "config": self.config}

# クラスベースの Agent パターン
agent = MyAgent(config={"model": "claude-3"})

# v1.9.0 以前: AttributeError が発生
# v1.9.1: 正常に登録される
app.entrypoint()(agent.handle_request)
```

**ポイント:**
- クラスベースの Agent パターンがサポートされ、より柔軟な設計が可能になりました
- 通常の関数デコレータとしての使用方法には影響ありません

## まとめ

このリリースでは、Code Interpreter のファイル操作における二重 base64 エンコーディング問題、ランタイムのエラーハンドリング改善、クラスベース Agent パターンのサポートなど、複数の重要なバグ修正が行われました。特にファイルアップロード・ダウンロード機能を使用している場合は、v1.9.1 へのアップグレードを推奨します。
