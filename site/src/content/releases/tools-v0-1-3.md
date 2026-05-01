---
title: "tools v0.1.3"
version: "v0.1.3"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-05-23
summary: "このリリースでは、nova_reels と think ツールでの console 出力の修正と、mem0 依存関係をオプション化することで Lambda デプロイメントの問題を解決しました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.1.3"
---

## 概要

このリリースでは、2つの重要なバグ修正が行われました。nova_reels と think ツールで `print()` を `console.print()` に置き換えることで、`STRANDS_TOOL_CONSOLE_MODE` 環境変数が正しく動作するようになりました。また、mem0 依存関係をオプション化することで、Lambda デプロイメント時の依存関係解決の問題が解決されました。

**リリース:** [v0.1.3](https://github.com/strands-agents/tools/releases/tag/v0.1.3)

## バグ修正

### nova_reels と think ツールでの console 出力の修正 ([#29](https://github.com/strands-agents/tools/pull/29))

**修正内容:**
- nova_reels と think ツールで `print()` を `console.print()` に置き換え
- これにより、`STRANDS_TOOL_CONSOLE_MODE` 環境変数が正しく尊重されるようになりました

**影響:**
以前は、これらのツールが常に標準出力に出力していたため、環境変数による出力モードの制御ができませんでした。この修正により、アプリケーションの出力制御が一貫して機能するようになりました。

**変更ファイル:**
- `src/strands_tools/nova_reels.py`
- `src/strands_tools/think.py`
- `tests/test_think.py`

---

### mem0 依存関係のオプション化 ([#32](https://github.com/strands-agents/tools/pull/32))

**修正内容:**
- mem0 の依存関係をオプションにすることで、`manylinux2014_aarch64` プラットフォームでの依存関係解決の問題を解決
- Lambda デプロイメント時の互換性が向上しました

**影響:**
AWS Lambda などの環境で、特定のプラットフォーム向けのパッケージビルド時に発生していた依存関係エラーが解消されました。mem0 機能を使用する場合は、明示的にオプション依存関係をインストールする必要があります。

**インストール方法:**

```bash
# mem0 機能が必要な場合
pip install strands-tools[mem0]

# 基本機能のみの場合
pip install strands-tools
```

**ポイント:**
- Lambda デプロイメントや特定のプラットフォームでのビルドエラーが解消されます
- mem0 機能を使用しない場合は、より軽量なインストールが可能になりました
- 将来的には、より良い依存関係管理の戦略が検討されています（[#31](https://github.com/strands-agents/tools/issues/31)）

**関連イシュー:**
- [strands-agents/docs#19](https://github.com/strands-agents/docs/issues/19)
- [strands-agents/tools#31](https://github.com/strands-agents/tools/issues/31)

---

## まとめ

このリリースでは、console 出力の一貫性向上と Lambda デプロイメントの互換性改善という、2つの重要なバグ修正が行われました。より安定した開発環境とデプロイメント体験を提供します。
