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
      let role, org_id, last_building_id;
      
      if (whoamiError || !whoamiData) {
        console.warn('[auth-routing] whoami failed, using profile data:', whoamiError);
        role = profileData?.role;
        org_id = profileData?.org_id;
        last_building_id = profileData?.last_building_id;
      } else {
        role = whoamiData.role;
        org_id = whoamiData.org_id;
        last_building_id = whoamiData.last_building_id;
      }

      console.info('[route-decider]', { 
        role, 
        org_id, 
        last_building_id, 
        event,
        currentPath: window.location.pathname 
      });

      // Email-specific routing rules
      // Force admin dashboard for mfernandez email
      if (profileData?.email === "mfernandezmelgar@gmail.com") {
        const targetPath = "/admin";
        console.info('[route-decider]', {
          email: profileData.email,
          target: targetPath,
          currentPath: window.location.pathname
        });
        if (window.location.pathname !== targetPath && (event === 'SIGNED_IN' || window.location.pathname === '/auth')) {
          navigate(targetPath);
        }
        setLoading(false);
        return;
      }

      // Email-specific routing rule for mariajof@tepper.cmu.edu (resident)
      if (profileData?.email === "mariajof@tepper.cmu.edu" && role === 'resident') {
        const buildingId = profileData.building_id || profileData.last_building_id;
        if (buildingId) {
          const targetPath = `/buildings/${buildingId}/feed`;
          console.info('[route-decider]', { 
            email: profileData.email, 
            target: targetPath,
            buildingId,
            currentPath: window.location.pathname 
          });
          if (window.location.pathname !== targetPath && (event === 'SIGNED_IN' || window.location.pathname === '/auth')) {
            navigate(targetPath);
          }
          setLoading(false);
          return;
        }
      }
      // Admin routing - always check and redirect based on org setup and onboarding
      if (role === 'admin') {
        const isOnAuthPage = window.location.pathname === '/auth';
        const isOnFeedPage = window.location.pathname.includes('/feed');
        const isOnWrongPage = isOnAuthPage || isOnFeedPage;
        
        if (!org_id && (isOnWrongPage || event === 'SIGNED_IN')) {
          console.info('[route-decider]', { role, org_id, last_building_id, target: '/admin/setup' });
          navigate('/admin/setup');
          setLoading(false);
          return;
        } else if (org_id && (isOnWrongPage || event === 'SIGNED_IN')) {
          // Check onboarding status from whoami
          if (whoamiData?.org_onboarding_completed === false) {
            console.info('[route-decider]', { role, org_id, org_onboarding_completed: false, target: '/admin/onboarding' });
            navigate('/admin/onboarding');
          } else {
            console.info('[route-decider]', { role, org_id, last_building_id, target: '/admin' });
            navigate('/admin');
          }
          setLoading(false);
          return;
        }
      }
      
      // Manager routing - always go to /manager to select building first
      if (role === 'manager' && (event === 'SIGNED_IN' || window.location.pathname === '/auth')) {
        console.info('[route-decider]', { role, org_id, last_building_id, target: '/manager' });
        navigate('/manager');
        setLoading(false);
        return;
      }
      
      // Resident routing
      if (role === 'resident' && (event === 'SIGNED_IN' || window.location.pathname === '/auth')) {
        console.info('[route-decider]', { role, org_id, last_building_id, target: '/feed' });
        navigate('/feed');
        setLoading(false);
        return;
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
