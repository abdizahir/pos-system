import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type PosState = {
  isSidebarOpen: boolean;
  isDeleteModalOpen: boolean;
  isCreateSrockModalOpen: boolean;
  isEditStockModalOpen: boolean;
  isCreateSaleModalOpen: boolean;
  isSaleDetailsModalOpen: boolean;

  isCreateSupplierModalOpen: boolean;
  isCreateCustomerModalOpen: boolean;
  isEditCustomerModalOpen: boolean;
  isDeleteCustomerModalOpen: boolean;
  isEditSupplierModalOpen: boolean;

  SupplierId: number | null;
  PurchaseId: number | null;
  CustomerId: number | null;

  isDeleteSupplierModalOpen: boolean;

  isCreatePurchaseModalOpen: boolean;
  isProductFormModalOpen: boolean;
  ProductId: number | null;
  isEditPurchasModalOpen: boolean;

  isInvoiceDetailsModalOpen: boolean;
  isCreateExpensesModalOpen: boolean;
  isEditExpansesModalOpen: boolean;
  isCreateAccountsModalOpen: boolean;
  isEditAccountsModalOpen: boolean;
  isDeleteAccountModalOpen: boolean;

};

const initialState: PosState = {
  isSidebarOpen: false,
  SupplierId: null,
  PurchaseId: null,
  CustomerId: null,
  isDeleteModalOpen: false,
  isCreateSrockModalOpen: false,
  isEditStockModalOpen: false,
  isCreateSaleModalOpen: false,
  isSaleDetailsModalOpen: false,
  isCreateSupplierModalOpen: false,
  isCreateCustomerModalOpen: false,
  isEditCustomerModalOpen: false,
  isDeleteCustomerModalOpen: false,
  isEditSupplierModalOpen: false,
  isDeleteSupplierModalOpen: false,
  isCreatePurchaseModalOpen: false,
  isProductFormModalOpen: false,
  ProductId: null,
  isEditPurchasModalOpen: false,
  isInvoiceDetailsModalOpen: false,
  isCreateExpensesModalOpen: false,
  isEditExpansesModalOpen: false,
  isCreateAccountsModalOpen: false,
  isEditAccountsModalOpen: false,
  isDeleteAccountModalOpen: false,
};

const posSlice = createSlice({
  name: "pos",
  initialState,
  reducers: {
    openSidebar: (state) => {
      state.isSidebarOpen = true;
    },
    closeSidebar: (state) => {
      state.isSidebarOpen = false;
    },
    openDeleteProduct: (state) => {
      state.isDeleteModalOpen = true;
    },
    closeDeleteProduct: (state) => {
      state.isDeleteModalOpen = false;
    },
    openCreateStock: (state) => {
      state.isCreateSrockModalOpen = true;
    },
    closeCreateStock: (state) => {
      state.isCreateSrockModalOpen = false;
    },
    openEditStock: (state) => {
      state.isEditStockModalOpen = true;
    },
    closeEditStock: (state) => {
      state.isEditStockModalOpen = false;
    },
    openInvoiceDetails: (state) => {
      state.isInvoiceDetailsModalOpen = true;
    },
    closeInvoiceDetails: (state) => {
      state.isInvoiceDetailsModalOpen = false;
    },
    openCreateSale: (state) => {
      state.isCreateSaleModalOpen = true;
    },
    closeCreateSale: (state) => {
      state.isCreateSaleModalOpen = false;
    },
    openSaleDetails: (state) => {
      state.isSaleDetailsModalOpen = true;
    },
    closeSaleDetails: (state) => {
      state.isSaleDetailsModalOpen = false;
    },
    setSupplierId: (state, action: PayloadAction<number>) => {
      state.SupplierId = action.payload;
    },
    setPurchaseId: (state, action: PayloadAction<number>) => {
      state.PurchaseId = action.payload;
    },
    setCustomerId: (state, action: PayloadAction<number>) => {
      state.CustomerId = action.payload;
    },
    openCreateCustomer: (state) => {
      state.isCreateCustomerModalOpen = true;
    },
    closeCreateCustomer: (state) => {
      state.isCreateCustomerModalOpen = false;
    },
    openEditCustomer: (state) => {
      state.isEditCustomerModalOpen = true;
    },
    closeEditCustomer: (state) => {
      state.isEditCustomerModalOpen = false;
      state.CustomerId = null;
    },
    openDeleteCustomer: (state) => {
      state.isDeleteCustomerModalOpen = true;
    },
    closeDeleteCustomer: (state) => {
      state.isDeleteCustomerModalOpen = false;
      state.CustomerId = null;
    },

    openCreateSupplier: (state) => {
      state.isCreateSupplierModalOpen = true;
    },
    closeCreateSupplier: (state) => {
      state.isCreateSupplierModalOpen = false;
    },
    openEditSupplier: (state) => {
      state.isEditSupplierModalOpen = true;
    },

    closeEditSupplier: (state) => {
      state.isEditSupplierModalOpen = false;
    },

    openDeleteSupplier: (state) => {
      state.isDeleteSupplierModalOpen = true;
    },
    closeDeleteSupplier: (state) => {
      state.isDeleteSupplierModalOpen = false;
    },
    openProductForm: (state, action: PayloadAction<number | null>) => {
      state.ProductId = action.payload;
      state.isProductFormModalOpen = true;
    },
    closeProductForm: (state) => {
      state.isProductFormModalOpen = false;
      state.ProductId = null;
    },
    openCreatePurchase: (state) => {
      state.isCreatePurchaseModalOpen = true;
    },
    closeCreatePurchase: (state) => {
      state.isCreatePurchaseModalOpen = false;
    },
    openEditPurchase: (state) => {
      state.isEditPurchasModalOpen = true;
    },

    closeEditPurchase: (state) => {
      state.isEditPurchasModalOpen = false;
    },
    openCreateExpenses: (state) => {
      state.isCreateExpensesModalOpen = true;
    },
    closeCreateExpenses: (state) => {
      state.isCreateExpensesModalOpen = false;
    },
    openEditExpenses: (state) => {
      state.isEditExpansesModalOpen = true;
    },

    closeEditExpenses: (state) => {
      state.isEditExpansesModalOpen = false;
    },
    openCreateAccounts: (state) => {
      state.isCreateAccountsModalOpen = true;
    },
    closeCreateAccounts: (state) => {
      state.isCreateAccountsModalOpen = false;
    },
    openEditAccounts: (state) => {
      state.isEditAccountsModalOpen = true;
    },

    closeEditAccounts: (state) => {
      state.isEditAccountsModalOpen = false;
    },
    openDeleteAccounts: (state) => {
      state.isDeleteAccountModalOpen = true;
    },

    closeDeleteAccounts: (state) => {
      state.isDeleteAccountModalOpen = false;
    },
  },
});

export const {
  openSidebar,
  closeSidebar,
  openDeleteProduct,
  closeDeleteProduct,
  openCreateStock,
  closeCreateStock,
  openEditStock,
  closeEditStock,
  openCreateSale,
  closeCreateSale,
  openSaleDetails,
  closeSaleDetails,
  openCreateSupplier,
  closeCreateSupplier,
  openEditSupplier,
  closeEditSupplier,
  openDeleteSupplier,
  closeDeleteSupplier,
  setSupplierId,
  setPurchaseId,
  setCustomerId,
  openProductForm,
  closeProductForm,
  openCreatePurchase,
  closeCreatePurchase,
  openEditPurchase,
  closeEditPurchase,
  openInvoiceDetails,
  closeInvoiceDetails,
  openCreateExpenses,
  closeCreateExpenses,
  openEditExpenses,
  closeEditExpenses,
  openCreateAccounts,
  closeCreateAccounts,
  openEditAccounts,
  closeEditAccounts,
  openDeleteAccounts,
  closeDeleteAccounts,
  openCreateCustomer,
  closeCreateCustomer,
  openEditCustomer,
  closeEditCustomer,
  openDeleteCustomer,
  closeDeleteCustomer,
} = posSlice.actions;
export default posSlice.reducer;
