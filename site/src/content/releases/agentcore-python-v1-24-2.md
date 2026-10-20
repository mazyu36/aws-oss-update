---
title: "AgentCore Python SDK v1.24.2 リリース解説"
version: "v1.24.2"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-10-19
summary: "Strands Agents 向け AgentCoreMemorySessionManager の 2 件のバグ修正を含むリリースです。バッチモード時に Agent スナップショットの復元が古いものになる問題と、ユーザー指定の boto3 セッションが MemoryClient に伝播しない問題が修正されています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.24.2"
---

## 概要

このリリースは、Strands Agents 連携用の `AgentCoreMemorySessionManager` に対する 2 件のバグ修正を含みます。`batch_size > 1` でバッファされた Agent スナップショットから復元すると最新ではなく最古のスナップショットが読み戻されていた問題と、ユーザー指定の boto3 セッションが内部の `MemoryClient` に伝播せずデフォルトセッションが使われていた問題が修正されました。

**リリース:** [v1.24.2](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.24.2)

## バグ修正

### バッチされた Event から最新の Agent スナップショットを復元するよう修正 ([#700](https://github.com/aws/bedrock-agentcore-sdk-python/pull/700))

**何が修正されたか:**
- `AgentCoreMemorySessionManager` を `batch_size > 1` で利用した場合、`SessionAgent` のスナップショットがバッファされ、1 件の AGENT イベントの `payload` にまとめてフラッシュされます。
- これまで `read_agent` は `payload[0]`（最も古いスナップショット）を読んでいたため、新しいセッションマネージャーで Agent を復元すると、直前の実行で更新された `agent.state`、会話マネージャーの状態、割り込み状態がすべて失われていました。
- このリリースで `read_agent` が `payload[-1]`（最後に書き込まれたスナップショット）を読むように修正されました。既に 1.23.1 以降の影響を受けたバージョンで保存されたセッションも、本修正後は最新スナップショットから正しく復元されます。

**影響を受けていた状況:**
- `batch_size > 1` を指定して `AgentCoreMemorySessionManager` を使用していた環境。
- 具体的には以下 3 点がすべて影響を受けていました。
  - 直前実行の `agent.state` が反映されない
  - `SlidingWindowConversationManager` などの会話マネージャー状態が巻き戻る
  - 未応答の割り込み状態が復元されない（`batch_size=1` では復元されていた挙動）

**関連する内部的な修正:**
- フラッシュ失敗後に再バッファする Agent 状態は、以前は `extend` で後ろに追加されていました。これにより、同時にバッファされていた新しい状態より前になるべきスナップショットが末尾になり、`payload[-1]` が古い値を指してしまう可能性がありました。本修正では先頭に prepend するよう変更されています。
- Agent 状態バッファが満杯になった際、以前はスナップショットだけがフラッシュされ、バッファ済みメッセージは未フラッシュのまま残っていました。この状態でプロセスが落ちると、スナップショットの `removed_message_count` が保存済みメッセージを飛び越え、復元後の履歴が空になる問題がありました。本修正では、Agent 状態の自動フラッシュ時にメッセージを先にフラッシュしてから Agent 状態を書き出すよう変更されています。

**修正後の挙動（割り込み再開時の注意）:**

```python
from bedrock_agentcore.memory.integrations.strands import AgentCoreMemorySessionManager

# batch_size > 1 で保存された未応答の割り込みは、
# 本修正後は batch_size=1 と同様に正しく復元されるようになりました。
session_manager = AgentCoreMemorySessionManager(
    session_id="session-123",
    memory_id="memory-abc",
    batch_size=5,  # バッチモード
)

# 直前の実行が割り込みで終了していた場合、
# 単純なプロンプトで再開しようとすると以下の TypeError が出ます。
#   TypeError: must resume from interrupt with list of interruptResponse's
# interruptResponse のリストを渡して再開する必要があります。
```

**ポイント:**
- `batch_size > 1` を利用している環境では、1.23.1 以降で発生していたデータ損失が本リリースで解消されます。既存の保存済みセッションも最新スナップショットから正しく復元されるため、特別なマイグレーションは不要です。
- 1.23.1 以降のバッチセッションでは一度も復元されていなかった割り込み状態が復元されるようになるため、再開時のコードが `interruptResponse` を渡すよう対応している必要があります。

---

### `AgentCoreMemorySessionManager` に渡した boto3 セッションを `MemoryClient` にも伝播 ([#682](https://github.com/aws/bedrock-agentcore-sdk-python/pull/682))

**何が修正されたか:**
- これまで `AgentCoreMemorySessionManager.__init__` は、内部の `MemoryClient` を boto3 セッションを渡さずに構築していました。
- その結果、`MemoryClient` 内の `gmcp_client` / `gmdp_client` はデフォルトの `boto3.Session()` から作られてしまい、ユーザーが `boto_session` 引数で渡した名前付きプロファイルやカスタム認証情報が `MemoryClient` 自身には反映されない状態でした。
- 本修正では、`boto_session` を先に解決してから `MemoryClient(region_name=..., boto3_session=session)` として渡すように変更されています。

**影響を受けていた状況:**
- 名前付き AWS プロファイルや独自の認証情報を持つ `boto3.Session` を `AgentCoreMemorySessionManager` に渡して使っていたケース。
- セッションマネージャーが後から上書きする `gmcp_client` / `gmdp_client` は正しいセッションを使っていましたが、`MemoryClient` 自身は依然としてデフォルトセッションを使ってしまい、プロファイルが黙って無視される挙動となっていました。

**修正後の正しい使い方:**

```python
import boto3
from bedrock_agentcore.memory.integrations.strands import AgentCoreMemorySessionManager

# 名前付きプロファイル・カスタム認証情報を持つセッション
custom_session = boto3.Session(profile_name="my-profile", region_name="us-east-1")

session_manager = AgentCoreMemorySessionManager(
    session_id="session-123",
    memory_id="memory-abc",
    region_name="us-east-1",
    boto_session=custom_session,  # 本修正後は MemoryClient にも伝播する
)
```

**ポイント:**
- `strands-agents` 用の User-Agent や `boto_client_config` を適用するために後段で `gmcp_client` / `gmdp_client` が上書きされる挙動は変わりません。本修正は `MemoryClient` の初期化時点から正しいセッションが使われるようにするものです。
- 名前付きプロファイルや STS 発行の一時認証情報、クロスアカウントセッションなどを明示的に渡していた環境では、本修正により意図通りの認証情報で Memory API が呼び出されるようになります。

## まとめ

本リリースは `AgentCoreMemorySessionManager` に対する 2 件のバグ修正を含む安定性向上リリースです。`batch_size > 1` で発生していた Agent スナップショットの復元不整合、および `boto_session` が `MemoryClient` に伝播しない問題がいずれも修正されており、Strands Agents と AgentCore Memory を組み合わせて利用している場合は本バージョンへのアップデートを推奨します。
