
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SurveillantDisponibilite } from "./SuiviDisponibilites";

interface ListeDisponibilitesSurveillantsProps {
  surveillants: SurveillantDisponibilite[];
}

export const ListeDisponibilitesSurveillants = ({ surveillants }: ListeDisponibilitesSurveillantsProps) => {
  // Tri alphabétique par nom puis prénom
  const sortedSurveillants = [...surveillants].sort((a, b) => {
    const nomA = a.nom?.toLowerCase() || "";
    const nomB = b.nom?.toLowerCase() || "";
    if (nomA < nomB) return -1;
    if (nomA > nomB) return 1;
    // Si nom égal, trie sur prénom
    const prenomA = a.prenom?.toLowerCase() || "";
    const prenomB = b.prenom?.toLowerCase() || "";
    if (prenomA < prenomB) return -1;
    if (prenomA > prenomB) return 1;
    return 0;
  });

  return (
    <div className="space-y-3">
      {sortedSurveillants.map((surveillant) => (
        <div key={surveillant.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium">{surveillant.nom} {surveillant.prenom}</span>
              <Badge variant="secondary">{surveillant.type}</Badge>
              {surveillant.pourcentage_completion === 100 && (
                <Badge variant="default" className="bg-green-500">Complet</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{surveillant.email}</p>
            <div className="flex items-center space-x-2">
              <Progress value={surveillant.pourcentage_completion} className="flex-1" />
              <span className="text-sm font-medium min-w-[60px]">
                {surveillant.pourcentage_completion}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <span>{surveillant.creneaux_repondus} / {surveillant.total_creneaux} créneaux</span>
              {surveillant.derniere_reponse && (
                <span className="ml-2">
                  • Dernière réponse: {new Date(surveillant.derniere_reponse).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>
      ))}
      {surveillants.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          Aucun surveillant actif trouvé pour cette session.
        </p>
      )}
    </div>
  );
};
