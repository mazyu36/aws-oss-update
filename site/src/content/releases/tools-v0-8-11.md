---
title: "Strands Tools v0.8.11 リリース解説"
version: "v0.8.11"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-10-30
summary: "`swarm` / `use_agent` / `use_llm` などマルチエージェント系、`code_interpreter` / `browser` などサンドボックス系、`generate_image` / `nova_reels` などメディア系を含む計 15 ツールを一気に deprecated 化したリリースです。v0.8.11 では警告ログ、v0.9.0 では import error に昇格します。あわせて pillow 13（CVE-2026-112403）に対応しました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.11"
---

## 概要

v0.8.11 は、v0.8.9 / v0.8.10 から続く「1st party ツールから vended / 公式統合への移行」の総仕上げに位置付けられるリリースです。マルチエージェント系の `swarm` / `use_agent` / `use_llm`、サンドボックス系の `code_interpreter` / `browser` / `use_computer`、メディア系の `generate_image` / `generate_image_stability` / `nova_reels` / `speak` / `image_reader`、メモリ系の `agent_core_memory` / `elasticsearch_memory`、その他の `handoff_to_user` / `load_tool` を含む計 15 ツールが一度に deprecated 化されました。あわせて pillow 13（CVE-2026-112403）対応と、deprecation 警告の「v0.9.0 の挙動」が「error log」から「import error」へと表現変更されています。

**リリース:** [v0.8.11](https://github.com/strands-agents/tools/releases/tag/v0.8.11)

## 新機能

### `swarm` / `use_agent` / `use_llm` の deprecated 化 ([#633](https://github.com/strands-agents/tools/pull/633))

**この機能でできること:**

- マルチエージェント／サブエージェント呼び出し系の 3 ツールが deprecated 化されました。v0.8.11 では警告ログ、v0.9.0 では import error に昇格します
- 代替先は以下のとおりです

| ツールモジュール | 移行先 | 種別 |
| --- | --- | --- |
| `swarm` | `from strands.vended_tools import make_swarm, swarm` | Vended tool |
| `use_agent` | `from strands.vended_tools import make_subagent, subagent` | Vended tool |
| `use_llm` | `from strands.vended_tools import subagent` | Vended tool |

**使用例（`swarm` の場合）:**

```python
# 移行前: 1st party の swarm
from strands import Agent
from strands_tools import swarm  # DeprecationWarning

agent = Agent(tools=[swarm])

# 移行後: vended の make_swarm を利用
# 子エージェントは親の model / tools を継承。per-agent 設定は Choice / 独自 builder で指定
from strands import Agent
from strands.vended_tools import make_swarm, Choice

swarm_tool = make_swarm(
    tools=Choice(...),            # 子エージェントに渡すツール（従来の per-agent tools は廃止）
    model=Choice(...),             # 子エージェントのモデル選択
    # handoff / iteration / timeout の上限はここで指定（呼び出し引数ではなくなった）
)

agent = Agent(tools=[swarm_tool])
```

**使用例（`use_agent` / `use_llm` の場合）:**

```python
# 移行前
from strands import Agent
from strands_tools import use_agent  # DeprecationWarning

agent = Agent(tools=[use_agent])

# 移行後: vended の subagent / make_subagent
# モデルからは task + 任意の instructions を渡す形になる
from strands import Agent
from strands.vended_tools import make_subagent, Fixed

subagent_tool = make_subagent(
    model=Fixed(...),              # per-call の model_provider / model_settings は廃止
    # max_depth: 2 階層までのネスト制限が内部で適用される
)

agent = Agent(tools=[subagent_tool])
```

**ポイント:**

- **代替は 1 対 1 ではありません**。意図的に API が整理されています
  - `swarm`: agent spec は `system_prompt` ではなく `instructions` を取るようになり、子エージェントは親の model / tools を継承します。per-agent の `tools` / `model_provider` / `model_settings` は `make_swarm(tools=Choice(...), model=Choice(...))` もしくはカスタム `builder` に移動
  - `swarm`: handoff / iteration / timeout の上限は呼び出し引数ではなく `make_swarm(...)` 側で指定。`inherit_parent_prompt` は廃止
  - `swarm`: 途中で失敗した場合は、部分的な結果を含めて呼び出し自体が失敗する挙動に変更
  - `use_agent` / `use_llm`: モデルからは `task` + 任意の `instructions` を渡す形になり、per-call の `model_provider` / `model_settings` は廃止。代わりに `make_subagent(model=Fixed(...))` もしくは `model=Choice(...)` を利用
  - `use_agent` / `use_llm`: 返り値は子エージェントの最終メッセージのみとなり、metrics ブロックは含まれません。委譲のネストは `max_depth` により最大 2 階層まで
- `use_llm` の旧警告は `use_agent` を指していましたが、v0.8.11 では `subagent` を指すよう修正されています
- hatch-test 環境の依存が `strands-agents[a2a]>=1.62.0` に更新されています。`strands.vended_tools.swarm` は 1.62.0 で初めて提供されるため

---

### メディア／メモリ系 6 ツールの deprecated 化 ([#630](https://github.com/strands-agents/tools/pull/630))

**この機能でできること:**

- `nova_reels`、`agent_core_memory`、`generate_image`、`generate_image_stability`、`image_reader`、`elasticsearch_memory` の 6 ツールが deprecated 化されました
- 代替先は以下のとおりです（**代替なしのツールが多い点に注意**）

| ツールモジュール | 移行先 | 種別 |
| --- | --- | --- |
| `agent_core_memory`（`AgentCoreMemoryToolProvider`） | `MemoryManager` + `AgentCoreMemoryStore`（`bedrock-agentcore`） | Memory store |
| `elasticsearch_memory` | **代替なし** — `elasticsearch-py` を用いた `MemoryStore` を自前実装し `MemoryManager` に渡す | None |
| `image_reader` | エージェントプロンプト内の image content block を直接利用 | SDK capability |
| `generate_image` | **代替なし** — Bedrock の `invoke_model` から Stability AI モデルを直接呼び出す | None |
| `generate_image_stability` | **代替なし** — Stability AI の REST API を直接呼び出す | None |
| `nova_reels` | **代替なし** — Amazon Nova Reel は 2026-09-30 に Bedrock で EOL | None |

**使用例（`agent_core_memory` の場合）:**

```python
# 移行前
from strands import Agent
from strands_tools.agent_core_memory import AgentCoreMemoryToolProvider  # DeprecationWarning

provider = AgentCoreMemoryToolProvider(...)
agent = Agent(tools=provider.tools)

# 移行後: bedrock-agentcore の AgentCoreMemoryStore を MemoryManager 経由で利用
from bedrock_agentcore.memory import AgentCoreMemoryStore
from strands import Agent
from strands.memory import MemoryManager

store = AgentCoreMemoryStore(...)
memory = MemoryManager(
    store=store,
    writable=True,       # 書き込みは extraction 経由（add_messages のみ対応）
    extraction=True,     # 旧 record 相当のメモリ書き込みは extraction で行う
)

agent = Agent(memory=memory)
```

**使用例（`image_reader` の場合）:**

```python
# 移行前: ランタイムに path 指定で画像を読ませる
from strands import Agent
from strands_tools import image_reader  # DeprecationWarning

agent = Agent(tools=[image_reader])
agent("この画像を分析して: /path/to/image.png")

# 移行後: image content block をプロンプトで渡す。
# 任意のタイミングで画像を読みたい場合は、画像ブロックを返すカスタムツールを実装する
from strands import Agent

agent = Agent()
agent([
    {"role": "user", "content": [
        {"type": "image", "source": {"type": "bytes", "data": image_bytes}},
        {"type": "text", "text": "この画像を分析して"},
    ]},
])
```

**ポイント:**

- `AgentCoreMemoryStore` は `add_messages` のみを実装しており、旧 `agent_core_memory` の `record` に相当する `add_memory` はありません。書き込みは extraction（`writable=True, extraction=True`）経由で行います。`list` / `get` / `delete` は `bedrock-agentcore` の `MemorySessionManager` 経由で実行する設計です
- Elasticsearch 向けの `MemoryStore` は現時点で Strands カタログにも PyPI にも Elastic 公式にも存在しません。Elastic の Agent Builder MCP エンドポイントは「クラスタ全体へのアクセスを与えてしまい、tool が本来持っていた tenant isolation が崩れる」として採用を見送られています
- `image_reader` の廃止により、モデルがランタイム中に path から画像を読むルートはなくなります。README では「画像ブロックを返すカスタムツール」を実装するパターンが推奨されています
- `nova_reels`: `amazon.nova-reel-v1:0` / `v1:1` ともに Bedrock の model lifecycle ページで EOL と明示されており、警告メッセージも後継を指すのではなく EOL である旨を伝える形になっています
- `generate_image` が使っていた 3 つの Stability モデル ID は Bedrock 上では引き続き Active な状態です

---

### サンドボックス／ユーティリティ系 6 ツールの deprecated 化 ([#629](https://github.com/strands-agents/tools/pull/629))

**この機能でできること:**

- `code_interpreter`、`browser`、`handoff_to_user`、`speak`、`load_tool`、`use_computer` の 6 ツールが deprecated 化されました
- 代替先は以下のとおりです

| ツールモジュール | 移行先 | 種別 |
| --- | --- | --- |
| `code_interpreter`（`AgentCoreCodeInterpreter`） | Python は vended `python_repl`、その他の言語は vended `shell` | SDK Tool |
| `handoff_to_user` | vended `handoff_to_user` | SDK Tool |
| `browser`（`LocalChromiumBrowser` / `AgentCoreBrowser`） | **代替なし** — Playwright を直接利用（AgentCore 利用時は `bedrock-agentcore` の `BrowserClient`） | None |
| `speak` | **代替なし** — Amazon Polly の `synthesize_speech` を直接呼び出す | None |
| `load_tool` | **代替なし** — `Agent` にツールを渡すか、`Agent(load_tools_from_directory=True)` を利用 | None |
| `use_computer` | **代替なし** — `pyautogui` を直接利用 | None |

**使用例（`code_interpreter` の場合）:**

```python
# 移行前: AgentCore 上の code_interpreter
from strands import Agent
from strands_tools.code_interpreter import AgentCoreCodeInterpreter  # @deprecated（静的解析）

interpreter = AgentCoreCodeInterpreter(...)   # 旧挙動では呼び出し時に警告
agent = Agent(tools=interpreter.tools)

# 移行後: Python なら vended python_repl、他言語なら vended shell を使う
# vended 側はエージェントのサンドボックスで実行され、呼び出し間でメモリ状態を保持しない
from strands import Agent
from strands.vended_tools import python_repl, shell

agent = Agent(tools=[python_repl, shell])
```

**使用例（`handoff_to_user` の場合）:**

```python
# 移行前: コンソール上でプロンプトを出し、breakout_of_loop オプションで loop を抜けられた
from strands import Agent
from strands_tools import handoff_to_user  # DeprecationWarning

agent = Agent(tools=[handoff_to_user])

# 移行後: vended の handoff_to_user は interrupt を発生させる実装
# breakout_of_loop オプションは廃止
from strands import Agent
from strands.vended_tools import handoff_to_user

agent = Agent(tools=[handoff_to_user])
```

**ポイント:**

- **代替は 1 対 1 ではありません**
  - vended の `python_repl` / `shell` はエージェントの設定済みサンドボックス（AgentCore セッションではない）で実行され、呼び出し間でメモリ状態を保持しません
  - vended の `handoff_to_user` はコンソールでプロンプトを出すのではなく interrupt を送出する実装で、`breakout_of_loop` オプションはありません
  - `bedrock-agentcore`（1.24.2 時点）はブラウザのセッション層のみを提供し、Strands のツールは含まれていません。README の「behavior differences」節に差分が整理されています
- **クラス型ツールは construction ではなく invocation 時に警告するよう変更されました**。`CodeInterpreter`, `Browser`, `Mem0MemoryTool`, `A2AClientToolProvider` は `@deprecated(..., category=None)` を使い、ツールメソッドからログを出す形になっています。これは [#621](https://github.com/strands-agents/tools/pull/621) で導入された `Mem0MemoryTool` / `A2AClientToolProvider` の挙動を変更するものです
- `use_computer` は headless Linux 上では `pyautogui` が import できないため、`test_deprecations.py` の import ベースのチェックをスキップするよう調整されています

## バグ修正

### pillow 13 の許容（CVE-2026-112403） ([#626](https://github.com/strands-agents/tools/pull/626))

- `pillow` の依存範囲を Python バージョンごとに 2 分割し、Python 3.11 以上では上限・下限を引き上げて pillow 13 を許容するよう修正しました
- CVE-2026-112403 の影響を受ける旧 pillow を回避できるようになります
- Python 3.10 以下では従来の範囲を維持しているため、Python 3.11 以上の環境で `strands-agents-tools` を利用しているユーザーは、依存更新により自動的に pillow 13 系へ移行可能です

---

### Deprecation 警告の文言修正（v0.9.0 の挙動を「import error」に明示） ([#631](https://github.com/strands-agents/tools/pull/631))

- deprecated ツールの警告メッセージが、v0.9.0 の挙動を **「エラーログ」ではなく「import error」** と明示するよう修正されました
- `src/strands_tools/*` の文言は "This warning becomes an import error in v0.9.0." に変更
- README の Deprecations 表の列名も「Error log」から「Error」へ変更され、v0.9.0 では「import 時点で失敗する破壊的変更」になることが明確化されました
- v0.8.9 / v0.8.10 / v0.8.11 で deprecated 化された一連のツールを利用しているユーザーは、v0.9.0 公開前に移行を済ませる必要があります

## まとめ

v0.8.11 は、v0.8.9 / v0.8.10 から続く段階的 deprecation の総仕上げとして、マルチエージェント・サンドボックス・メディア・メモリの各領域で合計 15 ツールを一気に deprecated 化しました。vended 実装やサービス直接呼び出しが「推奨されつつある状態」ではなく「公式に required な状態」となりつつあり、v0.9.0 からは当該ツールの import そのものが失敗する破壊的変更となる予定です。該当ツールを利用しているプロジェクトでは、vended / `bedrock-agentcore` / `mem0-strands` などへの移行を v0.9.0 公開前に進めておくことをおすすめします。
