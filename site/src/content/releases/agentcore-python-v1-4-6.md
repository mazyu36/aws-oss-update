---
title: "AgentCore Python SDK v1.4.6 リリース解説"
version: "v1.4.6"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-03-12
summary: "browser_session() に name パラメータを追加し、MemoryClient で boto3_session を指定できるようになりました。また、SELF_MANAGED 設定タイプの処理や API パラメータ名に関する複数のバグ修正が含まれています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.6"
---

## 概要

このリリースでは、ブラウザセッションに名前を付ける機能と、MemoryClient でカスタム boto3 セッションを使用できる機能が追加されました。また、SELF_MANAGED 設定タイプの処理に関する複数のバグ修正と、API パラメータ名の修正が含まれています。

**リリース:** [v1.4.6](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.6)

## 新機能

### browser_session() に name パラメータを追加 ([#326](https://github.com/aws/bedrock-agentcore-sdk-python/pull/326))

**この機能でできること:**
- `browser_session()` コンテキストマネージャーと `SessionConfiguration` データクラスで、ブラウザセッションに名前を付けられるようになりました

**使用例:**

```python
from bedrock_agentcore.tools import BrowserClient, SessionConfiguration

# コンテキストマネージャーで名前を指定
async with browser_session(name="my-session") as session:
    # セッションを使用
    pass

# SessionConfiguration で名前を指定
config = SessionConfiguration(
    name="my-session",
    viewport_width=1920,
    viewport_height=1080
)
```

**ポイント:**
- セッション名を付けることで、複数のセッションを管理しやすくなります

---

### MemoryClient に boto3_session パラメータを追加 ([#330](https://github.com/aws/bedrock-agentcore-sdk-python/pull/330))

**この機能でできること:**
- `MemoryClient` でカスタム boto3 セッションを使用できるようになり、名前付きプロファイルやカスタム認証情報の設定が可能になりました

**使用例:**

```python
import boto3
from bedrock_agentcore.memory import MemoryClient

# カスタムセッションを作成
session = boto3.Session(profile_name="my-profile")

# MemoryClient にセッションを渡す
client = MemoryClient(boto3_session=session)

# region_name と組み合わせて使用することも可能
client = MemoryClient(
    boto3_session=session,
    region_name="us-west-2"
)
```

**ポイント:**
- `MemorySessionManager` と同様のインターフェースになり、一貫性が向上しました
- 名前付きプロファイル、STS 認証情報、その他のセッションレベル設定が利用可能です

## バグ修正

### SELF_MANAGED オーバーライドタイプの処理を修正 ([#290](https://github.com/aws/bedrock-agentcore-sdk-python/pull/290))

- CUSTOM ストラテジーで SELF_MANAGED 設定タイプを使用する際、`_wrap_configuration` メソッドが `ValueError: 'SELF_MANAGED' is not a valid OverrideType` でクラッシュする問題を修正
- `override_type` 文字列を `OverrideType` enum に安全に変換するヘルパーメソッドを追加

### 不明な設定キーのパススルーを修正 ([#322](https://github.com/aws/bedrock-agentcore-sdk-python/pull/322))

- `_wrap_configuration` が `extraction`、`consolidation`、`reflection` 以外のキー（`selfManagedConfiguration` など）を削除してしまう問題を修正
- 未知のキーを API に渡すことで、SELF_MANAGED ストラテジーの変更が正しく動作するようになりました

### UnicodeDecodeError で 400 を返すように修正 ([#313](https://github.com/aws/bedrock-agentcore-sdk-python/pull/313))

- 無効な UTF-8 バイトを含むリクエストで `UnicodeDecodeError` が発生した際、500 ではなく 400 Bad Request を返すように修正
- エラーメッセージとして "Invalid encoding" が返されます

### search_long_term_memories のパラメータ名を修正 ([#314](https://github.com/aws/bedrock-agentcore-sdk-python/pull/314))

- `MemorySessionManager.search_long_term_memories` が boto3 API に `strategyId` ではなく正しい `memoryStrategyId` を送信するように修正
- これにより、ストラテジー ID を指定した長期記憶の検索が正しく動作するようになりました

## まとめ

ブラウザセッションの名前付けと MemoryClient でのカスタムセッションサポートが追加され、使い勝手が向上しました。また、SELF_MANAGED ストラテジーの処理に関する重要なバグ修正が含まれているため、メモリ機能を使用している場合はアップデートを推奨します。
