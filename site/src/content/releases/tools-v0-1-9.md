---
title: "tools v0.1.9"
version: "v0.1.9"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-07-11
summary: "Stability AI による画像生成ツールと A2A クライアントツールを追加。UI レンダリングとブラウザツールの依存関係を修正。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.1.9"
---

## 概要

このリリースでは、Stability AI を使用した画像生成機能と、エージェント間通信を実現する A2A クライアントツールの2つの主要な新機能が追加されました。また、AWS ツールの UI レンダリング問題と、ブラウザツールの依存関係に関するバグが修正されています。

**リリース:** [v0.1.9](https://github.com/strands-agents/tools/releases/tag/v0.1.9)

## 新機能

### Stability AI 画像生成ツール ([#101](https://github.com/strands-agents/tools/pull/101))

**この機能でできること:**
- Stability AI Platform を使用して、テキストプロンプトから高品質な画像を生成できます。エージェントが自動的に画像を作成し、ファイルに保存することが可能です。

**使用例:**

```python
from strands import Agent
from strands_tools.generate_image_stability import generate_image_stability

# Stability AI ツールを持つエージェントを作成
agent = Agent(
    model="us.anthropic.claude-3-haiku-20240307-v1:0",
    tools=[generate_image_stability]
)

# エージェントに画像生成を依頼
response = agent("Create a beautiful sunset over the ocean")
print(response)
```

**ポイント:**
- Stability AI の API キーが必要です
- 生成された画像はローカルファイルとして保存されます
- プロンプトの精度が画像品質に大きく影響します

---

### A2A クライアントツール ([#108](https://github.com/strands-agents/tools/pull/108))

**この機能でできること:**
- Agent-to-Agent (A2A) 通信を実現するネイティブクライアントツールです。Strands エージェントが他の A2A 対応サーバーを検出し、呼び出すことができます。既知のエージェント URL リストを使用した初期化にも対応しています。

**使用例:**

```python
from strands import Agent
from strands_tools.a2a_client import A2AClientToolProvider

# 既知の A2A エージェント URL を指定
provider = A2AClientToolProvider(
    known_agent_urls=["http://localhost:9000"]
)

# A2A クライアントツールを持つエージェントを作成
agent = Agent(tools=provider.tools)

# 他のエージェントを利用
response = agent("pick an agent and make a sample call")
print(response)

# 非同期での使用例
import asyncio

async def main():
    provider = A2AClientToolProvider(
        known_agent_urls=["http://localhost:9000"]
    )
    agent = Agent(tools=provider.tools)
    await agent.invoke_async("pick an agent and make a sample call")

asyncio.run(main())
```

**ポイント:**
- マルチエージェントシステムの構築に最適です
- 同期・非同期の両方の呼び出しに対応しています
- エージェント URL を事前に指定することで、すぐに A2A サーバーと通信できます

---

## バグ修正

### AWS ツールの UI レンダリング改善 ([#118](https://github.com/strands-agents/tools/pull/118))
- `use_aws` ツールで colorama から Rich の ネイティブスタイリングに置き換えました
- Rich Table を使用した構造化されたレイアウトにより、AWS 操作の詳細が見やすくなりました
- 他の Rich ベースツールとの視覚的一貫性が向上しました

### ブラウザツールの依存関係修正 ([#119](https://github.com/strands-agents/tools/pull/119))
- `use_browser` ツールのオプション依存関係が正しく設定されていない問題を修正しました
- `pyproject.toml` の依存関係定義を適切に修正し、インストール時のエラーを解消しました

## まとめ

このリリースでは、画像生成とマルチエージェント通信という2つの重要な機能が追加され、Strands Agents Tools の機能が大きく拡張されました。また、UI の改善と依存関係の修正により、より安定した開発体験が提供されます。
