---
title: "AgentCore Python SDK v1.19.0 リリース解説"
version: "v1.19.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-07-28
summary: "A2A ランタイム統合が a2a-sdk v1 に対応し、新しい a2a-v1 extra が追加されました。あわせて、ローカル起動時の PORT 環境変数の反映や、明示的な AgentCard に対する解決済みポートの伝播、Memory コントロールプレーンの `add_strategy` 挙動が修正されています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.19.0"
---

## 概要

このリリースの目玉は、A2A（Agent-to-Agent）プロトコル統合の a2a-sdk v1 対応です。従来の v0.3 互換に加えて新しい `a2a-v1` extra が導入され、`serve_a2a()` / `build_a2a_app()` が v1 のルートファクトリを利用するように移行されました。あわせて、A2A サーバーをローカルで起動する際の `PORT` 環境変数の反映や、明示的な `AgentCard` に対する解決済み URL の伝播、Memory コントロールプレーンで `add_strategy` を連続実行した際の `ValidationException` などが修正されています。

**リリース:** [v1.19.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.19.0)

## 新機能

### A2A ランタイム統合を a2a-sdk v1 に移行 ([#591](https://github.com/aws/bedrock-agentcore-sdk-python/pull/591))

**この機能でできること:**

- `serve_a2a()` / `build_a2a_app()` が a2a-sdk v1 の API（`create_agent_card_routes` / `create_jsonrpc_routes`）を用いて A2A プロトコル v1 で提供できるようになった
- 既存の a2a-sdk 0.3 統合（Strands の A2A 統合など）は従来どおり利用可能で、`v0.3` の JSON-RPC 互換性も維持される
- インストールする extra を切り替えることで、環境ごとに v0.3 / v1 を選択できる

**インストール:**

Strands の現行 A2A 統合や既存の v0.3 コードを利用する場合は、これまでどおり `a2a` extra を使用します。

```bash
pip install "bedrock-agentcore[a2a]"        # a2a-sdk 0.3 系
```

A2A プロトコル v1 を利用する場合は、新たに追加された `a2a-v1` extra を使用します。両者は相互排他で、同じ環境に同時にインストールしてはいけません（`pyproject.toml` にも `[tool.uv] conflicts` として明記されています）。

```bash
pip install "bedrock-agentcore[a2a-v1]"     # a2a-sdk 1.0.1 以降
```

なお `a2a-v1` extra の下限が `1.0.1` になっているのは、a2a-sdk 1.0.0 が `http-server` extra に `grpc` を含めていないためです。1.0.1 が HTTP のみで正常起動する最初のリリースです。

**使用例（a2a-sdk v1 での起動）:**

```python
# a2a-sdk 1.x をインストールした環境を想定
from bedrock_agentcore.runtime.a2a import serve_a2a
from your_agent import build_executor  # a2a-sdk の AgentExecutor を返す関数

if __name__ == "__main__":
    executor = build_executor()
    # agent_card=None のとき、executor から自動で AgentCard が生成される
    # v1 では supported_interfaces に AgentInterface(protocol_binding="JSONRPC", ...) が含まれる
    serve_a2a(executor)
```

**ポイント:**

- ランタイム側は `a2a.types.StreamResponse` の有無で v1 かどうかを自動判定し、v1 では `AgentCard` に `supported_interfaces=[AgentInterface(protocol_binding="JSONRPC", protocol_version="1.0", url=...)]` を付与する
- v1 経路では `DefaultRequestHandler` に `agent_card` を渡し、`create_jsonrpc_routes(..., rpc_url="/", enable_v0_3_compat=True)` で v0.3 JSON-RPC 互換のルートも同時に公開する
- `BedrockCallContextBuilder` は v1 では `a2a.server.routes.ServerCallContextBuilder`、v0.3 では従来の `a2a.server.apps.CallContextBuilder` の仮想サブクラスとして登録される
- 呼び出し元のコード（`serve_a2a(executor)` や `build_a2a_app(executor, agent_card)`）は基本的に変更不要で、インストールした extra によって挙動が切り替わる

---

## バグ修正

### `serve_a2a()` がローカル起動時に `PORT` 環境変数を尊重するように ([#593](https://github.com/aws/bedrock-agentcore-sdk-python/pull/593))

**修正前の挙動:**

- `serve_a2a(port=...)` のデフォルトが `port: int = 9000` にハードコードされており、`PORT` 環境変数を渡してもポート `9000` で待ち受けていた
- CodeZip などから生成された ADK / LangGraph のテンプレートを複数、ローカルで並行に起動する際に、各ランタイムに別ポートを割り当てられなかった

**修正内容:**

- `serve_a2a()` のシグネチャが `port: Optional[int] = None` に変更され、優先順位が「明示引数の `port=` > `PORT` 環境変数 > 既定値 `9000`」に整理された
- 明示的な `port=` 指定が最優先であるため、後方互換性は維持される

**使用例:**

```python
from bedrock_agentcore.runtime.a2a import serve_a2a
from your_agent import build_executor

if __name__ == "__main__":
    # 1. 明示指定: port=8888 が最優先
    #    serve_a2a(build_executor(), port=8888)
    #
    # 2. 環境変数: PORT=9002 uv run python main.py で 9002 番待ち受け
    #    serve_a2a(build_executor())
    #
    # 3. どちらも未指定: 従来どおり 9000 番待ち受け
    serve_a2a(build_executor())
```

### 明示的な `AgentCard` に解決済みポートを反映 ([#605](https://github.com/aws/bedrock-agentcore-sdk-python/pull/605))

**修正前の挙動:**

- CodeZip が生成する ADK / LangGraph テンプレートの `AgentCard` は `http://localhost:9000/` を advertise していた
- `PORT=9002 uv run python main.py` のように環境変数でポートを変更した場合、サーバー自体は 9002 番で listen するが、明示的に指定した `AgentCard` の URL は 9000 のままだった
- 上記は `AGENTCORE_RUNTIME_URL` 環境変数を設定した場合にのみ更新されていた

**修正内容:**

- `build_a2a_app()` に新しい `runtime_url` キーワード引数が追加された
- `serve_a2a()` の内部では、解決したローカル URL（例: `http://localhost:9002/`）を `build_a2a_app(..., runtime_url=...)` として渡すようになり、`agent_card` を明示指定していた場合でもその JSON-RPC URL が上書きされる
- 優先順位は「`AGENTCORE_RUNTIME_URL` 環境変数 > `runtime_url` 引数 > 既定 `http://localhost:9000/`」で、デプロイ済みランタイムでは従来どおり `AGENTCORE_RUNTIME_URL` が最優先となる

**使用例:**

```python
from bedrock_agentcore.runtime.a2a import build_a2a_app, serve_a2a
from a2a.types import AgentCard

# パターン A: build_a2a_app を直接使うケース
#   明示的な AgentCard を渡しても、runtime_url があれば JSON-RPC URL が更新される
app = build_a2a_app(
    executor,
    agent_card=my_card,               # ローカル用に組み立てた AgentCard
    runtime_url="http://localhost:9002/",
)

# パターン B: serve_a2a に任せるケース
#   PORT=9002 で起動すると、明示的な AgentCard を渡していても
#   /.well-known/agent-card.json は http://localhost:9002/ を返すようになる
if __name__ == "__main__":
    serve_a2a(executor, my_card)
```

### `add_strategy()` が Memory 全体の ACTIVE 復帰を待機 ([#604](https://github.com/aws/bedrock-agentcore-sdk-python/pull/604))

**修正前の挙動:**

- `MemoryControlPlaneClient.add_strategy(..., wait_for_active=True)` は追加したストラテジ自体が `ACTIVE` になるまでは待機していたが、Memory 全体は `UPDATING` 状態のままになる場合があった
- そのため `add_strategy` を連続で呼び出すと、`ValidationException: Memory is in transitional state UPDATING` で失敗することがあった

**修正内容:**

- ストラテジが `ACTIVE` になった後、`memory.status` が `ACTIVE` でなければ、既存の `_wait_for_memory_active` ユーティリティを使って Memory 全体の ACTIVE 復帰も待機するようになった

**使用例:**

```python
from bedrock_agentcore.memory.controlplane import MemoryControlPlaneClient

client = MemoryControlPlaneClient(region_name="us-west-2")

# 連続で add_strategy を呼び出しても、
# 前回の変更が Memory 全体で ACTIVE に戻るまで待機してから次に進む
client.add_strategy(memory_id=mem_id, strategy=strategy_a, wait_for_active=True)
client.add_strategy(memory_id=mem_id, strategy=strategy_b, wait_for_active=True)
```

## まとめ

このリリースは、A2A ランタイム統合の a2a-sdk v1 対応が大きなハイライトです。新しい `a2a-v1` extra を導入することで、既存の v0.3 統合を維持しつつプロトコル v1 に段階的に移行できるようになりました。あわせて、ローカル開発時に複数の A2A ランタイムを別ポートで並行起動する際の使い勝手が改善され、Memory コントロールプレーンで `add_strategy` を連続実行する際の挙動も安定化しています。
