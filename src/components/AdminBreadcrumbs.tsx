import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const AdminBreadcrumbs = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const currentTab = params.get("tab");
  const pathname = location.pathname;

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Accueil", href: "/" },
      { label: "Administration", href: "/admin" }
    ];

    if (pathname.startsWith("/admin/")) {
      const segments = pathname.split("/").filter(Boolean);
      
      if (segments[1] === "disponibilites") {
        breadcrumbs.push({ label: "Surveillance" });
        breadcrumbs.push({ label: "Disponibilités" });
        
        if (pathname.includes("/par-jour")) {
          breadcrumbs.push({ label: "Par jour" });
        } else if (pathname.includes("/matrice")) {
          breadcrumbs.push({ label: "Matrice" });
        } else if (pathname.includes("/par-personne")) {
          breadcrumbs.push({ label: "Par personne" });
        }
      } else if (segments[1] === "demandes-specifiques") {
        breadcrumbs.push({ label: "Surveillance" });
        breadcrumbs.push({ label: "Demandes spécifiques" });
      } else if (segments[1] === "candidatures") {
        breadcrumbs.push({ label: "Surveillance" });
        breadcrumbs.push({ label: "Candidatures" });
      } else if (segments[1] === "templates") {
        breadcrumbs.push({ label: "Configuration" });
        breadcrumbs.push({ label: "Templates & Import" });
      }
    } else if (currentTab) {
      switch (currentTab) {
        case "examens":
          breadcrumbs.push({ label: "Configuration" });
          breadcrumbs.push({ label: "Gestion examens" });
          break;
        case "planning":
        case "validations":
          breadcrumbs.push({ label: "Validation" });
          breadcrumbs.push({ label: "Validation examens" });
          break;
        case "enseignant-view":
          breadcrumbs.push({ label: "Validation" });
          breadcrumbs.push({ label: "Vue Enseignant" });
          break;
        case "surveillants":
          breadcrumbs.push({ label: "Surveillance" });
          breadcrumbs.push({ label: "Surveillants" });
          break;
        case "pre-assignations":
          breadcrumbs.push({ label: "Surveillance" });
          breadcrumbs.push({ label: "Attributions" });
          break;
        case "contraintes":
          breadcrumbs.push({ label: "Configuration" });
          breadcrumbs.push({ label: "Contraintes auditoires" });
          break;
        case "gestion-utilisateurs":
          breadcrumbs.push({ label: "Administration" });
          breadcrumbs.push({ label: "Gestion utilisateurs" });
          break;
        case "feature-locks":
          breadcrumbs.push({ label: "Administration" });
          breadcrumbs.push({ label: "Verrouillages" });
          break;
        case "controles-verifications":
          breadcrumbs.push({ label: "Administration" });
          breadcrumbs.push({ label: "Vérifications qualité" });
          break;
        case "suivi-confirm-enseignants":
          breadcrumbs.push({ label: "Validation" });
          breadcrumbs.push({ label: "Suivi confirmations" });
          break;
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-4">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
          {breadcrumb.href ? (
            <Link
              to={breadcrumb.href}
              className="hover:text-uclouvain-blue transition-colors flex items-center"
            >
              {index === 0 && <Home className="h-4 w-4 mr-1" />}
              {breadcrumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium flex items-center">
              {index === 0 && <Home className="h-4 w-4 mr-1" />}
              {breadcrumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
};