---
title: "bedrock-agentcore-sdk-typescript v0.1.1"
version: "v0.1.1"
repository: "agentcore-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2025-11-26
summary: "Vercel AI SDK との統合例を追加し、Browser および CodeInterpreter ツールを活用した実装パターンを提供。ストリーミング処理や Web 自動化など、実践的なサンプルコードが充実。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.1.1"
---

## 概要

このリリースでは、Vercel AI SDK v6 beta の Agent API を使用した実践的なサンプルコードが追加されました。Browser ツールによる Web 自動化、CodeInterpreter と Browser を組み合わせたリサーチワークフロー、そしてストリーミング処理のパターンなど、実際の開発で使えるサンプルが提供されています。

**リリース:** [v0.1.1](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.1.1)

## 新機能

### Vercel AI SDK サンプルとテストの追加 ([#15](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/15))

**この機能でできること:**
Vercel AI SDK v6 の ToolLoopAgent と組み合わせた実装パターンを学ぶことができます。Browser ツール、CodeInterpreter ツール、ストリーミング処理の実装例が提供され、すぐに実践できる形で提供されています。

**サンプルコード:**

```typescript
import './setup.js'
import { ToolLoopAgent } from 'ai'
import { bedrock } from '@ai-sdk/amazon-bedrock'
import { BrowserTools } from '../src/tools/browser/integrations/vercel-ai/index.js'

// Browser ツールの初期化
const browser = new BrowserTools({
  region: process.env.AWS_REGION || 'us-west-2',
})

// Web スクレイピングエージェントの作成
const agent = new ToolLoopAgent({
  model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
  instructions: `You are a web research assistant with access to a browser.
  You can navigate to websites and extract information from them.
  Always describe what you find in a clear and organized way.`,
  tools: {
    navigate: browser.navigate,
    getText: browser.getText,
    getHtml: browser.getHtml,
  },
})

try {
  const result = await agent.generate({
    prompt: `Go to https://en.wikipedia.org/wiki/TypeScript and extract:
    1. The main title of the article
    2. The first paragraph describing what TypeScript is
    Provide a brief summary of what you found.`,
  })

  console.log('Agent Response:', result.text)
  console.log('Completed in', result.steps.length, 'steps')
} finally {
  await browser.stopSession()
}
```

**ストリーミング処理の例:**

```typescript
import { ToolLoopAgent } from 'ai'
import { bedrock } from '@ai-sdk/amazon-bedrock'
import { CodeInterpreterTools } from '../src/tools/code-interpreter/integrations/vercel-ai/index.js'

const codeInterpreter = new CodeInterpreterTools({
  region: process.env.AWS_REGION || 'us-west-2',
})

const agent = new ToolLoopAgent({
  model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
  instructions: 'You are a helpful assistant. Explain your reasoning step by step.',
  tools: codeInterpreter.tools,
})

try {
  const result = await agent.stream({
    prompt: 'Write a Python function to check if a number is prime, then test it with 17.',
  })

  // リアルタイムでテキストをストリーミング
  for await (const text of result.textStream) {
    process.stdout.write(text)
  }

  // 最終結果にアクセス
  const final = await result
  console.log(`\n✓ Completed in ${final.steps.length} steps`)
} finally {
  await codeInterpreter.stopSession()
}
```

**ポイント:**
- `ToolLoopAgent` は Vercel AI SDK v6 beta の新しい Agent API で、ツールの反復実行を自動化します
- Browser ツールと CodeInterpreter ツールを組み合わせることで、Web リサーチからデータ分析までの一連のワークフローを自動化できます
- ストリーミング処理を使うことで、長時間実行されるタスクでもリアルタイムにフィードバックを提供できます
- `setup.js` で crypto polyfill を設定することで、`@ai-sdk/amazon-bedrock` との互換性が確保されています
- セッション管理のため、必ず `finally` ブロックで `stopSession()` を呼び出してください

**追加されたサンプル:**
- `agent-with-browser.ts`: Web ナビゲーション、コンテンツ抽出、要素操作のデモ
- `agent-research-assistant.ts`: Browser と CodeInterpreter を組み合わせたリサーチワークフロー
- `streaming-examples.ts`: 様々なストリーミングパターンとプログレス追跡
- `examples/setup.ts`: `@ai-sdk/amazon-bedrock` 互換性のための crypto polyfill

## まとめ

このリリースは、Bedrock AgentCore SDK TypeScript と Vercel AI SDK を組み合わせた実装パターンを提供し、開発者がすぐに実践できる環境を整えました。Web 自動化やデータ分析など、エージェント開発の幅が大きく広がります。

---
