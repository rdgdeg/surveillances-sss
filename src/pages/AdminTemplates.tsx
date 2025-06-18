
import { AdminLayout } from "@/components/AdminLayout";
import { ExamenImportSection } from "@/components/ExamenImportSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Download, Upload } from "lucide-react";

export default function AdminTemplatesPage() {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <FileSpreadsheet className="h-8 w-8 text-uclouvain-blue" />
            <span>Templates & Import</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Téléchargez les templates Excel et importez vos données (surveillants, examens, contraintes).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates rapides */}
          <Card className="border-uclouvain-blue-grey">
            <CardHeader className="bg-gradient-uclouvain text-white">
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Templates Rapides</span>
              </CardTitle>
              <CardDescription className="text-blue-100">
                Templates les plus utilisés
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🔥 Surveillants</h4>
                  <p className="text-sm text-blue-700 mb-3">Template complet avec données sensibles</p>
                  <div className="text-xs text-blue-600">
                    <strong>Colonnes :</strong> nom, prenom, email, type, eft, faculte_interdite...
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">📅 Examens</h4>
                  <p className="text-sm text-green-700 mb-3">Planning des examens avec facultés</p>
                  <div className="text-xs text-green-600">
                    <strong>Colonnes :</strong> date, debut, fin, matiere, salle, faculte...
                  </div>
                </div>

                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">📋 Disponibilités</h4>
                  <p className="text-sm text-orange-700 mb-3">Disponibilités par surveillant et créneau</p>
                  <div className="text-xs text-orange-600">
                    <strong>Colonnes :</strong> email, date, debut, fin, disponible...
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section principale - Templates et Import */}
          <div className="lg:col-span-2">
            <ExamenImportSection />
          </div>
        </div>

        {/* Guides et conseils */}
        <Card className="border-uclouvain-blue-grey">
          <CardHeader>
            <CardTitle className="text-uclouvain-blue flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Guide d'utilisation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-uclouvain-blue mb-3">📝 Préparation des fichiers</h4>
                <ul className="text-sm space-y-2 text-gray-700">
                  <li>• <strong>Format :</strong> Excel (.xlsx) ou CSV (;)</li>
                  <li>• <strong>Encodage :</strong> UTF-8 recommandé</li>
                  <li>• <strong>Première ligne :</strong> En-têtes de colonnes</li>
                  <li>• <strong>Emails :</strong> Format valide obligatoire</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-uclouvain-blue mb-3">⚡ Bonnes pratiques</h4>
                <ul className="text-sm space-y-2 text-gray-700">
                  <li>• Télécharger d'abord le template correspondant</li>
                  <li>• Vérifier les données avant import</li>
                  <li>• Sauvegarder en cas de modification massive</li>
                  <li>• Tester avec quelques lignes d'abord</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
