---
title: "tools v0.5.2"
version: "v0.5.2"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2026-04-30
summary: "shell ツールにおける PTY ファイルディスクリプタのリソースリーク問題を修正しました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.5.2"
---

## 概要

このリリースでは、shell ツールの `CommandExecutor` クラスにおけるリソースリークの問題が修正されました。PTY ファイルディスクリプタが適切にクローズされるようになり、長時間稼働するアプリケーションでのリソース枯渇を防止します。

**リリース:** [v0.5.2](https://github.com/strands-agents/tools/releases/tag/v0.5.2)

---

## バグ修正

### PTY ファイルディスクリプタのリソースリーク修正 ([#369](https://github.com/strands-agents/tools/pull/369))

shell ツールの `CommandExecutor` クラスで、PTY（擬似端末）のファイルディスクリプタがプロセス完了後に適切にクローズされない問題が修正されました。

**影響を受けていた状況:**
- shell ツールを繰り返し使用するエージェントで、ファイルディスクリプタが徐々に蓄積
- 長時間稼働するアプリケーションでリソース枯渇が発生する可能性

**修正内容:**
- `execute_with_pty` メソッドの `finally` ブロックで、PTY ファイルディスクリプタを確実にクローズするように変更
- `try-except` ブロックで `OSError` を適切にハンドリング

```python
# 修正後の処理フロー
finally:
    # PTY ファイルディスクリプタをクローズ
    if "fd" in locals() and pid > 0:
        try:
            os.close(fd)
        except OSError:
            pass
    # 端末設定の復元処理...
```

---

## まとめ

shell ツールのリソース管理が改善され、長時間稼働するエージェントアプリケーションの安定性が向上しました。
