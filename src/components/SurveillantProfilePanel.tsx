
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { DemandeModificationModal } from "./DemandeModificationModal";

interface SurveillantProfilePanelProps {
  surveillant: {
    id: string;
    nom: string;
    prenom: string;
    type: string;
    email: string;
    eft?: number;
  };
  telephone: string;
  setTelephone: (value: string) => void;
  surveillancesADeduire: number;
  setSurveillancesADeduire: (value: number) => void;
  onDemandeModif: () => void;
}

/**
 * Affiche le panneau avec toutes les infos + message explicite + message de correction possible.
 */
export function SurveillantProfilePanel({ 
  surveillant, 
  telephone, 
  setTelephone, 
  surveillancesADeduire, 
  setSurveillancesADeduire, 
  onDemandeModif 
}: SurveillantProfilePanelProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="bg-blue-50 p-4 rounded space-y-3">
      <div className="mb-2 text-sm text-blue-900 font-semibold">
        <div className="text-green-700 font-bold mb-2">✓ Profil trouvé dans notre base de données</div>
        <div className="text-xs font-normal text-gray-600">
          Voici vos informations enregistrées. Si elles ne sont pas correctes, vous pouvez demander une modification.
        </div>
      </div>
      
      <div className="bg-white/90 border rounded p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-bold text-lg">{surveillant.nom} {surveillant.prenom}</span>
          <Badge variant="outline" className="bg-blue-100">{surveillant.type}</Badge>
          {surveillant.eft !== undefined && (
            <Badge variant="secondary" className="bg-green-100">EFT : {(surveillant.eft * 100).toFixed(0)}%</Badge>
          )}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Email :</span> {surveillant.email}
        </div>
      </div>

      <div className="mb-2 text-xs text-gray-800 p-2 rounded bg-yellow-50 border border-yellow-300">
        <strong>⚠️ Informations incorrectes ?</strong> Si une information ne vous semble pas correcte 
        (nom, prénom, type, EFT, quota, etc.), cliquez sur le bouton 
        <span className="font-semibold"> "Demander une modification de mes informations" </span>
        ci-dessous pour transmettre directement votre demande à l'administration.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Téléphone <span className="text-red-600">*</span></label>
          <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+32..." required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Surveillances à déduire (optionnel)</label>
          <Input
            type="number"
            min={0}
            value={surveillancesADeduire}
            onChange={e => setSurveillancesADeduire(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0"
          />
        </div>
      </div>
      
      <div className="border-t pt-3">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setModalOpen(true)}
          className="w-full md:w-auto border-orange-400 text-orange-700 hover:bg-orange-50"
        >
          📝 Demander une modification de mes informations
        </Button>
      </div>
      
      <DemandeModificationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        surveillantId={surveillant.id}
        email={surveillant.email}
      />
    </div>
  );
}
