
import { useState, useMemo, useEffect } from "react";
import { useActiveSession } from "@/hooks/useSessions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useExamenCalculations } from "./useExamenCalculations";

export function useExamenManagement() {
  const { data: activeSession } = useActiveSession();
  const [searchCode, setSearchCode] = useState("");
  const [selectedExamen, setSelectedExamen] = useState<any>(null);
  const [faculteFilter, setFaculteFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

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

  // Calculs enrichis pour chaque examen
  const examensAvecCalculs = useMemo(() => {
    if (!filteredExamens) return [];
    
    return filteredExamens.map(examen => {
      const calculations = useExamenCalculations(examen);
      const surveillantsTheorique = calculations.getTheoreticalSurveillants();
      const surveillantsPedagogiques = calculations.calculerSurveillantsPedagogiques();
      const surveillantsNecessaires = calculations.calculerSurveillantsNecessaires();
      
      return {
        ...examen,
        surveillants_theorique: surveillantsTheorique,
        surveillants_pedagogiques: surveillantsPedagogiques,
        surveillants_necessaires: surveillantsNecessaires
      };
    });
  }, [filteredExamens]);

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
