
import { CollecteDisponibilites } from "@/components/CollecteDisponibilites";
import { Footer } from "@/components/Footer";

const DisponibilitesForm = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 container mx-auto px-4 py-8">
        <CollecteDisponibilites />
      </div>
      <Footer />
    </div>
  );
};

export default DisponibilitesForm;
