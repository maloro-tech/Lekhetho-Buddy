import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "@/lib/auth";
import { AccessDenied, OfficerShell, OwnerShell } from "@/components/shell";
import { SignInPage } from "@/pages/sign-in";
import { HomePage } from "@/pages/home";
import { RecordsPage } from "@/pages/records";
import { BuddyPage } from "@/pages/buddy";
import { JourneyPage } from "@/pages/journey";
import { HelpPage } from "@/pages/help";
import { OfficerBusinessPage, OfficerHome, OfficerRequestPage } from "@/pages/officer";

function OwnerGuard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/sign-in" replace />;
  if (user.role === "officer") return <Navigate to="/officer" replace />;
  return <OwnerShell />;
}

function OfficerGuard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/sign-in" replace />;
  if (user.role !== "officer") return <AccessDenied />;
  return <OfficerShell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<OwnerGuard />}>
        <Route index element={<HomePage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="buddy" element={<BuddyPage />} />
        <Route path="journey" element={<JourneyPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
      <Route path="/officer" element={<OfficerGuard />}>
        <Route index element={<OfficerHome />} />
        <Route path="requests/:id" element={<OfficerRequestPage />} />
        <Route path="businesses/:id" element={<OfficerBusinessPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
