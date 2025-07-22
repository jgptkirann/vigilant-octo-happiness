import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

const BookingPage: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();
  
  // For now, redirect to facility details where booking can be implemented
  return <Navigate to={`/facilities/${facilityId}`} replace />;
};

export default BookingPage;