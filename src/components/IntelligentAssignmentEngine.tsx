
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Users, Clock, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

interface AssignmentResult {
  success: boolean;
  totalExamens: number;
  assignedExamens: number;
  unassignedExamens: string[];
  assignmentDetails: {
    examenId: string;
    surveillantIds: string[];
    matiere: string;
    salle: string;
    dateHeure: string;
  }[];
  warnings: string[];
}

interface SurveillantsData {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  faculte_interdite: string | null;
  surveillant_sessions: {
    quota: number;
    sessions_imposees: number | null;
    is_active: boolean;
  }[];
}

interface ExamensData {
  id: string;
  session_id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
  nombre_surveillants: number;
  type_requis: string;
  faculte: string | null;
  auditoire_original: string | null;
  created_at: string;
  updated_at: string;
  surveillants_a_attribuer: number | null;
  surveillants_amenes: number | null;
  surveillants_enseignant: number | null;
  surveillants_pre_assignes: number | null;
}

export const IntelligentAssignmentEngine = () => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const { data: activeSession } = useActiveSession();

  const runIntelligentAssignment = async () => {
    if (!activeSession) {
      toast({
        title: "Erreur",
        description: "Aucune session active",
        variant: "destructive"
      });
      return;
    }

    setIsAssigning(true);
    setProgress(0);
    setResult(null);

    try {
      // Étape 1: Récupérer les données (10%)
      setProgress(10);
      console.log("🔄 Récupération des données...");

      const { data: examens, error: examensError } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true });

      const { data: surveillantsRaw, error: surveillantsError } = await supabase
        .from('surveillants')
        .select(`
          id, nom, prenom, email, type, faculte_interdite,
          surveillant_sessions!inner(quota, sessions_imposees, is_active)
        `)
        .eq('statut', 'actif')
        .eq('surveillant_sessions.session_id', activeSession.id);

      const { data: disponibilites, error: dispError } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true);

      const { data: contraintes, error: contrError } = await supabase
        .from('contraintes_salles')
        .select('*')
        .eq('session_id', activeSession.id);

      const { data: preAssignations, error: preError } = await supabase
        .from('attributions')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('is_pre_assigne', true);

      if (examensError || surveillantsError || dispError || contrError || preError) {
        throw new Error(`Erreur lors de la récupération des données: ${examensError?.message || surveillantsError?.message || dispError?.message || contrError?.message || preError?.message}`);
      }

      if (!examens || !surveillantsRaw || !disponibilites) {
        throw new Error("Données manquantes pour l'attribution");
      }

      // Typer correctement les surveillants
      const surveillants = surveillantsRaw as SurveillantsData[];

      // Filtrer les surveillants actifs pour l'attribution automatique
      const surveillantsActifs = surveillants.filter(s => 
        s.surveillant_sessions[0]?.is_active === true
      );

      // Étape 2: Nettoyer les attributions existantes non pré-assignées (20%)
      setProgress(20);
      console.log("🧹 Nettoyage des attributions existantes...");

      await supabase
        .from('attributions')
        .delete()
        .eq('session_id', activeSession.id)
        .eq('is_pre_assigne', false);

      // Étape 3: Créer la matrice de disponibilités (30%)
      setProgress(30);
      console.log("📊 Création de la matrice de disponibilités...");

      const disponibiliteMap = new Map();
      disponibilites.forEach(d => {
        const key = `${d.surveillant_id}_${d.date_examen}_${d.heure_debut}_${d.heure_fin}`;
        disponibiliteMap.set(key, true);
      });

      // Étape 4: Traiter les pré-assignations (40%)
      setProgress(40);
      console.log("📌 Traitement des pré-assignations...");

      const preAssignedSurveillants = new Map();
      if (preAssignations) {
        preAssignations.forEach(pa => {
          const key = `${pa.examen_id}`;
          if (!preAssignedSurveillants.has(key)) {
            preAssignedSurveillants.set(key, []);
          }
          preAssignedSurveillants.get(key).push(pa.surveillant_id);
        });
      }

      // Étape 5: Attribution intelligente avec contraintes de faculté (50-90%)
      setProgress(50);
      console.log("🎯 Attribution intelligente en cours...");

      const assignments: any[] = [];
      const surveillantWorkload = new Map();
      const unassignedExamens: string[] = [];
      const warnings: string[] = [];

      // Initialiser la charge de travail (inclut tous les surveillants, même inactifs pour les pré-assignations)
      surveillants.forEach(s => {
        surveillantWorkload.set(s.id, 0);
      });

      for (let i = 0; i < examens.length; i++) {
        const examen = examens[i] as ExamensData;
        const examProgress = 50 + (i / examens.length) * 40;
        setProgress(examProgress);

        console.log(`📝 Attribution pour: ${examen.matiere} - ${examen.date_examen} ${examen.heure_debut} (Faculté: ${examen.faculte || 'Non spécifiée'})`);

        // Vérifier les contraintes de salle
        const contrainteSalle = contraintes?.find(c => c.salle === examen.salle);
        const minNonJobistes = contrainteSalle?.min_non_jobistes || 1;

        // Récupérer les pré-assignations pour cet examen
        const preAssigned = preAssignedSurveillants.get(examen.id) || [];
        
        // Filtrer les surveillants disponibles ET actifs pour l'attribution automatique
        const surveillantsDisponibles = surveillantsActifs.filter(s => {
          const disponibiliteKey = `${s.id}_${examen.date_examen}_${examen.heure_debut}_${examen.heure_fin}`;
          const isDisponible = disponibiliteMap.has(disponibiliteKey);
          
          // Vérifier les contraintes de faculté
          const hasConflitFaculte = examen.faculte && s.faculte_interdite === examen.faculte;
          
          if (hasConflitFaculte) {
            console.log(`⚠️ Conflit de faculté: ${s.prenom} ${s.nom} ne peut pas surveiller ${examen.matiere} (faculté ${examen.faculte})`);
          }
          
          return isDisponible && !hasConflitFaculte;
        });

        const selectedSurveillantsIds: string[] = [...preAssigned];
        const nombreAAssigner = examen.nombre_surveillants - preAssigned.length;

        if (nombreAAssigner > 0) {
          // Stratégie d'attribution basée sur le type requis et les contraintes
          const candidats = surveillantsDisponibles.filter(s => 
            !selectedSurveillantsIds.includes(s.id) &&
            surveillantWorkload.get(s.id) < s.surveillant_sessions[0].quota
          );

          // Trier par charge de travail (équilibrage)
          candidats.sort((a, b) => {
            const workloadA = surveillantWorkload.get(a.id);
            const workloadB = surveillantWorkload.get(b.id);
            if (workloadA !== workloadB) {
              return workloadA - workloadB;
            }
            // Si égalité, prioriser selon le type requis
            if (examen.type_requis === a.type && examen.type_requis !== b.type) return -1;
            if (examen.type_requis === b.type && examen.type_requis !== a.type) return 1;
            return 0;
          });

          // Sélectionner les surveillants
          let nonJobistesAssignes = selectedSurveillantsIds.filter(id => {
            const s = surveillants.find(surv => surv.id === id);
            return s && s.type !== 'Jobiste';
          }).length;

          for (const candidat of candidats) {
            if (selectedSurveillantsIds.length >= examen.nombre_surveillants) break;

            // Vérifier la contrainte min_non_jobistes
            if (candidat.type === 'Jobiste' && nonJobistesAssignes < minNonJobistes) {
              continue;
            }

            selectedSurveillantsIds.push(candidat.id);
            if (candidat.type !== 'Jobiste') {
              nonJobistesAssignes++;
            }
          }
        }

        // Vérifier si l'attribution est complète
        if (selectedSurveillantsIds.length < examen.nombre_surveillants) {
          unassignedExamens.push(
            `${examen.matiere} - ${examen.date_examen} ${examen.heure_debut}-${examen.heure_fin} (${examen.salle}) - Manque ${examen.nombre_surveillants - selectedSurveillantsIds.length} surveillant(s)`
          );
          
          if (selectedSurveillantsIds.length === 0) {
            warnings.push(`Aucun surveillant disponible pour ${examen.matiere}`);
            continue;
          }
        }

        // Créer les attributions en base
        for (const surveillantId of selectedSurveillantsIds) {
          assignments.push({
            session_id: activeSession.id,
            examen_id: examen.id,
            surveillant_id: surveillantId,
            is_pre_assigne: preAssigned.includes(surveillantId),
            is_obligatoire: false,
            is_locked: false
          });

          // Mettre à jour la charge de travail
          const currentWorkload = surveillantWorkload.get(surveillantId) || 0;
          surveillantWorkload.set(surveillantId, currentWorkload + 1);
        }
      }

      // Étape 6: Sauvegarder en base (90%)
      setProgress(90);
      console.log("💾 Sauvegarde des attributions...");

      if (assignments.length > 0) {
        const { error } = await supabase
          .from('attributions')
          .insert(assignments);

        if (error) {
          throw new Error(`Erreur lors de la sauvegarde: ${error.message}`);
        }
      }

      // Ajouter des avertissements sur les surveillants exclus
      const surveillantsExclus = surveillants.filter(s => !s.surveillant_sessions[0]?.is_active);
      if (surveillantsExclus.length > 0) {
        warnings.push(`${surveillantsExclus.length} surveillant(s) exclu(s) de l'attribution automatique`);
      }

      // Ajouter des avertissements sur les conflits de faculté
      const surveillantsAvecConflits = surveillants.filter(s => s.faculte_interdite);
      if (surveillantsAvecConflits.length > 0) {
        warnings.push(`${surveillantsAvecConflits.length} surveillant(s) avec contraintes de faculté appliquées`);
      }

      // Étape 7: Finalisation (100%)
      setProgress(100);
      console.log("✅ Attribution terminée!");

      const assignmentResult: AssignmentResult = {
        success: true,
        totalExamens: examens.length,
        assignedExamens: examens.length - unassignedExamens.length,
        unassignedExamens,
        assignmentDetails: [], // Peut être enrichi si nécessaire
        warnings
      };

      setResult(assignmentResult);

      toast({
        title: "Attribution terminée",
        description: `${assignmentResult.assignedExamens}/${assignmentResult.totalExamens} examens attribués avec succès.`,
      });

    } catch (error: any) {
      console.error('Erreur lors de l\'attribution:', error);
      toast({
        title: "Erreur d'attribution",
        description: error.message || "Une erreur s'est produite lors de l'attribution.",
        variant: "destructive"
      });
      
      setResult({
        success: false,
        totalExamens: 0,
        assignedExamens: 0,
        unassignedExamens: [],
        assignmentDetails: [],
        warnings: [error.message]
      });
    } finally {
      setIsAssigning(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Moteur d'Attribution Intelligent</span>
        </CardTitle>
        <CardDescription>
          Attribution automatique avec contraintes de faculté, quotas personnalisés et exclusions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!activeSession && (
          <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-orange-800 text-sm">Aucune session active</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">🧠 Algorithme intelligent amélioré</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Respect des disponibilités et quotas personnalisés</li>
              <li>• Exclusion des surveillants marqués comme inactifs</li>
              <li>• <strong>Contraintes de faculté (conflits d'intérêt)</strong></li>
              <li>• Contraintes par salle (min non-jobistes)</li>
              <li>• Équilibrage automatique de la charge</li>
              <li>• Priorisation selon le type requis</li>
              <li>• Préservation des pré-assignations</li>
              <li>• Support des quotas illimités</li>
            </ul>
          </div>

          {isAssigning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Attribution en cours...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <Button 
            onClick={runIntelligentAssignment}
            disabled={!activeSession || isAssigning}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isAssigning ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Attribution en cours...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Lancer l'attribution intelligente</span>
              </div>
            )}
          </Button>

          {result && (
            <div className="space-y-4">
              {/* Résumé */}
              <div className={`p-4 rounded-lg border ${
                result.success && result.unassignedExamens.length === 0
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {result.success && result.unassignedExamens.length === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  )}
                  <span className="font-medium">
                    Résultat de l'attribution
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {result.assignedExamens}
                    </div>
                    <div className="text-sm text-gray-600">Examens attribués</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {result.unassignedExamens.length}
                    </div>
                    <div className="text-sm text-gray-600">Non attribués</div>
                  </div>
                </div>

                <div className="text-sm">
                  Taux de réussite: {Math.round((result.assignedExamens / result.totalExamens) * 100)}%
                </div>
              </div>

              {/* Examens non attribués */}
              {result.unassignedExamens.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">
                    ⚠️ Examens non attribués ({result.unassignedExamens.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.unassignedExamens.map((examen, index) => (
                      <div key={index} className="text-sm text-red-800">
                        • {examen}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Avertissements */}
              {result.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    ⚠️ Avertissements
                  </h4>
                  <div className="space-y-1">
                    {result.warnings.map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-800">
                        • {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
