# 當月薪資配置與 AWS 整合計畫

## 🎯 功能目標
1. 實作「當月薪資配置」功能模組（包含薪資收入、投資、與唯讀的固定費用/緊急備用金等，並自動結算剩餘零用金）。
2. **架構解耦 (Decoupling)**：將介面定義 (Interfaces) 拆分至各自的 Feature 資料夾中。
3. **雲端資料庫 (AWS)**：全面導入 AWS 服務作為資料儲存後台 (取代原先提議的 Firebase)。

---

## 📂 目錄與檔案結構
將會在專案中建立全新的 feature 資料夾與 AWS 設定：

- **`src/aws/`**
  - `config.ts` (AWS 服務初始化設定)
  - `useDb.ts` (共用的 AWS API 操作邏輯)
- **`src/features/salary-allocation/`**
  - `interfaces.ts` **[NEW]** (專屬此功能的介面定義，實現解耦)
  - `useSalaryAllocation.ts` (與 AWS 串接的核心邏輯)
  - `SalaryAllocationForm.vue` (填寫與計算表單元件)
- `src/views/SalaryAllocationView.vue` (整合顯示)

---

## 💾 資料模型 (Decoupled Interfaces)
在 `src/features/salary-allocation/interfaces.ts` 中定義：

```typescript
export interface SalaryAllocation {
  id: string;              // AWS DB 產生的 UUID 
  month: number;           // 幾月薪水 (1~12)
  payday: string;          // 發薪日 (YYYY-MM-DD)
  income: number;          // 薪資收入
  investment: number;      // 投資金額
  
  // 唯讀欄位快照
  fixedExpenses: number;   // 固定費用快照
  emergencyFund: number;   // 緊急備用金快照
  previousBalance: number; // 上月結餘快照
  
  createdAt: number;       // 建立時間戳記
}
```

---

## ☁️ AWS 串接邏輯 (`useSalaryAllocation.ts`)

1. **雲端架構設計**：
   - 資料將儲存於 AWS 的免費層級資料庫中 (通常為 **Amazon DynamoDB**)。
2. **資料同步機制**：
   - 將透過 API 呼叫 (GET/POST/PUT) 來取得與更新當月薪資設定。
3. **自動結算 (Computed)**：
   - `剩餘零用金 = (薪資收入 + 上月結餘) - (固定費用 + 緊急備用金 + 投資)`
