
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";

const demandeSchema = z.object({
  code_examen: z.string().min(1, "Le code examen est requis"),
  email_demandeur: z.string().email("Email invalide"),
  motif: z.string().min(10, "Veuillez détailler votre demande (minimum 10 caractères)"),
  type_demande: z.enum(["absence", "permutation", "autre"], {
    required_error: "Le type de demande est requis"
  })
});

type DemandeFormData = z.infer<typeof demandeSchema>;

export const DemandeChangement = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [isPublicView, setIsPublicView] = useState(true);

  const form = useForm<DemandeFormData>({
    resolver: zodResolver(demandeSchema),
    defaultValues: {
      code_examen: "",
      email_demandeur: "",
      motif: "",
      type_demande: undefined
    }
  });

  // Récupérer les examens pour validation du code
  const { data: examens } = useQuery({
    queryKey: ['examens-codes', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('id, matiere, date_examen, heure_debut, heure_fin, salle')
        .eq('session_id', activeSession.id)
        .order('date_examen', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Récupérer les demandes existantes
  const { data: demandes, isLoading: isLoadingDemandes } = useQuery({
    queryKey: ['demandes-changement', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      // Note: Cette table sera créée dans la prochaine phase
      // Pour l'instant, on retourne un tableau vide
      return [];
    },
    enabled: !!activeSession?.id && !isPublicView
  });

  const creerDemande = useMutation({
    mutationFn: async (data: DemandeFormData) => {
      if (!activeSession?.id) {
        throw new Error("Aucune session active");
      }

      // Vérifier que le code examen existe
      const examenExiste = examens?.find(e => 
        `${e.matiere}-${e.salle}-${formatDateBelgian(e.date_examen)}`.toLowerCase().includes(data.code_examen.toLowerCase())
      );

      if (!examenExiste) {
        throw new Error("Code examen non trouvé. Veuillez vérifier le code.");
      }

      // Note: Cette insertion sera activée une fois la table créée
      // const { error } = await supabase
      //   .from('demandes_changement')
      //   .insert({
      //     session_id: activeSession.id,
      //     examen_id: examenExiste.id,
      //     email_demandeur: data.email_demandeur,
      //     motif: data.motif,
      //     type_demande: data.type_demande,
      //     statut: 'en_attente'
      //   });

      // if (error) throw error;

      // Simulation pour l'instant
      console.log('Demande créée:', { ...data, examen: examenExiste });
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes-changement'] });
      form.reset();
      toast({
        title: "Demande envoyée",
        description: "Votre demande de changement a été transmise à l'administration.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la demande.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: DemandeFormData) => {
    creerDemande.mutate(data);
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle entre vue publique et admin */}
      <div className="flex space-x-2">
        <Button 
          variant={isPublicView ? "default" : "outline"}
          onClick={() => setIsPublicView(true)}
        >
          Faire une demande
        </Button>
        <Button 
          variant={!isPublicView ? "default" : "outline"}
          onClick={() => setIsPublicView(false)}
        >
          Gérer les demandes (Admin)
        </Button>
      </div>

      {isPublicView ? (
        // Vue publique - Formulaire de demande
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Demande de changement de surveillance</span>
            </CardTitle>
            <CardDescription>
              <div className="space-y-2">
                <p>Remplissez ce formulaire pour demander un changement de surveillance.</p>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    📋 Règle importante : Vous devez d'abord chercher une permutation avec vos collègues avant de faire cette demande.
                  </p>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email_demandeur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Votre email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="votre.email@exemple.be" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code_examen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code examen ou référence</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: MATH-A101-15/01/2024 ou partie du nom" {...field} />
                      </FormControl>
                      <FormMessage />
                      {examens && examens.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Exemples de codes valides : {examens.slice(0, 2).map(e => 
                            `${e.matiere}-${e.salle}-${formatDateBelgian(e.date_examen)}`
                          ).join(', ')}...
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type_demande"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de demande</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="absence">Absence/Indisponibilité</SelectItem>
                          <SelectItem value="permutation">Permutation avec un collègue</SelectItem>
                          <SelectItem value="autre">Autre motif</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="motif"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motif détaillé</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Expliquez votre demande en détail. Si c'est une permutation, mentionnez le nom du collègue avec qui vous avez trouvé un arrangement."
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={creerDemande.isPending}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {creerDemande.isPending ? "Envoi..." : "Envoyer la demande"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        // Vue admin - Gestion des demandes
        <Card>
          <CardHeader>
            <CardTitle>Gestion des demandes de changement</CardTitle>
            <CardDescription>
              Consultez et validez les demandes de changement des surveillants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDemandes ? (
              <p>Chargement des demandes...</p>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-gray-500">
                  Aucune demande en attente.
                </p>
                <div className="text-sm text-gray-600">
                  <p>Les demandes apparaîtront ici une fois la base de données configurée.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Liste des examens pour référence */}
      {isPublicView && examens && examens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Référence des examens</CardTitle>
            <CardDescription>
              Consultez cette liste pour trouver le code de votre examen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matière</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Horaire</TableHead>
                    <TableHead>Salle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examens.map((examen) => (
                    <TableRow key={examen.id}>
                      <TableCell className="font-medium">{examen.matiere}</TableCell>
                      <TableCell>{formatDateBelgian(examen.date_examen)}</TableCell>
                      <TableCell>{formatTimeRange(examen.heure_debut, examen.heure_fin)}</TableCell>
                      <TableCell>{examen.salle}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
