---
title: "Strands TypeScript SDK v1.3.0 リリース解説"
version: "v1.3.0"
repository: "sdk-typescript"
repositoryDisplayName: "Strands TypeScript SDK"
releaseType: "stable"
date: 2026-05-21
summary: "認可・ガードレール・ステアリング・運用制御を統合する Intervention プリミティブの導入、context-offloader プラグインへの検索ツール追加、Amazon Bedrock Mantle (OpenAI 互換エンドポイント) のサポート、Confirm アクションによる Human-in-the-Loop 機能、ツール実行宣言タイミングのバグ修正を含むリリースです。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v1.3.0"
---

## 概要

このリリースでは、エージェントの実行を制御するための新しい Intervention プリミティブが追加され、認可（Cedar、OPA）、ガードレール（Datadog AI Guard、コンテンツフィルタリング）、ステアリング、運用制御を共通のインターフェースで実装できるようになりました。また、context-offloader プラグインに検索機能が追加され、Amazon Bedrock の OpenAI 互換エンドポイント（Mantle）への接続もファーストクラスでサポートされます。さらに Human-in-the-Loop 用の `confirm` アクションや、ツール実行表示のバグ修正も含まれています。

**リリース:** [v1.3.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v1.3.0)

## 新機能

### Intervention プリミティブの追加 ([#883](https://github.com/strands-agents/sdk-typescript/pull/883))

**この機能でできること:**
- エージェントの実行ライフサイクルに介入するための合成可能な制御レイヤーが追加されました
- 認可（Cedar、OPA）、ガードレール（Datadog AI Guard、コンテンツフィルタリング）、ステアリング（LLM ベースのガイダンス）、運用制御（Galileo Agent Control）を共通のインターフェースで実装でき、順序評価・ショートサーキット・型付きアクションをサポートします

**使用例:**

```typescript
import {
  Agent,
  InterventionHandler,
  BeforeToolCallEvent,
  AfterModelCallEvent,
  deny,
  proceed,
  guide,
} from '@strands-agents/sdk'

// 認可ハンドラー (Cedar 認可エンジン例)
class CedarAuth extends InterventionHandler {
  readonly name = 'cedar-auth'

  override beforeToolCall(event: BeforeToolCallEvent) {
    const userId = event.agent.appState.get('user_id')
    if (!this.isAuthorized(userId, event.toolUse.name)) {
      // deny: 操作をブロックし、event.cancel をセット
      return deny(`User ${userId} not authorized for ${event.toolUse.name}`)
    }
    return proceed()
  }
}

// ステアリングハンドラー (出力トーンを誘導)
class ToneSteeringHandler extends InterventionHandler {
  readonly name = 'tone-steering'

  override afterModelCall(event: AfterModelCallEvent) {
    const text = event.stopData?.message.content
      .filter((b) => b.type === 'textBlock')
      .map((b) => b.text)
      .join('')
    if (text && this.isTooAgressive(text)) {
      // guide: フィードバックを注入してリトライ
      return guide('Use a more professional tone.')
    }
    return proceed()
  }
}

const agent = new Agent({
  tools: [queryDatabase, sendEmail],
  // 配列順に評価。前段が deny を返した場合は後続のハンドラーは実行されない
  interventions: [new CedarAuth(), new ToneSteeringHandler()],
})

const result = await agent.invoke('Send an email to the client')
```

**ポイント:**
- `InterventionHandler` を継承し、`beforeInvocation` / `beforeToolCall` / `afterToolCall` / `beforeModelCall` / `afterModelCall` のうち必要なライフサイクルメソッドのみオーバーライド
- アクションファクトリは `proceed(reason?)` / `deny(reason)` / `guide(feedback, reason?)` / `interrupt(prompt, reason?)` / `transform(apply, reason?)` の 5 種類
- `onError` ポリシー（デフォルト `'throw'`）で `'proceed'`（スキップ）または `'deny'`（fail-closed）に変更可能
- Before 系イベントでは `SDK_LAST` 順で実行されるため、操作直前の最終ゲートとして動作。After 系では `SDK_FIRST` 順で操作直後に実行
- `initAgent(agent)` でエージェント初期化時にコンテキスト収集用フックを登録可能

---

### context-offloader プラグインへの検索ツール追加 ([#1060](https://github.com/strands-agents/sdk-typescript/pull/1060))

**この機能でできること:**
- 既存の `retrieve_offloaded_content` ツールに、パターンマッチング・行範囲指定・先頭プレビューといった検索機能が追加されました
- これまではオフロードされたデータ全体を取得することでトークンコストが再注入されていましたが、必要な部分だけ取得できるようになりました

**使用例:**

```typescript
import { Agent, contextOffloaderPlugin } from '@strands-agents/sdk'

const agent = new Agent({
  plugins: [contextOffloaderPlugin({ /* ... */ })],
  tools: [/* ... */],
})

// retrieve_offloaded_content ツールが受け付ける引数の例:
//
// 1. パターン検索 (前後 5 行のコンテキスト付きで一致行を取得)
// { reference: "mem_1_tool-123_0", pattern: "error" }
//
// 2. パターン検索 (コンテキスト行数を指定)
// { reference: "mem_1_tool-123_0", pattern: "error", context_lines: 2 }
//
// 3. 行範囲アクセス (1-indexed, inclusive)
// { reference: "mem_1_tool-123_0", line_range: { start: 10, end: 25 } }
//
// 4. 範囲内検索 (line_range と pattern の併用)
// { reference: "mem_1_tool-123_0", pattern: "x", line_range: { start: 10, end: 100 }, context_lines: 3 }
//
// 5. 先頭プレビュー (context_lines のみ指定で先頭 N 行を取得)
// { reference: "mem_1_tool-123_0", context_lines: 10 }
//
// 6. 全件取得 (オプション省略時。最終手段としてのみ推奨)
// { reference: "mem_1_tool-123_0" }
```

**ポイント:**
- 検索結果は `maxResultTokens * CHARS_PER_TOKEN` 文字で常にキャップされ、超過時は `[output truncated, narrow your search]` で示される
- 検索結果には行番号が含まれ、フォローアップの `line_range` 呼び出しで詳細を掘り下げることが可能
- すべてのストレージバックエンド（`InMemoryStorage`、`FileStorage`、`S3Storage`）で利用可能（`Storage` インターフェース上で動作）
- バイナリコンテンツへの検索は明示的にエラーを返し、フル取得への誘導メッセージが出る
- `includeRetrievalTool`（デフォルト `true`）でツール登録の制御は従来通り。新しい設定オプションは追加されていない

---

### Amazon Bedrock Mantle サポート ([#1066](https://github.com/strands-agents/sdk-typescript/pull/1066))

**この機能でできること:**
- Amazon Bedrock の OpenAI 互換エンドポイント（Mantle、`https://bedrock-mantle.<region>.api.aws/v1`）に `OpenAIModel` から直接接続できる `bedrockMantleConfig` オプションが追加されました
- これまでは SigV4 でベアラートークンを発行し、カスタム `fetch`/`httpx` パイプラインを構築する必要がありましたが、その配線が不要になります
- Chat Completions API および Responses API（ステートフル会話、reasoning コントロール）が Bedrock の課金・ネットワーク・監査基盤の上で利用可能になります

**使用例:**

```typescript
import { OpenAIModel } from '@strands-agents/sdk/models/openai'

// Chat Completions を Mantle 経由で利用
const chatModel = new OpenAIModel({
  api: 'chat',
  modelId: 'openai.gpt-oss-120b',
  bedrockMantleConfig: {
    // region: 明示指定 → AWS_REGION → AWS_DEFAULT_REGION の順で解決
    region: 'us-east-1',
    // credentials: 省略時は標準の AWS 認証情報チェーンを使用
  },
})

// Responses API でステートフル会話と reasoning effort を併用
const responsesModel = new OpenAIModel({
  modelId: 'openai.gpt-oss-120b',
  stateful: true,
  params: { reasoning: { effort: 'medium' } },
  bedrockMantleConfig: { region: 'us-east-1' },
})
```

**ポイント:**
- 新しい peer dependency として `@aws/bedrock-token-generator` が必要
- ベアラートークンはリクエストごとに OpenAI Node SDK の `apiKey` 非同期セッターを通じて発行されるため、クライアントの再構築は不要
- `bedrockMantleConfig` は `client`（事前構築済みクライアント）やトップレベル `apiKey` と併用不可
- `clientConfig` で `baseURL` や `apiKey` を指定することも不可（Mantle 設定から自動導出される）
- 認証情報チェーンの結果は `credentials` フィールドで明示的に上書き可能

---

### Confirm アクション (Human-in-the-Loop の組み込み承認/拒否) ([#1072](https://github.com/strands-agents/sdk-typescript/pull/1072))

**この機能でできること:**
- Intervention システムに `confirm` アクションが追加され、ツール実行前に人間の承認を要求できるようになりました
- ステートレスモード（外部から再開）とインラインモード（ハンドラー内で応答収集）の 2 つの利用パターンに対応します

**使用例:**

```typescript
import {
  Agent,
  InterventionHandler,
  BeforeToolCallEvent,
  InterventionAction,
  InterruptResponseContent,
} from '@strands-agents/sdk'
import { confirm, proceed } from '@strands-agents/sdk/interventions/actions'

// ステートレスモード: invoke を抜けて外部から再開
class ApproveDeletes extends InterventionHandler {
  readonly name = 'approve-deletes'

  override beforeToolCall(event: BeforeToolCallEvent): InterventionAction {
    if (event.toolUse.name === 'deleteFile') {
      // confirm: response 未指定 → エージェントループから抜けて中断
      return confirm(`Tool "deleteFile" wants to delete: ${JSON.stringify(event.toolUse.input)}`)
    }
    return proceed()
  }
}

const agent = new Agent({
  tools: [deleteTool],
  interventions: [new ApproveDeletes()],
})

const result = await agent.invoke('Delete important.txt')
// result.stopReason === 'interrupt'

// 承認して再開 (デフォルト evaluate は true / 'y' / 'yes' を受理)
const final = await agent.invoke([
  new InterruptResponseContent({
    interruptId: result.interrupts[0].id,
    response: 'yes',
  }),
])

// インラインモード: ハンドラー内で応答を収集 (例: readline)
import * as readline from 'readline/promises'
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

class CliApproval extends InterventionHandler {
  readonly name = 'cli-approval'

  override async beforeToolCall(event: BeforeToolCallEvent): Promise<InterventionAction> {
    if (event.toolUse.name === 'deleteFile') {
      const prompt = `Tool "${event.toolUse.name}" wants to delete: ${JSON.stringify(event.toolUse.input)}`
      const response = await rl.question(`${prompt} (y/n): `)
      // response を渡すと、エージェントは中断せず evaluate の結果に基づいて続行/拒否
      return confirm(prompt, { response })
    }
    return proceed()
  }
}

// カスタム evaluate (OTP 確認の例)
class OtpGate extends InterventionHandler {
  readonly name = 'otp-gate'

  override async beforeToolCall(event: BeforeToolCallEvent): Promise<InterventionAction> {
    if (event.toolUse.name === 'transferFunds') {
      const expectedOtp = generateOtp()
      sendOtpToUser(expectedOtp)
      const response = await rl.question('Enter the OTP sent to your phone: ')
      return confirm('OTP verification', {
        response,
        evaluate: (r) => r === expectedOtp,
      })
    }
    return proceed()
  }
}
```

**ポイント:**
- デフォルトの `evaluate` 関数は `true`、`'y'`、`'yes'`（大文字小文字を問わず、空白トリム済み）を承認とみなす。それ以外は拒否
- 承認時はツールが通常通り実行される。拒否時は `event.cancel = "CONFIRMATION_FAILED: <prompt>"` がセットされ、`deny` の `DENIED: <reason>` と区別可能
- 関連する命名変更: `Interrupt` → `Confirm`、`isApproved` → `evaluate`
- `InterruptError` は `onError` ポリシーに関わらず常に伝播する（ハンドラーエラーではなく制御フローのため）
- すべてのアクションファクトリ（`proceed` / `guide` / `confirm` / `transform`）でオプション引数がオブジェクト形式に統一

---

## バグ修正

### printer のツール宣言を hooks 解決後まで遅延 ([#1076](https://github.com/strands-agents/sdk-typescript/pull/1076))
- printer がモデルストリーミング中の `contentBlockStart` で `🔧 Tool #N: toolName` を表示していたため、`BeforeToolCallEvent` フックが実行をキャンセル/ゲートする前にツールが実行中であるかのように見えていた問題を修正
- 2 段階表示に変更:
  1. ストリーミング段階: 控えめな `⏳ toolName` プレビューを即座に表示
  2. 実行段階: `BeforeToolCallEvent` フック解決後に確定的な `🔧 Tool #N: toolName`、または拒否時は `🚫 Tool #N: toolName (denied)` を表示
- `BeforeToolsEvent` で全ツールが一括キャンセルされた場合は `🚫 All tools denied` が表示される
- HITL や権限フックでツールが拒否される際の UX 改善

## まとめ

TypeScript SDK v1.3.0 は、認可・ガードレール・ステアリング・運用制御を統合する Intervention プリミティブを中心に、Human-in-the-Loop の `confirm` アクション、Bedrock Mantle 経由での OpenAI モデル利用、context-offloader の検索ツール追加など、エージェントの制御性と運用性を大きく強化するリリースです。
