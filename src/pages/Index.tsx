
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, Settings, ClipboardList, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-uclouvain-blue text-white shadow-sm border-b border-uclouvain-cyan/30">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3 sm:gap-4 w-full justify-center sm:justify-start">
              {/* Logo UCLouvain */}
              <img
                src="/lovable-uploads/f6a7054d-ce38-4ede-84cf-87b92a350bea.png"
                alt="Logo UCLouvain"
                className="h-10 w-auto sm:h-12"
              />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-0.5 sm:mb-1">UCLouvain</h1>
                <p className="text-uclouvain-cyan font-semibold text-sm sm:text-base">
                  Université catholique de Louvain – Système de Gestion des Surveillances
                </p>
                <p className="text-uclouvain-cyan/80 text-xs hidden md:block">
                  Secteur des Sciences de la Santé
                </p>
              </div>
            </div>
            <div className="flex items-center w-full justify-center sm:justify-end mt-3 sm:mt-0">
              <Link to="/admin" className="w-full max-w-xs sm:w-auto sm:max-w-none">
                <Button variant="outline" className="flex items-center justify-center w-full border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue transition-colors">
                  <ClipboardList className="h-4 w-4" />
                  <span className="ml-2">Administration</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-1 sm:px-4 py-8 sm:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Bienvenue dans le système de surveillance
          </h2>
          <p className="text-base sm:text-xl text-gray-600 max-w-xl sm:max-w-3xl mx-auto">
            Plateforme unique pour l'organisation des examens : confirmations, assistants, attributions et disponibilités.
          </p>
        </div>

        {/* Cards Grid alignés pour mobile */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 mb-8 md:mb-12">
          {/* Enseignants */}
          <Card className="flex flex-col justify-between items-center h-full min-h-[340px] sm:min-h-[380px] px-4 sm:px-6 py-6 sm:py-8 shadow-sm border text-center">
            <div className="flex flex-col items-center w-full flex-1">
              <div className="bg-green-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-5">
                <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-uclouvain-blue mb-2 sm:mb-3 mt-1">
                Enseignants
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-700 mb-6 sm:mb-8">
                Confirmez les examens dont vous êtes responsable et indiquez les assistants qui participeront à la surveillance.
              </CardDescription>
            </div>
            <div className="flex justify-center w-full">
              <Link to="/enseignant" className="w-full flex justify-center">
                <Button className="w-[90%] max-w-xs bg-green-600 hover:bg-green-700 text-base sm:text-lg font-semibold rounded-lg h-11 sm:h-12 mt-2">
                  Gérer mes examens & assistants
                </Button>
              </Link>
            </div>
          </Card>

          {/* Surveillants */}
          <Card className="flex flex-col justify-between items-center h-full min-h-[340px] sm:min-h-[380px] px-4 sm:px-6 py-6 sm:py-8 shadow-sm border text-center">
            <div className="flex flex-col items-center w-full flex-1">
              <div className="bg-blue-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-5">
                <Users className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-uclouvain-blue mb-2 sm:mb-3 mt-1">
                Surveillants
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-700 mb-6 sm:mb-8">
                Consultez vos attributions de surveillance et renseignez directement vos disponibilités.
              </CardDescription>
            </div>
            <div className="flex justify-center w-full">
              <Link to="/surveillant" className="w-full flex justify-center">
                <Button className="w-[90%] max-w-xs bg-blue-600 hover:bg-blue-700 text-base sm:text-lg font-semibold rounded-lg h-11 sm:h-12 mt-2">
                  Mes attributions & disponibilités
                </Button>
              </Link>
            </div>
          </Card>

          {/* Administration */}
          <Card className="flex flex-col justify-between items-center h-full min-h-[340px] sm:min-h-[380px] px-4 sm:px-6 py-6 sm:py-8 shadow-sm border text-center">
            <div className="flex flex-col items-center w-full flex-1">
              <div className="bg-gray-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-5">
                <ClipboardList className="h-7 w-7 sm:h-8 sm:w-8 text-gray-600" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-uclouvain-blue mb-2 sm:mb-3 mt-1">
                Administration
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-700 mb-6 sm:mb-8">
                Validez, supervisez et attribuez les surveillances, gérez les utilisateurs et assistances.
              </CardDescription>
            </div>
            <div className="flex justify-center w-full">
              <Link to="/admin" className="w-full flex justify-center">
                <Button variant="outline" className="w-[90%] max-w-xs text-base sm:text-lg font-semibold rounded-lg h-11 sm:h-12 mt-2 border-uclouvain-cyan text-uclouvain-blue hover:bg-uclouvain-blue-grey hover:text-uclouvain-blue transition-colors">
                  Accéder à l'administration
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Features section optimisée mobile */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8">
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-5 sm:mb-8">Fonctionnalités principales</h3>
          <div className="flex flex-col md:grid md:grid-cols-3 gap-5 sm:gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold mb-1 sm:mb-2">Gestion des Surveillants</h4>
              <p className="text-gray-600 text-xs sm:text-sm">
                Saisie centralisée des disponibilités et accès aux attributions de surveillance.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-green-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <h4 className="font-semibold mb-1 sm:mb-2">Workflow Enseignant</h4>
              <p className="text-gray-600 text-xs sm:text-sm">
                Confirmation collaborative des examens et assistants affectés à chaque surveillances.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-gray-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
              </div>
              <h4 className="font-semibold mb-1 sm:mb-2">Pilotage &amp; Statistiques</h4>
              <p className="text-gray-600 text-xs sm:text-sm">
                Suivi temps réel du remplissage, répartition et gestion de toutes les phases de surveillance.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
