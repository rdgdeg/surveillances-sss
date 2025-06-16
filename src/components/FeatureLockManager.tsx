
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useFeatureLocks, useToggleFeatureLock, FeatureLock } from "@/hooks/useFeatureLocks";
import { Lock, Unlock, Shield, AlertTriangle } from "lucide-react";

export const FeatureLockManager = () => {
  const { data: featureLocks, isLoading } = useFeatureLocks();
  const toggleFeatureLock = useToggleFeatureLock();
  const [selectedFeature, setSelectedFeature] = useState<FeatureLock | null>(null);
  const [notes, setNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Chargement des fonctionnalités...</div>
        </CardContent>
      </Card>
    );
  }

  // Grouper par catégorie
  const groupedFeatures = featureLocks?.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureLock[]>) || {};

  const handleToggleLock = (feature: FeatureLock, newLockState: boolean) => {
    setSelectedFeature(feature);
    setNotes(feature.notes || "");
    
    if (newLockState) {
      // Verrouillage direct
      toggleFeatureLock.mutate({
        id: feature.id,
        isLocked: true,
        notes: notes || `Fonctionnalité verrouillée le ${new Date().toLocaleDateString()}`
      });
    } else {
      // Déverrouillage avec confirmation
      setIsDialogOpen(true);
    }
  };

  const confirmUnlock = () => {
    if (selectedFeature) {
      toggleFeatureLock.mutate({
        id: selectedFeature.id,
        isLocked: false,
        notes
      });
    }
    setIsDialogOpen(false);
    setSelectedFeature(null);
    setNotes("");
  };

  const getStatusIcon = (isLocked: boolean) => {
    return isLocked ? (
      <Lock className="h-4 w-4 text-green-600" />
    ) : (
      <Unlock className="h-4 w-4 text-orange-500" />
    );
  };

  const getStatusBadge = (isLocked: boolean) => {
    return isLocked ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <Shield className="h-3 w-3 mr-1" />
        Verrouillé
      </Badge>
    ) : (
      <Badge variant="outline" className="text-orange-600 border-orange-300">
        <AlertTriangle className="h-3 w-3 mr-1" />
        En développement
      </Badge>
    );
  };

  const lockedCount = featureLocks?.filter(f => f.is_locked).length || 0;
  const totalCount = featureLocks?.length || 0;

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Verrouillage des Fonctionnalités</span>
            </div>
            <div className="text-sm text-gray-600">
              {lockedCount} / {totalCount} fonctionnalités verrouillées
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{lockedCount}</div>
              <div className="text-sm text-green-700">Fonctionnalités verrouillées</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{totalCount - lockedCount}</div>
              <div className="text-sm text-orange-700">En développement</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{Object.keys(groupedFeatures).length}</div>
              <div className="text-sm text-blue-700">Catégories</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste par catégorie */}
      {Object.entries(groupedFeatures).map(([category, features]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {features.map((feature) => (
                <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(feature.is_locked)}
                      <div>
                        <h4 className="font-medium">{feature.feature_name}</h4>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                        {feature.notes && (
                          <p className="text-xs text-gray-500 mt-1">{feature.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(feature.is_locked)}
                    <Switch
                      checked={feature.is_locked}
                      onCheckedChange={(checked) => handleToggleLock(feature, checked)}
                      disabled={toggleFeatureLock.isPending}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog de confirmation pour déverrouillage */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déverrouiller la fonctionnalité</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de déverrouiller "{selectedFeature?.feature_name}". 
              Cette action permettra de modifier cette fonctionnalité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="unlock-notes">Notes de déverrouillage</Label>
              <Textarea
                id="unlock-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Raison du déverrouillage, modifications prévues..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={confirmUnlock} disabled={toggleFeatureLock.isPending}>
              {toggleFeatureLock.isPending ? "Déverrouillage..." : "Déverrouiller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
