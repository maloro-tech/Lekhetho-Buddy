import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Link } from "react-router";
import { askBuddy } from "@/lib/buddy-client";
import { useAuth, useI18n } from "@/lib/auth";
import { repository } from "@/lib/data";
import { monthKey } from "@/lib/dates";
import { kindLabel } from "@/lib/labels";
import { daysWithRecords, sumMaloti } from "@/lib/totals";
import type { BuddyPayload, ChatMessage } from "@/lib/types";
import { useBusiness, useOnboarding } from "@/components/shell";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";

const STARTERS: Array<[string, string]> = [
  ["Do I need to register my business?", "Na ke tlameha ho ngolisa khoebo?"],
  ["What records should I keep?", "Ke lirekoto life tseo ke lokelang ho li boloka?"],
  ["How do I understand my tax obligations?", "Ke utloisisa joang boikarabello ba lekhetho?"],
  ["Can you explain this in Sesotho?", "A ka hlalosa see ka Sesotho?"],
  ["What should I do next?", "Ke etse eng hona joale?"],
];

export function BuddyPage() {
  const { refresh, revision } = useAuth();
  const { language, tr } = useI18n();
  const business = useBusiness();
  const { openOnboarding } = useOnboarding();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const messages = business ? repository.listMessages() : [];
  void revision;

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length, pending]);

  if (!business) {
    return (
      <div className="max-w-md">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Lekhetho Buddy</h1>
        <p className="mt-3 text-quiet">{tr("Save a business profile first, then ask a question.", "Boloka profil ea khoebo pele, ebe u botsa potso.")}</p>
        <Button className="mt-6" onClick={openOnboarding}>
          {tr("Tell Buddy about your business", "Bolella Buddy ka khoebo ea hau")}
        </Button>
      </div>
    );
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending || !business) return;
    setDraft("");
    setPending(true);
    repository.addMessage({ role: "user", content: message, payload: null });
    refresh();
    const month = monthKey();
    const sales = repository.listSales().filter((entry) => entry.entry_date.startsWith(month));
    const expenses = repository.listExpenses().filter((entry) => entry.entry_date.startsWith(month));
    const next = repository.listJourney().find((step) => step.status !== "completed");
    const payload = await askBuddy({
      message,
      language,
      business: {
        name: business.name,
        kind: kindLabel(business.kind, business.kind_other, "en"),
        location: business.location,
        activity_type: business.activity_type,
        registered: business.registered,
        has_tin: business.has_tin,
        record_method: business.record_method,
      },
      summary: {
        sales_this_month: sumMaloti(sales.map((entry) => entry.amount)),
        expenses_this_month: sumMaloti(expenses.map((entry) => entry.amount)),
        days_with_records: daysWithRecords(
          [...sales.map((entry) => entry.entry_date), ...expenses.map((entry) => entry.entry_date)],
          { start: `${month}-01`, end: `${month}-31` },
        ),
      },
      journey_next: next ? (language === "st" ? next.title_st : next.title_en) : null,
    });
    repository.addMessage({ role: "assistant", content: payload.answer, payload });
    refresh();
    setPending(false);
  }

  return (
    <div className="flex h-[calc(100dvh-12rem)] flex-col lg:h-[calc(100dvh-6.5rem)]">
      <header className="flex items-center gap-3 pb-4">
        <Mark />
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em]">Lekhetho Buddy</h1>
          <p className="text-[13px] text-quiet">{tr("General education. Not an official tax decision.", "Thuto e akaretsang. Eseng qeto ea semmuso ea lekhetho.")}</p>
        </div>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="max-w-md pt-4">
            <p className="text-[16px] leading-7">
              {tr(
                "Dumela. I can help you understand records and the questions to ask about tax. I share general education, not an official RSL decision.",
                "Dumela. Nka u thusa ho utloisisa lirekoto le lipotso tse mabapi le lekhetho. Ke arolelana thuto, eseng qeto ea semmuso ea RSL.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {STARTERS.map(([en, st]) => (
                <button
                  key={en}
                  type="button"
                  className="max-w-full rounded-full border border-line bg-white px-3 py-2 text-left text-[13px] font-semibold"
                  onClick={() => void send(language === "st" ? st : en)}
                >
                  {language === "st" ? st : en}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble key={message.id} message={message} latest={index === messages.length - 1} />
          ))
        )}
        {pending ? <p className="text-[14px] text-quiet">{tr("Thinking", "Kea nahana")}</p> : null}
      </div>
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">{tr("Message", "Molaetsa")}</span>
          <textarea
            data-testid="buddy-input"
            value={draft}
            rows={1}
            placeholder={tr("Ask about records or what to do next", "Botsa ka lirekoto kapa seo u lokelang ho se etsa")}
            className="max-h-32 min-h-12 w-full resize-none rounded-[14px] border border-line bg-white px-4 py-3 text-[16px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
          />
        </label>
        <button
          type="submit"
          data-testid="buddy-send"
          aria-label={tr("Send", "Romela")}
          disabled={pending}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-lemon text-ink disabled:opacity-50"
        >
          <ArrowUp size={18} />
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message, latest }: { message: ChatMessage; latest: boolean }) {
  const { tr } = useI18n();
  const payload: BuddyPayload | null = message.payload;
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-[20px] rounded-br-md border border-line bg-white px-4 py-3 text-[15px] leading-6 [overflow-wrap:anywhere]">
          {message.content}
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-[90%]">
      <div className="rounded-[20px] rounded-bl-md bg-mist px-4 py-3 text-[15px] leading-6 [overflow-wrap:anywhere]" data-testid={latest ? "buddy-answer" : undefined}>
        {message.content}
      </div>
      {payload && payload.next_steps.length > 0 ? (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[14px]">
          {payload.next_steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
      {payload && payload.sources.length > 0 ? (
        <p className="mt-3 text-[12px] leading-5 text-quiet">
          {tr("Based on", "Ho ipapisitsoe le")} {payload.sources.join(", ")}
        </p>
      ) : null}
      {payload?.needs_human_help ? (
        <div className="mt-4">
          {payload.reason_for_referral ? <p className="text-[14px] leading-6 text-quiet">{payload.reason_for_referral}</p> : null}
          <Button asChild className="mt-3" data-testid={latest ? "buddy-help" : undefined}>
            <Link to={`/help?topic=${payload.help_topic}`} state={{ description: message.content }}>
              {tr("Request help from RSL", "Kopa thuso ho RSL")}
            </Link>
          </Button>
          <p className="mt-2 max-w-sm text-[12px] leading-5 text-quiet">
            {tr(
              "This saves a request on the officer desk in this prototype. It is not delivered to RSL's case system.",
              "Sena se boloka kōpo tafoleng ea ofisiri prototaipe ena. Ha e isoe tsamaisong ea linyeoe ea RSL.",
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
