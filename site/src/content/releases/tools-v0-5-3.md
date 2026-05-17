---
title: "Strands Tools v0.5.3 リリース解説"
version: "v0.5.3"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-05-14
summary: "use_aws ツールの parameters オプション化、batch ツールのサブツール実行バグ修正、ブラウザツールの context_options サポート修正を含むリリースです。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.5.3"
---

## 概要

このリリースでは、3 つの重要なバグ修正が含まれています。use_aws ツールで parameters パラメータが省略された際の KeyError を修正し、batch ツールでサブツールが正しく実行されない問題を解決し、ブラウザツールで context_options が正しく適用されるようになりました。

**リリース:** [v0.5.3](https://github.com/strands-agents/tools/releases/tag/v0.5.3)

## バグ修正

### use_aws ツールの parameters オプション化による KeyError 修正 ([#449](https://github.com/strands-agents/tools/pull/449))

**修正内容:**

`list_buckets` などのパラメータを必要としない AWS 操作を実行する際、非 Bedrock モデル（OpenAI GPT-4o など）が `parameters` フィールドを省略することがあり、`KeyError` でクラッシュしていました。

**変更点:**
- `tool_input["parameters"]` を `tool_input.get("parameters", {})` に変更
- `TOOL_SPEC` の `required` リストから `parameters` を削除
- パラメータなしでの呼び出しをサポート

**使用例:**

```python
from strands import Agent
from strands_tools import use_aws

agent = Agent(tools=[use_aws])

# パラメータが不要な AWS 操作も正しく動作するようになりました
response = agent("List all S3 buckets in my account")
```

---

### batch ツールのサブツール実行バグ修正 ([#439](https://github.com/strands-agents/tools/pull/439))

**修正内容:**

batch ツールでサブツールが全く実行されない 2 つのバグを修正しました。

**バグ 1: invocations の取得方法**
- 修正前: `kwargs.get("invocations", [])` は常に空のリストを返していた
- 修正後: `tool.get("input", {}).get("invocations", [])` で正しく取得

**バグ 2: 同時実行エラー**
- 修正前: サブツール呼び出し時に `ConcurrencyException` が発生
- 修正後: `record_direct_tool_call=False` を渡してロックと記録をスキップ

**修正後の動作:**

```python
from strands import Agent
from strands_tools import batch, current_time

agent = Agent(tools=[batch, current_time])

# batch ツールが正しくサブツールを実行するようになりました
response = agent("Get current time in UTC and US/Pacific timezones using batch")

# 修正前: batch が空の結果を返し、エージェントが個別にツールを呼び出していた
# 修正後: batch が一度の呼び出しで全てのサブツールを実行
```

---

### ブラウザツールの context_options サポート修正 ([#455](https://github.com/strands-agents/tools/pull/455))

**修正内容:**

`LocalChromiumBrowser` のコンストラクタに渡した `context_options` が `new_context()` 呼び出し時に無視されていた問題を修正しました。

**影響を受けていた設定:**
- `viewport` - ビューポートサイズ
- `user_agent` - ユーザーエージェント
- `storage_state` - 認証状態の再利用
- `locale` - ロケール設定
- `timezone_id` - タイムゾーン
- `geolocation` - 地理位置情報
- `permissions` - 権限設定
- `color_scheme` - カラースキーム

**使用例:**

```python
from strands_tools.browser import LocalChromiumBrowser

# context_options が正しく適用されるようになりました
browser = LocalChromiumBrowser(
    context_options={
        "viewport": {"width": 1920, "height": 1080},
        "user_agent": "Custom User Agent",
        "locale": "ja-JP",
        "timezone_id": "Asia/Tokyo",
        # storage_state を使用して認証状態を再利用
        "storage_state": "auth.json"
    }
)

# 修正前: viewport は Playwright デフォルトの 1280x720 になっていた
# 修正後: 指定した 1920x1080 が正しく適用される
```

**ポイント:**
- `storage_state` は Playwright の標準的な認証再利用メカニズムで、特にこの修正により正しく機能するようになりました
- 既存のサブクラスで `_default_context_options` を設定していない場合は、以前と同じ動作を維持します

## まとめ

use_aws ツール、batch ツール、ブラウザツールの重要なバグが修正され、各ツールの信頼性が向上しました。
