
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
}

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isAdmin: false,
    isLoading: true
  });

  useEffect(() => {
    // Vérifier la session actuelle
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Vérifier si l'utilisateur est admin
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          setState({
            user: session.user,
            isAdmin: profile?.role === 'admin',
            isLoading: false
          });
        } else {
          setState({
            user: null,
            isAdmin: false,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
        setState({
          user: null,
          isAdmin: false,
          isLoading: false
        });
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Vérifier si l'utilisateur est admin
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          setState({
            user: session.user,
            isAdmin: profile?.role === 'admin',
            isLoading: false
          });
        } else {
          setState({
            user: null,
            isAdmin: false,
            isLoading: false
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { error: error.message };
    }
    
    return { data };
  };

  const logout = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { error: error.message };
    }
    
    setState({
      user: null,
      isAdmin: false,
      isLoading: false
    });
    
    return { error: null };
  };

  return {
    user: state.user,
    isAdmin: state.isAdmin,
    isLoading: state.isLoading,
    login,
    logout
  };
};
