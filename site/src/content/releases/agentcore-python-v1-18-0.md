---
title: "AgentCore Python SDK v1.18.0 リリース解説"
version: "v1.18.0"
repository: "agentcore-python"
repositoryDisplayName: "AgentCore Python SDK"
releaseType: "stable"
date: 2026-07-10
summary: "AgentCore Payments モジュールに LangGraph 統合ミドルウェアが追加され、LangGraph エージェントで x402 決済を自動処理できるようになりました。また、AgentCore Memory イベントのタイムスタンプ順序に関するバグ修正が含まれます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.18.0"
---

## 概要

このリリースでは、AgentCore Payments モジュールに LangGraph 統合ミドルウェアが追加されました。これにより、LangGraph エージェントが x402 Payment Required プロトコルを自動的に処理し、有料 API へのアクセスをシームレスに行えるようになります。また、AgentCore Memory の Strands セッションマネージャーで発生していたイベントのタイムスタンプ順序の問題も修正されています。

**リリース:** [v1.18.0](https://github.com/aws/bedrock-agentcore-sdk-python/releases/tag/v1.18.0)

## 新機能

### LangGraph 統合ミドルウェア（AgentCore Payments） ([#546](https://github.com/aws/bedrock-agentcore-sdk-python/pull/546))

**この機能でできること:**
- LangGraph エージェントが x402 Payment Required レスポンス（HTTP 402）を自動的に検出・処理
- ツールが 402 を返すと、ミドルウェアが `PaymentManager` 経由で決済に署名し、支払い証明を付与して自動リトライ（LLM からは透過的）
- ツールを手動でラップする必要がなく、`create_agent` に `middleware=[payments]` を渡すだけで統合可能

**使用例:**

```python
from langchain.agents import create_agent
from bedrock_agentcore.payments.integrations.langgraph import (
    AgentCorePaymentsConfig,
    AgentCorePaymentsMiddleware,
)

# 1. Payments 設定
config = AgentCorePaymentsConfig(
    payment_manager_arn="arn:aws:bedrock-agentcore:us-east-1:123456789012:payment-manager/pm-123",
    user_id="user-123",
    payment_instrument_id="instrument-456",
    region="us-east-1",
    auto_session=True,  # 初回決済時にセッションを自動作成
)

# 2. ミドルウェアの初期化
payments = AgentCorePaymentsMiddleware(config)

# 3. エージェントに組み込むだけ
agent = create_agent(
    model="claude-sonnet-4-20250514",
    tools=[],  # ミドルウェアが http_request と決済問い合わせツールを自動登録
    middleware=[payments],
)

# 402 レスポンスは自動的に処理される
result = agent.invoke({
    "messages": [
        {"role": "user", "content": "https://paid-api.example.com/data からデータを取得して"}
    ]
})
```

**組み込みツール:**

| ツール | 説明 |
|-------|-----|
| `http_request` | 任意の HTTP エンドポイントを呼び出し、402 レスポンスを自動決済 |
| `get_payment_instrument` | 決済インストルメントの詳細を問い合わせ |
| `list_payment_instruments` | ユーザーのインストルメント一覧を取得 |
| `get_payment_instrument_balance` | チェーン上のウォレット残高を確認 |
| `get_payment_session` | セッション予算・状態・有効期限を問い合わせ |

**402 検出の優先順位:**
1. **カスタムハンドラー**（ツール名で登録されている場合）— 検出ロジックを完全制御
2. **`PAYMENT_REQUIRED:` マーカー** — 明示的なオプトインシグナル
3. **緩やかなフォールバック** — 生 JSON から `statusCode: 402` または `x402Version` + `accepts` フィールドを解析

これにより、MCP ツールや生 JSON を返す既存ツールも、マーカーやカスタムハンドラーなしで自動的に扱われます。

**エラーハンドリングコールバック:**

決済処理に失敗した場合、`on_payment_error` コールバックで LLM に見せずにプログラム的に解決できます。

```python
from bedrock_agentcore.payments.integrations.langgraph import (
    AgentCorePaymentsConfig,
    AgentCorePaymentsMiddleware,
    PaymentErrorContext,
    ErrorResolution,
)

def handle_payment_error(ctx: PaymentErrorContext) -> ErrorResolution | str:
    # セッション切れ・不足時は新規セッションを作成してリトライ
    if ctx.exception_type in ("PaymentSessionNotFound", "PaymentSessionExpired"):
        session = pm.create_payment_session(
            user_id=ctx.config.user_id,
            limits={"maxSpendAmount": {"value": "5.00", "currency": "USD"}},
            expiry_time_in_minutes=60,
        )
        ctx.config.payment_session_id = session["paymentSessionId"]
        return ErrorResolution.RETRY

    if ctx.exception_type == "InsufficientBudget":
        session = pm.create_payment_session(
            user_id=ctx.config.user_id,
            limits={"maxSpendAmount": {"value": "10.00", "currency": "USD"}},
            expiry_time_in_minutes=60,
        )
        ctx.config.payment_session_id = session["paymentSessionId"]
        return ErrorResolution.RETRY

    if ctx.exception_type == "PaymentInstrumentConfigurationRequired":
        # LLM に返すカスタムメッセージ
        return "ウォレットが未設定です。https://myapp.com/wallet/setup でセットアップしてください。"

    # 処理できないものはデフォルトのエラーメッセージにフォールバック
    return ErrorResolution.PROPAGATE

config = AgentCorePaymentsConfig(
    payment_manager_arn="arn:...",
    user_id="user-1",
    payment_instrument_id="instr-1",
    region="us-east-1",
    on_payment_error=handle_payment_error,
)
```

**カスタムツールとの統合契約:**

自作のツールで自動決済を利用するには、以下の 2 点を満たす必要があります。

1. **402 シグナルの出力**: `PAYMENT_REQUIRED: {json}` マーカー、`statusCode: 402` を含む生 JSON、またはカスタムハンドラーのいずれかで 402 を通知
2. **`headers` パラメータの受け入れと転送**: ミドルウェアは `tool_args["headers"]` に決済ヘッダーを注入するため、ツールは `headers` を受け取り HTTP リクエストに転送する必要がある

```python
from langchain_core.tools import tool
import httpx, json

@tool
def my_paid_tool(query: str, headers: dict = None) -> str:
    """有料 API にアクセスするツール（決済は自動処理）"""
    resp = httpx.get("https://paid-api.example.com/data", headers=headers or {})
    if resp.status_code == 402:
        payload = {
            "statusCode": 402,
            "headers": dict(resp.headers),
            "body": resp.json(),
        }
        return f"PAYMENT_REQUIRED: {json.dumps(payload)}"
    return json.dumps(resp.json())
```

**ポイント:**
- 同期・非同期の両方に対応（非同期パスでは `asyncio.sleep` と `asyncio.to_thread` を使用し非ブロッキング）
- `provide_http_request=False` を指定すれば独自の HTTP ツールに置き換え可能
- `auto_session=True` により初回決済時にセッションを遅延作成できる
- 決済失敗時はデフォルトで LLM に決定論的なエラーメッセージが返されるため、エージェントの挙動が予測しやすい

---

## バグ修正

### LangGraph 決済ミドルウェアのレビュー指摘対応 ([#570](https://github.com/aws/bedrock-agentcore-sdk-python/pull/570))

[#546](https://github.com/aws/bedrock-agentcore-sdk-python/pull/546) のマージ後レビューで指摘された `middleware.py` の正確性に関する 4 件の修正です。

**修正内容:**

1. **同期パスでの非同期 `on_payment_error` コールバックを明示的に失敗させる**
   - 従来は非同期コールバックを同期 `.invoke()` で使うと `TypeError` が `try` 内で発生し、`except Exception` で握りつぶされて `PROPAGATE` としてログに残るだけだった
   - 修正後は `try` の外でチェックを行い、開発者の設定ミスを明示的に伝播させる

2. **非同期呼び出し可能オブジェクト（`async def __call__`）の検出**
   - `inspect.iscoroutinefunction` は `__call__` が非同期のクラスインスタンスに対して `False` を返すため、同期パスで未 await のコルーチンをリークしていた
   - バインドされた `__call__` を検査するように修正

3. **決済後のリトライ拒否でカスタムハンドラーを尊重**
   - `_check_retry_rejection` が `GenericPaymentHandler` と JSON フォールバックにハードコードされており、カスタムハンドラー登録済みツールが決済後に独自形式の 402 を返した場合、通常結果として LLM に渡ってしまっていた
   - `_detect_402` と同様にカスタムハンドラーを経由するよう修正

4. **ツール呼び出しで `args` が省略された場合の決済ヘッダー注入を維持**
   - `_detect_402` が `request.tool_call.get("args", {})` を使っていたため、`args` キーがない場合は使い捨ての辞書に注入され、リトライされたハンドラーには届いていなかった
   - `setdefault("args", {})` に変更し、ヘッダーが確実にリトライ呼び出しに届くようにした

### AgentCore Memory イベントのミリ秒解像度での順序化 ([#572](https://github.com/aws/bedrock-agentcore-sdk-python/pull/572))

**問題:**
- 単調増加タイムスタンプカウンターが衝突時に **1 秒** ずつ加算されており、1 ターンで複数イベントを書き込むと 1s、2s、3s…と実時間より数秒先の未来にタイムスタンプが刻まれていた
- `_last_timestamp` とロックがクラス属性だったため、同一プロセス内の異なるセッションのマネージャーが互いの順序を撹乱していた
- 結果として、複数プロセス（Pod など）から同一セッションに書き込むと、あるターンが数秒先にずれ、後続ターンが実時間で先に並んでしまい、`toolResult` が `toolUse` の前に来て Converse API が拒否するケースがあった

**修正内容:**
- 衝突時の刻みを **1 秒から 1 ミリ秒に変更**（AgentCore Memory が実際に `eventTimestamp` を保存・順序化する解像度に合わせる）
- タイムスタンプ状態を**インスタンススコープ**（マネージャーごとのロックと `_last_timestamp`）に変更し、異なるセッションのマネージャーが互いに影響しないようにした

これにより、単一プロセス内での順序は正しく保たれ、複数プロセス間で発生していた数秒単位の未来ドリフトが解消されました。

### AgentCore Memory イベントタイムスタンプのミリ秒への丸め ([#573](https://github.com/aws/bedrock-agentcore-sdk-python/pull/573))

**問題:**
- [#572](https://github.com/aws/bedrock-agentcore-sdk-python/pull/572) のフォローアップ
- `_get_monotonic_timestamp` が **マイクロ秒精度** で比較・保存していたが、AgentCore Memory は **ミリ秒** までしか保持しない
- 同一ミリ秒内でマイクロ秒が異なる 2 イベントが同点判定を通過してしまい、サービス側で両方が同一ミリ秒に丸められた際に順序が曖昧になっていた

**修正内容:**
- 比較前に `desired_timestamp` をミリ秒に切り捨てるように修正
- 同一ミリ秒内のイベントは正しく同点として検出され、+1ms ずらして分離されるようになった

## まとめ

このリリースでは、AgentCore Payments モジュールに待望の LangGraph 統合ミドルウェアが追加され、LangGraph エージェントでも Strands 同様に x402 決済を透過的に扱えるようになりました。また、AgentCore Memory のイベント順序に関する複数の根本的な問題も解消され、より安定したマルチターン・マルチプロセス運用が可能になっています。
