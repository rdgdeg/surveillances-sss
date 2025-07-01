
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, Settings, ClipboardList, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { formatSession } from "@/utils/sessionUtils";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 w-full">
      {/* Header optimisé pour desktop */}
      <header className="bg-uclouvain-blue text-white shadow-sm border-b border-uclouvain-cyan/30 w-full">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              {/* Logo UCLouvain */}
              <img
                src="/lovable-uploads/f6a7054d-ce38-4ede-84cf-87b92a350bea.png"
                alt="Logo UCLouvain"
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-lg font-bold text-white mb-0.5">UCLouvain</h1>
                <p className="text-uclouvain-cyan font-medium text-sm">
                  Université catholique de Louvain – Système de Gestion des Surveillances
                </p>
                <p className="text-uclouvain-cyan/80 text-xs">
                  Secteur des Sciences de la Santé
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/planning">
                <Button variant="outline" className="border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue transition-colors text-sm">
                  <Calendar className="h-3 w-3 mr-1" />
                  Planning Général
                </Button>
              </Link>
              <Link to="/admin">
                <Button variant="outline" className="border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue transition-colors text-sm">
                  <ClipboardList className="h-3 w-3 mr-1" />
                  Administration
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content optimisé */}
      <main className="w-full px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Bienvenue dans le système de surveillance
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Plateforme unique pour l'organisation des examens : confirmations, assistants, attributions et disponibilités.
            </p>
          </div>

          {/* Cards Grid avec 2 colonnes pour plus d'espace */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Planning Général */}
            <Card className="flex flex-col justify-between h-80 p-6 shadow-lg border hover:shadow-xl transition-shadow">
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl font-bold text-uclouvain-blue mb-3">
                  Planning Général
                </CardTitle>
                <CardDescription className="text-base text-gray-700 mb-6">
                  Consultez l'horaire complet des examens avec les surveillants attribués par auditoire.
                </CardDescription>
              </div>
              <div className="flex justify-center">
                <Link to="/planning" className="w-full">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-base font-medium rounded-lg h-12">
                    Voir le planning complet
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Enseignants */}
            <Card className="flex flex-col justify-between h-80 p-6 shadow-lg border hover:shadow-xl transition-shadow">
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <GraduationCap className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl font-bold text-uclouvain-blue mb-3">
                  Enseignants
                </CardTitle>
                <CardDescription className="text-base text-gray-700 mb-6">
                  Confirmez les examens dont vous êtes responsable et indiquez les assistants qui participeront à la surveillance.
                </CardDescription>
              </div>
              <div className="flex justify-center">
                <Link to="/enseignant" className="w-full">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-base font-medium rounded-lg h-12">
                    Gérer mes examens & assistants
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Surveillants */}
            <Card className="flex flex-col justify-between h-80 p-6 shadow-lg border hover:shadow-xl transition-shadow">
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold text-uclouvain-blue mb-3">
                  Surveillants
                </CardTitle>
                <CardDescription className="text-base text-gray-700 mb-6">
                  Consultez vos attributions de surveillance et renseignez directement vos disponibilités.
                </CardDescription>
              </div>
              <div className="flex justify-center">
                <Link to="/surveillant" className="w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-base font-medium rounded-lg h-12">
                    Mes attributions & disponibilités
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Administration */}
            <Card className="flex flex-col justify-between h-80 p-6 shadow-lg border hover:shadow-xl transition-shadow">
              <div className="flex flex-col items-center flex-1 text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="h-8 w-8 text-gray-600" />
                </div>
                <CardTitle className="text-xl font-bold text-uclouvain-blue mb-3">
                  Administration
                </CardTitle>
                <CardDescription className="text-base text-gray-700 mb-6">
                  Validez, supervisez et attribuez les surveillances, gérez les utilisateurs et assistances.
                </CardDescription>
              </div>
              <div className="flex justify-center">
                <Link to="/admin" className="w-full">
                  <Button variant="outline" className="w-full text-base font-medium rounded-lg h-12 border-uclouvain-cyan text-uclouvain-blue hover:bg-uclouvain-blue-grey hover:text-uclouvain-blue transition-colors">
                    Accéder à l'administration
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Features section compacte */}
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">Fonctionnalités principales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-medium mb-2 text-base">Planning Centralisé</h4>
                <p className="text-gray-600 text-sm">
                  Accès complet à l'horaire des examens et attributions par auditoire pour tous.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium mb-2 text-base">Gestion des Surveillants</h4>
                <p className="text-gray-600 text-sm">
                  Saisie centralisée des disponibilités et accès aux attributions de surveillance.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium mb-2 text-base">Workflow Enseignant</h4>
                <p className="text-gray-600 text-sm">
                  Confirmation collaborative des examens et assistants affectés à chaque surveillances.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <ClipboardList className="h-6 w-6 text-gray-600" />
                </div>
                <h4 className="font-medium mb-2 text-base">Pilotage &amp; Statistiques</h4>
                <p className="text-gray-600 text-sm">
                  Suivi temps réel du remplissage, répartition et gestion de toutes les phases de surveillance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
