# 架設 BDSM 網站 - 專屬開發規則與行為準則

<RULE[nextjs_tailwind_golden_standards]>
## Next.js + Tailwind CSS 開發規範
當在這個專案中撰寫或修改程式碼時，必須絕對遵守以下規範：
1. **React Server Components (RSC) 優先**：預設所有元件都必須是 Server Components。除非元件需要處理互動 (onClick, useState, useEffect 等)，否則**絕對禁止**在檔案頂端加入 "use client"。
2. **嚴格的 TypeScript**：完全禁止使用 ny 型別。如果型別未知，請使用 unknown 並進行 Runtime 檢查 (例如使用 Zod 或自訂檢查)。
3. **命名慣例**：
   - 資料夾、路由名稱：強制使用 kebab-case (例如 user-profile)。
   - React 元件名稱：強制使用 PascalCase (例如 UserProfile.tsx)。
4. **UI 優先使用 Tailwind**：不允許建立額外的 .css 或 .module.css 檔案。所有樣式修改必須透過 Tailwind 的 Utility Classes 達成。
5. **語言與註解**：所有的註解、控制台輸出 (console.log) 與文件說明，都必須使用繁體中文撰寫。
</RULE[nextjs_tailwind_golden_standards]>

<RULE[vibe_coding_and_prove_it]>
## 行為規範：Vibe Coding 與 Prove It
在每次幫使用者大幅度修改程式碼之前，必須遵守以下安全與透明度原則：
1. **先說明，後動作 (Show Your Work)**：永遠先用簡單的列表告訴使用者「我打算動哪幾個檔案、為什麼這樣動」，等得到同意或確保使用者明白後，再進行修改。
2. **禁止瞎猜 (Don't Guess)**：如果遇到 Error 或 Bug，必須先去讀取對應的 Log 或執行檢查指令。在找出具體原因之前，絕對不准盲目修改程式碼去「試錯」。
3. **Before & After 說明**：提供修改好的程式碼時，必須清楚標示「原本長怎樣」以及「現在改成了怎樣」。
</RULE[vibe_coding_and_prove_it]>

<RULE[auto_git_push]>
## 自動部署規範 (Auto Git Push)
當完成使用者要求的網站程式碼修改或新增功能後，**必須自動執行 Git 上傳**。
1. 使用 `git add .`、`git commit -m "[描述]"` 與 `git push` 指令將變更推送到遠端儲存庫。
2. 這能確保使用者的 Vercel 環境會自動觸發重新部署，讓使用者能第一時間在線上看到修改結果。
</RULE[auto_git_push]>

<RULE[anti_hallucination_and_empirical_proof]>
## 嚴格實證與反幻覺規範 (Anti-Hallucination & Empirical Proof Standard)
1. **禁止憑空宣稱成功**：在沒有透過工具取得「實際的畫面截圖」、「真實 DOM 文字」或「終端機 Log」之前，絕對禁止回報「已完成」或「已解決」。
2. **中斷即時如實回報**：若自動化腳本或子代理程式在執行過程中因中斷、重置或逾時停止，必須立即如實告訴使用者「在第幾步中斷了、哪些還沒測」，絕不可以修飾或掩蓋未完成的事實。
3. **全流程對比驗證**：所有功能修改與 UI 測試，必須提供明確的測試結果數據或截圖作為佐證。
</RULE[anti_hallucination_and_empirical_proof]>
