---
title: "tools v0.2.19"
version: "v0.2.19"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2026-01-02
summary: "http_request ツールにプロキシサポートを追加。Calculator の精度パラメータが数値評価に影響を与えていた問題を修正。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.19"
---

## 概要

Strands Agents Tools v0.2.19 では、http_request ツールにオプショナルなプロキシサポートが追加され、プロキシサーバー経由でのリクエストが可能になりました。また、Calculator ツールで精度パラメータが数値評価に影響を与え、計算結果が不正確になっていた重要なバグが修正されました。

**リリース:** [v0.2.19](https://github.com/strands-agents/tools/releases/tag/v0.2.19)

## 新機能

### http_request ツールのプロキシサポート ([#247](https://github.com/strands-agents/tools/pull/247))

**この機能でできること:**
- http_request ツールがプロキシサーバー経由での HTTP リクエストをサポートするようになりました。企業ネットワーク内での使用や、特定のプロキシを経由する必要がある環境で便利です。

**使用例:**

```python
from strands_tools import http_request

# プロキシ経由でリクエストを送信
result = http_request(
    url="https://api.example.com/data",
    method="GET",
    proxy="http://proxy.example.com:8080"
)

# 認証が必要なプロキシの場合
result = http_request(
    url="https://api.example.com/data",
    method="GET",
    proxy="http://username:password@proxy.example.com:8080"
)

# プロキシなしでリクエスト（従来通り）
result = http_request(
    url="https://api.example.com/data",
    method="GET"
)
```

**ポイント:**
- プロキシパラメータはオプショナルで、指定しない場合は従来通りの動作をします
- HTTP と HTTPS のプロキシをサポートしています
- 既存のコードに影響を与えない後方互換性のある実装です

---

## バグ修正

### Calculator の精度パラメータによる計算結果の誤りを修正 ([#338](https://github.com/strands-agents/tools/pull/338))

- Calculator ツールで precision パラメータが数値評価時に適用されていたため、計算結果が不正確になっていた問題を修正しました
- 例えば、`221 * 318.11` の正しい答えは 70,302.31 ですが、precision が設定されている場合に誤った結果が返されていました
- 修正後は、式が完全な精度で評価され、precision は出力のフォーマット時にのみ適用されるようになりました
- 実数および複素数の計算において、precision 設定に関わらず正確な数値が得られるようになりました
- 既存の API と動作を保ったまま、計算の正確性を向上させる非破壊的なバグ修正です

---

## まとめ

v0.2.19 は、http_request ツールの柔軟性を向上させる新機能と、Calculator ツールの重要なバグ修正を含むリリースです。プロキシサポートにより企業環境での使用がより容易になり、Calculator の修正により数値計算の正確性が保証されるようになりました。
