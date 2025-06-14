
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ExternalLink, HelpCircle, Users, Building2 } from "lucide-react";

export function CollecteDocumentation() {
  return (
    <Card className="border-uclouvain-blue/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-uclouvain-blue">
          <BookOpen className="h-5 w-5" />
          <span>Documentation et Consignes</span>
        </CardTitle>
        <CardDescription>
          Consultez les documents suivants avant de remplir votre candidature
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="https://www.uclouvain.be/fr/sss/consignes-de-surveillance" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 border border-uclouvain-blue/20 rounded-lg hover:bg-uclouvain-cyan/10 hover:border-uclouvain-cyan transition-colors"
          >
            <BookOpen className="h-4 w-4 text-uclouvain-blue" />
            <span className="text-uclouvain-blue">Consignes de surveillance</span>
            <ExternalLink className="h-4 w-4 ml-auto text-uclouvain-cyan" />
          </a>
          <a 
            href="https://www.uclouvain.be/fr/sss/faq-surveillants" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 border border-uclouvain-blue/20 rounded-lg hover:bg-uclouvain-cyan/10 hover:border-uclouvain-cyan transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-uclouvain-blue" />
            <span className="text-uclouvain-blue">FAQ Surveillants</span>
            <ExternalLink className="h-4 w-4 ml-auto text-uclouvain-cyan" />
          </a>
          <a 
            href="https://www.uclouvain.be/fr/sss/devenir-jobiste" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 border border-uclouvain-blue/20 rounded-lg hover:bg-uclouvain-cyan/10 hover:border-uclouvain-cyan transition-colors"
          >
            <Users className="h-4 w-4 text-uclouvain-blue" />
            <span className="text-uclouvain-blue">Devenir jobiste</span>
            <ExternalLink className="h-4 w-4 ml-auto text-uclouvain-cyan" />
          </a>
          <a 
            href="https://www.uclouvain.be/fr/sss/auditoires-et-locaux" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 border border-uclouvain-blue/20 rounded-lg hover:bg-uclouvain-cyan/10 hover:border-uclouvain-cyan transition-colors"
          >
            <Building2 className="h-4 w-4 text-uclouvain-blue" />
            <span className="text-uclouvain-blue">Auditoires et locaux</span>
            <ExternalLink className="h-4 w-4 ml-auto text-uclouvain-cyan" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
