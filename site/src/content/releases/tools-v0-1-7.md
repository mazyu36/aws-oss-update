---
title: "Strands Tools v0.1.7 リリース解説"
version: "v0.1.7"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-06-24
summary: "Ubuntu Linux 環境でのタイムゾーンテストの修正と Windows 非対応ツールのドキュメント化を含むメンテナンスリリース。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.1.7"
---

## 概要

このリリースでは、Ubuntu Linux 環境でのタイムゾーン関連のテスト不具合を修正し、Windows で非対応のツールに関するドキュメントを改善しました。これにより、クロスプラットフォームでの開発体験が向上します。

**リリース:** [v0.1.7](https://github.com/strands-agents/tools/releases/tag/v0.1.7)

## バグ修正

### Ubuntu Linux でのタイムゾーンテストの修正 ([#95](https://github.com/strands-agents/tools/pull/95))
- Ubuntu Linux 環境で `TZ=US/Pacific` が設定されている場合に、Current time tool のテストが失敗する問題を修正しました
- タイムゾーン設定に依存しないテストロジックに改善されました
- この修正により、様々なタイムゾーン環境でテストが安定して実行できるようになりました

### Windows 非対応ツールのドキュメント化 ([#92](https://github.com/strands-agents/tools/pull/92))
- Windows で現在サポートされていないツールについて、README に明記しました
- 開発者が事前にプラットフォーム互換性を確認できるようになり、トラブルシューティングが容易になりました
- これにより、Windows 環境での開発時に発生する予期しないエラーを回避できます

## まとめ

このリリースでは、クロスプラットフォーム対応の改善に焦点を当て、Linux でのテストの安定性向上と Windows サポート状況の明確化を実現しました。
