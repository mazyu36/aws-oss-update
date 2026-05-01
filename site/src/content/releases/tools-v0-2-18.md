---
title: "tools v0.2.18"
version: "v0.2.18"
repository: "tools"
repositoryDisplayName: "Tools"
releaseType: "stable"
date: 2025-12-15
summary: "retrieve ツールの inputSchema に欠落していた retrieveFilter パラメータを追加。エージェントが Knowledge Base のフィルタリング機能を発見して使用できるようになりました。"
releaseUrl: "https://github.com/strands-agents/tools/releases/tag/v0.2.18"
---

## 概要

Strands Agents Tools v0.2.18 では、retrieve ツールに関する重要なバグ修正が行われました。retrieveFilter パラメータが実装コードには存在していたにもかかわらず、TOOL_SPEC の inputSchema から欠落していたため、エージェントがこの機能を発見・使用できませんでした。このリリースで修正され、エージェントは AWS Bedrock Knowledge Base のフィルタリング機能を完全に活用できるようになります。

**リリース:** [v0.2.18](https://github.com/strands-agents/tools/releases/tag/v0.2.18)

## バグ修正

### retrieve ツールの TOOL_SPEC に retrieveFilter パラメータを追加 ([#292](https://github.com/strands-agents/tools/pull/292))

**修正内容:**
- retrieve ツールのバックエンドコードでは retrieveFilter パラメータが完全にサポートされていましたが、TOOL_SPEC の inputSchema から欠落していました
- この不整合により、エージェントがフィルタリング機能を発見・使用できない状態でした
- inputSchema に retrieveFilter を追加し、AWS Bedrock の RetrievalFilter API でサポートされているすべてのオペレーター（equals、notEquals、greaterThan、lessThan、in、notIn など）の包括的なドキュメントを含めました

**影響:**
- これまでエージェントはフィルタリング機能の存在を知ることができませんでした
- この修正により、エージェントは Knowledge Base からのドキュメント取得時に高度なフィルタリングを適用できるようになります

**使用例:**

```python
from strands import Agent
from strands_tools import get_retrieve_tool

# retrieve ツールをエージェントに追加
retrieve_tool = get_retrieve_tool(
    knowledge_base_id="YOUR_KB_ID",
    region_name="us-east-1"
)

agent = Agent(
    name="Research Assistant",
    tools=[retrieve_tool]
)

# エージェントは自動的に retrieveFilter パラメータを発見できます
response = agent("""
2023年以降に公開されたドキュメントから、機械学習に関する情報を取得してください。
年度のメタデータフィールドを使用してフィルタリングしてください。
""")

# エージェントは次のようなフィルタを構築できます:
# {
#   "equals": {
#     "key": "year",
#     "value": "2023"
#   }
# }
```

**サポートされるフィルタオペレーター:**
- **equals**: 完全一致
- **notEquals**: 不一致
- **greaterThan**: より大きい
- **greaterThanOrEquals**: 以上
- **lessThan**: より小さい
- **lessThanOrEquals**: 以下
- **in**: いずれかに一致
- **notIn**: いずれにも一致しない
- **startsWith**: 前方一致
- **listContains**: リストに含まれる
- **stringContains**: 文字列に含まれる
- **andAll**: すべての条件を満たす
- **orAll**: いずれかの条件を満たす

**ポイント:**
- バックエンドのフィルタ検証ロジックは既に実装済みで、既存のテスト（21/21）がすべてパスしています
- エージェントは Knowledge Base のメタデータスキーマに基づいて適切なフィルタを構築できます
- 複雑なフィルタ条件も andAll / orAll オペレーターを使用して組み合わせ可能です

---

## まとめ

v0.2.18 は小規模なバグ修正リリースですが、retrieve ツールの使い勝手を大幅に向上させる重要な修正が含まれています。エージェントが Knowledge Base のフィルタリング機能を完全に活用できるようになり、より精度の高いドキュメント取得が可能になります。
