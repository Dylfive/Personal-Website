import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getUserProfile, setUserNickname } from '../lib/profileStore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  nickname: string | null;
  nicknameLoading: boolean;
  saveNickname: (nickname: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  nickname: null,
  nicknameLoading: true,
  saveNickname: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null);
  const [nicknameLoading, setNicknameLoading] = useState(true);

  // Load nickname whenever the user changes
  const loadNickname = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setNickname(null);
      setNicknameLoading(false);
      return;
    }
    setNicknameLoading(true);
    const profile = await getUserProfile(userId);
    setNickname(profile?.nickname ?? null);
    setNicknameLoading(false);
  }, []);

  useEffect(() => {
    // Grab the initial session (handles magic-link token in URL hash automatically)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        loadNickname(session?.user?.id);
      })
      .catch((err) => {
        console.error('Error fetching Supabase session:', err);
        setLoading(false);
        setNicknameLoading(false);
      });

    // Listen for any future auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      loadNickname(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [loadNickname]);

  const saveNickname = useCallback(
    async (newNickname: string): Promise<string | null> => {
      if (!user?.id) return 'Not authenticated.';
      const err = await setUserNickname(user.id, newNickname);
      if (!err) setNickname(newNickname.trim());
      return err;
    },
    [user?.id]
  );

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, nickname, nicknameLoading, saveNickname, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
