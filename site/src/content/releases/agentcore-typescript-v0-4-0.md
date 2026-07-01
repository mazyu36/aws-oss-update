---
title: "AgentCore TypeScript SDK v0.4.0 リリース解説"
version: "v0.4.0"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-06-30
summary: "AgentCore Memory の Strands 統合に長期記憶抽出をスキップする extractionMode オプションが追加され、Runtime クライアントが GovCloud パーティション (aws-us-gov) の ARN をサポートするようになりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.0"
---

## 概要

このリリースでは、AgentCore Memory の Strands 統合に `extractionMode` オプションが追加され、短期記憶にのみ保存し長期記憶抽出をスキップする挙動を選択できるようになりました。あわせて Runtime クライアントの ARN パーサが `aws-us-gov` などの非商用パーティションに対応し、GovCloud 環境でも動作するようになっています。

**リリース:** [v0.4.0](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.0)

## 新機能

### AgentCoreEventSender に extractionMode オプションを追加 ([#200](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/200))

**この機能でできること:**
- `AgentCoreEventSenderConfig` および `AgentCoreMemoryConfig` に `extractionMode` プロパティが追加されました。`"SKIP"` を指定すると、イベントは短期記憶には保存されつつ、長期記憶への抽出処理からは除外されます。機密性の高い一時的な情報 (ワンタイム PIN やパスワードなど) を扱う場合や、長期記憶に残すべきでない発話を抑制したい場合に有用です。

**使用例:**

```typescript
import { AgentCoreMemoryStore } from 'bedrock-agentcore/experimental/memory/strands';

const store = new AgentCoreMemoryStore({
  memoryId: 'mem-xxxxxxxx',
  actorId: 'user-123',
  sessionId: 'session-abc',
  namespace: 'facts/{actorId}',
  writable: true,
  extraction: true,
  // "SKIP" を指定すると、短期記憶には保存されるが長期記憶抽出はスキップされる
  // 省略した場合は従来通り抽出処理が走る
  extractionMode: 'SKIP',
});

// この書き込みは短期記憶にのみ保存され、長期抽出パイプラインには乗らない
await store.addMessages!(
  [{ role: 'user', content: [{ text: '一時的な PIN: 4821' }] }],
  { sequenceNumbers: [0] }
);
```

**ポイント:**
- 型は `type ExtractionMode = 'SKIP'` として SDK 内でローカル宣言されており、`@aws-sdk/client-bedrock-agentcore` の古いクライアントでもコンパイルが通ります
- 値は `CreateEventCommand` の `input.extractionMode` として送信されるため、AgentCore サービス側の抽出パイプライン制御に直接反映されます
- 省略した場合は `CreateEventCommand` の入力にフィールド自体が含まれず、従来通りの抽出動作 (extraction が有効ならサーバー側で抽出) となります
- `AgentCoreEventSender` を直接使う場合は `AgentCoreEventSenderConfig.extractionMode` として渡します

---

## バグ修正

### Runtime クライアントの ARN パーサが GovCloud パーティションをサポート ([#206](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/206))

- Runtime クライアント (`RuntimeClient`) と `RuntimeArnSchema` (Zod) の ARN 正規表現が、`arn:aws:` に固定されていたパーティション部分を `arn:aws[a-z0-9-]*:` に緩和しました。これにより `arn:aws-us-gov:bedrock-agentcore:us-gov-west-1:...` のような GovCloud パーティションの ARN が正しくパースされ、`us-gov-west-1` などのリージョンやアカウント ID を抽出できるようになります。
- 修正前は GovCloud パーティションの ARN を渡すと `Invalid runtime ARN format` エラーとなり、GovCloud 環境で `RuntimeClient` の各種メソッド (シェル接続を含む) が利用できませんでした。
- あわせて GovCloud 環境での結合テスト実行に向けた対応として、`tests_integ/vercel-ai-agent.test.ts` などで利用するモデル ID を環境変数 `MODEL_ID` で差し替え可能になっています (例: `MODEL_ID=us-gov.anthropic.claude-sonnet-4-5-20250929-v1:0`)。

**修正後の利用例:**

```typescript
import { RuntimeClient } from 'bedrock-agentcore';

const client = new RuntimeClient({ region: 'us-gov-west-1' });

// GovCloud パーティションの ARN も受け付けられるようになった
const session = await client.openShell({
  runtimeArn: 'arn:aws-us-gov:bedrock-agentcore:us-gov-west-1:123456789012:runtime/my-runtime-id',
});
```

## まとめ

Strands 統合の `extractionMode: 'SKIP'` により、AgentCore Memory の短期／長期の切り分けをクライアント側から明示制御できるようになりました。あわせて Runtime クライアントが GovCloud パーティションの ARN を正しく扱えるようになり、規制環境向けのユースケースに対応しやすくなっています。
