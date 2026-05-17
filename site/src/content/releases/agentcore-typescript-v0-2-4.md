---
title: "AgentCore TypeScript SDK v0.2.4 リリース解説"
version: "v0.2.4"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-05-12
summary: "BedrockAgentCoreApp.run() メソッドでポートとホストのカスタマイズが可能になりました。Python SDK と同様の API で柔軟なサーバー設定ができます。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.2.4"
---

## 概要

このリリースでは、`BedrockAgentCoreApp.run()` メソッドがオプションでポートとホストを受け取れるようになりました。これにより、Python SDK と同様の API で柔軟にサーバーの起動設定をカスタマイズできます。

**リリース:** [v0.2.4](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.2.4)

## バグ修正

### run() メソッドでポートとホストのカスタマイズが可能に ([#148](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/148))

`BedrockAgentCoreApp.run()` メソッドが `port` と `host` オプションを受け取れるようになりました。従来はポート 8080 がハードコードされていましたが、環境に応じて柔軟に変更できるようになりました。

**使用例:**

```typescript
import { BedrockAgentCoreApp } from 'bedrock-agentcore';

const app = new BedrockAgentCoreApp();

// デフォルト: ポート 8080、ホスト 0.0.0.0
app.run();

// カスタムポートを指定
app.run({ port: 3000 });

// カスタムホストを指定
app.run({ host: '127.0.0.1' });

// ポートとホストの両方を指定
app.run({ port: 3000, host: '127.0.0.1' });
```

**ポイント:**
- `port` のデフォルト値は `8080`
- `host` のデフォルト値は `'0.0.0.0'`
- Python SDK と同様の API 設計になっているため、両方の SDK を使用するプロジェクトでも一貫した設定が可能

## まとめ

サーバー起動時のポートとホストをカスタマイズできるようになり、開発環境や本番環境に応じた柔軟な設定が可能になりました。
