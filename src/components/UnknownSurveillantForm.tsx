
import { Input } from "@/components/ui/input";

interface UnknownSurveillantFormProps {
  nom: string;
  setNom: (value: string) => void;
  prenom: string;
  setPrenom: (value: string) => void;
  telephone: string;
  setTelephone: (value: string) => void;
}

export function UnknownSurveillantForm({ 
  nom, 
  setNom, 
  prenom, 
  setPrenom, 
  telephone, 
  setTelephone 
}: UnknownSurveillantFormProps) {
  return (
    <div className="border p-4 rounded mb-2 bg-yellow-50">
      <div className="mb-3">
        <div className="text-orange-700 font-bold mb-1">👤 Profil non trouvé - Candidature spontanée</div>
        <div className="text-sm text-gray-600">
          Votre email n'est pas dans notre base de données. Vous pouvez tout de même postuler en remplissant vos informations ci-dessous.
        </div>
      </div>
      
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
      
      <p className="text-sm text-green-700 mt-2 font-medium">
        ✓ Vos informations seront transmises à l'administration pour validation.
      </p>
    </div>
  );
}
