---
title: "Strands Tools v0.8.9 リリース解説"
version: "v0.8.9"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-09-15
summary: "`tavily` / `exa` / `search_video` / `chat_video` / `journal` / `bright_data` / `http_request` の 7 ツールを deprecated 化し、それぞれ公式ベンダー MCP サーバーや代替ツールへの移行を促すリリースです。加えて deprecated ツールの移行先が `shell` を指すよう修正し、`mcp_client` を MCP 2.x クライアント API に追従させました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.9"
---

## 概要

このリリースは、複数の 1st party ツールを deprecated 化して外部の公式 MCP サーバーや代替ツールへ誘導することを主眼にしたものです。`tavily` / `exa` / `search_video` / `chat_video` / `journal` / `bright_data` / `http_request` の 7 ツールが対象で、v0.8.9 では警告ログ、次の v0.9.0 でエラーログへと段階的に強化される予定です。加えて、以前 deprecated 化された `calculator` / `cron` / `environment` の移行先が SDK 側の deprecated な `bash` エイリアスを指してしまっていた問題の修正、および `mcp_client` を MCP 2.x クライアント API に追従させる修正が含まれます。

**リリース:** [v0.8.9](https://github.com/strands-agents/tools/releases/tag/v0.8.9)

## 新機能

### `tavily` / `exa` / `search_video` / `chat_video` / `journal` の deprecated 化 ([#604](https://github.com/strands-agents/tools/pull/604))

**この機能でできること:**

- Web 検索（Tavily / Exa）と動画検索（TwelveLabs）、そして journaling 用の `journal` ツールについて、いずれも 1st party 実装から公式ベンダー MCP サーバーや vended tool への移行を促す deprecation warning が入りました。v0.8.9 では静的解析（`@deprecated`）とランタイムログの両方に警告が出ます

| ツール | 移行先 | 種別 |
| --- | --- | --- |
| `tavily`（`tavily_search`, `tavily_extract`, `tavily_crawl`, `tavily_map`） | [Tavily 公式 MCP サーバー](https://docs.tavily.com/documentation/mcp) | MCP |
| `exa`（`exa_search`, `exa_get_contents`） | [Exa 公式 MCP サーバー](https://exa.ai/docs/reference/exa-mcp) | MCP |
| `search_video` | [TwelveLabs 公式 MCP サーバー](https://docs.twelvelabs.io/docs/advanced/model-context-protocol) | MCP |
| `chat_video` | [TwelveLabs 公式 MCP サーバー](https://docs.twelvelabs.io/docs/advanced/model-context-protocol) | MCP |
| `journal` | vended `notebook` | SDK Tool |

**使用例:**

```python
# 移行前: 1st party の tavily ツールを Agent に登録
from strands import Agent
from strands_tools import tavily  # v0.8.9 では import 時点で DeprecationWarning が出る

agent = Agent(tools=[tavily.tavily_search])

# 移行後: 公式 Tavily MCP サーバーを MCPClient 経由で接続する
from mcp import StdioServerParameters
from strands import Agent
from strands.tools.mcp import MCPClient

tavily_mcp = MCPClient(
    lambda: StdioServerParameters(
        command="npx",
        args=["-y", "@mcp/tavily"],  # 実際のコマンドはベンダーのドキュメント参照
        env={"TAVILY_API_KEY": "..."},
    )
)

with tavily_mcp:
    agent = Agent(tools=tavily_mcp.list_tools_sync())
    agent("Strands Agents について最近の話題を検索して")
```

**ポイント:**

- 移行は「必ずしも 1 対 1 ではない」点に注意が必要です。公式 MCP サーバーはベンダー側で curate されたツール群を公開しており、旧ラッパーが受け付けていた全パラメータのパススルーにはなっていません。README には移行時に「取得できなくなるオプション」が明記されています
- v0.8.9 では警告ログ、v0.9.0 ではエラーログに昇格する段階的 deprecation です。今のうちに MCP サーバーや vended tool への切り替えを進めるのが安全です
- `journal` に関しては MCP ではなく SDK 側 vended の `notebook` ツールが代替になります

---

### `bright_data` の deprecated 化 ([#603](https://github.com/strands-agents/tools/pull/603))

**この機能でできること:**

- Bright Data の 1st party ツール（`bright_data`）を deprecated 化し、Bright Data 公式 MCP サーバーへの移行を促します。IDE / type checker からは `@deprecated` として認識され、ランタイムでも import 時に警告ログが出ます

**使用例:**

```python
# 移行前
from strands import Agent
from strands_tools import bright_data  # DeprecationWarning が出る

agent = Agent(tools=[bright_data])

# 移行後: Bright Data 公式 MCP サーバーを利用
from mcp import StdioServerParameters
from strands import Agent
from strands.tools.mcp import MCPClient

brightdata_mcp = MCPClient(
    lambda: StdioServerParameters(
        command="npx",
        args=["-y", "@brightdata/mcp"],  # 実際のコマンドはベンダーのドキュメント参照
        env={"BRIGHTDATA_API_KEY": "..."},
    )
)

with brightdata_mcp:
    agent = Agent(tools=brightdata_mcp.list_tools_sync())
```

**ポイント:**

- 他の deprecated ツールと同様、v0.8.9 では警告、v0.9.0 では error log に昇格する予定です
- 公式 MCP サーバーが提供するのは curate されたツール群のため、旧ツールで使えていたオプションがそのまま残っているとは限りません。移行時は README の migration 節を確認してください

---

### `http_request` の deprecated 化 ([#602](https://github.com/strands-agents/tools/pull/602))

**この機能でできること:**

- 1st party の `http_request` ツールを deprecated 化しました。IDE / type checker からは `@deprecated` として扱われ、ランタイムでも import 時に警告ログが出ます。移行先ガイダンスと契約テスト（deprecation contract coverage）も同時に追加されています

**使用例:**

```python
# 移行前
from strands import Agent
from strands_tools import http_request  # DeprecationWarning が出る

agent = Agent(tools=[http_request])

# 移行後: SDK vended の shell / notebook や、専用の MCP サーバー経由で HTTP アクセスを行う
# 具体的な代替はユースケース次第（一般的な HTTP なら shell + curl、
# 特定 API なら該当ベンダーの MCP サーバー）。README の migration 節に案内があります
```

**ポイント:**

- `http_request` は「汎用の HTTP クライアント」だったため、代替はユースケース次第です。README では、汎用用途については `strands.vended_tools.shell` などを介したアプローチが案内されています
- なお v0.8.8 で `http_request` に対して行われた「クロスホストリダイレクト時のカスタム認証ヘッダー除去」修正はそのまま残っており、deprecated 期間中も security-hardening 済みの状態で利用できます

---

## バグ修正

### deprecated ツールの移行先ガイダンスを `shell` に修正 ([#600](https://github.com/strands-agents/tools/pull/600))

**修正内容:**

`calculator` / `cron` / `environment` / `shell` ツールに設定されていた移行先ガイダンス（`@deprecated` のメッセージ、ランタイム警告、README のサンプル）が、SDK 側の deprecated な `bash` エイリアスを指してしまっていました。これに従って書き換えると新たな `DeprecationWarning` が発生するため、事実上「案内どおりに直しても deprecated から抜けられない」状態になっていました。

- **修正前**: `calculator` などの移行案内に従って `bash` を import すると、再び SDK 側の `bash` deprecated 警告が発生していた
- **修正後**: 移行先を `strands.vended_tools.shell` に統一。`@deprecated` メッセージ、ランタイム警告、README のサンプルすべてが更新されている

**修正後の使い方（推奨）:**

```python
# 例: 旧 calculator の代わりに vended shell を利用する場合
from strands import Agent
from strands.vended_tools import shell

agent = Agent(tools=[shell])
agent("2 + 2 を計算して")
```

**ポイント:**

- 併せて、`test_deprecations.py` の「migration-import check」が強化され、「代替として案内している import が `DeprecationWarning` を出したら不合格」と判定されるようになりました。今後の deprecation でも、案内先が別の deprecated API を指していると CI が落ちます
- 該当モジュールは警告フィルターの外側で import されるため、依存パッケージ側の無関係な import warning が誤検知されない設計になっています

---

### `mcp_client` を MCP 2.x クライアント API に追従 ([#601](https://github.com/strands-agents/tools/pull/601))

**修正内容:**

`strands-agents` が MCP 2.x に更新されたことで、`mcp_client` ツールが参照していた MCP 1.x の API シンボルが解決できなくなり、CI が失敗していました。具体的には次の 2 点が rename されています。

- `streamablehttp_client` → `streamable_http_client`
- `mcp.server.FastMCP` → `mcp.server.mcpserver.MCPServer`

`src/strands_tools/mcp_client.py`、`tests/test_mcp_client.py`、および結合テスト用の `tests_integ/mcp_client/mock_mcp_server.py` を新しいシンボル名に追従させることで、MCP 2.x 環境でも `mcp_client` が正常に動作するようになっています。利用者側のコード変更は不要ですが、`strands-agents` 側の MCP 2.x 系統を利用している場合はこの修正を含む v0.8.9 以上が必須になります。

**ポイント:**

- 影響を受けるのはあくまで `mcp_client` ツール本体で、`MCPClient` を直接使うユーザーコード側の書き換えは不要です
- MCP 2.x 環境で `mcp_client` を利用している / CI で MCP 関連のテストが落ちていた場合は v0.8.9 へ更新することで解消します

## まとめ

v0.8.9 は「1st party ツールから公式ベンダー MCP サーバー / vended tool への段階的な移行」を明確に打ち出したリリースです。`tavily` / `exa` / `search_video` / `chat_video` / `journal` / `bright_data` / `http_request` を利用しているユーザーは、v0.9.0 で error log に昇格する前に MCP サーバーや `strands.vended_tools` への移行計画を進めておくのが安全です。加えて deprecated ツールの案内先が実際に非 deprecated な `shell` を指すようになったこと、`mcp_client` が MCP 2.x で動くようになったことで、既存の deprecation フローとテスト基盤もクリーンな状態に整えられています。
