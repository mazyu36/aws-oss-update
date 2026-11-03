---
title: "Strands Tools v0.8.12 リリース解説"
version: "v0.8.12"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-11-02
summary: "`file_read` / `file_write` / `graph` / `workflow` / `agent_graph` / `stop` / `use_aws` / `mongodb_memory` の計 8 ツールが新たに deprecated 化され、既存 `editor` の移行先も `file_editor` から `edit, read, write` へと変更されました。v0.8.12 では警告ログ、v0.9.0 では import error に昇格します。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.12"
---

## 概要

v0.8.12 は、v0.8.9 〜 v0.8.11 から続く「1st party ツールから vended / 公式統合への移行」の継続リリースです。ファイル操作系の `file_read` / `file_write`、マルチエージェントグラフ系の `graph` / `workflow` / `agent_graph`、その他の `stop` / `use_aws` / `mongodb_memory` の計 8 ツールが新たに deprecated 化されました。あわせて、既に deprecated 化されていた `editor` の移行先も、SDK 側の `file_editor` 廃止にともない `edit, read, write` の 3 ツールへと差し替えられています。v0.8.12 では警告ログ、v0.9.0 では import error に昇格します。

**リリース:** [v0.8.12](https://github.com/strands-agents/tools/releases/tag/v0.8.12)

## 新機能

### ファイル操作系 2 ツール（`file_read` / `file_write`）の deprecated 化 ([#636](https://github.com/strands-agents/tools/pull/636))

**この機能でできること:**

- `file_read` / `file_write` が deprecated 化されました。v0.8.12 では警告ログ、v0.9.0 では import error に昇格します
- 代替先は以下のとおりです

| ツールモジュール | 移行先 | 種別 |
| --- | --- | --- |
| `file_read` | `from strands.vended_tools import read` | Vended tool |
| `file_write` | `from strands.vended_tools import write` | Vended tool |

**使用例:**

```python
# 移行前
from strands import Agent
from strands_tools import file_read, file_write  # DeprecationWarning

agent = Agent(tools=[file_read, file_write])

# 移行後: vended の read / write を利用
from strands import Agent
from strands.vended_tools import read, write

agent = Agent(tools=[read, write])
```

**ポイント:**

- **`file_read` → `read`**: 1 回の呼び出しで 1 ファイルを絶対パス指定で読み、`offset` / `limit` でページングされた行番号付きテキストを返します。画像やバイナリドキュメントは content block として、`document` モードで document block として返されていた csv / html / txt / md は行番号付きテキストとして返るようになります
- **`file_read` → `read`**: 旧来の `find` / `search` / `stats` / `preview` / `chunk` / `diff` / `time_machine` モードは廃止されました。これらは `shell` 経由で代替してください
- **`file_write` → `write`**: 書き込みはエージェントの sandbox 経由で行われ、絶対パスのみを受け付けます。確認プロンプトやプレビューは表示されないため、`BYPASS_TOOL_CONSENT` は適用されません。確認プロンプトに依存していた場合は、`BeforeToolCallEvent` フックから interrupt を発生させて approve する実装に移行してください（[Interrupts ドキュメント](https://strandsagents.com/docs/user-guide/sdk/interrupts/#hooks)参照）

---

### マルチエージェントグラフ系 3 ツール（`graph` / `workflow` / `agent_graph`）の deprecated 化 ([#636](https://github.com/strands-agents/tools/pull/636))

**この機能でできること:**

- `graph` / `workflow` / `agent_graph` の 3 ツールが同じ vended `graph` へと集約される形で deprecated 化されました
- 代替先は以下のとおりです

| ツールモジュール | 移行先 | 種別 |
| --- | --- | --- |
| `graph` | `from strands.vended_tools import graph` | Vended tool |
| `workflow` | `from strands.vended_tools import graph` | Vended tool |
| `agent_graph` | `from strands.vended_tools import graph` | Vended tool |

**使用例:**

```python
# 移行前
from strands import Agent
from strands_tools import graph, workflow, agent_graph  # DeprecationWarning

agent = Agent(tools=[graph, workflow, agent_graph])

# 移行後: 3 ツールとも vended の graph に集約
# モデルは task / nodes / edges を 1 回の呼び出しで渡し、各ノードの出力をまとめて受け取る
from strands import Agent
from strands.vended_tools import graph, make_graph
from strands.multiagent.spec import Choice

# per-node のモデル・ツール指定は make_graph(...) の axis spec で行う
graph_tool = make_graph(
    tools=Choice([...], multiple=True),  # 各ノードが選べるツール群
    model=Choice([...]),                  # 各ノードが選べるモデル群
    # ノード数・エッジ数・timeout の上限も make_graph(...) で指定
)

agent = Agent(tools=[graph_tool])
```

**ポイント:**

- **代替は 1 対 1 ではありません**。3 ツールとも同じ vended `graph` に集約され、API が整理されています
- **`graph` → `graph`**: モデルは `task` / `nodes` / `edges` を 1 回の呼び出しで渡し、各ノードの出力をまとめて受け取る形式になります。create/execute/status/list/delete の lifecycle API は廃止。エッジは `from` / `to` ではなく `from_node` / `to_node` を使い、incoming edge を持たないノードが自動的に entry point として扱われます
- **`graph` → `graph`**: ノードは親の model / tools を継承します。per-node の `model_provider` / `model_settings` は `make_graph(tools=Choice([...], multiple=True), model=Choice([...]))` に移動
- **`workflow` → `graph`**: タスクがノード、`dependencies` がエッジにマッピングされ、1 回の呼び出しで実行されます。`~/.strands/workflows` への永続化、`status`、途中再開（`start` の再実行）、`priority` は廃止。実行可能なノードは並列実行されます
- **`agent_graph` → `graph`**: 実行モデルが変更されています。旧 `agent_graph` はエージェントのネットワークを稼働させメッセージを渡し合う方式でしたが、SDK ツールは各ノードを 1 回ずつ実行し、出力を下流に伝播する方式です。`message` / `status` / `stop` アクションは廃止。`star` / `hierarchical` トポロジはエッジにマッピングできますが、cycle は非許容のため `mesh` トポロジは SDK の `swarm` ツール側が適切です
- `agent_graph` 自体がかつて実装していたアドホックな deprecation warning も、共通の `_DEPRECATION_MESSAGE` に揃えられました

---

### `stop` / `use_aws` / `mongodb_memory` の deprecated 化 ([#636](https://github.com/strands-agents/tools/pull/636))

**この機能でできること:**

- `stop` / `use_aws` / `mongodb_memory` の 3 ツールが deprecated 化されました
- 代替先は以下のとおりです

| ツールモジュール | 移行先 | 種別 |
| --- | --- | --- |
| `stop` | `from strands.vended_tools import stop` | Vended tool |
| `use_aws` | [AWS MCP Server](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/mcp-server.html)（`mcp-proxy-for-aws` 経由の managed remote server） | MCP Server |
| `mongodb_memory` （`mongodb_memory`, `MongoDBMemoryTool`） | **代替なし** — `pymongo` を用いた `MemoryStore` を自前実装し `MemoryManager` に渡す | None |

**使用例（`stop` の場合）:**

```python
# 移行前
from strands import Agent
from strands_tools import stop  # DeprecationWarning

agent = Agent(tools=[stop])

# 移行後: vended の stop
# stop_reason は "cancelled" になり、message は最終 assistant メッセージを兼ねる
from strands import Agent
from strands.vended_tools import stop

agent = Agent(tools=[stop])
```

**使用例（`use_aws` の場合）:**

```python
# 移行前: 1st party の use_aws
from strands import Agent
from strands_tools import use_aws  # DeprecationWarning

agent = Agent(tools=[use_aws])

# 移行後: AWS MCP Server を MCP クライアント経由で接続
# aws___call_aws ツールが use_aws と同じ API surface をカバーする
# 書き込みの可否は IAM / --read-only フラグで制御する
# （詳細は AWS MCP Server のドキュメントを参照）
```

**使用例（`mongodb_memory` の場合）:**

```python
# 移行前
from strands import Agent
from strands_tools.mongodb_memory import MongoDBMemoryTool  # DeprecationWarning

tool = MongoDBMemoryTool(...)
agent = Agent(tools=[tool])

# 移行後: pymongo を用いた MemoryStore を自前実装し MemoryManager に渡す
# search は $vectorSearch aggregation、add はドキュメント insert の 2 メソッドだけで実装できる
from strands import Agent
from strands.memory import MemoryManager
from pymongo import MongoClient

class MongoDBMemoryStore:
    def __init__(self, client: MongoClient, namespace: str):
        # namespace は store 側で bind する（tenant isolation を保つため呼び出し側では渡さない）
        ...
    def search(self, query: str): ...  # $vectorSearch aggregation
    def add(self, memory: dict): ...   # ドキュメント insert

store = MongoDBMemoryStore(client=MongoClient(...), namespace="my-tenant")
memory = MemoryManager(
    store=store,
    writable=True,         # add_memory（旧 record 相当）を有効化
    add_tool_config=True,  # ツールとしてエージェントに登録
)

agent = Agent(memory=memory)
```

**ポイント:**

- **`stop` → `stop`**: 実行終了時の `stop_reason` が、モデル自身の `"tool_use"` から `"cancelled"` に変更されます。また `reason` は optional の `message` となり、最終 assistant メッセージを兼ねるため `str(result)` が旧来は空文字だった箇所でメッセージを返すようになります。`stop_reason` で branch していたり、`request_state["stop_event_loop"]` を参照していたコードは更新が必要です。メッセージはデフォルトで 4096 文字に制限されます
- **`use_aws` → AWS MCP Server**: AWS 公式が managed remote server として運用しており、`mcp-proxy-for-aws` 経由で接続します。`aws___call_aws` ツールが旧 `use_aws` と同じ API surface をカバー。write access は IAM もしくは proxy 側の `--read-only` フラグで制御され、`use_aws` の confirmation prompt は不要になります。self-hosted の [AWS API MCP server](https://github.com/awslabs/mcp/tree/main/src/aws-api-mcp-server) もまだ動作しますが superseded 扱いで、公式が [migration guide](https://github.com/awslabs/mcp/blob/main/src/aws-api-mcp-server/MIGRATION.md) を公開しています
- **`mongodb_memory` → 自前 `MemoryStore`**: MongoDB 向け `MemoryStore` は Strands カタログにも PyPI にも Elastic 公式にも存在しません。ただし必要なのは `search`（`$vectorSearch` aggregation）と `add`（ドキュメント insert）の 2 メソッドのみで、`pymongo` だけで実装できます。`retrieve` は `search_memory`、`record` は `add_memory` にマッピング（store 側で `writable=True`、`MemoryManager` 側で `add_tool_config=True`）。namespace は tenant isolation のため store 側で bind し、ツール呼び出しでは渡さない設計が推奨されます。`list` / `get` / `delete` は `pymongo` を直接呼び出す形になります
- `MongoDBMemoryTool` クラスのコンストラクタは `@deprecated(..., category=None)` でマークされており、構築時には警告が出ないよう調整されています（クラス構築ではなくツール呼び出し時に `logger.warning` が出る方式）

---

### `editor` の移行先変更（`file_editor` → `edit, read, write`） ([#636](https://github.com/strands-agents/tools/pull/636))

**この機能でできること:**

- 既に v0.8.6 で deprecated 化されていた `editor` の推奨移行先が、SDK 側の `file_editor` 廃止にともない `edit, read, write` の 3 ツールへと変更されました
- README の Deprecations 表、Before/After 例、behavior differences 節もあわせて更新されています

**変更前:**

```python
from strands import Agent
from strands.vended_tools import file_editor, shell, sleep

agent = Agent(tools=[file_editor, shell, sleep])
```

**変更後:**

```python
from strands import Agent
from strands.vended_tools import edit, read, shell, sleep, write

agent = Agent(tools=[edit, read, shell, sleep, write])
```

**ポイント:**

- `view` → `read`、`create` → `write`、`str_replace` → `edit` にそれぞれマッピングされます
- `edit` は old string がファイル内で一意である必要があります。旧 `str_replace` は全ての出現箇所を置換していた挙動と異なるので注意
- `write` / `edit` は即時書き込みで、確認プロンプトも `.bak` バックアップも作成されません
- `insert` / `pattern_replace` / `find_line` / `undo_edit` は SDK に等価な機能がありません
- ディレクトリビューは `shell` 側に移動

## まとめ

v0.8.12 は、v0.8.9 〜 v0.8.11 から続く段階的 deprecation の継続リリースとして、ファイル操作・マルチエージェントグラフ・その他の計 8 ツールを新たに deprecated 化しました。あわせて既存 `editor` の移行先も、SDK 側の `file_editor` 廃止にともない `edit, read, write` へと差し替えられています。v0.9.0 からは当該ツールの import そのものが失敗する破壊的変更となる予定であるため、該当ツールを利用しているプロジェクトでは、vended ツール / AWS MCP Server / 自前 `MemoryStore` などへの移行を v0.9.0 公開前に進めておくことをおすすめします。
