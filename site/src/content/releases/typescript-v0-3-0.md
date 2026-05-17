---
title: "Strands TypeScript SDK v0.3.0 リリース解説"
version: "v0.3.0"
repository: "sdk-typescript"
repositoryDisplayName: "Strands TypeScript SDK"
releaseType: "stable"
date: 2026-02-19
summary: "Gemini モデルにおけるツールコール（関数呼び出し）のフルサポートが追加されました。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.3.0"
---

## 概要

このリリースでは、Gemini モデルにおけるツールコール（関数呼び出し）のフルサポートが追加されました。これにより、Gemini モデルを使用するエージェントでも、Bedrock や OpenAI と同様にツールを活用できるようになります。

**リリース:** [v0.3.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.3.0)

## 新機能

### Gemini モデルのツールコールサポート ([#517](https://github.com/strands-agents/sdk-typescript/pull/517))

**この機能でできること:**
- Gemini モデルでツール（関数呼び出し）を使用したエージェントを構築できます
- `toolChoice` オプションで `auto`、`any`、`tool` の各モードをサポート
- Gemini の思考モデル（Thinking Models）にも対応し、`reasoningSignature` を介したマルチターンのツール使用が可能です

**使用例:**

```typescript
import { Agent, tool } from '@strands-agents/sdk';
import { GeminiModel } from '@strands-agents/sdk/models';

// ツールを定義
const calculator = tool({
  name: 'calculator',
  description: '数学の計算を実行します',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: '計算する数式（例: "2 + 3 * 4"）',
      },
    },
    required: ['expression'],
  },
  handler: async ({ expression }) => {
    // 安全な数式評価（実際の実装では適切なパーサーを使用）
    const result = Function(`"use strict"; return (${expression})`)();
    return { result };
  },
});

// Gemini モデルでエージェントを作成
const agent = new Agent({
  model: new GeminiModel({
    modelId: 'gemini-2.0-flash',
  }),
  tools: [calculator],
  systemPrompt: 'あなたは計算を手助けするアシスタントです。',
});

// ツールを使用した対話
const response = await agent.invoke('15 と 27 を掛け算して、その結果に 100 を足してください');
console.log(response.output);
// ツールが呼び出され、計算結果が返されます
```

**toolChoice の使用例:**

```typescript
const agent = new Agent({
  model: new GeminiModel({
    modelId: 'gemini-2.0-flash',
  }),
  tools: [calculator, weatherTool],
  toolChoice: 'auto', // モデルがツールを使うかどうかを自動で判断
  // toolChoice: 'any', // 必ずいずれかのツールを使用
  // toolChoice: { tool: 'calculator' }, // 特定のツールを強制
});
```

**ポイント:**
- Gemini は関数レスポンスに関数名を必要とするため、SDK が会話履歴から自動的に名前を解決します
- ストリーミングレスポンスで `toolUseStart`、`toolUseInputDelta`、`stop` イベントが適切に発火します
- 思考モデルを使用する場合、`reasoningSignature` が自動的に処理され、マルチターンのツール使用が正しく動作します

## まとめ

このリリースにより、Gemini モデルでツールコールが利用可能になり、TypeScript SDK でサポートするすべての主要モデルプロバイダーで統一されたツール使用体験が提供されます。
