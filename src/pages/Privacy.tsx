
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Politique de confidentialité (RGPD)</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Protection des données personnelles</span>
              </CardTitle>
              <CardDescription>
                Conformité au Règlement Général sur la Protection des Données (RGPD)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Collecte des données</span>
                </h3>
                <p className="text-muted-foreground">
                  Dans le cadre de la gestion des surveillances d'examen, nous collectons 
                  uniquement les données nécessaires : nom, prénom, email, téléphone, 
                  statut professionnel et disponibilités pour les créneaux de surveillance.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Finalité du traitement</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Organisation et planification des surveillances d'examen</li>
                  <li>Attribution des créneaux de surveillance</li>
                  <li>Communication avec les surveillants</li>
                  <li>Gestion administrative des surveillances</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Droits des utilisateurs</h3>
                <p className="text-muted-foreground">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Droit d'accès à vos données personnelles</li>
                  <li>Droit de rectification des données inexactes</li>
                  <li>Droit à l'effacement de vos données</li>
                  <li>Droit à la portabilité de vos données</li>
                  <li>Droit d'opposition au traitement</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>Sécurité et conservation</span>
                </h3>
                <p className="text-muted-foreground">
                  Vos données sont sécurisées et conservées uniquement le temps nécessaire 
                  à la gestion des surveillances. Elles ne sont partagées qu'avec les 
                  personnes autorisées dans le cadre de l'organisation des examens.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact</h3>
                <p className="text-muted-foreground">
                  Pour exercer vos droits ou pour toute question relative à la protection 
                  de vos données personnelles, contactez-nous à : rgpd@uclouvain.be
                </p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
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

export default Privacy;
