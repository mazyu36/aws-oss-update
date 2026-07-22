---
title: "Strands Tools v0.8.5 リリース解説"
version: "v0.8.5"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-07-21
summary: "メンテナンスリリース: README のマイナーな問題を修正するドキュメントのみのリリースです。新機能やバグ修正は含まれていません。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.5"
---

## 概要

このリリースはメンテナンスリリースです。新機能やバグ修正は含まれておらず、README のマイナーな問題を修正するドキュメントのみの変更が行われました。

**リリース:** [v0.8.5](https://github.com/strands-agents/tools/releases/tag/v0.8.5)

## 変更内容

- README のマイナーな問題を修正 ([#544](https://github.com/strands-agents/tools/pull/544))
  - optional-tools の `pip install` コマンドで extras をクォートし、zsh でも動作するように修正（クォートしないと角括弧が glob 展開されてしまうため）
  - Windows の venv アクティベーションパスを `.venv\Scripts\activate` に修正（venv は `.venv` として作成されるため）
  - ツール表の脚注で "Windows" を大文字表記に統一

## まとめ

README のドキュメント修正のみを含むメンテナンスリリースです。コード上の挙動に影響する変更はありません。
