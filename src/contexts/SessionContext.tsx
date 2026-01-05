import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SessionData {
  user_id: string | null;
  email: string | null;
  role: string | null;
  org_id: string | null;
  last_building_id: string | null;
  org_onboarding_completed: boolean | null;
}

interface SessionContextType {
  session: SessionData | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whoami');
      
      if (error) throw error;
      
      const sessionData = {
        user_id: data.user_id || null,
        email: data.email || null,
        role: data.role || null,
        org_id: data.org_id || null,
        last_building_id: data.last_building_id || null,
        org_onboarding_completed: data.org_onboarding_completed ?? null,
      };
      
      setSession(sessionData);
      console.info('[session-context]', sessionData);
    } catch (error) {
      console.error('[session-context] Failed to fetch session:', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch (may 401 before the user is signed in)
    fetchSession();

    // Refresh session data on auth changes to avoid stale/empty session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setLoading(true);
        fetchSession();
      }
      if (event === "SIGNED_OUT") {
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  const refreshSession = async () => {
    setLoading(true);
    await fetchSession();
  };

  return (
    <SessionContext.Provider value={{ session, loading, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
