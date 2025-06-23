
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'raphael.degand@ldmedia.be';

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session actuelle
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        setUser(session.user);
      }
      setIsLoading(false);
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user?.email === ADMIN_EMAIL) {
          setIsAdmin(true);
          setUser(session.user);
        } else {
          setIsAdmin(false);
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (email !== ADMIN_EMAIL) {
      return { error: 'Accès refusé. Seul l\'administrateur autorisé peut accéder à cette section.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return { data, error: null };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    setIsAdmin(false);
    setUser(null);
    return { error };
  };

  return {
    isAdmin,
    user,
    isLoading,
    login,
    logout
  };
};
