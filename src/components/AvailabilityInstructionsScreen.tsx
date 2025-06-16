
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Info, User, Clock, Users, AlertTriangle } from "lucide-react";

interface AvailabilityInstructionsScreenProps {
  email: string;
  surveillantData: any;
  telephone: string;
  setTelephone: (value: string) => void;
  surveillancesADeduire: number;
  setSurveillancesADeduire: (value: number) => void;
  onContinue: () => void;
  nom: string;
  setNom: (value: string) => void;
  prenom: string;
  setPrenom: (value: string) => void;
  selectedSession: any;
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
  setPrenom,
  selectedSession
}: AvailabilityInstructionsScreenProps) => {
  return (
    <div className="space-y-6">
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Informations personnelles</span>
          </CardTitle>
          <CardDescription>
            Vérifiez et complétez vos informations avant de déclarer vos disponibilités.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations du profil */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Email :</span>
                <span>{email}</span>
              </div>
              {surveillantData && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Type :</span>
                    <Badge variant="outline">{surveillantData.type}</Badge>
                  </div>
                  {surveillantData.eft && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">ETP :</span>
                      <Badge variant="secondary">{surveillantData.eft}</Badge>
                    </div>
                  )}
                </>
              )}
              {selectedSession && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Session :</span>
                  <span className="text-sm">{selectedSession.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Formulaire pour nouveau candidat */}
          {!surveillantData && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Votre nom"
                  required
                />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Votre prénom"
                  required
                />
              </div>
            </div>
          )}

          {/* Téléphone - toujours requis */}
          <div>
            <Label htmlFor="telephone">Numéro de téléphone *</Label>
            <Input
              id="telephone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+32 4XX XX XX XX"
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              Numéro obligatoire pour vous contacter en cas de besoin
            </p>
          </div>

          {/* Surveillances à déduire - optionnel pour surveillants existants */}
          {surveillantData && (
            <div>
              <Label htmlFor="surveillances">
                Surveillances déjà effectuées hors session ou lors d'une session précédente (optionnel)
              </Label>
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
        </CardContent>
      </Card>

      {/* Informations importantes */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-orange-800">
            <Info className="h-5 w-5" />
            <span>Instructions importantes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Temps de préparation</p>
                <p className="text-sm text-orange-700">
                  Maximum 45 minutes avant chaque examen, mais ce temps dépendra du secrétariat et pourra donc être inférieur.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Sélection des créneaux</p>
                <p className="text-sm text-orange-700">
                  Plus vous sélectionnez de créneaux, mieux nous pourrons optimiser les attributions. 
                  N'hésitez pas à cocher tous les créneaux où vous pourriez être disponible.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Surveillances obligatoires</p>
                <p className="text-sm text-orange-700">
                  Si vous devez absolument surveiller un examen spécifique (ex: matière que vous enseignez), 
                  cochez "Surveillance obligatoire" et indiquez le code de l'examen.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={onContinue}
          size="lg"
          className="px-8"
          disabled={!telephone.trim() || (!surveillantData && (!nom.trim() || !prenom.trim()))}
        >
          Continuer vers la sélection des créneaux
        </Button>
      </div>
    </div>
  );
};
