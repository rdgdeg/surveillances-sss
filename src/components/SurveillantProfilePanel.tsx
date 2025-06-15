
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { DemandeModificationModal } from "./DemandeModificationModal";

export function SurveillantProfilePanel({ surveillant, telephone, setTelephone, surveillancesADeduire, setSurveillancesADeduire, onDemandeModif }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="bg-blue-50 p-4 rounded space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-bold text-lg">{surveillant.nom} {surveillant.prenom}</span>
        <Badge>{surveillant.type}</Badge>
        <Badge variant="secondary">Quota: {surveillant.quota || "?"}</Badge>
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
        <p className="text-xs text-gray-600 mt-1">
          Utilisez ce bouton pour demander la correction de votre quota, statut, ou autres informations personnelles.
        </p>
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
