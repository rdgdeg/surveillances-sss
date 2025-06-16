
import { ReactNode } from "react";
import { useIsFeatureLocked } from "@/hooks/useFeatureLocks";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Shield } from "lucide-react";

interface FeatureProtectionProps {
  featureName: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const FeatureProtection = ({ featureName, children, fallback }: FeatureProtectionProps) => {
  const isLocked = useIsFeatureLocked(featureName);

  if (isLocked) {
    return fallback || (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-green-100 rounded-full">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-800">Fonctionnalité Verrouillée</h3>
              <p className="text-sm text-green-700 mt-1">
                Cette fonctionnalité est actuellement verrouillée et ne peut pas être modifiée.
              </p>
              <p className="text-xs text-green-600 mt-2">
                Fonctionnalité : {featureName}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

// Composant pour afficher l'état de verrouillage sans bloquer
export const FeatureLockIndicator = ({ featureName }: { featureName: string }) => {
  const isLocked = useIsFeatureLocked(featureName);

  if (!isLocked) return null;

  return (
    <div className="flex items-center space-x-1 text-green-600 text-xs">
      <Lock className="h-3 w-3" />
      <span>Verrouillé</span>
    </div>
  );
};
