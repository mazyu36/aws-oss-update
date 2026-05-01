---
title: "sdk-typescript v0.1.2"
version: "v0.1.2"
repository: "sdk-typescript"
repositoryDisplayName: "TypeScript SDK"
releaseType: "stable"
date: 2025-12-04
summary: "CommonJS モジュールシステムのサポートを改善し、require() での SDK インポートが正常に動作するようになりました。"
releaseUrl: "https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.2"
---

## 概要

このリリースでは、CommonJS モジュールシステムのサポートが改善されました。これにより、`require()` を使用したインポートが正常に動作するようになり、レガシーな Node.js プロジェクトや CommonJS ベースのプロジェクトでも Strands Agents TypeScript SDK を問題なく使用できるようになります。

**リリース:** [v0.1.2](https://github.com/strands-agents/sdk-typescript/releases/tag/v0.1.2)

## バグ修正

### CommonJS インポートのサポート改善 ([#316](https://github.com/strands-agents/sdk-typescript/pull/316))

package.json の exports フィールドを更新し、CommonJS スタイルのインポート（`require(...)`）に対応しました。以前は ES モジュール形式のインポートのみがサポートされていましたが、この修正により両方のモジュールシステムで SDK を使用できるようになりました。

**修正内容:**
- exports フィールドに `default` 条件を追加し、`import` と `require` の両方に対応
- `types` フィールドを最初に配置し、TypeScript の型解決を最適化
- CommonJS モジュールのテストを追加し、動作を検証

**使用例（CommonJS）:**

```javascript
// CommonJS スタイル
const { Agent } = require('@strands/sdk-typescript');

const agent = new Agent({
  name: 'my-agent',
  // ... 設定
});
```

**使用例（ES モジュール）:**

```typescript
// ES モジュールスタイル（従来通り）
import { Agent } from '@strands/sdk-typescript';

const agent = new Agent({
  name: 'my-agent',
  // ... 設定
});
```

**影響:**
- CommonJS プロジェクトで SDK のインポートが失敗していた問題が解消されました
- Node.js の条件付きエクスポート仕様に準拠し、より広範な環境での互換性が向上しました

## まとめ

このリリースでは、CommonJS モジュールシステムへの対応を改善し、より多くの Node.js プロジェクトで Strands Agents TypeScript SDK を使用できるようになりました。
