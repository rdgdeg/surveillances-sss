
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, Settings, ClipboardList, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header optimisé pour desktop */}
      <header className="bg-uclouvain-blue text-white shadow-sm border-b border-uclouvain-cyan/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center">
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
      <main className="container mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenue dans le système de surveillance
          </h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Plateforme unique pour l'organisation des examens : confirmations, assistants, attributions et disponibilités.
          </p>
        </div>

        {/* Cards Grid optimisées pour desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-5xl mx-auto">
          {/* Enseignants */}
          <Card className="flex flex-col justify-between h-64 p-4 shadow-sm border text-center hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center flex-1">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <GraduationCap className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg font-bold text-uclouvain-blue mb-2">
                Enseignants
              </CardTitle>
              <CardDescription className="text-sm text-gray-700 mb-4">
                Confirmez les examens dont vous êtes responsable et indiquez les assistants qui participeront à la surveillance.
              </CardDescription>
            </div>
            <div className="flex justify-center">
              <Link to="/enseignant" className="w-full">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-sm font-medium rounded-lg h-9">
                  Gérer mes examens & assistants
                </Button>
              </Link>
            </div>
          </Card>

          {/* Surveillants */}
          <Card className="flex flex-col justify-between h-64 p-4 shadow-sm border text-center hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center flex-1">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-bold text-uclouvain-blue mb-2">
                Surveillants
              </CardTitle>
              <CardDescription className="text-sm text-gray-700 mb-4">
                Consultez vos attributions de surveillance et renseignez directement vos disponibilités.
              </CardDescription>
            </div>
            <div className="flex justify-center">
              <Link to="/surveillant" className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-sm font-medium rounded-lg h-9">
                  Mes attributions & disponibilités
                </Button>
              </Link>
            </div>
          </Card>

          {/* Administration */}
          <Card className="flex flex-col justify-between h-64 p-4 shadow-sm border text-center hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center flex-1">
              <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <ClipboardList className="h-6 w-6 text-gray-600" />
              </div>
              <CardTitle className="text-lg font-bold text-uclouvain-blue mb-2">
                Administration
              </CardTitle>
              <CardDescription className="text-sm text-gray-700 mb-4">
                Validez, supervisez et attribuez les surveillances, gérez les utilisateurs et assistances.
              </CardDescription>
            </div>
            <div className="flex justify-center">
              <Link to="/admin" className="w-full">
                <Button variant="outline" className="w-full text-sm font-medium rounded-lg h-9 border-uclouvain-cyan text-uclouvain-blue hover:bg-uclouvain-blue-grey hover:text-uclouvain-blue transition-colors">
                  Accéder à l'administration
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Features section compacte */}
        <div className="bg-white rounded-lg shadow-sm p-4 max-w-4xl mx-auto">
          <h3 className="text-lg font-bold text-center mb-4">Fonctionnalités principales</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-medium mb-1 text-sm">Gestion des Surveillants</h4>
              <p className="text-gray-600 text-xs">
                Saisie centralisée des disponibilités et accès aux attributions de surveillance.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-green-100 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-medium mb-1 text-sm">Workflow Enseignant</h4>
              <p className="text-gray-600 text-xs">
                Confirmation collaborative des examens et assistants affectés à chaque surveillances.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                <ClipboardList className="h-5 w-5 text-gray-600" />
              </div>
              <h4 className="font-medium mb-1 text-sm">Pilotage &amp; Statistiques</h4>
              <p className="text-gray-600 text-xs">
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
