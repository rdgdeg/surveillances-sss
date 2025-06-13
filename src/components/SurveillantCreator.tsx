
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
import { toast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

const surveillantSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  email: z.string().email("Email invalide"),
  type: z.enum(["PAT", "Assistant", "Jobiste"], {
    required_error: "Le type est requis"
  })
});

type SurveillantFormData = z.infer<typeof surveillantSchema>;

export const SurveillantCreator = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<SurveillantFormData>({
    resolver: zodResolver(surveillantSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      email: "",
      type: undefined
    }
  });

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

      // Ajouter à la session avec quota par défaut
      const defaultQuota = data.type === 'PAT' ? 12 : data.type === 'Assistant' ? 6 : 4;
      
      const { error: sessionError } = await supabase
        .from('surveillant_sessions')
        .insert({
          surveillant_id: newSurveillant.id,
          session_id: activeSession.id,
          quota: defaultQuota,
          is_active: true
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
          Ajoutez un surveillant supplémentaire pour réduire la charge sur certaines sessions d'examens.
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
                      <SelectItem value="PAT">PAT (Quota: 12)</SelectItem>
                      <SelectItem value="Assistant">Assistant (Quota: 6)</SelectItem>
                      <SelectItem value="Jobiste">Jobiste (Quota: 4)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
