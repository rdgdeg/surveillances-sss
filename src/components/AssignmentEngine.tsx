
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Pause, RotateCcw, CheckCircle, AlertTriangle, Settings, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const AssignmentEngine = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  // Simulation des résultats d'attribution
  const mockResults = {
    totalExamens: 12,
    examensAssignes: 10,
    examensEnConflit: 2,
    surveillantsUtilises: 8,
    quotasRespectés: 7,
    quotasDepasses: 1,
    heuresTotal: 96,
    heuresAssignees: 78
  };

  const mockConflicts = [
    {
      type: "quota_depasse",
      message: "Marie Dupont dépasse son quota de 2h (10h assignées / 8h quota)",
      severity: "high",
      suggestions: ["Réduire les affectations", "Augmenter le quota"]
    },
    {
      type: "type_manquant",
      message: "Examen Physique L3 (16/01 14h) : aucun PAT disponible",
      severity: "critical",
      suggestions: ["Assigner manuellement un PAT", "Modifier le type requis"]
    },
    {
      type: "indisponibilite",
      message: "Jean Martin indisponible le 17/01 mais assigné à Chimie L1",
      severity: "medium",
      suggestions: ["Changer d'assignation", "Vérifier les dates"]
    }
  ];

  const startAssignment = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);
    setConflicts([]);

    // Simulation du processus d'attribution
    const steps = [
      "Chargement des données...",
      "Vérification des contraintes...",
      "Attribution des sessions imposées...",
      "Attribution automatique...",
      "Vérification des quotas...",
      "Résolution des conflits...",
      "Finalisation..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(((i + 1) / steps.length) * 100);
      
      toast({
        title: "Attribution en cours",
        description: steps[i],
      });
    }

    setResults(mockResults);
    setConflicts(mockConflicts);
    setIsRunning(false);

    toast({
      title: "Attribution terminée",
      description: `${mockResults.examensAssignes}/${mockResults.totalExamens} examens assignés avec ${mockConflicts.length} conflits détectés.`,
    });
  };

  const pauseAssignment = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? "Attribution reprise" : "Attribution mise en pause",
      description: isPaused ? "Le processus continue." : "Le processus est temporairement arrêté.",
    });
  };

  const resetAssignment = () => {
    setIsRunning(false);
    setIsPaused(false);
    setProgress(0);
    setResults(null);
    setConflicts([]);
    toast({
      title: "Attribution réinitialisée",
      description: "Toutes les données d'attribution ont été effacées.",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "border-red-500 bg-red-50";
      case "high": return "border-orange-500 bg-orange-50";
      case "medium": return "border-yellow-500 bg-yellow-50";
      default: return "border-gray-500 bg-gray-50";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "high": return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "medium": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Contrôles du moteur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Moteur d'Attribution Automatique</span>
          </CardTitle>
          <CardDescription>
            Lance l'attribution automatique des surveillances en respectant toutes les contraintes définies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Boutons de contrôle */}
          <div className="flex items-center space-x-4">
            <Button 
              onClick={startAssignment}
              disabled={isRunning}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
              <span>Lancer l'attribution</span>
            </Button>
            
            {isRunning && (
              <Button 
                onClick={pauseAssignment}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Pause className="h-4 w-4" />
                <span>{isPaused ? "Reprendre" : "Pause"}</span>
              </Button>
            )}
            
            <Button 
              onClick={resetAssignment}
              variant="outline"
              disabled={isRunning && !isPaused}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Réinitialiser</span>
            </Button>
          </div>

          {/* Barre de progression */}
          {(isRunning || results) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {isPaused && (
                <Alert>
                  <Pause className="h-4 w-4" />
                  <AlertDescription>
                    Attribution en pause. Cliquez sur "Reprendre" pour continuer.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Paramètres d'attribution */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium flex items-center space-x-2 mb-3">
              <Settings className="h-4 w-4" />
              <span>Contraintes actives</span>
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Respect des quotas (hors quota = 0)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Vérification des indisponibilités</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Sessions imposées prioritaires</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Maximum 2 surveillances par jour</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Type requis obligatoire (ex: PAT)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Pré-assignations verrouillées</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Résultats de l'Attribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {results.examensAssignes}/{results.totalExamens}
                </div>
                <p className="text-sm text-blue-800">Examens assignés</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {results.surveillantsUtilises}
                </div>
                <p className="text-sm text-green-800">Surveillants utilisés</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {results.quotasRespectés}/{results.surveillantsUtilises}
                </div>
                <p className="text-sm text-orange-800">Quotas respectés</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {results.heuresAssignees}/{results.heuresTotal}h
                </div>
                <p className="text-sm text-purple-800">Heures assignées</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Valider et appliquer les attributions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflits détectés */}
      {conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Conflits Détectés</span>
              <Badge variant="destructive">{conflicts.length}</Badge>
            </CardTitle>
            <CardDescription>
              Problèmes nécessitant une attention manuelle avant validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {conflicts.map((conflict, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(conflict.severity)}`}>
                <div className="flex items-start space-x-3">
                  {getSeverityIcon(conflict.severity)}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{conflict.message}</p>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">Suggestions :</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {conflict.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Résoudre
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
