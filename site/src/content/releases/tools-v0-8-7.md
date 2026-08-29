---
title: "Strands Tools v0.8.7 リリース解説"
version: "v0.8.7"
repository: "tools"
repositoryDisplayName: "Strands Tools"
releaseType: "stable"
date: 2026-08-28
summary: "MongoDB ドライバの handshake メタデータ追加による Strands Tools トラフィックの識別性向上に加え、calculator ツールの `cls=` 経由の任意コード実行を塞ぐセキュリティ修正、`use_aws` の send / invoke / run / execute / publish 系操作の consent ゲート漏れの修正、mem0 の OpenSearch 依存の遅延ロードが含まれます。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.8.7"
---

## 概要

このリリースは、MongoDB クライアントに Strands 由来であることを識別できる handshake メタデータを追加する新機能と、セキュリティ関連 2 件・依存関係の import タイミング 1 件のバグ修正で構成されています。特に `calculator` の `symbols(..., cls=N)` 経由で `sympify` に流れ込む任意コード実行と、`use_aws` の `send` / `invoke` / `run` / `execute` / `publish` 系操作が consent プロンプトなしで実行されていた問題は、該当ツールを利用しているユーザーへのアップグレードが推奨されます。

**リリース:** [v0.8.7](https://github.com/strands-agents/tools/releases/tag/v0.8.7)

## 新機能

### MongoDB ドライバの handshake メタデータ追加 ([#543](https://github.com/strands-agents/tools/pull/543))

**この機能でできること:**
- `mongodb_memory` ツールが `MongoClient` を構築する 2 箇所すべてに `driver=DriverInfo(name="Strands", version=...)` を渡すようになりました。これにより MongoDB サーバー側のテレメトリ（Atlas ダッシュボード、`db.currentOp()`、`mongod` ログ）で Strands Tools からのトラフィックを識別できます。
- バージョンは `importlib.metadata` により import 時に解決され、取得できない場合は `None` にフォールバックします（PyMongo 側で許容される値）。

**使用例:**

サーバー側ログには以下のような client metadata が出力されるようになります。

```json
{
  "t": {"$date": "2026-07-21T09:15:42.123+00:00"},
  "s": "I",
  "c": "NETWORK",
  "id": 51800,
  "ctx": "conn1",
  "msg": "client metadata",
  "attr": {
    "remote": "192.168.1.10:54321",
    "client": "conn1",
    "negotiatedCompressors": [],
    "doc": {
      "driver": {
        "name": "PyMongo|Strands",
        "version": "4.9.2|0.1.0"
      },
      "os": {
        "type": "Darwin",
        "name": "Darwin",
        "architecture": "arm64",
        "version": "26.5.2"
      },
      "platform": "CPython 3.10.3.final.0"
    }
  }
}
```

**ポイント:**
- 追加は module レベルの `_DRIVER_INFO` 定数として実装されており、`MongoDBMemoryTool` クラスメソッドとスタンドアロン `mongodb_memory` 関数の両方の `MongoClient(...)` 呼び出しで共通に使われます
- ドライバ名は `PyMongo|Strands` の形式で連結され、既存の PyMongo 情報を維持したまま追加情報として付与されます
- 詳細は [MongoDB handshake specification](https://github.com/mongodb/specifications/blob/master/source/mongodb-handshake/handshake.md) を参照してください

---

## バグ修正

### calculator: `symbols()` の `cls=` 経由の任意コード実行を修正 ([#585](https://github.com/strands-agents/tools/pull/585))

**修正内容:**

`calculator` ツールは全ての式を評価前に AST 許可リストで検証していますが、`Symbol` / `symbols` / `Rational` / `Integer` / `Float` などの安全な文字列コンストラクタの位置引数として現れる文字列リテラルは信頼していました。しかし、キーワード引数は検査されていませんでした。

`symbols()` はキーワード専用引数 `cls=` を受け取り、これは解析した名前に適用するコンストラクタを差し替えます。`symbols("<expr>", cls=N)` は事実上 `N("<expr>")` になり、文字列は SymPy の `sympify` を通じて再パースされます。`sympify` は builtins を含む環境で評価するため、細工した文字列が制限された名前空間を脱出してホスト上で任意コードを実行できていました。

- **修正前**: `symbols("<payload>", cls=N)` が検証を通過し、任意コードが実行される
- **修正後**: 位置引数の文字列は、呼び出しの全てのキーワードが真偽値の assumption フラグ（例: `positive=True`, `real=True`）で、かつ `**kwargs` のアンパックがない場合にのみ信頼される。`cls=<constructor>` などはこの条件から外れ、既存の検証エラーで拒否される

**引き続き使える例:**

```python
# 位置引数の文字列 + assumption キーワードは従来通り
Symbol('x')
symbols('x y')
Rational('1/3')
Symbol('x', positive=True)
```

**ポイント:**
- `calculator` ツールは非推奨ですが現行リリースでも同梱・実行可能なため、非推奨化とは独立に脆弱経路を塞ぐパッチです
- 移行を検討中のユーザーも、移行完了までは v0.8.7 へアップデートすることが推奨されます

---

### `use_aws` の send / invoke / run / execute / publish に consent プロンプトを適用 ([#584](https://github.com/strands-agents/tools/pull/584))

**修正内容:**

`use_aws` の consent ゲート（`MUTATIVE_OPERATIONS`）が `send` / `invoke` / `run` / `execute` / `publish` の各アクションクラスをカバーしていなかったため、`ses.send_email`、`lambda.invoke`、`ec2.run_instances`、`rds-data.execute_statement`、`sns.publish` などの副作用のある操作が confirmation プロンプトなしで実行されていました。

- **修正前**: 上記のような副作用系 AWS API 呼び出しが consent プロンプトなしで実行される
- **修正後**: `MUTATIVE_OPERATIONS` に `send`, `invoke`, `run`, `execute`, `publish` を追加。これらの操作は consent プロンプトをトリガする（`BYPASS_TOOL_CONSENT=true` でスキップ可能）

**設定:**

```bash
# 対話的な確認をスキップしたい場合（承認済み環境でのみ推奨）
export BYPASS_TOOL_CONSENT=true
```

**ポイント:**
- ゲートは動詞を部分文字列マッチで判定し、既存の動詞と同じく fail-safe に振る舞います（誤って表示されるプロンプトは無害、見逃されたプロンプトが脆弱性になる）
- 追加された各アクションクラスをカバーする parametrized test も同時に追加されています

---

### mem0: OpenSearch 依存を遅延ロード ([#540](https://github.com/strands-agents/tools/pull/540))

**修正内容:**

`strands_tools.mem0_memory` はモジュールロード時に OpenSearch のクラスを import していたため、FAISS のみを利用するユーザーであっても `opensearch-py` がインストールされていないと import 自体が失敗していました。

- **修正前**: FAISS バックエンドを使うだけでも `opensearch-py` のインストールが必須
- **修正後**: OpenSearch の import は OpenSearch 設定パス内に移動され、OpenSearch バックエンドが選択された場合にのみ実行される。未インストール時には該当パスで actionable なエラーメッセージが送出される

**ポイント:**
- 変更は import タイミングのみで、バックエンドの選択・OpenSearch の設定・認証・既存の `mem0-memory` extra には影響しません
- FAISS の import 境界と OpenSearch の依存欠如メッセージそれぞれに対するリグレッションテストが追加されています

## まとめ

MongoDB クライアントの識別性向上という小さな追加に加え、`calculator` と `use_aws` のセキュリティ強化、`mem0_memory` の依存関係境界の整理が含まれる実質的なバグ修正リリースです。特にセキュリティ関連の 2 件は該当ツールを利用しているユーザーは早めのアップグレードが推奨されます。
