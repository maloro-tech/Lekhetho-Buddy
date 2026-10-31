import { Link } from "react-router";
import { useAuth, useI18n } from "@/lib/auth";
import { repository } from "@/lib/data";
import { journeyStatusLabel } from "@/lib/labels";
import { snapshot } from "@/lib/totals";
import { formatMaloti } from "@/lib/format";
import { useBusiness, useOnboarding } from "@/components/shell";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const { user } = useAuth();
  const { language, tr } = useI18n();
  const business = useBusiness();
  const { openOnboarding } = useOnboarding();
  const sales = business ? repository.listSales() : [];
  const expenses = business ? repository.listExpenses() : [];
  const totals = snapshot(sales, expenses);
  const steps = business ? repository.listJourney() : [];
  const next = steps.find((step) => step.status !== "completed") ?? null;
  const nextTitle = next ? (language === "st" ? next.title_st : next.title_en) : "";
  const nextBody = next ? (language === "st" ? next.explanation_st : next.explanation_en) : "";

  return (
    <div>
      <header className="max-w-xl">
        <h1 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] lg:text-[36px]">
          {tr("Dumela", "Dumela")}, {user?.first_name}
        </h1>
        <p className="mt-3 text-[16px] text-quiet">{tr("Let's keep your business on track.", "Ha re bolokeng khoebo ea hau e ntse e tsamaya hantle.")}</p>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-x-16">
        <section className="min-w-0">
          {business ? (
            <div className="rounded-[24px] bg-lemon px-6 py-7 sm:px-8">
              <p className="text-[13px] font-semibold">{tr("Your business", "Khoebo ea hau")}</p>
              <h2 data-testid="home-business-name" className="mt-2 max-w-md text-[28px] font-semibold leading-tight tracking-[-0.03em] [overflow-wrap:anywhere]">
                {business.name}
              </h2>
              <p className="mt-3 max-w-sm text-[15px] leading-6">
                {tr("Add what came in and what went out today.", "Kenya chelete e kileng ea kena le e kileng ea tsoa kajeno.")}
              </p>
              <Button asChild variant="dark" className="mt-6">
                <Link to="/records?new=sale">{tr("Record today's sales", "Rekota thekiso ea kajeno")}</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-[24px] bg-lemon px-6 py-7 sm:px-8">
              <h2 className="max-w-md text-[28px] font-semibold leading-tight tracking-[-0.03em]">
                {tr("Tell Buddy about your business", "Bolella Buddy ka khoebo ea hau")}
              </h2>
              <p className="mt-3 max-w-sm text-[15px] leading-6">
                {tr("Home will show the business name and your next step after this.", "Lapeng le tla bontša lebitso la khoebo le mohato o latelang ka mor'a sena.")}
              </p>
              <Button variant="dark" className="mt-6" onClick={openOnboarding}>
                {tr("Start", "Qala")}
              </Button>
            </div>
          )}

          {business ? (
            <div className="mt-8 divide-y divide-line rounded-[20px] border border-line bg-white sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Stat testId="month-sales" label={tr("Sales this month", "Thekiso kgweding ena")} value={formatMaloti(totals.salesMonth)} />
              <Stat testId="month-expenses" label={tr("Expenses this month", "Litšenyehelo kgweding ena")} value={formatMaloti(totals.expensesMonth)} />
              <Stat testId="month-days" label={tr("Days with records", "Matsatsi a nang le lirekoto")} value={String(totals.daysThisMonth)} />
            </div>
          ) : null}
        </section>

        {business && next ? (
          <aside className="mt-10 min-w-0 border-t border-line pt-8 lg:mt-0 lg:border-0 lg:pt-0">
            <p className="text-[13px] font-semibold text-quiet">{tr("Next step", "Mohato o latelang")}</p>
            <h2 data-testid="home-next-step" className="mt-2 text-[22px] font-semibold leading-snug tracking-[-0.03em]">
              {nextTitle}
            </h2>
            <p className="mt-3 text-[15px] leading-6 text-quiet">{nextBody}</p>
            <p className="mt-3 text-[13px] text-quiet">{journeyStatusLabel(next.status, language)}</p>
            {next.step_key === "registration" && business.registered === "yes" ? null : next.step_key === "registration" ? (
              <p className="mt-3 text-[13px] leading-5 text-quiet">
                {tr(
                  "This is the answer you saved. It is not an official confirmation.",
                  "Ena ke karabo eo u e bolokileng. Ha se netefatso ea semmuso.",
                )}
              </p>
            ) : null}
            <div className="mt-6">
              {next.status === "needs_assistance" ? (
                <Button asChild>
                  <Link to={`/help?topic=${topicFor(next.step_key)}`}>{tr("Request help", "Kopa thuso")}</Link>
                </Button>
              ) : next.step_key === "habit" ? (
                <Button asChild>
                  <Link to="/records?new=sale">{tr("Record today's sales", "Rekota thekiso ea kajeno")}</Link>
                </Button>
              ) : next.step_key === "about" || next.step_key === "update" ? (
                <Button onClick={openOnboarding}>{tr("Update your details", "Nchafatsa lintlha tsa hau")}</Button>
              ) : (
                <Button asChild>
                  <Link to={`/journey#step-${next.step_key}`}>{tr("Review this step", "Sheba mohato ona")}</Link>
                </Button>
              )}
            </div>
          </aside>
        ) : null}

        {business ? (
          <section className="mt-12 min-w-0 max-w-xl lg:col-start-1">
            <p className="text-[18px] font-semibold tracking-[-0.02em]">
              {tr("Have a question about your business or tax?", "Na u na le potso ka khoebo ea hau kapa lekhetho?")}
            </p>
            <Button asChild variant="quiet" className="mt-4">
              <Link to="/buddy">{tr("Ask Lekhetho Buddy", "Botsa Lekhetho Buddy")}</Link>
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[13px] text-quiet">{label}</p>
      <p data-testid={testId} className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">
        {value}
      </p>
    </div>
  );
}

function topicFor(stepKey: string) {
  if (stepKey === "registration") return "registration";
  if (stepKey === "records" || stepKey === "habit") return "records";
  if (stepKey === "filing") return "filing";
  if (stepKey === "payment") return "payments";
  return "understanding";
}
