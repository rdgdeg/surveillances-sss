
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { DemandeModificationModal } from "./DemandeModificationModal";

export function SurveillantProfilePanel({ surveillant, telephone, setTelephone, surveillancesADeduire, setSurveillancesADeduire, onDemandeModif }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="bg-blue-50 p-4 rounded space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-bold">{surveillant.nom} {surveillant.prenom}</span>
        <Badge>{surveillant.type}</Badge>
        <Badge variant="secondary">Quota: {surveillant.quota || "?"}</Badge>
        <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
          Demander une modification
        </Button>
      </div>
      <div>
        <label>Téléphone&nbsp;<span className="font-bold text-red-600">*</span> :</label>
        <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+32..." required />
      </div>
      <div className="flex flex-col max-w-xs">
        <label className="text-sm font-medium mt-2">Surveillances à déduire d'une session précédente (optionnel) :</label>
        <Input
          type="number"
          min={0}
          value={surveillancesADeduire}
          onChange={e => setSurveillancesADeduire(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="0"
        />
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
