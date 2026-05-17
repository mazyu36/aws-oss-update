---
title: "Strands TypeScript SDK v0.2.0 リリース解説"
version: "v0.2.0"
repository: "sdk-typescript"
repositoryDisplayName: "Strands TypeScript SDK"
releaseType: "stable"
date: 2026-01-29
summary: "モデル関連エラーの共通基底クラス ModelError が追加され、エラーハンドリングが統一化されました。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.2.0"
---

## 概要

このリリースでは、モデルプロバイダーから発生するエラーを統一的に扱うための基底クラス `ModelError` が追加されました。これにより、`ContextWindowOverflowError` や `MaxTokensError` などのモデル関連エラーを一括でキャッチしつつ、必要に応じて個別のエラータイプを識別できるようになります。

**リリース:** [v0.2.0](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.2.0)

## 新機能

### モデルエラー基底クラスの追加 ([#444](https://github.com/strands-agents/sdk-typescript/pull/444))

**この機能でできること:**
- `ModelError` を基底クラスとして、すべてのモデル関連エラーを統一的にキャッチできます
- `ContextWindowOverflowError` と `MaxTokensError` が `ModelError` を継承するようになりました
- `streamAggregated()` メソッドがモデルプロバイダーからのエラーを `ModelError` でラップするため、一貫したエラーハンドリングが可能です

**使用例:**

```typescript
import { Agent, ModelError, ContextWindowOverflowError, MaxTokensError } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk';

const agent = new Agent({
  model: new BedrockModel({ maxTokens: 1000 }),
  systemPrompt: 'You are a helpful assistant.',
});

try {
  const result = await agent.invoke('非常に長いプロンプト...');
} catch (error) {
  if (error instanceof ContextWindowOverflowError) {
    // コンテキストウィンドウオーバーフロー時の処理
    console.error('入力がモデルのコンテキストウィンドウを超えています');
  } else if (error instanceof MaxTokensError) {
    // 最大トークン数到達時の処理
    console.error('生成が最大トークン数に達しました');
    console.log('部分的な応答:', error.partialMessage);
  } else if (error instanceof ModelError) {
    // その他のモデル関連エラーをまとめてキャッチ
    console.error('モデルエラーが発生しました:', error.message);
    if (error.cause) {
      console.error('原因:', error.cause);
    }
  }
}
```

**エラーの継承階層:**

```
Error
└── ModelError (新規追加)
    ├── ContextWindowOverflowError
    └── MaxTokensError
```

**ポイント:**
- 既存の `ContextWindowOverflowError` や `MaxTokensError` を個別にキャッチするコードは引き続き動作します
- `ModelError` でキャッチすることで、将来追加されるモデル関連エラーも自動的に処理できます
- エラーの原因となった元のエラーは `cause` プロパティで取得可能です

## まとめ

このリリースでは、モデル関連エラーの共通基底クラス `ModelError` が追加され、エラーハンドリングの統一化と柔軟性が向上しました。
