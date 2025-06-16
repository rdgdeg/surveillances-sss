
import { useState, useEffect } from 'react';

const ADMIN_EMAIL = 'raphael.degand@ldmedia.be';

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const storedEmail = localStorage.getItem('admin_email');
    if (storedEmail === ADMIN_EMAIL) {
      setIsAdmin(true);
      setUserEmail(storedEmail);
    }
    setIsLoading(false);
  }, []);

  const login = (email: string) => {
    if (email === ADMIN_EMAIL) {
      localStorage.setItem('admin_email', email);
      setIsAdmin(true);
      setUserEmail(email);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('admin_email');
    setIsAdmin(false);
    setUserEmail(null);
  };

  return {
    isAdmin,
    userEmail,
    isLoading,
    login,
    logout
  };
};
