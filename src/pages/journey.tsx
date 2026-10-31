import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth, useI18n } from "@/lib/auth";
import { repository } from "@/lib/data";
import { journeyStatusLabel } from "@/lib/labels";
import type { JourneyStatus } from "@/lib/types";
import { useBusiness, useOnboarding } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function JourneyPage() {
  const { refresh } = useAuth();
  const { language, tr } = useI18n();
  const business = useBusiness();
  const { openOnboarding } = useOnboarding();
  const steps = business ? repository.listJourney() : [];

  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [steps.length]);

  if (!business) {
    return (
      <div className="max-w-md">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">{tr("Your journey", "Leeto la hau")}</h1>
        <p className="mt-3 text-quiet">{tr("The path starts once Buddy knows the business.", "Leeto le qala hang ha Buddy e tseba khoebo.")}</p>
        <Button className="mt-6" onClick={openOnboarding}>
          {tr("Tell Buddy about your business", "Bolella Buddy ka khoebo ea hau")}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em] lg:text-[36px]">{tr("Your journey", "Leeto la hau")}</h1>
      <p className="mt-3 max-w-lg text-[15px] leading-6 text-quiet">
        {tr(
          "These are educational steps for your circumstances. They are not a compliance score, and they do not create a deadline.",
          "Tsena ke mehato ea thuto bakeng sa maemo a hau. Ha se lintlha tsa ho se latele molao, hape ha li etse letsatsi la ho qetela.",
        )}
      </p>
      <ol className="mt-10 border-l border-line">
        {steps.map((step) => {
          const title = language === "st" ? step.title_st : step.title_en;
          const body = language === "st" ? step.explanation_st : step.explanation_en;
          return (
            <li key={step.id} id={`step-${step.step_key}`} className="relative pb-10 pl-6">
              <span
                className={cn(
                  "absolute -left-[5px] top-1.5 size-2.5 rounded-full",
                  step.status === "completed" ? "bg-good" : step.status === "needs_assistance" ? "bg-warn" : step.status === "in_progress" ? "bg-lemon" : "border border-line bg-paper",
                )}
              />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[18px] font-semibold tracking-[-0.02em]">{title}</h2>
                <p className="text-[13px] text-quiet">{journeyStatusLabel(step.status, language)}</p>
              </div>
              <p className="mt-2 max-w-lg text-[15px] leading-6 text-quiet">{body}</p>
              {step.step_key === "registration" ? (
                <p className="mt-2 max-w-lg text-[13px] leading-5 text-quiet">
                  {tr(
                    "Whatever you told Buddy about registration is your note, not an RSL confirmation.",
                    "Seo u se boleletseng Buddy ka ngoliso ke polelo ea hau, eseng netefatso ea RSL.",
                  )}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <StepActions
                  stepKey={step.step_key}
                  status={step.status}
                  onRead={() => {
                    repository.setJourneyStatus(step.id, "completed");
                    refresh();
                  }}
                  onHelp={() => {
                    repository.setJourneyStatus(step.id, "needs_assistance");
                    refresh();
                  }}
                  onEdit={openOnboarding}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StepActions({
  stepKey,
  status,
  onRead,
  onHelp,
  onEdit,
}: {
  stepKey: string;
  status: JourneyStatus;
  onRead: () => void;
  onHelp: () => void;
  onEdit: () => void;
}) {
  const { tr } = useI18n();
  const navigate = useNavigate();
  const topic =
    stepKey === "registration"
      ? "registration"
      : stepKey === "records" || stepKey === "habit"
        ? "records"
        : stepKey === "filing"
          ? "filing"
          : stepKey === "payment"
            ? "payments"
            : "other";
  if (stepKey === "about" || stepKey === "update") {
    return (
      <Button variant="quiet" size="sm" onClick={onEdit}>
        {tr("Update your details", "Nchafatsa lintlha tsa hau")}
      </Button>
    );
  }
  if (stepKey === "habit") {
    return (
      <>
        <Button asChild size="sm">
          <Link to="/records?new=sale">{tr("Record today's sales", "Rekota thekiso ea kajeno")}</Link>
        </Button>
        {status !== "completed" ? (
          <Button variant="quiet" size="sm" onClick={onRead}>
            {tr("I'm keeping records regularly", "Ke ntse ke boloka lirekoto khafetsa")}
          </Button>
        ) : null}
      </>
    );
  }
  return (
    <>
      {status !== "completed" ? (
        <Button size="sm" onClick={onRead}>
          {tr("I have read this", "Ke balile sena")}
        </Button>
      ) : null}
      <Button
        variant="quiet"
        size="sm"
        onClick={() => {
          onHelp();
          navigate(`/help?topic=${topic}`);
        }}
      >
        {tr("Request assistance", "Kopa thuso")}
      </Button>
    </>
  );
}
