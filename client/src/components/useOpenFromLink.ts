// Opens a page's "add" form when the page is linked with ?add=1
// (e.g. the dashboard quick actions), then removes ?add=1 from the
// address so a reload doesn't open it again.

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export function useOpenFromLink(open: () => void) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Keep the latest callback without re-running the effect for it
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;

    openRef.current();

    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
}
