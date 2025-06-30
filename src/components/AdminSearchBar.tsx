
import React, { useState, useEffect } from "react";
import { Search, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SearchItem {
  title: string;
  description: string;
  href: string;
  category: string;
  keywords: string[];
}

const searchItems: SearchItem[] = [
  // Examens & Planning
  { title: "Gestion examens", description: "Créer, modifier et gérer les examens", href: "/admin?tab=examens", category: "Examens", keywords: ["examen", "matière", "salle", "horaire"] },
  { title: "Planning & Validations", description: "Consulter le planning et valider les examens", href: "/admin?tab=planning", category: "Planning", keywords: ["planning", "validation", "calendrier", "horaire"] },
  { title: "Templates & Import", description: "Importer des examens et gérer les templates", href: "/admin/templates", category: "Import", keywords: ["import", "excel", "template", "fichier", "codes"] },
  
  // Surveillance
  { title: "Surveillants", description: "Gérer les surveillants et leurs informations", href: "/admin?tab=surveillants", category: "Surveillance", keywords: ["surveillant", "personnel", "quota", "type"] },
  { title: "Disponibilités", description: "Collecter et gérer les disponibilités", href: "/admin/disponibilites", category: "Surveillance", keywords: ["disponibilité", "créneaux", "horaire", "collecte"] },
  { title: "Pré-assignations", description: "Gérer les pré-assignations de surveillance", href: "/admin?tab=pre-assignations", category: "Surveillance", keywords: ["assignation", "attribution", "surveillance"] },
  { title: "Demandes spécifiques", description: "Traiter les demandes de surveillance obligatoire", href: "/admin/demandes-specifiques", category: "Surveillance", keywords: ["demande", "obligatoire", "spécifique", "commentaire"] },
  
  // Configuration
  { title: "Créneaux de surveillance", description: "Configurer et valider les créneaux de surveillance", href: "/admin?tab=controles-verifications", category: "Configuration", keywords: ["créneaux", "surveillance", "horaire", "configuration", "validation"] },
  { title: "Contraintes auditoires", description: "Définir les contraintes par salle", href: "/admin?tab=contraintes", category: "Configuration", keywords: ["contrainte", "auditoire", "salle", "capacité"] },
  { title: "Verrouillages", description: "Gérer les verrouillages de fonctionnalités", href: "/admin?tab=feature-locks", category: "Configuration", keywords: ["verrouillage", "lock", "fonctionnalité"] },
  { title: "Gestion utilisateurs", description: "Administrer les comptes utilisateurs", href: "/admin?tab=gestion-utilisateurs", category: "Configuration", keywords: ["utilisateur", "compte", "admin", "rôle"] },
  
  // Enseignants
  { title: "Vue Enseignant", description: "Interface pour les enseignants", href: "/admin?tab=enseignant-view", category: "Enseignants", keywords: ["enseignant", "professeur", "vue", "interface"] },
  { title: "Suivi confirmations", description: "Suivre les confirmations des enseignants", href: "/admin?tab=suivi-confirm-enseignants", category: "Enseignants", keywords: ["confirmation", "enseignant", "suivi", "validation"] },
  
  // Contrôles
  { title: "Vérifications qualité", description: "Contrôles et vérifications de qualité", href: "/admin?tab=controles-verifications", category: "Contrôles", keywords: ["contrôle", "vérification", "qualité", "intégrité"] },
];

export const AdminSearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<SearchItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim() === '') {
      setFilteredItems(searchItems.slice(0, 8));
    } else {
      const filtered = searchItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredItems(filtered.slice(0, 8));
    }
  }, [query]);

  const handleItemClick = (href: string) => {
    navigate(href);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Rechercher...</span>
        <div className="ml-auto flex items-center space-x-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Recherche dans l'administration</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Tapez pour rechercher une fonction..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredItems.map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 text-left"
                  onClick={() => handleItemClick(item.href)}
                >
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {item.category}
                    </div>
                  </div>
                </Button>
              ))}
              {filteredItems.length === 0 && query && (
                <div className="text-center py-6 text-muted-foreground">
                  Aucun résultat trouvé pour "{query}"
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
