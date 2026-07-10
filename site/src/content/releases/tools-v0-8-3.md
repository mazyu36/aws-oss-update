---
title: "Strands Tools v0.8.3 リリース解説"
version: "v0.8.3"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-07-09
summary: "セキュリティ強化に焦点を当てたバグ修正リリース。calculator のサンドボックスエスケープ、memory ツールのテナント越境、python_repl の状態ファイル権限、load_tool の実行確認プロンプトなど、LLM 経由の悪用リスクを断つ 6 件の修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.3"
---

## 概要

このリリースには 6 件のバグ修正が含まれ、そのすべてが LLM やプロンプトインジェクション経由の悪用リスクを塞ぐセキュリティ関連の変更です。`calculator` の sympify 経由のサンドボックスエスケープ、`memory` 系ツールのテナント越境、`python_repl` の状態ファイルパーミッションと初期化タイミング、`load_tool` の無確認実行、`environment` ツールでのハードニングフラグ保護など、幅広い範囲で堅牢化が入りました。`memory` 系ツールには破壊的変更が含まれるため、`namespace` / `user_id` などを渡している呼び出し側は移行が必要です。

**リリース:** [v0.8.3](https://github.com/strands-agents/tools/releases/tag/v0.8.3)

## バグ修正

### calculator: sympify 経由の文字列評価エスケープをブロック ([#525](https://github.com/strands-agents/tools/pull/525))

`calculator` は式を AST アローリストで検証してから評価していましたが、安全な locals に公開されていた `N` / `simplify` / `solve` などの関数は文字列引数を受け取ると内部で SymPy の `sympify` に渡し、その文字列がトップレベル式とは別の名前空間で評価されていました。結果として `simplify("__import__('os').system('...')")` のような呼び出しがサンドボックスを迂回してコード実行に至るという問題がありました。

このリリースでは AST 検証で文字列リテラルを原則拒否し、文字列を `sympify` 経由で再評価しない安全なコンストラクタ (`Symbol`, `symbols`, `Rational`, `Integer`, `Float`) の位置引数としてのみ許可するように修正されました。

**修正後の挙動:**

```python
from strands import Agent
from strands_tools import calculator

agent = Agent(tools=[calculator])

# 従来通り動作するもの: 文字列を sympify に流さないコンストラクタ
agent("Symbol('x') を使って x^2 を微分して")
agent("Rational('1/3') を計算して")

# ブロックされるもの: 文字列を sympify 経由で再評価する関数
# simplify("...")、N("...")、solve("...") などに文字列リテラルを渡すとバリデーションで拒否される
```

**ポイント:**

- `Symbol('x')` / `symbols('x y z')` / `Rational('1/3')` / `Integer('5')` / `Float('3.14')` は引き続き利用可能です
- `N("...")`, `simplify("...")`, `solve("...")` のように文字列を `sympify` に渡すルートは拒否されます
- 破壊的変更ではなく、安全側のみ許可を残す形でのハードニングです

---

### memory: テナント名前空間を LLM 制御可能な入力から切り離し ([#532](https://github.com/strands-agents/tools/pull/532))

自己ホストの memory ツール群 (`mongodb_memory`, `elasticsearch_memory`, `mem0_memory`) では、テナント分離キーである `namespace` / `user_id` / `agent_id` が LLM 制御可能なツールパラメータとして公開されていました。悪意ある入力や間接プロンプトインジェクションを受けた LLM が別テナントのメモリを読み書きしたり、接続情報を差し替えて任意のクラスタにリダイレクトしたりできる状態でした。加えて `mem0_memory` の `get` / `delete` / `history` は生の `memory_id` を所有権チェックなしで受け付けており、テナントをまたいで任意のメモリ ID にアクセスできてしまう問題もありました。

このリリースでは、テナント分離キーと接続情報は `@tool` 入力スキーマから削除され、クラスベースのツールでは構築時に束縛（fail-fast バリデーション付き）、モジュールレベル関数では環境変数からのみ読み取る形になりました。`mem0_memory` の `get` / `delete` / `history` には所有権チェックが追加されています。

**使用例（クラスベース、マルチテナント）:**

```python
from strands import Agent
from strands_tools.mongodb_memory import MongoDBMemoryTool
from strands_tools.elasticsearch_memory import ElasticsearchMemoryTool
from strands_tools.mem0_memory import Mem0MemoryTool

authenticated_user_id = "alice"

# namespace / user_id を構築時に束縛。LLM 側からは変更不可
mongo_memory = MongoDBMemoryTool(namespace=f"user_{authenticated_user_id}")
es_memory = ElasticsearchMemoryTool(namespace=f"user_{authenticated_user_id}")
mem0 = Mem0MemoryTool(user_id=f"user_{authenticated_user_id}")

agent = Agent(tools=[mongo_memory, es_memory, mem0])
```

**使用例（モジュール関数、シングルテナント）:**

```bash
# 接続情報と namespace / identity はすべて環境変数から読む
export MONGODB_NAMESPACE="production"
export ELASTICSEARCH_NAMESPACE="production"
export MEM0_USER_ID="service-account"
```

```python
from strands import Agent
from strands_tools import mongodb_memory, elasticsearch_memory, mem0_memory

agent = Agent(tools=[mongodb_memory, elasticsearch_memory, mem0_memory])
```

**ポイント:**

- テナント分離キーがツール入力スキーマから消えたため、LLM がテナントをまたぐ操作を要求してもツール層で拒否されます
- `mem0_memory` の `get` / `delete` / `history` は所有権チェック付きになり、他テナントの `memory_id` を直接指定しても届かなくなりました
- 破壊的変更を含みます（後述の「破壊的変更」を参照）

---

### environment: STRANDS_DISABLE_LOAD_TOOL を PROTECTED_VARS に追加 ([#531](https://github.com/strands-agents/tools/pull/531))

`environment` ツールの `PROTECTED_VARS` に `STRANDS_DISABLE_LOAD_TOOL` が追加されました。オペレーターがハードニングとして `STRANDS_DISABLE_LOAD_TOOL` を設定していても、エージェントが `environment` ツールを通じてこの環境変数を上書き・削除できてしまうと保護が無効化されるため、環境ツール経由での変更を禁止するように修正されました。

**ポイント:**

- `STRANDS_DISABLE_LOAD_TOOL` は他の保護変数と同じく、`environment` ツールからは読み取りのみ可能で変更不可になります
- オペレーターが設定したハードニングフラグを、エージェント自身が剥がすルートを塞ぐ変更です

---

### python_repl: 永続化された状態ファイルとエラーログのパーミッションを制限 ([#517](https://github.com/strands-agents/tools/pull/517))

`python_repl` は REPL のネームスペースを `repl_state/repl_state.pkl` に、実行コードとトレースバックを `errors/errors.txt` に永続化していましたが、ディレクトリとファイルは既定パーミッションで作成されていました。共有ホスト上ではセッション由来の機微な値が同一マシン上の他ユーザーから読める状態になる可能性がありました。

このリリースでは、永続化ディレクトリを `0o700`、状態ファイルとエラーログを `0o600`（`os.open` 経由）で作成するように修正されました。所有者以外の読み取り・書き込み・実行権限は付与されません。

**ポイント:**

- 既に存在するディレクトリについても `os.chmod` で `0o700` に揃えられます
- 単一ユーザー環境では従来と挙動は変わりませんが、マルチユーザー環境では機密漏洩リスクが低減します

---

### python_repl: グローバル REPL 状態を遅延生成 ([#516](https://github.com/strands-agents/tools/pull/516))

`python_repl` はモジュールインポート時に `repl_state = ReplState()` を実行しており、`ReplState.__init__` の中で永続化ディレクトリの作成と `repl_state.pkl` の読み込みが走っていました。つまりツールが実行されていなくても、モジュールを `import` するだけでファイルシステム副作用が発生していたことになります。さらに状態のロードは `python_repl()` 内でも、ユーザーの実行同意プロンプトより前に走っていました。

このリリースでは、状態生成を `get_repl_state()` アクセサ経由の遅延生成に変更し、モジュールレベルの `threading.Lock` でスレッドセーフに（ダブルチェックド）しました。状態の取得は実行同意プロンプトの後まで遅延されるため、ユーザーが承認しなかった実行では状態ファイルのロードや永続化ディレクトリの作成が発生しません。互換のため `python_repl.repl_state` 属性アクセスも `__getattr__` 経由でシングルトンに解決されます。

**ポイント:**

- インポートだけで副作用が起きなくなり、テストやツール登録のオーバーヘッドが減ります
- 実行を拒否したケースで `repl_state.pkl` をロードすることがなくなり、`dill` ベースの読み込みが起きるタイミングも同意後に限定されます
- 既存の `python_repl.repl_state` 参照は互換性維持のため引き続き動作します

---

### load_tool: ツールファイルのロード前にユーザー確認を求める ([#515](https://github.com/strands-agents/tools/pull/515))

`load_tool` は Python ファイルを読み込んで実行しますが、これまでは実行前のユーザー確認プロンプトがありませんでした。同じく任意コードを実行する `shell` ツールは事前に `get_user_input` で確認していたため、`load_tool` もそれに合わせて確認プロンプトを出すように修正されました。

**使用例:**

```python
from strands import Agent
from strands_tools import load_tool

agent = Agent(tools=[load_tool])

# ツールファイルをロードしようとすると、実行前にユーザーへ確認プロンプトが表示される
# ユーザーが拒否した場合はエラー結果が返り、ロードは中止される
# BYPASS_TOOL_CONSENT=true の場合は従来通り確認をスキップ
agent("Load ./my_custom_tool.py")
```

**ポイント:**

- `BYPASS_TOOL_CONSENT=true` で確認プロンプトをスキップできる挙動は `shell` と共通です
- オペレーターレベルの完全な無効化スイッチである `STRANDS_DISABLE_LOAD_TOOL` は従来通り機能します
- ユーザーが確認を拒否した場合はロードを中止し、エラーとして結果が返されます

## 破壊的変更

### memory 系ツールのテナント分離キーと接続情報を LLM 入力から削除 ([#532](https://github.com/strands-agents/tools/pull/532))

`mongodb_memory` / `elasticsearch_memory` / `mem0_memory` の `@tool` 関数の引数から、次のパラメータが削除されました。これらを直接ツール関数へ渡していたコードは `TypeError` になります。

- `mongodb_memory` / `elasticsearch_memory`: `namespace`, `index_name`, `cloud_id`, `es_url`, `api_key`, `cluster_uri`, `database_name`, `collection_name`, `embedding_model`, `region`, `vector_index_name`
- `mem0_memory`: `user_id`, `agent_id`

**移行方法（クラスベース、マルチテナント）:**

```python
# 変更前: ツール呼び出しの引数として namespace / user_id を渡していた
# agent("Save memory", namespace=f"user_{user_id}")

# 変更後: 構築時に束縛
from strands_tools.mongodb_memory import MongoDBMemoryTool
from strands_tools.mem0_memory import Mem0MemoryTool

mongo_memory = MongoDBMemoryTool(namespace=f"user_{authenticated_user_id}")
mem0 = Mem0MemoryTool(user_id=f"user_{authenticated_user_id}")
```

**移行方法（モジュール関数、シングルテナント）:**

接続情報とテナントキーを環境変数に移し、ツール呼び出し側からは削除します。

```bash
# mongodb_memory
export MONGODB_NAMESPACE="production"
# elasticsearch_memory
export ELASTICSEARCH_NAMESPACE="production"
# mem0_memory
export MEM0_USER_ID="service-account"
# または
export MEM0_AGENT_ID="my-agent"
```

呼び出し側のツール引数から削除対象のパラメータをすべて外してください。

## まとめ

新機能はないものの、`calculator` のサンドボックス強化、`memory` 系ツールのテナント分離、`python_repl` のファイル権限と初期化タイミング、`load_tool` の確認プロンプト追加など、LLM やプロンプトインジェクション経由の悪用ルートを塞ぐ変更が幅広く入った実質的なセキュリティリリースです。`memory` 系ツールを使っている場合は破壊的変更の移行が必要になります。
