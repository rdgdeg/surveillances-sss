
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Clock, Calendar, User, History } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const Surveillant = () => {
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [surveillantData, setSurveilantData] = useState(null);

  // Données d'exemple pour la démonstration
  const mockSurveilantData = {
    nom: "Dupont",
    prenom: "Marie",
    email: "marie.dupont@university.fr",
    type: "PAT",
    quota: 8,
    surveillancesAttribuees: [
      {
        id: 1,
        date: "2024-01-15",
        heure: "08:00-10:00",
        matiere: "Mathématiques L1",
        salle: "Amphi A",
        type: "PAT",
        duree: 2
      },
      {
        id: 2,
        date: "2024-01-17",
        heure: "14:00-16:00",
        matiere: "Physique L2",
        salle: "Salle 203",
        type: "Assistant",
        duree: 2
      },
      {
        id: 3,
        date: "2024-01-20",
        heure: "09:00-12:00",
        matiere: "Chimie L3",
        salle: "Labo 1",
        type: "PAT",
        duree: 3
      }
    ],
    totalSurveillances: 3,
    totalHeures: 7,
    historique: [
      {
        session: "Session Janvier 2024",
        surveillances: 5,
        heures: 12
      },
      {
        session: "Session Décembre 2023",
        surveillances: 3,
        heures: 8
      }
    ]
  };

  const handleLogin = () => {
    if (!email) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir votre adresse email.",
        variant: "destructive"
      });
      return;
    }

    // Simulation de connexion
    if (email.includes("@")) {
      setIsLoggedIn(true);
      setSurveilantData(mockSurveilantData);
      toast({
        title: "Connexion réussie",
        description: "Accès à votre espace personnel accordé.",
      });
    } else {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide.",
        variant: "destructive"
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PAT": return "bg-blue-100 text-blue-800";
      case "Assistant": return "bg-green-100 text-green-800";
      case "Jobiste": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Retour</span>
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <User className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">Espace Surveillant</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Login Form */}
        <main className="max-w-md mx-auto px-4 py-20">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto bg-green-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-900">Accès Surveillant</CardTitle>
              <CardDescription>
                Connectez-vous avec votre adresse email pour consulter vos surveillances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@university.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <Button 
                onClick={handleLogin}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Accéder à mon espace
              </Button>
              <p className="text-xs text-gray-500 text-center">
                En cas de problème d'accès, contactez l'administration
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Retour</span>
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <User className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">Mon Espace</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {surveillantData.prenom} {surveillantData.nom}
                </div>
                <div className="text-sm text-gray-500">{surveillantData.email}</div>
              </div>
              <Badge className={getTypeColor(surveillantData.type)}>
                {surveillantData.type}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Surveillances</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {surveillantData.totalSurveillances}
              </div>
              <p className="text-sm text-gray-600">sessions attribuées</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span>Heures</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {surveillantData.totalHeures}h
              </div>
              <p className="text-sm text-gray-600">sur {surveillantData.quota}h quota</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Quota utilisé</span>
                  <span>{Math.round((surveillantData.totalHeures / surveillantData.quota) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((surveillantData.totalHeures / surveillantData.quota) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Surveillances List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Mes Surveillances Attribuées</span>
            </CardTitle>
            <CardDescription>
              Planning de vos surveillances pour la session en cours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {surveillantData.surveillancesAttribuees.map((surveillance) => (
                <div key={surveillance.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">{surveillance.date}</Badge>
                        <Badge variant="outline">{surveillance.heure}</Badge>
                        <Badge className={getTypeColor(surveillance.type)}>
                          {surveillance.type}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{surveillance.matiere}</h3>
                        <p className="text-sm text-gray-600">Salle : {surveillance.salle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-gray-900">{surveillance.duree}h</div>
                      <p className="text-sm text-gray-500">durée</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Historique */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Historique</span>
            </CardTitle>
            <CardDescription>
              Vos surveillances des sessions précédentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {surveillantData.historique.map((session, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div>
                    <h4 className="font-medium text-gray-900">{session.session}</h4>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>{session.surveillances} surveillances</span>
                    <span>{session.heures}h total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Surveillant;
