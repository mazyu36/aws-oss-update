---
title: "sdk-python v0.1.1"
version: "v0.1.1"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-05-17
summary: "Bedrock API 呼び出しに user-agent を設定し、CloudTrail ログでの追跡を可能にする改善を含むバグ修正リリース。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.1.1"
---

## 概要

Strands Agents Python SDK v0.1.1 は、Bedrock API 呼び出しに適切な user-agent を設定することで、CloudTrail ログにおける API 呼び出しの追跡を改善するバグ修正リリースです。

**リリース:** [v0.1.1](https://github.com/strands-agents/sdk-python/releases/tag/v0.1.1)

## バグ修正

### Bedrock API 呼び出しに user-agent を設定 ([#23](https://github.com/strands-agents/sdk-python/pull/23))

Bedrock API への呼び出し時に "strands-agents" を user-agent として設定するようになりました。この変更により、CloudTrail ログで Bedrock API 呼び出しの発信元を正確に特定できるようになり、ログの追跡性とモニタリングが向上します。

**影響を受けていた状況:**
- Bedrock モデルを使用する際、CloudTrail ログで API 呼び出しの発信元が不明確でした
- 複数のアプリケーションから Bedrock を使用している環境で、どの呼び出しが Strands Agents からのものか識別できませんでした

**改善内容:**
- すべての Bedrock API 呼び出しに "strands-agents" user-agent が追加されます
- CloudTrail ログで Strands Agents からの呼び出しを簡単にフィルタリングできます
- API 使用状況の分析とコスト管理が容易になります

---

## まとめ

v0.1.1 は、Bedrock API 呼び出しの追跡性を向上させる重要なバグ修正リリースです。CloudTrail を使用したモニタリングやコスト管理を行うユーザーにとって有用な改善が含まれています。
