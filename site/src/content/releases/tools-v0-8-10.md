---
title: "Strands Tools v0.8.10 リリース解説"
version: "v0.8.10"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-10-21
summary: "`python_repl` / `a2a_client` / `mcp_client` / `mem0_memory` の 4 ツールを deprecated 化し、SDK vended ツールや `mem0-strands` などへの段階的な移行を促すリリースです。v0.8.10 では警告ログ、v0.9.0 でエラーログに昇格します。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.10"
---

## 概要

このリリースは、`python_repl` / `a2a_client` / `mcp_client` / `mem0_memory` という 4 つの 1st party ツールを deprecated 化し、`strands-agents` 1.61.0 で vended になった代替実装や、Mem0 公式の `mem0-strands` への移行を促すリリースです。v0.8.9 で行われた一連の deprecation（`tavily` / `exa` / `journal` / `bright_data` / `http_request` など）の続編にあたり、v0.8.10 では警告ログ、v0.9.0 でエラーログへと段階的に強化されます。

**リリース:** [v0.8.10](https://github.com/strands-agents/tools/releases/tag/v0.8.10)

## 新機能

### `python_repl` / `a2a_client` / `mcp_client` / `mem0_memory` の deprecated 化 ([#621](https://github.com/strands-agents/tools/pull/621))

**この機能でできること:**

- Python 実行ツール、A2A クライアント、MCP クライアント、Mem0 メモリの 4 つの 1st party ツールが deprecated 化されました。静的解析（`@deprecated`）とランタイムログの両方で警告が出るようになり、v0.9.0 では error log に昇格する予定です
- 代替先は以下のとおりです

| ツールモジュール | 移行先 | 種別 |
| --- | --- | --- |
| `python_repl` | vended `python_repl` | SDK Tool |
| `a2a_client`（`A2AClientToolProvider`） | vended `make_a2a_client` | SDK Tool |
| `mcp_client` | vended `make_mcp_router` | SDK Tool |
| `mem0_memory`（`mem0_memory`, `Mem0MemoryTool`） | `Mem0MemoryStore` from [mem0-strands](https://docs.mem0.ai/integrations/strands) + `MemoryManager` | Memory store |

**使用例（`a2a_client` の場合）:**

```python
# 移行前: 1st party の a2a_client を Agent に登録
from strands import Agent
from strands_tools.a2a_client import A2AClientToolProvider  # import 時点で DeprecationWarning

provider = A2AClientToolProvider()  # インスタンス生成時にも警告ログ
agent = Agent(tools=provider.tools)

# 移行後: vended の make_a2a_client を利用。allowed_endpoints の指定が必須
from strands import Agent
from strands.vended_tools import make_a2a_client

a2a_tool = make_a2a_client(
    allowed_endpoints=["https://agent.example.com"],  # 到達可能なエンドポイントを明示
)

agent = Agent(tools=[a2a_tool])
```

**使用例（`mcp_client` の場合）:**

```python
# 移行前
from strands import Agent
from strands_tools import mcp_client  # DeprecationWarning

agent = Agent(tools=[mcp_client])

# 移行後: vended の make_mcp_router。servers 引数で接続先を allowlist 化
from strands import Agent
from strands.vended_tools import make_mcp_router

mcp_router = make_mcp_router(
    servers={  # サーバー名 → 接続定義。モデルが任意のサーバーを起動できないようになる
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
        },
    },
)

agent = Agent(tools=[mcp_router])
```

**使用例（`python_repl` の場合）:**

```python
# 移行前
from strands import Agent
from strands_tools import python_repl  # DeprecationWarning

agent = Agent(tools=[python_repl])

# 移行後: vended の python_repl を利用（呼び出しごとに fresh interpreter / サンドボックスで実行）
from strands import Agent
from strands.vended_tools import python_repl

agent = Agent(tools=[python_repl])
agent("フィボナッチ数列の 10 番目を計算して")
```

**使用例（`mem0_memory` の場合）:**

```python
# 移行前
from strands import Agent
from strands_tools.mem0_memory import Mem0MemoryTool  # DeprecationWarning

tool = Mem0MemoryTool()  # インスタンス化時にも警告ログ
agent = Agent(tools=[tool])

# 移行後: mem0-strands の Mem0MemoryStore を MemoryManager 経由で使う
from mem0_strands import Mem0MemoryStore
from strands import Agent
from strands.memory import MemoryManager

store = Mem0MemoryStore(...)
memory = MemoryManager(store=store)

agent = Agent(memory=memory)
```

**ポイント:**

- **代替は必ずしも 1 対 1 ではありません**。セキュリティ観点で意図的に変更されている箇所があります
  - vended `a2a_client` / `mcp_router` は `allowed_endpoints` / `servers` の allowlist 指定が必須で、モデルが任意エンドポイントや任意コマンドを呼び出すことができないようになっています
  - vended `python_repl` は 1 回ごとに新しいインタープリタをエージェントのサンドボックス上で起動する実装です
  - `Mem0MemoryStore` には旧 `mem0_memory` にあった `get` / `list` / `delete` / `history` 相当の API はありません。差分の詳細は README の「behavior differences」節に明記されています
- `A2AClientToolProvider` と `Mem0MemoryTool` は本リポジトリ初の「deprecated なクラス」です。関数ツールと違ってインスタンス生成時にログが出る実装になっており、`test_deprecations.py` 側も `ClassDef` への `@deprecated` を受け入れるよう拡張されています
- 置き換え先の vended ツール群は `strands-agents` 1.61.0 で提供されています。`mem0-strands` は Mem0 側が PyPI で公開しているパッケージです
- v0.8.10 では警告ログ、v0.9.0 では error log に昇格する段階的 deprecation です。該当ツールを import しているユーザーは早めに vended 実装または `mem0-strands` への切り替えを進めることをおすすめします

## まとめ

v0.8.10 は、v0.8.9 から続く「1st party ツールから vended / 公式統合への移行」の第 2 弾として、`python_repl` / `a2a_client` / `mcp_client` / `mem0_memory` を deprecated 化したリリースです。特に `a2a_client` と `mcp_client` は allowlist 必須の設計へ、`python_repl` はサンドボックス実行へと、単なるパッケージ移動ではなくセキュリティモデルも併せて整理されています。v0.9.0 で error log に昇格する前に、vended 実装や `mem0-strands` への移行計画を立てておくと安心です。
