import { useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { useAuth, useI18n } from "@/lib/auth";
import { repository } from "@/lib/data";
import { helpStatusLabel, TOPIC_OPTIONS, topicLabel } from "@/lib/labels";
import type { HelpRequest, HelpTopic, Language } from "@/lib/types";
import { useBusiness, useOnboarding } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";

const TOPICS = new Set<HelpTopic>(TOPIC_OPTIONS);

export function HelpPage() {
  const { refresh, revision } = useAuth();
  const { language, tr } = useI18n();
  const business = useBusiness();
  const { openOnboarding } = useOnboarding();
  const [params] = useSearchParams();
  const location = useLocation();
  const state = location.state as { description?: string } | null;
  const initialTopic = TOPICS.has(params.get("topic") as HelpTopic) ? (params.get("topic") as HelpTopic) : "understanding";
  const [topic, setTopic] = useState<HelpTopic>(initialTopic);
  const [description, setDescription] = useState(state?.description ?? "");
  const [responseLanguage, setResponseLanguage] = useState<Language>(language);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<HelpRequest | null>(null);
  const requests = useMemo(() => (business ? repository.listMyHelpRequests() : []), [business, revision]);

  if (!business) {
    return (
      <div className="max-w-md">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">{tr("Get help", "Kopa thuso")}</h1>
        <p className="mt-3 text-quiet">{tr("Save your business profile, then send a question.", "Boloka profil ea khoebo, ebe u romela potso.")}</p>
        <Button className="mt-6" onClick={openOnboarding}>
          {tr("Tell Buddy about your business", "Bolella Buddy ka khoebo ea hau")}
        </Button>
      </div>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const request = repository.createHelpRequest({ topic, description, language: responseLanguage });
      setSaved(request);
      setDescription("");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr("The request could not be saved.", "Kōpo ha ea bolokeha."));
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em] lg:text-[36px]">{tr("Get help", "Kopa thuso")}</h1>
      <p className="mt-3 max-w-lg text-[15px] leading-6 text-quiet">
        {tr(
          "A person using the officer desk in this prototype can follow up. This does not deliver your case into RSL's systems.",
          "Motho ea sebelisang tafole ea ofisiri prototaipe ena a ka latela. Sena ha se ise nyeoe ea hau litsamaisong tsa RSL.",
        )}
      </p>

      {saved ? (
        <div className="mt-8 rounded-[24px] bg-lemon px-6 py-6" data-testid="help-confirmation">
          <p className="text-[13px] font-semibold">{tr("Request saved", "Kōpo e bolokiloe")}</p>
          <p data-testid="help-reference" className="mt-2 text-[32px] font-semibold tracking-[-0.03em]">
            {saved.reference_number}
          </p>
          <p className="mt-3 max-w-md text-[15px] leading-6">
            {tr(
              "Keep this reference. It was created by Lekhetho Buddy, not by RSL's case system.",
              "Boloka nomoro ena. E entsoe ke Lekhetho Buddy, eseng ke tsamaiso ea linyeoe ea RSL.",
            )}
          </p>
          <Button className="mt-5" variant="dark" onClick={() => setSaved(null)}>
            {tr("Write another request", "Ngola kōpo e 'ngoe")}
          </Button>
        </div>
      ) : (
        <form className="mt-8 grid max-w-lg gap-5" onSubmit={submit}>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">{tr("Topic", "Sehlooho")}</legend>
            <div className="flex flex-wrap gap-2">
              {TOPIC_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`help-topic-${value}`}
                  aria-pressed={topic === value}
                  onClick={() => setTopic(value)}
                  className={`min-h-11 rounded-[14px] border px-3 text-[14px] font-semibold ${topic === value ? "border-ink bg-lemon" : "border-line bg-white"}`}
                >
                  {topicLabel(value, language)}
                </button>
              ))}
            </div>
          </fieldset>
          <Field label={tr("Describe your question", "Hlalosa potso ea hau")}>
            <Textarea
              data-testid="help-description"
              value={description}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">{tr("Preferred response language", "Puo eo u batlang karabo ka eona")}</legend>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={responseLanguage === "en" ? "primary" : "quiet"} onClick={() => setResponseLanguage("en")}>
                English
              </Button>
              <Button type="button" size="sm" variant={responseLanguage === "st" ? "primary" : "quiet"} onClick={() => setResponseLanguage("st")}>
                Sesotho
              </Button>
            </div>
          </fieldset>
          {error ? (
            <p role="alert" className="text-[14px] text-warn">
              {error}
            </p>
          ) : null}
          <Button type="submit" data-testid="help-submit">
            {tr("Submit request", "Romela kōpo")}
          </Button>
        </form>
      )}

      <section className="mt-12 max-w-lg">
        <h2 className="text-[20px] font-semibold">{tr("Your requests", "Likōpo tsa hau")}</h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-quiet">{tr("None yet.", "Ha ho le e 'ngoe hajoale.")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {requests.map((request) => (
              <li key={request.id} className="py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{request.reference_number}</p>
                  <p className="text-[13px] text-quiet">{helpStatusLabel(request.status, language)}</p>
                </div>
                <p className="mt-1 text-[13px] text-quiet">{topicLabel(request.topic, language)}</p>
                <p className="mt-2 text-[15px] leading-6 [overflow-wrap:anywhere]">{request.description}</p>
                {request.resolution ? (
                  <p className="mt-3 text-[14px] leading-6">
                    <span className="text-quiet">{tr("Outcome", "Sephetho")}: </span>
                    {request.resolution}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
