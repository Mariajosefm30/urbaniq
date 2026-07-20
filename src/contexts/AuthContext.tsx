import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "platform_admin" | "admin_board" | "manager" | "resident";

export interface Membership {
  id: string;
  building_id: string | null;
  role: AppRole;
  unit_id: string | null;
  resident_type: "owner" | "tenant" | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  memberships: Membership[];
  loading: boolean;
  isPlatformAdmin: boolean;
  primaryRole: AppRole | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = ["platform_admin", "admin_board", "manager", "resident"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMemberships = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("memberships")
      .select("id, building_id, role, unit_id")
      .eq("user_id", uid);
    if (error) {
      console.error("[auth] memberships load error", error);
      setMemberships([]);
    } else {
      setMemberships((data ?? []) as Membership[]);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (user) await loadMemberships(user.id);
  }, [user, loadMemberships]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        setTimeout(() => loadMemberships(s.user.id).finally(() => setLoading(false)), 0);
      } else {
        setMemberships([]);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        loadMemberships(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadMemberships]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setMemberships([]);
    window.location.href = "/";
  };

  const isPlatformAdmin = memberships.some((m) => m.role === "platform_admin");
  const primaryRole = ROLE_PRIORITY.find((r) => memberships.some((m) => m.role === r)) ?? null;

  return (
    <AuthContext.Provider
      value={{ user, session, memberships, loading, isPlatformAdmin, primaryRole, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
