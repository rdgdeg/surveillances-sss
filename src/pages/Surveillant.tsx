
import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { SimpleSurveillantAvailabilityForm } from "@/components/SimpleSurveillantAvailabilityForm";

const Surveillant = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      <UCLouvainHeader />
      <main className="flex-1 w-full px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <SimpleSurveillantAvailabilityForm />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Surveillant;
