---
title: "tools v0.2.17"
version: "v0.2.17"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-12-03
summary: "python_repl ツールに環境変数による永続化ディレクトリ設定機能を追加し、MongoDB ツールの namespace セキュリティ問題を修正しました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.17"
---

## 概要

このリリースでは、python_repl ツールの柔軟性が向上し、環境変数を使用して状態ファイルの保存先を指定できるようになりました。また、MongoDB ツールの namespace バリデーションに関する重要なセキュリティ問題が修正されました。

**リリース:** [v0.2.17](https://github.com/strands-agents/tools/releases/tag/v0.2.17)

## 新機能

### 環境変数による python_repl 永続化ディレクトリの設定 ([#312](https://github.com/strands-agents/tools/pull/312))

**この機能でできること:**
python_repl ツールの状態ファイル保存先を環境変数 `PYTHON_REPL_PERSISTENCE_DIR` で設定できるようになりました。これにより、Docker コンテナやマルチユーザー環境など、デフォルトの保存先が適切でない場合でも柔軟に対応できます。

**使用例:**

```python
import os
from strands import Agent
from strands_tools import python_repl

# 環境変数でカスタムディレクトリを設定
os.environ['PYTHON_REPL_PERSISTENCE_DIR'] = '/custom/path/to/state'

# エージェントに python_repl ツールを登録
agent = Agent(tools=[python_repl])

# 変数を設定（カスタムディレクトリに状態が保存される）
agent.tool.python_repl(code="x = 42")

# 後続の実行でも変数が保持される
result = agent.tool.python_repl(code="print(f'x の値は {x} です')")
# 出力: x の値は 42 です
```

**ポイント:**
- 環境変数が設定されていない場合は、従来通りデフォルトのディレクトリが使用されます
- セキュリティ強化のため、ディレクトリパスのバリデーション機能が追加されています
- Docker コンテナでボリュームマウントする場合など、永続化が必要な環境で特に有用です

---

## バグ修正

### MongoDB namespace セキュリティ問題の修正 ([#321](https://github.com/strands-agents/tools/pull/321))

MongoDB ツールの namespace パラメータにインジェクション攻撃の可能性があるセキュリティ脆弱性が修正されました。namespace の値が正規表現パターンに適合しているかチェックするバリデーション関数が追加され、不正な値が渡されることを防ぎます。この修正により、mongodb_memory ツールと code_interpreter ツールの両方でセキュリティが強化されました。

## まとめ

v0.2.17 では、python_repl ツールの柔軟性向上と MongoDB 関連のセキュリティ強化が行われました。特に MongoDB のセキュリティ修正は重要なアップデートですので、該当ツールを使用している場合は早めのアップデートを推奨します。
