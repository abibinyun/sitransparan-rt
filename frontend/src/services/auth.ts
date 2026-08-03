import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { User } from '../types/auth';

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const useLoginMutation = () => {
  return useMutation<LoginResponse, Error, LoginPayload>({
    mutationFn: async (payload) => {
      const res = await api.post<LoginResponse>('/auth/login', payload);
      return res.data;
    },
  });
};

export const useProfileQuery = () => {
  return useQuery<User, Error>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });
};
