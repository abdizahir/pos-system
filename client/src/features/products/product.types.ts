export type ProductCategory =
  | "Beverages"
  | "Food"
  | "Snacks"
  | "Dairy"
  | "Bakery"
  | "Frozen Foods"
  | "Fruits & Vegetables"
  | "Meat & Poultry"
  | "Seafood"
  | "Personal Care"
  | "Household"
  | "Cleaning Supplies"
  | "Baby Products"
  | "Stationery"
  | "Electronics"
  | "Other";

  export type ProductUnit =
  | "Piece"
  | "Bottle"
  | "Can"
  | "Box"
  | "Pack"
  | "Carton"
  | "Bag"
  | "Kg"
  | "g"
  | "L"
  | "ml";

  export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Beverages",
  "Food",
  "Snacks",
  "Dairy",
  "Bakery",
  "Frozen Foods",
  "Fruits & Vegetables",
  "Meat & Poultry",
  "Seafood",
  "Personal Care",
  "Household",
  "Cleaning Supplies",
  "Baby Products",
  "Stationery",
  "Electronics",
  "Other",
];

export const PRODUCT_UNITS: ProductUnit[] = [
  "Piece",
  "Bottle",
  "Can",
  "Box",
  "Pack",
  "Carton",
  "Bag",
  "Kg",
  "g",
  "L",
  "ml",
];

export interface Product {
    id: string;
    name: string;
    sku: string;
    barcode?: string;

    category: ProductCategory;
    brand?: string;
    unit: ProductUnit;

    purchasePrice: number;
    sellingPrice: number;

    stockQuantity: number;
    lowStockLimit: number;

    createdAt: string;
}

