import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MealManagement from "./pages/MealManagement";
import Members from "./pages/Members";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import SuperAdmin from "./pages/SuperAdmin";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, role, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && role && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/meals" element={<ProtectedRoute><MealManagement /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute roles={['super_admin']}><SuperAdmin /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute roles={['admin']}><Subscription /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute roles={['admin', 'super_admin']}><Members /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute roles={['admin', 'manager', 'super_admin']}><Payments /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute roles={['admin', 'manager', 'super_admin']}><Expenses /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={['admin', 'manager', 'super_admin']}><Reports /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
