import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import RequireRole from "../components/RequireRole";
import { MANAGEMENT } from "../features/auth/roles";
import AuthLayout from "../layouts/AuthLayout";
import LoginPage from "../features/auth/pages/LoginPage";
import CustomerPage from "../features/people/customer/pages/CustomerPage";

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
const EmployeesPage = lazy(
  () => import("../features/people/employees/pages/EmployeesPage"),
);
const VatPage = lazy(() => import("../features/finance/pages/VatPage"));
const AccountStatementPage = lazy(
  () => import("../features/finance/pages/AccountStatementPage"),
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
        // Sale modals open on top of the sales table
        path: "/sales",
        element: withSuspense(<SalePage />),
        children: [
          {
            path: ":id",
            element: withSuspense(
              <Modal size="lg">
                <SaleDetails />
              </Modal>,
            ),
          },
          {
            path: ":id/return",
            element: withSuspense(
              <Modal size="lg">
                <ReturnSale />
              </Modal>,
            ),
          },
          {
            path: ":id/resume",
            element: withSuspense(
              <Modal>
                <ResumeSale />
              </Modal>,
            ),
          },
          {
            path: ":id/cancel",
            element: withSuspense(
              <Modal size="sm">
                <CancelSale />
              </Modal>,
            ),
          },
        ],
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
        path: "/employees",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <EmployeesPage />
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
        path: "/account-statement",
        element: withSuspense(
          <RequireRole roles={MANAGEMENT}>
            <AccountStatementPage />
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
