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
      const { data: whoamiData, error: whoamiError } = await supabase.functions.invoke('whoami');
      
      // Fetch profile for other components and as fallback
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      setProfile(profileData);

      // Use whoami data if available, otherwise fall back to profile
      let role, org_id, last_building_id, org_onboarding_completed;
      
      if (whoamiError || !whoamiData) {
        console.warn('[auth-routing] whoami failed, using profile data:', whoamiError);
        role = profileData?.role;
        org_id = profileData?.org_id;
        last_building_id = profileData?.last_building_id;
        org_onboarding_completed = null;
      } else {
        role = whoamiData.role;
        org_id = whoamiData.org_id;
        last_building_id = whoamiData.last_building_id;
        org_onboarding_completed = whoamiData.org_onboarding_completed;
      }

      console.info('[route-decider]', { 
        role, 
        org_id, 
        last_building_id,
        org_onboarding_completed,
        event,
        currentPath: window.location.pathname 
      });

      const isOnAuthPage = window.location.pathname === '/auth';
      const shouldRedirect = event === 'SIGNED_IN' || isOnAuthPage;

      if (!shouldRedirect) {
        setLoading(false);
        return;
      }

      // Admin routing - check org setup and onboarding
      if (role === 'admin') {
        if (!org_id) {
          console.info('[route-decider]', { role, org_id, target: '/admin/setup' });
          navigate('/admin/setup');
        } else if (org_onboarding_completed === false) {
          console.info('[route-decider]', { role, org_id, org_onboarding_completed, target: '/admin/onboarding' });
          navigate('/admin/onboarding');
        } else {
          console.info('[route-decider]', { role, org_id, target: '/admin' });
          navigate('/admin');
        }
        setLoading(false);
        return;
      }
      
      // Manager routing - go to /manager to select building
      if (role === 'manager') {
        console.info('[route-decider]', { role, target: '/manager' });
        navigate('/manager');
        setLoading(false);
        return;
      }
      
      // Resident routing - go to feed
      if (role === 'resident') {
        const buildingId = profileData?.building_id || last_building_id;
        const target = buildingId ? `/buildings/${buildingId}/feed` : '/feed';
        console.info('[route-decider]', { role, buildingId, target });
        navigate(target);
        setLoading(false);
        return;
      }

      // Unknown role - stay on current page or go to auth
      console.warn('[route-decider] Unknown role:', role);
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
