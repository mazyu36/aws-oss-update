---
title: "Strands Tools v0.8.0 リリース解説"
version: "v0.8.0"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-06-03
summary: "code_interpreter のバイナリファイル書き込み対応、shell ツールの非対話モード切り替えを環境変数のみに統一、mongodb_memory での環境変数優先化など、3 件のバグ修正を含むリリースです。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.0"
---

## 概要

このリリースには 3 件のバグ修正が含まれます。`code_interpreter` の `write_files` でバイナリファイル (blob) のアップロードがサポートされ、`shell` ツールの非対話モードは環境変数 `STRANDS_NON_INTERACTIVE` 経由でのみ制御するように整理されました。また `mongodb_memory` のスタンドアロン関数で、環境変数がツールパラメータより優先されるよう修正されています。

**リリース:** [v0.8.0](https://github.com/strands-agents/tools/releases/tag/v0.8.0)

## バグ修正

### code_interpreter: write_files でバイナリファイルのアップロードに対応 ([#462](https://github.com/strands-agents/tools/pull/462))

`AgentCoreCodeInterpreter` の `write_files` は、これまで `FileContent` の `text` フィールドのみを BedrockAgentCore SDK に渡しており、バイナリ用の `blob` フィールドは silently に破棄されていました。BedrockAgentCore SDK 自体は `writeFiles` の `blob` をサポートしているにもかかわらず、ツール側で転送されないため、画像やコンパイル済み成果物などのバイナリファイルをサンドボックスに書き込めませんでした。

このリリースで `FileContent` モデルに `blob: Optional[str]` フィールドが追加され、`text` と `blob` のどちらか一方を必ず指定することを `model_validator` で強制するようになりました。`write_files` 側でも `blob` がセットされていればそれを SDK に転送し、未指定であれば従来通り `text` を転送します。

**使用例:**

```python
from strands_tools.code_interpreter import AgentCoreCodeInterpreter
from strands_tools.code_interpreter.models import (
    FileContent,
    WriteFilesAction,
)

interpreter = AgentCoreCodeInterpreter(region="us-west-2")

# テキストとバイナリを混在させて 1 回の書き込みで送れる
action = WriteFilesAction(
    type="writeFiles",
    session_name="my-session",
    content=[
        # テキストファイル: 従来通り text を指定
        FileContent(path="data.txt", text="Some data"),
        # バイナリファイル: blob に Base64 エンコード済みのバイト列を指定
        FileContent(
            path="image.png",
            blob=b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ",
        ),
    ],
)

interpreter.write_files(action)
```

**ポイント:**

- `FileContent` では `text` と `blob` のどちらか一方のみを指定する必要があり、両方指定するとバリデーションエラーになります。両方未指定の場合もエラーです
- `blob` には Base64 エンコード済みのバイト列を渡します。BedrockAgentCore SDK の `writeFiles` がそのまま受け取る形式に揃えています
- 同じ `WriteFilesAction` 内でテキストファイルとバイナリファイルを混在させることが可能です

---

### shell: non_interactive モードの判定を環境変数のみに統一 ([#486](https://github.com/strands-agents/tools/pull/486))

`shell` ツールには非対話モード切り替え用に、関数引数 `non_interactive` と環境変数 `STRANDS_NON_INTERACTIVE` の 2 つの経路がありました。実質的に重複しており、ドキュメントも環境変数経由のみを案内していたため、`non_interactive` 引数が削除され、判定は `STRANDS_NON_INTERACTIVE=true` 環境変数のみで行うように整理されました。これは `BYPASS_TOOL_CONSENT` と同じ運用パターンに揃える変更です。

**変更前:**

```python
from strands_tools import shell

# 関数引数で非対話モードを指定できた
shell.shell("echo test", non_interactive=True)
```

**変更後:**

```python
import os
from strands_tools import shell

# 環境変数で非対話モードを制御する
os.environ["STRANDS_NON_INTERACTIVE"] = "true"
shell.shell("echo test")
```

**ポイント:**

- 既存コードで `shell(..., non_interactive=True)` のように引数を渡していた場合、`TypeError: unexpected keyword argument 'non_interactive'` が発生するため、環境変数経由への移行が必要です
- `STRANDS_NON_INTERACTIVE` の値は文字列 `"true"`（小文字）で比較されます
- BYPASS_TOOL_CONSENT 同様、エージェント実行プロセスのスコープで設定する運用となります

---

### mongodb_memory: 環境変数をツールパラメータより優先 ([#487](https://github.com/strands-agents/tools/pull/487))

スタンドアロン関数 `mongodb_memory` は、これまで `cluster_uri` などの引数が指定されていればそれを優先し、未指定の場合のみ環境変数からフォールバックする実装でした。この挙動だとエージェントが接続先 URI を引数として上書きできてしまい、運用者が設定した接続先と異なる場所にメモリが書き込まれるリスクがありました。

このリリースで優先順位が逆転し、環境変数が設定されていればそれが必ず優先されるようになりました。引数として渡された値は、対応する環境変数が未設定の場合のみフォールバックとして使われます。クラスベースの `MongoDBMemoryTool` 経由の利用では従来通りの挙動です。

あわせて README に記載されていた環境変数名のうち、コード上で実際には参照されていなかった `MONGODB_DEFAULT_DATABASE` などが、実際に読み込まれる `MONGODB_DATABASE_NAME` などに修正されています。

**使用例:**

```bash
# 接続先・DB 名は運用者が環境変数で固定する
export MONGODB_ATLAS_CLUSTER_URI="mongodb+srv://user:password@cluster.mongodb.net/"
export MONGODB_DATABASE_NAME="strands_memory"
export MONGODB_COLLECTION_NAME="memories"
export MONGODB_NAMESPACE="default"
export MONGODB_EMBEDDING_MODEL="amazon.titan-embed-text-v2:0"
export AWS_REGION="us-west-2"
```

```python
from strands import Agent
from strands_tools.mongodb_memory import mongodb_memory

agent = Agent(tools=[mongodb_memory])

# 環境変数が設定されていれば、cluster_uri 引数を渡しても無視され、
# 環境変数の値が使われる
mongodb_memory(
    action="record",
    content="User prefers vegetarian pizza",
    cluster_uri="mongodb+srv://...",  # 環境変数があればこちらが優先される
)
```

**ポイント:**

- 影響を受けるのはスタンドアロン関数 `mongodb_memory` のみで、クラスベースの `MongoDBMemoryTool` の挙動は変更されていません
- エージェントに接続先を制御させたい場合は、クラスベースのアプローチを使うか、該当する環境変数を未設定にしておく必要があります
- 実際に参照される環境変数は `MONGODB_ATLAS_CLUSTER_URI`、`MONGODB_DATABASE_NAME`、`MONGODB_COLLECTION_NAME`、`MONGODB_NAMESPACE`、`MONGODB_EMBEDDING_MODEL`、`AWS_REGION` です。旧 README に書かれていた `MONGODB_DEFAULT_*` 系の名前はコードからは読まれていなかったため使えません

## まとめ

`code_interpreter` のバイナリファイル書き込み、`shell` の非対話モード API 整理、`mongodb_memory` の環境変数優先化と、いずれも実運用での挙動と API 仕様のずれを解消するバグ修正リリースです。`shell` の `non_interactive` 引数と `mongodb_memory` の引数優先動作に依存していた既存コードは、それぞれ環境変数ベースの運用に合わせて見直しが必要です。
