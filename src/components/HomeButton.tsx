
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "react-router-dom";

export const HomeButton = () => {
  return (
    <Link to="/">
      <Button variant="outline" size="sm" className="flex items-center space-x-2">
        <Home className="h-4 w-4" />
        <span>Accueil</span>
      </Button>
    </Link>
  );
};
