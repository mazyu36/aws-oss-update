---
title: "sdk-python v1.9.1"
version: "v1.9.1"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-09-19
summary: "AWS Bedrock の ContentBlock 処理の改善、structured_output のコールバックハンドラー修正、MCP インストルメンテーションの冪等性修正、Model インターフェースの tool_choice パラメータ修正など、重要なバグ修正を含むリリース。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.9.1"
---

## 概要

Strands Agents Python SDK v1.9.1 では、AWS Bedrock モデルのコンテンツブロック処理の改善、structured_output における後方互換性の修正、MCP インストルメンテーションの冪等性に関する重要な修正、Model インターフェースの tool_choice パラメータの修正など、安定性と使いやすさを向上させる重要なバグ修正が含まれています。

**リリース:** [v1.9.1](https://github.com/strands-agents/sdk-python/releases/tag/v1.9.1)

## 新機能

### Strands ContentBlock と BedrockModel の分離 ([#836](https://github.com/strands-agents/sdk-python/pull/836))

**この機能でできること:**
- AWS Bedrock の厳格な API 検証に対応するため、コンテンツブロックの処理方法を改善しました。これまでハードコードされていたフィルタリングロジックを、他のモデルプロバイダーと同様のコンテンツマッピング戦略に変更し、拡張性を向上させました。

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

# Bedrock モデルを使用
model = BedrockModel(
    model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
    region_name="us-east-1"
)

agent = Agent(model=model)

# 画像、ドキュメント、動画など、様々なコンテンツタイプを含むメッセージを送信
response = agent("この画像について説明してください", images=["path/to/image.jpg"])
```

**ポイント:**
- Bedrock がサポートする様々なコンテンツブロックタイプ（image、document、video、reasoning、citations、cache points など）が正しく処理されます
- Strands のコンテンツタイプと Bedrock モデルが疎結合になり、将来的な拡張が容易になりました
- 他のモデルプロバイダーと同じコンテンツマッピング戦略を使用するため、一貫性が向上しました

---

## バグ修正

### structured_output のコールバックハンドラー呼び出しを修正 ([#857](https://github.com/strands-agents/sdk-python/pull/857))
- typed_events への移行時に、structured_output でコールバックハンドラーが呼び出されなくなっていた問題を修正
- 後方互換性を回復し、structured_output 使用時もコールバックハンドラーが正しく動作するようになりました
- Bedrock のようにツール経由で実装されているプロバイダーでは、適切なイベントが発行されます

### MCP インストルメンテーションを冪等にして再帰エラーを防止 ([#892](https://github.com/strands-agents/sdk-python/pull/892))
- 複数の MCPClient インスタンスを作成する際に RecursionError が発生していた問題を修正
- モジュールレベルのフラグ _instrumentation_applied を追加して、パッチの適用状態を追跡
- mcp_instrumentation() が既に適用済みの場合は早期リターンし、ラッパーの累積を防止
- 複数クライアント作成とスレッドセーフティのための統合テストを追加

**影響を受けていた状況:**
```python
from strands.tools.mcp import MCPClient

# 以前は複数のクライアントを作成すると RecursionError が発生
client1 = MCPClient(server_params={"command": "server1"})
client2 = MCPClient(server_params={"command": "server2"})  # RecursionError!
```

**修正後:**
```python
from strands.tools.mcp import MCPClient

# 複数のクライアントを安全に作成可能
client1 = MCPClient(server_params={"command": "server1"})
client2 = MCPClient(server_params={"command": "server2"})  # 正常に動作
client3 = MCPClient(server_params={"command": "server3"})  # 正常に動作
```

### Model インターフェースの tool_choice パラメータを修正 ([#899](https://github.com/strands-agents/sdk-python/pull/899))
- v1.8.0 で導入された tool_choice パラメータが誤って位置引数になっていた問題を修正
- オプショナルなキーワード引数に変更し、カスタム Model 実装との互換性を保証
- すべてのモデルプロバイダー（Anthropic、Bedrock、LiteLLM、LlamaAPI、LlamaCpp、Mistral、Ollama、OpenAI、SageMaker、Writer）で統一された引数形式に修正

**変更前:**
```python
# カスタム Model 実装が壊れていた
class CustomModel(Model):
    async def converse(self, messages, tools=None, stop_sequences=None):
        # tool_choice パラメータが位置引数として追加されていたため、
        # カスタム実装でエラーが発生
        pass
```

**変更後:**
```python
# カスタム Model 実装が正常に動作
class CustomModel(Model):
    async def converse(
        self,
        messages,
        tools=None,
        stop_sequences=None,
        tool_choice=None  # オプショナルなキーワード引数として追加
    ):
        pass
```

---

## まとめ

v1.9.1 は、主に安定性と互換性を向上させる重要なバグ修正を含むリリースです。AWS Bedrock のコンテンツブロック処理の改善により将来的な拡張が容易になり、structured_output とカスタム Model 実装の後方互換性が回復され、MCP 使用時の再帰エラーが修正されました。これらの修正により、SDK の信頼性が大幅に向上しています。
