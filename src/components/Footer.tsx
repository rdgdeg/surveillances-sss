
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-uclouvain-blue text-white border-t border-uclouvain-cyan/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start space-y-6 md:space-y-0">
          <div className="flex items-center space-x-4">
            <img 
              src="/lovable-uploads/f6a7054d-ce38-4ede-84cf-87b92a350bea.png" 
              alt="UCLouvain" 
              className="h-10 w-auto"
            />
            <div>
              <h3 className="font-semibold text-white">Université catholique de Louvain</h3>
              <p className="text-uclouvain-cyan text-sm">Secteur des Sciences de la Santé</p>
            </div>
          </div>
          
          <div className="text-sm text-uclouvain-cyan space-y-2">
            <p>
              Application développée par{" "}
              <strong className="text-white">LD Media - Agence de communication et développement - Ath</strong>
            </p>
            <p className="text-xs">Reproduction interdite. Tous droits réservés.</p>
          </div>
          
          <div className="flex space-x-6 text-sm">
            <Link to="/credits" className="text-uclouvain-cyan hover:text-white transition-colors">
              Crédits
            </Link>
            <Link to="/rgpd" className="text-uclouvain-cyan hover:text-white transition-colors">
              RGPD
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
