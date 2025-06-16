
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from './AuthForm';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    // If we need admin access and user is not admin, redirect
    if (!isLoading && user && requireAdmin && !isAdmin) {
      window.location.href = '/';
    }
  }, [user, isAdmin, isLoading, requireAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Chargement...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If admin access is required
  if (requireAdmin) {
    // If not authenticated, show login form
    if (!user) {
      return <AuthForm />;
    }
    
    // If authenticated but not admin, show access denied
    if (!isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card>
            <CardContent className="pt-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Accès non autorisé
              </h2>
              <p className="text-gray-600 mb-4">
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
              </p>
              <button 
                onClick={() => window.location.href = '/'}
                className="text-blue-600 hover:text-blue-800"
              >
                Retour à l'accueil
              </button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};
