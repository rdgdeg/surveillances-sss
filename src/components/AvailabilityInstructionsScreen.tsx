
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, RefreshCw, Users } from "lucide-react";

interface AvailabilityInstructionsScreenProps {
  email: string;
  surveillantData: any;
  telephone: string;
  setTelephone: (value: string) => void;
  surveillancesADeduire: number;
  setSurveillancesADeduire: (value: number) => void;
  onContinue: () => void;
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
            <span>Bienvenue dans la collecte de disponibilités</span>
          </CardTitle>
          <CardDescription>
            Email confirmé : <strong>{email}</strong>
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
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-medium text-green-800 mb-2">✓ Profil trouvé</h3>
              <p className="text-sm text-green-700">
                Bonjour <strong>{surveillantData.prenom} {surveillantData.nom}</strong>
              </p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="telephone">Téléphone *</Label>
              <Input
                id="telephone"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+32 4..."
                required
              />
            </div>

            {!isUnknownSurveillant && (
              <div>
                <Label htmlFor="surveillances">Surveillances à déduire (optionnel)</Label>
                <Input
                  id="surveillances"
                  type="number"
                  min="0"
                  value={surveillancesADeduire}
                  onChange={(e) => setSurveillancesADeduire(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Nombre de surveillances déjà effectuées à déduire de votre quota
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
