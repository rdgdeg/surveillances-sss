
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Search, Calendar, Clock } from "lucide-react";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";

interface ExamenDetail {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
  code_examen: string;
}

interface CreneauSurveillance {
  debut: string;
  fin: string;
}

interface ExamenCouverture {
  examen: ExamenDetail;
  creneauxCouvrants: CreneauSurveillance[];
  estCouvert: boolean;
}

export const ExamenCoverageVerification = () => {
  const { data: activeSession } = useActiveSession();
  const [verificationActive, setVerificationActive] = useState(false);
  const [resultatsVerification, setResultatsVerification] = useState<ExamenCouverture[]>([]);

  // Récupérer tous les examens validés de la session active
  const { data: examensValides = [] } = useQuery({
    queryKey: ['examens-valides', activeSession?.id],
    queryFn: async (): Promise<ExamenDetail[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere, salle, code_examen')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .eq('statut_validation', 'VALIDE')
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Définir les créneaux de surveillance fixes
  const creneauxSurveillance: CreneauSurveillance[] = [
    { debut: '08:15', fin: '11:00' },
    { debut: '08:15', fin: '12:00' },
    { debut: '12:15', fin: '15:00' },
    { debut: '15:15', fin: '18:00' },
    { debut: '15:45', fin: '18:30' }
  ];

  // Fonction pour vérifier si un examen est couvert par un créneau
  const verifierCouverture = (examen: ExamenDetail, creneau: CreneauSurveillance): boolean => {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const creneauDebutMin = toMinutes(creneau.debut);
    const creneauFinMin = toMinutes(creneau.fin);
    const examDebutMin = toMinutes(examen.heure_debut);
    const examFinMin = toMinutes(examen.heure_fin);

    // L'examen doit commencer au plus tôt 45 minutes après le début du créneau
    // et finir au plus tard à la fin du créneau
    const debutSurveillanceMin = examDebutMin - 45;

    return debutSurveillanceMin >= creneauDebutMin && examFinMin <= creneauFinMin;
  };

  // Fonction principale de vérification
  const lancerVerification = () => {
    setVerificationActive(true);

    const resultats: ExamenCouverture[] = examensValides.map(examen => {
      const creneauxCouvrants = creneauxSurveillance.filter(creneau => 
        verifierCouverture(examen, creneau)
      );

      return {
        examen,
        creneauxCouvrants,
        estCouvert: creneauxCouvrants.length > 0
      };
    });

    setResultatsVerification(resultats);

    const examensNonCouvers = resultats.filter(r => !r.estCouvert);
    
    if (examensNonCouvers.length === 0) {
      toast({
        title: "Vérification réussie",
        description: `Tous les ${examensValides.length} examens validés sont couverts par les créneaux de surveillance.`,
      });
    } else {
      toast({
        title: "Examens non couverts détectés",
        description: `${examensNonCouvers.length} examen(s) ne sont pas couverts par les créneaux standards.`,
        variant: "destructive"
      });
    }
  };

  const examensNonCouvers = resultatsVerification.filter(r => !r.estCouvert);
  const examensCouvers = resultatsVerification.filter(r => r.estCouvert);

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour vérifier la couverture des examens.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Vérification de couverture des examens</span>
          </CardTitle>
          <CardDescription>
            Vérifiez que tous les examens validés sont couverts par les créneaux de surveillance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              <strong>{examensValides.length}</strong> examens validés dans la session {activeSession.name}
            </div>
            <Button 
              onClick={lancerVerification}
              className="flex items-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>Lancer la vérification</span>
            </Button>
          </div>

          {verificationActive && (
            <div className="space-y-4">
              {/* Résumé */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 flex items-center justify-center space-x-1">
                        <CheckCircle className="h-6 w-6" />
                        <span>{examensCouvers.length}</span>
                      </div>
                      <div className="text-sm text-green-700">Examens couverts</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 flex items-center justify-center space-x-1">
                        <AlertTriangle className="h-6 w-6" />
                        <span>{examensNonCouvers.length}</span>
                      </div>
                      <div className="text-sm text-red-700">Examens non couverts</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Examens non couverts */}
              {examensNonCouvers.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Attention :</strong> {examensNonCouvers.length} examen(s) ne sont pas couverts par les créneaux de surveillance standards.
                  </AlertDescription>
                </Alert>
              )}

              {/* Liste détaillée des examens */}
              <div className="space-y-4">
                {examensNonCouvers.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-700 flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Examens non couverts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {examensNonCouvers.map(({ examen }) => (
                          <Card key={examen.id} className="bg-red-50 border-red-200">
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{examen.matiere}</div>
                                  <div className="text-sm text-gray-600">
                                    {examen.code_examen} • {examen.salle}
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDateBelgian(examen.date_examen)}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{formatTimeRange(examen.heure_debut, examen.heure_fin)}</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="destructive">Non couvert</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {examensCouvers.length > 0 && (
                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="text-green-700 flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5" />
                        <span>Examens couverts ({examensCouvers.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {examensCouvers.map(({ examen, creneauxCouvrants }) => (
                          <Card key={examen.id} className="bg-green-50 border-green-200">
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{examen.matiere}</div>
                                    <div className="text-sm text-gray-600">
                                      {examen.code_examen} • {examen.salle}
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{formatDateBelgian(examen.date_examen)}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatTimeRange(examen.heure_debut, examen.heure_fin)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="secondary">Couvert</Badge>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {creneauxCouvrants.map((creneau, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {formatTimeRange(creneau.debut, creneau.fin)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
