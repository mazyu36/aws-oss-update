---
title: "Strands Tools v0.9.0 リリース解説"
version: "v0.9.0"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-11-04
summary: "v0.8 系で段階的に deprecated 化されてきた全ツールが、v0.9.0 で import error に昇格しました。あわせて strands-agents-tools パッケージ自体が deprecated 化され、v0.9.0 以降は更新停止となります。移行先は Harness SDK にビルトインされた vended tools / 公式 MCP Server / 自前実装です。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.9.0"
---

## 概要

v0.9.0 は、v0.8.6 〜 v0.8.12 の段階的な deprecation キャンペーンの最終到達点となるリリースです。これまで `DeprecationWarning` を出していた全 48 ツールのモジュール import そのものが `ImportError` となり、各ツールの移行先（vended tools / 公式 MCP Server / 自前実装）に揃っていないコードは実行不能になります。あわせて `strands-agents-tools` パッケージ自体が deprecated 化され、v0.9.0 以降は更新停止（2026 年 11 月 4 日以降は新規コミット無し）となります。今後は Strands Harness SDK にビルトインされた tools（web アクセス、サブエージェント、shell、files など）を利用する形になります。

**リリース:** [v0.9.0](https://github.com/strands-agents/tools/releases/tag/v0.9.0)

## 破壊的変更

### 全ツールの `DeprecationWarning` を `ImportError` に昇格 ([#639](https://github.com/strands-agents/tools/pull/639))

**この変更の内容:**

- v0.8 系で順次 deprecated 化されてきた全ツールモジュール（計 48 ファイル）が、import 時点で `ImportError` を送出するようになりました
- モジュール内の import 直後に `raise ImportError(..., name=__name__)` が配置されており、tool 実装自体は残っていますが到達不能です
- `agent_graph` だけは `use_llm` を lazy import する調整が入っており、`use_llm` の除去メッセージではなく `agent_graph` 自身の除去メッセージが出るようになっています

**変更前:**

```python
# v0.8.x: DeprecationWarning が出るが import 自体は成功していた
from strands import Agent
from strands_tools import sleep  # DeprecationWarning: sleep is deprecated...

agent = Agent(tools=[sleep])
```

**変更後:**

```python
# v0.9.0: モジュール import 自体が ImportError で失敗する
from strands import Agent
from strands_tools import sleep
# ImportError: sleep was removed in v0.9.0.
#   Migration path: use the sleep tool vended by strands-agents
#   (from strands.vended_tools import sleep).
```

**移行方法:**

- 各ツールごとの移行先は v0.8.6 〜 v0.8.12 の各リリース解説記事（[v0.8.6](https://github.com/strands-agents/tools/releases/tag/v0.8.6) / [v0.8.9](https://github.com/strands-agents/tools/releases/tag/v0.8.9) / [v0.8.10](https://github.com/strands-agents/tools/releases/tag/v0.8.10) / [v0.8.11](https://github.com/strands-agents/tools/releases/tag/v0.8.11) / [v0.8.12](https://github.com/strands-agents/tools/releases/tag/v0.8.12)）および公式 [migration guide](https://strandsagents.com/docs/user-guide/migrate/strands-agents-tools/) にまとまっています
- 典型的な移行は `from strands.vended_tools import ...` への差し替えです

```python
# 典型的な移行例: 旧 strands_tools の多くは vended_tools へ移行
from strands import Agent
from strands.vended_tools import (
    read,       # 旧 file_read
    write,      # 旧 file_write
    edit,       # 旧 editor の str_replace 相当
    shell,
    sleep,
    stop,
    http_request,
    graph,      # 旧 graph / workflow / agent_graph の集約先
    # ...
)

agent = Agent(tools=[read, write, edit, shell, sleep, stop, http_request])
```

**ポイント:**

- **48 モジュール全てが対象**: `a2a_client` / `agent_core_memory` / `agent_graph` / `batch` / `bright_data` / `browser` / `calculator` / `chat_video` / `code_interpreter` / `cron` / `current_time` / `diagram` / `editor` / `elasticsearch_memory` / `environment` / `exa` / `file_read` / `file_write` / `generate_image` / `generate_image_stability` / `graph` / `handoff_to_user` / `http_request` / `image_reader` / `journal` / `load_tool` / `mcp_client` / `mem0_memory` / `memory` / `mongodb_memory` / `nova_reels` / `python_repl` / `retrieve` / `rss` / `search_video` / `shell` / `slack` / `sleep` / `speak` / `stop` / `swarm` / `tavily` / `think` / `use_agent` / `use_aws` / `use_computer` / `use_llm` / `workflow` の全てが対象です
- **`ImportError` のメッセージに移行先が記載**されます。これまでの `_DEPRECATION_MESSAGE` の文言「is deprecated. This warning becomes an import error in v0.9.0.」が「was removed in v0.9.0.」に差し替えられ、各ツールの移行パスがそのまま表示されます
- **代替なしのケース**: `mongodb_memory` のように Strands カタログ・PyPI・Elastic 公式のいずれにも代替 `MemoryStore` が存在しないツールは、`pymongo` などを用いた自前実装への移行が必要です
- **代替が MCP Server のケース**: `use_aws` は [AWS MCP Server](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/mcp-server.html)（`mcp-proxy-for-aws` 経由の managed remote server）に差し替えとなります
- **テストの扱い**: 各ツールの unit test / integration test は `pytest.importorskip(..., exc_type=ImportError)` で丸ごとスキップされるよう更新されており、`test_deprecations.py` は「各モジュールが除去エラーを送出すること」「re-export された名前も同じエラーで失敗すること」「各 migration path の import が成功すること」を検証するテストに差し替えられています（`pytest>=8.2` が必要なため `pyproject.toml` の pin が引き上げられています）

---

## 新機能

### README への deprecation バナー追加 ([#641](https://github.com/strands-agents/tools/pull/641))

**この機能でできること:**

- README の冒頭に `strands-agents-tools` パッケージ全体の deprecation 告知バナーが追加され、[公式 migration guide](https://strandsagents.com/docs/user-guide/migrate/strands-agents-tools/) への導線がトップページから提供されます
- あわせて `DEPRECATION.md` にも移行ガイドへのリンクが追記されています

**ポイント:**

- v0.9.0 以降、`strands-agents-tools` パッケージ自体が更新停止となる旨がリポジトリの入口で明示されます
- 既存のユーザーが PyPI や GitHub のトップに辿り着いた時点で移行先に案内される導線設計です
- 移行済みのビルトインツール（Harness SDK の `strands.vended_tools`）に対する不足機能のフィードバックは、[strands-agents/harness-sdk](https://github.com/strands-agents/harness-sdk/issues) 側の issue に集約される運用になります

## まとめ

v0.9.0 は、Strands Harness SDK へのツール内蔵化という長期ロードマップの最終着地点にあたるリリースです。これまでの v0.8 系で続いてきた `DeprecationWarning` は全て `ImportError` に昇格し、`strands-agents-tools` パッケージ自体も deprecated 化されました。v0.9.0 以降もパッケージはインストール可能ですが新規コミットは行われず、ツールの実運用には Harness SDK 側の vended tools / 公式 MCP Server / 自前 `MemoryStore` 実装への移行が前提になります。v0.8.x に残っているプロジェクトは、本リリースの公開を機に [migration guide](https://strandsagents.com/docs/user-guide/migrate/strands-agents-tools/) に沿った差し替えを完了させておくのがおすすめです。
