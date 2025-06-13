
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Settings, Search, BarChart3, Clock, UserPlus, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/20">
      {/* Header */}
      <header className="bg-uclouvain-blue shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img 
                src="/lovable-uploads/f6a7054d-ce38-4ede-84cf-87b92a350bea.png" 
                alt="UCLouvain" 
                className="h-12 w-auto"
              />
              <div className="border-l-2 border-uclouvain-cyan pl-4">
                <h1 className="text-xl font-bold text-white">SurveillanceManager</h1>
                <p className="text-uclouvain-cyan text-sm">Secteur des Sciences de la Santé</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" asChild className="border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue">
                <Link to="/surveillant">
                  <Search className="h-4 w-4 mr-2" />
                  Espace Surveillant
                </Link>
              </Button>
              <Button asChild className="bg-uclouvain-cyan text-uclouvain-blue hover:bg-uclouvain-cyan/90">
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
          <div className="flex justify-center mb-8">
            <Badge variant="outline" className="text-uclouvain-blue border-uclouvain-blue px-4 py-2 text-sm font-medium">
              <GraduationCap className="h-4 w-4 mr-2" />
              Université catholique de Louvain
            </Badge>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-uclouvain-blue mb-6">
            Gestion Intelligente
            <span className="block text-uclouvain-cyan">des Surveillances</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Une solution complète pour organiser, planifier et optimiser les surveillances d'examens 
            du Secteur des Sciences de la Santé de l'UCLouvain.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-4 bg-uclouvain-blue hover:bg-uclouvain-blue/90">
              <Link to="/admin">
                <BarChart3 className="h-5 w-5 mr-2" />
                Accéder au Tableau de Bord
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-4 border-uclouvain-blue text-uclouvain-blue hover:bg-uclouvain-blue hover:text-white">
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
          <h3 className="text-3xl font-bold text-center text-uclouvain-blue mb-12">
            Accès Rapide
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-uclouvain-blue/20 hover:border-uclouvain-blue/40 transition-all duration-300 hover:shadow-lg group">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-uclouvain-blue rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-uclouvain-cyan transition-colors duration-300">
                  <Settings className="h-8 w-8 text-white group-hover:text-uclouvain-blue" />
                </div>
                <CardTitle className="text-xl text-uclouvain-blue">Administrateurs</CardTitle>
                <CardDescription>
                  Gérez les sessions, configurez les contraintes et optimisez les attributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" className="w-full bg-uclouvain-blue hover:bg-uclouvain-blue/90" asChild>
                  <Link to="/admin">
                    <Settings className="h-5 w-5 mr-2" />
                    Administration
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-uclouvain-cyan/40 hover:border-uclouvain-cyan transition-all duration-300 hover:shadow-lg group">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-uclouvain-cyan rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-uclouvain-blue transition-colors duration-300">
                  <Users className="h-8 w-8 text-uclouvain-blue group-hover:text-white" />
                </div>
                <CardTitle className="text-xl text-uclouvain-blue">Surveillants</CardTitle>
                <CardDescription>
                  Consultez vos surveillances attribuées et vos plannings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" variant="outline" className="w-full border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue" asChild>
                  <Link to="/surveillant">
                    <Search className="h-5 w-5 mr-2" />
                    Mes Surveillances
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-uclouvain-blue-grey/40 hover:border-uclouvain-blue-grey transition-all duration-300 hover:shadow-lg group">
              <CardHeader className="text-center">
                <div className="h-16 w-16 bg-uclouvain-blue-grey rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-uclouvain-blue transition-colors duration-300">
                  <Calendar className="h-8 w-8 text-uclouvain-blue group-hover:text-white" />
                </div>
                <CardTitle className="text-xl text-uclouvain-blue">Disponibilités</CardTitle>
                <CardDescription>
                  Encodez vos disponibilités pour les surveillances d'examens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" variant="outline" className="w-full border-uclouvain-blue-grey text-uclouvain-blue hover:bg-uclouvain-blue-grey hover:text-uclouvain-blue" asChild>
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
