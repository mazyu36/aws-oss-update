---
title: "Strands Python SDK v1.33.0 リリース解説"
version: "v1.33.0"
repository: "sdk-python"
repositoryDisplayName: "Strands Python SDK"
releaseType: "stable"
date: 2026-03-24
summary: "litellm のサプライチェーン攻撃への緊急対応と SummarizingConversationManager の空レスポンス問題の修正が含まれます。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.33.0"
---

## 概要

このリリースでは、litellm パッケージのサプライチェーン攻撃に対する緊急のセキュリティ対応と、SummarizingConversationManager が空のレスポンスを返すことがある問題の修正が含まれています。litellm を使用している場合は、速やかにアップデートすることを強く推奨します。

**リリース:** [v1.33.0](https://github.com/strands-agents/sdk-python/releases/tag/v1.33.0)

## バグ修正

### litellm のサプライチェーン攻撃への緊急対応 ([#1961](https://github.com/strands-agents/sdk-python/pull/1961))
- litellm 1.82.8 以降に悪意のあるファイル（`litellm_init.pth`）が含まれていることが発見された
- パッケージ所有者のアカウントが侵害されたことが原因
- `litellm<=1.82.6` にハードピン留めすることで、影響を受けるバージョンのインストールを防止

**重要:** litellm を使用している場合は、以下のコマンドで現在のバージョンを確認してください：

```bash
pip show litellm
```

バージョンが 1.82.7 以上の場合は、以下のコマンドで安全なバージョンにダウングレードしてください：

```bash
pip install "litellm<=1.82.6"
```

**参考リンク:**
- [Supply Chain Attack in litellm 1.82.8 on PyPI](https://futuresearch.ai/blog/litellm-pypi-supply-chain-attack/)
- [litellm Issue #24512](https://github.com/BerriAI/litellm/issues/24512)

---

### SummarizingConversationManager の空レスポンス問題を修正 ([#1947](https://github.com/strands-agents/sdk-python/pull/1947))
- `SummarizingConversationManager` が空のレスポンスを返すことがあった問題を修正
- モデルプロバイダーのツール仕様要件を満たすために注入された `noop` ツールが、約 15-25% の確率で呼び出されていた
- `noop` ツールが `None` を返していたため、モデルの後続レスポンスが空メッセージとなり、会話履歴が静かに破棄されていた
- `noop` ツールの戻り値を指示文字列に変更し、モデルが適切なテキストレスポンスを生成するよう誘導

**修正前の動作:**
- `noop` ツールが呼び出されると `None` を返却
- モデルが空のメッセージ（`content: []`）を返却
- 会話履歴がエラーなく破棄される

**修正後の動作:**
- `noop` ツールが呼び出されると指示文字列を返却
- モデルが適切なテキストレスポンスを生成
- 会話履歴が正しく要約される

**テスト結果（`claude-3-haiku-20240307` での 30 回実行）:**

| バージョン | 空の要約 | noop 呼び出し後の回復率 |
|---|---|---|
| 修正前（`None` 返却） | 3-5 / 20 (~15-25%) | ~40% |
| 修正後（指示文字列返却） | 0 / 30 (0%) | 6/6 (100%) |

## まとめ

v1.33.0 は litellm のサプライチェーン攻撃に対するセキュリティ対応を含む重要なリリースです。litellm を使用している場合は速やかにアップデートしてください。
