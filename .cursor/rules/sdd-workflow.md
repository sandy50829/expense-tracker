---
description: SDD (Spec-Driven Development) 開發流程規範，適用於所有功能開發
globs: ["src/**", "supabase/**"]
---

# SDD 開發流程規範

## 核心原則

**Spec 是最高原則。** 所有程式碼必須依據 `specs/` 目錄下的規格文件實作。

## 開發前檢查清單

在開始任何功能開發前，必須：

1. **確認對應 spec 存在**：檢查 `specs/features/` 或 `specs/components/` 下是否有對應文件
2. **閱讀完整 spec**：理解需求、資料模型、API 合約、UI 流程、邊界情況
3. **確認 spec 版本**：確保使用最新版本的 spec

## Spec 文件位置

```
specs/
├── PRD.md                    # 產品需求總覽
├── db-schema.md              # 資料庫 schema
├── api-contracts.md          # API 合約
├── ui-design.md              # UI/UX 設計規格
├── features/                 # 功能模組 spec
│   ├── auth.md
│   ├── notebook.md
│   ├── expense.md
│   ├── currency.md
│   ├── settlement.md
│   ├── realtime.md
│   └── pwa.md
└── components/               # 元件 spec
    ├── ui-components.md
    └── page-components.md
```

## 開發流程

1. **Spec First**: 先撰寫或確認 spec
2. **Branch**: 從 `develop` 建立功能分支 (e.g. `feat/notebook-crud`)
3. **Implement**: 依 spec 實作，不自行擴充未定義的功能
4. **Verify**: 對照 spec 的驗收條件逐項檢查
5. **Commit**: commit message 標注 `Refs: specs/path#section`
6. **PR**: 合併回 `develop`

## 當 spec 不足或需要變更時

- **不要直接修改程式碼來繞過 spec**
- 先更新 spec 文件，以 `spec` type 進行 commit
- 再依照更新後的 spec 實作

## 資料模型參考

所有資料表結構以 `specs/db-schema.md` 為準。TypeScript 型別定義必須與 spec 一致。

## API 合約參考

所有 Supabase query 以 `specs/api-contracts.md` 為準。不可自行新增未定義的 query 方式。

## UI 設計參考

- 色彩系統：`specs/ui-design.md` §2
- 排版系統：`specs/ui-design.md` §3
- 元件規格：`specs/components/ui-components.md`
- 頁面設計：`specs/components/page-components.md`
