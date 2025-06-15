import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { useParams } from "react-router-dom";
import { EnseignantTokenContent } from "@/components/EnseignantTokenContent";

const EnseignantToken = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <UCLouvainHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <EnseignantTokenContent token={token} />
      </main>
      <Footer />
    </div>
  );
};

export default EnseignantToken;
