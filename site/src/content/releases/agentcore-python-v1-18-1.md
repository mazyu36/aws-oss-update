---
title: "AgentCore Python SDK v1.18.1 リリース解説"
version: "v1.18.1"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-07-17
summary: "Code Interpreter の install_packages() におけるパッケージ指定子の検証を強化するバグ修正リリースです。extras グループのバリデーションが厳密化され、pip install コマンドの引数がシェルクォートされるようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.18.1"
---

## 概要

このリリースは、Code Interpreter ツール（`bedrock_agentcore.tools.code_interpreter_client`）の `install_packages()` におけるパッケージ指定子検証を強化するバグ修正リリースです。extras グループの構文チェックが厳密になり、`pip install` コマンド構築時に各引数が `shlex.quote()` でクォートされるようになりました。

**リリース:** [v1.18.1](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.18.1)

## バグ修正

### `install_packages()` のパッケージ指定子検証を強化 ([#581](https://github.com/aws/bedrock-agentcore-sdk-python/pull/581))

**問題:**
- `CodeInterpreter.install_packages()` が受け付けるパッケージ名の正規表現において、extras グループ（角括弧内）が `\[.*\]` と定義されており、任意の文字を受け付けていた
- そのため `requests[$(id)]` や `flask[` + バッククォート + `whoami` + バッククォート + `]`、`pandas[a b c]` のように、pip の extras として正当でない文字を含む値も許容されていた
- パッケージ引数は `" ".join(packages)` でそのまま連結されており、`pip install` コマンドの文字列に埋め込まれていた

**修正内容:**

1. **extras グループの正規表現を厳密化**
   - `\[.*\]` から `\[[a-zA-Z0-9._,\-]*\]` に変更
   - カンマ区切りの識別子（有効な extra 名）のみを許容するようになった
   - `pandas[security]` や `celery[redis,auth]` のような正当な指定は引き続き動作する

2. **引数を `shlex.quote()` でクォート**
   - `pip install` コマンド構築時に各パッケージ引数を単一のリテラルトークンとして扱う
   - 例えば `pandas>=2.0` のようにシェルのメタ文字（`>`）を含む指定子も、`'pandas>=2.0'` のようにクォートされたうえで pip に渡される

**変更前:**

```python
VALID_PACKAGE_NAME = re.compile(
    r"^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?(\[.*\])?(==|>=|<=|!=|~=|>|<)?[a-zA-Z0-9.*]*$"
)

# ...
packages_str = " ".join(packages)
command = f"pip install {upgrade_flag}{packages_str}"
```

**変更後:**

```python
import shlex

VALID_PACKAGE_NAME = re.compile(
    r"^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?(\[[a-zA-Z0-9._,\-]*\])?(==|>=|<=|!=|~=|>|<)?[a-zA-Z0-9.*]*$"
)

# ...
# 各引数を単一のリテラルトークンとしてコマンドに渡す
packages_str = " ".join(shlex.quote(pkg) for pkg in packages)
command = f"pip install {upgrade_flag}{packages_str}"
```

**利用者への影響:**

正当な指定は引き続き動作するため、既存の利用コードに変更は不要です。

```python
from bedrock_agentcore.tools.code_interpreter_client import CodeInterpreter

with CodeInterpreter("us-west-2") as client:
    client.start()

    # OK: 有効な extras 指定
    client.install_packages([
        "pandas[security]",
        "celery[redis,auth]",
        "pandas>=2.0",
        "numpy<2.0",
        "scikit-learn==1.3.0",
    ])

    # NG: 無効な extras（メタ文字を含むもの）は ValueError で拒否される
    # client.install_packages(["requests[$(id)]"])   # ValueError: Invalid package name
    # client.install_packages(["pandas[a b c]"])     # ValueError: Invalid package name
```

## まとめ

このリリースは、Code Interpreter ツールにおける `install_packages()` の入力検証を強化するバグ修正リリースです。extras グループのバリデーションが厳密化されるとともに、pip コマンド構築時の引数クォートが行われるようになり、より堅牢なパッケージインストール処理となりました。既存の正当なユースケースには影響しないため、そのままアップグレード可能です。
