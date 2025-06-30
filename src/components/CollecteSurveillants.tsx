
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useManualCreneaux } from "@/hooks/useManualCreneaux";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateWithDayBelgian, formatTimeRange } from "@/lib/dateUtils";
import { DisponibilitesCollector } from "./DisponibilitesCollector";
import { GeneralAvailabilitiesManager } from "./GeneralAvailabilitiesManager";

export const CollecteSurveillants = () => {
  const { data: activeSession } = useActiveSession();
  const { data: creneaux = [], isLoading } = useManualCreneaux();
  const [selectedView, setSelectedView] = useState<"overview" | "collect" | "edit">("overview");

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour collecter les disponibilités.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse">Chargement des créneaux...</div>
        </CardContent>
      </Card>
    );
  }

  if (creneaux.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun créneau configuré</h3>
            <p className="text-gray-500 mb-4">
              Vous devez d'abord configurer et valider des créneaux de surveillance, 
              puis les associer aux examens avant de pouvoir collecter les disponibilités.
            </p>
            <Button asChild>
              <a href="/admin">Aller à la configuration des créneaux</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Statistiques
  const totalExamens = creneaux.reduce((acc, creneau) => acc + creneau.examens.length, 0);
  const datesUniques = new Set(creneaux.map(c => c.date)).size;
  const creneauxParJour = creneaux.reduce((acc, creneau) => {
    acc[creneau.date] = (acc[creneau.date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Collecte des disponibilités</span>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - Basée sur les créneaux manuels configurés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Statistiques générales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{creneaux.length}</div>
                  <div className="text-sm text-blue-700">Créneaux actifs</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalExamens}</div>
                  <div className="text-sm text-green-700">Examens associés</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{datesUniques}</div>
                  <div className="text-sm text-purple-700">Jours d'examens</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(creneaux.length / datesUniques * 10) / 10}
                  </div>
                  <div className="text-sm text-orange-700">Créneaux/jour (moy.)</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Vue d'ensemble</span>
          </TabsTrigger>
          <TabsTrigger value="collect" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Collecte</span>
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Gestion</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Créneaux par date</CardTitle>
              <CardDescription>
                Vue d'ensemble des créneaux de surveillance configurés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.keys(creneauxParJour)
                  .sort()
                  .map(date => {
                    const creneauxDuJour = creneaux.filter(c => c.date === date);
                    return (
                      <div key={date} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg">
                            {formatDateWithDayBelgian(date)}
                          </h3>
                          <Badge variant="outline">
                            {creneauxDuJour.length} créneaux
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {creneauxDuJour.map(creneau => (
                            <Card key={creneau.id} className="border-gray-200">
                              <CardContent className="pt-4">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                    <Badge variant="outline">
                                      {formatTimeRange(creneau.heure_debut, creneau.heure_fin)}
                                    </Badge>
                                  </div>
                                  {creneau.nom_creneau && (
                                    <div className="font-medium text-sm">
                                      {creneau.nom_creneau}
                                    </div>
                                  )}
                                  <div className="text-sm text-gray-600">
                                    {creneau.examens.length} examen{creneau.examens.length > 1 ? 's' : ''}
                                  </div>
                                  <div className="space-y-1">
                                    {creneau.examens.map(examen => (
                                      <div key={examen.id} className="text-xs bg-gray-50 p-2 rounded">
                                        <div className="font-medium">{examen.matiere}</div>
                                        <div className="text-gray-500">
                                          {examen.salle} • {examen.heure_debut}-{examen.heure_fin}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collect" className="space-y-6">
          <DisponibilitesCollector />
        </TabsContent>

        <TabsContent value="edit" className="space-y-6">
          <GeneralAvailabilitiesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
