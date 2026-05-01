---
title: "sdk-typescript v0.1.6"
version: "v0.1.6"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2026-01-21
summary: "MCP タスク拡張ツールのサポートと、Model クラスの値としてのエクスポート機能が追加されました。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.6"
---

## 概要

このリリースでは、MCP (Model Context Protocol) のタスク拡張ツール (task-augmented tools) のサポートが追加され、長時間実行されるツールの進捗管理が可能になりました。また、`Model` クラスが型ではなく値としてエクスポートされるようになり、カスタムモデルアダプターの作成が容易になりました。

**リリース:** [v0.1.6](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.6)

## 新機能

### MCP タスク拡張ツールのサポート ([#357](https://github.com/strands-agents/sdk-typescript/pull/357))

**この機能でできること:**
- MCP サーバーが提供するタスク拡張ツールを使用して、長時間実行されるタスクを非同期で処理できます
- タスクの進捗状況を追跡し、完了を待機する処理が自動的に行われます

**技術的な変更:**
- `McpClient.callTool()` が内部で `callTool()` の代わりに `callToolStream()` を使用するように変更
- 通常のツールとタスク拡張ツールの両方を透過的に処理
- タスク拡張ツールでは `taskCreated` → `taskStatus` → `result` のフローを自動的にハンドリング

**使用例:**

```typescript
import { McpClient, Agent } from '@strands-agents/sdk';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// MCP クライアントを作成して接続
const client = new McpClient({
  applicationName: 'my-app',
  transport: new StreamableHTTPClientTransport(new URL('http://localhost:3000/mcp')),
});

await client.connect();

// ツール一覧を取得
const tools = await client.listTools();
const longRunningTool = tools.find((t) => t.name === 'long_running_task');

// タスク拡張ツールを呼び出し（完了まで自動的に待機）
const result = await client.callTool(longRunningTool!, {
  duration: 5000,
  message: 'Task completed successfully!',
});

console.log(result);
// { content: [{ type: 'text', text: 'Task completed successfully!' }] }
```

**Agent との統合:**

```typescript
import { Agent, McpClient } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk';

const client = new McpClient({
  applicationName: 'agent-app',
  transport: new StreamableHTTPClientTransport(new URL('http://localhost:3000/mcp')),
});

const agent = new Agent({
  systemPrompt: 'タスクツールを使用してユーザーのリクエストを処理してください。',
  tools: [client],
  model: new BedrockModel({ maxTokens: 1000 }),
});

// Agent がタスク拡張ツールを自動的に使用
const result = await agent.invoke('長時間タスクを実行してください');
```

**ポイント:**
- 既存の MCP ツール呼び出しとの後方互換性が維持されています
- タスク拡張ツールの進捗追跡は SDK 内部で自動的に処理されるため、追加のコード変更は不要です
- タスクが失敗した場合は、エラーがスローされます

---

### Model クラスの値エクスポート ([#387](https://github.com/strands-agents/sdk-typescript/pull/387))

**この機能でできること:**
- `Model` クラスを継承して、SDK が標準でサポートしていないモデルプロバイダー用のカスタムアダプターを作成できます

**技術的な変更:**
- `Model` が `export type` から `export { Model }` に変更され、ランタイムで値として使用可能に

**使用例:**

```typescript
import { Model, type BaseModelConfig, type StreamOptions } from '@strands-agents/sdk';
import type { Message, ModelResponse } from '@strands-agents/sdk';

// カスタムモデルプロバイダーのアダプターを作成
class CustomModelProvider extends Model {
  constructor(private config: BaseModelConfig & { apiKey: string }) {
    super();
  }

  async *stream(
    messages: Message[],
    options?: StreamOptions
  ): AsyncGenerator<ModelResponse> {
    // カスタムモデルプロバイダーへのリクエスト実装
    const response = await fetch('https://api.custom-provider.com/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, ...options }),
    });

    // ストリーミングレスポンスを処理
    // ...
  }
}

// カスタムモデルを Agent で使用
import { Agent } from '@strands-agents/sdk';

const customModel = new CustomModelProvider({
  maxTokens: 1000,
  apiKey: process.env.CUSTOM_API_KEY!,
});

const agent = new Agent({
  model: customModel,
  systemPrompt: 'You are a helpful assistant.',
});
```

**ポイント:**
- SDK を直接修正せずに、サードパーティのモデルプロバイダーを統合できます
- `BedrockModel` など既存のモデル実装を参考にしてカスタムアダプターを作成できます

## まとめ

このリリースでは、MCP タスク拡張ツールのサポートにより非同期タスクの処理が改善され、`Model` クラスのエクスポート方法の変更によりカスタムモデルプロバイダーの統合が容易になりました。
