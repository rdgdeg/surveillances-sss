
export interface ExamenReview {
  id: string;
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
  nombre_surveillants: number;
  surveillants_enseignant: number;
  surveillants_amenes: number;
  surveillants_pre_assignes: number;
  surveillants_a_attribuer: number;
  type_requis: string;
  statut_validation: string;
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
}

// Fonction pour unifier les auditoires Neerveld et normaliser les autres
export const unifierAuditoire = (salle: string): string => {
  const salleNormalisee = salle.trim();
  
  // Cas spécifique pour Neerveld - unifier toutes les variantes
  // Patterns supportés: "Neerveld A", "Neerveld B", "Neerveld C", etc.
  // Aussi "Neerveld A, Neerveld B" ou "Neerveld B, Neerveld A"
  if (salleNormalisee.match(/Neerveld\s*[A-Z]/i)) {
    console.log(`Unification de "${salleNormalisee}" vers "Neerveld"`);
    return "Neerveld";
  }
  
  // Pour tous les autres auditoires, garder le nom complet normalisé
  return salleNormalisee;
};

// Fonction pour calculer la contrainte avec logique améliorée pour Neerveld
export const getContrainteUnifiee = (auditoire: string, contraintesOriginales: ContrainteAuditoire[]): number => {
  console.log(`Recherche contrainte pour auditoire unifié: "${auditoire}"`);
  
  if (auditoire === "Neerveld") {
    // Cas spécial : pour Neerveld, on utilise 2 surveillants par défaut
    // (car c'est généralement A+B qui nécessitent chacun 1 surveillant)
    console.log(`Contrainte Neerveld par défaut: 2 surveillants`);
    return 2;
  }
  
  // 1. Chercher d'abord une correspondance exacte
  const contrainteExacte = contraintesOriginales.find(c => c.auditoire === auditoire);
  if (contrainteExacte) {
    console.log(`Contrainte exacte trouvée pour "${auditoire}": ${contrainteExacte.nombre_surveillants_requis}`);
    return contrainteExacte.nombre_surveillants_requis;
  }
  
  // 2. Si pas de correspondance exacte, utiliser la valeur par défaut
  console.log(`Aucune contrainte trouvée pour "${auditoire}", utilisation de la valeur par défaut: 1`);
  return 1;
};

export const groupExamens = (examens: ExamenReview[], contraintesAuditoires: ContrainteAuditoire[]): ExamenGroupe[] => {
  const groupes = new Map<string, ExamenGroupe>();

  examens.forEach(examen => {
    // Unifier l'auditoire (Neerveld A, B, C deviennent tous "Neerveld")
    const auditoire_unifie = unifierAuditoire(examen.salle);
    
    // Créer une clé unique pour grouper les examens
    const cle = `${examen.code_examen}-${examen.date_examen}-${examen.heure_debut}-${auditoire_unifie}`;
    
    console.log(`Traitement examen: ${examen.code_examen}, salle: "${examen.salle}" -> unifié: "${auditoire_unifie}", clé: "${cle}"`);
    
    if (groupes.has(cle)) {
      // Ajouter à un groupe existant
      const groupe = groupes.get(cle)!;
      groupe.examens.push(examen);
      // Recalculer les totaux avec la contrainte unifiée
      const contrainteUnifiee = getContrainteUnifiee(auditoire_unifie, contraintesAuditoires);
      groupe.nombre_surveillants_total = contrainteUnifiee;
      groupe.surveillants_enseignant_total += examen.surveillants_enseignant || 0;
      groupe.surveillants_amenes_total += examen.surveillants_amenes || 0;
      groupe.surveillants_pre_assignes_total += examen.surveillants_pre_assignes || 0;
      groupe.surveillants_a_attribuer_total = Math.max(0, contrainteUnifiee - 
        groupe.surveillants_enseignant_total - 
        groupe.surveillants_amenes_total - 
        groupe.surveillants_pre_assignes_total);
      
      console.log(`Ajouté au groupe existant. Nouveau total surveillants: ${groupe.nombre_surveillants_total}`);
    } else {
      // Créer un nouveau groupe
      const contrainteUnifiee = getContrainteUnifiee(auditoire_unifie, contraintesAuditoires);
      
      const nouveauGroupe: ExamenGroupe = {
        code_examen: examen.code_examen,
        matiere: examen.matiere,
        date_examen: examen.date_examen,
        heure_debut: examen.heure_debut,
        heure_fin: examen.heure_fin,
        auditoire_unifie,
        examens: [examen],
        nombre_surveillants_total: contrainteUnifiee,
        surveillants_enseignant_total: examen.surveillants_enseignant || 0,
        surveillants_amenes_total: examen.surveillants_amenes || 0,
        surveillants_pre_assignes_total: examen.surveillants_pre_assignes || 0,
        surveillants_a_attribuer_total: Math.max(0, contrainteUnifiee - 
          (examen.surveillants_enseignant || 0) - 
          (examen.surveillants_amenes || 0) - 
          (examen.surveillants_pre_assignes || 0))
      };
      
      groupes.set(cle, nouveauGroupe);
      console.log(`Nouveau groupe créé pour "${auditoire_unifie}" avec contrainte: ${contrainteUnifiee}`);
    }
  });

  const groupesArray = Array.from(groupes.values());
  
  // Tri par date, puis heure, puis code d'examen
  const groupesTries = groupesArray.sort((a, b) => {
    // Tri par date
    if (a.date_examen !== b.date_examen) {
      return a.date_examen.localeCompare(b.date_examen);
    }
    // Puis par heure de début
    if (a.heure_debut !== b.heure_debut) {
      return a.heure_debut.localeCompare(b.heure_debut);
    }
    // Enfin par code d'examen
    return a.code_examen.localeCompare(b.code_examen);
  });

  console.log(`Groupement terminé. ${groupesTries.length} groupes créés:`, 
    groupesTries.map(g => `${g.code_examen} - ${g.auditoire_unifie} (${g.examens.length} salles)`));

  return groupesTries;
};

export const generateSearchTerms = (examensGroupes: ExamenGroupe[]): string[] => {
  const terms = new Set<string>();
  examensGroupes.forEach(groupe => {
    terms.add(groupe.code_examen.toLowerCase());
    terms.add(groupe.matiere.toLowerCase());
    terms.add(groupe.auditoire_unifie.toLowerCase());
  });
  
  return Array.from(terms);
};

export const filterExamens = (examensGroupes: ExamenGroupe[], searchTerm: string): ExamenGroupe[] => {
  if (!searchTerm.trim()) return examensGroupes;
  
  const searchLower = searchTerm.toLowerCase();
  return examensGroupes.filter(groupe => 
    groupe.code_examen.toLowerCase().includes(searchLower) ||
    groupe.matiere.toLowerCase().includes(searchLower) ||
    groupe.auditoire_unifie.toLowerCase().includes(searchLower)
  );
};

export const calculateStats = (examensGroupes: ExamenGroupe[]) => {
  return {
    totalToAssign: examensGroupes.reduce((sum, g) => sum + Math.max(0, 
      (g.nombre_surveillants_total || 0) - 
      (g.surveillants_enseignant_total || 0) - 
      (g.surveillants_amenes_total || 0) - 
      (g.surveillants_pre_assignes_total || 0)
    ), 0),
    uniqueAuditoires: new Set(examensGroupes.map(g => g.auditoire_unifie)).size,
    uniqueDays: new Set(examensGroupes.map(g => g.date_examen)).size
  };
};
