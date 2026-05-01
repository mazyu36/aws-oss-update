---
title: "sdk-typescript v0.1.4"
version: "v0.1.4"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2026-01-02
summary: "このリリースでは、ReasoningBlock の状態管理に関する重要なバグ修正が含まれています。accumulatedReasoning の状態リセット処理により、thinking mode 使用時のデータ破損を防ぎます。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.4"
---

## 概要

このリリースでは、Model クラスにおける ReasoningBlock の状態管理に関する重要なバグ修正が行われました。thinking mode を使用した Agent で、古い推論データが再利用されてしまう問題が修正されています。

**リリース:** [v0.1.4](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.4)

## バグ修正

### ReasoningBlock の状態リセット処理を追加 ([#363](https://github.com/strands-agents/sdk-typescript/pull/363))

`Model` クラスで `ReasoningBlock` を作成した後、`accumulatedReasoning` の状態がリセットされずに残っていた問題が修正されました。この問題により、thinking mode でツールを使用する Agent において、古い推論データが次の `ReasoningBlock` に混入し、データが破損する可能性がありました。

**修正内容:**
- `ReasoningBlock` の作成後に `accumulatedReasoning` をリセットする処理を追加
- thinking mode とツール使用を組み合わせた統合テストを追加

**影響を受けていた状況:**
- thinking mode を有効にした Bedrock Model を使用している場合
- Agent がツールを使用し、複数回の推論サイクルを実行する場合
- 特に `additionalRequestFields` で `thinking` パラメータを設定している場合

**修正後の動作:**

```typescript
import { Agent, BedrockModel, FunctionTool } from '@strands-agents/sdk'

// thinking mode を有効にした Model の作成
const model = new BedrockModel({
  modelId: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  additionalRequestFields: {
    thinking: {
      type: 'enabled',
      budget_tokens: 1024,
    },
  },
  maxTokens: 2048,
})

// ツールの定義
const testTool = new FunctionTool({
  name: 'calculator',
  description: 'Performs basic arithmetic operations',
  inputSchema: {
    type: 'object',
    properties: {
      operation: { type: 'string' },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  },
  callback: ({ operation, a, b }) => {
    if (operation === 'add') return a + b
    if (operation === 'multiply') return a * b
    return 'Invalid operation'
  },
})

// Agent の作成
const agent = new Agent({
  model,
  tools: [testTool],
})

// 実行（推論データが正しくリセットされる）
const result = await agent.invoke('Calculate 5 + 3 and then multiply the result by 2')

console.log(result.stopReason) // 'endTurn'
console.log(result.lastMessage.content) // 正しい結果を含むレスポンス
```

**ポイント:**
- この修正により、thinking mode とツール使用を組み合わせた Agent が安定して動作するようになりました
- `accumulatedReasoning` の状態が適切にリセットされるため、複数の推論サイクルでデータが混入することがなくなりました
- 既存のコードに変更は不要で、自動的に修正の恩恵を受けられます

## まとめ

このリリースは、thinking mode を使用する Agent の安定性を向上させる重要なバグ修正を含んでいます。特にツール使用と組み合わせた場合の動作が改善されています。

---
