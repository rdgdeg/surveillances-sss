
import { useState, useEffect } from "react";

export function usePersonnesEquipe(initialNb = 1) {
  const [nombrePersonnes, setNombrePersonnes] = useState(initialNb);
  const [personnesEquipe, setPersonnesEquipe] = useState([
    { nom: "", prenom: "", email: "", est_assistant: false, compte_dans_quota: true, present_sur_place: true }
  ]);

  useEffect(() => {
    const diff = nombrePersonnes - personnesEquipe.length;
    if (diff > 0) {
      setPersonnesEquipe([
        ...personnesEquipe,
        ...Array(diff).fill({ nom: "", prenom: "", email: "", est_assistant: false, compte_dans_quota: true, present_sur_place: true })
      ]);
    } else if (diff < 0) {
      setPersonnesEquipe(personnesEquipe.slice(0, nombrePersonnes));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombrePersonnes]);

  return {
    personnesEquipe,
    setPersonnesEquipe,
    nombrePersonnes,
    setNombrePersonnes,
  }
}
