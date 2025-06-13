
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Settings, Search, Shield, BarChart3, Clock, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-gray-900">SurveillanceManager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" asChild>
                <Link to="/surveillant">
                  <Search className="h-4 w-4 mr-2" />
                  Espace Surveillant
                </Link>
              </Button>
              <Button asChild>
                <Link to="/admin">
                  <Settings className="h-4 w-4 mr-2" />
                  Administration
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Gestion Intelligente
            <span className="block text-primary">des Surveillances</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Une solution complète pour organiser, planifier et optimiser les surveillances d'examens.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-4">
              <Link to="/admin">
                <BarChart3 className="h-5 w-5 mr-2" />
                Accéder au Tableau de Bord
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-4">
              <Link to="/surveillant">
                <Search className="h-5 w-5 mr-2" />
                Consulter mes Surveillances
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Accès Rapide
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-xl">Administrateurs</CardTitle>
                <CardDescription>
                  Gérez les sessions, configurez les contraintes et optimisez les attributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" className="w-full" asChild>
                  <Link to="/admin">
                    <Settings className="h-5 w-5 mr-2" />
                    Administration
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Surveillants</CardTitle>
                <CardDescription>
                  Consultez vos surveillances attribuées et vos plannings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" variant="outline" className="w-full" asChild>
                  <Link to="/surveillant">
                    <Search className="h-5 w-5 mr-2" />
                    Mes Surveillances
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 hover:border-green-400 transition-colors">
              <CardHeader className="text-center">
                <Calendar className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Disponibilités</CardTitle>
                <CardDescription>
                  Encodez vos disponibilités pour les surveillances d'examens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" variant="outline" className="w-full" asChild>
                  <Link to="/collecte">
                    <UserPlus className="h-5 w-5 mr-2" />
                    Encoder mes Disponibilités
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
