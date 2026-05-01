---
title: "sdk-typescript v0.2.1"
version: "v0.2.1"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2026-02-05
summary: "Google Gemini モデルプロバイダーが追加され、AfterToolCallEvent にリトライ機能が追加されました。また、AfterModelCallEvent.retryModelCall が retry に名称変更される破壊的変更が含まれています。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.2.1"
---

## 概要

このリリースでは、Google Gemini モデルのサポートが追加され、ツール呼び出し後のフックでリトライを要求できるようになりました。また、Python SDK との整合性を保つため、`AfterModelCallEvent.retryModelCall` が `retry` に名称変更される破壊的変更が含まれています。

**リリース:** [v0.2.1](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.2.1)

## 新機能

### Google Gemini モデルプロバイダーの追加 ([#426](https://github.com/strands-agents/sdk-typescript/pull/426))

**この機能でできること:**
- Google Gemini モデルを使用してエージェントを構築できるようになりました
- 既存の Bedrock や OpenAI プロバイダーと同様のパターンで実装されており、テキスト生成のストリーミングをサポートしています

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk';
import { GeminiModel } from '@strands-agents/sdk/models/gemini';

// API キーで初期化（環境変数 GEMINI_API_KEY も使用可能）
const model = new GeminiModel({
  apiKey: 'your-api-key',
});

const agent = new Agent({
  model,
  systemPrompt: 'You are a helpful assistant.',
});

const result = await agent.invoke('Hello, how can you help me today?');
```

**ポイント:**
- 現時点ではテキストコンテンツのストリーミングのみをサポートしています（ツール呼び出しは今後のリリースで追加予定）
- API キーはコンストラクタで直接指定するか、`GEMINI_API_KEY` 環境変数から取得できます
- 事前設定された `@google/genai` クライアントインスタンスを渡すことも可能です

---

### AfterToolCallEvent にリトライプロパティを追加 ([#493](https://github.com/strands-agents/sdk-typescript/pull/493))

**この機能でできること:**
- ツール実行後のフックからリトライを要求できるようになりました
- 一時的な障害やレート制限への対応、カスタムリトライポリシーの実装が可能です
- エラーが発生していない場合でも、結果に基づいてリトライを要求できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk';

const agent = new Agent({
  model: new BedrockModel(),
  systemPrompt: 'You are a helpful assistant.',
});

// ツール呼び出し後にリトライを制御
agent.hooks.addCallback('afterToolCallEvent', (event) => {
  // エラー発生時にリトライを要求
  if (event.error && isTransientError(event.error)) {
    event.retry = true; // ツールが再実行されます
  }
});

// 結果に基づいてリトライを要求することも可能
agent.hooks.addCallback('afterToolCallEvent', (event) => {
  if (shouldRetryBasedOnResult(event.result)) {
    event.retry = true; // エラーがなくてもリトライ可能
  }
});
```

**ポイント:**
- Python SDK の `AfterToolCallEvent.retry` と同等の機能を提供します
- リトライを要求すると、現在のレスポンスは会話履歴に追加されず、ツールが新たに実行されます
- リトライの各イテレーションで新しい `BeforeToolCallEvent` が発生するため、リトライ回数を監視できます

## バグ修正

### TypeScript コンパイル用に @google/genai を devDependencies に追加 ([#502](https://github.com/strands-agents/sdk-typescript/pull/502))

- CI でのビルドが失敗する問題を修正
- Gemini モデルプロバイダーの依存関係が正しく解決されるようになりました

## 破壊的変更

### AfterModelCallEvent.retryModelCall が retry に名称変更 ([#493](https://github.com/strands-agents/sdk-typescript/pull/493))

Python SDK との整合性を保つため、`AfterModelCallEvent` のプロパティ名が変更されました。

**変更前:**

```typescript
agent.hooks.addCallback('afterModelCallEvent', (event) => {
  if (event.error) {
    event.retryModelCall = true;
  }
});
```

**変更後:**

```typescript
agent.hooks.addCallback('afterModelCallEvent', (event) => {
  if (event.error) {
    event.retry = true;
  }
});
```

**移行方法:**
- `AfterModelCallEvent` を使用しているコードで、`retryModelCall` を `retry` に置換してください
- この変更により、`AfterToolCallEvent.retry` と命名が統一されました

## まとめ

このリリースでは、Google Gemini モデルのサポート追加とツール呼び出しのリトライ機能により、エージェント開発の柔軟性が向上しました。Python SDK との整合性を保つための破壊的変更が含まれるため、`AfterModelCallEvent.retryModelCall` を使用している場合はコードの更新が必要です。
