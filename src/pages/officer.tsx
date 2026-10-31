import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "@/lib/auth";
import { repository } from "@/lib/data";
import { formatMaloti } from "@/lib/format";
import { activityLabel, helpStatusLabel, kindLabel, topicLabel, yesNoLabel } from "@/lib/labels";
import type { HelpStatus, HelpTopic, YesNoUnsure } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

type DeskView = "requests" | "businesses" | "activity";

export function OfficerHome() {
  const { revision } = useAuth();
  const [view, setView] = useState<DeskView>("requests");
  const [topic, setTopic] = useState<HelpTopic | "all">("all");
  const [status, setStatus] = useState<HelpStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [registered, setRegistered] = useState<YesNoUnsure | "all">("all");
  const overview = useMemo(() => repository.officerOverview(), [revision]);
  const requests = useMemo(() => repository.officerListRequests({ topic, status }), [revision, topic, status]);
  const businesses = useMemo(() => repository.officerListBusinesses({ search, registered }), [revision, search, registered]);
  const activity = useMemo(() => repository.officerListActivity(), [revision]);

  return (
    <div>
      <h1 className="text-[32px] font-semibold tracking-[-0.03em] lg:text-[36px]">Follow-up desk</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-6 text-quiet">
        Service follow-up for this prototype. Not connected to RSL case management. There is no compliance score.
      </p>
      <div className="mt-8 divide-y divide-line rounded-[20px] border border-line bg-white sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Count label="Business profiles" value={overview.businesses} testId="officer-business-count" />
        <Count label="Assistance requests" value={overview.requests} testId="officer-request-count" />
        <Count label="Awaiting action" value={overview.awaiting} testId="officer-awaiting-count" />
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            ["requests", "Requests"],
            ["businesses", "Businesses"],
            ["activity", "Activity"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={`h-11 rounded-[14px] px-4 text-[14px] font-semibold ${view === value ? "bg-lemon" : "bg-white text-quiet"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "requests" ? (
        <section className="mt-6">
          <div className="flex flex-wrap gap-2">
            <Select label="Topic" value={topic} onChange={(value) => setTopic(value as HelpTopic | "all")} options={["all", "registration", "records", "filing", "payments", "understanding", "other"]} />
            <Select label="Status" value={status} onChange={(value) => setStatus(value as HelpStatus | "all")} options={["all", "open", "in_progress", "resolved"]} />
          </div>
          <ul className="mt-4 border-t border-line">
            {requests.map((request) => (
              <li key={request.id} className="grid gap-2 border-b border-line py-4 md:grid-cols-[8rem_minmax(0,1.4fr)_minmax(0,1fr)_8rem_auto] md:items-center">
                <p className="font-semibold">{request.reference_number}</p>
                <p className="min-w-0 [overflow-wrap:anywhere]">{request.business_name}</p>
                <p className="text-[14px] text-quiet">{topicLabel(request.topic, "en")}</p>
                <p className="text-[14px]">{helpStatusLabel(request.status, "en")}</p>
                <Link className="inline-flex h-11 items-center font-semibold" to={`/officer/requests/${request.id}`} data-testid="officer-request">
                  Open
                </Link>
              </li>
            ))}
          </ul>
          {requests.length === 0 ? <p className="mt-6 text-quiet">No requests in this filter.</p> : null}
        </section>
      ) : null}

      {view === "businesses" ? (
        <section className="mt-6">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <Input data-testid="officer-search" value={search} placeholder="Search name, owner, or place" onChange={(event) => setSearch(event.target.value)} />
            <Select label="Registration note" value={registered} onChange={(value) => setRegistered(value as YesNoUnsure | "all")} options={["all", "yes", "no", "not_sure"]} />
          </div>
          <ul className="mt-4 divide-y divide-line">
            {businesses.map((business) => (
              <li key={business.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-semibold [overflow-wrap:anywhere]">{business.name}</p>
                  <p className="text-[13px] text-quiet">
                    {business.owner_name} · {business.location} · {kindLabel(business.kind, business.kind_other, "en")}
                  </p>
                </div>
                <Link to={`/officer/businesses/${business.id}`} className="inline-flex h-11 items-center font-semibold">
                  View
                </Link>
              </li>
            ))}
          </ul>
          {businesses.length === 0 ? <p className="mt-6 text-quiet">No businesses match.</p> : null}
        </section>
      ) : null}

      {view === "activity" ? (
        <section className="mt-6">
          {activity.length === 0 ? (
            <p className="text-quiet">Officer actions will appear here.</p>
          ) : (
            <ol className="divide-y divide-line">
              {activity.map((item) => (
                <li key={item.id} className="py-4">
                  <p className="text-[13px] text-quiet">
                    {item.reference_number} · {item.officer_name} · {item.action.replace("_", " ")}
                  </p>
                  <p className="mt-2 text-[15px] leading-6 [overflow-wrap:anywhere]">{item.body}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}

export function OfficerRequestPage() {
  const { id = "" } = useParams();
  const { revision, refresh } = useAuth();
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState("");
  const detail = useMemo(() => {
    try {
      return repository.officerGetRequest(id);
    } catch (caught) {
      return caught instanceof Error ? caught.message : "Unavailable";
    }
  }, [id, revision]);

  if (typeof detail === "string") {
    return <p className="text-quiet">{detail}</p>;
  }

  function act(run: () => void) {
    setError("");
    try {
      run();
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That action failed.");
    }
  }

  return (
    <div className="max-w-3xl">
      <Link to="/officer" className="text-[14px] font-semibold text-quiet">
        Back to the desk
      </Link>
      <p className="mt-6 text-[13px] font-semibold text-quiet">Reference</p>
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">{detail.request.reference_number}</h1>
      <p className="mt-2 text-[14px] text-quiet">
        {helpStatusLabel(detail.request.status, "en")} · {topicLabel(detail.request.topic, "en")} · {detail.request.language === "st" ? "Sesotho" : "English"}
      </p>
      <p className="mt-6 max-w-xl text-[16px] leading-7 [overflow-wrap:anywhere]" data-testid="officer-description">
        {detail.request.description}
      </p>
      <p className="mt-4 text-[14px]">
        {detail.request.business_name} · {detail.request.owner_name}
      </p>
      <p className="text-[13px] text-quiet break-all">{detail.request.owner_email}</p>
      {detail.summary ? (
        <p className="mt-4 text-[14px] leading-6">
          {detail.summary.month_label}: sales {formatMaloti(detail.summary.sales)}, expenses {formatMaloti(detail.summary.expenses)}. Record summary {formatMaloti(detail.summary.net)}, not a tax figure.
        </p>
      ) : (
        <p className="mt-4 text-[14px] text-quiet">Monthly record totals stay hidden until the owner agrees to share them.</p>
      )}
      {detail.request.resolution ? (
        <div className="mt-6">
          <h2 className="text-[18px] font-semibold">Outcome shared with the owner</h2>
          <p className="mt-2 text-[15px] leading-6" data-testid="officer-outcome">{detail.request.resolution}</p>
        </div>
      ) : null}
      <div className="mt-8 grid gap-4">
        {detail.request.status === "open" ? (
          <Button data-testid="officer-progress" onClick={() => act(() => repository.officerMarkInProgress(id))}>
            Mark in progress
          </Button>
        ) : null}
        <label className="grid gap-2 text-[13px] font-semibold">
          Internal note
          <Textarea data-testid="officer-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <Button
          variant="quiet"
          onClick={() =>
            act(() => {
              repository.officerAddNote(id, note);
              setNote("");
            })
          }
        >
          Save internal note
        </Button>
        {detail.request.status !== "resolved" ? (
          <>
            <label className="grid gap-2 text-[13px] font-semibold">
              Outcome for the business owner
              <Textarea data-testid="officer-resolution" value={resolution} onChange={(event) => setResolution(event.target.value)} />
            </label>
            <Button
              data-testid="officer-resolve"
              onClick={() =>
                act(() => {
                  repository.officerResolve(id, resolution);
                  setResolution("");
                })
              }
            >
              Mark resolved
            </Button>
          </>
        ) : null}
        {error ? <p className="text-[14px] text-warn">{error}</p> : null}
      </div>
      <h2 className="mt-10 text-[18px] font-semibold">Activity</h2>
      <ol className="mt-3 divide-y divide-line">
        {detail.notes.map((item) => (
          <li key={item.id} className="py-3">
            <p className="text-[13px] text-quiet">
              {item.officer_name} · {item.action.replace("_", " ")}
            </p>
            <p className="mt-1 text-[15px] leading-6 [overflow-wrap:anywhere]">{item.body}</p>
          </li>
        ))}
      </ol>
      {detail.notes.length === 0 ? <p className="mt-3 text-quiet">No officer notes yet.</p> : null}
    </div>
  );
}

export function OfficerBusinessPage() {
  const { id = "" } = useParams();
  const { revision } = useAuth();
  const detail = useMemo(() => {
    try {
      return repository.officerGetBusiness(id);
    } catch (caught) {
      return caught instanceof Error ? caught.message : "Unavailable";
    }
  }, [id, revision]);

  if (typeof detail === "string") return <p className="text-quiet">{detail}</p>;
  const business = detail.business;
  return (
    <div className="max-w-3xl">
      <Link to="/officer" className="text-[14px] font-semibold text-quiet">
        Back to the desk
      </Link>
      <h1 className="mt-6 text-[32px] font-semibold tracking-[-0.03em] [overflow-wrap:anywhere]">{business.name}</h1>
      <dl className="mt-6 grid max-w-lg gap-3 text-[15px]">
        <Row label="Owner" value={`${business.owner_name} · ${business.owner_email}`} />
        <Row label="Place" value={business.location} />
        <Row label="Kind" value={kindLabel(business.kind, business.kind_other, "en")} />
        <Row label="Activity" value={activityLabel(business.activity_type, "en")} />
        <Row label="Registration, as told to Buddy" value={yesNoLabel(business.registered, "en")} />
        <Row label="Tax number, as told to Buddy" value={yesNoLabel(business.has_tin, "en")} />
      </dl>
      <p className="mt-4 max-w-lg text-[13px] leading-5 text-quiet">
        These are the owner's own answers. They are not an official registration status, and private entry notes are not shown here.
      </p>
      {detail.summary ? (
        <p className="mt-6 text-[15px] leading-6">
          {detail.summary.month_label}: sales {formatMaloti(detail.summary.sales)}, expenses {formatMaloti(detail.summary.expenses)}, days with records {detail.summary.days_with_records}. The difference is a record summary, not tax due.
        </p>
      ) : (
        <p className="mt-6 text-quiet">This owner has not agreed to share monthly record totals.</p>
      )}
      <h2 className="mt-8 text-[18px] font-semibold">Requests</h2>
      <ul className="mt-3 divide-y divide-line">
        {detail.requests.map((request) => (
          <li key={request.id} className="flex items-center justify-between gap-3 py-3">
            <span>
              {request.reference_number} · {topicLabel(request.topic, "en")}
            </span>
            <Link to={`/officer/requests/${request.id}`} className="font-semibold">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Count({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[13px] text-quiet">{label}</p>
      <p data-testid={testId} className="mt-1 text-[28px] font-semibold tracking-[-0.03em]">
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-quiet">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[13px] font-semibold">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-[14px] border border-line bg-white px-3 text-[16px]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All" : option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
