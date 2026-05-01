---
title: "sdk-python v1.30.0"
version: "v1.30.0"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2026-03-11
summary: "Agent Skills プラグイン、CancellationToken によるグレースフルキャンセル、Steering の正式版昇格など、多数の新機能を追加。MCPClient 使用時のハング問題や複数のモデルプロバイダーの不具合も修正。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.30.0"
---

## 概要

このリリースでは、Agent Skills プラグインによる動的なスキル管理、CancellationToken を使ったエージェントのグレースフルキャンセル、Steering モジュールの正式版への昇格など、多数の新機能が追加されました。また、MCPClient 使用時のプロセスハング問題や、複数のモデルプロバイダーにおけるバグ修正も含まれています。

**リリース:** [v1.30.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.30.0)

## 新機能

### Agent Skills プラグイン ([#1755](https://github.com/strands-agents/sdk-python/pull/1755))

**この機能でできること:**
- エージェントにスキル（タスク固有の指示セット）を動的に追加・切り替え
- スキルのメタデータ（名前・説明）をシステムプロンプトに自動注入し、詳細な指示はオンデマンドで読み込み

**使用例:**

```python
from strands import Agent
from strands.plugins.skills import SkillsPlugin, Skill

# ファイルシステムからスキルを読み込み
plugin = SkillsPlugin(skills=["./skills/pdf-processing", "./skills/"])

# または Skill インスタンスを直接指定
skill = Skill(
    name="my-skill",
    description="カスタムスキル",
    instructions="詳細な実行手順..."
)
plugin = SkillsPlugin(skills=[skill])

agent = Agent(plugins=[plugin])

# ランタイムでスキルを追加
plugin.load_skills(["./new-skills/", another_skill])
```

**ポイント:**
- 軽量なメタデータのみを起動時に注入し、フル指示はエージェントがスキルを選択したときに読み込むため、コンテキスト使用量を最小化
- アクティブなスキル選択は `agent.state` に永続化されセッション復旧をサポート

---

### CancellationToken によるグレースフルキャンセル ([#1772](https://github.com/strands-agents/sdk-python/pull/1772))

**この機能でできること:**
- Web リクエストハンドラ、バックグラウンドスレッド、タイムアウトロジックなど外部コンテキストからエージェントを停止可能に

**使用例:**

```python
from strands import Agent
import threading

agent = Agent()

# 別スレッドまたは非同期コンテキストからキャンセル
def timeout_handler():
    agent.cancel()

timer = threading.Timer(30.0, timeout_handler)
timer.start()

result = agent("長時間実行されるタスク")

if result.stop_reason == "cancelled":
    print("エージェントがキャンセルされました")
```

**ポイント:**
- キャンセルはモデルレスポンスのストリーミング中とツール実行前の2つのチェックポイントで確認
- キャンセル後もエージェントは再利用可能（キャンセルシグナルは呼び出し完了時に自動クリア）

---

### Steering の正式版昇格 ([#1853](https://github.com/strands-agents/sdk-python/pull/1853))

**この機能でできること:**
- `strands.experimental.steering` から `strands.steering` へ移行し、Steering 機能が正式版に

**使用例:**

```python
# 新しいインポートパス（推奨）
from strands.steering import SteeringHandler

# 旧パスも互換性のため動作（DeprecationWarning を発行）
from strands.experimental.steering import SteeringHandler
```

**ポイント:**
- 旧インポートパスは DeprecationWarning を発行しつつ動作するため、段階的に移行可能

---

### AfterInvocationEvent の resume フラグ ([#1767](https://github.com/strands-agents/sdk-python/pull/1767))

**この機能でできること:**
- フックから自動的にフォローアップ呼び出しをトリガー可能に
- テスト実行後にエラーがあれば自動で修正を試みるといったループ処理を実現

**使用例:**

```python
from strands import Agent
from strands.hooks.events import AfterInvocationEvent
import subprocess

def validate_code(event: AfterInvocationEvent):
    result = subprocess.run(["pytest"], capture_output=True, text=True)
    if result.returncode != 0:
        # テスト失敗時、エラー出力で再呼び出し
        event.resume = f"テストが失敗しました。修正してください:\n{result.stderr}"

agent = Agent()
agent.add_hook(validate_code)
agent("utils.py にフィボナッチ関数を実装して")
```

**ポイント:**
- 各 resume は完全な呼び出しサイクル（BeforeInvocationEvent → イベントループ → AfterInvocationEvent）をトリガー

---

### MCP サーバーの instructions 公開 ([#1814](https://github.com/strands-agents/sdk-python/pull/1814))

**この機能でできること:**
- MCPClient から MCP サーバーの instructions にアクセス可能に

**使用例:**

```python
from strands.tools.mcp import MCPClient

client = MCPClient(...)
await client.start()

# サーバーの instructions を取得
instructions = client.server_instructions
print(instructions)
```

**ポイント:**
- MCP 仕様で定義された instructions フィールドを活用し、ツールの相互依存関係や運用制約を LLM に伝達可能

---

### "anthropic" キャッシュ戦略 ([#1808](https://github.com/strands-agents/sdk-python/pull/1808))

**この機能でできること:**
- Bedrock のアプリケーション推論プロファイル ARN でもキャッシュ機能を利用可能に

**使用例:**

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

# ARN を使用する場合は "anthropic" 戦略を明示指定
model = BedrockModel(
    model_id="arn:aws:bedrock:...",
    cache_config={"strategy": "anthropic"}
)

agent = Agent(model=model)
```

**ポイント:**
- `auto` 戦略はモデル ID の文字列マッチングに依存するため、ARN では動作しない場合がある
- `anthropic` 戦略はモデル ID チェックをバイパスしてキャッシュポイントを注入

---

### ツール結果の JSON シリアライズ ([#1752](https://github.com/strands-agents/sdk-python/pull/1752))

**この機能でできること:**
- ツールの戻り値を可能な限り JSON としてシリアライズし、パース可能な形式で保持

**使用例:**

```python
from strands import tool

@tool
def get_user_info(user_id: str) -> dict:
    return {"name": "Alice", "age": 30, "active": True}

# 結果は JSON 文字列としてシリアライズされる
# '{"name": "Alice", "age": 30, "active": true}'
```

**ポイント:**
- Steering ハンドラやエバリュエーターで結果値をパースしやすくなる
- JSON シリアライズできない場合は従来通り `str(result)` にフォールバック

---

### tool_spec セッター ([#1822](https://github.com/strands-agents/sdk-python/pull/1822))

**この機能でできること:**
- ランタイムでツールのスキーマを変更可能に

**使用例:**

```python
from strands import tool

@tool
def my_tool(param: str) -> str:
    return param

# スキーマを取得して変更
spec = my_tool.tool_spec
spec["toolSpec"]["inputSchema"]["json"]["properties"]["new_param"] = {
    "type": "string",
    "description": "新しいパラメータ"
}

# 変更を適用
my_tool.tool_spec = spec
```

**ポイント:**
- フィーチャーフラグやユーザー権限に基づいてツールの設定を動的に調整可能

---

### セッションマネージャーの最適化 ([#1803](https://github.com/strands-agents/sdk-python/pull/1803), [#1829](https://github.com/strands-agents/sdk-python/pull/1829))

**この機能でできること:**
- 状態変更がない場合の不要な永続化をスキップ
- 新規セッション作成時の不要な read 呼び出しをスキップ

**使用例:**

```python
from strands.session import RepositorySessionManager

# セッションマネージャーは内部でバージョン追跡を行い、
# 状態が変更されていない場合は sync_agent() で永続化をスキップ
agent.state.set("key", "value")
session_manager.sync_agent(agent)  # 永続化される
session_manager.sync_agent(agent)  # スキップ（変更なし）
```

**ポイント:**
- S3 バックエンドセッションでの不要な GetObject/PutObject リクエストを削減
- 高スループットシナリオでのパフォーマンス向上

## バグ修正

### MCPClient 使用時の Agent クリーンアップハング修正 ([#1830](https://github.com/strands-agents/sdk-python/pull/1830))
- 関数スコープ内で MCPClient を持つ Agent を作成した場合、スクリプト終了時にプロセスがハングする問題を修正
- `_ToolCaller` と `_PluginRegistry` の循環参照を `weakref` で解消し、即時クリーンアップを可能に

### 構造化出力使用時の要約マネージャー修正 ([#1805](https://github.com/strands-agents/sdk-python/pull/1805))
- `SummarizingConversationManager` が `structured_output_model` を持つエージェントで使用された場合にモデルプロバイダーからエラーが返される問題を修正
- 要約呼び出し中は一時的に構造化出力を無効化

### キャッシュポイントの配置修正 ([#1821](https://github.com/strands-agents/sdk-python/pull/1821))
- キャッシュポイントの注入位置を最後のアシスタントメッセージから最後のユーザーメッセージに変更
- キャッシュヒット率の改善と、ストリーミング中断による問題を回避

### Mistral ストリーミングモードでの使用量メトリクス修正 ([#1697](https://github.com/strands-agents/sdk-python/pull/1697))
- Mistral モデルでストリーミング使用時にトークン使用量が報告されない問題を修正
- Mistral SDK v1+ の `chunk.data.usage` パスに対応

### OpenAI Responses API の複数ターン会話修正 ([#1851](https://github.com/strands-agents/sdk-python/pull/1851))
- `OpenAIResponsesModel` での複数ターン会話が失敗する問題を修正
- アシスタントメッセージで `input_text` ではなく `output_text` を使用するよう修正

### Langfuse でのトークン重複カウント修正 ([#1826](https://github.com/strands-agents/sdk-python/pull/1826))
- `LANGFUSE_BASE_URL` 環境変数のチェックを追加し、トークンの二重カウントを防止

### セッション状態管理の修正 ([#1859](https://github.com/strands-agents/sdk-python/pull/1859))
- 各 `initialize_*` メソッドの終了時に `_is_new_session` フラグを適切にリセットするよう修正

## まとめ

v1.30.0 は多数の新機能と重要なバグ修正を含む大型リリースです。特に Agent Skills プラグインと CancellationToken は、より柔軟で制御しやすいエージェント開発を可能にします。
