---
name: deploy_helper
description: 當使用者要求發布、更新或上傳網站到雲端/Git時使用。自動檢查代碼、新增至 Git、產生標準 Commit 訊息並推送到 Vercel/GitHub。
---

# 網站一鍵發布助手 (Deploy Helper)

當你被呼叫執行這個技能時，請嚴格按照以下步驟執行：

1. **檢查狀態**：
   - 執行 git status 了解目前有哪些檔案被修改。
   
2. **自動修正 (Lint & Format)**：
   - 如果是 Node.js 專案，嘗試執行 
pm run lint 確保沒有重大語法錯誤。
   - (如果失敗，詢問使用者是否要強行發布，或是先讓我幫忙修復 Bug)。

3. **加入變更**：
   - 執行 git add . 將所有修改加入暫存區。

4. **產生標準 Commit 訊息**：
   - 根據剛才 git status 與修改的內容，使用 **Conventional Commits** 規範撰寫一段繁體中文的 commit 訊息。
   - 格式範例：eat: 新增首頁輪播圖 或 ix: 修正手機版導覽列破版問題。
   - 執行 git commit -m "你的訊息"。

5. **推送到遠端**：
   - 執行 git push。
   
6. **回報完成**：
   - 告知使用者已經成功推送到遠端，Vercel 應該已經開始自動構建了。
