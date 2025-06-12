
-- Create sessions table to manage academic sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- e.g., "2025_01", "2025_06", "2025_09"
  year INTEGER NOT NULL,
  period INTEGER NOT NULL, -- 1 = janvier, 6 = juin, 9 = septembre
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create surveillants table (permanent base of all supervisors)
CREATE TABLE public.surveillants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('PAT', 'Assistant', 'Jobiste')),
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create surveillant_sessions table (activation and quotas per session)
CREATE TABLE public.surveillant_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  surveillant_id UUID NOT NULL REFERENCES public.surveillants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  quota INTEGER NOT NULL DEFAULT 6, -- Default quota, can be customized
  sessions_imposees INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(surveillant_id, session_id)
);

-- Create examens table (exams per session)
CREATE TABLE public.examens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  date_examen DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  matiere TEXT NOT NULL,
  salle TEXT NOT NULL,
  nombre_surveillants INTEGER NOT NULL DEFAULT 1,
  type_requis TEXT NOT NULL CHECK (type_requis IN ('PAT', 'Assistant', 'Jobiste')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indisponibilites table (unavailabilities per supervisor and session)
CREATE TABLE public.indisponibilites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  surveillant_id UUID NOT NULL REFERENCES public.surveillants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  motif TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attributions table (final assignments with history)
CREATE TABLE public.attributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_id UUID NOT NULL REFERENCES public.examens(id) ON DELETE CASCADE,
  surveillant_id UUID NOT NULL REFERENCES public.surveillants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  is_pre_assigne BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false, -- For manual pre-assignments
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(examen_id, surveillant_id)
);

-- Create modifications_log table (traceability of changes)
CREATE TABLE public.modifications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (we'll add policies later when implementing authentication)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveillants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveillant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indisponibilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifications_log ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - we'll refine these later)
CREATE POLICY "Allow all operations" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.surveillants FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.surveillant_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.examens FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.indisponibilites FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.attributions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.modifications_log FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_sessions_active ON public.sessions(is_active);
CREATE INDEX idx_surveillants_email ON public.surveillants(email);
CREATE INDEX idx_surveillant_sessions_session ON public.surveillant_sessions(session_id);
CREATE INDEX idx_examens_session_date ON public.examens(session_id, date_examen);
CREATE INDEX idx_indisponibilites_surveillant_session ON public.indisponibilites(surveillant_id, session_id);
CREATE INDEX idx_attributions_session ON public.attributions(session_id);

-- Insert default data
INSERT INTO public.sessions (name, year, period, is_active) VALUES
('2025_01', 2025, 1, true),
('2025_06', 2025, 6, false),
('2025_09', 2025, 9, false);
