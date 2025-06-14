
-- Ajouter les colonnes manquantes à la table disponibilites pour les commentaires de surveillance obligatoire
ALTER TABLE public.disponibilites 
ADD COLUMN IF NOT EXISTS commentaire_surveillance_obligatoire text,
ADD COLUMN IF NOT EXISTS nom_examen_obligatoire text;

-- Ajouter les colonnes pour la gestion des jobistes dans candidats_surveillance
ALTER TABLE public.candidats_surveillance 
ADD COLUMN IF NOT EXISTS preferences_jobiste jsonb,
ADD COLUMN IF NOT EXISTS faculte text,
ADD COLUMN IF NOT EXISTS etp numeric,
ADD COLUMN IF NOT EXISTS quota_surveillance integer,
ADD COLUMN IF NOT EXISTS demande_modification_info boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS details_modification_demandee text;

-- Ajouter une table pour suivre les demandes de modification d'informations
CREATE TABLE IF NOT EXISTS public.demandes_modification_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidat_id uuid REFERENCES public.candidats_surveillance(id),
  surveillant_id uuid REFERENCES public.surveillants(id),
  anciennes_donnees jsonb,
  nouvelles_donnees jsonb,
  statut text DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'APPROUVE', 'REJETE')),
  commentaire text,
  traite_par text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Ajouter RLS à la nouvelle table
ALTER TABLE public.demandes_modification_info ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour permettre l'accès public en lecture et écriture (formulaire public)
CREATE POLICY "Allow public read access to demandes_modification_info" 
  ON public.demandes_modification_info FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert access to demandes_modification_info" 
  ON public.demandes_modification_info FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update access to demandes_modification_info" 
  ON public.demandes_modification_info FOR UPDATE 
  USING (true);
