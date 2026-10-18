# 緊急備用金 (Emergency Fund) 功能設計與規格文件

## 🎯 1. 功能目標與架構願景
1. **資產配置多分頁 (Asset Allocation Tabs)**：
   - 仿照「當月薪資配置」之體驗，於資產配置頁籤建立次級 Tab 切換：
     1. **資產總計**：計算 `投資理財總額 + 緊急備用金累積總額`（現階段兩者相加，未來擴充投資報酬率與淨額計算）。
     2. **投資理財**：獨立 Feature 模組（骨架預留）。
     3. **緊急備用金**：本次核心獨立 Feature 模組。
2. **緊急備用金模組核心規格**：
   - **多目標獨立管理**：支援建立多個目標金額項目（不預設目標，由使用者自由新增）。
   - **每月存入設定（單一啟用與鎖定機制）**：
     - 每個目標可新增多筆每月存入計畫，但**只能有 1 筆處於「啟用」狀態**（互斥）。
     - 每筆存入設定具備「儲存」按鈕，按下後**金額永久鎖定不可編輯**；若要更換金額需「新增下一筆」，不再使用的項目可透過「刪除」移除。
     - **達標自動停用**：當該目標累積金額 >= 目標金額時，該目標底下所有每月存入狀態自動切換為「停用」。
   - **臨時新增 / 臨時支出**：支援各目標的非定期資金存入與應急支出紀錄，即時更新累積金額。
   - **頂部總看板**：唯讀顯示所有目標的累積總額（自動加總）、總目標金額、總達成進度與每月預計總存入。
3. **薪資分配跨模組連動**：
   - **當月薪資分配頁面 (`mode='current'`)**：
     - 「上月結餘」、「固定支出」、「緊急備用金」三欄位皆為**唯讀 (Read-only)**。
     - 其中「緊急備用金」數值自動取自**各目標中唯一啟用的每月存入金額總和**。
   - **歷史紀錄編輯 Modal (`mode='history'`)**：
     - 僅在歷史紀錄編輯彈窗中，允許使用者針對特定歷史月份快照進行手動編輯微調。
   - **發薪自動結算**：在「薪資分配」按下【儲存配置】或「歷史紀錄」儲存時，自動將款項結算計入緊急備用金目標的累積金額中。

---

## 📂 2. 目錄與檔案結構

```text
src/
├── features/
│   ├── emergency-fund/               # [NEW] 緊急備用金獨立模組
│   │   ├── interfaces.ts             # 資料介面定義
│   │   ├── useEmergencyFund.ts       # 核心業務邏輯、狀態管理、自動計算與結算
│   │   └── EmergencyFundManager.vue  # 緊急備用金管理主畫面
│   │
│   ├── investment/                   # [NEW] 投資理財預留模組
│   │   └── InvestmentOverview.vue    # 投資概況預留頁面
│   │
│   ├── asset-summary/                # [NEW] 資產總計預留模組
│   │   └── AssetSummaryView.vue      # 資產總計圖表與彙總卡片
│   │
│   ├── salary-allocation/
│   │   ├── interfaces.ts             # 更新介面註解
│   │   ├── useSalaryAllocation.ts    # 串接 useEmergencyFund 讀取啟用總額並自動結算
│   │   └── SalaryAllocationForm.vue  # 支援 mode (current 唯讀 / history 編輯)
│   │
│   └── salary-history/
│       └── SalaryHistory.vue         # 傳入 mode="history" 至 SalaryAllocationForm
│
└── views/
    └── AssetAllocationView.vue       # 包含 Tab 切換 (資產總計 / 投資理財 / 緊急備用金)
```

---

## 💾 3. 資料模型 (TypeScript Interfaces)

```typescript
/** 每月預設存入設定項目 */
export interface EmergencyDepositPlan {
  id: string;
  amount: number;          // 每月存入金額 (純數字，無上下箭頭)
  isActive: boolean;       // 啟用/停用 Switch (同一個 Goal 底下只能有 1 個 true)
  isLocked: boolean;       // 是否已儲存鎖定 (鎖定後金額不可編輯)
  createdAt: number;
}

/** 臨時新增 / 臨時支出異動紀錄 */
export interface EmergencyTransaction {
  id: string;
  type: 'deposit' | 'expense'; // 'deposit': 臨時新增, 'expense': 臨時支出
  name: string;                // 項目名稱
  amount: number;              // 異動金額
  date: string;                // 異動日期 (YYYY-MM-DD)
  createdAt: number;
}

/** 緊急備用金目標項目 */
export interface EmergencyGoal {
  id: string;
  name: string;                         // 目標名稱
  targetAmount: number;                 // 目標金額 (可輸入，預設 0，純數字)
  currentAmount: number;                // 累積金額 (唯讀，自動計算)
  depositPlans: EmergencyDepositPlan[]; // 每月存入設定清單
  transactions: EmergencyTransaction[]; // 臨時異動紀錄
  lastProcessedMonth?: string;          // 紀錄最後一次發薪日結算的月份 (YYYY-MM)，防重複扣款
  createdAt: number;
  updatedAt: number;
}
```

---

## ⚙️ 4. 核心邏輯與計算規則 (`useEmergencyFund.ts`)

1. **總累積金額 (`totalCurrentEmergencyFund`)**：
   $$\text{總累積} = \sum \text{goal.currentAmount}$$
2. **總目標金額 (`totalTargetEmergencyFund`)**：
   $$\text{總目標} = \sum \text{goal.targetAmount}$$
3. **每月薪資應扣緊急備用金總額 (`activeMonthlyDepositTotal`)**：
   $$\text{每月應扣總額} = \sum_{\text{goals}} (\text{該目標唯一啟用的 plan.amount})$$
4. **單一啟用互斥規則**：
   - 當某一 Plan 設為 `isActive = true`，自動將該目標底下的其餘 Plan 設為 `isActive = false`。
5. **儲存鎖定規則**：
   - Plan 建立後為可編輯，按下「儲存」按鈕後設 `isLocked = true`，金額不可再編輯。
6. **達標自動停用規則**：
   - 當 `goal.currentAmount >= goal.targetAmount` 且 `goal.targetAmount > 0` 時，自動將該目標下所有 Plan 設為 `isActive = false`。
7. **發薪日自動結算 (`processSalaryPayment`)**：
   - 傳入發薪月份 `YYYY-MM`，若 `goal.lastProcessedMonth !== currentMonthStr` 且存在啟用的 Plan，則將該 Plan 金額累加至 `goal.currentAmount`，並記錄 `lastProcessedMonth`。

---

## 🎨 5. 跨模組整合規範

- **薪資分配模組 (`SalaryAllocationForm.vue`)**：
  - 預設模式為 `'current'`。
  - 「上月結餘」、「固定支出」、「緊急備用金」設為**唯讀卡片/輸入框**，標記鎖定圖示 🔒。
  - 緊急備用金數值由 `useEmergencyFund.activeMonthlyDepositTotal` 自動響應帶入。
- **歷史紀錄模組 (`SalaryHistory.vue`)**：
  - 開啟編輯彈窗時，傳入 `mode="history"`，保留使用者手動微調歷史快照之彈性。
