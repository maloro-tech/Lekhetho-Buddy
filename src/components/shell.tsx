import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Home, LifeBuoy, LogOut, MessageCircle, Notebook, Route } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth, useI18n } from "@/lib/auth";
import { repository } from "@/lib/data";
import type { BusinessProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Onboarding } from "./onboarding";
import { Wordmark } from "./mark";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";

const OnboardingContext = createContext<{ openOnboarding: () => void }>({ openOnboarding: () => undefined });

export function useOnboarding() {
  return useContext(OnboardingContext);
}

const ownerLinks = [
  { to: "/", label: ["Home", "Lapeng"], icon: Home, end: true },
  { to: "/records", label: ["Records", "Lirekoto"], icon: Notebook, end: false },
  { to: "/buddy", label: ["Buddy", "Buddy"], icon: MessageCircle, end: false },
  { to: "/journey", label: ["Journey", "Leeto"], icon: Route, end: false },
] as const;

export function OwnerShell() {
  const { user, revision, signOut, refresh, setLanguage, language } = useAuth();
  const { tr } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const business = useMemo(() => {
    try {
      return repository.getBusiness();
    } catch {
      return null;
    }
  }, [revision]);

  useEffect(() => {
    if (user && !business && !dismissed) setOpen(true);
  }, [user, business, dismissed]);

  return (
    <OnboardingContext.Provider value={{ openOnboarding: () => setOpen(true) }}>
      <div className="min-h-dvh bg-paper text-ink">
        <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
          <NavLink to="/" className="px-2" aria-label="Lekhetho Buddy">
            <Wordmark />
          </NavLink>
          <nav className="mt-10 grid gap-1" aria-label={tr("Primary", "Tse ka sehloohong")}>
            {ownerLinks.map((link) => (
              <SideLink key={link.to} to={link.to} end={link.end} icon={link.icon} label={tr(link.label[0], link.label[1])} />
            ))}
          </nav>
          <div className="mt-auto grid gap-2">
            <SideLink to="/help" end={false} icon={LifeBuoy} label={tr("Get help", "Kopa thuso")} />
            <button
              type="button"
              data-testid="open-account-desktop"
              className="flex h-11 items-center rounded-[14px] px-3 text-left text-[15px] font-semibold"
              onClick={() => setAccountOpen(true)}
            >
              {user?.first_name}
            </button>
            <p className="px-3 text-[12px] leading-5 text-quiet">
              {tr("Educational guidance. Not an official RSL service.", "Thuto feela. Ha se tšebeletso ea semmuso ea RSL.")}
            </p>
          </div>
        </aside>

        <div className="lg:pl-60">
          <header className="no-print fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-5 backdrop-blur lg:hidden">
            <NavLink to="/" aria-label="Lekhetho Buddy">
              <Wordmark compact />
            </NavLink>
            <button
              type="button"
              data-testid="open-account"
              className="h-11 rounded-full px-3 text-[14px] font-semibold"
              onClick={() => setAccountOpen(true)}
            >
              {user?.first_name}
            </button>
          </header>
          <div className="mx-auto w-full max-w-[1120px] px-5 pb-28 pt-20 md:px-8 lg:px-12 lg:pb-16 lg:pt-10">
            <Outlet context={{ business }} />
          </div>
        </div>

        <nav
          className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
          aria-label={tr("Primary", "Tse ka sehloohong")}
        >
          <ul className="grid grid-cols-4">
            {ownerLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[12px] font-semibold", isActive ? "text-ink" : "text-quiet")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn("h-1 w-4 rounded-full", isActive ? "bg-lemon" : "bg-transparent")} />
                      <link.icon size={20} strokeWidth={1.75} />
                      {tr(link.label[0], link.label[1])}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Onboarding
        open={open}
        business={business}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next && !repository.getBusiness()) setDismissed(true);
        }}
        onSaved={refresh}
      />
      <Modal
        open={accountOpen}
        onOpenChange={setAccountOpen}
        label={tr("Your account", "Ak'haonte ea hau")}
        className="left-1/2 top-1/2 max-h-[min(640px,calc(100dvh-1.5rem))] w-[min(420px,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-line p-6"
      >
        <h2 className="text-[24px] font-semibold tracking-[-0.03em]">{user?.first_name}</h2>
        <p className="mt-1 break-all text-[14px] text-quiet">{user?.email}</p>
        <div className="mt-6 flex gap-2">
          <Button variant={language === "en" ? "primary" : "quiet"} size="sm" onClick={() => setLanguage("en")}>
            English
          </Button>
          <Button variant={language === "st" ? "primary" : "quiet"} size="sm" onClick={() => setLanguage("st")}>
            Sesotho
          </Button>
        </div>
        <div className="mt-6 grid gap-2">
          <Button variant="quiet" onClick={() => { setAccountOpen(false); navigate("/help"); }}>
            {tr("Get help", "Kopa thuso")}
          </Button>
          <Button variant="quiet" onClick={() => { setAccountOpen(false); setOpen(true); }}>
            {business ? tr("Edit business", "Fetola khoebo") : tr("Tell Buddy about your business", "Bolella Buddy ka khoebo ea hau")}
          </Button>
          <Button
            variant="ghost"
            data-testid="sign-out"
            onClick={() => {
              signOut();
              navigate("/sign-in");
            }}
          >
            <LogOut size={16} />
            {tr("Sign out", "Tsoa")}
          </Button>
        </div>
        <p className="mt-6 text-[13px] leading-5 text-quiet">
          {tr(
            "Lekhetho Buddy stores what you type on this device for the prototype. It does not register a business, file a return, collect tax, or deliver a case into RSL's systems.",
            "Lekhetho Buddy e boloka seo u se ngolang sesebelisoa sena bakeng sa prototaipe. Ha e ngodise khoebo, ha e kenye pego, ha e bokelle lekhetho, hape ha e ise nyeoe litsamaisong tsa RSL.",
          )}
        </p>
      </Modal>
    </OnboardingContext.Provider>
  );
}

function SideLink({
  to,
  end,
  icon: Icon,
  label,
}: {
  to: string;
  end: boolean;
  icon: typeof Home;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn("flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[15px] font-semibold", isActive ? "bg-white text-ink" : "text-quiet hover:text-ink")
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn("h-5 w-1 rounded-full", isActive ? "bg-lemon" : "bg-transparent")} />
          <Icon size={18} strokeWidth={1.75} />
          {label}
        </>
      )}
    </NavLink>
  );
}

export function useBusiness(): BusinessProfile | null {
  const { revision } = useAuth();
  return useMemo(() => {
    try {
      return repository.getBusiness();
    } catch {
      return null;
    }
  }, [revision]);
}

export function OfficerShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="no-print border-b border-line">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-4 md:px-8 lg:px-12">
          <div className="min-w-0">
            <Wordmark />
            <p className="mt-1 text-[13px] text-quiet">Officer desk</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[14px] text-quiet sm:inline">{user?.first_name}</span>
            <Button
              variant="quiet"
              size="sm"
              data-testid="sign-out"
              onClick={() => {
                signOut();
                navigate("/sign-in");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1120px] px-5 py-8 md:px-8 lg:px-12 lg:py-10">
        <Outlet />
      </div>
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-5">
      <div className="max-w-md">
        <Wordmark />
        <h1 className="mt-8 text-[32px] font-semibold leading-[1.15] tracking-[-0.03em]">This desk is for RSL officers</h1>
        <p className="mt-4 text-[15px] leading-6 text-quiet">
          Your account does not have the officer role, so assistance requests and other businesses stay closed.
        </p>
        <NavLink to="/" className="mt-8 inline-flex h-12 items-center rounded-[14px] bg-lemon px-5 font-semibold">
          Back home
        </NavLink>
      </div>
    </div>
  );
}
