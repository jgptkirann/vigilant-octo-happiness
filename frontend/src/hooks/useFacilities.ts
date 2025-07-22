import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facilitiesAPI } from '../services/api';
import { Facility, FacilityDetails, SearchFilters, SlotResponse, FacilityForm } from '../types';
import { getErrorMessage } from '../utils/helpers';
import toast from 'react-hot-toast';

// Query keys
export const facilitiesKeys = {
  all: ['facilities'] as const,
  lists: () => [...facilitiesKeys.all, 'list'] as const,
  list: (filters?: SearchFilters) => [...facilitiesKeys.lists(), filters] as const,
  details: () => [...facilitiesKeys.all, 'detail'] as const,
  detail: (id: number) => [...facilitiesKeys.details(), id] as const,
  slots: () => [...facilitiesKeys.all, 'slots'] as const,
  slot: (id: number, date: string) => [...facilitiesKeys.slots(), id, date] as const,
};

// Get facilities with filters
export const useFacilities = (filters?: SearchFilters & { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: facilitiesKeys.list(filters),
    queryFn: () => facilitiesAPI.getFacilities(filters),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single facility
export const useFacility = (id: number) => {
  return useQuery({
    queryKey: facilitiesKeys.detail(id),
    queryFn: () => facilitiesAPI.getFacility(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get facility time slots
export const useFacilitySlots = (id: number, date: string) => {
  return useQuery({
    queryKey: facilitiesKeys.slot(id, date),
    queryFn: () => facilitiesAPI.getFacilitySlots(id, date),
    enabled: !!id && !!date,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Create facility mutation
export const useCreateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FacilityForm) => facilitiesAPI.createFacility(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: facilitiesKeys.lists() });
      toast.success('Facility created successfully!');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });
};

// Update facility mutation
export const useUpdateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FacilityForm> }) =>
      facilitiesAPI.updateFacility(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: facilitiesKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: facilitiesKeys.lists() });
      toast.success('Facility updated successfully!');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });
};

// Delete facility mutation
export const useDeleteFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => facilitiesAPI.deleteFacility(id),
    onSuccess: (response, id) => {
      queryClient.removeQueries({ queryKey: facilitiesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: facilitiesKeys.lists() });
      toast.success('Facility deleted successfully!');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });
};