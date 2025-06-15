
import { Input } from "@/components/ui/input";

interface PersonneAmenee {
  nom: string;
  prenom: string;
}

interface AmenesSurveillantsFieldsProps {
  nombre: number;
  personnes: PersonneAmenee[];
  setPersonnes: (personnes: PersonneAmenee[]) => void;
}

// Affiche dynamiquement les champs pour noms/prénoms (n = quantité)
export function AmenesSurveillantsFields({ nombre, personnes, setPersonnes }: AmenesSurveillantsFieldsProps) {
  const handlePersonneChange = (index: number, field: 'nom' | 'prenom', value: string) => {
    const nouveauxPersonnes = [...personnes];
    
    // S'assurer que l'objet existe à l'index donné
    if (!nouveauxPersonnes[index]) {
      nouveauxPersonnes[index] = { nom: "", prenom: "" };
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
        <div className="flex space-x-2" key={idx}>
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
      ))}
    </div>
  );
}
