import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Review {
  id: string;
  user_id: string;
  business_id: string;
  rating: number;
  comment: string | null;
  photo_urls: string[];
  created_at: string;
  business_reply: string | null;
  business_reply_at: string | null;
}

export function useReviews(businessId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: ["reviews", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((r) => ({ ...r, photo_urls: r.photo_urls || [] })) as Review[];
    },
  });

  const createReview = useMutation({
    mutationFn: async (review: { rating: number; comment?: string; photo_urls?: string[] }) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert({ ...review, business_id: businessId, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", businessId] });
    },
  });

  const uploadReviewPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("review-photos").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("review-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    reviews: reviewsQuery.data ?? [],
    isLoading: reviewsQuery.isLoading,
    createReview,
    uploadReviewPhoto,
  };
}
