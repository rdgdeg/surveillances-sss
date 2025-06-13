
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Download, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

interface ImportStats {
  totalImported: number;
  totalInFile: number;
  rejected: number;
  rejectedReasons: Array<{
    email: string;
    reason: string;
    data: any;
  }>;
}

export const ImportVerification = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const { data: activeSession } = useActiveSession();

  const checkImportStatus = async () => {
    if (!activeSession) {
      toast({
        title: "Erreur",
        description: "Aucune session active",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);
    try {
      // Compter les surveillants importés dans la session active
      const { data: surveillants, error: surveillantsError } = await supabase
        .from('surveillants')
        .select('id, email, nom, prenom, type, statut, affectation_fac, date_fin_contrat')
        .order('created_at', { ascending: false });

      if (surveillantsError) throw surveillantsError;

      // Vérifier combien sont dans la session active
      const { data: surveillantSessions, error: sessionsError } = await supabase
        .from('surveillant_sessions')
        .select('surveillant_id')
        .eq('session_id', activeSession.id);

      if (sessionsError) throw sessionsError;

      const activeSessionSurveillantIds = new Set(surveillantSessions.map(s => s.surveillant_id));
      const activeSurveillants = surveillants?.filter(s => activeSessionSurveillantIds.has(s.id)) || [];

      // Simuler la vérification des rejets (en réalité, on devrait stocker ces infos lors de l'import)
      const rejectedReasons: Array<{email: string; reason: string; data: any}> = [];
      
      surveillants?.forEach(surveillant => {
        if (!activeSessionSurveillantIds.has(surveillant.id)) {
          let reason = "Non inclus dans la session active";
          
          if (surveillant.affectation_fac?.toUpperCase().includes('FSM')) {
            reason = "Surveillant FSM exclu automatiquement";
          } else if (surveillant.date_fin_contrat) {
            const endDate = new Date(surveillant.date_fin_contrat);
            const today = new Date();
            if (endDate <= today) {
              reason = "Contrat expiré";
            }
          } else if (surveillant.statut === 'inactif') {
            reason = "Statut inactif";
          }
          
          rejectedReasons.push({
            email: surveillant.email,
            reason,
            data: surveillant
          });
        }
      });

      setStats({
        totalImported: activeSurveillants.length,
        totalInFile: (surveillants?.length || 0),
        rejected: rejectedReasons.length,
        rejectedReasons
      });

      toast({
        title: "Vérification terminée",
        description: `${activeSurveillants.length} surveillants actifs dans la session`,
      });

    } catch (error: any) {
      console.error('Error checking import:', error);
      toast({
        title: "Erreur de vérification",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const forceImportRejected = async (rejectedItem: any) => {
    if (!activeSession) return;

    try {
      // Forcer l'ajout à la session active
      const { data: newSurveillant } = await supabase
        .from('surveillant_sessions')
        .insert({
          surveillant_id: rejectedItem.data.id,
          session_id: activeSession.id,
          quota: rejectedItem.data.type === 'PAT' ? 12 : 6
        })
        .select()
        .single();

      if (newSurveillant) {
        toast({
          title: "Import forcé",
          description: `${rejectedItem.email} ajouté à la session active`,
        });
        
        // Rafraîchir les stats
        checkImportStatus();
      }
    } catch (error: any) {
      toast({
        title: "Erreur d'import forcé",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportRejectedList = () => {
    if (!stats?.rejectedReasons.length) return;

    const csvContent = [
      'Email,Nom,Prénom,Type,Raison du rejet',
      ...stats.rejectedReasons.map(item => 
        `${item.email},${item.data.nom},${item.data.prenom},${item.data.type},"${item.reason}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `surveillants_rejetes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>Vérification des imports</span>
        </CardTitle>
        <CardDescription>
          Contrôlez que vos imports de surveillants correspondent aux données attendues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!activeSession && (
          <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-orange-800 text-sm">Aucune session active</span>
          </div>
        )}

        <div className="flex space-x-2">
          <Button 
            onClick={checkImportStatus}
            disabled={!activeSession || isChecking}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Vérification...' : 'Vérifier les imports'}</span>
          </Button>
        </div>

        {stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.totalImported}</p>
                      <p className="text-sm text-gray-600">Importés avec succès</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                      <p className="text-sm text-gray-600">Rejetés</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stats.totalInFile}</p>
                      <p className="text-sm text-gray-600">Total dans le fichier</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {stats.rejected > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRejected(!showRejected)}
                  >
                    {showRejected ? 'Masquer' : 'Voir'} les rejets ({stats.rejected})
                  </Button>
                  
                  {showRejected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportRejectedList}
                      className="flex items-center space-x-1"
                    >
                      <Download className="h-4 w-4" />
                      <span>Exporter la liste</span>
                    </Button>
                  )}
                </div>

                {showRejected && (
                  <Card>
                    <CardContent className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Raison du rejet</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.rejectedReasons.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">{item.email}</TableCell>
                              <TableCell>{item.data.nom} {item.data.prenom}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.data.type}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={item.reason.includes('FSM') ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {item.reason}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => forceImportRejected(item)}
                                  className="text-xs"
                                >
                                  Forcer l'import
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {stats.rejected === 0 && stats.totalImported > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 text-sm">
                  Tous les surveillants ont été importés avec succès !
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
