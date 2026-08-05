---
title: "AgentCore TypeScript SDK v0.4.2 リリース解説"
version: "v0.4.2"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-08-04
summary: "メンテナンスリリース: CI/CD ワークフローの共有再利用ワークフローへの移行、生成される統合ドキュメントの曖昧さ解消、invocation 入力バリデーションのドキュメント化とテスト追加、依存関係の更新などが含まれます。ユーザー向けの新機能やバグ修正はありません。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.2"
---

## 概要

このリリースはメンテナンスリリースです。ランタイムやパブリック API に対する新機能やバグ修正は含まれておらず、CI/CD ワークフローの共有化、生成ドキュメントの品質改善、`requestSchema` によるバリデーション挙動のドキュメント補足とテスト追加、依存関係のバージョン更新などの内部改善が中心となっています。

**リリース:** [v0.4.2](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.2)

## 変更内容

- **CI: 共有再利用可能ワークフローへの移行 ([#221](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/221))**
  ワークフローを組織内で共有されている reusable workflow に切り替え、リポジトリ間で CI 構成の一貫性を高めています。
- **CI: 共有 composite action の配線 ([#227](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/227))**
  共通処理を composite action に集約し、ワークフロー定義を簡潔化しました。
- **CI: 未使用の integration test secrets を削除 ([#231](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/231))**
  参照されていない secrets の取得失敗を解消するため、integration test から不要な secrets 参照を削除しています。
- **docs: 生成される integration ドキュメントの曖昧さを解消 ([#219](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/219))**
  Strands 統合と Vercel AI 統合のエントリを個別にラベリングし、安定した明示的アンカーを付与するとともに、AWS スタイルガイドと中国リブランディングチェックに合わせて生成された AsciiDoc を正規化しています。integration 名の重複に対する回帰テストも追加されています。
- **docs/test: invocation 入力バリデーションのドキュメント化とテスト追加 ([#236](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/236))**
  `requestSchema` が entrypoint への入力を検証することを README / runtime README / `types.ts` で明記し、スキーマ未指定のハンドラーは生のリクエストボディを受け取るため呼び出し側でのバリデーションが必要である点を明確化しました。string 型の prompt スキーマに対して非 string の prompt が 400 で拒否されることを確認するテストが追加されています (ランタイム挙動そのものの変更はありません)。
- **chore(deps): `find-my-way` を 9.5.0 → 9.7.0 に更新 ([#223](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/223))**
- **chore(deps): `fast-uri` を 3.1.2 → 3.1.5 に更新 ([#241](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/241))**

## まとめ

ユーザーコードへの影響がある変更はなく、CI/CD の共通化、生成ドキュメントの品質改善、`requestSchema` の挙動に関するドキュメント補強、依存関係の更新を中心としたメンテナンスリリースです。v0.4.1 からの移行は追加作業なしで実施できます。
