
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomStatusModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (newStatus: string) => void;
}

export function CustomStatusModal({ open, onClose, onAdd }: CustomStatusModalProps) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim());
      setInput("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau statut</DialogTitle>
        </DialogHeader>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="ex : Interne/Invité" />
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">Annuler</Button>
          <Button onClick={handleAdd} disabled={!input.trim()}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
