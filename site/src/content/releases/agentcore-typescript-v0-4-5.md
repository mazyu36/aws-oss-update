---
title: "AgentCore TypeScript SDK v0.4.5 リリース解説"
version: "v0.4.5"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-09-28
summary: "AgentCore Runtime で A2A (Agent-to-Agent) プロトコルをホストするための runtime/a2a サブパスと、AWS China (aws-cn) パーティションのエンドポイント解決サポートが追加されました。あわせて、パッケージルートの entrypoint 欠落と shipped source の依存宣言漏れも修正されています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.5"
---

## 概要

このリリースでは、AgentCore Runtime 上で A2A (Agent-to-Agent) プロトコルの JSON-RPC エンドポイントをホストできる `bedrock-agentcore/runtime/a2a` サブパスが追加され、Python SDK の `serve_a2a` と同等の機能を TypeScript でも利用可能になりました。また、AWS China (`cn-north-1` / `cn-northwest-1`) パーティションでのエンドポイント解決に対応し、パッケージのルート entrypoint の欠落と、shipped source が依存する npm パッケージの宣言漏れといった配布まわりのバグも修正されています。

**リリース:** [v0.4.5](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.5)

## 新機能

### Runtime で A2A プロトコルをホストする `runtime/a2a` サブパスの追加 ([#229](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/229))

**この機能でできること:**

- AgentCore Runtime 上で A2A (Agent-to-Agent) プロトコル (`serverProtocol: A2A`) のエージェントを、TypeScript でホストできるようになりました。Python SDK の `serve_a2a` / `build_a2a_app` / `build_runtime_url` / `BedrockCallContextBuilder` と同等の API が提供されます。
- 内部では公式の `@a2a-js/sdk` (v1.x) を Express ハンドラでラップしており、JSON-RPC 2.0 エンドポイント (`POST /`)、エージェントカード (`/.well-known/agent-card.json`、v1.0 と v0.3 互換)、ヘルスチェック (`GET /ping`) が同梱されています。
- `identity` モジュールの `withAccessToken` / `withApiKey` は `getContext()` 経由でアンビエントな `workloadAccessToken` を読むため、これまでは HTTP パス (`BedrockAgentCoreApp`) でしか動作しませんでしたが、A2A エグゼキュータの中でもそのまま利用できるようになりました。
- `@a2a-js/sdk` および `express` は `playwright` / `@strands-agents/sdk` と同じく **optional peerDependency** として宣言されているため、A2A を使わないユーザーには影響がありません。

**使用例:**

```typescript
import { serveA2A, buildAgentCard, getContext } from 'bedrock-agentcore/runtime/a2a'
import type { AgentExecutor } from '@a2a-js/sdk/server'

// AgentExecutor は @a2a-js/sdk が定義するインターフェース。
// SDK 側の実装 (例: strands-agents 系) をそのまま渡すことができる。
const myExecutor: AgentExecutor = {
  async execute(requestContext, eventBus) {
    // AgentCore から差し込まれた session id / request id / workloadAccessToken /
    // OAuth2CallbackUrl は、HTTP パスと同じ runWithContext / getContext コンテキストに
    // 伝搬されるため、identity ラッパーが変更なしで動作する。
    const ctx = getContext()
    console.log('sessionId:', ctx.sessionId)
    console.log('requestId:', ctx.requestId)

    // ServerCallContext.state 経由でも同じ値を取得できる (Python の
    // BedrockCallContextBuilder に相当)。キーは camelCase を採用。
    const state = requestContext.context?.state
    // state.requestId / state.workloadAccessToken など

    // ...任意のエージェント処理...
  },
  async cancelTask(taskId, eventBus) {
    // タスクのキャンセル処理
  },
}

await serveA2A({
  executor: myExecutor,
  // agentCard を省略すると自動生成される (name: 'agent'、version: '0.1.0'、
  // main skill が tag 'main' として付与されるデフォルト構成)。
  agentCard: buildAgentCard({
    name: 'research-agent',
    description: 'Deep research specialist',
    skills: [{ id: 'main', name: 'research', description: 'Research a topic' }],
  }),
  // port は A2A_PORT env → 9000 の順で解決。他の値になった場合は警告が出る。
  // host はコンテナ内 (/.dockerenv または DOCKER_CONTAINER=1) で 0.0.0.0、
  // それ以外ではループバックアドレスにフォールバックする。
  // ping ハンドラを省略した場合、常に 'Healthy' を返す。ハンドラが throw した
  // 場合も 'Healthy' に degrade する (HealthyBusy を返せるのはハンドラ経由のみ)。
  // taskStore / serverCallContextBuilder は差し替え可能。
})
```

デプロイ済みエージェントを A2A クライアントから呼び出す場合は、SigV4 署名済みの `InvokeAgentRuntime` URL を組み立てるヘルパー `buildRuntimeUrl` が用意されています (Python の `build_runtime_url` に対応)。

```typescript
import { buildRuntimeUrl } from 'bedrock-agentcore/runtime/a2a'

// リージョンを省略した場合は AWS_REGION / AWS_DEFAULT_REGION から解決。
const url = buildRuntimeUrl(
  'arn:aws:bedrock-agentcore:eu-central-1:123456789012:runtime/my-agent-abc',
  'eu-central-1',
)
```

Express アプリを bind せずに取得する `buildA2AApp` も提供されており、テストや埋め込みシナリオで利用できます。

**ポイント:**

- AgentCore Runtime にデプロイする場合、AgentCore のコンテナ環境には `/.dockerenv` が作られないため、Dockerfile 側で `ENV DOCKER_CONTAINER=1` を明示的に設定する必要があります。あわせて Runtime 側では `serverProtocol: A2A` を指定し、IAM 側で `bedrock-agentcore:GetAgentCard` の権限を付与してください (`src/runtime/README.md` に手順が追加されています)。
- カードの URL は `AGENTCORE_RUNTIME_URL` が設定されている場合に自動で書き換えられます。プラットフォームは末尾スラッシュなしで値を渡してくるため、SDK 側では正規化して末尾スラッシュ付きで公開します (WHATWG URL の解決仕様上、末尾スラッシュなしのベースだと `/.well-known/agent-card.json` の解決が壊れるため)。
- 転送されるヘッダーは Python の `runtime/models.py` から移植された allowlist に従います。`traceparent` / `baggage` は分散トレース伝搬のためそのまま通過します。
- `ServerCallContext.state` のキーは repo の慣習に合わせて camelCase (`requestId`, `workloadAccessToken` など) で公開されます。Python 側の snake_case とは異なる点に注意してください。
- Python 側の baggage / OTEL ルーティング実験機構は TypeScript に対応する内部モジュールがないため、本 PR ではスコープ外です。`@a2a-js/sdk` v1 の legacy-compat 層により、v0.3 クライアントもサーバー側で扱えます。

---

### AWS China (aws-cn) パーティションのエンドポイント解決サポート ([#272](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/272))

**この機能でできること:**

- `cn-north-1` / `cn-northwest-1` などの AWS China リージョンで SDK を利用した場合に、data-plane、Gateway MCP、Browser、A2A の URL が正しく `amazonaws.com.cn` にフォールバックするようになりました。従来はエンドポイント TLD が `.amazonaws.com` にハードコードされており、中国パーティションで解決できないケースがありました。
- 実装では `@aws-sdk/util-endpoints` の partition データから DNS suffix を取得しており、既存の商用パーティション (`aws`) の挙動は変わりません。Runtime ARN の正規表現はすでに partition tolerant なため変更なしです。

**使用例:**

```typescript
import { BedrockAgentCoreClient } from 'bedrock-agentcore/runtime'

// cn-north-1 に対しては bedrock-agentcore.<endpoint>.amazonaws.com.cn 系の
// エンドポイントに解決される。呼び出し側での変更は不要。
const client = new BedrockAgentCoreClient({ region: 'cn-north-1' })

// Gateway MCP / Browser / A2A の URL 構築ヘルパーも同じロジックで
// DNS suffix を切り替えるため、中国リージョンでもそのまま利用できる。
```

**ポイント:**

- `src/_utils/endpoints.ts` の `getDataPlaneEndpoint` / `getGatewayMcpEndpoint` が `partition(region).dnsSuffix` に基づいて DNS サフィックスを動的に切り替えます。
- Browser クライアントは SigV4 用の host を `new URL(...).host` から組み立てる形に変更されているため、path や port を含むエンドポイントオーバーライドを設定した場合も安全に動作します。
- 今後のリグレッションを避けるための ESLint ルール (`no-hardcoded-arn-partition` / `no-hardcoded-endpoint-tld`) が追加され、パーティション非対応な文字列リテラルや正規表現リテラルを検出するようになっています。

## バグ修正

### パッケージルートの entrypoint 欠落を修正 ([#186](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/186))

- `package.json` のルート `exports` が `dist/src/index.js` を指しているにもかかわらず、リポジトリに `src/index.ts` が存在せず、ビルドしても `runtime` などのサブパスは生成される一方でルート entrypoint が欠落していました。
- 本修正では `src/index.ts` を追加し、既存の公開モジュール (`identity`, `runtime`, `browser`, `codeInterpreter`) を namespace エクスポートとして公開します。`SessionInfo`, `DEFAULT_TIMEOUT`, `WebSocketConnection` など複数モジュールで重複する名前の衝突を避けるため、named ではなく namespace を採用しています。
- これにより `import('bedrock-agentcore')` がルートから解決できるようになり、`dist/src/index.js` および `dist/src/index.d.ts` が生成されます。

**修正後の使い方の例:**

```typescript
// ルートインポートで namespace 経由で各モジュールにアクセスできる。
import { runtime, identity, browser, codeInterpreter } from 'bedrock-agentcore'

const app = new runtime.BedrockAgentCoreApp()
```

### shipped source が依存する npm パッケージの宣言漏れを修正 ([#269](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/269))

- `bedrock-agentcore/runtime` が `@aws-sdk/credential-provider-node` を import していたものの、`package.json` の依存には含まれていませんでした。他の依存が偶然インストールしていたことで動作していただけで、pnpm (hoisting なし) や Bazel、一部の Lambda / コンテナビルドといった strict install 環境では import が失敗していました。
- 本修正では Runtime クライアント側で `@aws-sdk/credential-providers` (すでに依存宣言済み、Browser / Web Search クライアントも利用中) の `fromNodeProviderChain` に切り替え、新規の依存追加を避けています。
- あわせて、公開する `.d.ts` から型として参照している `@aws-sdk/types` および `@smithy/types` を `dependencies` に追加し、型定義の解決漏れも解消しました。

## まとめ

TypeScript SDK でも Python 版と同水準の A2A ホスティング体験が得られるようになり、AgentCore Runtime 上でのエージェントの相互運用と identity ラッパーの利用がシンプルになりました。あわせて中国パーティション対応や、strict install 環境での依存解決といった配布まわりの信頼性が改善されるリリースです。
