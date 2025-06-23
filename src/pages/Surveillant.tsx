
import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { SimpleSurveillantAvailabilityForm } from "@/components/SimpleSurveillantAvailabilityForm";
import { HomeButton } from "@/components/HomeButton";

const Surveillant = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      <UCLouvainHeader />
      <div className="p-4">
        <HomeButton />
      </div>
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
