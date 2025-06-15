
-- Table temporaire pour les examens importés (par utilisateur/session)
CREATE TABLE public.examens_import_temp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  imported_by TEXT, -- email ou user id si connecté
  import_batch_id UUID NOT NULL, -- regroupe les lignes d’un même import
  ordre_import INTEGER NOT NULL, -- garde l’ordre d’origine pour l’affichage
  data JSONB NOT NULL, -- toute la ligne Excel originale
  statut TEXT NOT NULL DEFAULT 'NON_TRAITE' 
    CHECK (statut IN ('NON_TRAITE', 'EN_COURS', 'VALIDE', 'REJETE', 'A_COMPLETER')),
  erreurs TEXT, -- explications si souci détecté (ex : auditoire/faculté manquant)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour accélérer les recherches par session/import
CREATE INDEX idx_examens_import_temp_session ON public.examens_import_temp(session_id);
CREATE INDEX idx_examens_import_temp_batch ON public.examens_import_temp(import_batch_id);

-- Politique RLS permissive ADMIN (adapter plus tard si besoin)
ALTER TABLE public.examens_import_temp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tout admin peut voir/importer/éditer" 
  ON public.examens_import_temp 
  FOR ALL 
  USING (true)
  WITH CHECK (true);
