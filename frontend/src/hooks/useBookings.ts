import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsAPI } from '../services/api.ts';
import { Booking, BookingForm } from '../types';
import { getErrorMessage } from '../utils/helpers.ts';
import toast from 'react-hot-toast';

// Query keys
export const bookingsKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingsKeys.all, 'list'] as const,
  list: (params?: { page?: number; limit?: number; status?: string }) => 
    [...bookingsKeys.lists(), params] as const,
  details: () => [...bookingsKeys.all, 'detail'] as const,
  detail: (id: number) => [...bookingsKeys.details(), id] as const,
};

// Get user bookings
export const useBookings = (params?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: bookingsKeys.list(params),
    queryFn: () => bookingsAPI.getBookings(params),
    keepPreviousData: true,
  });
};

// Get single booking
export const useBooking = (id: number) => {
  return useQuery({
    queryKey: bookingsKeys.detail(id),
    queryFn: () => bookingsAPI.getBooking(id),
    enabled: !!id,
  });
};

// Create booking mutation
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BookingForm) => bookingsAPI.createBooking(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: bookingsKeys.lists() });
      // Also invalidate facility slots to show updated availability
      queryClient.invalidateQueries({ queryKey: ['facilities', 'slots'] });
      toast.success('Booking created successfully!');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });
};

// Update booking mutation
export const useUpdateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BookingForm> }) =>
      bookingsAPI.updateBooking(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bookingsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'slots'] });
      toast.success('Booking updated successfully!');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });
};

// Cancel booking mutation
export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bookingsAPI.cancelBooking(id),
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: bookingsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['facilities', 'slots'] });
      toast.success('Booking cancelled successfully!');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });
};