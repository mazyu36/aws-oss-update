---
title: "bedrock-agentcore-sdk-python v1.0.5"
version: "v1.0.5"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-10-29
summary: "このリリースでは、Memory 機能における AWS リージョン解決の改善が含まれています。AWS_REGION 環境変数が正しく認識されるようになり、より柔軟なリージョン設定が可能になりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.5"
---

## 概要

このリリースでは、Memory 機能における AWS リージョン解決の改善が行われました。以前は `AWS_REGION` 環境変数が正しく認識されない問題がありましたが、このバグが修正され、複数の方法でリージョンを指定できるようになりました。

**リリース:** [v1.0.5](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.0.5)

## バグ修正

### AWS_REGION 環境変数の解決 ([#143](https://github.com/aws/bedrock-agentcore-sdk-python/pull/143))

Memory 機能（`MemorySessionManager` と `MemoryClient`）において、`AWS_REGION` 環境変数が正しく認識されない問題が修正されました。これにより、環境変数を使用した柔軟なリージョン設定が可能になりました。

**リージョン解決の優先順位:**

SDK は以下の優先順位で AWS リージョンを解決します：

1. `MemorySessionManager` に渡された `region_name` パラメータ
2. `boto3_session` から取得されるリージョン
3. `AWS_REGION` 環境変数
4. `AWS_DEFAULT_REGION` 環境変数
5. デフォルトのフォールバック: `us-west-2`

**使用例:**

```python
import os
from bedrock_agentcore.memory import MemorySessionManager
from bedrock_agentcore.memory.client import MemoryClient

# 環境変数でリージョンを設定
os.environ['AWS_REGION'] = 'eu-west-1'

# MemorySessionManager は AWS_REGION を認識
manager = MemorySessionManager(memory_id="test-memory")
print(f"Region: {manager.region_name}")  # 出力: eu-west-1

# MemoryClient も同様に AWS_REGION を認識
client = MemoryClient()
print(f"Region: {client.region_name}")  # 出力: eu-west-1
```

**ポイント:**

- 環境変数を使用することで、コードを変更せずにリージョンを切り替えることができます
- `AWS_DEFAULT_REGION` も使用可能で、`AWS_REGION` が設定されていない場合のフォールバックとして機能します
- 明示的に `region_name` パラメータを指定することで、環境変数をオーバーライドできます

## まとめ

このリリースでは、Memory 機能のリージョン解決が改善され、より柔軟な環境設定が可能になりました。環境変数を活用することで、異なる環境でのデプロイがより簡単になります。
