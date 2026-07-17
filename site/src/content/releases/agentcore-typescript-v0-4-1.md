---
title: "AgentCore TypeScript SDK v0.4.1 リリース解説"
version: "v0.4.1"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-07-17
summary: "AgentCore Memory の Strands 統合が experimental から GA (Generally Available) に昇格しました。新しいインポートパス `bedrock-agentcore/memory/strands` が追加され、既存の `experimental/memory/strands` パスも後方互換のためエイリアスとして残されています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.1"
---

## 概要

このリリースでは、AgentCore Memory の Strands 統合が experimental から GA (Generally Available) に昇格しました。Strands の `MemoryManager` / `MemoryStore` / extraction サーフェス (`@strands-agents/sdk` >= 1.5.0) に対して安定しており、他の GA 統合と同じフラットな命名規則に揃えた新しいインポートパスが公開されています。既存の `experimental/memory/strands` パスもエイリアスとして残っているため、破壊的変更はありません。

**リリース:** [v0.4.1](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.1)

## 新機能

### AgentCore Memory Strands 統合を GA に昇格 ([#213](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/213))

**この機能でできること:**
- Strands エージェントから AgentCore Memory を `MemoryStore` としてそのまま利用できる統合が GA になりました。長期記憶の想起は `search_memory` 経由、会話ターンは role を保持したまま AgentCore に書き込まれ、サーバ側で長期記録への抽出が行われます。
- GA 版のエクスポートパスは `bedrock-agentcore/memory/strands` で、`browser/vercel-ai` や `code-interpreter/vercel-ai` など他の GA 統合と同じフラットで experimental 接頭辞のない命名規則に揃えられています。
- 旧パス `bedrock-agentcore/experimental/memory/strands` は同一モジュールへのエイリアスとして残されており、既存の利用者はコードを変更せずにアップグレードできます。

**使用例:**

```typescript
import { Agent, MemoryManager } from '@strands-agents/sdk';
// GA パス (今後はこちらを利用)
import { createAgentCoreMemoryStores } from 'bedrock-agentcore/memory/strands';

// (actorId, sessionId) の組み合わせごとに 1 回だけ呼び出す
// namespace ごとに store が構築され、クライアントは共有される
const stores = createAgentCoreMemoryStores({
  memoryId: process.env.MEMORY_MYMEMORY_ID!,
  actorId: 'user-123',
  sessionId: 'session-abc',
  namespaces: ['facts/{actorId}', 'prefs/{actorId}'],
});

const agent = new Agent({
  model,
  memoryManager: new MemoryManager({ stores }),
});
```

単一 namespace のみを利用する場合は、`AgentCoreMemoryStore` を直接構築する形も引き続き利用できます。

```typescript
// GA パス
import { AgentCoreMemoryStore } from 'bedrock-agentcore/memory/strands';

const store = new AgentCoreMemoryStore({
  memoryId: 'mem-abc',
  actorId: 'user-123',
  sessionId: 'session-abc',
  namespace: 'facts/{actorId}',
});
```

**ポイント:**
- GA 版のエクスポート API 自体は変更されていません。`createAgentCoreMemoryStores` および `AgentCoreMemoryStore` のシグネチャはそのままで、インポートパスのみが正式パスに移行しています
- 旧パス `bedrock-agentcore/experimental/memory/strands` からのインポートも引き続き解決されるため、段階的な移行が可能です (`package.json` の `exports` で同じモジュールへの alias として定義されています)
- 依存する Strands SDK のバージョン要件は変わらず `@strands-agents/sdk` >= 1.5.0 です
- ドキュメント (`docs/MEMORY.md` および `src/memory/integrations/strands/README.md`) も GA パスを指すように更新されています
- Browser 統合と Code Interpreter 統合の Strands 版は引き続き experimental のままで、このリリースでは変更されていません

**移行の目安:**

```typescript
// Before (experimental パス — 引き続き動作するがエイリアス扱い)
import {
  createAgentCoreMemoryStores,
  AgentCoreMemoryStore,
} from 'bedrock-agentcore/experimental/memory/strands';

// After (GA パス — 新規コードや移行時はこちらを推奨)
import {
  createAgentCoreMemoryStores,
  AgentCoreMemoryStore,
} from 'bedrock-agentcore/memory/strands';
```

## まとめ

AgentCore Memory の Strands 統合が GA になり、実運用ワークロードでもサポートされる正式な統合として利用できるようになりました。インポートパスは新しい `bedrock-agentcore/memory/strands` に移行することが推奨されますが、旧パスもエイリアスとして維持されているため既存プロジェクトの変更は必須ではありません。
