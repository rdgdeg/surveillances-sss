
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Session } from "@/hooks/useSessions";

interface SessionSelectionScreenProps {
  sessions: Session[];
  activeSessionId?: string;
  email: string;
  surveillantData?: any;
  onSessionSelect: (sessionId: string) => void;
  existingDisponibilites?: any[];
}

export const SessionSelectionScreen = ({
  sessions,
  activeSessionId,
  email,
  surveillantData,
  onSessionSelect,
  existingDisponibilites = []
}: SessionSelectionScreenProps) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(activeSessionId || "");

  const availableSessions = sessions.filter(session => session.is_active);
  const hasExistingDispos = existingDisponibilites.length > 0;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-6 w-6" />
          <span>Sélection de la session d'examens</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-gray-600 mb-2">
            Bonjour {surveillantData?.prenom} {surveillantData?.nom}
          </p>
          <p className="text-sm text-gray-500">
            Email : {email}
          </p>
        </div>

        {hasExistingDispos && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-800 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Disponibilités existantes trouvées</span>
            </div>
            <p className="text-sm text-green-700">
              Vous avez déjà déclaré {existingDisponibilites.length} disponibilité{existingDisponibilites.length > 1 ? 's' : ''} 
              pour cette session. Vous pouvez les modifier ou en ajouter de nouvelles.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choisissez la session d'examens :
            </label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une session" />
              </SelectTrigger>
              <SelectContent>
                {availableSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    <div className="flex items-center space-x-2">
                      <span>{session.name}</span>
                      {session.id === activeSessionId && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableSessions.length === 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Aucune session active</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Il n'y a actuellement aucune session d'examens active. 
                Veuillez contacter l'administration.
              </p>
            </div>
          )}

          {selectedSessionId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-800 mb-2">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Session sélectionnée</span>
              </div>
              <p className="text-sm text-blue-700">
                Vous allez déclarer vos disponibilités pour la session :{" "}
                <strong>
                  {availableSessions.find(s => s.id === selectedSessionId)?.name}
                </strong>
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={() => onSessionSelect(selectedSessionId)}
            disabled={!selectedSessionId}
            size="lg"
            className="px-8"
          >
            {hasExistingDispos ? 'Modifier mes disponibilités' : 'Continuer vers mes disponibilités'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
