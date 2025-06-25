
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Shield, Users, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
  user_email?: string; // Made optional since we'll handle missing emails
}

interface NewAdminForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export function AdminUserManager() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState<NewAdminForm>({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Récupérer la liste des administrateurs
  const { data: admins, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // First get the user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;
      
      // Then get the user emails from auth.users via RPC or admin API
      const adminsWithEmails = await Promise.all(
        (userRoles || []).map(async (role) => {
          try {
            // Try to get user data from Supabase auth admin
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(role.user_id);
            return {
              ...role,
              user_email: userData?.user?.email || "Email non disponible"
            };
          } catch (error) {
            console.warn("Could not fetch user email for:", role.user_id);
            return {
              ...role,
              user_email: "Email non disponible"
            };
          }
        })
      );

      return adminsWithEmails as UserRole[];
    },
  });

  // Mutation pour créer un nouvel administrateur
  const createAdminMutation = useMutation({
    mutationFn: async (formData: NewAdminForm) => {
      // D'abord créer l'utilisateur dans auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Utilisateur non créé");

      // Ensuite ajouter le rôle admin
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "admin"
        });

      if (roleError) throw roleError;
      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setIsAddDialogOpen(false);
      setNewAdminForm({ email: '', password: '', confirmPassword: '' });
      toast({
        title: "Administrateur créé",
        description: "Le nouvel administrateur a été créé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer un administrateur
  const deleteAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Supprimer le rôle admin
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (roleError) throw roleError;

      // Optionnel : supprimer complètement l'utilisateur de auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.warn("Impossible de supprimer l'utilisateur de auth:", authError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Administrateur supprimé",
        description: "L'administrateur a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateAdmin = () => {
    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    if (newAdminForm.password.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    createAdminMutation.mutate(newAdminForm);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des administrateurs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span>Gestion des Administrateurs</span>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Gérez les utilisateurs ayant accès à l'administration
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouvel administrateur</DialogTitle>
                <DialogDescription>
                  Créez un nouveau compte utilisateur avec les droits administrateur.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@exemple.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAdminForm.password}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 6 caractères"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={newAdminForm.confirmPassword}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Répéter le mot de passe"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateAdmin}
                  disabled={createAdminMutation.isPending}
                >
                  {createAdminMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Total: {admins?.length || 0} administrateur(s)</span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins?.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      {admin.user_email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        <Shield className="h-3 w-3 mr-1" />
                        Administrateur
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(admin.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      {admins.length > 1 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center space-x-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <span>Supprimer l'administrateur</span>
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer les droits administrateur de{" "}
                                <strong>{admin.user_email}</strong> ?
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAdminMutation.mutate(admin.user_id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {admins.length === 1 && (
                        <span className="text-xs text-gray-500">Dernier admin</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {admins?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun administrateur trouvé.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
