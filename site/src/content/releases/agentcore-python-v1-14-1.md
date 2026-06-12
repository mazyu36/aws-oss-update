---
title: "AgentCore Python SDK v1.14.1 リリース解説"
version: "v1.14.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-06-11
summary: "A2A サーバー起動エラーの修正、datasets 機能における requests 依存関係の明示化、x402 v2 ヘッダーのタイポ修正を含むバグ修正リリースです。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.14.1"
---

## 概要

AgentCore Python SDK v1.14.1 は 3 件のバグ修正を含むパッチリリースです。A2A サーバーの起動エラー、Dataset Management 利用時の `ModuleNotFoundError`、x402 v2 ヘッダーのフィールド名タイポといった、フレッシュインストール環境や本番運用で表面化していた問題を解消しています。

**リリース:** [v1.14.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.14.1)

## バグ修正

### A2A サーバー起動エラーの修正 ([#510](https://github.com/aws/bedrock-agentcore-sdk-python/pull/510))

- `pip install "bedrock-agentcore[a2a]"` を実行した際に、`a2a-sdk` の最新版 (1.x) が解決され、`No module named 'a2a.server.apps'` や `cannot import name 'DataPart' from 'a2a.types'` といったエラーで A2A サーバーが起動できない問題を修正
- 影響を受けていた状況: `a2a-sdk[http-server]>=0.3` という上限のない指定により、新規インストールで a2a-sdk 1.x が選択されていた。a2a-sdk 1.0.0 でサーバー API が再設計され、`A2AStarletteApplication` や `CallContextBuilder` が削除、`a2a.types.DataPart` が `a2a.compat.v0_3.types` に移動していたため、SDK 内の `runtime/a2a.py` (0.3.x 系を前提) と互換性が失われていた
- 修正内容: `pyproject.toml` の `a2a` extra と dev 依存の双方で `a2a-sdk[http-server]>=0.3,<1.0` と上限を設定し、互換バージョンに固定

**修正後のインストール:**

```bash
# A2A サーバー機能を含めてインストール
pip install "bedrock-agentcore[a2a]"
# 0.3.x 系の a2a-sdk が解決され、A2A サーバーが正常に起動するようになる
```

なお、a2a-sdk v1.x API への移行は別途 [#509](https://github.com/aws/bedrock-agentcore-sdk-python/issues/509) で追跡されています。

---

### `requests` を datasets extra として明示化 ([#508](https://github.com/aws/bedrock-agentcore-sdk-python/pull/508))

- `bedrock_agentcore.evaluation` から Dataset Management サービスのデータセットをダウンロードする際に、`ModuleNotFoundError: No module named 'requests'` で失敗する問題を修正
- 影響を受けていた状況: `dataset_providers.py` がモジュールトップレベルで `requests` を import していたが、依存関係として宣言されていなかったため、フレッシュインストール環境では import の時点でエラーになっていた
- 修正内容:
  - `pyproject.toml` の `[project.optional-dependencies]` に `datasets = ["requests>=2.31.0"]` を追加（既存の `strands-agents-evals` / `simulation` / `a2a` / `ag-ui` と同じパターン）
  - `dataset_providers.py` 内では `requests` を `get_dataset()` 内で遅延 import に変更し、未インストール時には明確なエラーメッセージを表示

**インストール例:**

```bash
# データセット機能を利用する場合
pip install "bedrock-agentcore[datasets]"
```

**修正後の挙動:**

```python
from bedrock_agentcore.evaluation.runner.dataset_providers import ServiceDatasetProvider

# datasets extra が未インストールの場合、get_dataset() 呼び出し時に
# ImportError で "pip install 'bedrock-agentcore[datasets]'" と
# インストール手順を案内するメッセージが表示される
provider = ServiceDatasetProvider(...)
dataset = provider.get_dataset(...)
```

---

### x402 v2 ヘッダーの "extension" → "extensions" タイポ修正 ([#513](https://github.com/aws/bedrock-agentcore-sdk-python/pull/513))

- 支払い署名フィールド名のタイポ ("extension") を、x402 プロトコル仕様で規定されている正しい複数形 ("extensions") に修正
- 影響を受けていた状況: 誤ったフィールド名を含むヘッダーは x402 v2 仕様に準拠していないため、相手側の検証で失敗する可能性があった
- 修正対象: `src/bedrock_agentcore/payments/manager.py` および関連テスト

## まとめ

A2A サーバーや Dataset Management の利用、x402 v2 決済機能を使うユーザーにとって運用上の支障となっていた問題が解消されました。該当機能を利用している場合は v1.14.1 へのアップグレードを推奨します。
