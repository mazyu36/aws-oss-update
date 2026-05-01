---
title: "tools v0.1.1"
version: "v0.1.1"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-05-19
summary: "Mem0 Memory ツールの追加により、エージェントがユーザーとの対話履歴を記憶し、パーソナライズされた体験を提供できるようになりました。また、PyPI リンクの修正が含まれています。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.1.1"
---

## 概要

このリリースでは、エージェントにメモリ機能を追加する新しい Mem0 Memory ツールが導入されました。これにより、エージェントは過去の対話状態を記憶し、ユーザーごとにパーソナライズされた体験を提供できるようになります。また、README の PyPI リンクが正しいものに修正されました。

**リリース:** [v0.1.1](https://github.com/strands-agents/tools/releases/tag/v0.1.1)

## 新機能

### Mem0 Memory ツール ([#9](https://github.com/strands-agents/tools/pull/9))

**この機能でできること:**
- エージェントが過去の対話履歴や状態を記憶し、後続の対話で参照できるようになります
- ユーザーごとの情報を保存し、パーソナライズされた体験を提供できます
- メモリの追加、検索、更新、削除など、完全なメモリ管理機能を提供します

**使用例:**

```python
from strands_tools.mem0_memory import Mem0MemoryTool

# Mem0 Memory ツールの初期化
memory_tool = Mem0MemoryTool(
    api_key="your_mem0_api_key"
)

# メモリの追加
result = memory_tool.add(
    messages=[{"role": "user", "content": "私の名前は太郎です"}],
    user_id="user123"
)

# メモリの検索
memories = memory_tool.search(
    query="ユーザーの名前は？",
    user_id="user123"
)

# メモリの取得
all_memories = memory_tool.get_all(user_id="user123")

# メモリの更新
memory_tool.update(
    memory_id="mem_123",
    data="私の名前は太郎で、東京在住です"
)

# メモリの削除
memory_tool.delete(memory_id="mem_123")

# すべてのメモリの削除
memory_tool.delete_all(user_id="user123")
```

**ポイント:**
- API キーは Mem0 のサービスから取得する必要があります
- ユーザーごとに異なる `user_id` を指定することで、ユーザー単位でのメモリ管理が可能です
- メモリの検索、更新、削除など、柔軟なメモリ管理機能が提供されています
- エージェントとの対話をより自然で継続的なものにできます

---

## バグ修正

### PyPI リンクの修正 ([#8](https://github.com/strands-agents/tools/pull/8))
- README 内の PyPI リンクが誤った場所を参照していた問題を修正しました
- これにより、ユーザーが正しい PyPI パッケージページにアクセスできるようになりました

## まとめ

このリリースでは、エージェントにメモリ機能を提供する Mem0 Memory ツールが追加され、ユーザーごとのパーソナライズされた体験が可能になりました。また、ドキュメントの修正により、ユーザーがより簡単にパッケージ情報にアクセスできるようになっています。
