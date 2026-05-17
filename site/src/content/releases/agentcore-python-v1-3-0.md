---
title: "AgentCore Python SDK v1.3.0 リリース解説"
version: "v1.3.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-02-11
summary: "メモリ機能の大幅な改善（イベントメタデータによる状態識別、メッセージバッチ処理、冗長な同期の排除）、バイナリコンテンツのダウンロードエラー修正、Identity エンドポイントの修正、非推奨メソッドの削除が含まれています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.3.0"
---

## 概要

このリリースでは、メモリ機能の大幅な改善が行われました。イベントメタデータによる状態識別、メッセージバッチ処理、冗長な API 呼び出しの排除により、パフォーマンスと効率性が向上しています。また、バイナリコンテンツのダウンロード時のクラッシュ修正や、非推奨メソッドの削除も含まれています。

**リリース:** [v1.3.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.3.0)

## 新機能

### イベントメタデータによる状態識別、メッセージバッチ処理、冗長同期の排除 ([#244](https://github.com/aws/bedrock-agentcore-sdk-python/pull/244))

**この機能でできること:**
- セッション状態とエージェント状態の識別方法が、actorId のプレフィックスからイベントメタデータに変更され、よりクリーンなアクター識別が可能になりました
- メッセージバッチ処理により複数のメッセージを単一の API 呼び出しにグループ化し、リクエスト数を削減できます
- エージェント状態のハッシュ追跡により、状態が変更されていない場合の冗長な `sync_agent` API 呼び出しをスキップし、会話ターンあたり約 6 回以上の不要な API 呼び出しを排除します

**使用例:**

```python
from bedrock_agentcore.memory.integrations.strands import AgentCoreSessionManager

# バッチサイズを設定してセッションマネージャーを初期化
session_manager = AgentCoreSessionManager(
    session_id="my-session-id",
    batch_size=10  # 1-100 の範囲で設定可能（デフォルト: 1）
)

# イベントメタデータによる状態識別（新しい方式）
# セッション状態はメタデータで識別されます
create_event(
    actorId="shared-actor-id",
    metadata={"stateType": {"stringValue": "SESSION"}},
    ...
)

# エージェント状態もメタデータで識別されます
create_event(
    actorId="shared-actor-id",
    metadata={
        "stateType": {"stringValue": "AGENT"},
        "agentId": {"stringValue": "my-agent-id"},
    },
    ...
)
```

**ポイント:**
- 既存のセッション（旧プレフィックス形式）は自動マイグレーションにより引き続き動作します
- バッチ処理では 9KB を超える blob メッセージは個別の API パスで送信されます
- 状態ハッシュは `initialize()` 時にシードされ、初回のフック起動同期で正しく未変更状態を検出します

---

## バグ修正

### バイナリコンテンツダウンロード時の UnicodeDecodeError を修正 ([#257](https://github.com/aws/bedrock-agentcore-sdk-python/pull/257))

- `download_file()` と `download_files()` が PNG、JPEG、PDF などのバイナリコンテンツを base64 エンコードされた blob として返す際に `UnicodeDecodeError` でクラッシュする問題を修正しました
- 根本原因: デコードされた blob バイトに対して `.decode("utf-8")` が無条件に呼び出されていました
- UTF-8 としてデコード可能な場合は `str` を返し（後方互換性を維持）、真のバイナリコンテンツの場合は `bytes` を返すようになりました
- 戻り値の型アノテーションが `Union[str, bytes]` に更新されました

### Create/UpdateWorkloadIdentity のエンドポイントを修正 ([#249](https://github.com/aws/bedrock-agentcore-sdk-python/pull/249))

- `Create/UpdateWorkloadIdentity` 関数がデータプレーンエンドポイントを使用していた問題を修正し、他のコントロールプレーン操作と同様にコントロールプレーンエンドポイントを使用するようになりました

### 非推奨の save_turn() と process_turn() メソッドを削除 ([#241](https://github.com/aws/bedrock-agentcore-sdk-python/pull/241))

- v1.0.0 で削除予定だった `save_turn()` メソッドを削除しました。代わりに `save_conversation()` を使用してください
- v1.0.0 で削除予定だった `process_turn()` メソッドを削除しました。代わりに `retrieve_memories()` と `save_conversation()` を個別に使用してください

## まとめ

このリリースでは、メモリ機能の大幅な改善によりパフォーマンスと効率性が向上しました。特にメッセージバッチ処理と冗長同期の排除により、API 呼び出し回数が大幅に削減されます。また、バイナリファイルのダウンロード問題の修正や非推奨メソッドの削除により、SDK の安定性と一貫性が向上しています。
