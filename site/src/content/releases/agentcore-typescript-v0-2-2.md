---
title: "AgentCore TypeScript SDK v0.2.2 リリース解説"
version: "v0.2.2"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-03-12
summary: "ブラウザセッションにプロキシ、拡張機能、プロファイルのサポートが追加され、新しい BrowserLiveView コンポーネントでリモートブラウザセッションのリアルタイム表示が可能になりました。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.2.2"
---

## 概要

このリリースでは、ブラウザ自動化機能が大幅に強化されました。**プロキシ、ブラウザ拡張機能、プロファイル設定**のサポートが追加され、さらに **BrowserLiveView** コンポーネントによりリモートブラウザセッションのリアルタイムストリーミング表示が可能になりました。

**リリース:** [v0.2.2](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.2.2)

## 新機能

### ブラウザセッションにプロキシ、拡張機能、プロファイルのサポートを追加 ([#72](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/72))

**この機能でできること:**
- **プロキシ設定**: 外部プロキシサーバー（BrightData など）を経由したブラウザアクセスや、特定ドメインのバイパス設定が可能
- **ブラウザ拡張機能**: S3 に配置した拡張機能をブラウザセッションに読み込み
- **プロファイル設定**: ブラウザプロファイルを複数セッション間で再利用

**使用例:**

```typescript
import { Browser } from 'bedrock-agentcore/browser';

const browser = new Browser({ region: 'us-east-1' });

// プロキシ設定付きでセッションを開始
await browser.startSession({
  proxy: {
    proxies: [
      {
        externalProxy: {
          server: 'proxy.example.com',
          port: 8080,
          domainPatterns: ['*.target-site.com'],
          credentials: {
            secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:proxy-creds',
          },
        },
      },
    ],
    bypass: {
      domainPatterns: ['internal.company.com'],
    },
  },
});

// S3 からブラウザ拡張機能を読み込んでセッションを開始
await browser.startSession({
  extensions: [
    {
      location: {
        s3: {
          bucket: 'my-extensions-bucket',
          prefix: 'extensions/ad-blocker/',
        },
      },
    },
  ],
});

// プロファイルを再利用してセッションを開始
await browser.startSession({
  profile: {
    profileIdentifier: 'user-profile-123',
  },
});
```

**ポイント:**
- プロキシ認証情報は AWS Secrets Manager で安全に管理
- 拡張機能は S3 バケットからバージョン指定での読み込みも可能
- プロファイルを使用することで、ログイン状態や設定を複数セッション間で維持可能

---

### ブラウザライブビュー機能 ([#92](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/92))

**この機能でできること:**
- **BrowserLiveView コンポーネント**: リモートブラウザセッションの DCV（Desktop Cloud Visualization）ストリームを React アプリケーション内に直接表示
- **自動スケーリング**: コンテナサイズに合わせて自動的にビューをスケーリング
- **SigV4 署名付き URL 生成**: `generateLiveViewUrl()` メソッドでセキュアな接続 URL を生成

**使用例:**

```typescript
import { Browser } from 'bedrock-agentcore/browser';
import { BrowserLiveView } from 'bedrock-agentcore/browser/live-view';

// ブラウザセッションを開始
const browser = new Browser({ region: 'us-east-1' });
await browser.startSession();

// ライブビュー用の署名付き URL を生成
const signedUrl = await browser.generateLiveViewUrl();

// React コンポーネントとして使用
function App() {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <BrowserLiveView signedUrl={signedUrl} />
    </div>
  );
}
```

**ポイント:**
- React 18 Strict Mode に対応（unmount/remount サイクルで安定動作）
- Nice DCV Web Client SDK がバンドル済みで追加インストール不要
- Vite を使用する場合は、ドキュメントの設定例（resolve.alias、viteStaticCopy）を参照してください

---

## まとめ

v0.2.2 はブラウザ自動化機能の大幅な強化リリースです。プロキシや拡張機能のサポートにより柔軟なブラウザ操作が可能になり、BrowserLiveView によってエージェントのブラウザ操作をリアルタイムで監視・デバッグできるようになりました。
