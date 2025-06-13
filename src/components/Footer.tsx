
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-600">
            Application développée par{" "}
            <strong>LD Media - Agence de communication et développement - Ath</strong>
            <br />
            Reproduction interdite. Tous droits réservés.
          </div>
          <div className="flex space-x-4 text-sm">
            <Link to="/credits" className="text-blue-600 hover:text-blue-800">
              Crédits
            </Link>
            <Link to="/rgpd" className="text-blue-600 hover:text-blue-800">
              RGPD
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
