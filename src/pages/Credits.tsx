import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Globe, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import UCLouvainHeader from "@/components/UCLouvainHeader";

const Credits = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <UCLouvainHeader />
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="outline" size="sm" className="border-uclouvain-blue text-uclouvain-blue hover:bg-uclouvain-blue hover:text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-uclouvain-blue">Crédits</h1>
            </div>
            <Button variant="outline" asChild className="border-uclouvain-cyan text-uclouvain-cyan hover:bg-uclouvain-cyan hover:text-uclouvain-blue">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Accueil
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Application développée par LD Media</CardTitle>
              <CardDescription>
                Agence de communication et développement - Ath
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">À propos de LD Media</h3>
                <p className="text-muted-foreground">
                  LD Media est une agence spécialisée dans la communication et le développement 
                  d'applications web sur mesure, basée à Ath. Nous accompagnons nos clients 
                  dans leurs projets numériques avec expertise et innovation.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Propriété intellectuelle</h3>
                <p className="text-muted-foreground">
                  Cette application de gestion des surveillances d'examen est la propriété 
                  exclusive de LD Media. Toute reproduction, distribution ou utilisation 
                  non autorisée est strictement interdite.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact</h3>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>contact@ldmedia.be</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>www.ldmedia.be</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  © 2024 LD Media. Tous droits réservés. Reproduction interdite.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Credits;
