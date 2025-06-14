
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Send, Link2, Copy } from "lucide-react";

export const TokenGenerator = () => {
  const { data: activeSession } = useActiveSession();
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<Array<{
    email: string;
    token: string;
    link: string;
  }>>([]);

  const generateTokens = async () => {
    if (!activeSession?.id) {
      toast({
        title: "Erreur",
        description: "Aucune session active sélectionnée",
        variant: "destructive"
      });
      return;
    }

    const emailList = emails.split('\n').filter(email => email.trim());
    if (emailList.length === 0) {
      toast({
        title: "Erreur", 
        description: "Veuillez saisir au moins un email",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    const links = [];

    try {
      for (const email of emailList) {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) continue;

        // Générer un token unique
        const { data: tokenData, error: tokenError } = await supabase
          .rpc('generate_teacher_token');

        if (tokenError) throw tokenError;

        const token = tokenData;
        const link = `${window.location.origin}/enseignant/${token}`;

        // Mettre à jour tous les examens de cet enseignant avec le token
        const { error: updateError } = await supabase
          .from('examens')
          .update({ 
            lien_enseignant_token: token 
          })
          .eq('session_id', activeSession.id)
          .eq('enseignant_email', trimmedEmail);

        if (updateError) {
          console.error('Erreur mise à jour examens:', updateError);
        }

        links.push({
          email: trimmedEmail,
          token,
          link
        });
      }

      setGeneratedLinks(links);
      toast({
        title: "Tokens générés",
        description: `${links.length} liens ont été générés avec succès`,
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer les tokens",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Copié",
      description: "Le lien a été copié dans le presse-papiers",
    });
  };

  const copyAllLinks = () => {
    const allLinks = generatedLinks.map(item => 
      `${item.email}: ${item.link}`
    ).join('\n');
    
    navigator.clipboard.writeText(allLinks);
    toast({
      title: "Tous les liens copiés",
      description: "Tous les liens ont été copiés dans le presse-papiers",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link2 className="h-5 w-5" />
            <span>Génération de Liens Enseignants</span>
          </CardTitle>
          <CardDescription>
            Générez des liens personnalisés pour que les enseignants puissent confirmer leurs besoins en surveillance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="emails">Emails des enseignants (un par ligne)</Label>
            <Textarea
              id="emails"
              placeholder="enseignant1@example.com&#10;enseignant2@example.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={5}
            />
          </div>

          <div>
            <Label htmlFor="message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="message"
              placeholder="Merci de confirmer vos besoins en surveillance..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={generateTokens} 
            disabled={isGenerating || !activeSession}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isGenerating ? "Génération..." : "Générer les liens"}
          </Button>
        </CardContent>
      </Card>

      {generatedLinks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Liens générés</CardTitle>
              <Button variant="outline" size="sm" onClick={copyAllLinks}>
                <Copy className="h-4 w-4 mr-2" />
                Copier tous
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedLinks.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-2">{item.email}</Badge>
                    <div className="text-sm text-gray-600 font-mono break-all">
                      {item.link}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyLink(item.link)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
