
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, AlertTriangle, Eye, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

interface SurveillantCandidate {
  nom: string;
  prenom: string;
  email: string;
  type: string;
  statut: string;
  isValid: boolean;
  errors: string[];
  exists: boolean;
}

interface SurveillantImportReviewProps {
  candidates: SurveillantCandidate[];
  onConfirm: (approved: SurveillantCandidate[]) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const SurveillantImportReview = ({ 
  candidates, 
  onConfirm, 
  onCancel, 
  isOpen 
}: SurveillantImportReviewProps) => {
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
  const { data: activeSession } = useActiveSession();

  useEffect(() => {
    // Sélectionner automatiquement les candidats valides
    const validIndices = candidates
      .map((candidate, index) => candidate.isValid ? index : -1)
      .filter(index => index !== -1);
    setSelectedCandidates(new Set(validIndices));
  }, [candidates]);

  const toggleCandidate = (index: number) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCandidates(newSelected);
  };

  const handleConfirm = () => {
    const approvedCandidates = candidates.filter((_, index) => 
      selectedCandidates.has(index)
    );
    onConfirm(approvedCandidates);
  };

  const getStatusIcon = (candidate: SurveillantCandidate) => {
    if (candidate.exists) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    if (candidate.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (candidate: SurveillantCandidate) => {
    if (candidate.exists) {
      return <Badge variant="secondary">Existe déjà</Badge>;
    }
    if (candidate.isValid) {
      return <Badge variant="default" className="bg-green-500">Valide</Badge>;
    }
    return <Badge variant="destructive">Invalide</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Révision de l'import des surveillants</span>
          </DialogTitle>
          <DialogDescription>
            Vérifiez les données avant l'import final. Vous pouvez sélectionner/désélectionner les surveillants à importer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  {candidates.filter(c => c.isValid && !c.exists).length} nouveaux valides
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">
                  {candidates.filter(c => c.exists).length} existent déjà
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">
                  {candidates.filter(c => !c.isValid).length} invalides
                </span>
              </div>
            </div>
            <Badge variant="outline">
              {selectedCandidates.size} / {candidates.length} sélectionnés
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">✓</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Erreurs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate, index) => (
                <TableRow key={index} className={selectedCandidates.has(index) ? "bg-blue-50" : ""}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedCandidates.has(index)}
                      onChange={() => toggleCandidate(index)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(candidate)}
                      {getStatusBadge(candidate)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{candidate.nom}</TableCell>
                  <TableCell>{candidate.prenom}</TableCell>
                  <TableCell>{candidate.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{candidate.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {candidate.errors.length > 0 && (
                      <div className="text-sm text-red-600">
                        {candidate.errors.join(", ")}
                      </div>
                    )}
                    {candidate.exists && (
                      <div className="text-sm text-orange-600">
                        Ce surveillant existe déjà
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  const validIndices = candidates
                    .map((candidate, index) => candidate.isValid && !candidate.exists ? index : -1)
                    .filter(index => index !== -1);
                  setSelectedCandidates(new Set(validIndices));
                }}
              >
                Sélectionner valides uniquement
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedCandidates.size === 0}
                className="flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Importer {selectedCandidates.size} surveillant(s)</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
