import { baseApi } from './baseApi';

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
    getUserById: builder.query<any, number>({
      query: (id) => `/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'User', id }],
    }),
  }),
});

export const { useGetProfileQuery, useUpdateProfileMutation, useGetUserByIdQuery } = usersApi;
