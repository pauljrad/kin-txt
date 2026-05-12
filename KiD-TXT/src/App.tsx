import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { KidAuthProvider, useKidAuth } from '@/hooks/useKidAuth';
import KidLogin from '@/pages/KidLogin';
import KidLibrary from '@/pages/KidLibrary';
import KidsProfile from '@/pages/KidsProfile';
import KidReader from '@/pages/KidReader';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Toaster } from 'sonner';
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { kid } = useKidAuth();
  if (!kid) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <KidAuthProvider>
        <Routes>
          <Route path="/login" element={<KidLogin />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <KidLibrary />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <KidsProfile />
            </ProtectedRoute>
          } />

          <Route path="/read/:bookId" element={
            <ProtectedRoute>
              <KidReader />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </KidAuthProvider>
    </BrowserRouter>
  );
}
