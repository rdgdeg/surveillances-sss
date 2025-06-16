
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, FileSpreadsheet, Settings } from "lucide-react";

export default function Index() {
  return (
    <>
      <UCLouvainHeader />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Gestion des Surveillances d'Examens
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Plateforme de gestion des surveillances d'examens pour l'UCLouvain. 
              Candidatures, disponibilités et planification centralisées.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Candidature Surveillance */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Candidature Surveillance</span>
                </CardTitle>
                <CardDescription>
                  Postulez pour devenir surveillant d'examens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => window.location.href = '/collecte'}
                >
                  Postuler maintenant
                </Button>
              </CardContent>
            </Card>

            {/* Disponibilités */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span>Mes Disponibilités</span>
                </CardTitle>
                <CardDescription>
                  Renseignez vos créneaux de disponibilité
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => window.location.href = '/disponibilites'}
                >
                  Gérer mes disponibilités
                </Button>
              </CardContent>
            </Card>

            {/* Espace Enseignant */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                  <span>Espace Enseignant</span>
                </CardTitle>
                <CardDescription>
                  Confirmez vos besoins de surveillance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => window.location.href = '/enseignant'}
                >
                  Accéder à mon espace
                </Button>
              </CardContent>
            </Card>

            {/* Administration */}
            <Card className="hover:shadow-lg transition-shadow border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-orange-600" />
                  <span>Administration</span>
                </CardTitle>
                <CardDescription>
                  Interface de gestion (accès restreint)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => window.location.href = '/admin'}
                >
                  Accès administrateur
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Information Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              À propos de la plateforme
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Pour les candidats surveillants
                </h3>
                <p className="text-gray-600">
                  Postulez facilement pour devenir surveillant d'examens. 
                  Renseignez vos informations personnelles et vos disponibilités 
                  pour participer aux sessions d'examens.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Pour les enseignants
                </h3>
                <p className="text-gray-600">
                  Confirmez les besoins spécifiques de surveillance pour vos examens. 
                  Gérez votre équipe pédagogique et les exigences particulières 
                  de surveillance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
