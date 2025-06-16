
import { FeatureProtection, FeatureLockIndicator } from "@/components/FeatureProtection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

interface ExamenCalculsProtectedProps {
  children: React.ReactNode;
}

export const ExamenCalculsProtected = ({ children }: ExamenCalculsProtectedProps) => {
  return (
    <FeatureProtection featureName="calcul_surveillants_theoriques">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Calculs des Surveillants</span>
            </div>
            <FeatureLockIndicator featureName="calcul_surveillants_theoriques" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </FeatureProtection>
  );
};
