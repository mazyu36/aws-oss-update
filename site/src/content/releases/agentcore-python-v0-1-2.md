---
title: "bedrock-agentcore-sdk-python v0.1.2"
version: "v0.1.2"
repository: "agentcore-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-08-11
summary: "このリリースでは、長時間実行されるエージェント呼び出しでの ping 失敗の問題が修正されました。並行性チェックとスレッドプールハンドリングの簡素化により、より安定したストリーミング処理が可能になります。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.2"
---

## 概要

このリリースでは、長時間実行されるエージェント呼び出し時の安定性が改善されました。並行性チェックとスレッドプールハンドリングを簡素化することで、以前発生していた ping 失敗の問題が解決され、よりスムーズなストリーミング処理が可能になります。

**リリース:** [v0.1.2](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v0.1.2)

## バグ修正

### 並行性チェックの削除とスレッドプールハンドリングの簡素化 ([#46](https://github.com/aws/bedrock-agentcore-sdk-python/pull/46))

長時間実行されるエージェント呼び出し（例: ストリーム開始前に 45 秒待機するケース）において、ping 失敗により処理が中断される問題が修正されました。

**影響を受けていた状況:**
- エージェント呼び出しでストリーム開始前に長時間の処理（データ取得、計算など）を行う場合
- 非同期ストリーミング処理中にタイムアウトエラーが発生していた場合

**改善内容:**
- 不要な並行性チェックを削除
- スレッドプール処理を簡素化
- プラットフォームの変更に合わせて、別スレッドプールが不要になるよう最適化

**修正後の安定した動作例:**

```python
import asyncio
import time
from strands import Agent
from bedrock_agentcore import BedrockAgentCoreApp

app = BedrockAgentCoreApp()
agent = Agent()

@app.entrypoint
async def agent_invocation(payload):
    """Handler for agent invocation"""
    user_message = payload.get(
        "prompt",
        "No way prompt found in input, please guide customer to create a json payload with prompt key"
    )

    # 長時間の前処理を行う場合でも、ping 失敗が発生しない
    print("Waiting for 45 seconds before starting stream...")
    time.sleep(45)
    print("45 second wait complete. Starting stream...")

    stream = agent.stream_async(user_message)
    async for event in stream:
        print(event)
        yield (event)

if __name__ == "__main__":
    app.run()
```

**ポイント:**
- ストリーム開始前に長時間の処理が必要な場合でも、安定して動作するようになりました
- 従来のコードを変更する必要はなく、SDK のアップデートのみで修正が適用されます

## まとめ

このリリースでは、長時間実行されるエージェント処理の安定性が大幅に向上しました。プラットフォームの進化に合わせた内部実装の最適化により、より信頼性の高いエージェントアプリケーション開発が可能になります。
