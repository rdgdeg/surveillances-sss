
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, TrendingUp } from "lucide-react";

export function CollecteExplications() {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-blue-800 font-medium">Important :</p>
            <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
              <li>
                Si vous avez déjà une surveillance obligatoire pendant un créneau, cochez la case correspondante et renseignez le nom de l'examen.
              </li>
              <li>
                <TrendingUp className="h-4 w-4 inline mr-1" />
                En tant que surveillant, il est de votre obligation professionnelle de sélectionner le maximum de créneaux possibles. Cela n'est pas optionnel : tous les surveillants doivent déclarer un maximum de disponibilités.
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
