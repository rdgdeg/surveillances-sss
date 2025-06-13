
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
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Système de Gestion des Surveillances
              </h1>
              <p className="text-gray-600 mt-2">
                Université Libre de Bruxelles - Gestion automatisée des examens
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/admin">
                <Button variant="outline" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
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
            Gérez efficacement l'attribution des surveillants pour vos examens, 
            collectez les disponibilités et optimisez l'organisation de vos sessions d'examens.
          </p>
        </div>

        {/* Section spéciale pour les enseignants */}
        <div className="mb-12">
          <EnseignantExamenForm />
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Enseignants */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Enseignants</CardTitle>
              <CardDescription>
                Confirmez vos besoins en surveillance et les personnes qui vous aident
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/enseignant">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Confirmer mes examens
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Surveillants */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Surveillants</CardTitle>
              <CardDescription>
                Renseignez vos disponibilités pour les sessions d'examens
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/surveillant">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Mes disponibilités
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Candidatures */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Candidatures</CardTitle>
              <CardDescription>
                Candidatez pour devenir surveillant d'examens
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/collecte">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Candidater
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Formulaire de disponibilités */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl">Disponibilités</CardTitle>
              <CardDescription>
                Formulaire de collecte des disponibilités
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/disponibilites">
                <Button className="w-full bg-orange-600 hover:bg-orange-700">
                  Renseigner disponibilités
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Administration */}
          <Card className="hover:shadow-lg transition-shadow lg:col-span-2">
            <CardHeader className="text-center">
              <div className="mx-auto bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-gray-600" />
              </div>
              <CardTitle className="text-xl">Administration</CardTitle>
              <CardDescription>
                Gérez les examens, surveillants, et organisez les attributions automatiques
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/admin">
                <Button variant="outline" className="w-full">
                  Accéder à l'administration
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h3 className="text-2xl font-bold text-center mb-8">Fonctionnalités principales</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold mb-2">Gestion des Surveillants</h4>
              <p className="text-gray-600 text-sm">
                Gérez votre base de données de surveillants avec leurs qualifications et disponibilités
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="font-semibold mb-2">Attribution Automatique</h4>
              <p className="text-gray-600 text-sm">
                Algorithme intelligent d'attribution basé sur les contraintes et disponibilités
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-semibold mb-2">Suivi en Temps Réel</h4>
              <p className="text-gray-600 text-sm">
                Tableaux de bord et rapports pour suivre l'avancement des attributions
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
