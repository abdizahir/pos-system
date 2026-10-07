import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import RequireRole from "../components/RequireRole";
import { MANAGEMENT } from "../features/auth/roles";
import AuthLayout from "../layouts/AuthLayout";
import LoginPage from "../features/auth/pages/LoginPage";
import MoneyTransferPage from "../features/finance/pages/MoneyTransferPage";
import CustomerPage from "../features/people/customer/pages/CustomerPage";
import CashFlowPage from "../features/reports/pages/CashFlowPage";
import MoneyOverviewPage from "../features/finance/pages/MoneyOverviewPage";

const DashboardLayout = lazy(() => import("../layouts/DashboardLayout"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const ProductsPage = lazy(
  () => import("../features/products/pages/ProductsPage"),
);
const StockPage = lazy(() => import("../features/stock/pages/StockPage"));
const CreateStockPage = lazy(
  () => import("../features/stock/pages/CreateStockPage"),
);
const SalePage = lazy(() => import("../features/sales/pages/SalePage"));
const SaleDetails = lazy(
  () => import("../features/sales/components/ViewDetails"),
);
const Modal = lazy(() => import("../components/Modal"));
const ReturnSale = lazy(
  () => import("../features/sales/components/ReturnSale"),
);
const ResumeSale = lazy(
  () => import("../features/sales/components/ResumeSale"),
);
const CancelSale = lazy(
  () => import("../features/sales/components/CancelSale"),
);
const SaleReturnsPage = lazy(
  () => import("../features/sales/pages/SaleReturnsPage"),
);
const SaleReturnDetails = lazy(
  () => import("../features/sales/components/SaleReturnDetails"),
);
const SupplierPage = lazy(
  () => import("../features/people/supplier/pages/SupplierPage"),
);
const PurchasePage = lazy(
  () => import("../features/purchase/pages/PurchasePage"),
);
const POSPage = lazy(() => import("../features/pos/pages/PosPage"));
const ExpiredProductsPage = lazy(
  () => import("../features/products/pages/ExpiredProductsPage"),
);
const LowStocksPage = lazy(
  () => import("../features/products/pages/LowStocksPage"),
);
const InvoicePage = lazy(() => import("../features/sales/pages/InvoicePage"));
const ExpensesPage = lazy(
  () => import("../features/finance/pages/ExpensesPage"),
);
const BankAccountsPage = lazy(
  () => import("../features/finance/pages/BankAccountsPage"),
);
const StaffPage = lazy(() => import("../features/manager/pages/StaffPage"));
const OwnersPage = lazy(
  () => import("../features/people/owners/pages/OwnersPage"),
);
const EmployeesPage = lazy(
  () => import("../features/people/employees/pages/EmployeesPage"),
);
const IncomePage = lazy(
  () => import("../features/finance/pages/IncomePage"),
);
const VatPage = lazy(() => import("../features/finance/pages/VatPage"));
const LedgerStatementPage = lazy(
  () => import("../features/finance/pages/LedgerStatementPage"),
);
const BalanceSheetPage = lazy(
  () => import("../features/reports/pages/BalanceSheetPage"),
);
const TrialBalancePage = lazy(
  () => import("../features/reports/pages/TrialBalancePage"),
);
const ProfitLossPage = lazy(
  () => import("../features/reports/pages/ProfitLossPage"),
);
const CloseOutPage = lazy(
  () => import("../features/reports/pages/CloseOutPage"),
);

function withSuspense(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-6 text-gray-500">
          Loading...
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/",
        element: <Navigate to="/login" />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
    ],
  },
  // Dashboard application
  {
    element: withSuspense(<DashboardLayout />),
    children: [
      {
        path: "/dashboard",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT} redirect>
            <Dashboard />
          </RequireRole>,
        ),
      },

      {
        path: "/products",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <ProductsPage />
          </RequireRole>,
        ),
      },

      {
        path: "/expired-product",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <ExpiredProductsPage />
          </RequireRole>,
        ),
      },
      {
        path: "/low-stocks",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <LowStocksPage />
          </RequireRole>,
        ),
      },
      {
        path: "/stock",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <StockPage />
          </RequireRole>,
        ),
      },
      {
        path: "/stock/new",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <CreateStockPage />
          </RequireRole>,
        ),
      },
      {
        path: "/sales",
        element: withSuspense(<SalePage />),
      },
      {
        path: "/sales/:id",
        element: withSuspense(
          <Modal>
            <SaleDetails />
          </Modal>,
        ),
      },
      {
        path: "/sales/:id/return",
        element: withSuspense(
          <Modal>
            <ReturnSale />
          </Modal>,
        ),
      },
      {
        path: "/sales/:id/resume",
        element: withSuspense(
          <Modal>
            <ResumeSale />
          </Modal>,
        ),
      },
      // {
      //   path: "/sales/:id/complete",
      //   element: (
      //     <Modal>
      //       <CompleteSale />
      //     </Modal>
      //   ),
      // },
      {
        path: "/sales/:id/cancel",
        element: withSuspense(
          <Modal>
            <CancelSale />
          </Modal>,
        ),
      },
      {
        path: "/invoice",
        element: withSuspense(<InvoicePage />),
      },
      {
        path: "/sales-return",
        element: withSuspense(<SaleReturnsPage />),
      },
      {
        path: "/sale-returns/:id",
        element: withSuspense(
          <Modal>
            <SaleReturnDetails />
          </Modal>,
        ),
      },
      {
        path: "/suppliers",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <SupplierPage />
          </RequireRole>,
        ),
      },
      {
        path: "/customers",
        element: withSuspense(<CustomerPage />),
      },
      {
        path: "/purchase",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <PurchasePage />
          </RequireRole>,
        ),
      },
      {
        path: "/pos",
        element: withSuspense(<POSPage />),
      },
      {
        path: "/expenses",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <ExpensesPage />
          </RequireRole>,
        ),
      },
      {
        path: "/owners",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <OwnersPage />
          </RequireRole>,
        ),
      },
      {
        path: "/employees",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <EmployeesPage />
          </RequireRole>,
        ),
      },
      {
        path: "/income",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <IncomePage />
          </RequireRole>,
        ),
      },
      {
        path: "/accounts",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <BankAccountsPage />
          </RequireRole>,
        ),
      },
      {
        path: "/money-overview/:type/statement",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <LedgerStatementPage />
          </RequireRole>,
        ),
      },
      {
        path: "/balance-sheet",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <BalanceSheetPage />
          </RequireRole>,
        ),
      },
      {
        path: "/trial-balance",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <TrialBalancePage />
          </RequireRole>,
        ),
      },
      {
        path: "/vat",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <VatPage />
          </RequireRole>,
        ),
      },
      {
        path: "/profit-loss",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <ProfitLossPage />
          </RequireRole>,
        ),
      },
      {
        path: "/close-out",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <CloseOutPage />
          </RequireRole>,
        ),
      },
      {
        path: "/money-overview",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <MoneyOverviewPage />
          </RequireRole>,
        ),
      },
      {
        path: "/cash-flow",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <CashFlowPage />
          </RequireRole>,
        ),
      },
      {
        path: "/manager/staff",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <StaffPage />
          </RequireRole>,
        ),
      },
      {
        path: "/money-transfer",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <MoneyTransferPage />
          </RequireRole>,
        ),
      },
      // Later
      // {
      //   path: "/expired-product",
      //   element: <ExpiredProductsPage />,
      // },

      // {
      //   path: "/low-stocks",
      //   element: <LowStocksPage />,
      // },

      // {
      //   path: "/category",
      //   element: <CategoryPage />,
      // },

      // {
      //   path: "/manage-stock",
      //   element: <ManageStockPage />,
      // },

      // {
      //   path: "/sales",
      //   element: <SalesPage />,
      // },

      // {
      //   path: "/invoice",
      //   element: <InvoicePage />,
      // },
    ],
  },
]);
