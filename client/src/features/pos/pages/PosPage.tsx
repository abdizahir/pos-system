import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import type { RootState } from "../../../store/store";
import {
  useCreateSaleMutation,
  useGetProductsQuery,
  useGetAccountsQuery,
  useGetCustomersQuery,
} from "../../../api/api";
import { closeCreateSale } from "../../../store/posSlice";
import {
  FiTrash2,
  FiMinus,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiUser,
  FiDollarSign,
  FiCreditCard,
  FiSmartphone,
  FiHome,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiPackage,
} from "react-icons/fi";
import type { IconType } from "react-icons";

type CartItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  lineTotal: number;
};

type JwtPayload = {
  id: number;
  email: string;
  role: string;
};

type PaymentMethod = "CASH" | "CARD" | "MOBILE" | "BANK";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: IconType }[] = [
  { value: "CASH", label: "Cash", icon: FiDollarSign },
  { value: "CARD", label: "Card", icon: FiCreditCard },
  { value: "MOBILE", label: "Mobile", icon: FiSmartphone },
  { value: "BANK", label: "Bank", icon: FiHome },
];

const VAT_OPTIONS = [
  { value: "0", label: "No VAT" },
  { value: "0.15", label: "VAT 15%" },
];

const round2 = (value: number) => Math.round(value * 100) / 100;

const money = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

const getErrorMessage = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "data" in error &&
  typeof error.data === "object" &&
  error.data !== null &&
  "message" in error.data
    ? String(error.data.message)
    : "Unable to complete the sale.";

export default function PosPage() {
  const dispatch = useDispatch();
  const searchRef = useRef<HTMLInputElement>(null);

  const token = useSelector((state: RootState) => state.auth.token);
  const user = token ? jwtDecode<JwtPayload>(token) : null;
  const userId = user?.id ?? null;

  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useGetProductsQuery();

  const [createSale, { isLoading: isSubmitting }] = useCreateSaleMutation();

  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: customers = [] } = useGetCustomersQuery();

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [vatRate, setVatRate] = useState("0");
  const [referenceInput, setReferenceInput] = useState("");
  const [saleError, setSaleError] = useState("");
  const [saleSuccess, setSaleSuccess] = useState("");

  // Press "/" anywhere to jump to product search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA";

      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!saleSuccess) return;

    const timer = setTimeout(() => setSaleSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [saleSuccess]);

  const bankAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.type === "BANK" && account.status === "ACTIVE",
      ),
    [accounts],
  );

  const walletAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          (account.type === "WALLET" || account.type === "MERCHANT") &&
          account.status === "ACTIVE",
      ),
    [accounts],
  );

  const paymentAccounts =
    paymentMethod === "MOBILE" ? walletAccounts : bankAccounts;

  const categories = useMemo(() => {
    const map = new Map<number, string>();

    products.forEach((p) => {
      if (p.category) map.set(p.category.id, p.category.name);
    });

    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.toLowerCase().trim();

    return products.filter((p) => {
      if (selectedCategoryId !== null && p.categoryId !== selectedCategoryId) {
        return false;
      }

      if (!search) return true;

      return (
        p.productName.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        p.barcode?.toLowerCase().includes(search)
      );
    });
  }, [products, productSearch, selectedCategoryId]);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const discountAmount = Number(discountInput) || 0;
  // VAT on the amount after discount
  const vatRateValue = Number(vatRate) || 0;
  const taxAmount = round2(
    Math.max(subtotal - discountAmount, 0) * vatRateValue,
  );
  const paidAmount = Number(paidAmountInput) || 0;

  const total = Math.max(subtotal - discountAmount + taxAmount, 0);
  const dueAmount = Math.max(total - paidAmount, 0);
  const changeAmount = Math.max(paidAmount - total, 0);

  const quickCashAmounts = useMemo(() => {
    if (total <= 0) return [];

    const steps = [50, 100, 500, 1000];
    const amounts = new Set<number>();

    steps.forEach((step) => {
      const rounded = Math.ceil(total / step) * step;
      if (rounded > total) amounts.add(rounded);
    });

    return Array.from(amounts).sort((a, b) => a - b).slice(0, 3);
  }, [total]);

  const getAvailableStock = (product?: (typeof products)[number]) => {
    if (!product) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (product.stockBatches ?? []).reduce((sum, batch) => {
      // No expiry date = can be sold
      if (!batch.expiryDate) {
        return sum + Number(batch.quantity);
      }

      const expiryDate = new Date(batch.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);

      // Expired batch = don't count it
      if (expiryDate < today) {
        return sum;
      }

      return sum + Number(batch.quantity);
    }, 0);
  };

  const getCartQuantity = (productId: number) =>
    cart.find((item) => item.productId === productId)?.quantity ?? 0;

  const setItemQuantity = (productId: number, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const availableStock = getAvailableStock(product);

    if (quantity > availableStock) {
      setSaleError(
        `Insufficient stock for ${product.productName}. Available stock: ${availableStock}.`,
      );
      return;
    }

    if (quantity < 1) return;

    setSaleError("");

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              lineTotal: quantity * item.unitPrice - item.discount + item.tax,
            }
          : item,
      ),
    );
  };

  const addProductToCart = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const availableStock = getAvailableStock(product);

    if (availableStock <= 0) {
      setSaleError(`${product.productName} is out of stock.`);
      return;
    }

    const existingQuantity = getCartQuantity(productId);

    if (existingQuantity > 0) {
      setItemQuantity(productId, existingQuantity + 1);
    } else {
      const unitPrice = Number(product.sellingPrice);

      setSaleError("");
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.productName,
          quantity: 1,
          unitPrice,
          discount: 0,
          tax: 0,
          lineTotal: unitPrice,
        },
      ]);
    }

    setProductSearch("");
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    setSaleError("");
  };

  const resetSale = () => {
    setCart([]);
    setPaidAmountInput("");
    setDiscountInput("");
    setVatRate("0");
    setReferenceInput("");
    setSelectedCustomerId(null);
    setSelectedAccountId(null);
    setPaymentMethod("CASH");
    setSaleError("");
  };

  const handleSearchEnter = () => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return;

    // Exact barcode / SKU match first (scanner), then a single search result
    const product =
      products.find(
        (p) =>
          p.barcode?.toLowerCase() === search || p.sku.toLowerCase() === search,
      ) ?? (filteredProducts.length === 1 ? filteredProducts[0] : undefined);

    if (product) {
      addProductToCart(product.id);
      return;
    }

    setSaleError("Product not found.");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaleError("");

    if (!userId) {
      setSaleError("You must be logged in to create a sale.");
      return;
    }

    if (cart.length === 0) {
      setSaleError("Please add at least one product.");
      return;
    }

    // Always validate against latest stock before sale
    const latest = await refetchProducts();
    const latestProducts = latest.data ?? products;

    for (const item of cart) {
      const p = latestProducts.find((x) => x.id === item.productId);
      const available = getAvailableStock(p);

      if (!p || available <= 0) {
        setSaleError(`${item.productName} is out of stock.`);
        return;
      }

      if (item.quantity > available) {
        setSaleError(
          `Insufficient stock for ${item.productName}. Available stock: ${available}.`,
        );
        return;
      }
    }

    if (paidAmount < 0) {
      setSaleError("Paid amount cannot be negative.");
      return;
    }

    // Customer is required for credit sales
    if (dueAmount > 0 && selectedCustomerId === null) {
      setSaleError("Please select a customer for a credit sale.");
      return;
    }

    if (paymentMethod !== "CASH" && selectedAccountId === null) {
      setSaleError(
        `Please select a ${
          paymentMethod === "MOBILE" ? "wallet or merchant" : "bank account"
        }.`,
      );
      return;
    }

    const payload = {
      userId,
      customerId: selectedCustomerId,

      // VAT is spread across lines so returns refund the right VAT
      items: cart.map((item, index) => {
        const lineAmount = item.unitPrice * item.quantity;
        const allocatedBefore = cart
          .slice(0, index)
          .reduce(
            (sum, prev) =>
              sum + round2((prev.unitPrice * prev.quantity * taxAmount) / subtotal),
            0,
          );
        const lineTax =
          taxAmount <= 0 || subtotal <= 0
            ? 0
            : index === cart.length - 1
              ? round2(taxAmount - allocatedBefore)
              : round2((lineAmount * taxAmount) / subtotal);

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: 0,
          tax: lineTax,
          lineTotal: round2(lineAmount + lineTax),
        };
      }),

      subtotal: Number(subtotal),
      discount: Number(discountAmount),
      tax: Number(taxAmount),
      total: Number(total),
      paidAmount: Number(paidAmount),
      dueAmount: Number(dueAmount),
      changeAmount: Number(changeAmount),

      payments: [
        {
          method: paymentMethod,
          amount: Number(paidAmount),
          reference: referenceInput.trim() || null,
          accountId: paymentMethod === "CASH" ? null : selectedAccountId,
        },
      ],
    };

    try {
      await createSale(payload).unwrap();

      setSaleSuccess(
        changeAmount > 0
          ? `Sale completed. Give change: ETB ${money(changeAmount)}`
          : "Sale completed successfully.",
      );
      resetSale();
      dispatch(closeCreateSale());
      searchRef.current?.focus();
    } catch (error: unknown) {
      setSaleError(getErrorMessage(error));
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[#E6EAED] bg-white px-3 py-2.5 text-sm text-text-two outline-none transition placeholder:text-[#A0A7AE] focus:border-[#FE9F43] focus:ring-4 focus:ring-[#FE9F43]/15";

  return (
    <section className="min-h-full bg-[#F4F6F8] p-4 lg:p-6">
      <form
        autoComplete="off"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_420px]"
      >
        {/* ================= PRODUCTS ================= */}
        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-text-two">New Sale</h1>
              <p className="text-sm text-[#646B72]">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {user && (
              <div className="flex items-center gap-2 rounded-full border border-[#E6EAED] bg-white py-1 pl-1 pr-4 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FE9F43]/15 text-xs font-bold text-[#E8862A]">
                  {user.email?.slice(0, 2).toUpperCase() || "US"}
                </span>
                <div className="leading-tight">
                  <p className="text-xs text-[#646B72]">Cashier</p>
                  <p className="text-sm font-medium text-text-two">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
          </header>

          {saleSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <FiCheckCircle size={18} />
              {saleSuccess}
            </div>
          )}

          <div className="rounded-2xl border border-[#E6EAED] bg-white p-4 shadow-sm">
            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0A7AE]"
                size={18}
              />
              <input
                ref={searchRef}
                type="text"
                autoFocus
                placeholder="Search by name, SKU or scan barcode..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  handleSearchEnter();
                }}
                className={`${inputClass} py-3 pl-11 pr-20`}
              />
              {productSearch ? (
                <button
                  type="button"
                  onClick={() => setProductSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-[#A0A7AE] hover:bg-gray-100 hover:text-text-two"
                  aria-label="Clear search"
                >
                  <FiX size={16} />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#E6EAED] bg-[#F9FAFB] px-2 py-0.5 text-xs text-[#A0A7AE]">
                  /
                </kbd>
              )}
            </div>

            {categories.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {[{ id: null, name: "All" }, ...categories].map((category) => {
                  const active = selectedCategoryId === category.id;

                  return (
                    <button
                      key={category.id ?? "all"}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition ${
                        active
                          ? "bg-text-two text-white shadow-sm"
                          : "bg-[#F4F6F8] text-[#646B72] hover:bg-[#E9ECEF]"
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D5DADF] bg-white py-16 text-center">
              <FiPackage size={32} className="mb-2 text-[#A0A7AE]" />
              <p className="text-sm font-medium text-text-two">
                No products found
              </p>
              <p className="text-xs text-[#646B72]">
                Try a different search or category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const availableStock = getAvailableStock(product);
                const outOfStock = availableStock <= 0;
                const lowStock =
                  !outOfStock && availableStock <= product.lowStockLimit;
                const inCart = getCartQuantity(product.id);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProductToCart(product.id)}
                    disabled={outOfStock}
                    title={outOfStock ? "Out of stock" : ""}
                    className={`group relative flex cursor-pointer flex-col rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${
                      inCart > 0
                        ? "border-[#FE9F43] ring-2 ring-[#FE9F43]/20"
                        : "border-[#E6EAED] hover:border-[#FE9F43]/60"
                    }`}
                  >
                    {inCart > 0 && (
                      <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FE9F43] px-1.5 text-xs font-bold text-white">
                        {inCart}
                      </span>
                    )}

                    <div className="mb-3 flex h-16 items-center justify-center rounded-xl bg-linear-to-br from-[#FFF4E8] to-[#FFE6CC] text-lg font-bold text-[#E8862A] transition group-hover:from-[#FFEBD6] group-hover:to-[#FFDAB3]">
                      {initials(product.productName)}
                    </div>

                    <p className="line-clamp-2 min-h-10 text-sm font-medium text-text-two">
                      {product.productName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#A0A7AE]">
                      {product.category?.name ?? product.sku}
                    </p>

                    <div className="mt-2 flex items-end justify-between gap-2">
                      <p className="text-base font-bold text-text-two">
                        <span className="text-xs font-medium text-[#646B72]">
                          ETB{" "}
                        </span>
                        {money(Number(product.sellingPrice))}
                      </p>

                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          outOfStock
                            ? "bg-red-50 text-red-600"
                            : lowStock
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {outOfStock ? "Out" : `${availableStock} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= CART / CHECKOUT ================= */}
        <aside className="flex flex-col rounded-2xl border border-[#E6EAED] bg-white shadow-sm xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)]">
          <div className="flex items-center justify-between border-b border-[#E6EAED] px-5 py-4">
            <div className="flex items-center gap-2">
              <FiShoppingCart className="text-[#FE9F43]" size={18} />
              <h2 className="font-semibold text-text-two">Current Sale</h2>
              {itemCount > 0 && (
                <span className="rounded-full bg-[#FE9F43]/15 px-2 py-0.5 text-xs font-semibold text-[#E8862A]">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              )}
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={resetSale}
                className="cursor-pointer text-xs font-medium text-red-500 hover:text-red-600"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Customer */}
            <div className="border-b border-[#E6EAED] px-5 py-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[#646B72]">
                <FiUser size={13} /> Customer
              </label>
              <select
                value={selectedCustomerId ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCustomerId(value ? Number(value) : null);
                  setSaleError("");
                }}
                className={inputClass}
              >
                <option value="">Walk-in Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fname} {customer.lname} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart items */}
            <div className="px-5 py-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#F4F6F8]">
                    <FiShoppingCart size={22} className="text-[#A0A7AE]" />
                  </div>
                  <p className="text-sm font-medium text-text-two">
                    Cart is empty
                  </p>
                  <p className="text-xs text-[#646B72]">
                    Tap a product or scan a barcode to add it.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cart.map((item) => {
                    const availableStock = getAvailableStock(
                      products.find((p) => p.id === item.productId),
                    );

                    return (
                      <li
                        key={item.productId}
                        className="rounded-xl border border-[#E6EAED] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-two">
                              {item.productName}
                            </p>
                            <p className="text-xs text-[#646B72]">
                              ETB {money(item.unitPrice)} each
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="cursor-pointer rounded-md p-1 text-[#A0A7AE] transition hover:bg-red-50 hover:text-red-500"
                            aria-label={`Remove ${item.productName}`}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-[#E6EAED]">
                            <button
                              type="button"
                              onClick={() =>
                                setItemQuantity(
                                  item.productId,
                                  item.quantity - 1,
                                )
                              }
                              disabled={item.quantity <= 1}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#646B72] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              <FiMinus size={14} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={availableStock}
                              value={item.quantity}
                              onChange={(e) =>
                                setItemQuantity(
                                  item.productId,
                                  Math.floor(Number(e.target.value)),
                                )
                              }
                              className="h-8 w-12 border-x border-[#E6EAED] text-center text-sm font-medium text-text-two outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setItemQuantity(
                                  item.productId,
                                  item.quantity + 1,
                                )
                              }
                              disabled={item.quantity >= availableStock}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#646B72] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              <FiPlus size={14} />
                            </button>
                          </div>

                          <p className="text-sm font-semibold text-text-two">
                            {money(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2.5 border-t border-[#E6EAED] bg-[#FAFBFC] px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#646B72]">Subtotal</span>
                <span className="font-medium text-text-two">
                  {money(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[#646B72]">Discount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-28 rounded-lg border border-[#E6EAED] bg-white px-2 py-1.5 text-right outline-none focus:border-[#FE9F43]"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[#646B72]">VAT</span>
                <div className="flex items-center gap-2">
                  {taxAmount > 0 && (
                    <span className="text-sm font-medium tabular-nums text-text-two">
                      {money(taxAmount)}
                    </span>
                  )}
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="w-28 rounded-lg border border-[#E6EAED] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#FE9F43]"
                  >
                    {VAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-dashed border-[#D5DADF] pt-3">
                <span className="text-base font-semibold text-text-two">
                  Total
                </span>
                <span className="text-2xl font-bold text-text-two">
                  <span className="mr-1 text-sm font-medium text-[#646B72]">
                    ETB
                  </span>
                  {money(total)}
                </span>
              </div>
            </div>

            {/* Payment */}
            <div className="space-y-4 border-t border-[#E6EAED] px-5 py-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#646B72]">
                  Payment Method
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => {
                    const active = paymentMethod === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(value);
                          setSelectedAccountId(null);
                        }}
                        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition ${
                          active
                            ? "border-[#FE9F43] bg-[#FFF7ED] text-[#E8862A]"
                            : "border-[#E6EAED] text-[#646B72] hover:bg-gray-50"
                        }`}
                      >
                        <Icon size={18} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {paymentMethod !== "CASH" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#646B72]">
                    {paymentMethod === "MOBILE"
                      ? "Wallet / Merchant Account"
                      : "Bank Account"}
                  </label>
                  <select
                    value={selectedAccountId ?? ""}
                    onChange={(e) =>
                      setSelectedAccountId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    required
                    className={inputClass}
                  >
                    <option value="">
                      Select{" "}
                      {paymentMethod === "MOBILE"
                        ? "wallet or merchant"
                        : "bank account"}
                    </option>
                    {paymentAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bankName
                          ? `${account.bankName} - ${account.name} (${account.number})`
                          : `${account.name} (${account.number})`}
                        {account.type === "MERCHANT"
                          ? " · Merchant"
                          : account.type === "WALLET"
                            ? " · Wallet"
                            : ""}
                      </option>
                    ))}
                  </select>

                  {paymentAccounts.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">
                      No active{" "}
                      {paymentMethod === "MOBILE"
                        ? "wallet or merchant"
                        : "bank accounts"}{" "}
                      available.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#646B72]">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder="0.00"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#646B72]">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={referenceInput}
                    onChange={(e) => setReferenceInput(e.target.value)}
                    placeholder="Transaction ID"
                    className={inputClass}
                  />
                </div>
              </div>

              {total > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPaidAmountInput(total.toFixed(2))}
                    className="cursor-pointer rounded-lg border border-[#FE9F43] bg-[#FFF7ED] px-3 py-1.5 text-xs font-semibold text-[#E8862A] hover:bg-[#FFEBD6]"
                  >
                    Exact
                  </button>
                  {paymentMethod === "CASH" &&
                    quickCashAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setPaidAmountInput(String(amount))}
                        className="cursor-pointer rounded-lg border border-[#E6EAED] px-3 py-1.5 text-xs font-medium text-[#646B72] hover:bg-gray-50"
                      >
                        {money(amount)}
                      </button>
                    ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`rounded-xl px-3 py-2.5 ${
                    dueAmount > 0 ? "bg-red-50" : "bg-[#F4F6F8]"
                  }`}
                >
                  <p className="text-xs text-[#646B72]">Due</p>
                  <p
                    className={`text-base font-bold ${
                      dueAmount > 0 ? "text-red-600" : "text-text-two"
                    }`}
                  >
                    {money(dueAmount)}
                  </p>
                </div>
                <div
                  className={`rounded-xl px-3 py-2.5 ${
                    changeAmount > 0 ? "bg-emerald-50" : "bg-[#F4F6F8]"
                  }`}
                >
                  <p className="text-xs text-[#646B72]">Change</p>
                  <p
                    className={`text-base font-bold ${
                      changeAmount > 0 ? "text-emerald-600" : "text-text-two"
                    }`}
                  >
                    {money(changeAmount)}
                  </p>
                </div>
              </div>

              {dueAmount > 0 && cart.length > 0 && (
                <p className="text-xs text-[#646B72]">
                  Remaining balance will be recorded as a credit sale
                  {selectedCustomerId === null && " — select a customer"}.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#E6EAED] p-4">
            {saleError && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <FiAlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{saleError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || cart.length === 0}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-[#FE9F43] px-5 py-3.5 font-semibold text-white shadow-lg shadow-[#FE9F43]/30 transition hover:bg-[#F28F2F] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              <span>
                {isSubmitting ? "Processing..." : "Complete Sale"}
              </span>
              <span className="text-lg">ETB {money(total)}</span>
            </button>
          </div>
        </aside>
      </form>
    </section>
  );
}
