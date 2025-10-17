import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  role: string;
  name: string | null;
  unit: string | null;
  email: string | null;
  full_name: string | null;
  building_address: string | null;
  org_id: string | null;
  building_id: string | null;
  last_building_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleRouting = async (userId: string, event?: string) => {
    // Fetch whoami data for routing decisions
    try {
      const { data: whoamiData, error } = await supabase.functions.invoke('whoami');
      
      if (error) {
        console.error('[auth-routing] Failed to fetch whoami:', error);
        setLoading(false);
        return;
      }

      const { role, org_id, last_building_id } = whoamiData;

      console.info('[route-decider]', { 
        role, 
        org_id, 
        last_building_id, 
        event,
        currentPath: window.location.pathname 
      });

      // Also fetch profile for other components
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      setProfile(profileData);

      // Only redirect on SIGNED_IN event or if on wrong page
      if (event === 'SIGNED_IN') {
        if (role === 'admin') {
          if (!org_id) {
            console.info('[route-decider]', { role, org_id, last_building_id, target: '/admin/setup' });
            navigate('/admin/setup');
          } else {
            console.info('[route-decider]', { role, org_id, last_building_id, target: '/admin' });
            navigate('/admin');
          }
        } else if (role === 'manager') {
          // Always land on the Buildings page so managers can pick a building
          console.info('[route-decider]', { role, org_id, last_building_id, target: '/manager' });
          navigate('/manager');
        } else {
          console.info('[route-decider]', { role, org_id, last_building_id, target: '/tickets' });
          navigate('/tickets');
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('[auth-routing] Error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[auth-state-change]', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            handleRouting(session.user.id, event);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        handleRouting(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
