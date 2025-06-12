
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, Power } from "lucide-react";
import { useSessions, useActiveSession, useCreateSession, useActivateSession } from "@/hooks/useSessions";

export const SessionSelector = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newPeriod, setNewPeriod] = useState<number>(1);

  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: activeSession } = useActiveSession();
  const createSession = useCreateSession();
  const activateSession = useActivateSession();

  const periodLabels = {
    1: 'Janvier',
    6: 'Juin',
    9: 'Septembre'
  };

  const handleCreateSession = async () => {
    await createSession.mutateAsync({ year: newYear, period: newPeriod });
    setIsDialogOpen(false);
  };

  if (sessionsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Chargement des sessions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Gestion des Sessions</span>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Nouvelle Session</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une nouvelle session</DialogTitle>
                <DialogDescription>
                  Créez une nouvelle session d'examens pour une année et période données.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="year">Année</Label>
                  <Input
                    id="year"
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(parseInt(e.target.value))}
                    min={2024}
                    max={2030}
                  />
                </div>
                <div>
                  <Label htmlFor="period">Période</Label>
                  <Select value={newPeriod.toString()} onValueChange={(value) => setNewPeriod(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Janvier</SelectItem>
                      <SelectItem value="6">Juin</SelectItem>
                      <SelectItem value="9">Septembre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateSession} disabled={createSession.isPending}>
                  {createSession.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Gérez les sessions académiques et sélectionnez la session active
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-3">Session Active</h4>
          {activeSession ? (
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border">
              <Badge className="bg-blue-600">Actif</Badge>
              <span className="font-medium">{activeSession.name}</span>
              <span className="text-gray-600">
                {periodLabels[activeSession.period as keyof typeof periodLabels]} {activeSession.year}
              </span>
            </div>
          ) : (
            <p className="text-gray-500 italic">Aucune session active</p>
          )}
        </div>

        <div>
          <h4 className="font-medium mb-3">Toutes les Sessions</h4>
          <div className="space-y-2">
            {sessions?.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {session.is_active && <Badge variant="default">Actif</Badge>}
                  <span className="font-medium">{session.name}</span>
                  <span className="text-gray-600">
                    {periodLabels[session.period as keyof typeof periodLabels]} {session.year}
                  </span>
                </div>
                {!session.is_active && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => activateSession.mutate(session.id)}
                    disabled={activateSession.isPending}
                    className="flex items-center space-x-1"
                  >
                    <Power className="h-3 w-3" />
                    <span>Activer</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
