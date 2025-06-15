
// Fonction pour détecter les problèmes dans un examen importé
export function getExamProblem(row: any): string[] {
  const problems: string[] = [];
  
  // Helper to safely get the object form of row.data
  function asRowDataObject(data: any): Record<string, any> {
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, any>;
    try {
      if (typeof data === "string") {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  }

  const data = asRowDataObject(row.data);
  
  // Vérifier les champs obligatoires critiques
  const code = data["Code"] || data["code"] || "";
  if (!code || code.toString().trim() === "") {
    problems.push("code manquant");
  }
  
  const matiere = data["Activite"] || data["Activité"] || data["Matière"] || data["matiere"] || "";
  if (!matiere || matiere.toString().trim() === "") {
    problems.push("matière manquante");
  }
  
  const date = data["Jour"] || data["Date"] || "";
  if (!date || date.toString().trim() === "") {
    problems.push("date manquante");
  }
  
  // La faculté est recommandée mais pas bloquante
  const faculte = data["Faculte"] || data["Faculté"] || data["faculte"] || "";
  if (!faculte || faculte.toString().trim() === "") {
    problems.push("faculté manquante");
  }
  
  // L'auditoire n'est plus considéré comme un problème bloquant
  // Les examens sans auditoire peuvent être validés avec 0 surveillant
  
  return problems;
}
