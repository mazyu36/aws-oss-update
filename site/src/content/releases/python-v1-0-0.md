---
title: "sdk-python v1.0.0"
version: "v1.0.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-07-15
summary: "Swarm マルチエージェントオーケストレータの導入、Graph でのマルチモーダル入力サポート、セッション永続化機能、OpenTelemetry エクスポータのカスタマイズ、MCP ツールのページネーション対応など、多数の新機能を追加した初のメジャーリリース。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.0.0"
---

## 概要

Strands Agents Python SDK v1.0.0 は、初のメジャーリリースとして、マルチエージェントシステムの大幅な機能強化とエンタープライズ向け機能を提供します。新しい Swarm オーケストレータによる動的なエージェント連携、セッション永続化によるステートフルなエージェント管理、テレメトリのカスタマイズ性向上など、プロダクション環境での使用を想定した多数の機能が追加されました。

**リリース:** [v1.0.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.0.0)

## 新機能

### Swarm マルチエージェントオーケストレータ ([#416](https://github.com/strands-agents/sdk-python/pull/416))

**この機能でできること:**
- 複数のエージェントを動的に連携させる Swarm パターンが使用できるようになりました。エージェントが自律的に他のエージェントにタスクを引き渡し、協調して複雑な問題を解決できます。

**使用例:**

```python
from strands import Agent
from strands.multiagent import Swarm

# 専門分野ごとにエージェントを定義
sales_agent = Agent(
    name="Sales Agent",
    description="製品の販売と顧客対応を担当",
    instructions="顧客の質問に答え、適切な製品を提案します。技術的な質問は技術サポートにエスカレーションします。"
)

tech_support_agent = Agent(
    name="Tech Support Agent",
    description="技術的な問題のトラブルシューティングを担当",
    instructions="技術的な問題を診断し、解決策を提供します。"
)

# Swarm を作成
swarm = Swarm(
    agents=[sales_agent, tech_support_agent],
    initial_agent=sales_agent
)

# タスクを実行（エージェントが自動的に連携）
response = swarm("製品 X の価格を教えてください。また、インストール方法も知りたいです。")
# Sales Agent が価格情報を提供し、技術的な質問を Tech Support Agent にハンドオフ
```

**ポイント:**
- エージェント間の引き渡しは自動的に行われます
- 各エージェントは自身の専門分野に集中できます
- Swarm のトレーシング機能により、エージェント間の遷移を追跡できます

---

### Graph でのマルチモーダル入力サポート ([#430](https://github.com/strands-agents/sdk-python/pull/430))

**この機能でできること:**
- Graph マルチエージェントシステムで、テキストだけでなく画像などのマルチモーダル入力が扱えるようになりました。

**使用例:**

```python
from strands import Agent
from strands.multiagent import Graph

# 画像分析エージェントを定義
image_analyzer = Agent(
    name="Image Analyzer",
    description="画像を分析して内容を説明"
)

text_summarizer = Agent(
    name="Text Summarizer",
    description="テキストを要約"
)

# Graph を作成
graph = Graph(
    agents=[image_analyzer, text_summarizer],
    edges=[
        ("image_analyzer", "text_summarizer")
    ]
)

# 画像とテキストを含む入力を処理
response = graph({
    "content": [
        {"type": "image", "source": {"url": "https://example.com/image.jpg"}},
        {"type": "text", "text": "この画像について説明してください"}
    ]
})
```

**ポイント:**
- 画像、テキスト、その他のコンテンツタイプを組み合わせて処理できます
- 各エージェントがマルチモーダルコンテンツを受け取れます

---

### セッション永続化機能 ([#302](https://github.com/strands-agents/sdk-python/pull/302))

**この機能でできること:**
- エージェントの状態とメッセージ履歴をデータストアに永続化し、セッション間で再利用できるようになりました。ローカルファイルシステムまたは S3 への保存をサポートします。

**使用例:**

```python
from strands import Agent
from strands.session import FileSessionManager

# ファイルベースのセッションマネージャーを作成
session_manager = FileSessionManager(
    storage_dir="./sessions",
    session_id="user-123"
)

# エージェントを作成
agent = Agent(
    name="Customer Support",
    description="カスタマーサポートエージェント",
    session_manager=session_manager
)

# 最初の会話
response1 = agent("私の注文番号は ABC123 です")
# メッセージは自動的に永続化されます

# セッションを再初期化（プロセス再起動後など）
agent2 = Agent(
    name="Customer Support",
    description="カスタマーサポートエージェント",
    session_manager=session_manager
)
session_manager.initialize_agent(agent2)

# 前回の会話の続きができる
response2 = agent2("この注文のステータスを教えてください")
# 前回の注文番号 ABC123 を覚えています
```

**S3 を使用する場合:**

```python
from strands.session import S3SessionManager

session_manager = S3SessionManager(
    bucket_name="my-agent-sessions",
    session_id="user-123",
    region_name="us-east-1"
)

agent = Agent(
    name="Customer Support",
    session_manager=session_manager
)
```

**ポイント:**
- セッションは `<storage_dir>/session_<session_id>/` ディレクトリ構造で保存されます
- エージェントの状態とメッセージが自動的に永続化されます
- 複数のエージェントを含むマルチエージェントシステムにも対応予定です

---

### セッションでのメッセージコンテンツの編集 ([#446](https://github.com/strands-agents/sdk-python/pull/446))

**この機能でできること:**
- ガードレールがトリガーされた際に、セッション内のメッセージを編集（マスキング）できるようになりました。機密情報の保護に役立ちます。

**使用例:**

```python
from strands import Agent
from strands.session import FileSessionManager

session_manager = FileSessionManager(
    storage_dir="./sessions",
    session_id="user-456"
)

agent = Agent(
    name="Secure Agent",
    session_manager=session_manager,
    guardrails=[...]  # ガードレールを設定
)

# ユーザーが機密情報を入力
response = agent("私のクレジットカード番号は 1234-5678-9012-3456 です")

# ガードレールがトリガーされ、メッセージ内容がマスキングされて保存
# セッション履歴には機密情報が残りません
```

**ポイント:**
- ガードレールと連携して自動的にメッセージを編集します
- 永続化されたセッションでのセキュリティとプライバシーを強化します

---

### OpenTelemetry エクスポータのカスタマイズ ([#365](https://github.com/strands-agents/sdk-python/pull/365))

**この機能でできること:**
- OpenTelemetry の ConsoleSpanExporter と OTLPSpanExporter の初期化引数を直接カスタマイズできるようになりました。高度なテレメトリ設定が可能です。

**使用例:**

```python
from strands.telemetry import StrandsTelemetry

# コンソールエクスポータをカスタマイズ
telemetry = StrandsTelemetry()
telemetry.setup_console_exporter(
    service_name="my-agent-service",
    formatter=lambda span: f"[{span.name}] {span.attributes}"  # カスタムフォーマッター
)

# OTLP エクスポータをカスタマイズ
telemetry.setup_otlp_exporter(
    endpoint="https://my-otlp-collector:4318",
    headers={"Authorization": "Bearer my-token"},
    timeout=30,
    compression="gzip"  # 圧縮を有効化
)

# エージェントでテレメトリを使用
agent = Agent(
    name="Monitored Agent",
    telemetry=telemetry
)
```

**ポイント:**
- エクスポータの全設定オプションにアクセスできます
- メソッドチェーンで複数のエクスポータを設定可能です
- Jaeger、Zipkin、Datadog などの様々なバックエンドに対応できます

---

## 破壊的変更

### MCP ツールリストのページネーション対応 ([#436](https://github.com/strands-agents/sdk-python/pull/436))

**変更内容:**
- `mcp_client.list_tools_sync()` の戻り値が `List[MCPAgentTool]` から `PaginatedList[MCPAgentTool]` に変更されました。大量のツールを持つ MCP サーバーに対応するためのページネーションがサポートされます。

**変更前:**

```python
from strands.tools.mcp import MCPClient

mcp_client = MCPClient(server_params={"command": "mcp-server"})
tools = mcp_client.list_tools_sync()  # List[MCPAgentTool]
```

**変更後:**

```python
from strands.tools.mcp import MCPClient

mcp_client = MCPClient(server_params={"command": "mcp-server"})
tools = mcp_client.list_tools_sync()  # PaginatedList[MCPAgentTool]

# ページネーショントークンがある場合、次のページを取得
if tools.pagination_token:
    next_page = mcp_client.list_tools_sync(pagination_token=tools.pagination_token)
```

**移行方法:**
- `PaginatedList` は `list` を継承しているため、ほとんどの場合コード変更は不要です
- `Agent(tools=[mcp_client.list_tools_sync()])` のような使用方法は引き続き動作します
- ページネーションを使用する場合は、`pagination_token` を確認して次のページを取得してください

---

## バグ修正

### セッションマネージャーが全エージェントの最後のメッセージを追跡 ([#455](https://github.com/strands-agents/sdk-python/pull/455))
- セッションマネージャーが全エージェントの最後のメッセージを正しく追跡するように修正しました。マルチエージェントシステムでの状態管理が改善されます。

### structured_output への system_prompt の引き渡し ([#466](https://github.com/strands-agents/sdk-python/pull/466))
- `Agent.structured_output()` メソッドに `system_prompt` が正しく渡されていなかった問題を修正しました。構造化出力でカスタムシステムプロンプトが使用できるようになります。

---

## まとめ

v1.0.0 は、Strands Agents Python SDK の初のメジャーリリースとして、エンタープライズグレードの機能を多数追加しました。Swarm オーケストレータによる動的なマルチエージェント連携、セッション永続化によるステートフルなエージェント管理、テレメトリのカスタマイズ性向上など、プロダクション環境での使用を想定した機能が充実しています。破壊的変更は最小限に抑えられており、既存のコードへの影響は限定的です。
