import { baseApi } from './baseApi';

export type MobileCategorySummary = {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
  child_count: number;
};

export type MobileSubcategoriesResponse = {
  categoryId: number;
  categoryName: string;
  subcategories: string[];
};

export type MobileSubcategoriesMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  search: string | null;
  source: 'nodes' | 'legacy';
};

export type CategoryTreeNode = {
  id: number;
  name: string;
  icon: string | null;
  level: number;
  sort_order: number;
  is_active: boolean;
  children: CategoryTreeNode[];
};

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMobileCategories: builder.query<MobileCategorySummary[], { fresh?: boolean } | void>({
      query: (args) => (args?.fresh ? '/categories/mobile?fresh=1' : '/categories/mobile'),
      transformResponse: (response: { data: MobileCategorySummary[] }) => response.data,
      providesTags: ['Category'],
    }),
    getMobileSubcategories: builder.query<
      { data: MobileSubcategoriesResponse; meta: MobileSubcategoriesMeta },
      { id: number; page?: number; limit?: number; search?: string }
    >({
      query: ({ id, page = 1, limit = 50, search }) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (search) params.set('search', search);
        return `/categories/mobile/${id}/subcategories?${params.toString()}`;
      },
      providesTags: (_r, _e, { id }) => [{ type: 'Category', id }],
    }),
    getCategoryTree: builder.query<CategoryTreeNode[], void>({
      query: () => '/categories/tree',
      transformResponse: (response: { data: CategoryTreeNode[] }) => response.data,
      providesTags: ['Category'],
    }),
    listCategories: builder.query<any[], void>({
      query: () => '/categories',
      transformResponse: (response: { data: any[] }) => response.data,
      providesTags: ['Category'],
    }),
    getCategoryById: builder.query<any, number>({
      query: (id) => `/categories/${id}`,
      transformResponse: (response: { data: any }) => response.data,
      providesTags: (_r, _e, id) => [{ type: 'Category', id }],
    }),
    getCategoryCards: builder.query<{ data: any[]; page: number }, { id: number; page?: number }>({
      query: ({ id, page = 1 }) => `/categories/${id}/cards?page=${page}`,
      providesTags: (_r, _e, { id }) => [{ type: 'Category', id }],
    }),
  }),
});

export const {
  useListMobileCategoriesQuery,
  useGetMobileSubcategoriesQuery,
  useGetCategoryTreeQuery,
  useListCategoriesQuery,
  useGetCategoryByIdQuery,
  useGetCategoryCardsQuery,
} = categoriesApi;
