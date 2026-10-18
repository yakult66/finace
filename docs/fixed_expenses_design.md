# 固定支出項目開發計畫 (更新版)

## 🎯 核心目標與架構解耦 (Decoupling)
依照要求，「固定支出」將作為一個完全獨立的 Feature，與「薪資配置」解耦：
- **薪資配置 Feature** (`src/features/salary-allocation/`)：只負責薪資、投資、消費基金的計算與表單。
- **固定支出 Feature** (`src/features/fixed-expenses/`) **[NEW]**：負責一般固定支出與大額支出的 CRUD 與邏輯。

---

## 📂 資料模型 (`src/features/fixed-expenses/interfaces.ts`)

```typescript
export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  linkedLargeExpenseId?: string; // 若有值，代表是由大額支出連動產生的
}

export interface LargeExpense {
  id: string;
  name: string;
  totalAmount: number;       // 總金額
  accumulatedAmount: number; // 已有金額 (預設 0)
  paymentMonth: string;      // 繳款時間 (格式: YYYY-MM)
  isAveraged: boolean;       // 是否平均分攤 (連動開關)
}
```

---

## 🧠 複雜核心邏輯設計 (`useFixedExpenses.ts`)

### 1. 動態均攤計算 (Dynamic Installment Calculation)
當 `isAveraged` 為 `true` 時，不需讓使用者手動輸入期數，而是由系統「動態計算」並更新對應的一般固定支出金額：
- **剩餘金額** = `總金額` - `已有金額`
- **剩餘期數** = 從「下個月」算起，直到「繳款當月的前一個月」。
  *(例如：現在是 2026 年 8 月，繳款時間是 2026 年 12 月。能存錢的月份為 9, 10, 11 月，共計 3 期)*
- **每月均攤金額** = `剩餘金額 / 剩餘期數`。

### 2. 一般區塊的編輯防呆機制
- 系統會依據上述公式**自動計算**並把項目塞進「一般固定支出」中。
- 使用者**可以**在一般固定支出區塊中手動修改這個自動產生的金額。
- **重新觸發機制**：如果使用者去修改了大額支出（例如改了已有金額），系統會再次執行「自動均攤計算」並**覆蓋**過去手動修改的值，確保邏輯的一致性。

### 3. 跨模組資料連動 (Cross-Feature Reactivity)
- 將一般固定支出清單中的「所有金額加總」。
- 在 `useSalaryAllocation.ts` 中引入這個總和，並將其自動帶入「固定費用」的唯讀欄位，達成跨模組的資料連動。

---

## 🎨 UI 介面設計 (`FixedExpensesManager.vue`)

- **標籤切換 (Tab)**：在最外層視圖實作乾淨的切換按鈕 (薪資分配 / 固定支出項目)。
- **無背景 Icon 按鈕**：新增、編輯、刪除的動作都使用純 Icon (`pi-pencil`, `pi-trash`, `pi-plus`)，移除背景顏色，讓畫面更乾淨俐落。
- **雙區塊設計**：
  1. 上半部：一般固定支出清單 (顯示名稱、金額、操作 Icon)。
  2. 下半部：大額支出清單 (顯示名稱、進度條/差額、繳款年月、操作 Icon)。
