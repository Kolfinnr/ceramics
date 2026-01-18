export type CartItem = {
  productSlug: string;
  productName: string;
  pricePLN: number;
  photo?: string;
  quantity?: number;
};

const CART_KEY = "ceramics_cart_v1";
const CART_EVENT = "ceramics-cart";

function isBrowser() {
  return typeof window !== "undefined";
}

export function readCart(): CartItem[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(item: CartItem) {
  const items = readCart();
  const existingIndex = items.findIndex(
    (existing) => existing.productSlug === item.productSlug
  );
  const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;

  if (existingIndex >= 0) {
    const existing = items[existingIndex]!;
    const next = [...items];
    next[existingIndex] = {
      ...existing,
      quantity: (existing.quantity ?? 1) + quantity,
    };
    writeCart(next);
    return next;
  }

  const next = [...items, { ...item, quantity }];
  writeCart(next);
  return next;
}

export function removeFromCart(productSlug: string) {
  const items = readCart();
  const next = items.filter((item) => item.productSlug !== productSlug);
  writeCart(next);
  return next;
}

export function clearCart() {
  writeCart([]);
}

export function subscribeToCartChanges(handler: () => void) {
  if (!isBrowser()) return () => {};

  const storageHandler = (event: StorageEvent) => {
    if (event.key === CART_KEY) {
      handler();
    }
  };

  window.addEventListener("storage", storageHandler);
  window.addEventListener(CART_EVENT, handler);
  return () => {
    window.removeEventListener("storage", storageHandler);
    window.removeEventListener(CART_EVENT, handler);
  };
}
