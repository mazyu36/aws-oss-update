---
title: "sdk-python v0.1.2"
version: "v0.1.2"
repository: "sdk-python"
repositoryDisplayName: "Python SDK"
releaseType: "stable"
date: 2025-05-18
summary: "トレーシング機能のシリアライゼーション問題と Bedrock モデルプロバイダーのリージョン設定に関する2つの重要なバグ修正を含むリリースです。画像や音声などのバイナリデータを含むトレースが正しく記録されるようになり、AWS_REGION 環境変数が適切に使用されるようになりました。"
releaseUrl: "https://github.com/strands-agents/sdk-python/releases/tag/v0.1.2"
---

## 概要

このリリースでは、トレーシング機能における非シリアライズ可能な値の処理と、Bedrock モデルプロバイダーのリージョン設定に関する2つの重要なバグ修正が含まれています。これらの修正により、画像や音声などのバイナリデータを扱うエージェントのトレースが正しく記録され、AWS の環境変数設定がより柔軟に利用できるようになりました。

**リリース:** [v0.1.2](https://github.com/strands-agents/sdk-python/releases/tag/v0.1.2)

## バグ修正

### トレーシング時の非シリアライズ可能な値の処理を修正 ([#34](https://github.com/strands-agents/sdk-python/pull/34))

画像、動画、音声などのバイナリデータ（bytes 型）を含むツール出力のトレーシングが正しく動作するようになりました。以前は、非シリアライズ可能なデータがツール以外の場所にも誤って `<replaced>` として表示される問題がありましたが、この修正により、実際にシリアライズできない bytes データのみが適切に置き換えられるようになりました。

**影響を受けていた状況:**
- 画像処理ツール（image_reader など）を使用した際のトレース
- バイナリデータを扱うツールの出力を含むトレース
- Langfuse などの observability プラットフォームでのトレース表示

**修正内容:**
- `strands.telemetry.tracer` モジュールでのシリアライゼーション処理を改善
- 非シリアライズ可能な値の検出とフィルタリングロジックを最適化

---

### Bedrock モデルプロバイダーで AWS_REGION 環境変数をサポート ([#39](https://github.com/strands-agents/sdk-python/pull/39))

Bedrock モデルプロバイダーが `AWS_REGION` 環境変数を自動的に認識するようになりました。`boto_session` を明示的に渡さない場合、SDK は環境変数からリージョン設定を読み取ります。これにより、AWS の標準的な環境変数設定パターンに従った柔軟な設定が可能になりました。

**影響を受けていた状況:**
- AWS Lambda や ECS などの AWS サービス上でエージェントを実行する場合
- 環境変数でリージョンを管理している開発環境
- boto_session を手動で設定せずに Bedrock を使用したい場合

**使用例:**

```python
import os
from strands import Agent
from strands.models import Bedrock

# AWS_REGION 環境変数を設定
os.environ["AWS_REGION"] = "us-east-1"

# boto_session を渡さずに Bedrock を使用
# SDK が自動的に AWS_REGION から設定を読み取ります
agent = Agent(
    system_prompt="You are a helpful assistant.",
    model=Bedrock(model_name="anthropic.claude-3-5-sonnet-20241022-v2:0")
)

response = agent("Hello!")
```

**ポイント:**
- `boto_session` を明示的に渡した場合は、そちらが優先されます
- 環境変数が設定されていない場合は、デフォルトの `us-west-2` が使用されます
- AWS の標準的な環境変数パターンに準拠しています

## まとめ

v0.1.2 は、トレーシング機能とクラウド環境での使い勝手を向上させる2つの重要なバグ修正を提供します。バイナリデータを扱うエージェントの開発者や AWS 環境でエージェントを運用している方にとって、より安定した動作が期待できるリリースです。
