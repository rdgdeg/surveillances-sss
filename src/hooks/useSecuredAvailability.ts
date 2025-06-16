
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useSecuredAvailability = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateTokenAccess = useCallback(async (token?: string) => {
    if (!token) return false;
    
    try {
      const { data, error } = await supabase.rpc('is_valid_token', {
        token_to_check: token
      });
      
      if (error) {
        console.error('Token validation error:', error);
        return false;
      }
      
      return data === true;
    } catch (err) {
      console.error('Token validation failed:', err);
      return false;
    }
  }, []);

  const secureInsertAvailability = useCallback(async (availabilityData: any, surveillantId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!surveillantId || !availabilityData.session_id) {
        throw new Error('Missing required fields for availability insertion');
      }

      // Insert with proper validation
      const { data, error } = await supabase
        .from('disponibilites')
        .insert({
          ...availabilityData,
          surveillant_id: surveillantId
        })
        .select();

      if (error) {
        console.error('Availability insert error:', error);
        throw new Error(`Failed to save availability: ${error.message}`);
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save availability';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const secureUpdateAvailability = useCallback(async (id: string, updates: any, userEmail?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('disponibilites')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Availability update error:', error);
        throw new Error(`Failed to update availability: ${error.message}`);
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update availability';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    validateTokenAccess,
    secureInsertAvailability,
    secureUpdateAvailability
  };
};
