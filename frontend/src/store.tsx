import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, Cart, tokenStore, User } from "./api";

interface Ctx {
  user: User | null;
  loading: boolean;
  cartCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<void>;
  logout: () => void;
  refreshCart: () => Promise<void>;
}
const StoreCtx = createContext<Ctx>(null!);
export const useStore = () => useContext(StoreCtx);

export function Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!tokenStore.get()) return setCartCount(0);
    try {
      setCartCount((await api<Cart>("/cart")).itemCount);
    } catch {
      /* bỏ qua */
    }
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api<User>("/auth/me")
      .then((u) => {
        setUser(u);
        refreshCart();
      })
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [refreshCart]);

  const done = async (r: { user: User; token: string }) => {
    tokenStore.set(r.token);
    setUser(r.user);
    await refreshCart();
  };

  const value: Ctx = {
    user,
    loading,
    cartCount,
    refreshCart,
    login: async (email, password) => done(await api("/auth/login", { method: "POST", body: { email, password } })),
    register: async (data) => done(await api("/auth/register", { method: "POST", body: data })),
    logout: () => {
      tokenStore.clear();
      setUser(null);
      setCartCount(0);
    },
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
