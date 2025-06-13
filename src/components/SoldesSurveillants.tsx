
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

interface SoldeSurveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  quota: number;
  attributions_actuelles: number;
  solde: number;
  sessions_imposees: number;
}

export const SoldesSurveillants = () => {
  const { data: activeSession } = useActiveSession();

  const { data: soldes, isLoading } = useQuery({
    queryKey: ['soldes-surveillants', activeSession?.id],
    queryFn: async (): Promise<SoldeSurveillant[]> => {
      if (!activeSession?.id) {
        return [];
      }

      // Récupérer les surveillants avec leurs quotas pour la session active
      const { data: surveillantsData, error: surveillantsError } = await supabase
        .from('surveillant_sessions')
        .select(`
          surveillant_id,
          quota,
          sessions_imposees,
          surveillants!inner(nom, prenom, email, type)
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      if (surveillantsError) {
        console.error('Error fetching surveillants:', surveillantsError);
        throw surveillantsError;
      }

      if (!surveillantsData) {
        return [];
      }

      // Récupérer le nombre d'attributions actuelles pour chaque surveillant
      const { data: attributionsData, error: attributionsError } = await supabase
        .from('attributions')
        .select('surveillant_id')
        .eq('session_id', activeSession.id);

      if (attributionsError) {
        console.error('Error fetching attributions:', attributionsError);
        throw attributionsError;
      }

      // Compter les attributions par surveillant
      const attributionsCount = attributionsData?.reduce((acc, attr) => {
        acc[attr.surveillant_id] = (acc[attr.surveillant_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Construire la liste des soldes
      return surveillantsData.map((item): SoldeSurveillant => {
        const surveillant = Array.isArray(item.surveillants) ? item.surveillants[0] : item.surveillants;
        const attributions = attributionsCount[item.surveillant_id] || 0;
        const quota = item.quota || 0;
        const solde = quota - attributions;

        return {
          id: item.surveillant_id,
          nom: surveillant?.nom || '',
          prenom: surveillant?.prenom || '',
          email: surveillant?.email || '',
          type: surveillant?.type || '',
          quota: quota,
          attributions_actuelles: attributions,
          solde: solde,
          sessions_imposees: item.sessions_imposees || 0
        };
      });
    },
    enabled: !!activeSession?.id
  });

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des soldes...</p>
        </CardContent>
      </Card>
    );
  }

  const surveillantsEnDeficit = soldes?.filter(s => s.solde < 0) || [];
  const surveillantsAvecSolde = soldes?.filter(s => s.solde > 0) || [];
  const surveillantsEquilibres = soldes?.filter(s => s.solde === 0) || [];

  const getSoldeBadge = (solde: number) => {
    if (solde > 0) {
      return <Badge variant="outline" className="text-green-600 border-green-600"><TrendingUp className="w-3 h-3 mr-1" />+{solde}</Badge>;
    } else if (solde < 0) {
      return <Badge variant="destructive"><TrendingDown className="w-3 h-3 mr-1" />{solde}</Badge>;
    } else {
      return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />Équilibré</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Résumé des soldes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En déficit</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{surveillantsEnDeficit.length}</div>
            <p className="text-xs text-muted-foreground">
              Surveillants dépassant leur quota
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avec solde</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{surveillantsAvecSolde.length}</div>
            <p className="text-xs text-muted-foreground">
              Surveillants disponibles pour réassignation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Équilibrés</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{surveillantsEquilibres.length}</div>
            <p className="text-xs text-muted-foreground">
              Surveillants à quota exact
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Détail des soldes par surveillant</span>
          </CardTitle>
          <CardDescription>
            Suivi des quotas, attributions et soldes pour la session active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Surveillant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Quota</TableHead>
                <TableHead className="text-center">Attributions</TableHead>
                <TableHead className="text-center">Solde</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {soldes?.map((surveillant) => (
                <TableRow key={surveillant.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{surveillant.nom} {surveillant.prenom}</div>
                      <div className="text-sm text-muted-foreground">{surveillant.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{surveillant.type}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{surveillant.quota}</TableCell>
                  <TableCell className="text-center">{surveillant.attributions_actuelles}</TableCell>
                  <TableCell className="text-center">
                    {getSoldeBadge(surveillant.solde)}
                  </TableCell>
                  <TableCell className="text-center">
                    {surveillant.solde > 0 && (
                      <Button size="sm" variant="outline">
                        Réassigner
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
