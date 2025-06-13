
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Settings, Search, FileText, Shield, BarChart3, Clock } from "lucide-react";
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
            Attribution automatique, gestion des contraintes et suivi en temps réel.
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

      {/* Features Grid */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Fonctionnalités Principales
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dashboard */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Tableau de Bord</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Vue d'ensemble en temps réel des besoins, capacités et progression des attributions.
                  Alertes automatiques et indicateurs clés.
                </CardDescription>
                <div className="mt-4">
                  <Badge variant="secondary">KPIs temps réel</Badge>
                  <Badge variant="secondary" className="ml-2">Alertes</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Attribution Intelligente */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Settings className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Attribution Intelligente</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Algorithme d'attribution automatique respectant les contraintes, disponibilités et quotas.
                  Optimisation de la répartition.
                </CardDescription>
                <div className="mt-4">
                  <Badge variant="secondary">Automatique</Badge>
                  <Badge variant="secondary" className="ml-2">Optimisé</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Gestion des Disponibilités */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Disponibilités</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Matrice visuelle des disponibilités, import Cally, gestion des indisponibilités.
                  Interface intuitive et flexible.
                </CardDescription>
                <div className="mt-4">
                  <Badge variant="secondary">Import Cally</Badge>
                  <Badge variant="secondary" className="ml-2">Matrice</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Gestion des Surveillants */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>Gestion Surveillants</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Base de données complète, quotas personnalisés, historique des surveillances.
                  Suivi des soldes et réattributions.
                </CardDescription>
                <div className="mt-4">
                  <Badge variant="secondary">Quotas</Badge>
                  <Badge variant="secondary" className="ml-2">Historique</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Import de Données */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle>Import de Données</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Templates Excel, import guidé, contrôles de cohérence automatiques.
                  Recoupement par email sécurisé.
                </CardDescription>
                <div className="mt-4">
                  <Badge variant="secondary">Excel</Badge>
                  <Badge variant="secondary" className="ml-2">Validation</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Consultation Surveillant */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Search className="h-6 w-6 text-teal-600" />
                  </div>
                  <CardTitle>Espace Surveillant</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Consultation simple des surveillances attribuées par email.
                  Vue claire et organisée par session.
                </CardDescription>
                <div className="mt-4">
                  <Badge variant="secondary">Consultation</Badge>
                  <Badge variant="secondary" className="ml-2">Simple</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Accès Rapide
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
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
                    Accéder à l'Administration
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
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">100%</div>
              <div className="text-gray-600">Automatisation</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">⚡</div>
              <div className="text-gray-600">Attribution Rapide</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">🎯</div>
              <div className="text-gray-600">Optimisation</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">📊</div>
              <div className="text-gray-600">Suivi Temps Réel</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
