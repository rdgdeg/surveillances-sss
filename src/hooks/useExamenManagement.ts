
import { useState, useMemo, useEffect } from "react";
import { useActiveSession } from "@/hooks/useSessions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useContraintesAuditoiresMap } from "./useContraintesAuditoires";

export function useExamenManagement() {
  const { data: activeSession } = useActiveSession();
  const [searchCode, setSearchCode] = useState("");
  const [selectedExamen, setSelectedExamen] = useState<any>(null);
  const [faculteFilter, setFaculteFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const { data: contraintesMap } = useContraintesAuditoiresMap();

  const { data: examensValides } = useQuery({
    queryKey: ['examens-enseignant', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from('examens')
        .select(`*, personnes_aidantes (*)`)
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const faculteList = useMemo(() => {
    if (!examensValides) return [];
    const uniques = Array.from(new Set(examensValides.map((e: any) => e.faculte).filter(Boolean)));
    return uniques;
  }, [examensValides]);

  // Filtrage de la liste
  const filteredExamens = useMemo(() => {
    if (!examensValides) return [];
    return examensValides.filter((ex: any) => {
      if (faculteFilter && ex.faculte !== faculteFilter) return false;
      if (dateFilter && ex.date_examen !== format(dateFilter, "yyyy-MM-dd")) return false;
      return true;
    });
  }, [examensValides, faculteFilter, dateFilter]);

  // Calculs enrichis pour chaque examen utilisant les nouveaux calculs harmonisés
  const examensAvecCalculs = useMemo(() => {
    if (!filteredExamens) return [];
    
    return filteredExamens.map(examen => {
      try {
        // Utiliser les fonctions utilitaires harmonisées
        const surveillantsTheorique = getTheoreticalSurveillants(examen, contraintesMap);
        const surveillantsPedagogiques = calculerSurveillantsPedagogiques(examen);
        const surveillantsNecessaires = calculerSurveillantsNecessaires(examen, contraintesMap);
        
        return {
          ...examen,
          surveillants_theorique: surveillantsTheorique,
          surveillants_pedagogiques: surveillantsPedagogiques,
          surveillants_necessaires: surveillantsNecessaires
        };
      } catch (error) {
        console.error(`Error calculating for exam ${examen.id}:`, error);
        // En cas d'erreur, utiliser les valeurs par défaut
        return {
          ...examen,
          surveillants_theorique: examen.nombre_surveillants || 1,
          surveillants_pedagogiques: 0,
          surveillants_necessaires: examen.nombre_surveillants || 1
        };
      }
    });
  }, [filteredExamens, contraintesMap]);

  // Trouver un examen selon le code
  const examenTrouve = useMemo(() => (
    examensAvecCalculs?.find(e =>
      e.code_examen?.toLowerCase().includes(searchCode.toLowerCase()))
  ), [examensAvecCalculs, searchCode]);

  // Sélection automatique
  useEffect(() => {
    if (examenTrouve && searchCode) setSelectedExamen(examenTrouve);
  }, [examenTrouve, searchCode]);

  return {
    activeSession,
    searchCode,
    setSearchCode,
    selectedExamen,
    setSelectedExamen,
    faculteFilter,
    setFaculteFilter,
    dateFilter,
    setDateFilter,
    examensValides: examensAvecCalculs,
    faculteList,
    filteredExamens: examensAvecCalculs,
    examenTrouve,
  };
}

// Fonctions utilitaires pour les calculs (à utiliser dans les composants qui ne peuvent pas utiliser le hook)
function getTheoreticalSurveillants(examen: any, contraintesMap?: Record<string, number>) {
  if (!examen?.salle) return examen?.nombre_surveillants || 1;
  
  // Si pas de contraintes disponibles, utiliser le nombre_surveillants par défaut
  if (!contraintesMap) {
    return examen.nombre_surveillants || 1;
  }
  
  const auditoireList = examen.salle
    .split(",")
    .map((a: string) => a.trim())
    .filter((a: string) => !!a);

  let total = 0;
  let hasConstraints = false;

  // Pour chaque auditoire, ajouter la contrainte correspondante
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
  
  // Compter seulement les personnes aidantes qui ne sont pas des enseignants
  // et qui comptent dans le quota et sont présentes sur place
  return examen.personnes_aidantes.filter((p: any) =>
    p.compte_dans_quota && 
    p.present_sur_place && 
    !p.est_enseignant // Exclure les enseignants pour éviter le double comptage
  ).length;
}

function calculerSurveillantsNecessaires(examen: any, contraintesMap?: Record<string, number>) {
  const pedagogiques = calculerSurveillantsPedagogiques(examen);
  const enseignantPresent = examen?.surveillants_enseignant || 0;
  const personnesAmenees = examen?.surveillants_amenes || 0;
  const preAssignes = examen?.surveillants_pre_assignes || 0;
  const theoriques = getTheoreticalSurveillants(examen, contraintesMap);
  
  return Math.max(
    0,
    theoriques - pedagogiques - enseignantPresent - personnesAmenees - preAssignes
  );
}

export { getTheoreticalSurveillants, calculerSurveillantsPedagogiques, calculerSurveillantsNecessaires };
