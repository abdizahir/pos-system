// filepath: c:\Users\Abdi\Documents\Repo\pos-system\client\src\api\api.ts

import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store/store";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ============================================================
// TYPES
// ============================================================

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

// ============================================================
// CATEGORY
// ============================================================

type Category = {
  id: number;
  name: string;
};

// ============================================================
// UNIT
// ============================================================

type Unit = {
  id: number;
  name: string;
};

// ============================================================
// CUSTOMER
// ============================================================
export type Customer = {
  id: number;
  fname: string;
  lname: string;
  phone: string;
  address: string;
  dueAmount: number;
};

export type CreateCustomerPayload = {
  fname: string;
  lname: string;
  phone: string;
  address: string;
};

export type UpdateCustomerPayload = CreateCustomerPayload & {
  id: number;
};

// ============================================================
// SUPPLIER
// ============================================================

type Supplier = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;

  dueAmount: number;

  _count?: {
    purchases: number;
    stockBatches: number;
  };
};

export type ProfitLoss = {
  from: string;
  to: string;
  revenue: {
    accounts: {
      id: number;
      code: string;
      name: string;
      amount: number;
    }[];
    total: number;
  };
  costOfSales: {
    accounts: {
      id: number;
      code: string;
      name: string;
      amount: number;
    }[];
    total: number;
  };
  operatingExpenses: {
    accounts: {
      id: number;
      code: string;
      name: string;
      amount: number;
    }[];
    total: number;
  };
  grossProfit: number;
  netProfit: number;
  isProfit: boolean;
};

type CreateSupplierInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type UpdateSupplierInput = {
  id: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

// ============================================================
// PRODUCT
// ============================================================

type Product = {
  id: number;
  productName: string;
  sku: string;
  barcode: string | null;

  categoryId: number;
  unitId: number;

  sellingPrice: number | string;
  stockQuantity: number;
  lowStockLimit: number;
  vat: number | string;

  category: Category;
  unit: Unit;

  stockBatches?: {
    id: number;
    quantity: number;
    purchasePrice: number | string;
    expiryDate: string | null;
    createdAt: string;
  }[];

  createdAt: string;
  updatedAt: string;
};

type CreateProductInput = {
  productName: string;
  barcode?: string;

  categoryId: number;
  unitId: number;

  sellingPrice?: number;
  lowStockLimit: number;
  vat: number;
};

type UpdateProductInput = Partial<CreateProductInput> & {
  id: number;
};

// ============================================================
// PURCHASE
// ============================================================

type PurchaseItem = {
  id: number;
  purchaseId: number;
  productId: number;
  stockBatchId: number | null;

  quantity: number;
  purchasePrice: number | string;
  discount: number | string;
  tax: number | string;
  lineTotal: number | string;

  createdAt: string;
  updatedAt: string;

  product?: Product;

  stockBatch?: {
    id: number;
    productId: number;
    userId: number | null;
    supplierId: number | null;
    purchaseId: number | null;

    quantity: number;
    purchasePrice: number | string;
    expiryDate: string | null;

    createdAt: string;
    updatedAt: string;
  } | null;
};

type Purchase = {
  id: number;
  reference: string;

  supplierId: number;
  userId: number;

  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;

  paidAmount: number | string;
  dueAmount: number | string;
  paymentMethod: "CASH" | "CARD" | "MOBILE" | "BANK" | null;
  accountId: number | null;

  status: "PENDING" | "COMPLETED" | "CANCELLED";

  notes: string | null;

  createdAt: string;
  updatedAt: string;

  supplier?: Supplier;

  user?: {
    id: number;
    email: string;
    role: string;
  };

  items: PurchaseItem[];

  stockBatches?: {
    id: number;
    productId: number;
    userId: number | null;
    supplierId: number | null;
    purchaseId: number | null;

    quantity: number;
    purchasePrice: number | string;
    expiryDate: string | null;

    createdAt: string;
    updatedAt: string;

    product?: Product;
    supplier?: Supplier;
  }[];
};

type CreatePurchaseItemInput = {
  productId: number;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  discount?: number;
  tax?: number;
  expiryDate?: string | null;
};

type CreatePurchaseInput = {
  supplierId: number;

  discount?: number;
  tax?: number;

  paidAmount?: number;
  paymentMethod?: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId?: number | null;

  notes?: string;

  items: CreatePurchaseItemInput[];
};

type UpdatePurchaseInput = {
  id: number;

  supplierId?: number;

  discount?: number;
  tax?: number;

  paidAmount?: number;
  paymentMethod?: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId?: number | null;

  notes?: string;

  items?: CreatePurchaseItemInput[];
};

type PaySupplierInput = {
  supplierId: number;
  amount: number;
  paymentMethod: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId?: number | null;
};

// ============================================================
// STOCK
// ============================================================

export interface Stock {
  id: number;
  productId: number;
  userId: number | null;

  quantity: number;
  purchasePrice: number | string;
  expiryDate: string | null;

  createdAt: string;
  updatedAt: string;

  product: {
    id: number;
    productName: string;
    sku: string;
    barcode: string | null;

    categoryId: number;
    unitId: number;

    sellingPrice: number | string;
    stockQuantity: number;
    lowStockLimit: number;
    vat: number | string;

    category: {
      id: number;
      name: string;
    };

    unit: {
      id: number;
      name: string;
    };
  };

  stockMovements?: StockMovement[];
  user?: User | null;
}

type StockMovement = {
  id: number;
  productId: number;
  userId: number | null;

  type: "PURCHASE" | "SALE" | "ADJUSTMENT" | "RETURN" | "OPENING";

  quantity: number;
  notes: string | null;

  createdAt: string;
  updatedAt: string;
};

type CreateOpeningStockInput = {
  items: {
    productId: number;
    quantity: number;
    purchasePrice: number;
    expiryDate: string | null;
  }[];
};

type OpeningStockResponse = {
  message: string;
  totalValue: number;
  data: {
    batches: Stock[];
    journalEntry: {
      id: number;
      date: string;
      reference: string | null;
      description: string | null;
      lines: {
        id: number;
        accountId: number;
        debit: number | string;
        credit: number | string;
      }[];
    };
  };
};

// ============================================================
// SALE
// ============================================================

type SaleItem = {
  id: number;
  saleId: number;
  productId: number;

  quantity: number;

  unitPrice: string;
  discount: string;
  tax: string;
  lineTotal: string;

  product?: Product;

  returnedQuantity: number;
};

type Payment = {
  id: number;
  saleId: number;
  accountId: number | null;

  method: "CASH" | "CARD" | "MOBILE" | "BANK";

  amount: string;
  reference: string | null;

  createdAt: string;
  updatedAt: string;
};

type Sale = {
  id: number;
  invoiceNumber: string;
  userId: number;

  subtotal: string;
  discount: string;
  tax: string;
  total: string;

  paidAmount: string;
  dueAmount: string;
  changeAmount: string;

  status: "PENDING" | "COMPLETED" | "CANCELLED" | "RETURNED";

  createdAt: string;
  updatedAt: string;

  items: SaleItem[];
  payments: Payment[];

  user?: User;
};

type CreateSaleInput = {
  userId: number;
  customerId?: number | null;

  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    discount: number;
    tax: number;
    lineTotal: number;
  }[];

  subtotal: number;
  discount: number;
  tax: number;
  total: number;

  paidAmount: number;
  dueAmount: number;
  changeAmount: number;

  payments: {
    method: "CASH" | "CARD" | "MOBILE" | "BANK";

    amount: number;
    reference: string | null;
    accountId?: number | null;
  }[];
};

// ============================================================
// SALE RETURN
// ============================================================

type CreateSaleReturnInput = {
  reason: string;
  notes?: string;

  items: {
    saleItemId: number;
    productId: number;
    quantity: number;
  }[];
};

type SaleReturnItem = {
  id: number;
  saleReturnId: number;
  saleItemId: number;
  productId: number;

  quantity: number;
  unitPrice: string;
  lineTotal: string;

  product?: {
    id: number;
    productName: string;
    sku: string;
  };

  saleItem?: {
    id: number;
    quantity: number;
    returnedQuantity: number;
    unitPrice: string;
  };
};

type SaleReturn = {
  id: number;
  saleId: number;

  reason: string;
  notes: string | null;

  subtotal: string;
  tax: string;
  total: string;

  createdAt: string;
  updatedAt: string;

  sale?: {
    id: number;
    invoiceNumber: string;
    createdAt: string;
    total: string;
  };

  items: SaleReturnItem[];
};

// ============================================================
// EXPENSE
// ============================================================

type Expense = {
  id: number;

  title: string;
  category: string;

  amount: number | string;
  date: string;

  paymentMethod: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId: number | null;

  reference: string | null;
  notes: string | null;

  userId: number;

  createdAt: string;
  updatedAt: string;

  user?: {
    id: number;
    email: string;
    role: string;
  };
};

type CreateExpenseInput = {
  title: string;
  category: string;

  amount: number;
  date: string;

  paymentMethod: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId?: number | null;

  reference?: string | null;
  notes?: string | null;
};

type UpdateExpenseInput = {
  id: number;

  title?: string;
  category?: string;

  amount?: number;
  date?: string;

  paymentMethod?: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId?: number | null;

  reference?: string | null;
  notes?: string | null;
};

// ============================================================
// ACCOUNT
// ============================================================

export type Account = {
  id: number;

  bankName: string | null;
  name: string;
  number: string;

  type: "BANK" | "WALLET" | "MERCHANT" | "CASH";

  currentBalance: number | string;

  status: "ACTIVE" | "INACTIVE";

  createdAt: string;
  updatedAt: string;
};

export type CreateAccountInput = {
  bankName: string;
  name: string;
  number: string;

  type: "BANK" | "WALLET" | "MERCHANT";

  status?: "ACTIVE" | "INACTIVE";
};

export type UpdateAccountInput = {
  id: number;

  bankName?: string;
  name?: string;
  number?: string;

  type?: "BANK" | "WALLET" | "MERCHANT";

  status?: "ACTIVE" | "INACTIVE";
};

export type LedgerType = "CASH" | "BANK" | "WALLET" | "MERCHANT";

export type LedgerStatement = {
  ledger: {
    type: LedgerType;
    code: string;
    name: string;
  };
  accounts: {
    id: number;
    bankName: string | null;
    name: string;
    number: string;
    type: Account["type"];
  }[];
  period: {
    from: string | null;
    to: string | null;
  };
  summary: {
    openingBalance: number;
    totalIn: number;
    totalOut: number;
    closingBalance: number;
    transactionCount: number;
  };
  transactions: {
    id: number;
    journalEntryId: number;
    date: string;
    source: string;
    reference: string | null;
    description: string;
    account: {
      id: number;
      bankName: string | null;
      name: string;
      number: string;
    } | null;
    amountIn: number;
    amountOut: number;
    balance: number;
  }[];
};

// ============================================================
// MONEY TRANSFER
// ============================================================

export type MoneyTransfer = {
  id: number;
  date: string;
  reference: string;
  number: string;
  amount: number | string;
  fromAccountId: number;
  toAccountId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;

  fromAccount: {
    id: number;
    bankName: string;
    name: string;
    number: string;
  };

  toAccount: {
    id: number;
    bankName: string;
    name: string;
    number: string;
  };
};

export type CreateMoneyTransferInput = {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
};

// ============================================================
// JOURNAL ENTRY
// ============================================================

export type JournalLine = {
  id: number;
  journalEntryId: number;
  accountId: number;

  debit: number | string;
  credit: number | string;

  account: {
    id: number;
    code: string;
    name: string;

    type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

    isActive: boolean;
  };
};

export type JournalEntry = {
  id: number;

  date: string;
  reference: string | null;
  description: string | null;

  createdAt: string;
  updatedAt: string;

  lines: JournalLine[];
};

export type CreateJournalEntryInput = {
  date?: string;
  reference?: string;
  description?: string;

  lines: {
    accountId: number;
    debit?: number;
    credit?: number;
  }[];
};

// ============================================================
// BALANCE SHEET
// ============================================================

export type BalanceSheet = {
  asOf: string;

  assets: {
    cash: number;
    bankAccounts: number;
    mobileWallets: number;
    merchantAccounts: number;
    inventory: number;
    accountsReceivable: number;
    otherAssets: number;
    total: number;
  };

  liabilities: {
    supplierPayables: number;
    loans: number;
    otherDebts: number;
    total: number;
  };

  equity: {
    ownersCapital: number;
    otherEquity: number;
    retainedProfit: number;
    total: number;
  };

  liabilitiesAndEquity: number;

  balanceDifference: number;

  isBalanced: boolean;

  accountBalances?: {
    code: string;
    name: string;

    type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

    amount: number;
  }[];
};

// ============================================================
// TRIAL BALANCE
// ============================================================

export type TrialBalanceAccount = {
  id: number;
  code: string;
  name: string;

  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

  debit: number;
  credit: number;
};

export type TrialBalance = {
  asOf: string;

  accounts: TrialBalanceAccount[];

  totalDebit: number;
  totalCredit: number;

  isBalanced: boolean;
  balanceDifference: number;
};

export type CashFlowLine = {
  id: string;
  date: string;
  type: "IN" | "OUT";
  category: string;
  reference: string;
  description: string;
  method: string | null;
  amount: number;
};

export type CashFlowCategory = {
  category: string;
  amount: number;
};

export type CashFlow = {
  from: string;
  to: string;
  granularity: "day" | "month";
  summary: {
    totalIn: number;
    totalOut: number;
    netChange: number;
    openingBalance: number;
    closingBalance: number;
    // Moved between own accounts; not counted as in/out
    transfers: number;
  };
  inflowsByCategory: CashFlowCategory[];
  outflowsByCategory: CashFlowCategory[];
  channels: { name: string; in: number; out: number; net: number }[];
  trend: { period: string; in: number; out: number; net: number; balance: number }[];
  transactions: CashFlowLine[];
};

// ============================================================
// DASHBOARD
// ============================================================

export type DashboardChannel = {
  key: "CASH" | "BANK" | "WALLET" | "MERCHANT";
  label: string;
  moneyIn: number;
  moneyOut: number;
  net: number;
  // Ledger balance at the end of the selected day
  balance: number;
};

export type Gender = "MALE" | "FEMALE";

export type Employee = {
  id: number;
  nationalId: string;
  fname: string;
  lname: string;
  gender: Gender;
  email: string | null;
  address: string | null;
  salary: number | string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeInput = {
  nationalId: string;
  fname: string;
  lname: string;
  gender: Gender;
  email: string | null;
  address: string | null;
  salary: number;
};

export type Owner = {
  id: number;
  nationalId: string;
  fname: string;
  lname: string;
  gender: Gender;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  totalWithdrawn: number;
  withdrawalCount: number;
};

export type OwnerInput = {
  nationalId: string;
  fname: string;
  lname: string;
  gender: Gender;
  email: string | null;
  address: string | null;
};

export type OwnerWithdrawal = {
  id: number;
  ownerId: number;
  amount: number | string;
  date: string;
  paymentMethod: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId: number | null;
  reference: string | null;
  notes: string | null;
  owner: { id: number; fname: string; lname: string };
  account: {
    id: number;
    bankName: string | null;
    name: string;
    number: string;
    type: Account["type"];
  } | null;
};

export type WithdrawalInput = {
  ownerId: number;
  amount: number;
  date: string;
  paymentMethod: OwnerWithdrawal["paymentMethod"];
  accountId: number | null;
  reference: string | null;
  notes: string | null;
};

export type SalaryPayment = {
  id: number;
  employeeId: number;
  period: string;
  amount: number | string;
  paidAt: string;
  paymentMethod: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId: number | null;
  reference: string | null;
  notes: string | null;
  employee: { id: number; fname: string; lname: string; nationalId: string };
  account: {
    id: number;
    bankName: string | null;
    name: string;
    number: string;
    type: Account["type"];
  } | null;
};

export type PaySalariesInput = {
  period: string;
  paidAt: string;
  paymentMethod: SalaryPayment["paymentMethod"];
  accountId: number | null;
  reference: string | null;
  notes: string | null;
  items: { employeeId: number; amount: number }[];
};

export type IncomePaymentMethod = "CASH" | "CARD" | "MOBILE" | "BANK";

export type Income = {
  id: number;
  title: string;
  category: string;
  amount: number | string;
  date: string;
  paymentMethod: IncomePaymentMethod;
  accountId: number | null;
  reference: string | null;
  notes: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  account: {
    id: number;
    bankName: string | null;
    name: string;
    number: string;
    type: Account["type"];
  } | null;
  user: { id: number; email: string };
};

export type IncomeInput = {
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: IncomePaymentMethod;
  accountId: number | null;
  reference: string | null;
  notes: string | null;
};

export type CloseOutPeriod = "day" | "week" | "month" | "year";

type CloseOutMethod = "CASH" | "CARD" | "MOBILE" | "BANK";

export type CloseOut = {
  period: CloseOutPeriod;
  from: string;
  to: string;
  generatedAt: string;

  sales: {
    count: number;
    itemsSold: number;
    gross: number;
    discounts: number;
    tax: number;
    total: number;
    paid: number;
    due: number;
    average: number;
    cancelledCount: number;
    cancelledTotal: number;
  };

  returns: {
    count: number;
    total: number;
    tax: number;
    byMethod: { method: CloseOutMethod | "NONE"; amount: number }[];
  };

  netSales: number;

  payments: { method: CloseOutMethod; count: number; amount: number }[];
  paymentsTotal: number;

  profit: {
    revenue: number;
    costOfSales: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
  };

  expenses: {
    count: number;
    total: number;
    byCategory: { category: string; amount: number }[];
    byMethod: { method: CloseOutMethod; amount: number }[];
  };

  purchases: {
    count: number;
    total: number;
    paid: number;
    due: number;
  };

  vat: {
    collected: number;
    reversed: number;
    paid: number;
    net: number;
    payable: number;
  };

  channels: {
    key: "CASH" | "BANK" | "WALLET" | "MERCHANT";
    label: string;
    opening: number;
    moneyIn: number;
    moneyOut: number;
    closing: number;
  }[];

  cashiers: { userId: number; email: string; count: number; total: number }[];

  topProducts: {
    productId: number;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }[];

  breakdown: { key: string; count: number; total: number }[];
};

export type ProfitInsights = {
  from: string;
  to: string;
  granularity: "day" | "month";
  totals: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  };
  orders: {
    count: number;
    itemsSold: number;
    revenue: number;
    profit: number;
    averageOrderValue: number;
    averageProfitPerOrder: number;
  };
  trend: {
    period: string;
    revenue: number;
    cogs: number;
    expenses: number;
    profit: number;
  }[];
  products: {
    productId: number;
    name: string;
    sku: string;
    category: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
  categories: {
    name: string;
    revenue: number;
    profit: number;
    quantity: number;
    margin: number;
  }[];
  expenses: { name: string; amount: number }[];
};

export type UserRole = "MANAGER" | "CASHIER";

export type Me = { id: number; email: string; role: UserRole };

export type StaffPerformance = {
  from: string;
  to: string;
  totals: { salesCount: number; netSales: number; refunded: number; itemsSold: number };
  staff: {
    userId: number;
    email: string;
    role: UserRole;
    isActive: boolean;
    salesCount: number;
    revenue: number;
    refunded: number;
    netSales: number;
    creditGiven: number;
    itemsSold: number;
    averageSale: number;
    returnsCount: number;
    lastSaleAt: string | null;
    share: number;
  }[];
};

export type ProductAlerts = {
  outOfStock: number;
  lowStock: number;
  expired: number;
  expiringSoon: number;
};

export type SaleSummary = {
  id: number;
  invoiceNumber: string;
  total: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "RETURNED";
  createdAt: string;
};

export type TaxAuthority =
  | "SOMALI_REGIONAL_STATE_REVENUE_BUREAU"
  | "JIGJIGA_CITY_REVENUE_BUREAU";

export type VatPayment = {
  id: number;
  authority: TaxAuthority;
  authorityName: string;
  amount: number | string;
  date: string;
  paymentMethod: "CASH" | "CARD" | "MOBILE" | "BANK";
  accountId: number | null;
  reference: string | null;
  notes: string | null;
  account: {
    id: number;
    bankName: string | null;
    name: string;
    number: string;
    type: Account["type"];
  } | null;
  user: { id: number; email: string };
};

export type VatPaymentInput = {
  authority: TaxAuthority;
  amount: number;
  date: string;
  paymentMethod: VatPayment["paymentMethod"];
  accountId: number | null;
  reference: string | null;
  notes: string | null;
};

export type VatSummary = {
  collected: number;
  reversed: number;
  paid: number;
  net: number;
  payable: number;
};

export type VatStatement = {
  from: string;
  to: string;
  rate: number;
  summary: {
    openingBalance: number;
    taxableSales: number;
    outputVat: number;
    reversedVat: number;
    netVat: number;
    paidVat: number;
    closingBalance: number;
  };
  transactions: {
    id: number;
    date: string;
    source: string;
    reference: string | null;
    description: string;
    saleId: number | null;
    vatPaymentId: number | null;
    authority: string | null;
    taxableAmount: number | null;
    vat: number;
    balance: number;
  }[];
};

export type Dashboard = {
  from: string;
  to: string;
  day: {
    revenue: number;
    salesCount: number;
    salesTotal: number;
    purchases: number;
    purchasesCount: number;
    expenses: number;
    expensesCount: number;
    costOfSales: number;
    grossProfit: number;
    netProfit: number;
  };
  channels: DashboardChannel[];
  vat: VatSummary;
  profitLoss: Pick<
    ProfitLoss,
    "revenue" | "costOfSales" | "operatingExpenses" | "grossProfit" | "netProfit"
  >;
  overall: {
    products: number;
    lowStock: number;
    outOfStock: number;
    customers: number;
    suppliers: number;
  };
};

// ============================================================
// API
// ============================================================

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/api/`,

  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

// An expired or invalid login sends the user back to the login page
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  apiContext,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, apiContext, extraOptions);
  const url = typeof args === "string" ? args : args.url;

  if (result.error?.status === 401 && !url.includes("auth/login")) {
    apiContext.dispatch({ type: "auth/clearToken" });
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",

  baseQuery,

  // ==========================================================
  // TAG TYPES
  // ==========================================================

  tagTypes: [
    "Product",
    "Category",
    "Unit",
    "Auth",
    "Stock",
    "Sale",
    "SaleReturn",
    "Supplier",
    "Customer",
    "Purchase",
    "Expense",
    "Income",
    "Employee",
    "Payroll",
    "Vat",
    "Me",
    "Staff",
    "Owner",
    "Account",
    "MoneyTransfer",
    "JournalEntry",
    "BalanceSheet",
    "TrialBalance",
    "ProfitLoss",
    "CashFlow",
  ],

  // ==========================================================
  // ENDPOINTS
  // ==========================================================

  endpoints: (builder) => ({
    // ========================================================
    // AUTH
    // ========================================================

    register: builder.mutation<
      {
        id: number;
        email: string;
        role: string;
      },
      {
        email: string;
        password: string;
      }
    >({
      query: (body) => ({
        url: "auth/register",
        method: "POST",
        body,
      }),
    }),

    login: builder.mutation<
      {
        token: string;
        user: {
          id: number;
          email: string;
          role: string;
        };
      },
      {
        email: string;
        password: string;
      }
    >({
      query: (body) => ({
        url: "auth/login",
        method: "POST",
        body,
      }),
    }),

    // ========================================================
    // PRODUCTS
    // ========================================================

    getProducts: builder.query<Product[], void>({
      query: () => "products",

      providesTags: (result) =>
        result
          ? [
              ...result.map((p) => ({
                type: "Product" as const,
                id: p.id,
              })),
              {
                type: "Product" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "Product" as const,
                id: "LIST",
              },
            ],
    }),

    getProduct: builder.query<Product, number>({
      query: (id) => `products/${id}`,

      providesTags: (_result, _error, id) => [
        {
          type: "Product",
          id,
        },
      ],
    }),

    createProduct: builder.mutation<Product, CreateProductInput>({
      query: (body) => ({
        url: "products",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "Product",
          id: "LIST",
        },
      ],
    }),

    updateProduct: builder.mutation<Product, UpdateProductInput>({
      query: ({ id, ...patch }) => ({
        url: `products/${id}`,
        method: "PUT",
        body: patch,
      }),

      invalidatesTags: (_result, _error, arg) => [
        {
          type: "Product",
          id: arg.id,
        },
        {
          type: "Product",
          id: "LIST",
        },
      ],
    }),

    deleteProduct: builder.mutation<void, { id: number }>({
      query: ({ id }) => ({
        url: `products/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, arg) => [
        {
          type: "Product",
          id: arg.id,
        },
        {
          type: "Product",
          id: "LIST",
        },
      ],
    }),

    // ========================================================
    // CATEGORIES
    // ========================================================

    getCategories: builder.query<Category[], void>({
      query: () => "categories",
      providesTags: ["Category"],
    }),

    // ========================================================
    // UNITS
    // ========================================================

    getUnits: builder.query<Unit[], void>({
      query: () => "units",
      providesTags: ["Unit"],
    }),

    // --------------------------------------------------
    // Customers
    // --------------------------------------------------

    getCustomers: builder.query<Customer[], void>({
      query: () => "/customers",

      providesTags: [
        {
          type: "Customer",
          id: "LIST",
        },
      ],
    }),

    getCustomer: builder.query<Customer, number>({
      query: (id) => `/customers/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Customer", id }],
    }),

    createCustomer: builder.mutation<Customer, CreateCustomerPayload>({
      query: (body) => ({
        url: "/customers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customer"],
    }),

    updateCustomer: builder.mutation<Customer, UpdateCustomerPayload>({
      query: ({ id, ...body }) => ({
        url: `/customers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Customer", id },
        "Customer",
      ],
    }),

    deleteCustomer: builder.mutation<void, number>({
      query: (id) => ({
        url: `/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Customer", id },
        "Customer",
      ],
    }),

    // ========================================================
    // SUPPLIERS
    // ========================================================

    getSuppliers: builder.query<Supplier[], void>({
      query: () => "suppliers",

      providesTags: (result) =>
        result
          ? [
              ...result.map((supplier) => ({
                type: "Supplier" as const,
                id: supplier.id,
              })),
              {
                type: "Supplier" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "Supplier" as const,
                id: "LIST",
              },
            ],
    }),

    getSupplier: builder.query<Supplier, number>({
      query: (id) => `suppliers/${id}`,

      providesTags: (_result, _error, id) => [
        {
          type: "Supplier",
          id,
        },
      ],
    }),

    createSupplier: builder.mutation<
      {
        message: string;
        supplier: Supplier;
      },
      CreateSupplierInput
    >({
      query: (body) => ({
        url: "suppliers",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "Supplier",
          id: "LIST",
        },
      ],
    }),

    updateSupplier: builder.mutation<
      {
        message: string;
        supplier: Supplier;
      },
      UpdateSupplierInput
    >({
      query: ({ id, ...data }) => ({
        url: `suppliers/${id}`,
        method: "PATCH",
        body: data,
      }),

      invalidatesTags: (_result, _error, { id }) => [
        {
          type: "Supplier",
          id,
        },
        {
          type: "Supplier",
          id: "LIST",
        },
      ],
    }),

    deleteSupplier: builder.mutation<
      {
        message: string;
        supplier: Supplier;
      },
      number
    >({
      query: (id) => ({
        url: "suppliers/" + id,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, id) => [
        {
          type: "Supplier",
          id,
        },
        {
          type: "Supplier",
          id: "LIST",
        },
      ],
    }),

    // ========================================================
    // PURCHASES
    // ========================================================

    getPurchases: builder.query<Purchase[], void>({
      query: () => "purchases",

      transformResponse: (response: { success: boolean; data: Purchase[] }) =>
        response.data,

      providesTags: (result) =>
        result
          ? [
              ...result.map((purchase) => ({
                type: "Purchase" as const,
                id: purchase.id,
              })),
              {
                type: "Purchase" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "Purchase" as const,
                id: "LIST",
              },
            ],
    }),

    getPurchase: builder.query<Purchase, number>({
      query: (id) => `purchases/${id}`,

      transformResponse: (response: { success: boolean; data: Purchase }) =>
        response.data,

      providesTags: (_result, _error, id) => [
        {
          type: "Purchase",
          id,
        },
      ],
    }),

    createPurchase: builder.mutation<Purchase, CreatePurchaseInput>({
      query: (body) => ({
        url: "purchases",
        method: "POST",
        body,
      }),

      transformResponse: (response: {
        success: boolean;
        message: string;
        data: Purchase;
      }) => response.data,

      invalidatesTags: [
        {
          type: "Purchase",
          id: "LIST",
        },
        {
          type: "Product",
          id: "LIST",
        },
        {
          type: "Stock",
          id: "LIST",
        },
        {
          type: "Supplier",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
      ],
    }),

    updatePurchase: builder.mutation<Purchase, UpdatePurchaseInput>({
      query: ({ id, ...data }) => ({
        url: `purchases/${id}`,
        method: "PATCH",
        body: data,
      }),

      transformResponse: (response: {
        success: boolean;
        message: string;
        data: Purchase;
      }) => response.data,

      invalidatesTags: (_result, _error, { id }) => [
        {
          type: "Purchase",
          id,
        },
        {
          type: "Purchase",
          id: "LIST",
        },
        {
          type: "Product",
          id: "LIST",
        },
        {
          type: "Stock",
          id: "LIST",
        },
        {
          type: "Supplier",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
      ],
    }),

    paySupplier: builder.mutation<
      {
        supplierId: number;
        supplierName: string;
        amountPaid: number;
        remainingPayable: number;
        updatedPurchaseIds: number[];
      },
      PaySupplierInput
    >({
      query: (body) => ({
        url: "purchases/pay-supplier",
        method: "POST",
        body,
      }),

      transformResponse: (response: {
        success: boolean;
        message: string;
        data: {
          supplierId: number;
          supplierName: string;
          amountPaid: number;
          remainingPayable: number;
          updatedPurchaseIds: number[];
        };
      }) => response.data,

      invalidatesTags: [
        {
          type: "Purchase",
          id: "LIST",
        },
        {
          type: "Supplier",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
        {
          type: "Account",
          id: "LIST",
        },
      ],
    }),

    cancelPurchase: builder.mutation<Purchase, number>({
      query: (id) => ({
        url: `purchases/${id}/cancel`,
        method: "PATCH",
        
      }),

      transformResponse: (response: {
        success: boolean;
        message: string;
        data: Purchase;
      }) => response.data,

      invalidatesTags: (_result, _error, id) => [
        {
          type: "Purchase",
          id,
        },
        {
          type: "Purchase",
          id: "LIST",
        },
        {
          type: "Product",
          id: "LIST",
        },
        {
          type: "Stock",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
        { type: "Supplier", id: "LIST" },
      ],
    }),

    updateStock: builder.mutation<
      Stock,
      {
        id: number;
        quantity: number;
        purchasePrice: number;
        expiryDate: string | null;
        notes?: string | null;
      }
    >({
      query: ({ id, quantity, purchasePrice, expiryDate, notes }) => ({
        url: `stocks/${id}`,
        method: "PATCH",
        body: {
          quantity,
          purchasePrice,
          expiryDate,
          notes,
        },
      }),

      invalidatesTags: (_result, _error, arg) => [
        {
          type: "Stock",
          id: arg.id,
        },
        {
          type: "Stock",
          id: "LIST",
        },
        {
          type: "Product",
          id: "LIST",
        },
      ],
    }),

    // ========================================================
    // OPENING STOCK
    // ========================================================

    createOpeningStock: builder.mutation<
      OpeningStockResponse,
      CreateOpeningStockInput
    >({
      query: (body) => ({
        url: "stocks/opening",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "Stock",
          id: "LIST",
        },
        {
          type: "Product",
          id: "LIST",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
        {
          type: "Account",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "ProfitLoss",
        },
      ],
    }),

    getStocks: builder.query<Stock[], void>({
      query: () => "stocks",

      providesTags: (result) =>
        result
          ? [
              ...result.map((stock) => ({
                type: "Stock" as const,
                id: stock.id,
              })),
              {
                type: "Stock" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "Stock" as const,
                id: "LIST",
              },
            ],
    }),

    getStock: builder.query<Stock, number>({
      query: (id) => `stocks/${id}`,

      providesTags: (_result, _error, id) => [
        {
          type: "Stock",
          id,
        },
      ],
    }),

    deleteStock: builder.mutation<void, { id: number }>({
      query: ({ id }) => ({
        url: `stocks/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, arg) => [
        {
          type: "Stock",
          id: arg.id,
        },
        {
          type: "Stock",
          id: "LIST",
        },
        {
          type: "Product",
          id: "LIST",
        },
      ],
    }),

    // ========================================================
    // SALES
    // ========================================================

    getSales: builder.query<Sale[], void>({
      query: () => "sales",

      providesTags: (result) =>
        result
          ? [
              ...result.map((s) => ({
                type: "Sale" as const,
                id: s.id,
              })),
              {
                type: "Sale" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "Sale" as const,
                id: "LIST",
              },
            ],
    }),

    getSale: builder.query<Sale, number>({
      query: (id) => `sales/${id}`,

      providesTags: (_result, _error, id) => [
        {
          type: "Sale",
          id,
        },
      ],
    }),

    createSale: builder.mutation<Sale, CreateSaleInput>({
      query: (body) => ({
        url: "sales",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "Product",
          id: "LIST",
        },
        {
          type: "Sale",
          id: "LIST",
        },
        {
          type: "Stock",
          id: "LIST",
        },
        {
          type: "Account",
          id: "LIST",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "ProfitLoss",
        },
        {
          type: "Customer",
          id: "LIST",
        },
      ],
    }),

    updateSale: builder.mutation<
      Sale,
      {
        id: number;

        data: {
          status: "PENDING" | "COMPLETED" | "CANCELLED";

          items: {
            saleItemId?: number;
            productId: number;
            quantity: number;
            unitPrice: number;
          }[];

          discountAmount: number;
          taxAmount: number;
          paymentMethod: string;
          paidAmount: number;
        };
      }
    >({
      query: ({ id, data }) => ({
        url: `sales/${id}`,
        method: "PATCH",
        body: data,
      }),

      invalidatesTags: (_result, _error, { id }) => [
        {
          type: "Sale",
          id,
        },
        {
          type: "Sale",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "ProfitLoss",
        },
      ],
    }),

    addSalePayment: builder.mutation<
      Sale,
      {
        saleId: number;

        data: {
          amount: number;

          method: "CASH" | "CARD" | "MOBILE" | "BANK";

          reference?: string | null;
        };
      }
    >({
      query: ({ saleId, data }) => ({
        url: `sales/${saleId}/payments`,
        method: "POST",
        body: data,
      }),

      invalidatesTags: (_result, _error, { saleId }) => [
        {
          type: "Sale",
          id: saleId,
        },
        {
          type: "Sale",
          id: "LIST",
        },
        {
          type: "Account",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
      ],
    }),

    cancelSale: builder.mutation<Sale, number>({
      query: (saleId) => ({
        url: `sales/${saleId}/cancel`,
        method: "PATCH",
      }),

      invalidatesTags: (_result, _error, saleId) => [
        {
          type: "Sale",
          id: saleId,
        },
        {
          type: "Sale",
          id: "LIST",
        },
        {
          type: "Product",
          id: "LIST",
        },
        {
          type: "Stock",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
      ],
    }),

    // ========================================================
    // SALE RETURNS
    // ========================================================

    createSaleReturn: builder.mutation<
      SaleReturn,
      {
        saleId: number;
        data: CreateSaleReturnInput;
      }
    >({
      query: ({ saleId, data }) => ({
        url: `sale-returns/${saleId}`,
        method: "POST",
        body: data,
      }),

      transformResponse: (response: { message: string; data: SaleReturn }) =>
        response.data,

      invalidatesTags: (_result, _error, { saleId }) => [
        {
          type: "Sale",
          id: saleId,
        },
        {
          type: "Sale",
          id: "LIST",
        },
        {
          type: "Stock",
          id: "LIST",
        },
        {
          type: "SaleReturn",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
      ],
    }),

    getSalesReturns: builder.query<SaleReturn[], void>({
      query: () => "sale-returns",

      transformResponse: (response: { data: SaleReturn[] }) => response.data,

      providesTags: (result) =>
        result
          ? [
              ...result.map((item) => ({
                type: "SaleReturn" as const,
                id: item.id,
              })),
              {
                type: "SaleReturn" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "SaleReturn" as const,
                id: "LIST",
              },
            ],
    }),

    getSaleReturns: builder.query<SaleReturn, number>({
      query: (id) => `sale-returns/${id}`,

      transformResponse: (response: { data: SaleReturn }) => response.data,

      providesTags: (_result, _error, id) => [
        {
          type: "SaleReturn",
          id,
        },
      ],
    }),

    // ========================================================
    // EXPENSES
    // ========================================================

    getExpenses: builder.query<Expense[], void>({
      query: () => "expenses",

      providesTags: (result) =>
        result
          ? [
              ...result.map((expense) => ({
                type: "Expense" as const,
                id: expense.id,
              })),
              {
                type: "Expense" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "Expense" as const,
                id: "LIST",
              },
            ],
    }),

    getExpense: builder.query<Expense, number>({
      query: (id) => `expenses/${id}`,

      providesTags: (_result, _error, id) => [
        {
          type: "Expense",
          id,
        },
      ],
    }),

    createExpense: builder.mutation<Expense, CreateExpenseInput>({
      query: (body) => ({
        url: "expenses",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "Expense",
          id: "LIST",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "ProfitLoss",
        },
      ],
    }),

    updateExpense: builder.mutation<Expense, UpdateExpenseInput>({
      query: ({ id, ...data }) => ({
        url: `expenses/${id}`,
        method: "PUT",
        body: data,
      }),

      invalidatesTags: (_result, _error, { id }) => [
        {
          type: "Expense",
          id,
        },
        {
          type: "Expense",
          id: "LIST",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "ProfitLoss",
        },
      ],
    }),

    deleteExpense: builder.mutation<
      {
        message: string;
      },
      number
    >({
      query: (id) => ({
        url: `expenses/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, id) => [
        {
          type: "Expense",
          id,
        },
        {
          type: "Expense",
          id: "LIST",
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
        {
          type: "ProfitLoss",
        },
      ],
    }),

    // ========================================================
    // ACCOUNTS
    // ========================================================

    getAccounts: builder.query<Account[], void>({
      query: () => "accounts",

      providesTags: (result) =>
        result
          ? [
              ...result.map((account) => ({
                type: "Account" as const,
                id: account.id,
              })),
              {
                type: "Account" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "Account" as const,
                id: "LIST",
              },
            ],
    }),

    getAccount: builder.query<Account, number>({
      query: (id) => `accounts/${id}`,

      providesTags: (_result, _error, id) => [
        {
          type: "Account",
          id,
        },
      ],
    }),

    getLedgerStatement: builder.query<
      LedgerStatement,
      { type: LedgerType; from?: string; to?: string; accountIds?: number[] }
    >({
      query: ({ type, from, to, accountIds }) => ({
        url: `accounts/ledger/${type}/statement`,
        params: {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(accountIds?.length ? { accountIds: accountIds.join(",") } : {}),
        },
      }),
    }),

    getLedgerBalances: builder.query<Record<LedgerType, number>, void>({
      query: () => "accounts/ledger/balances",
    }),

    createAccount: builder.mutation<Account, CreateAccountInput>({
      query: (body) => ({
        url: "accounts",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "Account",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
      ],
    }),

    updateAccount: builder.mutation<Account, UpdateAccountInput>({
      query: ({ id, ...data }) => ({
        url: `accounts/${id}`,
        method: "PUT",
        body: data,
      }),

      invalidatesTags: (_result, _error, { id }) => [
        {
          type: "Account",
          id,
        },
        {
          type: "Account",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
      ],
    }),

    deleteAccount: builder.mutation<
      {
        message: string;
      },
      number
    >({
      query: (id) => ({
        url: `accounts/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, id) => [
        {
          type: "Account",
          id,
        },
        {
          type: "Account",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
      ],
    }),

    // ========================================================
    // MONEY TRANSFERS
    // ========================================================

    getMoneyTransfers: builder.query<MoneyTransfer[], void>({
      query: () => "money-transfers",
      providesTags: (result) =>
        result
          ? [
              ...result.map((transfer) => ({
                type: "MoneyTransfer" as const,
                id: transfer.id,
              })),
              {
                type: "MoneyTransfer" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "MoneyTransfer" as const,
                id: "LIST",
              },
            ],
    }),

    createMoneyTransfer: builder.mutation<
      MoneyTransfer,
      CreateMoneyTransferInput
    >({
      query: (body) => ({
        url: "money-transfers",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        {
          type: "MoneyTransfer",
          id: "LIST",
        },
        {
          type: "Account",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
      ],
    }),

    // ========================================================
    // CashFlow
    // ========================================================

    getCashFlow: builder.query<CashFlow, { from: string; to: string }>({
      query: ({ from, to }) =>
        `cash-flow?from=${encodeURIComponent(
          from,
        )}&to=${encodeURIComponent(to)}`,
      providesTags: ["CashFlow"],
    }),

    // ========================================================
    // BALANCE SHEET
    // ========================================================

    getBalanceSheet: builder.query<BalanceSheet, { asOf: string }>({
      query: ({ asOf }) => `balance-sheet?asOf=${encodeURIComponent(asOf)}`,

      providesTags: ["BalanceSheet"],
    }),

    // ========================================================
    // TRIAL BALANCE
    // ========================================================

    getTrialBalance: builder.query<TrialBalance, { asOf: string }>({
      query: ({ asOf }) => `trial?asOf=${encodeURIComponent(asOf)}`,

      providesTags: ["TrialBalance"],
    }),

    // ========================================================
    // PROFIT & LOSS
    // ========================================================

    getProfitLoss: builder.query<ProfitLoss, { from: string; to: string }>({
      query: ({ from, to }) =>
        `reports/profit-loss?from=${encodeURIComponent(
          from,
        )}&to=${encodeURIComponent(to)}`,

      providesTags: ["ProfitLoss"],
    }),

    // ========================================================
    // DASHBOARD
    // ========================================================

    // ========================================================
    // EMPLOYEES
    // ========================================================

    getEmployees: builder.query<Employee[], void>({
      query: () => "employees",
      providesTags: [{ type: "Employee", id: "LIST" }],
    }),

    createEmployee: builder.mutation<Employee, EmployeeInput>({
      query: (body) => ({ url: "employees", method: "POST", body }),
      invalidatesTags: [{ type: "Employee", id: "LIST" }],
    }),

    updateEmployee: builder.mutation<Employee, EmployeeInput & { id: number }>({
      query: ({ id, ...body }) => ({
        url: `employees/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Employee", id: "LIST" }],
    }),

    deleteEmployee: builder.mutation<void, number>({
      query: (id) => ({ url: `employees/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Employee", id: "LIST" }],
    }),

    // ========================================================
    // OWNERS
    // ========================================================

    getOwners: builder.query<Owner[], void>({
      query: () => "owners",
      providesTags: [{ type: "Owner", id: "LIST" }],
    }),

    createOwner: builder.mutation<Owner, OwnerInput>({
      query: (body) => ({ url: "owners", method: "POST", body }),
      invalidatesTags: [{ type: "Owner", id: "LIST" }],
    }),

    updateOwner: builder.mutation<Owner, OwnerInput & { id: number }>({
      query: ({ id, ...body }) => ({ url: `owners/${id}`, method: "PUT", body }),
      invalidatesTags: [{ type: "Owner", id: "LIST" }],
    }),

    deleteOwner: builder.mutation<void, number>({
      query: (id) => ({ url: `owners/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Owner", id: "LIST" }],
    }),

    getOwnerWithdrawals: builder.query<OwnerWithdrawal[], number | void>({
      query: (ownerId) => ({
        url: "owners/withdrawals",
        params: ownerId ? { ownerId } : {},
      }),
      providesTags: [{ type: "Owner", id: "WITHDRAWALS" }],
    }),

    createWithdrawal: builder.mutation<OwnerWithdrawal, WithdrawalInput>({
      query: (body) => ({ url: "owners/withdrawals", method: "POST", body }),
      invalidatesTags: [{ type: "Owner", id: "WITHDRAWALS" },
        { type: "Owner", id: "LIST" },
        { type: "Account", id: "LIST" },
        { type: "JournalEntry", id: "LIST" },
        { type: "BalanceSheet" },
        { type: "TrialBalance" },
      ],
    }),

    undoWithdrawal: builder.mutation<void, number>({
      query: (id) => ({ url: `owners/withdrawals/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Owner", id: "WITHDRAWALS" },
        { type: "Owner", id: "LIST" },
        { type: "Account", id: "LIST" },
        { type: "JournalEntry", id: "LIST" },
        { type: "BalanceSheet" },
        { type: "TrialBalance" },
      ],
    }),

    getSalaryPayments: builder.query<SalaryPayment[], string>({
      query: (period) => ({ url: "payroll", params: { period } }),
      providesTags: [{ type: "Payroll", id: "LIST" }],
    }),

    paySalaries: builder.mutation<SalaryPayment[], PaySalariesInput>({
      query: (body) => ({ url: "payroll/pay", method: "POST", body }),
      invalidatesTags: [
        { type: "Payroll", id: "LIST" },
        { type: "Account", id: "LIST" },
        { type: "JournalEntry", id: "LIST" },
        { type: "BalanceSheet" },
        { type: "TrialBalance" },
        { type: "ProfitLoss" },
      ],
    }),

    undoSalaryPayment: builder.mutation<void, number>({
      query: (id) => ({ url: `payroll/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Payroll", id: "LIST" },
        { type: "Account", id: "LIST" },
        { type: "JournalEntry", id: "LIST" },
        { type: "BalanceSheet" },
        { type: "TrialBalance" },
        { type: "ProfitLoss" },
      ],
    }),

    // ========================================================
    // INCOME
    // ========================================================

    getIncomes: builder.query<Income[], { from?: string; to?: string }>({
      query: ({ from, to }) => ({
        url: "incomes",
        params: {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
      }),
      providesTags: [{ type: "Income", id: "LIST" }],
    }),

    createIncome: builder.mutation<Income, IncomeInput>({
      query: (body) => ({ url: "incomes", method: "POST", body }),
      invalidatesTags: [
        { type: "Income" as const, id: "LIST" },
        { type: "Account" as const, id: "LIST" },
        { type: "JournalEntry" as const, id: "LIST" },
        { type: "BalanceSheet" as const },
        { type: "TrialBalance" as const },
        { type: "ProfitLoss" as const },
      ],
    }),

    updateIncome: builder.mutation<Income, IncomeInput & { id: number }>({
      query: ({ id, ...body }) => ({
        url: `incomes/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        { type: "Income" as const, id: "LIST" },
        { type: "Account" as const, id: "LIST" },
        { type: "JournalEntry" as const, id: "LIST" },
        { type: "BalanceSheet" as const },
        { type: "TrialBalance" as const },
        { type: "ProfitLoss" as const },
      ],
    }),

    deleteIncome: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `incomes/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Income" as const, id: "LIST" },
        { type: "Account" as const, id: "LIST" },
        { type: "JournalEntry" as const, id: "LIST" },
        { type: "BalanceSheet" as const },
        { type: "TrialBalance" as const },
        { type: "ProfitLoss" as const },
      ],
    }),

    getProfitInsights: builder.query<ProfitInsights, { from: string; to: string }>({
      query: ({ from, to }) => ({
        url: "reports/profit-insights",
        params: { from, to },
      }),
      providesTags: ["ProfitLoss"],
    }),

    getCloseOut: builder.query<CloseOut, { period: CloseOutPeriod; date: string }>({
      query: ({ period, date }) => ({
        url: "reports/close-out",
        params: { period, date },
      }),
      providesTags: ["ProfitLoss", "Sale", "SaleReturn", "Expense", "Purchase"],
    }),

    // ========================================================
    // CURRENT USER, STAFF (manager)
    // ========================================================

    getMe: builder.query<Me, void>({
      query: () => "me",
      providesTags: ["Me"],
    }),

    getStaffPerformance: builder.query<StaffPerformance, { from: string; to: string }>({
      query: ({ from, to }) => ({ url: "staff/performance", params: { from, to } }),
      providesTags: ["Staff"],
    }),

    getProductAlerts: builder.query<ProductAlerts, void>({
      query: () => "products/alerts",
      providesTags: [{ type: "Product", id: "LIST" }, { type: "Stock", id: "LIST" }],
    }),

    getSalesSummary: builder.query<SaleSummary[], { from: string; to: string }>({
      query: ({ from, to }) => ({ url: "sales/summary", params: { from, to } }),
      providesTags: [{ type: "Sale", id: "LIST" }],
    }),

    getVatReport: builder.query<VatStatement, { from: string; to: string }>({
      query: ({ from, to }) => ({
        url: "reports/vat",
        params: { from, to },
      }),
      providesTags: ["Vat"],
    }),

    getVatPayable: builder.query<{ payable: number }, void>({
      query: () => "reports/vat/payable",
      providesTags: ["Vat"],
    }),

    getVatPayments: builder.query<VatPayment[], { from?: string; to?: string } | void>({
      query: (range) => ({
        url: "reports/vat/payments",
        params: {
          ...(range?.from ? { from: range.from } : {}),
          ...(range?.to ? { to: range.to } : {}),
        },
      }),
      providesTags: ["Vat"],
    }),

    createVatPayment: builder.mutation<VatPayment, VatPaymentInput>({
      query: (body) => ({ url: "reports/vat/payments", method: "POST", body }),
      invalidatesTags: [
        "Vat",
        { type: "Account", id: "LIST" },
        { type: "JournalEntry", id: "LIST" },
        { type: "BalanceSheet" },
        { type: "TrialBalance" },
        { type: "CashFlow" },
      ],
    }),

    undoVatPayment: builder.mutation<void, number>({
      query: (id) => ({ url: `reports/vat/payments/${id}`, method: "DELETE" }),
      invalidatesTags: [
        "Vat",
        { type: "Account", id: "LIST" },
        { type: "JournalEntry", id: "LIST" },
        { type: "BalanceSheet" },
        { type: "TrialBalance" },
        { type: "CashFlow" },
      ],
    }),

    getDashboard: builder.query<Dashboard, { date: string }>({
      query: ({ date }) => `dashboard?date=${encodeURIComponent(date)}`,
    }),

    // ========================================================
    // JOURNAL ENTRIES
    // ========================================================

    getJournalEntries: builder.query<JournalEntry[], void>({
      query: () => "journal-entries",

      providesTags: (result) =>
        result
          ? [
              ...result.map((entry) => ({
                type: "JournalEntry" as const,
                id: entry.id,
              })),
              {
                type: "JournalEntry" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "JournalEntry" as const,
                id: "LIST",
              },
            ],
    }),

    getJournalEntry: builder.query<JournalEntry, number>({
      query: (id) => `journal-entries/${id}`,

      providesTags: (_result, _error, id) => [
        {
          type: "JournalEntry",
          id,
        },
      ],
    }),

    createJournalEntry: builder.mutation<JournalEntry, CreateJournalEntryInput>(
      {
        query: (body) => ({
          url: "journal-entries",
          method: "POST",
          body,
        }),

        invalidatesTags: [
          {
            type: "JournalEntry",
            id: "LIST",
          },
          {
            type: "BalanceSheet",
          },
          {
            type: "TrialBalance",
          },
          {
            type: "ProfitLoss",
          },
        ],
      },
    ),

    deleteJournalEntry: builder.mutation<
      {
        message: string;
      },
      number
    >({
      query: (id) => ({
        url: `journal-entries/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, id) => [
        {
          type: "JournalEntry",
          id,
        },
        {
          type: "JournalEntry",
          id: "LIST",
        },
        {
          type: "BalanceSheet",
        },
        {
          type: "TrialBalance",
        },
      ],
    }),
  }),
});

// ============================================================
// EXPORTED HOOKS
// ============================================================

export const {
  // Auth
  useRegisterMutation,
  useLoginMutation,

  // Products
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,

  // Categories
  useGetCategoriesQuery,

  // Units
  useGetUnitsQuery,

  // Stock
  useGetStocksQuery,
  useGetStockQuery,
  useCreateOpeningStockMutation,
  useUpdateStockMutation,
  useDeleteStockMutation,

  // Sales
  useGetSalesQuery,
  useGetSaleQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useAddSalePaymentMutation,
  useCancelSaleMutation,

  // Sale Returns
  useCreateSaleReturnMutation,
  useGetSalesReturnsQuery,
  useGetSaleReturnsQuery,

  // Customers
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,

  // Suppliers
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useGetSupplierQuery,
  useGetSuppliersQuery,
  useDeleteSupplierMutation,

  // Purchases
  useGetPurchasesQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
  usePaySupplierMutation,
  useCancelPurchaseMutation,

  // Expenses
  useGetExpensesQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,

  // Accounts
  useGetAccountsQuery,
  useGetAccountQuery,
  useGetLedgerStatementQuery,
  useGetLedgerBalancesQuery,
  useGetVatReportQuery,
  useGetProductAlertsQuery,
  useGetMeQuery,
  useGetStaffPerformanceQuery,
  useGetSalesSummaryQuery,
  useGetVatPayableQuery,
  useGetVatPaymentsQuery,
  useCreateVatPaymentMutation,
  useUndoVatPaymentMutation,
  useGetProfitInsightsQuery,
  useGetCloseOutQuery,
  useGetIncomesQuery,
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetSalaryPaymentsQuery,
  useGetOwnersQuery,
  useCreateOwnerMutation,
  useUpdateOwnerMutation,
  useDeleteOwnerMutation,
  useGetOwnerWithdrawalsQuery,
  useCreateWithdrawalMutation,
  useUndoWithdrawalMutation,
  usePaySalariesMutation,
  useUndoSalaryPaymentMutation,
  useCreateIncomeMutation,
  useUpdateIncomeMutation,
  useDeleteIncomeMutation,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useGetMoneyTransfersQuery,
  useCreateMoneyTransferMutation,

  // Reports
  useGetBalanceSheetQuery,
  useGetTrialBalanceQuery,
  useGetProfitLossQuery,

  // Dashboard
  useGetDashboardQuery,

  // Journal Entries
  useGetJournalEntriesQuery,
  useGetJournalEntryQuery,
  useCreateJournalEntryMutation,
  useDeleteJournalEntryMutation,

  // cash flow
  useGetCashFlowQuery,
} = api;
