
/**
 * Helper pour détecter les champs obligatoires manquants sur une ligne d’examen importée.
 * On a déjà retiré l'obligation sur les auditoires.
 */
export function getExamProblem(row: any) {
  const { data } = row;
  const missing: string[] = [];
  if (!data['Faculte'] && !data['Faculté'] && !data['faculte'] && !data['faculté']) missing.push("faculté");
  return missing;
}
