---
title: "Strands Python SDK v1.22.0 リリース解説"
version: "v1.22.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-01-13
summary: "MCP リソース操作のサポート、Bedrock Guardrails の最新メッセージ評価オプション、LiteLLM の非ストリーミング対応、AgentBase Protocol の導入、並行実行時の状態破損防止などの新機能とバグ修正を追加。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.22.0"
---

## 概要

Strands Agents Python SDK v1.22.0 では、MCP クライアントへのリソース操作サポート、Bedrock Guardrails の最新メッセージのみを評価するオプション、LiteLLM モデルプロバイダーの非ストリーミングレスポンス対応、エージェントクラスの共通インターフェースとなる AgentBase Protocol の導入など、複数の新機能が追加されました。また、並行エージェント呼び出し時の状態破損を防止する重要なバグ修正も含まれています。

**リリース:** [v1.22.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.22.0)

## 新機能

### MCP リソース操作 ([#1117](https://github.com/strands-agents/sdk-python/pull/1117))

**この機能でできること:**
- MCP クライアントがリソース操作をサポートし、MCP サーバーが提供するリソースの一覧取得、読み込み、リソーステンプレートの操作が可能になりました。静的リソース、バイナリリソース、パラメータ化されたリソーステンプレートに対応しています。

**使用例:**

```python
from strands.tools.mcp import MCPClient

with MCPClient(server_transport) as client:
    # 利用可能なリソースを一覧取得
    resources = client.list_resources_sync()
    for resource in resources.resources:
        print(f"Resource: {resource.name} at {resource.uri}")

    # 特定のリソースを読み込み
    content = client.read_resource_sync("file://documents/report.txt")
    text = content.contents[0].text

    # リソーステンプレート（パラメータ化されたリソース）を一覧取得
    templates = client.list_resource_templates_sync()
    for template in templates.resourceTemplates:
        print(f"Template: {template.uriTemplate}")
```

**ポイント:**
- `list_resources_sync()`: 利用可能なリソースを一覧取得（ページネーション対応）
- `read_resource_sync()`: URI を指定してリソースの内容を読み込み
- `list_resource_templates_sync()`: パラメータ化されたリソーステンプレートを一覧取得

---

### Bedrock Guardrails 最新メッセージ評価オプション ([#1224](https://github.com/strands-agents/sdk-python/pull/1224))

**この機能でできること:**
- Bedrock モデルで `guardrail_latest_message` パラメータを使用すると、会話履歴全体ではなく最新のユーザーメッセージのみを AWS Bedrock Guardrails で評価できます。これによりトークン使用量を削減し、Guardrail 介入後の会話復帰が可能になります。

**使用例:**

```python
from strands.models.bedrock import BedrockModel

model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
    guardrail_id="your-guardrail-id",
    guardrail_version="DRAFT",
    guardrail_latest_message=True  # 最新のユーザーメッセージのみを評価
)
```

**ポイント:**
- トークン使用量とコストを削減できます
- Guardrail でブロックされたコンテンツが履歴に残っても、その後のメッセージがブロックされなくなります
- デフォルトは `False`（従来の動作を維持）

---

### LiteLLM 非ストリーミングレスポンス対応 ([#512](https://github.com/strands-agents/sdk-python/pull/512))

**この機能でできること:**
- LiteLLM モデルプロバイダーが非ストリーミングレスポンスを正しく処理できるようになりました。従来 `stream=False` を設定するとエラーが発生していた問題が修正されています。

**使用例:**

```python
from strands.models.litellm import LiteLLMModel
from strands import Agent

# 非ストリーミングモードで使用
model = LiteLLMModel(
    model_id="gpt-3.5-turbo",
    params={"stream": False}
)

# 正常に動作するようになりました（ValueError が発生しなくなりました）
agent = Agent(model=model)
result = agent("What is 2+2?")
```

**ポイント:**
- ストリーミングモードと非ストリーミングモードの両方がシームレスに動作します
- シンプルなレスポンス処理には非ストリーミングモードが便利です

---

### AgentBase Protocol の導入 ([#1126](https://github.com/strands-agents/sdk-python/pull/1126))

**この機能でできること:**
- エージェントクラスが実装すべき最小限のインターフェースを定義する `AgentBase` Protocol が導入されました。これにより、`Agent` クラスと将来導入予定の `A2AAgent` クラスなど、複数のエージェントタイプが `Graph` などのマルチエージェントオーケストレータで一貫して使用できるようになります。

**使用例:**

```python
from strands.agent import AgentBase
from typing import Protocol

# AgentBase は Protocol として定義されており、
# マルチエージェント構成で異なるエージェント実装を統一的に扱えます
def run_agent(agent: AgentBase, prompt: str):
    """AgentBase を実装した任意のエージェントを実行"""
    return agent(prompt)

# 標準の Agent クラスは AgentBase を実装しています
from strands import Agent
agent = Agent()
result = run_agent(agent, "Hello!")
```

**ポイント:**
- マルチエージェントオーケストレータ（Graph など）で使用される共通インターフェースです
- 将来の A2A（Agent-to-Agent）実装との互換性を確保します

---

### モデルプロバイダーへの invocation_state の受け渡し ([#1414](https://github.com/strands-agents/sdk-python/pull/1414))

**この機能でできること:**
- カスタムモデルプロバイダーがエージェント呼び出し時の `invocation_state` にアクセスできるようになりました。カスタムリクエストメタデータ、トレーシングコンテキスト、プロバイダー固有の設定を呼び出しごとに渡せます。

**使用例:**

```python
from strands.models.model import Model

class CustomModelProvider(Model):
    def stream(self, messages, tool_specs=None, system_prompt=None, **kwargs):
        # invocation_state にアクセス
        invocation_state = kwargs.get('invocation_state')

        if invocation_state:
            # カスタムメタデータやトレーシング情報を使用
            custom_data = invocation_state.get('custom_key')
            # ... カスタム処理

        # モデル呼び出しを実行
        # ...
```

**ポイント:**
- 後方互換性を維持しており、既存のモデルプロバイダーは変更不要です
- `kwargs.get('invocation_state')` でアクセス可能です

---

## バグ修正

### 並行エージェント呼び出し時の状態破損を防止 ([#1453](https://github.com/strands-agents/sdk-python/pull/1453))
- 同一の Agent インスタンスで複数の並行呼び出しが発生した際に、内部状態が破損する重大な問題を修正しました
- 新しい `ConcurrencyException` が導入され、並行呼び出しを検出した時点で即座に例外をスローし、エージェントの状態整合性を保護します
- `toolUse` ブロックと `toolResult` ブロックの不整合による `ValidationException` が発生していた問題が解消されます

### Gemini の空ストリーム処理を修正 ([#1420](https://github.com/strands-agents/sdk-python/pull/1420))
- Gemini が空のイベントストリームを返した際に `UnboundLocalError` でクラッシュする問題を修正しました
- ストリームループの前に変数を適切に初期化するようになりました

### インポート時の非推奨警告を修正 ([#1380](https://github.com/strands-agents/sdk-python/pull/1380))
- `strands` をインポートするだけで非推奨警告が表示される問題を修正しました
- 遅延 `__getattr__` を使用して、非推奨エイリアスが実際にアクセスされた時のみ警告を表示するようになりました

---

## まとめ

v1.22.0 は、MCP リソース操作のサポートにより MCP サーバーとの連携が大幅に強化され、Bedrock Guardrails の効率的な評価オプション、LiteLLM の非ストリーミング対応など、実用的な新機能が追加されました。また、AgentBase Protocol の導入によりマルチエージェント構成の基盤が整備されています。並行呼び出し時の状態破損を防ぐ重要なバグ修正も含まれており、信頼性の高いエージェント運用が可能になります。
