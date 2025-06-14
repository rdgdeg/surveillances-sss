
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UCLouvainHeaderProps {
  hideHomeButton?: boolean; // sometimes, e.g. home page, you may want to hide
}

export const UCLouvainHeader = ({ hideHomeButton }: UCLouvainHeaderProps) => (
  <header className="bg-uclouvain-blue text-white border-b border-uclouvain-cyan/30 shadow-sm">
    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <img
          src="/lovable-uploads/f6a7054d-ce38-4ede-84cf-87b92a350bea.png"
          alt="Logo UCLouvain"
          className="h-10 md:h-12 w-auto"
        />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1 leading-tight">
            UCLouvain
          </h1>
          <div className="hidden sm:block">
            <p className="text-uclouvain-cyan font-semibold">
              Université catholique de Louvain
            </p>
            <p className="text-uclouvain-cyan/80 text-xs">
              Secteur des Sciences de la Santé
            </p>
          </div>
        </div>
      </div>
      {!hideHomeButton && (
        <Link to="/">
          <Button
            variant="outline"
            className="border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue transition-colors flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Button>
        </Link>
      )}
    </div>
  </header>
);
