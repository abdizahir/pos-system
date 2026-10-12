// This shop's server address, from VITE_API_URL (set per shop at build
// time). Cleaned so small typing differences can't break requests:
//   " https://shop.up.railway.app/ "    → https://shop.up.railway.app
//   "https://shop.up.railway.app/api/"  → https://shop.up.railway.app
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
