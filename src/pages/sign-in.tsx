import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth, useI18n } from "@/lib/auth";
import { DEMO_OFFICER_EMAIL, DEMO_OWNER_EMAIL, DEMO_PASSWORD } from "@/lib/data/local-repository";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Wordmark } from "@/components/mark";

export function SignInPage() {
  const { user, signIn, signUp, language, setLanguage } = useAuth();
  const { tr } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "sign-in">("create");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to={user.role === "officer" ? "/officer" : "/"} replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const profile =
        mode === "create"
          ? await signUp({ firstName, email, password })
          : await signIn({ email, password });
      navigate(profile.role === "officer" ? "/officer" : "/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr("Something went wrong.", "Ho na le bothata."));
    } finally {
      setPending(false);
    }
  }

  async function demo(role: "owner" | "officer") {
    setError("");
    setPending(true);
    try {
      const profile = await signIn({
        email: role === "owner" ? DEMO_OWNER_EMAIL : DEMO_OFFICER_EMAIL,
        password: DEMO_PASSWORD,
      });
      navigate(profile.role === "officer" ? "/officer" : "/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr("The demo account did not open.", "Ak'haonte ea demo ha ea buleha."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper px-5 py-8 md:px-8 lg:px-14 lg:py-16">
      <div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="max-w-xl">
          <Wordmark />
          <h1 className="mt-8 text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] lg:text-[40px]">
            {tr("A calm way to keep your business clear.", "Tsela e khutsitseng ea ho boloka khoebo ea hau e hlakile.")}
          </h1>
          <p className="mt-4 max-w-md text-[16px] leading-7 text-quiet">
            {tr(
              "Records, a next step, and a person to ask — for small businesses in Lesotho.",
              "Lirekoto, mohato o latelang, le motho eo u ka mo botsang — bakeng sa likhoebo tse nyane Lesotho.",
            )}
          </p>
          <div className="mt-8 max-w-sm rounded-[24px] bg-lemon px-5 py-5">
            <p className="text-[15px] font-semibold leading-6">
              {tr(
                "Educational guidance. Not an RSL filing desk.",
                "Thuto feela. Ha se sebaka sa ho kenya lipego tsa RSL.",
              )}
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-line bg-white p-5 sm:p-8">
          <div className="mb-6 flex gap-2">
            <Button variant={language === "en" ? "primary" : "quiet"} size="sm" onClick={() => setLanguage("en")}>
              English
            </Button>
            <Button variant={language === "st" ? "primary" : "quiet"} size="sm" onClick={() => setLanguage("st")}>
              Sesotho
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-paper p-1">
            <button
              type="button"
              data-testid="auth-mode-create"
              className={`h-11 rounded-[12px] text-[14px] font-semibold ${mode === "create" ? "bg-white" : "text-quiet"}`}
              onClick={() => setMode("create")}
            >
              {tr("Create account", "Etsa ak'haonte")}
            </button>
            <button
              type="button"
              data-testid="auth-mode-sign-in"
              className={`h-11 rounded-[12px] text-[14px] font-semibold ${mode === "sign-in" ? "bg-white" : "text-quiet"}`}
              onClick={() => setMode("sign-in")}
            >
              {tr("Sign in", "Kena")}
            </button>
          </div>
          <form className="mt-6 grid gap-5" onSubmit={submit}>
            {mode === "create" ? (
              <Field label={tr("Your name", "Lebitso la hau")}>
                <Input data-testid="auth-first-name" value={firstName} autoComplete="given-name" onChange={(event) => setFirstName(event.target.value)} />
              </Field>
            ) : null}
            <Field label={tr("Email", "Imeile")}>
              <Input data-testid="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label={tr("Password", "Phasewete")} hint={tr("At least 8 characters.", "Bonyane litlhaku tse 8.")}>
              <Input
                data-testid="auth-password"
                type="password"
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {error ? (
              <p role="alert" className="text-[14px] text-warn">
                {error}
              </p>
            ) : null}
            <Button type="submit" data-testid="auth-submit" disabled={pending}>
              {mode === "create" ? tr("Create account", "Etsa ak'haonte") : tr("Sign in", "Kena")}
            </Button>
          </form>
          <div className="mt-8 border-t border-line pt-5">
            <p className="text-[13px] text-quiet">{tr("Demo on this device", "Demo sesebelisoa sena")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button variant="quiet" size="sm" data-testid="demo-owner" disabled={pending} onClick={() => void demo("owner")}>
                {tr("Owner", "Mong'a khoebo")}
              </Button>
              <Button variant="quiet" size="sm" data-testid="demo-officer" disabled={pending} onClick={() => void demo("officer")}>
                {tr("Officer", "Ofisiri")}
              </Button>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-quiet">
              {DEMO_OWNER_EMAIL} · {DEMO_OFFICER_EMAIL} · {DEMO_PASSWORD}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
