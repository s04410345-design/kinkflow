# 討論版檢舉流程設計

## Schema

既有 `public.reports` 保留作為檢舉主表，新增：

| 欄位 | 型別 | 規則 | 用途 |
|---|---|---|---|
| `category` | text | spam、harassment、safety、privacy、illegal、hate、self_harm、misinformation、other | 結構化檢舉原因 |
| `details` | text | 0–2,000 字 | 檢舉人補充說明 |
| `resolved_action` | text nullable | none、warn、hide_content、delete_content、restore_content | 管理員處理動作 |
| `admin_note` | text | 0–2,000 字 | 只給管理員看的處理備註 |
| `updated_at` | timestamptz | 預設 now() | 最後更新時間 |

新增 `public.report_events` 作為管理稽核事件表。每筆事件保存 `report_id`、`admin_id`、`from_status`、`to_status`、`action_type`、`resolved_action`、`admin_note` 和 `created_at`。表格啟用 RLS，只允許管理員讀寫，並保留 `on delete cascade` 讓檢舉刪除時不留下孤兒事件。

Migration 另加入目標與狀態索引、事件時間索引，以及每位會員對同一個目標在 `open`／`reviewing` 期間只能有一筆檢舉的 partial unique index。

## 狀態流程

| 目前狀態 | 下一步 | API action |
|---|---|---|
| open | reviewing | start_review |
| open／reviewing | resolved | resolve |
| open／reviewing | dismissed | dismiss |
| resolved／dismissed | open 或 reviewing | reopen／start_review |

目前後台 UI 提供「已處理」與「駁回」；API 同時保留 reviewing 和 reopen，方便日後加入更完整的工作佇列。

## API

### `POST /api/reports`

會員使用 Supabase access token 呼叫。Body：

```json
{
  "targetType": "forum_post",
  "targetId": "uuid",
  "category": "harassment",
  "details": "補充說明"
}
```

API 會檢查登入、request body 大小、速率限制、target type、UUID、分類、公開內容、不能檢舉自己，並用 partial unique index 阻擋重複檢舉。成功回傳 HTTP 201；未登入 401；格式錯誤 400；重複檢舉 409；內容不存在 404；過大 413。

### `GET /api/reports`

只允許管理員。支援 `status`、`limit` 和 `offset` 分頁參數，回傳檢舉分類、說明、狀態、處理動作、管理員備註和時間欄位。

### `PATCH /api/reports/[reportId]`

只允許管理員。Body：

```json
{
  "status": "resolved",
  "resolvedAction": "hide_content",
  "adminNote": "已確認違反社群規範"
}
```

API 會更新 `reports`、寫入 `report_events`，並寫入既有 `moderation_actions`。已處理狀態必須選擇實際處理動作，駁回可以使用 `none`。

## 前端流程

會員檢舉視窗使用分類下拉選單和補充說明文字框。後台列表顯示分類、內容、狀態和時間，管理員可以選擇提醒、隱藏、刪除、恢復或不變更內容，並輸入備註。

## 上線注意事項

`20260815_reports_workflow.sql` 目前只放在 repository，尚未套用正式 Supabase。正式套用前必須先在 Preview／staging 進行 migration preflight，確認既有 `reports` 資料符合新增 constraint，再由使用者確認後套用 production。
