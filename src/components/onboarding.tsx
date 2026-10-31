import { useEffect, useRef, useState } from "react";
import { repository } from "@/lib/data";
import { useAuth, useI18n } from "@/lib/auth";
import {
  ACTIVITY_OPTIONS,
  activityLabel,
  KIND_OPTIONS,
  kindLabel,
  RECORD_OPTIONS,
  recordMethodLabel,
  YES_OPTIONS,
  yesNoLabel,
} from "@/lib/labels";
import type { ActivityType, BusinessInput, BusinessKind, BusinessProfile, Language, RecordMethod, YesNoUnsure } from "@/lib/types";
import { ChoiceGroup } from "./choices";
import { CloseIcon, Modal } from "./ui/dialog";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/input";

interface FormState {
  step: number;
  name: string;
  kind: BusinessKind | "";
  kind_other: string;
  location: string;
  activity_type: ActivityType | "";
  registered: YesNoUnsure | "";
  has_tin: YesNoUnsure | "";
  record_method: RecordMethod | "";
  record_method_other: string;
  preferred_language: Language;
  phone: string;
  contact_consent: boolean;
  share_summary_consent: boolean;
}

function blank(language: Language): FormState {
  return {
    step: 1,
    name: "",
    kind: "",
    kind_other: "",
    location: "",
    activity_type: "",
    registered: "",
    has_tin: "",
    record_method: "",
    record_method_other: "",
    preferred_language: language,
    phone: "",
    contact_consent: false,
    share_summary_consent: false,
  };
}

function fromBusiness(business: BusinessProfile): FormState {
  return {
    step: 1,
    name: business.name,
    kind: business.kind,
    kind_other: business.kind_other ?? "",
    location: business.location,
    activity_type: business.activity_type,
    registered: business.registered,
    has_tin: business.has_tin,
    record_method: business.record_method,
    record_method_other: business.record_method_other ?? "",
    preferred_language: business.preferred_language,
    phone: business.phone ?? "",
    contact_consent: business.contact_consent,
    share_summary_consent: business.share_summary_consent,
  };
}

function draftKey(userId: string) {
  return `lekhetho.onboarding.${userId}`;
}

export function Onboarding({
  open,
  business,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  business: BusinessProfile | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { tr } = useI18n();
  const [form, setForm] = useState<FormState>(() => blank("en"));
  const [error, setError] = useState("");
  const [doneName, setDoneName] = useState("");
  const session = useRef(false);

  useEffect(() => {
    if (!open) {
      session.current = false;
      return;
    }
    if (!user || session.current) return;
    session.current = true;
    setError("");
    setDoneName("");
    if (business) {
      setForm(fromBusiness(business));
      return;
    }
    try {
      const raw = localStorage.getItem(draftKey(user.id));
      if (!raw) {
        setForm(blank(user.preferred_language));
        return;
      }
      const parsed = JSON.parse(raw) as FormState;
      setForm({ ...blank(user.preferred_language), ...parsed, step: parsed.step || 1 });
    } catch {
      setForm(blank(user.preferred_language));
    }
  }, [open, business, user]);

  function remember(next: FormState) {
    if (!user || business) return;
    localStorage.setItem(draftKey(user.id), JSON.stringify(next));
  }

  function patch(partial: Partial<FormState>) {
    setForm((current) => {
      const next = { ...current, ...partial };
      remember(next);
      return next;
    });
    setError("");
  }

  function validate(step: number): string {
    if (step === 1) {
      if (form.name.trim().length < 2) return tr("Enter the business name.", "Kenya lebitso la khoebo.");
      if (!form.kind) return tr("Choose the kind of business.", "Khetha mofuta oa khoebo.");
      if (form.kind === "other" && form.kind_other.trim().length < 2) {
        return tr("Describe the kind of business.", "Hlalosa mofuta oa khoebo.");
      }
      if (form.location.trim().length < 2) return tr("Enter the district, town, or area.", "Kenya setereke, toropo, kapa sebaka.");
      if (!form.activity_type) return tr("Choose how often the business runs.", "Khetha hore na khoebo e sebetsa neng.");
    }
    if (step === 2) {
      if (!form.registered || !form.has_tin) return tr("Answer both questions.", "Araba lipotso ka bobeli.");
      if (!form.record_method) return tr("Choose how you keep records.", "Khetha hore na u boloka lirekoto joang.");
      if (form.record_method === "other" && form.record_method_other.trim().length < 2) {
        return tr("Describe how you keep records.", "Hlalosa hore na u boloka lirekoto joang.");
      }
    }
    if (step === 3 && form.phone.trim()) {
      if (!/^[0-9+\s()-]{7,20}$/.test(form.phone.trim())) {
        return tr("Enter a phone number, or leave it blank.", "Kenya nomoro ea fono, kapa e tlohele e se na letho.");
      }
      if (!form.contact_consent) {
        return tr("Tick consent before saving a phone number.", "Tšoaea tumello pele u boloka nomoro.");
      }
    }
    return "";
  }

  function next() {
    const message = validate(form.step);
    if (message) {
      setError(message);
      return;
    }
    patch({ step: Math.min(3, form.step + 1) });
  }

  function save() {
    const message = validate(3) || validate(2) || validate(1);
    if (message || !form.kind || !form.activity_type || !form.registered || !form.has_tin || !form.record_method) {
      setError(message || tr("Finish the earlier answers.", "Qetella likarabo tsa pejana."));
      return;
    }
    const input: BusinessInput = {
      name: form.name.trim(),
      kind: form.kind,
      kind_other: form.kind === "other" ? form.kind_other.trim() : null,
      location: form.location.trim(),
      activity_type: form.activity_type,
      registered: form.registered,
      has_tin: form.has_tin,
      record_method: form.record_method,
      record_method_other: form.record_method === "other" ? form.record_method_other.trim() : null,
      preferred_language: form.preferred_language,
      phone: form.phone.trim() || null,
      contact_consent: Boolean(form.phone.trim()) && form.contact_consent,
      share_summary_consent: form.share_summary_consent,
    };
    try {
      const saved = repository.saveBusiness(input);
      if (user) localStorage.removeItem(draftKey(user.id));
      onSaved();
      setDoneName(saved.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr("The profile could not be saved.", "Profil ha ea bolokeha."));
    }
  }

  const why =
    form.step === 1
      ? tr(
          "Your name and area help Buddy suggest the right next question. This does not register the business.",
          "Lebitso le sebaka li thusa Buddy ho fana ka potso e nepahetseng. Sena ha se ngodise khoebo.",
        )
      : form.step === 2
        ? tr(
            "These answers show what you already know. Buddy will not treat them as an official tax status.",
            "Likarabo tsena li bontša seo u se tsebang. Buddy e ke ke ea li nka e le boemo ba molao.",
          )
        : tr(
            "Language changes the words in the app. A phone number is optional and stays in this prototype.",
            "Puo e fetola mantsoe a sesebelisoa. Nomoro ea fono ha e qobellehe, 'me e lula prototaipe ena.",
          );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      label={tr("Tell Buddy about your business", "Bolella Buddy ka khoebo ea hau")}
      className="inset-0 h-dvh w-full max-w-none bg-paper sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[min(760px,calc(100dvh-3rem))] sm:w-[min(520px,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px] sm:border sm:border-line sm:bg-white"
    >
      <div className="flex min-h-0 flex-1 flex-col sm:max-h-[min(760px,calc(100dvh-3rem))]">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-7">
          <p className="text-[13px] font-semibold text-quiet">
            {doneName ? tr("Saved", "E bolokiloe") : tr(`${form.step} of 3`, `${form.step} ho tse 3`)}
          </p>
          <CloseIcon label={tr("Close", "Koala")} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2 sm:px-7">
          {doneName ? (
            <div>
              <h2 className="max-w-sm text-[30px] font-semibold leading-[1.15] tracking-[-0.03em]">
                {tr("Your business profile is saved.", "Profil ea khoebo ea hau e bolokiloe.")}
              </h2>
              <p className="mt-4 max-w-sm text-[16px] leading-7" data-testid="onboard-saved-name">
                {doneName}
              </p>
              <p className="mt-4 max-w-sm text-[15px] leading-6 text-quiet">
                {tr(
                  "This does not register the business with Revenue Services Lesotho.",
                  "Sena ha se ngodise khoebo le Revenue Services Lesotho.",
                )}
              </p>
            </div>
          ) : (
            <>
              <h2 className="max-w-sm text-[30px] font-semibold leading-[1.15] tracking-[-0.03em]">
                {tr("Tell Buddy about your business", "Bolella Buddy ka khoebo ea hau")}
              </h2>
              <p className="mt-3 max-w-sm text-[15px] leading-6 text-quiet">
                {tr(
                  "Let's get to know your business so we can guide you with the right information.",
                  "Ha re tsebe khoebo ea hau e le hore re ka u tataisa ka lintlha tse nepahetseng.",
                )}
              </p>
              <div className="mt-8 grid gap-6">
                {form.step === 1 ? (
                  <>
                    <Field label={tr("Business name", "Lebitso la khoebo")}>
                      <Input
                        data-testid="onboard-name"
                        value={form.name}
                        onChange={(event) => patch({ name: event.target.value })}
                        autoComplete="organization"
                      />
                    </Field>
                    <ChoiceGroup
                      label={tr("What kind of business is it?", "Ke mofuta ofe oa khoebo?")}
                      value={form.kind}
                      testPrefix="kind"
                      onChange={(kind) => patch({ kind })}
                      options={KIND_OPTIONS.map((value) => ({ value, label: kindLabel(value, null, form.preferred_language) }))}
                    />
                    {form.kind === "other" ? (
                      <Field label={tr("Describe it", "E hlalose")}>
                        <Input value={form.kind_other} onChange={(event) => patch({ kind_other: event.target.value })} />
                      </Field>
                    ) : null}
                    <Field label={tr("Where is the business?", "Khoebo e hokae?")} hint={tr("District, town, or area", "Setereke, toropo, kapa sebaka")}>
                      <Input
                        data-testid="onboard-location"
                        value={form.location}
                        onChange={(event) => patch({ location: event.target.value })}
                      />
                    </Field>
                    <ChoiceGroup
                      label={tr("How does it run?", "E sebetsa joang?")}
                      value={form.activity_type}
                      testPrefix="activity"
                      onChange={(activity_type) => patch({ activity_type })}
                      options={ACTIVITY_OPTIONS.map((value) => ({ value, label: activityLabel(value, form.preferred_language) }))}
                    />
                  </>
                ) : null}
                {form.step === 2 ? (
                  <>
                    <ChoiceGroup
                      label={tr("Is the business registered?", "Na khoebo e ngolisitsoe?")}
                      value={form.registered}
                      testPrefix="registered"
                      onChange={(registered) => patch({ registered })}
                      options={YES_OPTIONS.map((value) => ({ value, label: yesNoLabel(value, form.preferred_language) }))}
                    />
                    <ChoiceGroup
                      label={tr("Do you already have a tax identification number?", "Na u se u na le nomoro ea lekhetho?")}
                      value={form.has_tin}
                      testPrefix="tin"
                      onChange={(has_tin) => patch({ has_tin })}
                      options={YES_OPTIONS.map((value) => ({ value, label: yesNoLabel(value, form.preferred_language) }))}
                    />
                    <ChoiceGroup
                      label={tr("How do you keep track of sales?", "U boloka thekiso joang?")}
                      value={form.record_method}
                      testPrefix="records"
                      onChange={(record_method) => patch({ record_method })}
                      options={RECORD_OPTIONS.map((value) => ({ value, label: recordMethodLabel(value, null, form.preferred_language) }))}
                    />
                    {form.record_method === "other" ? (
                      <Field label={tr("Describe it", "E hlalose")}>
                        <Input
                          value={form.record_method_other}
                          onChange={(event) => patch({ record_method_other: event.target.value })}
                        />
                      </Field>
                    ) : null}
                  </>
                ) : null}
                {form.step === 3 ? (
                  <>
                    <ChoiceGroup
                      label={tr("Preferred language", "Puo eo u e ratang")}
                      value={form.preferred_language}
                      testPrefix="language"
                      onChange={(preferred_language) => patch({ preferred_language })}
                      options={[
                        { value: "en" as const, label: "English" },
                        { value: "st" as const, label: "Sesotho" },
                      ]}
                    />
                    <Field
                      label={tr("Phone, if you want a follow-up", "Fono, haeba u batla ho lateloa")}
                      hint={tr("Optional. Saved only with your consent.", "Ha e qobellehe. E bolokoa feela ka tumello ea hau.")}
                    >
                      <Input
                        value={form.phone}
                        inputMode="tel"
                        autoComplete="tel"
                        onChange={(event) => patch({ phone: event.target.value })}
                      />
                    </Field>
                    <label className="flex items-start gap-3 text-[14px] leading-6">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 accent-ink"
                        checked={form.contact_consent}
                        onChange={(event) => patch({ contact_consent: event.target.checked })}
                      />
                      <span>{tr("I agree that this prototype may store this number for follow-up.", "Ke lumela hore prototaipe ena e ka boloka nomoro ena bakeng sa ho nlatela.")}</span>
                    </label>
                    <label className="flex items-start gap-3 text-[14px] leading-6">
                      <input
                        data-testid="share-consent"
                        type="checkbox"
                        className="mt-1 h-5 w-5 accent-ink"
                        checked={form.share_summary_consent}
                        onChange={(event) => patch({ share_summary_consent: event.target.checked })}
                      />
                      <span>
                        {tr(
                          "If I ask for help, an officer in this prototype may see my monthly sales and expense totals. Not my private notes.",
                          "Haeba ke kopa thuso, ofisiri prototaipe ena a ka bona kakaretso ea thekiso le litšenyehelo tsa kgwedi. Eseng lintlha tsa ka tse lekunutu.",
                        )}
                      </span>
                    </label>
                  </>
                ) : null}
                <p className="max-w-sm text-[13px] leading-5 text-quiet">{why}</p>
                {error ? (
                  <p role="alert" className="text-[14px] text-warn">
                    {error}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-7">
          {doneName ? (
            <Button data-testid="onboard-home" className="w-full" onClick={() => onOpenChange(false)}>
              {tr("Go to Home", "Eya lapeng")}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                data-testid="onboard-back"
                disabled={form.step === 1}
                onClick={() => patch({ step: Math.max(1, form.step - 1) })}
              >
                {tr("Back", "Morao")}
              </Button>
              {form.step < 3 ? (
                <Button data-testid="onboard-next" onClick={next}>
                  {tr("Continue", "Tsoela pele")}
                </Button>
              ) : (
                <Button data-testid="onboard-finish" onClick={save}>
                  {business ? tr("Save changes", "Boloka liphetoho") : tr("Save profile", "Boloka profil")}
                </Button>
              )}
            </>
          )}
        </footer>
      </div>
    </Modal>
  );
}
