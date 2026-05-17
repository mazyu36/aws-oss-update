---
title: "Strands TypeScript SDK v0.2.2 リリース解説"
version: "v0.2.2"
repository: "sdk-typescript"
repositoryDisplayName: "Strands TypeScript SDK"
releaseType: "stable"
date: 2026-02-11
summary: "Anthropic モデルプロバイダーの追加、Bedrock API キー認証のサポート、Gemini のマルチメディアコンテンツ対応、レート制限エラーの新クラス追加、フックシステムの拡張など、多数の新機能が含まれています。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.2.2"
---

## 概要

このリリースでは、Anthropic モデルプロバイダーが新たに追加され、Claude モデルを直接利用できるようになりました。また、Bedrock API キー認証のサポート、Gemini プロバイダーのマルチメディアコンテンツ対応、レート制限時の専用エラークラス追加など、多くの機能強化が行われています。

**リリース:** [v0.2.2](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.2.2)

## 新機能

### Anthropic モデルプロバイダーの追加 ([#374](https://github.com/strands-agents/sdk-typescript/pull/374))

**この機能でできること:**
- Anthropic API を直接使用して Claude モデル（Sonnet、Opus など）でエージェントを構築できます
- プロンプトキャッシングにより、大規模なコンテキストを効率的に処理できます
- Thinking（推論）機能を有効にして、モデルの思考プロセスを確認できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk';
import { AnthropicModel } from '@strands-agents/sdk/anthropic';

// 基本的な使用方法
const model = new AnthropicModel({
  apiKey: process.env.ANTHROPIC_API_KEY, // 環境変数から取得する場合は省略可能
  modelId: 'claude-sonnet-4-5-20250929',
  maxTokens: 4096,
});

const agent = new Agent({
  model,
  systemPrompt: 'You are a helpful assistant.',
});

const result = await agent.invoke('Hello!');
```

```typescript
// Thinking（推論）機能を有効にした使用例
import { AnthropicModel } from '@strands-agents/sdk/anthropic';

const thinkingModel = new AnthropicModel({
  modelId: 'claude-sonnet-4-5-20250929',
  params: {
    thinking: { type: 'enabled', budget_tokens: 1024 },
  },
});
```

**ポイント:**
- API キーは `ANTHROPIC_API_KEY` 環境変数から自動的に取得されます
- プロンプトキャッシングは SDK の `CachePointBlock` を使用して自動的に処理されます
- バイナリデータ（高解像度画像や PDF）の処理が最適化されています

---

### Bedrock API キー認証のサポート ([#509](https://github.com/strands-agents/sdk-typescript/pull/509))

**この機能でできること:**
- IAM 認証情報の代わりに Bedrock API キーを使用して認証できます
- 複雑なクライアント設定なしで、簡単に Bedrock を利用開始できます

**使用例:**

```typescript
import { BedrockModel } from '@strands-agents/sdk';

// API キーを使用した認証
const model = new BedrockModel({
  region: 'us-east-1',
  modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  apiKey: 'br-...', // Bedrock API キー
});
```

**ポイント:**
- IAM 認証情報のセットアップが困難な環境でも Bedrock を利用できます
- 既存の IAM 認証を使用したコードには影響ありません
- プロトタイピングや開発環境での利用に適しています

---

### レート制限用の ModelThrottledError クラス追加 ([#498](https://github.com/strands-agents/sdk-typescript/pull/498))

**この機能でできること:**
- モデルプロバイダーからのレート制限エラーを専用のエラークラスで識別できます
- レート制限に特化したエラーハンドリングやリトライロジックを実装できます

**使用例:**

```typescript
import { Agent, ModelThrottledError } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk';

const agent = new Agent({
  model: new BedrockModel(),
  systemPrompt: 'You are a helpful assistant.',
});

try {
  const result = await agent.invoke('Hello!');
} catch (error) {
  if (error instanceof ModelThrottledError) {
    // レート制限エラーに特化した処理
    console.log('Rate limited. Please wait before retrying.');
  }
}
```

**ポイント:**
- Bedrock、OpenAI、Anthropic の各プロバイダーでレート制限エラーを検出し、`ModelThrottledError` をスローします
- 既存のエラーハンドリングコードと組み合わせて、より細かい制御が可能です

---

### Gemini プロバイダーのマルチメディアコンテンツ対応 ([#495](https://github.com/strands-agents/sdk-typescript/pull/495))

**この機能でできること:**
- Gemini モデルで画像、動画、ドキュメントを入力として使用できます
- Gemini の推論（Thinking）レスポンスを処理し、`reasoningContentDelta` イベントを発行できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk';
import { GeminiModel } from '@strands-agents/sdk/models/gemini';
import { ImageBlock } from '@strands-agents/sdk';

const model = new GeminiModel({
  modelId: 'gemini-2.5-flash',
});

const agent = new Agent({
  model,
  systemPrompt: 'You are a helpful assistant.',
});

// 画像を含むメッセージ
const result = await agent.invoke({
  content: [
    { type: 'text', text: 'What is in this image?' },
    {
      type: 'image',
      source: { type: 'bytes', mediaType: 'image/png', bytes: imageBytes },
    },
  ],
});
```

**ポイント:**
- Python SDK と同等のメディアコンテンツサポートを提供します
- `@google/genai` の依存関係が `^1.40.0` に更新されています

---

### AgentInitializedEvent をフックシステムに追加 ([#512](https://github.com/strands-agents/sdk-typescript/pull/512))

**この機能でできること:**
- エージェントの初期化完了時にフックでイベントを受け取れます
- SessionManager などのコンポーネントがエージェントの初期化に応答できます

**使用例:**

```typescript
import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk';

const agent = new Agent({
  model: new BedrockModel(),
  systemPrompt: 'You are a helpful assistant.',
});

// エージェント初期化完了時のフック
agent.hooks.addCallback('agentInitializedEvent', (event) => {
  console.log('Agent initialized:', event.agent);
  // セッション管理の初期化など
});
```

**ポイント:**
- エージェントが完全に構築され、組み込みコンポーネントが初期化された後に発火します
- セッション管理やロギングの初期化に活用できます

## まとめ

このリリースでは、Anthropic モデルプロバイダーの追加により Claude モデルを直接利用できるようになりました。また、Bedrock API キー認証、Gemini のマルチメディア対応、レート制限エラーの専用クラスなど、開発者体験を向上させる多くの機能が追加されています。
