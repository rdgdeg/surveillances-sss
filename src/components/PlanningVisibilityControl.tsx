import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Globe, AlertTriangle } from "lucide-react";
import { useActiveSession, useTogglePlanningVisibility } from "@/hooks/useSessions";

export const PlanningVisibilityControl = () => {
  const { data: activeSession } = useActiveSession();
  const togglePlanningMutation = useTogglePlanningVisibility();

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune session active</h3>
            <p className="text-gray-500">
              Activez une session pour gérer la visibilité du planning.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isVisible = activeSession.planning_general_visible || false;

  const handleToggle = () => {
    togglePlanningMutation.mutate({
      sessionId: activeSession.id,
      visible: !isVisible
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="h-5 w-5" />
          <span>Visibilité du Planning Général</span>
        </CardTitle>
        <CardDescription>
          Contrôlez si le planning général est visible sur la page d'accueil pour tous les utilisateurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-full ${isVisible ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isVisible ? (
                <Eye className="h-5 w-5 text-green-600" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-600" />
              )}
            </div>
            <div>
              <Label className="text-base font-medium">
                Planning général {isVisible ? 'visible' : 'masqué'}
              </Label>
              <p className="text-sm text-gray-600">
                Session: {activeSession.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={isVisible ? "default" : "secondary"}>
              {isVisible ? "Public" : "Masqué"}
            </Badge>
            <Switch
              checked={isVisible}
              onCheckedChange={handleToggle}
              disabled={togglePlanningMutation.isPending}
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Impact de cette option :</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Visible :</strong> Le bouton "Planning Général" est accessible sur la page d'accueil</li>
            <li>• <strong>Masqué :</strong> Le bouton affiche "Planning bientôt disponible" et est désactivé</li>
            <li>• Cette option n'affecte que la visibilité publique, les admins gardent toujours accès</li>
          </ul>
        </div>

        {!isVisible && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Le planning est actuellement masqué au public
              </span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Activez la visibilité une fois que tous les examens sont validés et les créneaux configurés.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};