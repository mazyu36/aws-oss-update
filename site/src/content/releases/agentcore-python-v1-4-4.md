---
title: "bedrock-agentcore-sdk-python v1.4.4"
version: "v1.4.4"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-03-10
summary: "EvaluationClient によるオンデマンドセッション評価機能、Memory SDK への Kinesis ストリーミング配信サポート、カスタムメッセージコンバーターの注入機能など、複数の新機能とバグ修正が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.4"
---

## 概要

このリリースでは、CloudWatch からスパンを収集してオンデマンドでセッション評価を実行できる `EvaluationClient` の追加、Memory SDK への Kinesis ストリーミング配信サポート、Strands Memory のカスタムコンバーター注入機能など、複数の重要な新機能が追加されました。また、エントリポイントハンドラーからカスタム HTTP ステータスコードを返せるようになるなど、バグ修正も含まれています。

**リリース:** [v1.4.4](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.4.4)

## 新機能

### EvaluationClient によるオンデマンドセッション評価 ([#300](https://github.com/aws/bedrock-agentcore-sdk-python/pull/300))

**この機能でできること:**
- CloudWatch からエージェントスパンを収集し、評価 API を呼び出してセッションを評価
- SESSION / TRACE / TOOL_CALL レベルに応じた自動バッチ処理
- 評価結果をプログラムで取得して分析に活用

**使用例:**

```python
from bedrock_agentcore.evaluation import EvaluationClient

# EvaluationClient を初期化
client = EvaluationClient(region_name="us-east-1")

# セッションの評価を実行
# agent_id を指定すると、ログループが自動的に導出される
results = client.run(
    evaluator_ids=["evaluator-123", "evaluator-456"],
    session_id="session-abc",
    agent_id="my-agent-id",
)

# または、ログループ名を直接指定することも可能
results = client.run(
    evaluator_ids=["evaluator-123"],
    session_id="session-abc",
    log_group_name="/aws/bedrock-agentcore/runtimes/my-agent-DEFAULT",
)

print(f"評価結果: {results}")
```

**ポイント:**
- `agent_id` を指定すると `/aws/bedrock-agentcore/runtimes/{agent_id}-DEFAULT` のログループが自動的に使用される
- 1 リクエストあたり最大 10 件のターゲット ID が自動バッチ処理される
- 評価レベル（SESSION / TRACE / TOOL_CALL）のルックアップはキャッシュされる

---

### Memory SDK への Kinesis ストリーミング配信サポート ([#302](https://github.com/aws/bedrock-agentcore-sdk-python/pull/302))

**この機能でできること:**
- Memory レコードを Kinesis Data Streams にプッシュ配信
- ポーリングベースの取得から、リアルタイムのプッシュベース配信に移行可能
- メタデータのみまたはフルコンテンツの配信レベルを選択可能

**使用例:**

```python
from bedrock_agentcore.memory.controlplane import MemoryControlPlaneClient

client = MemoryControlPlaneClient(region_name="us-east-1")

# ストリーミング配信設定
stream_delivery_config = {
    "resources": [{
        "kinesis": {
            "dataStreamArn": "arn:aws:kinesis:us-east-1:123456789012:stream/my-memory-stream",
            "contentConfigurations": [{
                "type": "MEMORY_RECORDS",
                "level": "FULL_CONTENT",  # または "METADATA_ONLY"
            }],
        }
    }]
}

# ストリーミング配信を有効にした Memory を作成
memory = client.create_memory(
    name="streaming-memory",
    memory_execution_role_arn="arn:aws:iam::123456789012:role/memory-stream-role",
    stream_delivery_resources=stream_delivery_config,
)

# 既存の Memory のストリーミング配信設定を更新
client.update_memory(
    memory_id=memory["id"],
    stream_delivery_resources=stream_delivery_config,
)
```

**ポイント:**
- `stream_delivery_resources` を使用する場合は `memory_execution_role_arn` が必須
- Kinesis ストリームへの書き込み権限を持つ IAM ロールを事前に作成する必要がある
- 詳細は [Memory Record Streaming ドキュメント](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-record-streaming.html) を参照

---

### Strands Memory のカスタムコンバーター注入と復元ツールフィルタリング ([#288](https://github.com/aws/bedrock-agentcore-sdk-python/pull/288))

**この機能でできること:**
- カスタムメッセージコンバーターを注入してメッセージ形式をカスタマイズ
- OpenAI 形式のメッセージコンバーターを使用可能
- 復元時に過去のツール呼び出しコンテキストをオプションでフィルタリング

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import (
    AgentCoreMemorySessionManager,
    AgentCoreMemoryConfig,
)
from bedrock_agentcore.memory.integrations.strands.converters import OpenAIConverseConverter

# OpenAI 形式のコンバーターを使用
config = AgentCoreMemoryConfig(
    memory_id="your-memory-id",
    session_id="session-123",
    actor_id="agent-456",
    filter_restored_tool_context=True,  # 復元時にツールコンテキストをフィルタリング
)

session_manager = AgentCoreMemorySessionManager(
    agentcore_memory_config=config,
    converter=OpenAIConverseConverter,  # カスタムコンバーターを注入
    region_name="us-west-2",
)

# セッションマネージャーを使用してエージェントを初期化
from strands import Agent

agent = Agent(session_manager=session_manager)
response = agent("OpenAI 形式でメッセージを処理してください")
```

**ポイント:**
- `converter` パラメータを省略するとデフォルトの `AgentCoreMemoryConverter` が使用される
- `OpenAIConverseConverter` は OpenAI の message/tool/assistant ロール形式に対応
- `filter_restored_tool_context=True` で過去の `toolUse` / `toolResult` コンテンツブロックを除外できる

## バグ修正

### エントリポイントハンドラーからカスタム HTTP ステータスコードを返せるように ([#296](https://github.com/aws/bedrock-agentcore-sdk-python/pull/296))

- `@app.entrypoint` ハンドラーから 4xx / 5xx の HTTP ステータスコードを返せるようになった
- 従来は全ての返り値が 200、全ての例外が 500 に変換されていた
- `HTTPException` を raise するか、`Response` オブジェクトを直接返すことで制御可能

```python
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

@app.entrypoint
def invoke(payload):
    # 方法 1: HTTPException を raise
    if not payload.get("prompt"):
        raise HTTPException(status_code=400, detail="Prompt missing")

    # 方法 2: Response オブジェクトを返す
    if invalid_input:
        return JSONResponse({"error": "Invalid input"}, status_code=422)

    return {"message": "ok"}
```

---

### Session Manager のバッチング改善 ([#298](https://github.com/aws/bedrock-agentcore-sdk-python/pull/298))

- Blob メッセージと会話メッセージを単一のペイロード構造に統合
- エージェントステートイベントのバッチ作成を追加
- メッセージとエージェントステートのバッファとフラッシュを分離し、より効率的な処理を実現

## まとめ

このリリースでは、`EvaluationClient` によるオンデマンドセッション評価、Memory SDK の Kinesis ストリーミング配信サポート、Strands Memory のカスタムコンバーター注入機能など、エージェント開発の効率を向上させる重要な機能が追加されました。また、HTTP ステータスコードの柔軟な制御やバッチング処理の改善により、より堅牢なエージェントアプリケーションを構築できるようになっています。
