
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock } from "lucide-react";

interface JobistePreferencesSectionProps {
  statut: string;
  preferences: {
    souhaite_maximum: boolean;
    plusieurs_par_jour: boolean;
    commentaires: string;
  };
  onPreferencesChange: (preferences: any) => void;
}

export function JobistePreferencesSection({
  statut,
  preferences,
  onPreferencesChange
}: JobistePreferencesSectionProps) {
  if (statut !== 'Jobiste') return null;

  const handlePreferenceChange = (key: string, value: boolean | string) => {
    onPreferencesChange({
      ...preferences,
      [key]: value
    });
  };

  return (
    <Card className="border-uclouvain-cyan/20 bg-uclouvain-cyan/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2 text-uclouvain-blue">
          <Users className="h-5 w-5" />
          <span>Préférences Jobiste</span>
        </CardTitle>
        <CardDescription>
          En tant que jobiste, veuillez indiquer vos préférences concernant la quantité de surveillance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="souhaite-maximum"
            checked={preferences.souhaite_maximum}
            onCheckedChange={(checked) => handlePreferenceChange('souhaite_maximum', !!checked)}
          />
          <Label htmlFor="souhaite-maximum" className="text-sm">
            Je souhaite un maximum de surveillances (dans la limite de mon quota)
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="plusieurs-par-jour"
            checked={preferences.plusieurs_par_jour}
            onCheckedChange={(checked) => handlePreferenceChange('plusieurs_par_jour', !!checked)}
          />
          <Label htmlFor="plusieurs-par-jour" className="text-sm flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>Je peux assurer plusieurs surveillances le même jour</span>
          </Label>
        </div>
        
        <div>
          <Label htmlFor="commentaires-jobiste" className="text-sm text-gray-600">
            Commentaires additionnels (optionnel)
          </Label>
          <Textarea
            id="commentaires-jobiste"
            value={preferences.commentaires}
            onChange={(e) => handlePreferenceChange('commentaires', e.target.value)}
            placeholder="Précisions sur vos disponibilités, contraintes particulières..."
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
