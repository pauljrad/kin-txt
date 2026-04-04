import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { TextSizeProvider } from "@/hooks/useTextSize";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import CinematicPromo from "./pages/CinematicPromo";
import CinematicTargetPromo from "./pages/CinematicTargetPromo";
import Pricing from "./pages/Pricing";
import Register from "./pages/Register";
import { useState, useEffect } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { AnimatePresence } from "framer-motion";

const queryClient = new QueryClient();

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    const handlePageShow = (event: any) => {
      if (event.persisted) {
        setShowSplash(true);
        setTimeout(() => setShowSplash(false), 3000);
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pageshow', handlePageShow);
    };

  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/tiktok" element={<CinematicPromo />} />
        <Route path="/target" element={<CinematicTargetPromo />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TextSizeProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </TextSizeProvider>
    </ThemeProvider>
  </QueryClientProvider>
);


export default App;
