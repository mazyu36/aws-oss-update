---
title: "Strands Tools v0.1.4 リリース解説"
version: "v0.1.4"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2025-05-26
summary: "get_user_input() ユーティリティ関数に、KeyboardInterrupt と EOFError の伝播を制御できる新しいパラメータを追加しました。これにより、ユーザー入力処理時の割り込み動作をより細かく制御できるようになります。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.1.4"
---

## 概要

このリリースでは、`get_user_input()` ユーティリティ関数に新しいパラメータが追加され、ユーザー入力処理時の割り込み動作をより柔軟に制御できるようになりました。これにより、Ctrl+C などのキーボード割り込みをアプリケーションで適切に処理できます。

**リリース:** [v0.1.4](https://github.com/strands-agents/tools/releases/tag/v0.1.4)

## 新機能

### keyboard_interrupt_return_default パラメータの追加 ([#37](https://github.com/strands-agents/tools/pull/37))

**この機能でできること:**
- `get_user_input()` 関数で KeyboardInterrupt と EOFError の伝播を制御できるようになりました。新しい `keyboard_interrupt_return_default` パラメータを使用することで、これらの例外が発生した際にデフォルト値を返すか、例外を伝播させるかを選択できます。

**使用例:**

```python
from strands_tools.utils.user_input import get_user_input

# デフォルト動作: KeyboardInterrupt/EOFError 時にデフォルト値を返す
result = get_user_input(
    prompt="名前を入力してください",
    default="匿名",
    keyboard_interrupt_return_default=True  # デフォルト値
)
# Ctrl+C を押すと "匿名" が返される

# 例外を伝播させる動作
try:
    result = get_user_input(
        prompt="名前を入力してください",
        default="匿名",
        keyboard_interrupt_return_default=False
    )
except KeyboardInterrupt:
    print("ユーザーが入力をキャンセルしました")
    # 独自のクリーンアップ処理を実行
```

**ポイント:**
- `keyboard_interrupt_return_default=True` (デフォルト) の場合、Ctrl+C や EOF が発生すると指定したデフォルト値が返されます
- `keyboard_interrupt_return_default=False` の場合、KeyboardInterrupt や EOFError が上位の呼び出し元に伝播され、独自の例外処理が可能になります
- アプリケーションで独自のクリーンアップロジックや終了処理が必要な場合は、`False` に設定すると便利です

## まとめ

このリリースでは、ユーザー入力処理の柔軟性が向上し、より堅牢なエラーハンドリングが可能になりました。

---
