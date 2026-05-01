---
title: "tools v0.2.14"
version: "v0.2.14"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-11-04
summary: "Browser Tool のインポートエラー修正と、A2A Client Tool に認証機能が追加されました。httpx パラメータを渡すことで JWT トークンを使った認証が可能になります。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.14"
---

## 概要

このリリースでは、Browser Tool のオプショナル依存関係に関するインポートエラーが修正され、A2A Client Tool に認証機能が追加されました。httpx クライアントパラメータを渡すことで、JWT トークンを使った認証が可能になり、より安全な Agent-to-Agent 通信を実現できます。

**リリース:** [v0.2.14](https://github.com/strands-agents/tools/releases/tag/v0.2.14)

## 新機能

### A2A Client Tool に認証パラメータを追加 ([#298](https://github.com/strands-agents/tools/pull/298))

**この機能でできること:**
A2A Client Tool に httpx クライアントパラメータを渡せるようになりました。これにより、JWT トークンなどの認証ヘッダーを含めて Agent-to-Agent 通信を行うことが可能になります。

**使用例:**

```python
from strands import Agent
from strands_tools import A2AClient

# JWT トークンを使った認証付き A2A Client の作成
a2a_client = A2AClient(
    agent_id="your-agent-id",
    region="us-east-1",
    httpx_client_kwargs={
        "headers": {
            "Authorization": "Bearer your-jwt-token"
        }
    }
)

# Agent に A2A Client Tool を追加
agent = Agent(tools=[a2a_client])

# 認証付きで他の Agent と通信
result = agent("他の Agent に接続して情報を取得してください")
```

**ポイント:**
- httpx クライアントそのものではなく、クライアント引数を渡す設計になっています。これは asyncio イベントループのバインディング問題を回避するためで、リクエストごとに新しい httpx クライアントが作成されます。
- JWT トークンなどの認証情報を安全に AgentCore にデプロイされた Agent と通信できます。

## バグ修正

### Browser Tool のインポートエラーを修正 ([#294](https://github.com/strands-agents/tools/pull/294))

LocalChromiumBrowser をインポートする際に、オプショナル依存関係である AgentCore が見つからないエラー (`ModuleNotFoundError: No module named 'bedrock_agentcore'`) が発生する問題を修正しました。

**修正内容:**
- Browser Tool の `__init__.py` にレイジーローディングを実装
- `strands-agents-tools[local_chromium_browser]` をインストールした環境で LocalChromiumBrowser を正常にインポート可能に

**影響を受けていた状況:**
```python
# 以前はこのコードでエラーが発生していました
from strands_tools.browser import LocalChromiumBrowser

browser = LocalChromiumBrowser()
```

修正後は、AgentCore がインストールされていない環境でも LocalChromiumBrowser を正常に使用できます。

## まとめ

このリリースでは、Browser Tool の安定性が向上し、A2A Client Tool に認証機能が追加されました。これにより、より安全で信頼性の高い Agent 間通信が実現できるようになります。
