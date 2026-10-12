// This shop's details (name, address, phone, TIN), set per install on
// the server. Also shows the shop name in the browser tab.

import { useEffect } from "react";

import { useGetShopQuery } from "../../api/api";

// Shown until the shop's details load (or if they can't)
export const PRODUCT_NAME = "Galool POS";

export function useShop() {
  const { data: shop } = useGetShopQuery();
  const name = shop?.name ?? PRODUCT_NAME;

  useEffect(() => {
    document.title = name === PRODUCT_NAME ? name : `${name} · ${PRODUCT_NAME}`;
  }, [name]);

  return { shop, name };
}

// "Main Street · 0900000000 · TIN 123" for headers on invoices and PDFs
export function shopDetailsLine(
  shop: { address: string | null; phone: string | null; tin: string | null } | undefined,
) {
  if (!shop) return "";
  return [shop.address, shop.phone, shop.tin ? `TIN ${shop.tin}` : null]
    .filter(Boolean)
    .join(" · ");
}
