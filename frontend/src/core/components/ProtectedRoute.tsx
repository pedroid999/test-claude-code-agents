import { Navigate } from 'react-router-dom';

import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthContext();

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated]);



  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
<ScrollArea className="h-[calc(100vh)]">  
      {children}
</ScrollArea>
  );
};
