
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { DemandeModificationModal } from "./DemandeModificationModal";

/**
 * Affiche le panneau avec toutes les infos + message explicite + message de correction possible.
 */
export function SurveillantProfilePanel({ surveillant, telephone, setTelephone, surveillancesADeduire, setSurveillancesADeduire, onDemandeModif }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="bg-blue-50 p-4 rounded space-y-3">
      <div className="mb-2 text-sm text-blue-900 font-semibold">
        Profil chargé à partir de notre base de données. <span className="block text-xs font-normal text-gray-600">(Si ces informations ne sont pas correctes, cliquez sur le bouton ci-dessous pour demander une correction.)</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center bg-white/70 border rounded px-4 py-1">
        <span className="font-bold text-lg">{surveillant.nom} {surveillant.prenom}</span>
        <Badge>{surveillant.type}</Badge>
        {surveillant.eft !== undefined && (
          <Badge variant="secondary">EFT : {surveillant.eft}</Badge>
        )}
      </div>
      <div className="mb-2 text-xs text-gray-800 p-2 rounded bg-yellow-50 border border-yellow-300">
        <strong>Si une information ne vous semble pas correcte</strong> (nom, quota, type, EFT, etc.), cliquez sur <span className="font-semibold">"Demander une modification de mes informations"</span> ci-dessous pour transmettre directement votre demande à l’administration.
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
          className="w-full md:w-auto"
        >
          Demander une modification de mes informations
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
