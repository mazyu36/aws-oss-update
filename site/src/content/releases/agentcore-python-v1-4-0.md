---
title: "bedrock-agentcore-sdk-python v1.4.0"
version: "v1.4.0"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-02-24
summary: "SessionConfiguration による統合セッション設定機能を追加。プロキシ、ブラウザ拡張機能、プロファイルの永続化をシンプルな API で設定可能になりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.0"
---

## 概要

このリリースでは、ブラウザセッションの設定を一元管理できる `SessionConfiguration` クラスが追加されました。プロキシ設定、ブラウザ拡張機能の読み込み、プロファイルの永続化をシンプルな API で設定できるようになりました。

**リリース:** [v1.4.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.0)

## 新機能

### SessionConfiguration によるセッション設定の統合管理 ([#274](https://github.com/aws/bedrock-agentcore-sdk-python/pull/274))

**この機能でできること:**
- ビューポート、プロキシ、拡張機能、プロファイルを一つの設定オブジェクトにまとめて管理
- `to_dict()` メソッドで API 互換の辞書に変換し、`start()` に直接渡せる

**使用例:**

```python
from bedrock_agentcore.tools import (
    SessionConfiguration,
    ViewportConfiguration,
    ProxyConfiguration,
    ExternalProxy,
    BrowserExtension,
    ExtensionS3Location,
    ProfileConfiguration,
)

# セッション設定を構築
session_config = SessionConfiguration(
    viewport=ViewportConfiguration.desktop_hd(),  # 1920x1080
    proxy=ProxyConfiguration(
        proxies=[
            ExternalProxy(
                server="proxy.example.com",
                port=8080,
                domain_patterns=["*.target-site.com"],
            )
        ]
    ),
    extensions=[
        BrowserExtension(
            s3_location=ExtensionS3Location(
                bucket="my-extensions-bucket",
                prefix="my-extension/",
            )
        )
    ],
    profile=ProfileConfiguration(
        profile_identifier="user-session-123"
    ),
)

# セッション開始時に適用
client.start(**session_config.to_dict())
```

**ポイント:**
- 各設定は Optional なので、必要な設定のみを指定可能
- `ViewportConfiguration` にはプリセット（`desktop_hd()`, `laptop()`, `mobile()` など）が用意されている

---

### プロキシ設定機能 ([#274](https://github.com/aws/bedrock-agentcore-sdk-python/pull/274))

**この機能でできること:**
- 外部プロキシサーバーを経由してブラウザトラフィックをルーティング
- ドメインパターンでプロキシ対象を制御、バイパスパターンも設定可能
- Secrets Manager を利用した認証情報の安全な管理

**使用例:**

```python
from bedrock_agentcore.tools import (
    ProxyConfiguration,
    ExternalProxy,
    ProxyCredentials,
    BasicAuth,
)

# 認証付きプロキシの設定
proxy_config = ProxyConfiguration(
    proxies=[
        ExternalProxy(
            server="proxy.example.com",
            port=8080,
            domain_patterns=["*.example.com", "*.example.org"],
            credentials=ProxyCredentials(
                basic_auth=BasicAuth(
                    secret_arn="arn:aws:secretsmanager:us-east-1:123456789012:secret:proxy-creds"
                )
            ),
        )
    ],
    bypass_patterns=["*.internal.example.com"],  # プロキシをバイパスするドメイン
)

# セッションで使用
client.start(proxy_configuration=proxy_config.to_dict())
```

**ポイント:**
- 認証情報は Secrets Manager に `{"username": "...", "password": "..."}` 形式の JSON で保存
- 複数のプロキシサーバーを設定し、ドメインパターンで振り分け可能

---

### ブラウザ拡張機能の読み込み ([#274](https://github.com/aws/bedrock-agentcore-sdk-python/pull/274))

**この機能でできること:**
- S3 に保存したブラウザ拡張機能をセッションに読み込み
- 複数の拡張機能を同時に使用可能

**使用例:**

```python
from bedrock_agentcore.tools import BrowserExtension, ExtensionS3Location

# 拡張機能の設定
extensions = [
    BrowserExtension(
        s3_location=ExtensionS3Location(
            bucket="my-extensions-bucket",
            prefix="ad-blocker/",
            version_id="abc123",  # オプション: 特定バージョンを指定
        )
    ),
    BrowserExtension(
        s3_location=ExtensionS3Location(
            bucket="my-extensions-bucket",
            prefix="custom-tool/",
        )
    ),
]

# セッションで使用
client.start(extensions=[e.to_dict() for e in extensions])
```

**ポイント:**
- 拡張機能は S3 バケットにアップロードしておく必要がある
- `version_id` を指定することで特定バージョンの拡張機能を使用可能

---

### ブラウザプロファイルの永続化 ([#274](https://github.com/aws/bedrock-agentcore-sdk-python/pull/274))

**この機能でできること:**
- セッション間でブラウザの状態（Cookie、ローカルストレージなど）を永続化
- 同じプロファイル識別子を使用することで、以前のセッション状態を復元

**使用例:**

```python
from bedrock_agentcore.tools import ProfileConfiguration

# プロファイル設定
profile = ProfileConfiguration(
    profile_identifier="user-session-abc123"
)

# セッションで使用
client.start(profile_configuration=profile.to_dict())

# 後のセッションで同じプロファイルを使用すると、状態が復元される
```

**ポイント:**
- ログイン状態の維持など、セッション間で状態を共有したい場合に便利
- プロファイル識別子は一意であることを確認してください

## まとめ

このリリースでは、ブラウザセッションの設定を柔軟かつ型安全に管理できる `SessionConfiguration` とそれを構成する各種データクラスが追加されました。プロキシ経由のアクセス、拡張機能の活用、セッション状態の永続化など、高度なユースケースに対応できるようになりました。
