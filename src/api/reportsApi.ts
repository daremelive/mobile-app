import { createApi } from '@reduxjs/toolkit/query/react';

import { API_BASE_URL } from '../config/env';
import { createAuthenticatedBaseQuery } from './authenticatedBaseQuery';

export interface ReportReason {
  id: number;
  name: string;
  description: string;
}

interface PaginatedReasons {
  results: ReportReason[];
}

interface CreateUserReportRequest {
  reported_user_id: number;
  reason_id: number;
  custom_reason?: string;
}

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: createAuthenticatedBaseQuery(`${API_BASE_URL}reports/`),
  endpoints: (builder) => ({
    getReportReasons: builder.query<ReportReason[], void>({
      query: () => 'reasons/',
      transformResponse: (response: PaginatedReasons | ReportReason[]) => (
        Array.isArray(response) ? response : response.results ?? []
      ),
    }),
    createUserReport: builder.mutation<unknown, CreateUserReportRequest>({
      query: (body) => ({
        url: 'users/create/',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetReportReasonsQuery,
  useCreateUserReportMutation,
} = reportsApi;
