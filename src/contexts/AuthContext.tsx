import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  profile: { id: string; full_name: string; email: string; role: UserRole; hostel_id: string | null } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; role: UserRole | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles' as any)
      .select('id, full_name, email, role, hostel_id')
      .eq('id', userId)
      .single();
    if (data) {
      const d = data as any;
      setProfile({ id: d.id, full_name: d.full_name, email: d.email, role: d.role, hostel_id: d.hostel_id ?? null });
      setRole(d.role as UserRole);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      // Fetch profile immediately so role is available before redirect
      const { data: profileData } = await supabase
        .from('profiles' as any)
        .select('id, full_name, email, role, status, hostel_id')
        .eq('id', data.user.id)
        .single();
      if (profileData) {
        const d = profileData as any;
        if (d.status === 'inactive') {
          await supabase.auth.signOut();
          return { error: { message: 'Your account has been deactivated. Contact admin.' }, role: null as UserRole | null };
        }
        // Block login if hostel subscription expired (super_admin always allowed)
        if (d.role !== 'super_admin' && d.hostel_id) {
          const { data: subActive } = await supabase.rpc('is_hostel_subscription_active' as any, { _hostel_id: d.hostel_id });
          if (!subActive) {
            await supabase.auth.signOut();
            return { error: { message: 'Your hostel subscription has expired. Contact your administrator.' }, role: null as UserRole | null };
          }
        }
        setProfile({ id: d.id, full_name: d.full_name, email: d.email, role: d.role, hostel_id: d.hostel_id ?? null });
        setRole(d.role as UserRole);
        return { error: null, role: d.role as UserRole };
      }
    }
    return { error, role: null as UserRole | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
