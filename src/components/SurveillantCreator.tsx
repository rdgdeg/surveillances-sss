
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

const surveillantSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  email: z.string().email("Email invalide"),
  type: z.enum(["PAT", "Assistant", "Jobiste"], {
    required_error: "Le type est requis"
  }),
  quota_personnalise: z.number().min(0).optional(),
  est_illimite: z.boolean().default(false),
  exclure_attribution_auto: z.boolean().default(false)
});

type SurveillantFormData = z.infer<typeof surveillantSchema>;

export const SurveillantCreator = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();

  const form = useForm<SurveillantFormData>({
    resolver: zodResolver(surveillantSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      email: "",
      type: undefined,
      quota_personnalise: undefined,
      est_illimite: false,
      exclure_attribution_auto: false
    }
  });

  const watchEstIllimite = form.watch("est_illimite");
  const watchExclureAuto = form.watch("exclure_attribution_auto");

  const createSurveillant = useMutation({
    mutationFn: async (data: SurveillantFormData) => {
      if (!activeSession?.id) {
        throw new Error("Aucune session active");
      }

      // Vérifier si l'email existe déjà
      const { data: existing } = await supabase
        .from('surveillants')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existing) {
        throw new Error("Un surveillant avec cet email existe déjà");
      }

      // Créer le surveillant
      const { data: newSurveillant, error: surveillantError } = await supabase
        .from('surveillants')
        .insert({
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          type: data.type,
          statut: 'actif'
        })
        .select('id')
        .single();

      if (surveillantError) throw surveillantError;

      // Calculer le quota final
      let quotaFinal: number;
      if (data.est_illimite) {
        quotaFinal = 999; // Valeur très élevée pour simuler l'illimité
      } else if (data.quota_personnalise !== undefined && data.quota_personnalise > 0) {
        quotaFinal = data.quota_personnalise;
      } else {
        // Quota par défaut selon le type
        quotaFinal = data.type === 'PAT' ? 12 : data.type === 'Assistant' ? 6 : 4;
      }
      
      // Ajouter à la session
      const { error: sessionError } = await supabase
        .from('surveillant_sessions')
        .insert({
          surveillant_id: newSurveillant.id,
          session_id: activeSession.id,
          quota: quotaFinal,
          is_active: !data.exclure_attribution_auto, // Si exclu de l'auto, marquer comme inactif
          sessions_imposees: data.exclure_attribution_auto ? 0 : null
        });

      if (sessionError) throw sessionError;

      return newSurveillant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillants'] });
      form.reset();
      toast({
        title: "Surveillant créé",
        description: "Le surveillant a été ajouté avec succès à la session.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le surveillant.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: SurveillantFormData) => {
    createSurveillant.mutate(data);
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Veuillez d'abord sélectionner une session active.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="h-5 w-5" />
          <span>Créer un nouveau surveillant</span>
        </CardTitle>
        <CardDescription>
          Ajoutez un surveillant avec des paramètres personnalisés de quota et d'attribution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de famille" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prenom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Prénom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemple.be" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de surveillant</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PAT">PAT (Quota par défaut: 12)</SelectItem>
                      <SelectItem value="Assistant">Assistant (Quota par défaut: 6)</SelectItem>
                      <SelectItem value="Jobiste">Jobiste (Quota par défaut: 4)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium">Paramètres de quota</h4>
              
              <FormField
                control={form.control}
                name="est_illimite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Quota illimité
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Ce surveillant peut être assigné à un nombre illimité de surveillances.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {!watchEstIllimite && (
                <FormField
                  control={form.control}
                  name="quota_personnalise"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quota personnalisé (optionnel)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Laisser vide pour utiliser le quota par défaut"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="exclure_attribution_auto"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Exclure de l'attribution automatique
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Ce surveillant ne sera pas assigné automatiquement. Utilisé pour les surveillants ponctuels.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {watchExclureAuto && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Ce surveillant sera exclu de l'attribution automatique. Vous devrez l'assigner manuellement via les pré-assignations.
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={createSurveillant.isPending}
              className="w-full"
            >
              {createSurveillant.isPending ? "Création..." : "Créer le surveillant"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
