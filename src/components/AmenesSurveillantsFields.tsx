
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
  return (
    <div className="space-y-2">
      {[...Array(nombre)].map((_, idx) => (
        <div className="flex space-x-2" key={idx}>
          <Input
            placeholder={`Nom personne ${idx + 1}`}
            value={personnes[idx]?.nom || ""}
            onChange={e => {
              const copies = [...personnes];
              copies[idx] = { ...copies[idx], nom: e.target.value };
              setPersonnes(copies);
            }}
          />
          <Input
            placeholder={`Prénom personne ${idx + 1}`}
            value={personnes[idx]?.prenom || ""}
            onChange={e => {
              const copies = [...personnes];
              copies[idx] = { ...copies[idx], prenom: e.target.value };
              setPersonnes(copies);
            }}
          />
        </div>
      ))}
    </div>
  );
}
