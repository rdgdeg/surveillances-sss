import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-uclouvain-blue to-uclouvain-cyan">
      <header className="absolute top-0 left-0 w-full py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-white font-bold text-xl">
            Gestion des Surveillances
          </Link>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link to="/privacy" className="text-white hover:text-gray-200">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/credits" className="text-white hover:text-gray-200">
                  Crédits
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white">
              Gestion des Surveillances
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Système de planification et d'attribution des surveillances d'examens pour l'UCLouvain
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/candidature">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Formulaire de candidature
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20">
                Administration
              </Button>
            </Link>
          </div>

          <div className="mt-12">
            <p className="text-white/70 text-sm">
              Ce site est en développement. Pour toute question, contactez l'équipe via{" "}
              <a
                href="mailto:support@example.com"
                className="text-white underline"
              >
                support@example.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 w-full bg-black/20 py-4 text-center text-white/60 text-xs">
        © {new Date().getFullYear()} UCLouvain - Tous droits réservés
      </footer>
    </div>
  );
}
