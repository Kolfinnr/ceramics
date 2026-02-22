"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { readCart, subscribeToCartChanges } from "@/lib/cart-storage";

export default function CartLink({ style }: { style: CSSProperties }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCart().length);
    update();
    return subscribeToCartChanges(update);
  }, []);

  return (
    <Link href="/cart" style={{ ...style, display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Image src="/cart.svg" alt="" aria-hidden width={16} height={16} />
      Cart{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
