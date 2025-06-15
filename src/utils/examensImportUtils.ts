
/**
 * Utilitaires pour l'import/revision d'examens concernant l'affichage d'heures/dates/durées.
 */
export function excelTimeToHHMM(t: any): string {
  if (typeof t === "number") {
    const totalMinutes = Math.round(t * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }
  if (typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t.trim())) {
    return t.trim();
  }
  return t?.toString() || "";
}

export function excelDateString(d: any): string {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    // déjà en forme YYYY-MM-DD
    return d.split("-").reverse().join("/");
  }
  if (typeof d === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    // déjà formaté
    return d;
  }
  return d?.toString() || "";
}

export function excelDurationToHM(val: any): string {
  if (typeof val === "number") {
    const hours = Math.floor(val);
    const minutes = Math.round((val - hours) * 60);
    if (isNaN(hours) || isNaN(minutes)) return val.toString();
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  return val?.toString() || "";
}
