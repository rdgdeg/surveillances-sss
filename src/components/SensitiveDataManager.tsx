
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SensitiveDataManagerProps {
  showSensitiveData: boolean;
  onToggle: (show: boolean) => void;
}

export const SensitiveDataManager = ({ showSensitiveData, onToggle }: SensitiveDataManagerProps) => {
  const [isAdmin, setIsAdmin] = useState(true); // Pour l'instant, considérons que l'utilisateur est admin

  useEffect(() => {
    // Vérifier les permissions admin - à implémenter plus tard
    // Pour l'instant, on considère que tous les utilisateurs sont admins
  }, []);

  const handleToggle = (checked: boolean) => {
    if (!isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions pour voir les données sensibles.",
        variant: "destructive"
      });
      return;
    }
    
    onToggle(checked);
    
    toast({
      title: showSensitiveData ? "Données sensibles masquées" : "Données sensibles affichées",
      description: showSensitiveData 
        ? "Les données EFT, affectation, contrats sont maintenant masquées"
        : "Attention : données confidentielles visibles",
      variant: showSensitiveData ? "default" : "destructive"
    });
  };

  if (!isAdmin) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-yellow-800">
            <Shield className="h-5 w-5" />
            <span className="text-sm">Données sensibles disponibles uniquement pour les administrateurs</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-orange-900">
          <Shield className="h-5 w-5" />
          <span>Gestion des Données Sensibles</span>
        </CardTitle>
        <CardDescription className="text-orange-700">
          Contrôlez la visibilité des données confidentielles (EFT, affectations, contrats)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {showSensitiveData ? (
                <Eye className="h-4 w-4 text-orange-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm font-medium">
                Afficher les données sensibles
              </span>
            </div>
            <Switch
              checked={showSensitiveData}
              onCheckedChange={handleToggle}
            />
          </div>

          {showSensitiveData && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-800">
                <p className="font-medium mb-1">Données sensibles visibles :</p>
                <ul className="space-y-0.5">
                  <li>• EFT (Équivalent Temps Plein)</li>
                  <li>• Affectation de faculté</li>
                  <li>• Date de fin de contrat</li>
                  <li>• Campus d'affectation</li>
                  <li>• Numéro GSM personnel</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              Exclusion automatique FSM
            </Badge>
            <Badge variant="outline" className="text-xs">
              Quotas ajustés selon EFT
            </Badge>
            <Badge variant="outline" className="text-xs">
              Contrôle validité contrats
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
