
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PersonneAmenee {
  nom: string;
  prenom: string;
  est_assistant?: boolean;
}

interface AmenesSurveillantsFieldsProps {
  nombre: number;
  personnes: PersonneAmenee[];
  setPersonnes: (personnes: PersonneAmenee[]) => void;
}

// Affiche dynamiquement les champs pour noms/prénoms (n = quantité)
export function AmenesSurveillantsFields({ nombre, personnes, setPersonnes }: AmenesSurveillantsFieldsProps) {
  const handlePersonneChange = (index: number, field: 'nom' | 'prenom' | 'est_assistant', value: string | boolean) => {
    const nouveauxPersonnes = [...personnes];
    
    // S'assurer que l'objet existe à l'index donné
    if (!nouveauxPersonnes[index]) {
      nouveauxPersonnes[index] = { nom: "", prenom: "", est_assistant: false };
    }
    
    nouveauxPersonnes[index] = {
      ...nouveauxPersonnes[index],
      [field]: value
    };
    
    setPersonnes(nouveauxPersonnes);
  };

  return (
    <div className="space-y-3">
      {[...Array(nombre)].map((_, idx) => (
        <div className="space-y-2 p-3 border rounded-lg" key={idx}>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder={`Nom personne ${idx + 1}`}
                value={personnes[idx]?.nom || ""}
                onChange={e => handlePersonneChange(idx, 'nom', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder={`Prénom personne ${idx + 1}`}
                value={personnes[idx]?.prenom || ""}
                onChange={e => handlePersonneChange(idx, 'prenom', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`assistant-${idx}`}
              checked={personnes[idx]?.est_assistant || false}
              onCheckedChange={(checked) => handlePersonneChange(idx, 'est_assistant', !!checked)}
            />
            <Label htmlFor={`assistant-${idx}`} className="text-sm">
              Assistant SSS
            </Label>
          </div>
        </div>
      ))}
    </div>
  );
}
