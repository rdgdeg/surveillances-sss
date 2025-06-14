import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, UserCheck, Eye, Trash2, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import UCLouvainHeader from "@/components/UCLouvainHeader";

const Privacy = () => {
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
              <h1 className="text-3xl font-bold text-uclouvain-blue">Politique de Confidentialité (RGPD)</h1>
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
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Protection des Données Personnelles</span>
              </CardTitle>
              <CardDescription>
                Conformément au Règlement Général sur la Protection des Données (RGPD)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Collecte des Données</span>
                </h3>
                <p className="text-muted-foreground">
                  Dans le cadre de la gestion des surveillances d'examens, nous collectons les données 
                  suivantes :
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Nom et prénom</li>
                  <li>Adresse e-mail professionnelle</li>
                  <li>Numéro de téléphone (optionnel)</li>
                  <li>Statut professionnel (Assistant, Doctorant, PAT, etc.)</li>
                  <li>Disponibilités pour les créneaux d'examens</li>
                  <li>Historique des surveillances effectuées</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <UserCheck className="h-5 w-5" />
                  <span>Finalité du Traitement</span>
                </h3>
                <p className="text-muted-foreground">
                  Vos données personnelles sont utilisées exclusivement pour :
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>L'organisation des surveillances d'examens</li>
                  <li>La planification automatique des attributions</li>
                  <li>La communication des informations de surveillance</li>
                  <li>Le suivi des quotas et des historiques</li>
                  <li>La gestion administrative des surveillances</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Base Légale</h3>
                <p className="text-muted-foreground">
                  Le traitement de vos données repose sur l'exécution d'une mission d'intérêt public 
                  dans le cadre de l'organisation des examens universitaires, conformément à l'article 6.1.e du RGPD.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Conservation des Données</h3>
                <p className="text-muted-foreground">
                  Vos données sont conservées pendant la durée nécessaire à l'accomplissement des finalités 
                  pour lesquelles elles ont été collectées, soit :
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Données de surveillance active : durée de la session d'examens + 1 an</li>
                  <li>Historique des surveillances : 3 ans pour les besoins statistiques</li>
                  <li>Données de candidature : 1 an après la fin de la session</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Vos Droits</span>
                </h3>
                <p className="text-muted-foreground">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Droit d'accès :</strong> Vous pouvez demander une copie de vos données personnelles</li>
                  <li><strong>Droit de rectification :</strong> Vous pouvez corriger des données inexactes</li>
                  <li><strong>Droit à l'effacement :</strong> Vous pouvez demander la suppression de vos données</li>
                  <li><strong>Droit à la limitation :</strong> Vous pouvez demander la limitation du traitement</li>
                  <li><strong>Droit d'opposition :</strong> Vous pouvez vous opposer au traitement</li>
                  <li><strong>Droit à la portabilité :</strong> Vous pouvez récupérer vos données dans un format structuré</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Responsable du Traitement</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-muted-foreground">
                    <strong>Secteur des Sciences de la Santé</strong><br />
                    Université catholique de Louvain<br />
                    Avenue E. Mounier 50, 1200 Woluwe-Saint-Lambert<br />
                    E-mail : sss@uclouvain.be
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Exercice de vos Droits</h3>
                <p className="text-muted-foreground">
                  Pour exercer vos droits ou pour toute question relative à la protection de vos données, 
                  vous pouvez contacter :
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800">
                    <strong>Délégué à la Protection des Données (DPO)</strong><br />
                    E-mail : dpo@uclouvain.be<br />
                    Adresse : Place de l'Université 1, 1348 Louvain-la-Neuve
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Réclamation</h3>
                <p className="text-muted-foreground">
                  Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation 
                  auprès de l'Autorité de protection des données :
                </p>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-orange-800">
                    <strong>Autorité de protection des données</strong><br />
                    Rue de la Presse 35, 1000 Bruxelles<br />
                    E-mail : contact@apd-gba.be<br />
                    Tél : +32 2 274 48 00
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Cette politique de confidentialité peut être mise à jour. 
                  La version la plus récente est toujours disponible sur cette page.<br />
                  Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Développement et Propriété</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cette application a été développée par <strong>LD Media - Agence de communication et développement - Ath</strong>. 
                Toute reproduction, distribution ou utilisation non autorisée est strictement interdite.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
