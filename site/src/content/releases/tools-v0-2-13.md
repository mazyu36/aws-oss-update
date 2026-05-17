---
title: "Strands Tools v0.2.13 リリース解説"
version: "v0.2.13"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-10-29
summary: "Code Interpreter tool に自動セッション管理機能が追加され、手動でのセッション初期化が不要になりました。これにより、シンプルなコード実行タスクでの開発者体験が大幅に向上し、レイテンシとエラーの可能性が削減されます。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.13"
---

## 概要

このリリースでは、Code Interpreter tool に自動セッション管理機能が追加されました。これにより、従来必須だった明示的なセッション初期化が不要になり、シンプルなコード実行では1回の tool 呼び出しだけで完結するようになりました。LLM エージェントのワークフロー設計における複雑さが軽減され、パフォーマンスも向上します。

**リリース:** [v0.2.13](https://github.com/strands-agents/tools/releases/tag/v0.2.13)

## 新機能

### Code Interpreter tool に自動セッション管理を追加 ([#284](https://github.com/strands-agents/tools/pull/284))

**この機能でできること:**
Code Interpreter tool で、セッション名を指定せずにコードを実行できるようになりました。tool が自動的にセッションを作成・管理するため、従来必要だった `initSession` と `executeCode` の2回の tool 呼び出しが、`executeCode` 1回で完結します。

**変更前:**
```python
# 従来: 2つの操作が必要
interpreter.code_interpreter({
    "action": {"type": "initSession", "session_name": "my-session", "description": "..."}
})
interpreter.code_interpreter({
    "action": {"type": "executeCode", "session_name": "my-session", "code": "print('hello')"}
})
```

**変更後:**
```python
# 新機能: 1つの操作で完結 - セッションは自動作成される
interpreter.code_interpreter({
    "action": {"type": "executeCode", "code": "print('hello')"}
})
```

**主な改善点:**
- `session_name` パラメータがすべてのアクションモデルで optional になりました
- 自動セッション作成機能がデフォルトで有効になっています（`auto_session=True`）
- tool 呼び出し回数が 5-7回 から 1-2回 に削減されました
- セッション初期化のオーバーヘッド（約 8-30秒）が削減されました

**ポイント:**
- 既存の明示的なセッション管理コードとの後方互換性は維持されています
- 複雑なワークフローで明示的なセッション管理が必要な場合は、引き続き `session_name` を指定できます
- 自動セッション管理を無効にしたい場合は、`auto_session=False` を設定できます
- デフォルトのセッション名は `"default"` ですが、`default_session` パラメータでカスタマイズ可能です

## まとめ

v0.2.13 では、Code Interpreter tool の自動セッション管理により、シンプルな使用ケースでの開発者体験が大幅に向上しました。tool 呼び出し回数の削減とレイテンシの改善により、LLM エージェントワークフローの効率性と成功率が向上します。
