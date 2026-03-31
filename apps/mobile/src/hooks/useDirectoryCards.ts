import { useEffect, useMemo, useRef, useState } from "react";
import { useListPromotionsQuery, useListPromotionsNearbyQuery, useGetPromotionQuery } from "../store/api/promotionsApi";
import { useGetCardQuery, useListCardsQuery } from "../store/api/businessCardsApi";

export interface DirectoryCard {
  id: string;
  /** Raw numeric ID for API calls (promotion ID or card ID depending on _source) */
  _numericId: number;
  /** Source of the record: 'promotion' or 'card' */
  _source: 'promotion' | 'card';
  business_card_id?: string | null;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  location: string | null;
  company_name: string | null;
  job_title: string | null;
  logo_url: string | null;
  description: string | null;
  category: string | null;
  services: string[];
  offer: string | null;
  website: string | null;
  business_hours: string | null;
  established_year: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;
  twitter: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_address: string | null;
  company_maps_link: string | null;
  maps_link: string | null;
  keywords: string | null;
  gender: string | null;
  birthdate: string | null;
  anniversary: string | null;
  latitude: number | null;
  longitude: number | null;
  home_service: boolean;
  service_mode: string | null;
  whatsapp: string | null;
  telegram: string | null;
  is_verified: boolean;
  created_at: string;
  distance_km?: number;
}

const formatAddress = (promo: any, fallback?: string | null) => {
  if (fallback) return fallback;
  const parts = [
    promo.plot_no,
    promo.building_name,
    promo.street_name,
    promo.area,
    promo.city,
    promo.state,
    promo.pincode,
  ]
    .map((v) => (typeof v === "string" ? v.trim() : v))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
};

const formatBusinessHours = (hours: any, fallback?: string | null) => {
  if (typeof fallback === "string" && fallback.trim().length > 0) return fallback;
  if (!hours) return null;
  if (typeof hours === "string") return hours;
  try {
    return JSON.stringify(hours);
  } catch {
    return null;
  }
};

const mapPromotionToDirectoryCard = (promo: any): DirectoryCard => {
  const card = promo.business_card ?? null;
  const category =
    Array.isArray(promo.category) && promo.category.length > 0
      ? String(promo.category[0])
      : card?.category ?? null;
  const location = formatAddress(promo, card?.location ?? null);

  return {
    id: `promo-${promo.id}`,
    _numericId: Number(promo.id),
    _source: 'promotion' as const,
    business_card_id: promo.business_card_id ? String(promo.business_card_id) : null,
    user_id: String(promo.user_id ?? card?.user_id ?? ""),
    full_name: promo.business_name ?? card?.full_name ?? "Business",
    phone: promo.phone ?? card?.phone ?? "",
    email: promo.email ?? card?.email ?? null,
    location,
    company_name: promo.business_name ?? card?.company_name ?? null,
    job_title: card?.job_title ?? null,
    logo_url: card?.logo_url ?? null,
    description: promo.description ?? card?.description ?? null,
    category,
    services: card?.services ?? [],
    offer: card?.offer ?? null,
    website: promo.website ?? card?.website ?? null,
    business_hours: formatBusinessHours(promo.business_hours, card?.business_hours ?? null),
    established_year: card?.established_year ?? null,
    instagram: card?.instagram ?? null,
    facebook: card?.facebook ?? null,
    linkedin: card?.linkedin ?? null,
    youtube: card?.youtube ?? null,
    twitter: card?.twitter ?? null,
    company_phone: promo.phone ?? card?.company_phone ?? null,
    company_email: promo.email ?? card?.company_email ?? null,
    company_address: location ?? card?.company_address ?? null,
    company_maps_link: card?.company_maps_link ?? null,
    maps_link: card?.maps_link ?? null,
    keywords: card?.keywords ?? null,
    gender: card?.gender ?? null,
    birthdate: card?.birthdate ? String(card.birthdate) : null,
    anniversary: card?.anniversary ? String(card.anniversary) : null,
    latitude: null,
    longitude: null,
    home_service: false,
    service_mode: card?.service_mode ?? null,
    whatsapp: promo.whatsapp ?? card?.whatsapp ?? null,
    telegram: promo.telegram ?? card?.telegram ?? null,
    is_verified: promo.status === "active" || promo.listing_type === "official" || card?.is_verified === true,
    created_at: promo.created_at ?? card?.created_at ?? new Date().toISOString(),
    distance_km: typeof promo.distance_km === "number" ? promo.distance_km : undefined,
  };
};

const mapCardToDirectoryCard = (card: any): DirectoryCard => ({
  id: `card-${card.id}`,
  _numericId: Number(card.id),
  _source: 'card' as const,
  business_card_id: String(card.id),
  user_id: String(card.user_id ?? ""),
  full_name: card.full_name,
  phone: card.phone ?? "",
  email: card.email ?? null,
  location: card.location ?? null,
  company_name: card.company_name ?? null,
  job_title: card.job_title ?? null,
  logo_url: card.logo_url ?? null,
  description: card.description ?? null,
  category: card.category ?? null,
  services: card.services ?? [],
  offer: card.offer ?? null,
  website: card.website ?? null,
  business_hours: card.business_hours ?? null,
  established_year: card.established_year ?? null,
  instagram: card.instagram ?? null,
  facebook: card.facebook ?? null,
  linkedin: card.linkedin ?? null,
  youtube: card.youtube ?? null,
  twitter: card.twitter ?? null,
  company_phone: card.company_phone ?? null,
  company_email: card.company_email ?? null,
  company_address: card.company_address ?? null,
  company_maps_link: card.company_maps_link ?? null,
  maps_link: card.maps_link ?? null,
  keywords: card.keywords ?? null,
  gender: card.gender ?? null,
  birthdate: card.birthdate ? String(card.birthdate) : null,
  anniversary: card.anniversary ? String(card.anniversary) : null,
  latitude: card.latitude ?? null,
  longitude: card.longitude ?? null,
  home_service: card.home_service ?? false,
  service_mode: card.service_mode ?? null,
  whatsapp: card.whatsapp ?? null,
  telegram: card.telegram ?? null,
  is_verified: card.is_verified ?? false,
  created_at: card.created_at ?? new Date().toISOString(),
});

export function useDirectoryCards(options?: { skip?: boolean }) {
  const result = useListPromotionsQuery(
    { page: 1, limit: 200 },
    { skip: options?.skip }
  );
  const data = useMemo(
    () => (result.data?.data || []).map(mapPromotionToDirectoryCard),
    [result.data?.data]
  );
  return {
    ...result,
    data,
  };
}

/** Parse a prefixed DirectoryCard ID: "promo-123" or "card-456" or bare "789" (legacy). */
function parseDirectoryId(id: string): { source: 'promotion' | 'card' | 'unknown'; numericId: number } {
  if (id.startsWith('promo-')) return { source: 'promotion', numericId: Number(id.slice(6)) };
  if (id.startsWith('card-')) return { source: 'card', numericId: Number(id.slice(5)) };
  return { source: 'unknown', numericId: Number(id) };
}

export function useDirectoryCard(id: string) {
  const { source, numericId } = parseDirectoryId(id);
  const isPromo = source === 'promotion';
  const isCard = source === 'card';
  // For 'unknown' (legacy bare ID), try promotion first then card (backwards compat)
  const isLegacy = source === 'unknown';

  const promoResult = useGetPromotionQuery(numericId, { skip: !numericId || isCard });
  const shouldSkipCard = !numericId || isPromo || (isLegacy && (!!promoResult.data || !promoResult.isError));
  const cardResult = useGetCardQuery(numericId, { skip: shouldSkipCard });

  const data = useMemo(() => {
    if (promoResult.data) return mapPromotionToDirectoryCard(promoResult.data);
    if (cardResult.data) return mapCardToDirectoryCard(cardResult.data);
    return undefined;
  }, [promoResult.data, cardResult.data]);

  return {
    isLoading: promoResult.isLoading || cardResult.isLoading,
    isFetching: promoResult.isFetching || cardResult.isFetching,
    isError: isCard ? cardResult.isError : isPromo ? promoResult.isError : (promoResult.isError && cardResult.isError),
    error: promoResult.error || cardResult.error,
    data,
  };
}

export function useDirectoryCardsByCategory(category: string | undefined) {
  const result = useListPromotionsQuery(
    { page: 1, limit: 200, category },
    { skip: !category }
  );
  const data = useMemo(
    () => (result.data?.data || []).map(mapPromotionToDirectoryCard),
    [result.data?.data]
  );
  return {
    ...result,
    data,
  };
}

export function useDirectoryFeed(options?: { pageSize?: number; category?: string; search?: string; skip?: boolean; lat?: number; lng?: number; radius?: number; city?: string; state?: string }) {
  const pageSize = options?.pageSize ?? 30;
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DirectoryCard[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const lastKeyRef = useRef<string>("");
  const refetchRef = useRef<(() => void) | null>(null);
  const useNearby = Boolean(options?.lat && options?.lng) || Boolean(options?.city || options?.state);

  const nearbyQuery = useListPromotionsNearbyQuery(
    {
      page,
      limit: pageSize,
      category: options?.category,
      search: options?.search,
      lat: options?.lat,
      lng: options?.lng,
      radius: options?.radius,
      city: options?.city,
      state: options?.state,
    },
    {
      skip: options?.skip ?? !useNearby,
      refetchOnMountOrArgChange: true,
    }
  );
  const normalQuery = useListPromotionsQuery(
    { page, limit: pageSize, category: options?.category, search: options?.search },
    {
      skip: options?.skip,
      refetchOnMountOrArgChange: true,
    }
  );

  // Also fetch approved+live business cards for the same category
  const cardsQuery = useListCardsQuery(
    { page, limit: pageSize, category: options?.category, search: options?.search },
    {
      skip: options?.skip,
      refetchOnMountOrArgChange: true,
    }
  );

  // If nearby returns no results but normal query has results, use normal query
  const shouldFallbackToNormal = useNearby &&
    nearbyQuery.data &&
    (nearbyQuery.data.data || []).length === 0 &&
    normalQuery.data &&
    (normalQuery.data.data || []).length > 0;

  const query = shouldFallbackToNormal ? normalQuery : (useNearby ? nearbyQuery : normalQuery);

  // Store refetch function in ref to avoid dependency issues
  refetchRef.current = query.refetch;

  useEffect(() => {
    const key = `${options?.category ?? ""}::${options?.search ?? ""}`;
    if (lastKeyRef.current !== key) {
      const isInitialMount = lastKeyRef.current === "";
      lastKeyRef.current = key;
      setPage(1);
      setItems([]);
      setHasMore(true);
      if (!isInitialMount && key && refetchRef.current) {
        refetchRef.current();
      }
    }
  }, [options?.category, options?.search]);

  useEffect(() => {
    const promoData = query.data?.data || [];
    const cardData = cardsQuery.data?.data || [];

    if (!query.data && !cardsQuery.data) {
      if (!query.isLoading && !query.isFetching && !cardsQuery.isLoading && !cardsQuery.isFetching) {
        setItems([]);
      }
      return;
    }

    // Map promotions
    const promoMapped = promoData.map(mapPromotionToDirectoryCard);

    // Map business cards, but skip any that already have a promotion (dedup by business_card_id)
    const promoCardIds = new Set(
      promoMapped
        .map((p) => p.business_card_id)
        .filter(Boolean)
    );
    const cardMapped = cardData
      .filter((c: any) => !promoCardIds.has(String(c.id)))
      .map(mapCardToDirectoryCard);

    const merged = [...promoMapped, ...cardMapped];
    const totalFetched = promoData.length + cardData.length;
    setHasMore(totalFetched >= pageSize);

    if (page === 1) {
      setItems(merged);
      return;
    }
    setItems((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      merged.forEach((c) => map.set(c.id, c));
      return Array.from(map.values());
    });
  }, [query.data, cardsQuery.data, page, pageSize, query.isLoading, query.isFetching, cardsQuery.isLoading, cardsQuery.isFetching]);

  const loadMore = () => {
    if (query.isFetching || cardsQuery.isFetching || !hasMore) return;
    setPage((p) => p + 1);
  };

  return {
    data: items,
    isLoading: (query.isLoading || cardsQuery.isLoading) && page === 1,
    isFetching: query.isFetching || cardsQuery.isFetching,
    hasMore,
    loadMore,
    error: query.error || cardsQuery.error,
    refetch: query.refetch,
  };
}
