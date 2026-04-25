import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  useGetCardReviewsQuery,
  useGetPromotionReviewsQuery,
  useCreateReviewMutation,
} from "../store/api/reviewsApi";

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

export function useReviews(businessId: string, promotionId?: number | null) {
  const { user } = useAuth();
  const cardId = Number(businessId) || 0;
  const promoId = promotionId ? Number(promotionId) : 0;

  const cardQuery = useGetCardReviewsQuery(cardId, { skip: !!promoId || !cardId });
  const promoQuery = useGetPromotionReviewsQuery(promoId, { skip: !promoId });
  const reviewsQuery = promoId ? promoQuery : cardQuery;

  const [createTrigger, createState] = useCreateReviewMutation();
  const createReview = {
    mutateAsync: async (review: { rating: number; comment?: string; photo_urls?: string[] }) => {
      const payload: any = {
        rating: review.rating,
        comment: review.comment,
        photo_url: review.photo_urls?.[0],
      };
      if (promoId) payload.business_promotion_id = promoId;
      if (cardId) payload.business_id = cardId;
      const data = await createTrigger(payload).unwrap();
      return data;
    },
    isPending: createState.isLoading,
  };

  const uploadReviewPhoto = async (file: { uri: string; name?: string; type?: string }): Promise<string> => {
    const ext = (file.name || file.uri.split(".").pop() || "jpg").split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from("review-photos").upload(path, blob, {
      contentType: file.type || "image/jpeg",
    } as any);
    if (error) throw error;
    const { data } = supabase.storage.from("review-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    reviews: (reviewsQuery.data ?? []).map((r: any) => ({ ...r, id: String(r.id) })) as Review[],
    isLoading: reviewsQuery.isLoading,
    createReview,
    uploadReviewPhoto,
  };
}
