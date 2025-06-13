
-- Activer RLS sur toutes les tables principales
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveillants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indisponibilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveillant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidats_surveillance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidats_disponibilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contraintes_salles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contraintes_auditoires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifications_log ENABLE ROW LEVEL SECURITY;

-- Créer une table pour les profils utilisateurs (administrateurs)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Politiques pour les profils
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Politiques administrateur pour toutes les tables
CREATE POLICY "Admins can manage sessions" ON public.sessions
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage surveillants" ON public.surveillants
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage examens" ON public.examens
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage attributions" ON public.attributions
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage disponibilites" ON public.disponibilites
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage indisponibilites" ON public.indisponibilites
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage surveillant_sessions" ON public.surveillant_sessions
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage candidats_surveillance" ON public.candidats_surveillance
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage candidats_disponibilites" ON public.candidats_disponibilites
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage contraintes_salles" ON public.contraintes_salles
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage contraintes_auditoires" ON public.contraintes_auditoires
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage modifications_log" ON public.modifications_log
  FOR ALL USING (public.is_admin());

-- Politiques publiques pour le formulaire de candidature
CREATE POLICY "Anyone can submit candidatures" ON public.candidats_surveillance
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can submit disponibilites" ON public.candidats_disponibilites
  FOR INSERT WITH CHECK (true);

-- Lecture publique des examens pour le formulaire de candidature
CREATE POLICY "Anyone can read examens for candidature" ON public.examens
  FOR SELECT USING (true);

-- Trigger pour mettre à jour updated_at sur profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour créer automatiquement un profil admin lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
