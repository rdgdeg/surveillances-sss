
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-secondary/20">
      <div className="text-center space-y-6 max-w-md mx-auto p-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-uclouvain-blue">404</h1>
          <h2 className="text-2xl font-semibold text-uclouvain-blue">Page non trouvée</h2>
          <p className="text-muted-foreground">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="bg-uclouvain-blue hover:bg-uclouvain-blue/90">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()} className="border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Page précédente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
