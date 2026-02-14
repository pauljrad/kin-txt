import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { TextSizeProvider } from "@/hooks/useTextSize";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PWAPrompt } from "@/components/PWAPrompt";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

import { useState, useEffect } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { AnimatePresence } from "framer-motion";

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
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
              <PWAPrompt />
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
