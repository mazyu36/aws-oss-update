---
title: "Strands Python SDK v1.41.0 リリース解説"
version: "v1.41.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-05-21
summary: "Swarm/Graph オーケストレーター向けの MultiAgentPlugin の追加、Bedrock 自動注入キャッシュポイントへの TTL サポート、starlette 1.x への対応など。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.41.0"
---

## 概要

このリリースでは、マルチエージェントオーケストレーター（Swarm、Graph）向けの新しいプラグインシステム `MultiAgentPlugin` が追加されました。また、Bedrock の自動注入されるキャッシュポイントに対する TTL 設定が可能になり、1 時間キャッシュをエンドツーエンドで利用できるようになりました。さらに、`[a2a]` オプション依存の starlette が 1.x にバンプされています。

**リリース:** [v1.41.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.41.0)

---

## 新機能

### Swarm/Graph 向け MultiAgentPlugin の追加 ([#2280](https://github.com/strands-agents/sdk-python/pull/2280))

**この機能でできること:**
- これまで `Plugin` システムは個々の Agent のみを対象としていましたが、マルチエージェントオーケストレーター（Swarm、Graph）レベルでも宣言的にプラグインを適用できるようになりました。observability、ガードレール、カスタム動作を、`HookProvider` を手動で配線することなくオーケストレーターに追加できます。

**使用例:**

```python
from strands import MultiAgentPlugin
from strands.plugins import hook
from strands.hooks import BeforeNodeCallEvent, AfterNodeCallEvent
from strands.multiagent import Swarm, GraphBuilder

# MultiAgentPlugin の実装
class MonitoringPlugin(MultiAgentPlugin):
    name = "monitoring"

    @hook
    def on_before_node(self, event: BeforeNodeCallEvent):
        print(f"Node {event.node_id} starting")

    @hook
    def on_after_node(self, event: AfterNodeCallEvent):
        print(f"Node {event.node_id} completed")

# Swarm に plugins パラメータで適用
swarm = Swarm(nodes=[agent1, agent2], plugins=[MonitoringPlugin()])

# Graph には GraphBuilder.set_plugins() で適用
graph = (
    GraphBuilder()
    .add_node(agent1, node_id="a1")
    .set_entry_point("a1")
    .set_plugins([MonitoringPlugin()])
    .build()
)
```

**ポイント:**
- `MultiAgentPlugin` は `strands` および `strands.plugins` からエクスポートされます
- `Swarm` は新しい `plugins` パラメータを、`Graph` は `GraphBuilder.set_plugins()` メソッドを受け付けます
- 単一のクラスで `Plugin` と `MultiAgentPlugin` の両方を実装することで、Agent とオーケストレーターの両方で再利用できる observability プラグインを作成できます

```python
from strands import Plugin, MultiAgentPlugin
from strands.plugins import hook
from strands.hooks import BeforeModelCallEvent, BeforeNodeCallEvent

class ObservabilityPlugin(Plugin, MultiAgentPlugin):
    name = "observability"

    @hook
    def on_model_call(self, event: BeforeModelCallEvent):
        ...  # Agent にアタッチされた際に発火

    @hook
    def on_node_call(self, event: BeforeNodeCallEvent):
        ...  # オーケストレーターにアタッチされた際に発火

    def init_agent(self, agent): ...
    def init_multi_agent(self, orchestrator): ...
```

---

### Bedrock の自動注入キャッシュポイントへの TTL サポート ([#2232](https://github.com/strands-agents/sdk-python/pull/2232))

**この機能でできること:**
- Bedrock のプロンプトキャッシュにおいて、SDK が自動注入する 2 つのキャッシュポイント（`cache_tools` による `toolConfig` キャッシュと、`CacheConfig(strategy="auto")` による最終ユーザーメッセージキャッシュ）に対して TTL を指定できるようになりました。これにより、3 つのキャッシュチェックポイント（`toolConfig`、system、messages）すべてで 1 時間 TTL を一貫して設定でき、Bedrock の TTL 非増加ルールを満たした状態で 1 時間キャッシュをエンドツーエンドで活用できます。

**使用例:**

```python
from strands.models.bedrock import BedrockModel
from strands.models.model import CacheConfig

# 3つのキャッシュチェックポイント全てを 1 時間 TTL に統一
model = BedrockModel(
    model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0",
    cache_tools="default",
    cache_tools_ttl="1h",  # toolConfig キャッシュポイントの TTL
    cache_config=CacheConfig(
        strategy="auto",
        ttl="1h",  # 最終ユーザーメッセージに自動注入されるキャッシュポイントの TTL
    ),
)
```

**ポイント:**
- `BedrockModel` に `cache_tools_ttl: str | None` 設定が追加されました。`cache_tools` と組み合わせて使用すると、`toolConfig` のキャッシュポイントに TTL が伝播されます
- `CacheConfig` に `ttl: str | None` フィールドが追加されました。設定すると、最終ユーザーメッセージに自動注入されるキャッシュポイントに TTL が含まれます
- Bedrock はキャッシュチェックポイントを `toolConfig → system → messages` の順で処理し、TTL は **非増加** である必要があります。すべてを `1h` に揃えることでこのルールを満たします
- 既存のユーザー指定 `cachePoint.ttl`（[#1660](https://github.com/strands-agents/sdk-python/pull/1660) で対応済み）と合わせて、すべてのキャッシュチェックポイントパスで TTL がカバーされます

---

### starlette 1.x への依存バージョンアップ ([#2297](https://github.com/strands-agents/sdk-python/pull/2297))

**この機能でできること:**
- `[a2a]` オプション依存グループの `starlette` が `>=1.0.0,<2.0.0` に、`fastapi` が `>=0.133.0,<1.0.0` にバンプされました。2026 年 3 月にリリースされた starlette 1.0 に対応しています。

**ポイント:**
- SDK 内部の starlette 利用は `Starlette()` のベア構築と `.mount()`、および `A2AServer.to_starlette_app()` のみのため、starlette 1.0 で削除された API（`on_startup`/`on_shutdown` パラメータ、デコレーターベースのルートなど）は使用していません
- `fastapi` のフロアバンプは、`fastapi<0.133.0` が `starlette<1.0.0` をピン止めしているため必須です
- `[a2a]` フィーチャーは experimental のため、`starlette<1.0` や `fastapi<0.133.0` を明示的に固定しているユーザーのみ影響を受けます

---

## まとめ

`MultiAgentPlugin` の導入により Swarm/Graph オーケストレーターでも宣言的なプラグインモデルが利用可能になり、observability やガードレールを統一的に組み込めるようになりました。また、Bedrock の自動注入キャッシュポイントへの TTL サポートにより、1 時間プロンプトキャッシュをマルチパスでフル活用できるようになっています。
