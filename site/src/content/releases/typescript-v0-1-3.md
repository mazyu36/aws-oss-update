---
title: "sdk-typescript v0.1.3"
version: "v0.1.3"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2025-12-15
summary: "OpenAI モデルでの動的 API キー読み込み機能を追加し、bash vended tools のエクスポート問題を修正しました。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.3"
---

## 概要

このリリースでは、OpenAI モデルに動的 API キー読み込み機能が追加され、認証情報のローテーションやシークレットマネージャーとの統合が可能になりました。また、bash vended tools のインポートができなかった問題を修正しました。

**リリース:** [v0.1.3](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.3)

## 新機能

### OpenAI での動的 API キー読み込み ([#320](https://github.com/strands-agents/sdk-typescript/pull/320))

**この機能でできること:**
OpenAI モデルで API キーを静的な文字列だけでなく、非同期関数として動的に提供できるようになりました。これにより、認証情報のローテーション、シークレットマネージャーとの統合、リクエストごとの認証などのユースケースが可能になります。

**使用例:**

```typescript
import { OpenAIModel } from '@strands/sdk-typescript';

// 静的な文字列（従来の方法）
const staticModel = new OpenAIModel({
  modelId: 'gpt-4o',
  apiKey: 'sk-...'
});

// 動的な関数（新機能）
const dynamicModel = new OpenAIModel({
  modelId: 'gpt-4o',
  apiKey: async () => {
    // シークレットマネージャーから API キーを取得
    return await secretManager.getApiKey();
  }
});

// 認証情報のローテーション例
const rotatingModel = new OpenAIModel({
  modelId: 'gpt-4o',
  apiKey: async () => {
    const credentials = await getRotatingCredentials();
    return credentials.apiKey;
  }
});
```

**ポイント:**
- この変更は後方互換性があり、既存の文字列ベースの使用方法はそのまま動作します
- 関数は引数を受け取らず、`Promise<string>` を返す必要があります
- OpenAI SDK がリクエストごとに関数を呼び出し、返された値を検証します

## バグ修正

### Bash Vended Tools のエクスポート修正 ([#319](https://github.com/strands-agents/sdk-typescript/pull/319))
- `vended_tools/bash` の package.json エクスポートエントリが不足していたため、bash vended tools をインポートして使用できなかった問題を修正しました
- この修正により、`vended_tools/bash` を正常にインポートして使用できるようになりました

### Agent PR 作成ロジックの修正 ([#333](https://github.com/strands-agents/sdk-typescript/pull/333))
- Agent が PR 作成リンクを生成する際に、ハッシュや特殊文字が URL を破損させる問題を修正しました
- URL パラメータを適切にエンコードし、マークダウンリンクを使用してより良い表示を実現しました

## まとめ

v0.1.3 では、OpenAI モデルでの動的 API キー読み込み機能の追加と、重要なエクスポート問題の修正により、SDK の柔軟性と使いやすさが向上しました。
