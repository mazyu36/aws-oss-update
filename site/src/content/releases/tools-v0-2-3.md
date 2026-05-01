---
title: "tools v0.2.3"
version: "v0.2.3"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-07-30
summary: "このリリースでは、コンピュータ操作の自動化を可能にする use_computer ツール、検索フィルタリング機能の強化、そして Model Context Protocol (MCP) サーバーとの統合を実現する MCP クライアントツールが追加されました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.3"
---

## 概要

このリリースでは、3つの重要な新機能が追加されました。コンピュータ操作を自動化する use_computer ツール、検索機能を強化する retrieve フィルタリング機能、そして外部 MCP サーバーと連携可能な MCP クライアントツールです。これらの機能により、エージェントの自動化能力と拡張性が大幅に向上しました。

**リリース:** [v0.2.3](https://github.com/strands-agents/tools/releases/tag/v0.2.3)

## 新機能

### use_computer ツール ([#114](https://github.com/strands-agents/tools/pull/114))

**この機能でできること:**
エージェントがコンピュータを直接操作できるようになりました。マウス操作、キーボード入力、スクリーンショット撮影、OCR テキスト検出、アプリケーション管理など、包括的なコンピュータ制御機能を提供します。Windows、macOS、Linux のクロスプラットフォームをサポートしています。

**主な機能:**
- **マウス操作**: クリック、移動、ドラッグ
- **キーボード入力**: テキスト入力、キーコンビネーション、ホットキー
- **スクロール**: 垂直・水平スクロール
- **アプリケーション管理**: 起動、終了、フォーカス
- **画面分析**: スクリーンショット撮影、OCR テキスト検出、座標マッピング

**使用例:**

```python
from strands_tools import use_computer

# スクリーンショットを撮影
result = use_computer(
    action="screenshot"
)

# マウスをクリック
result = use_computer(
    action="click",
    coordinate=[100, 200]
)

# テキストを入力
result = use_computer(
    action="type",
    text="Hello, World!"
)

# アプリケーションを起動
result = use_computer(
    action="open_application",
    application="Safari"  # macOS の場合
)

# OCR でテキストを検出
result = use_computer(
    action="screenshot"  # OCR は自動的に実行されます
)
```

**ポイント:**
- Tesseract OCR エンジンを事前にインストールする必要があります（macOS: `brew install tesseract`）
- 一部の機能は macOS でテストされているため、Windows/Linux では動作が異なる場合があります
- 座標系は画面左上を原点 (0, 0) としています

**必要な依存関係:**
```bash
pip install opencv-python pytesseract pyautogui psutil numpy
```

---

### retrieve フィルタリング機能 ([#177](https://github.com/strands-agents/tools/pull/177))

**この機能でできること:**
retrieve ツールに新しいフィルタリング機能が追加され、検索結果をより細かく制御できるようになりました。特定の条件に基づいて検索結果を絞り込むことができます。

**使用例:**

```python
from strands_tools import retrieve

# フィルタリング条件を指定して検索
result = retrieve(
    query="AI technology",
    filter={
        "type": "document",
        "date_range": {
            "start": "2024-01-01",
            "end": "2024-12-31"
        }
    }
)
```

**ポイント:**
- フィルタリング条件を組み合わせることで、より精密な検索が可能になります
- パフォーマンスを向上させるため、必要な条件のみを指定してください

---

### MCP クライアントツール ([#49](https://github.com/strands-agents/tools/pull/49))

**この機能でできること:**
Model Context Protocol (MCP) サーバーと接続し、外部ツールをエージェントに統合できるようになりました。stdio（ローカルプロセス）および SSE（Server-Sent Events）トランスポートをサポートし、複数の同時接続を管理できます。

**主な機能:**
- **複数のトランスポート対応**: stdio および SSE 接続
- **簡易な設定**: 複雑な入れ子構造なしで直接パラメータを渡せる
- **接続管理**: スレッドセーフな接続ストレージ
- **ツール検出**: 接続された MCP サーバーから利用可能なツールを一覧表示
- **ツール呼び出し**: MCP ツールを直接呼び出すか、エージェントのツールレジストリに読み込む
- **環境変数サポート**: stdio ベースの MCP サーバーに環境変数を渡せる

**使用例:**

```python
from strands_tools import mcp_client

# MCP サーバーに接続
result = mcp_client(
    action="connect",
    connection_id="my_server",
    transport="stdio",
    command="python",
    args=["server.py"],
    env={"API_KEY": "your_api_key"}
)

# 利用可能なツールを一覧表示
result = mcp_client(
    action="list_tools",
    connection_id="my_server"
)

# ツールを直接呼び出し
result = mcp_client(
    action="call_tool",
    connection_id="my_server",
    tool_name="calculate",
    x=10,
    y=20
)

# ツールをエージェントのレジストリに読み込む
result = mcp_client(
    action="load_tools",
    connection_id="my_server"
)

# 読み込んだツールを使用（load_tools 実行後）
# agent.tool.mcp_my_server_calculate(x=10, y=20)
```

**SSE トランスポートの例:**

```python
# SSE (Server-Sent Events) で接続
result = mcp_client(
    action="connect",
    connection_id="web_server",
    transport="sse",
    url="http://localhost:8080/sse"
)
```

**設定ファイルからの接続:**

```python
import json

# JSON 設定ファイルから読み込み
with open("~/.aws/amazonq/mcp.json") as f:
    config = json.load(f)
    server_config = config["mcpServers"]["perplexity"]

result = mcp_client(
    action="connect",
    connection_id="perplexity",
    transport="stdio",
    command=server_config["command"],
    args=server_config["args"],
    env=server_config.get("env", {})
)
```

**ポイント:**
- `connection_id` は複数の接続を管理するための一意の識別子です
- `load_tools` を使用すると、MCP ツールをエージェントのネイティブツールとして直接使用できます
- stdio トランスポートはローカルプロセスに、SSE はウェブベースのサーバーに使用します
- スレッドセーフな実装により、複数の接続を同時に管理できます

---

## まとめ

このリリースでは、コンピュータ操作の自動化、検索機能の強化、外部サービスとの統合という3つの重要な機能が追加されました。これにより、Strands Agents の自動化能力と拡張性が大幅に向上し、より複雑なタスクの実行が可能になりました。
