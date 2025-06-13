import { Examen } from "@/integrations/supabase/types";

export interface ExamenReview extends Examen {
  [key: string]: any;
}

export interface ContrainteAuditoire {
  auditoire: string;
  nombre_surveillants_requis: number;
}

export interface ExamenGroupe {
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  auditoire_unifie: string;
  examens: ExamenReview[];
  nombre_surveillants_total: number;
  surveillants_enseignant_total: number;
  surveillants_amenes_total: number;
  surveillants_pre_assignes_total: number;
  surveillants_a_attribuer_total: number;
  personnes_aidantes_total: number;
}

export const groupExamens = (
  examens: ExamenReview[], 
  contraintesAuditoires: ContrainteAuditoire[]
): ExamenGroupe[] => {
  const grouped: { [key: string]: any } = {};

  examens.forEach(examen => {
    const auditoire_unifie = examen.salle.trim().match(/^Neerveld\s+[A-Z]$/i) ? "Neerveld" : examen.salle.trim();
    const key = `${examen.code_examen}-${examen.date_examen}-${examen.heure_debut}-${auditoire_unifie}`;

    if (!grouped[key]) {
      grouped[key] = {
        code_examen: examen.code_examen,
        matiere: examen.matiere,
        date_examen: examen.date_examen,
        heure_debut: examen.heure_debut,
        heure_fin: examen.heure_fin,
        auditoire_unifie: auditoire_unifie,
        examens: [],
      };
    }
    grouped[key].examens.push(examen);
  });

  return Object.values(grouped).map(groupe => {
    // Calculer les personnes aidantes qui comptent dans le quota
    const personnesAidantesQuotaTotal = groupe.examens.reduce((sum, examen) => {
      if (!examen.personnes_aidantes) return sum;
      
      const aidantesComptant = examen.personnes_aidantes.filter((p: any) => 
        p.compte_dans_quota && p.present_sur_place
      ).length;
      
      return sum + aidantesComptant;
    }, 0);

    const nombre_surveillants_total = groupe.examens.reduce((sum, e) => sum + e.nombre_surveillants, 0);
    const surveillants_enseignant_total = groupe.examens.reduce((sum, e) => sum + (e.surveillants_enseignant || 0), 0);
    const surveillants_amenes_total = groupe.examens.reduce((sum, e) => sum + (e.surveillants_amenes || 0), 0);
    const surveillants_pre_assignes_total = groupe.examens.reduce((sum, e) => sum + (e.surveillants_pre_assignes || 0), 0);
    
    // Calculer le nombre de surveillants à attribuer en tenant compte des personnes aidantes
    const surveillants_a_attribuer_total = Math.max(0, 
      nombre_surveillants_total - 
      surveillants_enseignant_total - 
      surveillants_amenes_total - 
      surveillants_pre_assignes_total -
      personnesAidantesQuotaTotal
    );

    return {
      ...groupe,
      nombre_surveillants_total,
      surveillants_enseignant_total,
      surveillants_amenes_total,
      surveillants_pre_assignes_total,
      surveillants_a_attribuer_total,
      personnes_aidantes_total: personnesAidantesQuotaTotal
    };
  });
};
