---
title: "Strands Python SDK v1.6.0 リリース解説"
version: "v1.6.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2025-08-26
summary: "A2A FileParts/DataParts サポート、MultiAgentBase の同期呼び出し対応、ツール実行の並列/順次制御、Agent 呼び出しの柔軟性向上など、多数の新機能を追加。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.6.0"
---

## 概要

Strands Agents Python SDK v1.6.0 では、Agent-to-Agent (A2A) 通信でファイルや構造化データをサポート、マルチエージェントの同期呼び出し対応、ツール実行の並列/順次制御機能、Agent 呼び出しの柔軟性向上など、多数の新機能が追加されました。また、いくつかの重要なバグ修正も含まれています。

**リリース:** [v1.6.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.6.0)

## 新機能

### A2A FileParts と DataParts のサポート ([#596](https://github.com/strands-agents/sdk-python/pull/596))

**この機能でできること:**
- A2A 通信でテキストだけでなく、ファイル（画像、ドキュメント、動画など）や構造化データ（JSON）を送信できるようになりました。マルチモーダルなエージェント間通信が可能になります。

**使用例:**

```python
import asyncio
import base64
from uuid import uuid4
import httpx
from a2a.client import A2ACardResolver, A2AClient
from a2a.types import MessageSendParams, SendMessageRequest

def create_text_part(text: str) -> dict:
    """テキストパートを作成"""
    return {
        "kind": "text",
        "text": text,
    }

def create_file_part_from_bytes(
    file_bytes: bytes,
    mime_type: str = None,
    name: str = None
) -> dict:
    """バイトからファイルパートを作成"""
    file_data = {
        "bytes": base64.b64encode(file_bytes).decode("utf-8")
    }
    if mime_type:
        file_data["mime_type"] = mime_type
    if name:
        file_data["name"] = name

    return {
        "kind": "file",
        "file": file_data,
    }

def create_data_part(data: dict) -> dict:
    """構造化データパートを作成"""
    return {
        "kind": "data",
        "data": data,
    }

async def send_multipart_message():
    """複数のパートタイプを含むメッセージを送信"""
    # テキストパート
    text_part = create_text_part("この画像とデータを分析してください")

    # ファイルパート（画像）
    with open("sample.jpg", "rb") as f:
        image_bytes = f.read()
    file_part = create_file_part_from_bytes(
        image_bytes,
        mime_type="image/jpeg",
        name="sample.jpg"
    )

    # データパート（構造化データ）
    data_part = create_data_part({
        "context": "画像分析",
        "priority": "high",
        "metadata": {
            "timestamp": "2025-08-26T10:30:00Z",
            "source": "camera_001"
        }
    })

    # メッセージペイロードを作成
    payload = {
        "message": {
            "role": "user",
            "parts": [text_part, file_part, data_part],
            "messageId": uuid4().hex,
        }
    }

    # A2A クライアントで送信
    async with httpx.AsyncClient() as httpx_client:
        resolver = A2ACardResolver(httpx_client=httpx_client, base_url="http://localhost:9000")
        agent_card = await resolver.get_agent_card()
        client = A2AClient(httpx_client=httpx_client, agent_card=agent_card)

        request = SendMessageRequest(id=str(uuid4()), params=MessageSendParams(**payload))
        response = await client.send_message(request)
        print(response.model_dump_json(exclude_none=True, indent=2))

asyncio.run(send_multipart_message())
```

**ポイント:**
- FilePart は bytes フィールド（バイナリデータ）または URI フィールド（ファイル参照）を持つことができます
- DataPart は JSON シリアライズ可能なオブジェクトを含めることができます
- MIME タイプにより自動的に適切な ContentBlock に変換されます

---

### MultiAgentBase に __call__ メソッドを追加 ([#645](https://github.com/strands-agents/sdk-python/pull/645))

**この機能でできること:**
- カスタムマルチエージェントノードを同期的に呼び出せるようになりました。async/await を使わずにシンプルな構文でマルチエージェントワークフローを実行できます。

**使用例:**

```python
from strands.multiagent.base import MultiAgentBase, MultiAgentResult, NodeResult, Status
from strands.agent.agent_result import AgentResult

class FunctionNode(MultiAgentBase):
    """Python 関数をグラフノードとして実行"""

    def __init__(self, func, name: str = None):
        super().__init__()
        self.func = func
        self.name = name or func.__name__

    async def invoke_async(self, task, **kwargs):
        # 関数を実行して AgentResult を作成
        result = self.func(task if isinstance(task, str) else str(task))

        agent_result = AgentResult(
            stop_reason="end_turn",
            message={"role": "assistant", "content": [{"text": str(result)}]},
            state={},
            metrics={},
        )

        return MultiAgentResult(
            status=Status.COMPLETED,
            results={self.name: NodeResult(result=agent_result, status=Status.COMPLETED)},
        )

def validate_data(data):
    if not data.strip():
        raise ValueError("Empty input")
    return f"✅ Validated: {data[:50]}..."

# カスタムノードを作成
validator = FunctionNode(func=validate_data, name="validator")

# 両方の呼び出し方法が使えます
result_async = await validator.invoke_async("test data")  # 既存の非同期方式
result_sync = validator("test data")                      # 新しい同期方式！
```

**ポイント:**
- 既存の非同期コードは引き続き動作します（完全な後方互換性）
- 同期呼び出しは内部で ThreadPoolExecutor を使用して invoke_async に委譲されます
- kwargs も正しく渡されます

---

### ツールエグゼキューターの追加 ([#658](https://github.com/strands-agents/sdk-python/pull/658))

**この機能でできること:**
- ツール実行を並列（concurrent）または順次（sequential）で制御できるようになりました。ツールの実行順序が重要な場合に便利です。

**使用例:**

```python
from strands import Agent
from strands.tools.executors import SequentialToolExecutor, ConcurrentToolExecutor

# 順次実行（ツールが順番に実行される）
agent_sequential = Agent(
    tool_executor=SequentialToolExecutor(),
    tools=[screenshot_tool, email_tool]
)
# モデルが screenshot_tool と email_tool の使用を要求した場合、
# SequentialToolExecutor は順番に実行します
agent_sequential("スクリーンショットを撮影して、友人にメールで送信してください")

# 並列実行（デフォルト動作）
agent_concurrent = Agent(
    tool_executor=ConcurrentToolExecutor(),
    tools=[weather_tool, time_tool]
)
# または単に Agent(tools=[weather_tool, time_tool]) でも同じ
agent_concurrent("ニューヨークの天気と時刻を教えてください")
```

**ポイント:**
- ConcurrentToolExecutor は従来のデフォルト動作で、複数のツールを並列実行します
- SequentialToolExecutor は、ブラウザナビゲーション → スクリーンショットのように順序が重要な場合に使用します
- カスタムエグゼキューターを実装することも可能です

---

### Agent 呼び出しの柔軟性向上 ([#653](https://github.com/strands-agents/sdk-python/pull/653))

**この機能でできること:**
- Agent を入力なしで呼び出したり、メッセージリストを直接渡したりできるようになりました。Claude の "口に言葉を入れる" パターンなど、より高度なユースケースに対応します。

**使用例:**

```python
from strands import Agent

# パターン 1: 既存のメッセージ配列で呼び出し
agent = Agent(messages=[{"role": "user", "content": [{"text": "Hello!"}]}])
response = agent()  # 入力なしで呼び出し

# パターン 2: メッセージリストを直接渡す
agent = Agent()
response = agent([
    {"role": "user", "content": [{"text": "こんにちは！"}]},
    {"role": "assistant", "content": [{"text": "こんにちは！今日は"}]},  # Claude に言葉を入れる
])

# パターン 3: 従来の方法（引き続き動作）
response = agent("こんにちは")
```

**ポイント:**
- 入力なしの呼び出しは、エージェントに既にメッセージがある場合に便利です
- メッセージリスト入力は、会話の流れをより細かく制御したい場合に有効です
- すべての既存の呼び出しパターンは引き続き動作します

---

## バグ修正

### toolUse ブロックからの非シリアライズ可能なパラメータを修正 ([#568](https://github.com/strands-agents/sdk-python/pull/568))
- toolUse ブロックから Agent オブジェクトなどの非シリアライズ可能なパラメータが含まれていた問題を修正しました。これにより、ツール呼び出しの結果が正しくシリアライズされるようになりました。

### structured_output_span での system_prompt 順序を修正 ([#709](https://github.com/strands-agents/sdk-python/pull/709))
- structured_output_span で system_prompt が input_messages の後に追加されていた問題を修正しました。モデルプロバイダーに送信される順序と一致するようになりました。

### FileSessionManager のパストラバーサル脆弱性を修正 ([#728](https://github.com/strands-agents/sdk-python/pull/728))
- FileSessionManager と S3SessionManager の _get_message_path() メソッドでパストラバーサル攻撃が可能だった脆弱性を修正しました。message_id にパス区切り文字が含まれる場合は例外を発生させるようになりました。

### AgentInput TypeAlias の追加 ([#738](https://github.com/strands-agents/sdk-python/pull/738))
- Agent を呼び出す際の入力タイプを表す AgentInput TypeAlias を追加しました。これにより、型ヒントがより明確になります。

---

## まとめ

v1.6.0 は、A2A 通信のマルチモーダル対応、マルチエージェントワークフローの同期呼び出し、ツール実行の柔軟な制御、Agent 呼び出しの高度なパターンサポートなど、開発者体験を大きく向上させるリリースです。また、セキュリティ関連のバグ修正も含まれており、より安全に使用できるようになりました。
