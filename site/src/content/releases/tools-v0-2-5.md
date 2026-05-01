---
title: "tools v0.2.5"
version: "v0.2.5"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-08-26
summary: "mem0_memory ツールに設定可能な LLM 設定を追加、AgentCoreBrowser の初期化バグを修正、handoff_to_user のユーザープロンプト改善を実施。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.5"
---

## 概要

Strands Agents Tools v0.2.5 では、mem0_memory ツールの LLM 設定のカスタマイズ性向上、AgentCoreBrowser の重要なバグ修正、handoff_to_user ツールのユーザー体験改善が行われました。このリリースにより、開発者はより柔軟にツールを設定でき、より安定した動作が保証されます。

**リリース:** [v0.2.5](https://github.com/strands-agents/tools/releases/tag/v0.2.5)

## 新機能

### mem0_memory ツールに設定可能な LLM 設定を追加 ([#221](https://github.com/strands-agents/tools/pull/221))

**この機能でできること:**
- mem0_memory ツールで使用する LLM プロバイダーとモデルを環境変数でカスタマイズできるようになりました。OpenAI、Azure OpenAI、AWS Bedrock など、さまざまなプロバイダーをコード変更なしで切り替えられます。

**使用例:**

```python
import os
from strands_tools.mem0_memory import mem0_memory

# 環境変数で LLM 設定をカスタマイズ
os.environ["MEM0_LLM_PROVIDER"] = "openai"
os.environ["MEM0_LLM_MODEL"] = "gpt-4o"
os.environ["MEM0_LLM_TEMPERATURE"] = "0.7"
os.environ["MEM0_LLM_MAX_TOKENS"] = "2000"

# Embedder 設定もカスタマイズ可能
os.environ["MEM0_EMBEDDER_PROVIDER"] = "openai"
os.environ["MEM0_EMBEDDER_MODEL"] = "text-embedding-3-small"

# ツールを使用（設定は環境変数から自動的に読み込まれます）
from strands import Agent

agent = Agent(
    name="Memory Agent",
    tools=[mem0_memory]
)

response = agent("ユーザーの好みを記憶してください")
```

**ポイント:**
- デフォルト値が設定されているため、環境変数を設定しなくても動作します
- 温度（temperature）は自動的に float に、最大トークン数（max_tokens）は int に変換されます
- Mem0 Platform、OpenSearch、FAISS の 3 つのバックエンドモードすべてで動作します

---

## バグ修正

### AgentCoreBrowser の identifier パラメータ割り当て不足を修正 ([#225](https://github.com/strands-agents/tools/pull/225))
- AgentCoreBrowser の __init__ メソッドが identifier パラメータを受け取るが、self.identifier に割り当てていなかった問題を修正
- create_browser_session() メソッドで self.identifier にアクセスする際に AttributeError が発生していた問題を解決
- カスタム identifier を指定した場合も正しく動作するようになりました

### handoff_to_user のユーザープロンプト改善 ([#206](https://github.com/strands-agents/tools/pull/206))
- ユーザー入力プロンプトにエージェントのメッセージを含めるように改善
- STRANDS_TOOL_CONSOLE_MODE が無効の環境で、特にユーザー体験が向上
- プロンプトが「Your response: 」から「Agent requested user input: {message}\nYour response: 」に変更され、コンテキストが明確になりました

### handoff_to_user のコードスタイル修正 ([#229](https://github.com/strands-agents/tools/pull/229))
- handoff_to_user ツールのリンティングエラーを修正
- 120 文字の行長制限を超えていた部分を修正
- コードの可読性と保守性を向上

---

## まとめ

v0.2.5 は、mem0_memory ツールの柔軟性向上と重要なバグ修正を含む安定性重視のリリースです。環境変数による LLM 設定のカスタマイズ機能により、開発者はさまざまなモデルプロバイダーを簡単に試すことができます。また、AgentCoreBrowser の修正により、ブラウザツールがより安定して動作するようになりました。
