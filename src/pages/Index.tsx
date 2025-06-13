
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-uclouvain-blue to-uclouvain-cyan">
      <header className="py-6 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img 
              src="/lovable-uploads/f6a7054d-ce38-4ede-84cf-87b92a350bea.png" 
              alt="UCLouvain" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-white font-bold text-xl">Gestion des Surveillances</h1>
              <p className="text-uclouvain-cyan text-sm">Secteur des Sciences de la Santé</p>
            </div>
          </div>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link to="/privacy" className="text-white hover:text-uclouvain-cyan transition-colors">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/credits" className="text-white hover:text-uclouvain-cyan transition-colors">
                  Crédits
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center space-y-12">
          <div className="space-y-6">
            <h2 className="text-5xl md:text-7xl font-bold text-white leading-tight">
              Système de Gestion
              <br />
              <span className="text-uclouvain-cyan">des Surveillances</span>
            </h2>
            <p className="text-xl md:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed">
              Plateforme dédiée à la planification et à l'attribution des surveillances d'examens 
              pour le Secteur des Sciences de la Santé de l'UCLouvain
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/candidature">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-white text-uclouvain-blue hover:bg-white/90 font-semibold px-8 py-4 text-lg"
              >
                Formulaire de candidature
              </Button>
            </Link>
            <Link to="/auth">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto border-2 border-white/30 text-white hover:bg-white/10 hover:border-white font-semibold px-8 py-4 text-lg"
              >
                Accès Administration
              </Button>
            </Link>
          </div>

          <div className="mt-16 bg-white/10 backdrop-blur-sm rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-white font-semibold text-lg mb-4">
              Fonctionnalités principales
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-white/80 text-sm">
              <div>• Gestion des candidatures de surveillants</div>
              <div>• Attribution automatique des surveillances</div>
              <div>• Planification des examens</div>
              <div>• Suivi des disponibilités</div>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-white/70 text-sm">
              Plateforme en développement continu. Pour toute question ou assistance technique,
              <br />
              contactez le support via{" "}
              <a
                href="mailto:support.surveillances@uclouvain.be"
                className="text-white underline hover:text-uclouvain-cyan transition-colors"
              >
                support.surveillances@uclouvain.be
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
