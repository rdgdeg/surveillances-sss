
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  statut: string;
  telephone?: string;
  campus?: string;
  affectation_fac?: string;
}

interface NewSurveillant {
  nom: string;
  prenom: string;
  email: string;
  type: string;
  telephone?: string;
  campus?: string;
  affectation_fac?: string;
}

const ITEMS_PER_PAGE = 20;

export const SurveillantManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSurveillant, setNewSurveillant] = useState<NewSurveillant>({
    nom: '',
    prenom: '',
    email: '',
    type: '',
    telephone: '',
    campus: '',
    affectation_fac: ''
  });

  // Récupérer les surveillants avec pagination
  const { data: surveillantsData, isLoading } = useQuery({
    queryKey: ['surveillants-paginated', activeSession?.id, searchTerm, currentPage],
    queryFn: async () => {
      if (!activeSession?.id) return { data: [], count: 0 };
      
      let query = supabase
        .from('surveillant_sessions')
        .select(`
          surveillant:surveillants(*),
          is_active,
          quota,
          sessions_imposees
        `, { count: 'exact' })
        .eq('session_id', activeSession.id);

      if (searchTerm) {
        query = query.or(`surveillant.nom.ilike.%${searchTerm}%,surveillant.prenom.ilike.%${searchTerm}%,surveillant.email.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .range(from, to)
        .order('surveillant(nom)', { ascending: true });
      
      if (error) throw error;
      
      const surveillants = data?.map(item => ({
        ...item.surveillant,
        is_active: item.is_active,
        quota: item.quota,
        sessions_imposees: item.sessions_imposees
      })) || [];
      
      return { data: surveillants, count: count || 0 };
    },
    enabled: !!activeSession?.id
  });

  const addSurveillantMutation = useMutation({
    mutationFn: async (surveillantData: NewSurveillant) => {
      if (!activeSession?.id) throw new Error("Session non sélectionnée");

      // D'abord créer le surveillant
      const { data: surveillant, error: surveillantError } = await supabase
        .from('surveillants')
        .insert({
          nom: surveillantData.nom,
          prenom: surveillantData.prenom,
          email: surveillantData.email,
          type: surveillantData.type,
          telephone: surveillantData.telephone || null,
          campus: surveillantData.campus || null,
          affectation_fac: surveillantData.affectation_fac || null,
          statut: 'actif'
        })
        .select()
        .single();

      if (surveillantError) throw surveillantError;

      // Ensuite l'associer à la session
      const { error: sessionError } = await supabase
        .from('surveillant_sessions')
        .insert({
          session_id: activeSession.id,
          surveillant_id: surveillant.id,
          is_active: true,
          quota: 6
        });

      if (sessionError) throw sessionError;

      return surveillant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillants-paginated'] });
      setIsAddDialogOpen(false);
      setNewSurveillant({
        nom: '',
        prenom: '',
        email: '',
        type: '',
        telephone: '',
        campus: '',
        affectation_fac: ''
      });
      toast({
        title: "Surveillant ajouté",
        description: "Le surveillant a été ajouté avec succès à la session.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le surveillant.",
        variant: "destructive"
      });
    }
  });

  const surveillants = surveillantsData?.data || [];
  const totalCount = surveillantsData?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleAddSurveillant = () => {
    if (!newSurveillant.nom || !newSurveillant.prenom || !newSurveillant.email || !newSurveillant.type) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    addSurveillantMutation.mutate(newSurveillant);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Gestion des Surveillants</span>
          </CardTitle>
          <CardDescription>
            Gérez les surveillants de la session avec pagination et ajout manuel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un surveillant..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un surveillant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau surveillant</DialogTitle>
                  <DialogDescription>
                    Ajoutez manuellement un nouveau surveillant à la session.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom *</label>
                      <Input
                        value={newSurveillant.nom}
                        onChange={(e) => setNewSurveillant(prev => ({ ...prev, nom: e.target.value }))}
                        placeholder="Nom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Prénom *</label>
                      <Input
                        value={newSurveillant.prenom}
                        onChange={(e) => setNewSurveillant(prev => ({ ...prev, prenom: e.target.value }))}
                        placeholder="Prénom"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <Input
                      type="email"
                      value={newSurveillant.email}
                      onChange={(e) => setNewSurveillant(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <Select value={newSurveillant.type} onValueChange={(value) => setNewSurveillant(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Personnel Académique">Personnel Académique</SelectItem>
                        <SelectItem value="Personnel Administratif">Personnel Administratif</SelectItem>
                        <SelectItem value="Jobiste">Jobiste</SelectItem>
                        <SelectItem value="Externe">Externe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone</label>
                    <Input
                      value={newSurveillant.telephone || ''}
                      onChange={(e) => setNewSurveillant(prev => ({ ...prev, telephone: e.target.value }))}
                      placeholder="Numéro de téléphone"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Campus</label>
                    <Input
                      value={newSurveillant.campus || ''}
                      onChange={(e) => setNewSurveillant(prev => ({ ...prev, campus: e.target.value }))}
                      placeholder="Campus"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Affectation Faculté</label>
                    <Input
                      value={newSurveillant.affectation_fac || ''}
                      onChange={(e) => setNewSurveillant(prev => ({ ...prev, affectation_fac: e.target.value }))}
                      placeholder="Faculté d'affectation"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleAddSurveillant} 
                      disabled={addSurveillantMutation.isPending}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tableau des surveillants */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom/Prénom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Quota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : surveillants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Aucun surveillant trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  surveillants.map((surveillant) => (
                    <TableRow key={surveillant.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{surveillant.nom} {surveillant.prenom}</div>
                        </div>
                      </TableCell>
                      <TableCell>{surveillant.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{surveillant.type}</Badge>
                      </TableCell>
                      <TableCell>{surveillant.campus || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={surveillant.is_active ? "default" : "secondary"}
                          className={surveillant.is_active ? "bg-green-100 text-green-800" : ""}
                        >
                          {surveillant.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>{surveillant.quota || 6}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Affichage de {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} sur {totalCount} surveillants
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <span className="text-sm">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
