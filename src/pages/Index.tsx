import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, Settings, ClipboardList, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { EnseignantExamenForm } from "@/components/EnseignantExamenForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-uclouvain-blue text-white shadow-sm border-b border-uclouvain-cyan/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo UCLouvain */}
              <img
                src="/lovable-uploads/f6a7054d-ce38-4ede-84cf-87b92a350bea.png"
                alt="Logo UCLouvain"
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">UCLouvain</h1>
                <p className="text-uclouvain-cyan font-semibold">
                  Université catholique de Louvain – Système de Gestion des Surveillances
                </p>
                <p className="text-uclouvain-cyan/80 text-xs hidden md:block">
                  Secteur des Sciences de la Santé
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/admin">
                <Button variant="outline" className="flex items-center space-x-2 border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue transition-colors">
                  <ClipboardList className="h-4 w-4" />
                  <span>Administration</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenue dans le système de surveillance
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Plateforme unique pour l'organisation des examens : confirmations, assistants, attributions et disponibilités.
          </p>
        </div>

        {/* Section spéciale pour les enseignants */}
        <div className="mb-12">
          <EnseignantExamenForm />
        </div>

        {/* Cards Grid = Alignement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Enseignants */}
          <Card className="flex flex-col items-center justify-center h-full min-h-[340px] px-2 py-6 shadow-sm border">
            <CardHeader className="flex flex-col items-center justify-center text-center p-0 mb-3">
              <div className="mx-auto bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <GraduationCap className="h-7 w-7 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-uclouvain-blue mb-2">Enseignants</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center w-full flex-1 p-0">
              <CardDescription className="text-base text-gray-700 mb-5">
                Confirmez les examens dont vous êtes responsable et indiquez les assistants qui participeront à la surveillance.
              </CardDescription>
              <Link to="/enseignant" className="w-full flex justify-center">
                <Button className="w-[90%] max-w-xs bg-green-600 hover:bg-green-700 text-lg font-semibold rounded-lg h-12">
                  Gérer mes examens & assistants
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Surveillants */}
          <Card className="flex flex-col items-center justify-center h-full min-h-[340px] px-2 py-6 shadow-sm border">
            <CardHeader className="flex flex-col items-center justify-center text-center p-0 mb-3">
              <div className="mx-auto bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-uclouvain-blue mb-2">Surveillants</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center w-full flex-1 p-0">
              <CardDescription className="text-base text-gray-700 mb-5">
                Consultez vos attributions de surveillance et renseignez directement vos disponibilités.
              </CardDescription>
              <Link to="/surveillant" className="w-full flex justify-center">
                <Button className="w-[90%] max-w-xs bg-blue-600 hover:bg-blue-700 text-lg font-semibold rounded-lg h-12">
                  Mes attributions & disponibilités
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Administration */}
          <Card className="flex flex-col items-center justify-center h-full min-h-[340px] px-2 py-6 shadow-sm border">
            <CardHeader className="flex flex-col items-center justify-center text-center p-0 mb-3">
              <div className="mx-auto bg-gray-100 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="h-7 w-7 text-gray-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-uclouvain-blue mb-2">Administration</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center w-full flex-1 p-0">
              <CardDescription className="text-base text-gray-700 mb-5">
                Validez, supervisez et attribuez les surveillances, gérez les utilisateurs et assistances.
              </CardDescription>
              <Link to="/admin" className="w-full flex justify-center">
                <Button variant="outline" className="w-[90%] max-w-xs text-lg font-semibold rounded-lg h-12 border-uclouvain-cyan text-uclouvain-blue hover:bg-uclouvain-blue-grey hover:text-uclouvain-blue transition-colors">
                  Accéder à l’administration
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features section gardée inchangée */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h3 className="text-2xl font-bold text-center mb-8">Fonctionnalités principales</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold mb-2">Gestion des Surveillants</h4>
              <p className="text-gray-600 text-sm">
                Saisie centralisée des disponibilités et accès aux attributions de surveillance.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="font-semibold mb-2">Workflow Enseignant</h4>
              <p className="text-gray-600 text-sm">
                Confirmation collaborative des examens et assistants affectés à chaque surveillances.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="h-8 w-8 text-gray-600" />
              </div>
              <h4 className="font-semibold mb-2">Pilotage &amp; Statistiques</h4>
              <p className="text-gray-600 text-sm">
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
