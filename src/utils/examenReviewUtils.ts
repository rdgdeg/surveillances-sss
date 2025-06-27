import { Tables } from "@/integrations/supabase/types";

export interface ExamenReview extends Tables<'examens'> {
  personnes_aidantes?: any[];
  [key: string]: any;
}

export interface ContrainteAuditoire {
  auditoire: string;
  nombre_surveillants_requis: number;
}

// Added 'id' and 'nombre_etudiants_total'
export interface ExamenGroupe {
  id: string;
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  auditoire_unifie: string;
  examens: ExamenReview[];
  nombre_etudiants_total: number;
  nombre_surveillants_total: number;
  surveillants_enseignant_total: number;
  surveillants_amenes_total: number;
  surveillants_pre_assignes_total: number;
  surveillants_a_attribuer_total: number;
  personnes_aidantes_total: number;
}

/**
 * Fonction centralisée pour calculer les surveillants théoriques
 * Utilise la même logique que le hook useCalculSurveillants
 */
export const calculerSurveillantsTheoriques = (
  examen: ExamenReview,
  contraintesMap?: Record<string, number>
): number => {
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
};

/**
 * Fonction centralisée pour calculer le besoin réel
 * FORMULE STANDARDISÉE : Théorique - Enseignant - Amenés - Pré-assignés
 */
export const calculerBesoinReel = (
  examen: ExamenReview,
  contraintesMap?: Record<string, number>
): number => {
  const theorique = calculerSurveillantsTheoriques(examen, contraintesMap);
  const enseignantPresent = examen?.surveillants_enseignant || 0;
  const personnesAmenees = examen?.surveillants_amenes || 0;
  const preAssignes = examen?.surveillants_pre_assignes || 0;
  
  return Math.max(0, theorique - enseignantPresent - personnesAmenees - preAssignes);
};

export const groupExamens = (
  examens: ExamenReview[], 
  contraintesAuditoires: ContrainteAuditoire[]
): ExamenGroupe[] => {
  const grouped: { [key: string]: any } = {};

  // Créer une map des contraintes pour utilisation optimisée
  const contraintesMap: Record<string, number> = {};
  contraintesAuditoires.forEach((item) => {
    const auditoire = item.auditoire.trim();
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

    // Utiliser les fonctions centralisées pour les calculs
    const nombre_surveillants_total = groupe.examens.reduce((sum, e) => 
      sum + calculerSurveillantsTheoriques(e, contraintesMap), 0);
    const surveillants_enseignant_total = groupe.examens.reduce((sum, e) => sum + (e.surveillants_enseignant || 0), 0);
    const surveillants_amenes_total = groupe.examens.reduce((sum, e) => sum + (e.surveillants_amenes || 0), 0);
    const surveillants_pre_assignes_total = groupe.examens.reduce((sum, e) => sum + (e.surveillants_pre_assignes || 0), 0);
    
    // Calculer le besoin réel avec la formule centralisée
    const surveillants_a_attribuer_total = groupe.examens.reduce((sum, e) => 
      sum + calculerBesoinReel(e, contraintesMap), 0);

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

export const generateSearchTerms = (examensGroupes: ExamenGroupe[]): string[] => {
  const terms = new Set<string>();
  
  examensGroupes.forEach(groupe => {
    // Ajouter le code d'examen
    if (groupe.code_examen) {
      terms.add(groupe.code_examen.toLowerCase());
    }
    
    // Ajouter la matière
    if (groupe.matiere) {
      terms.add(groupe.matiere.toLowerCase());
    }
    
    // Ajouter l'auditoire
    if (groupe.auditoire_unifie) {
      terms.add(groupe.auditoire_unifie.toLowerCase());
    }
    
    // Ajouter la date
    if (groupe.date_examen) {
      terms.add(groupe.date_examen);
    }
  });
  
  return Array.from(terms);
};

export const filterExamens = (examensGroupes: ExamenGroupe[], searchTerm: string): ExamenGroupe[] => {
  if (!searchTerm.trim()) return examensGroupes;
  
  const term = searchTerm.toLowerCase();
  
  return examensGroupes.filter(groupe => 
    groupe.code_examen?.toLowerCase().includes(term) ||
    groupe.matiere?.toLowerCase().includes(term) ||
    groupe.auditoire_unifie?.toLowerCase().includes(term) ||
    groupe.date_examen?.includes(term)
  );
};

export const calculateStats = (examens: ExamenGroupe[]) => {
  const totalToAssign = examens.reduce((sum, groupe) => sum + groupe.surveillants_a_attribuer_total, 0);
  const uniqueAuditoires = new Set(examens.map(groupe => groupe.auditoire_unifie)).size;
  const uniqueDays = new Set(examens.map(groupe => groupe.date_examen)).size;
  
  return {
    totalToAssign,
    uniqueAuditoires,
    uniqueDays
  };
};

export const getContrainteUnifiee = (auditoire: string, contraintes: ContrainteAuditoire[]): number => {
  if (auditoire === "Neerveld") {
    const contraintesNeerveld = contraintes.filter(c => 
      c.auditoire.match(/^Neerveld\s+[A-Z]$/i)
    );
    return contraintesNeerveld.reduce((sum, c) => sum + c.nombre_surveillants_requis, 0) || 1;
  } else {
    const contrainteExacte = contraintes.find(c => c.auditoire === auditoire);
    return contrainteExacte ? contrainteExacte.nombre_surveillants_requis : 1;
  }
};
