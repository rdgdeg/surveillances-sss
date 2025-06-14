
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CommentaireSurveillanceSection } from "./CommentaireSurveillanceSection";
import React from "react";

function formatExamSlotForDisplay(date_examen: string, heure_debut: string, heure_fin: string) {
  const date = new Date(`${date_examen}T${heure_debut}`);
  const jour = String(date.getDate()).padStart(2, "0");
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const annee = date.getFullYear();
  const formattedDate = `${jour}-${mois}-${annee}`;

  const [hdHour, hdMin] = heure_debut.split(":").map(Number);
  const debutSurv = new Date(date);
  debutSurv.setHours(hdHour);
  debutSurv.setMinutes(hdMin - 45);
  if (debutSurv.getMinutes() < 0) {
    debutSurv.setHours(debutSurv.getHours() - 1);
    debutSurv.setMinutes(debutSurv.getMinutes() + 60);
  }
  const dh = String(debutSurv.getHours()).padStart(2, "0");
  const dm = String(debutSurv.getMinutes()).padStart(2, "0");
  const startSurv = `${dh}:${dm}`;

  return {
    formattedDate,
    debutSurv: startSurv,
    heure_fin
  };
}

function groupCreneauxByWeek(creneaux: {
  examenIds: string[];
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
}[]) {
  const semaines: {
    title: string;
    range: { start: Date; end: Date };
    creneaux: {
      examenIds: string[];
      date_examen: string;
      heure_debut: string;
      heure_fin: string;
    }[];
  }[] = [];

  creneaux.forEach((creneau) => {
    const dateObj = parseISO(creneau.date_examen);
    const weekStart = new Date(dateObj);
    weekStart.setDate(dateObj.getDate() - ((dateObj.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    let semaine = semaines.find((s) =>
      dateObj >= s.range.start && dateObj <= s.range.end
    );
    if (!semaine) {
      semaine = {
        title: `Semaine du ${format(weekStart, "dd-MM-yyyy", { locale: fr })} au ${format(weekEnd, "dd-MM-yyyy", { locale: fr })}`,
        range: { start: weekStart, end: weekEnd },
        creneaux: [],
      };
      semaines.push(semaine);
    }
    semaine.creneaux.push(creneau);
  });

  semaines.forEach(sem => {
    sem.creneaux = sem.creneaux.filter(c => {
      const jour = parseISO(c.date_examen).getDay();
      return jour >= 1 && jour <= 5;
    });
  });

  return semaines.filter(s => s.creneaux.length > 0);
}

export function DisponibilitesSection({
  uniqueCreneaux,
  formData,
  handleCreneauChange,
  handleCommentaireChange,
  handleNomExamenChange,
}: {
  uniqueCreneaux: {
    examenIds: string[];
    date_examen: string;
    heure_debut: string;
    heure_fin: string;
  }[];
  formData: any,
  handleCreneauChange: (creneauIds: string[], checked: boolean) => void,
  handleCommentaireChange: (examenId: string, commentaire: string) => void,
  handleNomExamenChange: (examenId: string, nomExamen: string) => void,
}) {

  // Helper: Pour un groupe de IDs de créneau, vérifier s'il y a des commentaires: 
  const getCommentaireValue = (ids: string[], dict: Record<string, string>) => {
    for (const id of ids) {
      if (dict[id]) return dict[id];
    }
    return "";
  };

  // Si une info est modifiée, on applique à TOUS les ids du creneau (propager à tous examens du creneau)
  const handleCommentaireCreneau = (creneauIds: string[], commentaire: string) => {
    creneauIds.forEach(id => handleCommentaireChange(id, commentaire));
  };
  const handleNomExamenCreneau = (creneauIds: string[], nomExamen: string) => {
    creneauIds.forEach(id => handleNomExamenChange(id, nomExamen));
  };

  return (
    <Card className="border-uclouvain-blue/20">
      <CardHeader>
        <CardTitle className="text-uclouvain-blue">Disponibilités</CardTitle>
        <CardDescription>
          Cochez les créneaux où vous êtes disponible pour surveiller. 
          Les horaires incluent le temps de préparation (45 minutes avant chaque examen).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {groupCreneauxByWeek(uniqueCreneaux).map((semaine, semIdx) => (
            <div key={semaine.title}>
              <h3 className="font-bold text-uclouvain-blue mb-2">{semaine.title}</h3>
              <div className="space-y-4">
                {semaine.creneaux.map((creneau, idx) => {
                  const dateObj = parseISO(creneau.date_examen);
                  const jourSemaine = format(dateObj, "EEEE", { locale: fr });
                  const jourNum = format(dateObj, "dd-MM-yyyy", { locale: fr });
                  const { debutSurv, heure_fin } = formatExamSlotForDisplay(
                    creneau.date_examen,
                    creneau.heure_debut,
                    creneau.heure_fin
                  );
                  const anyChecked = creneau.examenIds.some(id => formData.disponibilites[id]);
                  // L'état partagé (par créneau): s'il y a un commentaire/nmExamen pour un des ids de ce créneau, on le récupère (ou "" sinon)
                  const commentaireValue = getCommentaireValue(creneau.examenIds, formData.commentaires_surveillance);
                  const nomExamenValue = getCommentaireValue(creneau.examenIds, formData.noms_examens_obligatoires);

                  return (
                    <div
                      key={`${creneau.date_examen}_${creneau.heure_debut}_${creneau.heure_fin}`}
                      className="border border-uclouvain-blue/20 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`creneau-${semIdx}-${idx}`}
                          checked={anyChecked}
                          onCheckedChange={checked => handleCreneauChange(creneau.examenIds, !!checked)}
                        />
                        <Label htmlFor={`creneau-${semIdx}-${idx}`} className="flex-1 cursor-pointer">
                          <div className="font-medium text-uclouvain-blue flex items-center space-x-2">
                            <span className="capitalize">{jourSemaine}</span>
                            <span>{jourNum}</span>
                            <span className="text-sm text-muted-foreground">
                              {debutSurv} - {heure_fin}
                            </span>
                          </div>
                        </Label>
                      </div>
                      {anyChecked && (
                        <CommentaireSurveillanceSection
                          key={creneau.examenIds.join("_")}
                          creneauId={creneau.examenIds.join("_")}
                          commentaire={commentaireValue}
                          nomExamen={nomExamenValue}
                          onCommentaireChange={(_, commentaire) =>
                            handleCommentaireCreneau(creneau.examenIds, commentaire)
                          }
                          onNomExamenChange={(_, nomExamen) =>
                            handleNomExamenCreneau(creneau.examenIds, nomExamen)
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
