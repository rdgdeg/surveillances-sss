import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlanningGeneralItem {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  auditoire: string;
  code_examen: string;
  faculte: string;
  enseignant_nom: string;
  enseignant_email: string;
  statut_validation: string;
  surveillants: Array<{
    id: string;
    nom: string;
    prenom: string;
    email: string;
  }>;
  nombre_surveillants_requis: number;
  surveillants_theorique_total: number;
  prof_apportes_total: number;
  pre_assignes_total: number;
  besoin_reel_total: number;
}

export const usePlanningGeneral = (sessionId?: string, searchTerm?: string) => {
  return useQuery({
    queryKey: ['planning-general', sessionId, searchTerm],
    queryFn: async () => {
      console.log('Fetching planning data for session:', sessionId);
      
      if (!sessionId) {
        console.log('No session selected');
        return [];
      }

      try {
        // Récupérer les contraintes d'auditoires
        const { data: contraintes, error: contraintesError } = await supabase
          .from('contraintes_auditoires')
          .select('auditoire, nombre_surveillants_requis');
        
        if (contraintesError) {
          console.error('Error fetching contraintes:', contraintesError);
        }

        // Créer une map des contraintes
        const contraintesMap: Record<string, number> = {};
        (contraintes || []).forEach((item) => {
          const auditoire = item.auditoire.trim();
          // Ajouter plusieurs variations pour améliorer la correspondance
          const variations = [
            auditoire.toLowerCase(),
            auditoire,
            auditoire.toLowerCase().replace(/\s+/g, ''),
            auditoire.toLowerCase().replace(/\s+/g, ' '),
          ];
          
          variations.forEach(variation => {
            contraintesMap[variation] = item.nombre_surveillants_requis;
          });
        });

        // Requête pour récupérer tous les examens actifs avec leurs attributions et équipes
        const { data: examens, error } = await supabase
          .from('examens')
          .select(`
            id,
            date_examen,
            heure_debut,
            heure_fin,
            matiere,
            salle,
            code_examen,
            faculte,
            enseignant_nom,
            enseignant_email,
            statut_validation,
            nombre_surveillants,
            surveillants_enseignant,
            surveillants_amenes,
            surveillants_pre_assignes,
            is_active,
            attributions (
              surveillant_id,
              surveillants (
                id,
                nom,
                prenom,
                email
              )
            ),
            personnes_aidantes (*)
          `)
          .eq('session_id', sessionId)
          .eq('is_active', true)
          .order('date_examen')
          .order('heure_debut');
        
        console.log('Query result:', { examens, error });
        
        if (error) {
          console.error('Error fetching examens:', error);
          throw error;
        }

        if (!examens || examens.length === 0) {
          console.log('No examens found for session:', sessionId);
          return [];
        }

        // Traitement des données pour split des auditoires multiples avec calculs harmonisés
        const planningItems: PlanningGeneralItem[] = [];
        
        examens.forEach((examen: any) => {
          console.log('Processing examen:', examen.id, examen.matiere, 'Enseignant:', examen.enseignant_nom);
          
          // Calculer les totaux de l'examen avec la FORMULE SIMPLIFIÉE
          const surveillantsTheoriqueTotal = getTheoreticalSurveillants(examen, contraintesMap);
          const profApportesTotal = (examen.surveillants_enseignant || 0) + (examen.surveillants_amenes || 0);
          const preAssignesTotal = examen.surveillants_pre_assignes || 0;
          
          // FORMULE SIMPLIFIÉE : Théoriques - Enseignant - Amenés - Pré-assignés
          const besoinReelTotal = Math.max(0, 
            surveillantsTheoriqueTotal - 
            (examen.surveillants_enseignant || 0) - 
            (examen.surveillants_amenes || 0) - 
            preAssignesTotal
          );
          
          // Split des auditoires
          const auditoires = examen.salle
            .split(',')
            .map((aud: string) => aud.trim())
            .filter((aud: string) => aud.length > 0);

          // Récupérer les surveillants attribués
          const surveillants = examen.attributions?.map((attr: any) => ({
            id: attr.surveillants?.id || '',
            nom: attr.surveillants?.nom || '',
            prenom: attr.surveillants?.prenom || '',
            email: attr.surveillants?.email || ''
          })).filter((s: any) => s.id) || [];

          // Créer une ligne par auditoire MAIS avec les totaux de l'examen
          auditoires.forEach((auditoire: string) => {
            // Calculer le nombre de surveillants requis selon les contraintes pour cet auditoire
            const auditoireNormalized = auditoire.toLowerCase().trim();
            const nombreRequis = contraintesMap[auditoireNormalized] || 
                                contraintesMap[auditoire] || 
                                contraintesMap[auditoire.toLowerCase().replace(/\s+/g, '')] ||
                                examen.nombre_surveillants || 1;

            const item: PlanningGeneralItem = {
              id: `${examen.id}_${auditoire.replace(/\s+/g, '_')}`,
              date_examen: examen.date_examen,
              heure_debut: examen.heure_debut,
              heure_fin: examen.heure_fin,
              matiere: examen.matiere,
              auditoire: auditoire,
              code_examen: examen.code_examen || '',
              faculte: examen.faculte || '',
              enseignant_nom: examen.enseignant_nom || '',
              enseignant_email: examen.enseignant_email || '',
              statut_validation: examen.statut_validation || 'NON_TRAITE',
              surveillants: surveillants,
              nombre_surveillants_requis: nombreRequis,
              // Nouveaux champs avec les totaux de l'examen (pas par auditoire)
              surveillants_theorique_total: surveillantsTheoriqueTotal,
              prof_apportes_total: profApportesTotal,
              pre_assignes_total: preAssignesTotal,
              besoin_reel_total: besoinReelTotal
            };

            // Filtrage par terme de recherche
            if (searchTerm) {
              const searchLower = searchTerm.toLowerCase();
              const matchesSearch = 
                item.matiere.toLowerCase().includes(searchLower) ||
                item.auditoire.toLowerCase().includes(searchLower) ||
                item.code_examen.toLowerCase().includes(searchLower) ||
                item.faculte.toLowerCase().includes(searchLower) ||
                item.enseignant_nom.toLowerCase().includes(searchLower) ||
                item.date_examen.includes(searchTerm) ||
                item.surveillants.some(s => 
                  s.nom.toLowerCase().includes(searchLower) ||
                  s.prenom.toLowerCase().includes(searchLower) ||
                  s.email.toLowerCase().includes(searchLower)
                );
              
              if (matchesSearch) {
                planningItems.push(item);
              }
            } else {
              planningItems.push(item);
            }
          });
        });

        console.log('Final planning items:', planningItems.length);
        return planningItems;
      } catch (error) {
        console.error('Error in planning query:', error);
        throw error;
      }
    },
    enabled: !!sessionId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

// Fonctions utilitaires importées pour cohérence avec FORMULE SIMPLIFIÉE
function getTheoreticalSurveillants(examen: any, contraintesMap: Record<string, number>) {
  if (!examen?.salle) return examen?.nombre_surveillants || 1;
  
  if (!contraintesMap) {
    return examen.nombre_surveillants || 1;
  }
  
  const auditoireList = examen.salle
    .split(",")
    .map((a: string) => a.trim())
    .filter((a: string) => !!a);

  let total = 0;
  let hasConstraints = false;

  auditoireList.forEach((auditoire: string) => {
    const auditoireNormalized = auditoire.toLowerCase().trim();
    
    let constraint = contraintesMap[auditoireNormalized];
    
    if (!constraint) {
      const variations = [
        auditoireNormalized.replace(/\s+/g, ''),
        auditoireNormalized.replace(/\s+/g, ' '),
        auditoire.trim(),
        auditoire.trim().toLowerCase()
      ];
      
      for (const variation of variations) {
        if (contraintesMap[variation]) {
          constraint = contraintesMap[variation];
          break;
        }
      }
    }
    
    if (constraint !== undefined) {
      total += constraint;
      hasConstraints = true;
    } else {
      total += 1;
    }
  });

  if (!hasConstraints && total === auditoireList.length) {
    return examen.nombre_surveillants || 1;
  }
  
  return total;
}

function calculerSurveillantsPedagogiques(examen: any) {
  if (!examen?.personnes_aidantes) return 0;
  
  return examen.personnes_aidantes.filter((p: any) =>
    p.compte_dans_quota && 
    p.present_sur_place && 
    !p.est_enseignant
  ).length;
}
