---
title: "tools v0.2.20"
version: "v0.2.20"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2026-02-05
summary: "Browser ツールの PressKeyAction がディスパッチャチェーンに含まれていなかった問題を修正。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.20"
---

## 概要

Strands Agents Tools v0.2.20 では、Browser ツールの `press_key` アクションが正常に動作しない問題が修正されました。

**リリース:** [v0.2.20](https://github.com/strands-agents/tools/releases/tag/v0.2.20)

## バグ修正

### Browser ツールの PressKeyAction がディスパッチャチェーンに含まれていなかった問題を修正 ([#385](https://github.com/strands-agents/tools/pull/385))

- Browser ツールで `press_key` アクションを使用しようとすると「Unknown action type」エラーが発生する問題を修正しました
- `PressKeyAction` は完全に実装されていましたが、`browser()` メソッドのディスパッチャチェーンに含まれていませんでした
- 修正により、以下のキーボード操作が正常に使用できるようになりました:

```python
from strands_tools import browser

# Enter キーを押す
browser(action="press_key", key="Enter")

# Escape キーを押す
browser(action="press_key", key="Escape")

# Tab キーを押す
browser(action="press_key", key="Tab")
```

---

## まとめ

v0.2.20 は、Browser ツールの `press_key` アクションが動作しなかった問題を修正するリリースです。この修正により、キーボードイベントのシミュレーションが正常に機能するようになりました。
