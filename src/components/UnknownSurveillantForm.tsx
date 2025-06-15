
import { Input } from "@/components/ui/input";

export function UnknownSurveillantForm({ nom, setNom, prenom, setPrenom, telephone, setTelephone }) {
  return (
    <div className="border p-4 rounded mb-2 bg-yellow-50">
      <h3 className="font-semibold mb-3">Profil non trouvé - Candidature spontanée</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Nom <span className="text-red-600">*</span></label>
          <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Prénom <span className="text-red-600">*</span></label>
          <Input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Votre prénom" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium">Téléphone <span className="text-red-600">*</span></label>
          <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+324..." required />
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Vos informations seront transmises à l'administration pour validation.
      </p>
    </div>
  );
}
