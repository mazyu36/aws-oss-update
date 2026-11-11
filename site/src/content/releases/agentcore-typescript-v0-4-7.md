---
title: "AgentCore TypeScript SDK v0.4.7 リリース解説"
version: "v0.4.7"
repository: "agentcore-typescript"
repositoryDisplayName: "AgentCore TypeScript SDK"
releaseType: "stable"
date: 2026-11-10
summary: "getDataPlaneEndpoint のリージョンバリデーションと、BEDROCK_AGENTCORE_DATA_PLANE_ENDPOINT 環境変数オーバーライドの URL バリデーションが追加されました。既存の getGatewayMcpEndpoint と同じチェックロジックを共有ヘルパーに集約し、不正な入力が静かに通ってしまう不具合を解消しています。"
releaseUrl: "https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.7"
---

## 概要

このリリースでは、`getDataPlaneEndpoint` 関数に `getGatewayMcpEndpoint` と同じリージョン形式チェックが適用され、さらに組み立てた URL と `BEDROCK_AGENTCORE_DATA_PLANE_ENDPOINT` 環境変数によるオーバーライドの双方が `validateEndpointUrl` で検証されるようになりました。不正なリージョン文字列や、HTTPS でない / AWS ホストでないオーバーライドは、URL を返す代わりに例外を投げるようになっています。

**リリース:** [v0.4.7](https://github.com/aws/bedrock-agentcore-sdk-typescript/releases/tag/v0.4.7)

## バグ修正

### getDataPlaneEndpoint のリージョン検証と URL 検証を追加 ([#320](https://github.com/aws/bedrock-agentcore-sdk-typescript/pull/320))

**何が修正されたか:**

- `getDataPlaneEndpoint(region)` が、`getGatewayMcpEndpoint` と同じ正規表現 (`/^[a-z0-9-]+$/`) によるリージョン形式チェックを行うようになりました。これらのバリデーションは共有ヘルパー `validateRegion` に集約されています。
- 環境変数 `BEDROCK_AGENTCORE_DATA_PLANE_ENDPOINT` によるオーバーライドが `validateEndpointUrl` で検証されるようになりました。HTTPS でかつ AWS ホスト (`.amazonaws.com` / `.amazonaws.com.cn` / `.api.aws`) である必要があります。
- リージョンから組み立てる標準エンドポイント URL も、同じ `validateEndpointUrl` によってチェックされます。

**影響を受けていた状況:**

- 従来は、`US-WEST-2` のような大文字を含むリージョンや `us-east-1.example.com` のような末尾に余分なセグメントを持つ文字列をそのままエンドポイントの DNS 名に埋め込んだ URL を返していました。これらは不正な宛先として黙って通過していました。
- また、オーバーライドに `https://localhost:8080` や `https://api.example.com/bedrock` のような非 AWS ホスト、`http://...` のような非 HTTPS URL を設定しても、SDK 側ではエラーにならず、そのまま返していました。
- これらの入力は、`RuntimeClient.generatePresignedUrl`、`Browser.generateLiveViewUrl`、`Browser.generateWebSocketUrl` などで静かに不正な接続先になり得る状態でした。

**修正後の挙動:**

正しい入力 (例: `us-west-2`) に対する戻り値は従来どおり `https://bedrock-agentcore.us-west-2.amazonaws.com` のままで、互換性に影響はありません。不正入力のみ早期に例外として検出されます。

```typescript
import { getDataPlaneEndpoint } from 'bedrock-agentcore/_utils/endpoints'

// 正常系: 従来どおり
getDataPlaneEndpoint('us-west-2')
// => 'https://bedrock-agentcore.us-west-2.amazonaws.com'

getDataPlaneEndpoint('cn-northwest-1')
// => 'https://bedrock-agentcore.cn-northwest-1.amazonaws.com.cn'

// 不正なリージョンは Invalid region で throw
getDataPlaneEndpoint('US-WEST-2')
// => Error: Invalid region: 'US-WEST-2'. Expected a region such as 'us-east-1'.

getDataPlaneEndpoint('us-east-1.example.com')
// => Error: Invalid region: 'us-east-1.example.com'. ...
```

オーバーライドを使う場合は、HTTPS かつ AWS ホストである必要があります。

```typescript
// OK: ベータ / ガンマなど AWS 側のエンドポイント
process.env.BEDROCK_AGENTCORE_DATA_PLANE_ENDPOINT =
  'https://beta.bedrock-agentcore.us-west-2.amazonaws.com'

// NG: 非 AWS ホスト
process.env.BEDROCK_AGENTCORE_DATA_PLANE_ENDPOINT = 'https://localhost:8080'
// => Error: non-AWS host

// NG: HTTP
process.env.BEDROCK_AGENTCORE_DATA_PLANE_ENDPOINT =
  'http://beta.bedrock-agentcore.us-west-2.amazonaws.com'
// => Error: must use https

// NG: URL として解釈できない
process.env.BEDROCK_AGENTCORE_DATA_PLANE_ENDPOINT = 'not a url'
// => Error: Not a valid endpoint URL
```

**ポイント:**

- リージョン文字列はアプリ内でハードコードされているケースが多いため、通常の利用では影響は出ません。環境変数や外部設定からリージョンを受け取っているパスがある場合は、大文字混在や余分なセグメントを渡していないか確認してください。
- オーバーライド環境変数を使ったテスト用セットアップで、過去に `https://localhost:xxxx` や独自ドメインを指していた場合は、AWS ホスト側のベータ / ガンマなど HTTPS エンドポイントに置き換えるか、オーバーライドを外す必要があります。
- バリデーションに失敗した場合は URL を返さず、`Error` を throw するため、呼び出し側では `try/catch` で検出するか、起動時の設定チェックとして例外を扱ってください。

## まとめ

`getDataPlaneEndpoint` の入力検証が `getGatewayMcpEndpoint` と揃えられ、不正なリージョンやオーバーライドが静かに不正な URL を生成してしまう問題が解消されました。正常系の戻り値には変化がないため、通常の利用では追加の対応は不要ですが、オーバーライド環境変数に非 AWS ホストや HTTP を設定しているセットアップでは明示的な例外が発生する点に注意してください。
