"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { readCart, subscribeToCartChanges } from "@/lib/cart-storage";

export default function CartLink({ style }: { style: CSSProperties }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCart().length);
    update();
    return subscribeToCartChanges(update);
  }, []);

  return (
    <a href="/cart" style={style}>
      Cart{count > 0 ? ` (${count})` : ""}
    </a>
  );
}
