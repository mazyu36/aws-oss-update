---
title: "AgentCore Python SDK v1.4.5 リリース解説"
version: "v1.4.5"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-03-11
summary: "SessionManager の位置引数の順序を修正し、region_name を位置引数で渡した際に発生する NoRegionError を解消しました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.5"
---

## 概要

このリリースでは、Strands Memory 統合における `AgentCoreMemorySessionManager` の位置引数の順序が修正されました。これにより、`region_name` を位置引数で渡した際に発生していた `NoRegionError` が解消されています。

**リリース:** [v1.4.5](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.5)

## バグ修正

### SessionManager の位置引数の順序を修正 ([#318](https://github.com/aws/bedrock-agentcore-sdk-python/pull/318))

- v1.4.4 で追加された `converter` パラメータが2番目の位置引数として挿入されたことで、`region_name` を位置引数で渡すコードが正しく動作しなくなっていました
- `AgentCoreMemorySessionManager(config, REGION)` のように呼び出すと、`REGION` が `converter` に割り当てられ、`region_name=None` となり `NoRegionError` が発生していました
- 今回の修正で元の位置引数の順序（`config, region_name, boto_session, boto_client_config`）が復元され、`converter` はキーワード専用引数となりました

**修正後の使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import AgentCoreMemorySessionManager

# 位置引数での呼び出しが正しく動作するようになりました
session_manager = AgentCoreMemorySessionManager(config, "us-east-1")

# converter を使用する場合はキーワード引数で指定
session_manager = AgentCoreMemorySessionManager(
    config,
    "us-east-1",
    converter=my_converter
)
```

### OpenAI コンバーターファイルのフォーマット修正 ([#312](https://github.com/aws/bedrock-agentcore-sdk-python/pull/312))

- `ruff format` を適用し、コードスタイルを統一しました
- この修正により、依存関係更新の PR がブロックされていた lint エラーが解消されました

## まとめ

位置引数の順序に関する重要なバグが修正されました。`AgentCoreMemorySessionManager` を位置引数で使用していた場合は、このバージョンへのアップデートを推奨します。
