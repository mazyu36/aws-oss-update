---
title: "sdk-typescript v0.1.1"
version: "v0.1.1"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2025-12-03
summary: "MCP のセキュリティ脆弱性修正と README のサンプルコード改善を含むメンテナンスリリース。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.1"
---

## 概要

このリリースでは、MCP (Model Context Protocol) のセキュリティ脆弱性への対応と、README のサンプルコード改善が行われました。安全性と開発者体験の向上を目的としたメンテナンスリリースです。

**リリース:** [v0.1.1](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.1)

## バグ修正

### MCP のセキュリティ脆弱性修正 ([#307](https://github.com/strands-agents/sdk-typescript/pull/307))

MCP パッケージのセキュリティ脆弱性 ([GHSA-w48q-cv73-mx4w](https://github.com/advisories/GHSA-w48q-cv73-mx4w)) に対応しました。MCP を使用しているプロジェクトは、このバージョンへの更新を推奨します。

**変更内容:**
- `@modelcontextprotocol/sdk` のバージョンを最新版に更新
- セキュリティ脆弱性を含むバージョンの使用を回避

**影響:**
- MCP を使用している全てのプロジェクトに影響
- 既存のコードに対する互換性は維持されています

### README の MCP サンプルコード修正 ([#308](https://github.com/strands-agents/sdk-typescript/pull/308))

README に記載されていた MCP のサンプルコードを修正し、正しいインポート文と実際の examples ディレクトリのコードに合わせた内容に更新しました。

**修正内容:**
- `StdioClientTransport` のインポートを正しいパスに修正
- サンプルコードを実際に動作する形式に更新
- `disconnect()` の呼び出しを追加してリソース管理を改善

**修正後のコード:**

```typescript
import { Agent, McpClient } from "@strands-agents/sdk";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// ローカル MCP サーバーのクライアントを作成
const documentationTools = new McpClient({
  transport: new StdioClientTransport({
    command: "uvx",
    args: ["awslabs.aws-documentation-mcp-server@latest"],
  }),
});

const agent = new Agent({
  systemPrompt: "You are a helpful assistant using MCP tools.",
  tools: [documentationTools], // MCP クライアントをツールソースとして直接渡す
});

await agent.invoke("Use a random tool from the MCP server.");

// リソースの解放
await documentationTools.disconnect();
```

**ポイント:**
- `StdioClientTransport` は `@modelcontextprotocol/sdk` パッケージからインポートする必要があります
- 使用後は `disconnect()` を呼び出してリソースを適切に解放しましょう

## まとめ

このリリースでは、セキュリティの強化とドキュメントの改善が行われました。MCP を使用しているプロジェクトは、セキュリティ脆弱性への対応のため、早めの更新を推奨します。
