import { Outlet } from "react-router-dom";

// Auth pages lay themselves out full-screen
export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-[#F8F4F0]">
      <Outlet />
    </main>
  );
}
