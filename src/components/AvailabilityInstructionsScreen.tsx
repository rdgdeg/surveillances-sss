
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, RefreshCw, Users, AlertTriangle, Smartphone, Info } from "lucide-react";
import { Session } from "@/hooks/useSessions";

interface AvailabilityInstructionsScreenProps {
  email: string;
  surveillantData: any;
  telephone: string;
  setTelephone: (value: string) => void;
  surveillancesADeduire: number;
  setSurveillancesADeduire: (value: number) => void;
  onContinue: () => void;
  selectedSession?: Session;
  // Pour surveillant inconnu
  nom?: string;
  setNom?: (value: string) => void;
  prenom?: string;
  setPrenom?: (value: string) => void;
}

export const AvailabilityInstructionsScreen = ({
  email,
  surveillantData,
  telephone,
  setTelephone,
  surveillancesADeduire,
  setSurveillancesADeduire,
  onContinue,
  selectedSession,
  nom,
  setNom,
  prenom,
  setPrenom
}: AvailabilityInstructionsScreenProps) => {
  const isUnknownSurveillant = !surveillantData;

  const handleContinue = () => {
    if (isUnknownSurveillant && (!nom || !prenom || !telephone)) {
      return;
    }
    if (!isUnknownSurveillant && !telephone) {
      return;
    }
    onContinue();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Vos informations personnelles</span>
          </CardTitle>
          <CardDescription>
            Email : <strong>{email}</strong>
            {selectedSession && (
              <span className="block text-sm text-gray-500 mt-1">
                Session : <strong>{selectedSession.name}</strong>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isUnknownSurveillant ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <h3 className="font-medium text-yellow-800 mb-2">👤 Profil non trouvé - Candidature spontanée</h3>
                <p className="text-sm text-yellow-700">
                  Votre email n'est pas dans notre base de données. Vous pouvez tout de même postuler en remplissant vos informations ci-dessous.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={nom || ''}
                    onChange={(e) => setNom?.(e.target.value)}
                    placeholder="Votre nom"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={prenom || ''}
                    onChange={(e) => setPrenom?.(e.target.value)}
                    placeholder="Votre prénom"
                    required
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="font-medium text-green-800 mb-2">✓ Profil trouvé</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Nom :</strong> {surveillantData.nom}</p>
                  <p><strong>Prénom :</strong> {surveillantData.prenom}</p>
                  <p><strong>Type :</strong> {surveillantData.type}</p>
                  {surveillantData.eft && <p><strong>ETP :</strong> {surveillantData.eft}</p>}
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Besoin de modifier vos informations ?
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  Si certaines informations affichées ne sont pas correctes (nom, prénom, statut), 
                  veuillez contacter le service des surveillances après avoir complété ce formulaire.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="telephone" className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span>Numéro de GSM * (obligatoire)</span>
              </Label>
              <Input
                id="telephone"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+32 4XX XX XX XX"
                required
              />
              <div className="bg-orange-50 border border-orange-200 rounded p-3 mt-2">
                <p className="text-xs text-orange-800">
                  <strong>Important :</strong> Ce numéro sera utilisé uniquement pour vous contacter 
                  en cas de problème de dernière minute (changement de salle, annulation, etc.). 
                  Il ne sera pas communiqué à d'autres services.
                </p>
              </div>
            </div>

            {!isUnknownSurveillant && (
              <div>
                <Label htmlFor="surveillances">Surveillances déjà effectuées cette session (optionnel)</Label>
                <Input
                  id="surveillances"
                  type="number"
                  min="0"
                  value={surveillancesADeduire}
                  onChange={(e) => setSurveillancesADeduire(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Nombre de surveillances déjà effectuées à déduire de votre quota pour cette session
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Instructions importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium">Maximisez vos disponibilités</h4>
              <p className="text-sm text-gray-600">
                Plus vous indiquez de créneaux disponibles, plus nous pourrons optimiser la répartition des surveillances. 
                N'hésitez pas à cocher tous les créneaux où vous pourriez être disponible.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium">Types de disponibilité</h4>
              <p className="text-sm text-gray-600">
                <strong>Souhaitée :</strong> vous préférez surveiller ce créneau<br />
                <strong>Obligatoire :</strong> vous devez absolument surveiller ce créneau (avec justification)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <RefreshCw className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium">Modifications possibles</h4>
              <p className="text-sm text-gray-600">
                Vous pourrez revenir modifier vos disponibilités après validation en utilisant le même lien ou en saisissant à nouveau votre email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={handleContinue}
          disabled={
            (isUnknownSurveillant && (!nom || !prenom || !telephone)) ||
            (!isUnknownSurveillant && !telephone)
          }
          size="lg"
          className="px-8"
        >
          Continuer vers mes disponibilités
        </Button>
      </div>
    </div>
  );
};
