import { ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AuditoireLinkProps {
  auditoire: string;
  contraintesAuditoires?: Array<{
    auditoire: string;
    lien_google_maps?: string | null;
    adresse?: string | null;
  }>;
}

function findAuditoireData(auditoire: string, contraintes?: Array<any>) {
  if (!contraintes) return null;
  
  // Recherche exacte d'abord
  let found = contraintes.find(c => c.auditoire.toLowerCase() === auditoire.toLowerCase());
  
  // Si pas trouvé, recherche partielle
  if (!found) {
    found = contraintes.find(c => 
      auditoire.toLowerCase().includes(c.auditoire.toLowerCase()) ||
      c.auditoire.toLowerCase().includes(auditoire.toLowerCase())
    );
  }
  
  return found;
}

export function AuditoireLink({ auditoire, contraintesAuditoires }: AuditoireLinkProps) {
  if (!auditoire || auditoire === "-") {
    return <span>-</span>;
  }

  // Gérer les auditoires multiples (séparés par virgule)
  const auditoires = auditoire.split(',').map(aud => aud.trim());
  
  if (auditoires.length === 1) {
    const auditoireData = findAuditoireData(auditoires[0], contraintesAuditoires);
    
    if (auditoireData?.lien_google_maps) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={auditoireData.lien_google_maps}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline decoration-dotted hover:decoration-solid inline-flex items-center gap-1 transition-colors"
              >
                {auditoires[0]}
                <ExternalLink className="h-3 w-3" />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <div className="font-medium">{auditoires[0]}</div>
                {auditoireData.adresse && (
                  <div className="text-muted-foreground">{auditoireData.adresse}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">Cliquer pour ouvrir dans Google Maps</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return <span>{auditoires[0]}</span>;
  }

  // Gérer les auditoires multiples
  return (
    <span>
      {auditoires.map((aud, index) => {
        const auditoireData = findAuditoireData(aud, contraintesAuditoires);
        
        return (
          <span key={index}>
            {auditoireData?.lien_google_maps ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={auditoireData.lien_google_maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline decoration-dotted hover:decoration-solid inline-flex items-center gap-1 transition-colors"
                    >
                      {aud}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <div className="font-medium">{aud}</div>
                      {auditoireData.adresse && (
                        <div className="text-muted-foreground">{auditoireData.adresse}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">Cliquer pour ouvrir dans Google Maps</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span>{aud}</span>
            )}
            {index < auditoires.length - 1 && ", "}
          </span>
        );
      })}
    </span>
  );
}