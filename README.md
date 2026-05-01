# AWS OSS Release Monitor

AWS 関連 OSS の各リポジトリのリリース情報を自動で監視し、Claude を使用してリリース解説記事を生成・公開するサイトです。

## 監視対象リポジトリ

`config/` ディレクトリに JSON ファイルを追加するだけで監視対象を増やせます。

| 設定ファイル | リポジトリ | 説明 |
|-------------|-----------|------|
| `python.json` | [strands-agents/sdk-python](https://github.com/strands-agents/sdk-python) | Strands Python SDK |
| `typescript.json` | [strands-agents/sdk-typescript](https://github.com/strands-agents/sdk-typescript) | Strands TypeScript SDK |
| `tools.json` | [strands-agents/tools](https://github.com/strands-agents/tools) | Strands Tools |
| `agentcore-python.json` | [aws/bedrock-agentcore-sdk-python](https://github.com/aws/bedrock-agentcore-sdk-python) | Bedrock AgentCore SDK Python |
| `agentcore-typescript.json` | [aws/bedrock-agentcore-sdk-typescript](https://github.com/aws/bedrock-agentcore-sdk-typescript) | Bedrock AgentCore SDK TypeScript |
| `cdk.json` | [aws/aws-cdk](https://github.com/aws/aws-cdk) | AWS CDK |

毎日 0:00 UTC に全リポジトリを順次チェックします。

## プロジェクト構成

```
.
├── .github/workflows/
│   ├── release-monitor.yml      # 単一の統合ワークフロー (全リポジトリを matrix で処理)
│   └── deploy.yml               # GitHub Pages デプロイ
├── config/                      # リポジトリ設定 (ファイルを追加するだけで監視対象を増やせる)
│   ├── python.json
│   ├── typescript.json
│   ├── tools.json
│   ├── agentcore-python.json
│   ├── agentcore-typescript.json
│   └── cdk.json
├── scripts/
│   └── migrate-cdk-articles.js  # cdk-update からの記事移行スクリプト (一度限り)
├── src/                         # リリース監視スクリプト
│   ├── check-releases.js        # エントリーポイント
│   ├── components/
│   │   └── ReleaseMonitor.js    # リリース監視ロジック
│   └── utils/
│       ├── config.js            # 設定読み込み
│       └── logger.js            # ログ出力
├── site/                        # Astro サイト
│   ├── src/
│   │   ├── content/
│   │   │   ├── config.ts        # コンテンツスキーマ定義
│   │   │   └── releases/        # 生成された記事 (.md)
│   │   ├── layouts/
│   │   │   └── BaseLayout.astro
│   │   └── pages/
│   │       ├── index.astro      # トップページ
│   │       ├── releases/[...slug].astro
│   │       └── rss.xml.ts
│   ├── astro.config.mjs
│   └── package.json
├── package.json
└── bun.lock
```

## 新しいリポジトリを追加する

1. `config/<shortName>.json` を作成する

   ```json
   {
     "github": {
       "owner": "aws",
       "repository": "aws-sdk-js-v3",
       "displayName": "AWS SDK for JavaScript v3",
       "shortName": "aws-sdk-js-v3",
       "targetBranch": "main"
     },
     "processing": {
       "maxRetries": 3,
       "retryIntervalMs": 30000,
       "includePrerelease": true
     },
     "site": {
       "baseUrl": "",
       "title": "AWS OSS Release Notes",
       "description": "AWS OSS リリースの解説サイト"
     }
   }
   ```

2. `site/src/content/config.ts` の `repository` enum に `shortName` を追加

3. `site/src/pages/index.astro` の `repositories` 配列に追加（フィルタ用）

次のワークフロー実行時に自動的に監視対象に含まれます。

## ローカル開発

### 前提条件

- [Bun](https://bun.sh/) がインストールされていること

### セットアップ

```bash
bun install
cd site && bun install
```

### サイトのローカル起動

```bash
cd site
bun run dev
```

http://localhost:4321 でサイトが起動します。

### サイトのビルド

```bash
cd site
bun run build
```

ビルド成果物は `site/dist/` に出力されます。

### リリースチェックの実行（ローカル）

```bash
# 特定の設定で実行
STRANDS_CONFIG=python GITHUB_TOKEN=<your-token> bun run check
STRANDS_CONFIG=cdk    GITHUB_TOKEN=<your-token> bun run check
```

## GitHub Actions ワークフロー

### リリース監視ワークフロー

`release-monitor.yml` 1本で全リポジトリを処理します。

- **自動実行**: 毎日 0:00 UTC に `config/*.json` を列挙し、matrix で各リポジトリを順次処理
- **手動実行**: `workflow_dispatch` で `config`（対象設定名）と `version`（特定バージョン）を指定可能
  - `config` 空欄 → 全リポジトリ
  - `config` 指定 + `version` 空欄 → そのリポジトリの新規リリースを自動検出
  - `config` 指定 + `version` 指定 → そのバージョンを強制的に処理

新しいリリースを検出すると、Claude Code Action を使用してリリース解説記事を生成し、Pull Request を作成します。

### デプロイワークフロー

`site/` ディレクトリ配下に変更があった場合、GitHub Pages に自動デプロイされます。

## GitHub の設定

### Secrets

| 名前 | 説明 |
|------|------|
| `AWS_ROLE_TO_ASSUME` | OIDC 認証用の IAM ロール ARN (Bedrock アクセス用) |

### Variables

| 名前 | 説明 |
|------|------|
| `SITE_URL` | サイトの URL (例: `https://mazyu36.github.io`) |
| `BASE_PATH` | ベースパス (例: `/aws-oss-update/`) |

### GitHub Pages 設定

1. Settings > Pages に移動
2. Source を「GitHub Actions」に設定

## 記事のフロントマター形式

```yaml
---
title: "sdk-python v1.21.0"
version: "v1.21.0"
repository: "python"  # shortName
repositoryDisplayName: "Strands Python"
releaseType: "stable"  # stable | prerelease | alpha
date: 2024-01-01
summary: "..."
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v1.21.0"
---
```

## 注意事項

本サイトの解説は AI が生成しています。ハルシネーションにより誤りが含まれる可能性があるため、正確な情報は公式リリースノートをご確認ください。

## ライセンス

MIT
