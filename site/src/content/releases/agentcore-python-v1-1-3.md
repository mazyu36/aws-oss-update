---
title: "AgentCore Python SDK v1.1.3 リリース解説"
version: "v1.1.3"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-01-07
summary: "CodeInterpreter クラスに新しい便利メソッドを追加し、ファイル操作とパッケージ管理が簡単になりました。既存のコードとの互換性を保ちながら、より直感的な API を提供します。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.3"
---

## 概要

このリリースでは、`CodeInterpreter` クラスに開発者フレンドリーな便利メソッドが追加されました。従来の冗長な `invoke()` 呼び出しを簡素化し、ファイルのアップロード/ダウンロード、パッケージのインストール、コード実行などの一般的な操作をより直感的に行えるようになりました。既存のコードとの完全な後方互換性を維持しています。

**リリース:** [v1.1.3](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.1.3)

## 新機能

### CodeInterpreter 便利メソッドの追加 ([#202](https://github.com/aws/bedrock-agentcore-sdk-python/pull/202))

**この機能でできること:**
- ファイル操作（アップロード/ダウンロード）、パッケージ管理、コード実行などの一般的なタスクを、より簡潔で読みやすい API で実行できるようになりました。従来の `invoke()` メソッドを使った冗長な記述から解放されます。

**使用例:**

#### ファイルのアップロード

```python
from bedrock_agentcore.tools import CodeInterpreter

client = CodeInterpreter(...)

# 単一ファイルのアップロード
csv_content = "name,value\nAlice,100\nBob,200"
client.upload_file('data.csv', csv_content, description='売上データ')

# 複数ファイルの一括アップロード
files = [
    {'path': 'config.json', 'text': '{"debug": true}', 'description': '設定ファイル'},
    {'path': 'script.py', 'text': 'print("Hello")', 'description': 'スクリプト'}
]
client.upload_files(files)
```

#### パッケージのインストール

```python
# 単一パッケージのインストール
client.install_packages(['pandas'])

# 複数パッケージのインストール
client.install_packages(['pandas', 'numpy', 'matplotlib'])

# パッケージのアップグレード
client.install_packages(['pandas'], upgrade=True)
```

#### ファイルのダウンロード

```python
# 単一ファイルの読み取り
content = client.download_file('output.csv')

# 複数ファイルの一括読み取り
files = client.download_files(['output1.csv', 'output2.txt'])
```

#### コードの実行

```python
# Python コードの実行
code = """
import pandas as pd
df = pd.read_csv('data.csv')
print(df.describe())
"""
client.execute_code(code, language='python')

# コンテキストをクリアして実行
client.execute_code(code, language='python', clear_context=True)
```

#### シェルコマンドの実行

```python
# シェルコマンドの実行
client.execute_shell('ls -la')
```

**ポイント:**
- **セキュリティ機能**: 絶対パス（`/etc/passwd` など）の使用を拒否し、パッケージ名にシェルインジェクション文字（`;`, `&`, `|`, `` ` ``, `$`）が含まれていないかを検証します
- **後方互換性**: 既存の `invoke()` メソッドはそのまま動作し、段階的な移行が可能です
- **バッチ処理**: 複数のファイルやパッケージを一度に処理できるバッチメソッドが用意されています
- **型安全性**: 明示的なパラメータにより、IDE の補完機能が活用できます

**従来の記述との比較:**

```python
# 従来の記述（冗長）
client.invoke('writeFiles', {
    'content': [{'path': 'data.csv', 'text': content}]
})
client.invoke('executeCommand', {
    'command': 'pip install pandas numpy'
})

# 新しい記述（簡潔）
client.upload_file('data.csv', content)
client.install_packages(['pandas', 'numpy'])
```

## まとめ

このリリースでは、CodeInterpreter の使いやすさが大幅に向上しました。新しい便利メソッドにより、コードがより読みやすく、保守しやすくなります。既存のコードとの互換性も完全に保たれているため、安心してアップグレードできます。
