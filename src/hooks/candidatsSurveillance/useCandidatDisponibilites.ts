
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DisponibiliteDetail {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
  commentaire_surveillance_obligatoire?: string;
  nom_examen_obligatoire?: string;
}

interface Args {
  candidat: { id: string; email: string; session_id: string } | null;
}

export function useCandidatDisponibilites({ candidat }: Args) {
  return useQuery({
    queryKey: ['candidat-disponibilites', candidat?.id, candidat?.email, candidat?.session_id],
    queryFn: async (): Promise<DisponibiliteDetail[]> => {
      if (!candidat?.id) return [];
      const { data: surveillant } = await supabase
        .from('surveillants')
        .select('id, email')
        .eq('email', candidat.email?.trim())
        .maybeSingle();
      if (!surveillant) {
        console.log(`Surveillant non trouvé (detail) pour ${candidat.email}`);
        return [];
      }
      const { data, error } = await supabase
        .from('disponibilites')
        .select(`
          *,
          examens(date_examen, heure_debut, heure_fin, matiere, salle)
        `)
        .eq('surveillant_id', surveillant.id)
        .eq('session_id', candidat.session_id)
        .eq('est_disponible', true);

      if (error) {
        console.log('Erreur chargement disponibilites depuis disponibilites', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        date_examen: row.examens?.date_examen,
        heure_debut: row.examens?.heure_debut,
        heure_fin: row.examens?.heure_fin,
        matiere: row.examens?.matiere,
        salle: row.examens?.salle,
        commentaire_surveillance_obligatoire: row.commentaire_surveillance_obligatoire || undefined,
        nom_examen_obligatoire: row.nom_examen_obligatoire || undefined
      }));
    },
    enabled: !!candidat?.id && !!candidat?.session_id && !!candidat?.email
  });
}
