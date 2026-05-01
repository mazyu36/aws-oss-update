---
title: "bedrock-agentcore-sdk-python v1.0.6"
version: "v1.0.6"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-11-10
summary: "メモリ管理の名前空間一括削除機能の追加、Browser と Code Interpreter のコントロールプレーン CRUD 操作の追加、および list_events のフィルタリングバグ修正を含むリリースです。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.6"
---

## 概要

このリリースでは、メモリセッション管理の名前空間内の全レコードを一括削除できる機能が追加されました。また、Browser と Code Interpreter のリソース管理機能が大幅に強化され、コントロールプレーンでの CRUD 操作と設定ヘルパーが利用可能になりました。さらに、イベントリスト取得時のフィルタリングに関するバグが修正されています。

**リリース:** [v1.0.6](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.6)

## 新機能

### 名前空間内のメモリレコード一括削除 ([#148](https://github.com/aws/bedrock-agentcore-sdk-python/pull/148))

**この機能でできること:**
- 指定した名前空間内の全ての長期メモリレコードをバッチ操作で削除できます。内部的には対象レコードを取得し、`batch_delete_memory_records` API を使用して効率的に削除処理を実行します。

**使用例:**

```python
from bedrock_agentcore.memory import MemorySessionManager
import time

# メモリセッションマネージャーを初期化
manager = MemorySessionManager(
    memory_id="your-memory-id",
    region_name="us-east-1"
)

namespace = "example/demo"

# メモリレコードをバッチ作成
memory_records = [
    {
        "requestIdentifier": "req-1",
        "content": {"text": "Python is a great programming language"},
        "namespaces": [namespace],
        "timestamp": "2024-01-01T12:00:00Z"
    },
    {
        "requestIdentifier": "req-2",
        "content": {"text": "AWS Bedrock AgentCore provides memory services"},
        "namespaces": [namespace],
        "timestamp": "2024-01-01T12:01:00Z"
    }
]

create_result = manager.batch_create_memory_records(
    memoryId=manager._memory_id,
    records=memory_records
)

print(f"Created {len(create_result.get('successfulRecords', []))} memory records")

# レコードがインデックスされるまで待機
time.sleep(10)

# 名前空間内のメモリレコードをリスト
records = manager.list_long_term_memory_records(namespace_prefix=namespace)
print(f"Found {len(records)} records")

# 名前空間内の全メモリレコードを削除
delete_result = manager.delete_all_long_term_memories_in_namespace(namespace)

successful_deletes = len(delete_result.get("successfulRecords", []))
failed_deletes = len(delete_result.get("failedRecords", []))

print(f"Deletion complete: {successful_deletes} successful, {failed_deletes} failed")
```

**ポイント:**
- 名前空間が空の場合、API 呼び出しは行われずに空の結果が返されます
- 削除結果には成功・失敗したレコード数が含まれるため、部分的な失敗にも対応できます
- 大量のレコードを効率的に削除したい場合に最適です

---

### Browser と Code Interpreter のコントロールプレーン CRUD 操作 ([#152](https://github.com/aws/bedrock-agentcore-sdk-python/pull/152))

**この機能でできること:**
- カスタム Browser と Code Interpreter のリソースを作成・削除・取得・リスト化できます。セッション管理のための取得・リスト・更新操作も追加されました。さらに、CAPTCHA を軽減する Web Bot Auth (browserSigning) のサポートも含まれています。

**使用例:**

```python
from bedrock_agentcore.tools import BrowserClient
from bedrock_agentcore.tools.config import (
    create_browser_config,
    NetworkConfiguration,
    VpcConfig,
    BrowserSigningConfiguration
)

# Browser クライアントを初期化
browser_client = BrowserClient(region_name="us-east-1")

# 設定ヘルパーを使用してブラウザ設定を作成
vpc_config = VpcConfig(
    subnetIds=["subnet-12345678"],
    securityGroupIds=["sg-12345678"]
)

network_config = NetworkConfiguration(vpcConfig=vpc_config)

# browserSigning を有効化して CAPTCHA を軽減
signing_config = BrowserSigningConfiguration(enabled=True)

browser_config = create_browser_config(
    name="my-custom-browser",
    networkConfiguration=network_config,
    browserSigningConfiguration=signing_config
)

# カスタムブラウザを作成
response = browser_client.create_browser(**browser_config.to_dict())
browser_id = response["browserId"]
print(f"Created browser with ID: {browser_id}")

# ブラウザ情報を取得
browser_info = browser_client.get_browser(browserId=browser_id)
print(f"Browser status: {browser_info['status']}")

# ブラウザ一覧を取得
browsers = browser_client.list_browsers()
print(f"Total browsers: {len(browsers['browsers'])}")

# セッション情報を取得
session_info = browser_client.get_session(
    browserId=browser_id,
    sessionId="session-123"
)

# ブラウザを削除
browser_client.delete_browser(browserId=browser_id)
print("Browser deleted successfully")
```

**使用例 (Code Interpreter):**

```python
from bedrock_agentcore.tools import CodeInterpreterClient
from bedrock_agentcore.tools.config import VpcConfig

# Code Interpreter クライアントを初期化
interpreter_client = CodeInterpreterClient(region_name="us-east-1")

# VPC 設定を使用してインタープリタを作成
vpc_config = VpcConfig(
    subnetIds=["subnet-87654321"],
    securityGroupIds=["sg-87654321"]
)

response = interpreter_client.create_code_interpreter(
    name="my-interpreter",
    vpcConfig=vpc_config.to_dict()
)
interpreter_id = response["codeInterpreterId"]
print(f"Created interpreter with ID: {interpreter_id}")

# インタープリタ情報を取得
interpreter_info = interpreter_client.get_code_interpreter(
    codeInterpreterId=interpreter_id
)
print(f"Interpreter status: {interpreter_info['status']}")

# インタープリタ一覧を取得
interpreters = interpreter_client.list_code_interpreters()
print(f"Total interpreters: {len(interpreters['codeInterpreters'])}")

# インタープリタを削除
interpreter_client.delete_code_interpreter(codeInterpreterId=interpreter_id)
print("Interpreter deleted successfully")
```

**ポイント:**
- 新しい `config.py` モジュールにより、設定オブジェクトを簡単に作成できます
- `browserSigning` を有効化することで、ブラウザ自動化時の CAPTCHA 表示を削減できます
- コンテキストマネージャーがオプションパラメータを適切に処理するよう修正されました
- セッションのライフサイクル管理がサポートされ、長時間実行タスクの管理が容易になりました

---

## バグ修正

### list_events のブランチとイベントメタデータフィルタの修正 ([#153](https://github.com/aws/bedrock-agentcore-sdk-python/pull/153))

**修正内容:**
- `MemorySessionManager.list_events()` において、`branch` と `eventMetadata` の両方のフィルタを指定した場合、`eventMetadata` フィルタが `branch` フィルタを上書きしてしまうバグが修正されました。
- 修正後は、両方のフィルタが適切に適用され、指定したブランチ内でイベントメタデータ条件に一致するイベントのみが返されるようになりました。

**影響を受けていた状況:**
- 特定のブランチ内でイベントメタデータフィルタを使用してイベントを検索する際、意図せず全ブランチのイベントが対象になっていました
- 現在は `filterMap` を使用して両方のフィルタを正しく組み合わせて適用します

## まとめ

v1.0.6 では、メモリ管理の効率化と Browser/Code Interpreter のリソース管理機能の大幅な強化が行われました。CAPTCHA 削減のための Web Bot Auth サポートも追加され、より実用的なブラウザ自動化が可能になっています。
