---
title: "Strands Tools v0.8.2 リリース解説"
version: "v0.8.2"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-06-25
summary: "generate_image の保存ファイル拡張子が output_format と一致するように修正され、http_request の proxies パラメータが LLM 制御可能な入力スキーマから除外されたバグ修正リリースです。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.2"
---

## 概要

このリリースには 2 件のバグ修正が含まれます。`generate_image` で `output_format` を指定しても保存ファイルの拡張子が `.png` 固定になっていた問題が修正され、`http_request` では LLM に制御させるべきではない `proxies` パラメータがツール入力スキーマから除外されてセキュリティが強化されました。

**リリース:** [v0.8.2](https://github.com/strands-agents/tools/releases/tag/v0.8.2)

## バグ修正

### generate_image: 保存ファイルの拡張子が output_format と一致するように修正 ([#501](https://github.com/strands-agents/tools/pull/501))

`generate_image` ツールは `output_format` パラメータ（デフォルト `"jpeg"`）を Bedrock リクエストと `ToolResult` の `format` フィールドの両方に渡していましたが、保存ファイル名の拡張子だけが `.png` でハードコードされていました。このため、デフォルト設定で実行すると JPEG バイト列が `.png` ファイルに書き込まれ、報告されるパスも `"format": "jpeg"` と矛盾する状態になっていました。

このリリースで、保存ファイルの拡張子が `output_format` から動的に決定されるようになりました。

**修正前後の挙動:**

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| デフォルト実行（`output_format="jpeg"`）の保存ファイル | `output/a_cute_robot.png` | `output/a_cute_robot.jpeg` |
| `ToolResult` の `format` | `jpeg` | `jpeg`（変更なし） |
| ディスク上の拡張子と報告された format | 不一致（`.png` vs `jpeg`） | 一致 |
| `output_format="png"` で実行 | `.png` | `.png`（変更なし） |

**使用例:**

```python
from strands import Agent
from strands_tools import generate_image

agent = Agent(tools=[generate_image])

# デフォルト（output_format="jpeg"）で実行すると、修正後は .jpeg ファイルとして保存される
agent("Generate an image of a cute robot")

# 明示的に PNG を指定する場合は従来通り .png として保存される
agent("Generate an image of a cute robot in PNG format")
```

**ポイント:**

- 公開 API、パラメータ、デフォルト値、リクエストボディに変更はなく、保存ファイルの拡張子のみが正しく揃うようになりました
- 重複ファイル名のインクリメントロジックも保持されており、`.jpeg` が連番で作られる挙動も維持されます
- `ToolResult` の `format` と実ファイルの拡張子が一致するため、後続処理でファイル種別を判定するコードが期待通りに動作するようになります

---

### http_request: proxies パラメータを LLM 制御可能な入力スキーマから除外 ([#513](https://github.com/strands-agents/tools/pull/513))

`http_request` ツールの `proxies` パラメータは、これまで LLM が制御できる入力スキーマに含まれていました。間接的なプロンプトインジェクションを受けた LLM が、認証情報を含むリクエストを攻撃者が管理するプロキシサーバーに迂回させ、`HTTP_REQUEST_TOKEN_CONFIG` のホスト名アローリストをバイパスできてしまうリスクが指摘されていました。

プロキシ設定はオペレーター・デプロイメント側で決めるべき関心事であり、モデルが選ぶべきものではないため、このリリースで `proxies` がツール入力スキーマから削除されました。プロキシは引き続き利用可能ですが、オペレーター側でのみ設定するかたちになります。

**使用例:**

```python
from strands import Agent
from strands_tools import http_request

# LLM が proxies を渡すルートはなくなりました
# プロキシを使う場合は、オペレーター側で環境変数などを通じて設定します
agent = Agent(tools=[http_request])

agent("Fetch https://api.example.com/data")
```

**ポイント:**

- 間接的なプロンプトインジェクションを受けた LLM が、認証情報を含むリクエストを任意のプロキシ経由でルーティングするのを防ぎます
- プロキシ設定は引き続き利用可能ですが、エージェントを実行する側のオペレーターが管理する経路でのみ設定するモデルに変わりました
- `HTTP_REQUEST_TOKEN_CONFIG` のホスト名アローリストが、プロキシ経由のバイパスから守られるようになりました

## まとめ

`generate_image` の地味ながら混乱を招きやすい拡張子の不一致が解消され、`http_request` ではプロンプトインジェクション経由の認証情報漏洩リスクを断つセキュリティ強化が入りました。新機能はないものの、運用上の信頼性とセキュリティを底上げするリリースです。
