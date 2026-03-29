import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { toast } from "../lib/toast";
import {
  useGetMyCardsQuery,
  useCreateCardMutation,
  useUpdateCardMutation,
  useDeleteCardMutation,
} from "../store/api/businessCardsApi";

export interface BusinessCardRow {
  id: string;
  user_id: string;
  full_name: string;
  birthdate: string | null;
  anniversary: string | null;
  gender: string | null;
  phone: string;
  email: string | null;
  location: string | null;
  maps_link: string | null;
  company_name: string | null;
  job_title: string | null;
  company_phone: string | null;
  company_email: string | null;
  website: string | null;
  company_address: string | null;
  company_maps_link: string | null;
  logo_url: string | null;
  description: string | null;
  business_hours: string | null;
  category: string | null;
  established_year: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;
  twitter: string | null;
  keywords: string | null;
  offer: string | null;
  services: string[];
  created_at: string;
  updated_at: string;
}

export const useBusinessCards = () => {
  const { isAuthenticated, user } = useAuth();
  const { data: rawCards = [], isLoading, error } = useGetMyCardsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const cards = useMemo(
    () => (rawCards as any[]).map((c) => ({ ...c, id: String(c.id) })) as BusinessCardRow[],
    [rawCards]
  );

  const [createCardTrigger, createState] = useCreateCardMutation();
  const [updateCardTrigger, updateState] = useUpdateCardMutation();
  const [deleteCardTrigger, deleteState] = useDeleteCardMutation();

  const createCard = {
    mutateAsync: async (
      card: Omit<BusinessCardRow, "id" | "user_id" | "created_at" | "updated_at">
    ) => {
      try {
        const data = await createCardTrigger(card).unwrap();
        toast.success("Business card created!");
        return { ...data, id: String((data as any).id) } as BusinessCardRow;
      } catch (e: any) {
        toast.error(e?.data?.error || e?.message || "Failed to create card");
        throw e;
      }
    },
    isPending: createState.isLoading,
  };

  const updateCard = {
    mutateAsync: async ({ id, ...card }: Partial<BusinessCardRow> & { id: string }) => {
      try {
        const data = await updateCardTrigger({ id: Number(id), data: card }).unwrap();
        toast.success("Business card updated!");
        return { ...data, id: String((data as any).id) } as BusinessCardRow;
      } catch (e: any) {
        toast.error(e?.data?.error || e?.message || "Failed to update card");
        throw e;
      }
    },
    isPending: updateState.isLoading,
  };

  const deleteCard = {
    mutateAsync: async (id: string) => {
      try {
        await deleteCardTrigger(Number(id)).unwrap();
        toast.success("Card deleted");
      } catch (e: any) {
        toast.error(e?.data?.error || e?.message || "Failed to delete card");
        throw e;
      }
    },
    isPending: deleteState.isLoading,
  };

  return { cards, isLoading, createCard, updateCard, deleteCard };
};
