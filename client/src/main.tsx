import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";

import { Provider } from "react-redux";
import { store } from "./store/store";

// Scrolling the mouse wheel over a focused number field changes its
// value. Unfocus it instead, so the wheel just scrolls the page.
document.addEventListener(
  "wheel",
  (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      target.type === "number" &&
      document.activeElement === target
    ) {
      target.blur();
    }
  },
  { passive: true },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>
);