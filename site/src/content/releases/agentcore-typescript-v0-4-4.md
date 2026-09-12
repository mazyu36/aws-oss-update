---
title: "AgentCore TypeScript SDK v0.4.4 リリース解説"
version: "v0.4.4"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-09-11
summary: "AgentCore Gateway のコネクタターゲットとして提供されている Web Search を TypeScript から直接呼び出すための WebSearchClient が追加されました。SigV4 署名や MCP の JSON-RPC 会話をラップし、正規化された検索結果 (text / url / title / publishedDate) を返すクライアントとして利用できます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.4"
---

## 概要

このリリースでは、AgentCore Gateway 経由で利用できる Web Search を TypeScript から扱うための `WebSearchClient` が新設されました。従来は SigV4 署名と MCP の JSON-RPC 会話を自前で組み立てる必要があった処理がクライアント側にまとめられ、`bedrock-agentcore/web-search` サブパスから import してすぐに利用できます。

**リリース:** [v0.4.4](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.4)

## 新機能

### AgentCore Web Search 用 `WebSearchClient` の追加 ([#257](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/257))

**この機能でできること:**

- AgentCore Gateway 上の Web Search コネクタターゲットに対して、SigV4 署名済みのリクエストと MCP セッションを自動的に組み立てて検索を実行できます。
- 検索結果は MCP の content ブロックではなく、`{ text, url, title, publishedDate }` に正規化された形で返されるため、agent 実装から利用しやすくなっています。
- サブパスエクスポート `bedrock-agentcore/web-search` から `WebSearchClient` を直接 import できます。
- Gateway ID とリージョンから MCP エンドポイント URL を構築するヘルパー `getGatewayMcpEndpoint` も `src/_utils/endpoints.ts` に追加されました (Python SDK 側の `get_gateway_mcp_endpoint` と対応)。

**使用例:**

```typescript
import { WebSearchClient } from 'bedrock-agentcore/web-search'

// クライアントの初期化。
// - region: Gateway が配置されている AWS リージョン
// - gatewayId: Web Search コネクタターゲットを持つ Gateway の ID (ARN や URL は不可)
// - targetName: (任意) 事前に分かっている場合は指定することで、初回検索時の
//   tools/list 呼び出しを省略できる。Gateway では全てのツール名が
//   `<targetName>___<toolName>` (例: `amazon-web-search___WebSearch`)
//   の形式でプレフィックスされるため、targetName からツール名を直接導出できる。
const client = new WebSearchClient({
  region: 'us-east-1',
  gatewayId: 'my-gateway-abc123',
  targetName: 'amazon-web-search',
})

// 検索実行。第 2 引数のオプションで結果件数やドメイン制限を指定できる。
const response = await client.search('what shipped in node 24', {
  maxResults: 5,
  includeDomains: ['aws.amazon.com'],
})

// 結果は content ブロックではなく、正規化されたオブジェクトの配列で返される。
// AgentCore の利用規約上、url と title はエンドユーザーへの引用表示に必須のため、
// 型定義でも url / title は必ず保持される。
for (const result of response.results) {
  console.log(result.title, result.url)
  console.log(result.text)
  if (result.publishedDate) {
    console.log('published:', result.publishedDate)
  }
}

// MCP セッションの後片付け。長時間実行する agent では明示的な close を推奨。
client.close()
```

**ポイント:**

- トランスポート層は `WebSearchBackend` インターフェース (`search` / `close`) の背後に隠蔽されており、既定の実装として `GatewayMcpBackend` が使用されます。異なるアクセス経路を追加する場合でも既存呼び出し側を壊さずに拡張でき、ユニットテストではネットワークもクレデンシャルも用いずに `backend` を差し替えて実行できます。
- `getGatewayMcpEndpoint(gatewayId, region)` は Gateway ID をホスト名の先頭ラベルとして扱うため、ARN や URL を渡すと無効な入力として拒否されます。誤った識別子から不正なホスト名を組み立てないようになっています。
- SigV4 署名時は `content-length` ヘッダーを署名対象から除外します。`fetch` 実装側がリクエスト送信時にこのヘッダーを自動設定するため、署名対象に含めると署名不一致で失敗するためです。
- MCP セッションは並行呼び出しの下で再利用され、レスポンス形式は `application/json` と `text/event-stream` の両方に対応しています。タイムアウトや `tools/list` の失敗など、失敗モードもハンドリングされます。
- `targetName` を省略した場合はクライアントが `tools/list` を発行してツール名を解決するため、初回検索のレイテンシが増えます。値が判明している場合は明示的に指定するのが推奨です。
- 破壊的変更はなく、既存 API はそのまま利用できます。追加は全て `bedrock-agentcore/web-search` サブパスに閉じており、既存の import に影響を与えません。

## まとめ

これまで自前で SigV4 と MCP を組み立てる必要があった AgentCore Gateway 経由の Web Search が、TypeScript SDK からもワンライナーで扱えるようになりました。エージェントの検索ツール実装がシンプルになり、Python SDK と揃った開発体験を得られます。
