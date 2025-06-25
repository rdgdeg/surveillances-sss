
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Erreur lors de la vérification du rôle admin:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle admin:', error);
      return false;
    }
  };

  useEffect(() => {
    // Vérifier la session actuelle
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const hasAdminRole = await checkAdminRole(session.user.id);
          setIsAdmin(hasAdminRole);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Vérifier le rôle admin après un délai pour éviter les conflits
          setTimeout(async () => {
            const hasAdminRole = await checkAdminRole(session.user.id);
            setIsAdmin(hasAdminRole);
          }, 100);
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        const hasAdminRole = await checkAdminRole(data.user.id);
        if (!hasAdminRole) {
          await supabase.auth.signOut();
          return { error: 'Accès refusé. Vous devez avoir les droits administrateur pour accéder à cette section.' };
        }
      }

      return { data, error: null };
    } catch (error: any) {
      return { error: error.message };
    }
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
