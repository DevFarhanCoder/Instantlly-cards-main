import { baseApi } from './baseApi';

export interface AppUser {
  id: number;
  name: string | null;
  phone: string;
  profile_picture: string | null;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<any, void>({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<
      any,
      Partial<{ name: string; about: string; gender: string; profile_picture: string; phone: string }>
    >({
      query: (body) => ({ url: '/users/profile', method: 'PUT', body }),
      invalidatesTags: ['User', 'Auth'],
    }),
    changePassword: builder.mutation<any, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),
    deleteAccount: builder.mutation<any, void>({
      query: () => ({ url: '/users/me', method: 'DELETE' }),
      invalidatesTags: ['User', 'Auth'],
    }),
    getUserById: builder.query<any, number>({
      query: (id) => `/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'User', id }],
    }),
    matchContacts: builder.mutation<AppUser[], { phones: string[] }>({
      query: (body) => ({ url: '/users/match-contacts', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useGetUserByIdQuery,
  useMatchContactsMutation,
} = usersApi;
