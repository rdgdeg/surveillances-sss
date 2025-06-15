
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type Slot = {
  id: string;
  nom: string;
  date: string;
  heureDebut: string;
  heureFin: string;
};

export function PersonnesSlotManager() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [form, setForm] = useState({ nom: "", date: "", heureDebut: "", heureFin: "" });

  function ajouterSlot() {
    setSlots(slots => [...slots, { ...form, id: Math.random().toString(16).slice(2) }]);
    setForm({ nom: "", date: "", heureDebut: "", heureFin: "" });
  }
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle>Gestion des créneaux / slots</CardTitle>
        <CardDescription>
          Ajoutez ici les créneaux/disponibilités des personnes pour la surveillance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap mb-4">
          <input type="text" placeholder="Nom" className="border rounded px-2 py-1 text-xs"
            value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          <input type="date" className="border rounded px-2 py-1 text-xs"
            value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <input type="time" className="border rounded px-2 py-1 text-xs"
            value={form.heureDebut} onChange={e => setForm(f => ({ ...f, heureDebut: e.target.value }))} />
          <input type="time" className="border rounded px-2 py-1 text-xs"
            value={form.heureFin} onChange={e => setForm(f => ({ ...f, heureFin: e.target.value }))} />
          <Button onClick={ajouterSlot} size="sm">Ajouter le créneau</Button>
        </div>
        <table className="w-full text-xs border">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Date</th>
              <th>Début</th>
              <th>Fin</th>
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot.id}>
                <td>{slot.nom}</td>
                <td>{slot.date}</td>
                <td>{slot.heureDebut}</td>
                <td>{slot.heureFin}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Ceci est une maquette statique, à intégrer avec la base de données */}
      </CardContent>
    </Card>
  );
}
