import {
  useListBusinessLeadsQuery,
  useListPromotionLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadStatusMutation,
} from "../store/api/leadsApi";
import { useAuth } from "./useAuth";
import { toast } from "../lib/toast";

interface LeadInput {
  business_card_id?: string | number;
  business_promotion_id?: string | number;
  full_name: string;
  email?: string;
  phone?: string;
  message?: string;
  source?: string;
}

export const useBusinessLeads = (
  businessCardId?: string | number | null,
  promotionId?: string | number | null
) => {
  const { user } = useAuth();
  const cardId = businessCardId ? Number(businessCardId) : 0;
  const promoId = promotionId ? Number(promotionId) : 0;

  const cardQuery = useListBusinessLeadsQuery(
    cardId ? { businessId: cardId, promotionId: promoId || undefined } : ({} as any),
    { skip: !user || !cardId }
  );
  const promoQuery = useListPromotionLeadsQuery(
    promoId ? { promotionId: promoId } : ({} as any),
    { skip: !user || !promoId || !!cardId }
  );
  const active = cardId ? cardQuery : promoQuery;

  const raw = (active.data?.data ?? []) as any[];
  const leads = raw.map((l: any) => ({
    id: String(l.id),
    full_name: l.customer_name ?? l.full_name ?? "",
    phone: l.customer_phone ?? l.phone ?? null,
    email: l.customer_email ?? l.email ?? null,
    message: l.message ?? null,
    status: l.status,
    source: l.source ?? null,
    created_at: l.created_at,
    business_id: l.business_id,
    business_promotion_id: l.business_promotion_id,
  }));

  const [createLeadTrigger] = useCreateLeadMutation();
  const buildPayload = (lead: LeadInput) => ({
    business_id: lead.business_card_id ? Number(lead.business_card_id) : undefined,
    business_promotion_id: lead.business_promotion_id
      ? Number(lead.business_promotion_id)
      : undefined,
    customer_name: lead.full_name,
    customer_phone: lead.phone,
    customer_email: lead.email,
    message: lead.message,
  });

  const submitLead = {
    mutate: (lead: LeadInput) => {
      createLeadTrigger(buildPayload(lead))
        .unwrap()
        .then(() => toast.success("Your inquiry has been sent!"))
        .catch(() => toast.error("Failed to send inquiry"));
    },
    mutateAsync: async (lead: LeadInput) => {
      return createLeadTrigger(buildPayload(lead)).unwrap();
    },
  };

  const [updateStatusTrigger] = useUpdateLeadStatusMutation();
  const updateLeadStatus = {
    mutate: ({ id, status }: { id: string | number; status: string }) => {
      updateStatusTrigger({ id: Number(id), status })
        .unwrap()
        .then(() => toast.success("Lead status updated!"))
        .catch(() => toast.error("Failed to update lead"));
    },
  };

  return { leads, isLoading: active.isLoading, submitLead, updateLeadStatus };
};
