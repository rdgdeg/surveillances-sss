
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "react-router-dom";

export function CollecteHeader({ title, subtitle, sessionName }: { title: string, subtitle?: string, sessionName?: string }) {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          asChild
          className="border-uclouvain-blue text-uclouvain-blue hover:bg-uclouvain-blue hover:text-white"
        >
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Link>
        </Button>
      </div>
      <div className="text-center space-y-4 py-8 bg-gradient-uclouvain rounded-lg text-white">
        <div className="flex justify-center mb-4">
          <img
            src="/lovable-uploads/5ff3f8eb-c734-4f43-bde5-5d591faf4b9a.png"
            alt="UCLouvain"
            className="h-16 w-auto"
          />
        </div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <h2 className="text-xl text-uclouvain-cyan">{subtitle}</h2>}
        {sessionName && <p className="text-white/90">Session {sessionName} - Candidature pour la surveillance d'examens</p>}
      </div>
    </>
  );
}
