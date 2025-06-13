
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Upload, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Surveillances Examens</h1>
            </div>
            <div className="text-sm text-gray-500">
              Système de gestion des surveillances
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Gestion des Surveillances d'Examens
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Système complet pour l'attribution automatique et la gestion des surveillants lors des sessions d'examens.
            Respecte les quotas, indisponibilités et contraintes de planification.
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-blue-900">Interface Administrateur</CardTitle>
              <CardDescription className="text-gray-600">
                Gestion complète des surveillances, upload des données, attribution automatique et planification
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/admin">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
                  Accéder à l'Administration
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-green-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto bg-green-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-900">Espace Surveillant</CardTitle>
              <CardDescription className="text-gray-600">
                Consultez vos surveillances attribuées, votre planning personnel et votre historique
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/surveillant">
                <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-3">
                  Consulter mes Surveillances
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-purple-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto bg-purple-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl text-purple-900">Candidature Surveillance</CardTitle>
              <CardDescription className="text-gray-600">
                Postulez pour surveiller des examens en renseignant vos disponibilités
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/collecte">
                <Button size="lg" variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-3">
                  Postuler comme Surveillant
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Fonctionnalités</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Upload className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Import de Données</h4>
              <p className="text-gray-600 text-sm">
                Upload et validation des fichiers Excel : examens, surveillants et indisponibilités
              </p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Attribution Automatique</h4>
              <p className="text-gray-600 text-sm">
                Moteur intelligent respectant quotas, indisponibilités et contraintes de planning
              </p>
            </div>
            <div className="text-center">
              <div className="bg-teal-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-teal-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Gestion Personnalisée</h4>
              <p className="text-gray-600 text-sm">
                Pré-assignations manuelles, modifications et suivi personnalisé par surveillant
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
