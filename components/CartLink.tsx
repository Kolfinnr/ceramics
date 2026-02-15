"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { readCart, subscribeToCartChanges } from "@/lib/cart-storage";

export default function CartLink({ style }: { style: CSSProperties }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCart().length);
    update();
    return subscribeToCartChanges(update);
  }, []);

  return (
    <Link href="/cart" style={{ ...style, display: "flex", alignItems: "center", gap: 6 }}>
      <Image src="/cart.svg" alt="" aria-hidden="true" width={18} height={18} />
      Cart{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
