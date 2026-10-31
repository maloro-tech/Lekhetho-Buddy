import { ARTICLE_TITLES, ARTICLES, RECORD_SOURCE, article, type Article } from "./knowledge.ts";

export type BuddyLanguage = "en" | "st";
export type HelpTopic = "registration" | "records" | "filing" | "payments" | "understanding" | "other";

export interface BuddyBusinessContext {
  name: string;
  kind: string;
  location: string;
  activity_type: string;
  registered: string;
  has_tin: string;
  record_method: string;
}

export interface BuddySummary {
  sales_this_month: number;
  expenses_this_month: number;
  days_with_records: number;
}

export interface BuddyRequest {
  message: string;
  language: BuddyLanguage;
  business: BuddyBusinessContext | null;
  summary: BuddySummary | null;
  journey_next: string | null;
}

export interface BuddyResponse {
  answer: string;
  next_steps: string[];
  needs_human_help: boolean;
  reason_for_referral: string | null;
  sources: string[];
  mode: "education-notes" | "assistant";
  help_topic: HelpTopic;
}

export class BuddyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuddyInputError";
  }
}

const HIGH_RISK =
  /\bvat\b|\bpaye\b|\brates?\b|\bthreshold\b|\bdeadlines?\b|\bdue date\b|\bforms?\b|\bpenalt(?:y|ies)\b|\bpercent\b|%|how much tax|what do i owe|tax liability|income tax|corporate tax|withholding|how do i file|how do i pay|file my|submit (?:my|a) return|pay my tax|sekgahla|letsatsi la ho qetela/i;

const TOTALS =
  /how much did i (?:sell|record)|sales this month|expenses this month|my (?:sales|expenses)|thekiso (?:ea|ya) kgwedi|litsenyehelo|litšenyehelo/i;

const REGISTER = /regist|ngolis|ngodis/i;
const RECORDS = /\brecords?\b|lirekoto|rekoto|bookkeep|receipt|boloka/i;
const TIN = /tax identification|\btin\b|nomoro ea lekhetho/i;
const NEXT = /what should i do next|next step|etse eng/i;
const SESOTHO = /sesotho|hlalosa/i;
const OBLIGATIONS = /obligation|boikarabello|understand my tax|\blekhetho\b/i;
const FILING = /\bfil(?:e|ing)\b|\breturn\b/i;
const PAYMENT = /\bpay(?:ment|ing)?\b|\blefa\b/i;

const RISKY_CONTENT =
  /\d+(?:[.,]\d+)?\s*%|the (?:vat |tax |paye )?rate is|i (?:have|['’]ve) (?:registered|filed|submitted|paid|contacted)|your (?:return|payment) has been|delivered (?:it|this|the case) (?:in)?to rsl|successfully registered|tax has been paid|you (?:must|need to|don['’]t need to|do not need to) register|you are required to register/i;

const SYSTEM_PROMPT = `You are Lekhetho Buddy, an educational assistant for small businesses in Lesotho.
You are not Revenue Services Lesotho and you are not an official filing, registration, or payment channel.

Rules:
- Use only the supplied education articles and the caller's own record summary.
- Explain in plain language. Answer in Sesotho when language is "st" or the person asks for Sesotho. Otherwise answer in English.
- If the question needs a tax rate, threshold, deadline, form name, penalty, eligibility rule, or legal citation, do not invent it. Set needs_human_help to true and say you will not guess.
- Never say you registered a business, submitted a return, paid tax, or delivered a case into RSL's systems.
- Sales minus expenses is a record summary, not taxable profit or a tax bill.
- Treat the business profile as something the person told the app, not as an official status.
- Return JSON with keys: answer (string), next_steps (array of short strings), needs_human_help (boolean), reason_for_referral (string or null), sources (array of article titles copied exactly from the supplied articles).
- Do not cite any source that is not in the supplied articles. If you use the caller's record totals, you may also cite "Your records in Lekhetho Buddy".`;

export function isHighRisk(message: string): boolean {
  return HIGH_RISK.test(message);
}

export function answerLocally(request: BuddyRequest): BuddyResponse {
  const language = responseLanguage(request);
  const topic = helpTopic(request.message);

  if (isHighRisk(request.message)) {
    return decline(language, topic);
  }

  if (TOTALS.test(request.message) && request.summary) {
    return totalsAnswer(request, language);
  }

  if (REGISTER.test(request.message)) {
    return registrationAnswer(request, language);
  }

  if (RECORDS.test(request.message) && !OBLIGATIONS.test(request.message)) {
    return fromArticle("edu-records", language, false, null, topic === "understanding" ? "records" : topic, request);
  }

  if (TIN.test(request.message)) {
    return fromArticle(
      "edu-tin",
      language,
      true,
      "Whether you have a tax identification number, and how to get one, has to be confirmed with RSL.",
      "registration",
      request,
    );
  }

  if (NEXT.test(request.message)) {
    return nextAnswer(request, language);
  }

  if (SESOTHO.test(request.message)) {
    return sesothoOverview(request);
  }

  if (OBLIGATIONS.test(request.message) || FILING.test(request.message) || PAYMENT.test(request.message)) {
    return fromArticle(
      "edu-obligations",
      language,
      true,
      "Your specific obligation is not something these education notes can decide.",
      topic,
      request,
    );
  }

  if (/^(hi|hello|dumela|lumela|helo)[!.?\s]*$/i.test(request.message)) {
    return {
      answer:
        language === "st"
          ? "Dumela. Nka hlalosa lirekoto le lipotso tseo u ka li botsang. Ke thuto feela, eseng qeto ea RSL."
          : "Dumela. I can explain records and the questions worth asking. This is education, not an RSL decision.",
      next_steps:
        language === "st"
          ? ["Botsa hore na o boloka lirekoto life", "Sheba mohato o latelang"]
          : ["Ask what records to keep", "Look at your next step"],
      needs_human_help: false,
      reason_for_referral: null,
      sources: [],
      mode: "education-notes",
      help_topic: "other",
    };
  }

  return {
    answer:
      language === "st"
        ? "Ha ke na tlhahiso e amohetsoeng e arabang potso ena ka bonnete, kahoo nke ke ka hakanya. U ka botsa ka lirekoto, kapa u kope hore motho a latelle."
        : "I don't have an approved note that answers this with confidence, so I won't guess. You can ask about records, or request a person to follow up.",
    next_steps:
      language === "st" ? ["Kopa thuso", "Botsa ka lirekoto"] : ["Request help", "Ask about the records to keep"],
    needs_human_help: true,
    reason_for_referral:
      language === "st"
        ? "Potso ena e kantle ho lintlha tsa thuto tse prototaipe ena."
        : "The question is outside the education notes in this prototype.",
    sources: [article("edu-limits").title],
    mode: "education-notes",
    help_topic: topic,
  };
}

export async function answerBuddy(
  input: unknown,
  options: { apiKey?: string; model?: string } = {},
): Promise<BuddyResponse> {
  const request = parseRequest(input);
  const local = answerLocally(request);
  const apiKey = options.apiKey?.trim();
  if (!apiKey) return local;

  try {
    const modelAnswer = await askOpenAI(request, apiKey, options.model?.trim() || "gpt-4o-mini");
    const safe = sanitize(modelAnswer, request);
    if (!safe) return local;
    if (isHighRisk(request.message) && (!safe.needs_human_help || hasRiskyContent(safe.answer))) return local;
    if (REGISTER.test(request.message) && hasRiskyContent(safe.answer)) return local;
    return safe;
  } catch {
    console.error("OpenAI request failed; using education notes.");
    return local;
  }
}

export function parseRequest(input: unknown): BuddyRequest {
  if (!input || typeof input !== "object") {
    throw new BuddyInputError("Send a question in the message field.");
  }
  const value = input as Record<string, unknown>;
  const message = cleanText(value.message, 2000);
  if (!message) throw new BuddyInputError("Send a question in the message field.");
  if (value.language !== "en" && value.language !== "st") {
    throw new BuddyInputError("Send a language of en or st.");
  }
  return {
    message,
    language: value.language,
    business: cleanBusiness(value.business),
    summary: cleanSummary(value.summary),
    journey_next: cleanText(value.journey_next, 160) || null,
  };
}

function responseLanguage(request: BuddyRequest): BuddyLanguage {
  if (request.language === "st" || /sesotho/i.test(request.message)) return "st";
  return "en";
}

function helpTopic(message: string): HelpTopic {
  if (REGISTER.test(message)) return "registration";
  if (RECORDS.test(message)) return "records";
  if (FILING.test(message)) return "filing";
  if (PAYMENT.test(message) && !TOTALS.test(message)) return "payments";
  if (OBLIGATIONS.test(message) || isHighRisk(message) || TIN.test(message)) return "understanding";
  return "other";
}

function decline(language: BuddyLanguage, topic: HelpTopic): BuddyResponse {
  const note = article("edu-limits");
  return {
    answer: language === "st" ? note.st : note.en,
    next_steps:
      language === "st"
        ? ["Kopa thuso ho motho", "Tsoela pele ho boloka lirekoto tsa thekiso le litšenyehelo"]
        : ["Request help from a person", "Keep recording sales and expenses"],
    needs_human_help: true,
    reason_for_referral:
      language === "st"
        ? "Litefiso, matsatsi a ho qetela, liforomo le chelete eo u lokelang ho e lefa li tlameha ho tsoa ho RSL. Nke ke ka li hakanya."
        : "Rates, deadlines, forms, and amounts to pay have to come from RSL. I won't guess them.",
    sources: [note.title],
    mode: "education-notes",
    help_topic: topic,
  };
}

function registrationAnswer(request: BuddyRequest, language: BuddyLanguage): BuddyResponse {
  const note = article("edu-registration");
  const told = toldClause(request, language);
  return {
    answer: `${language === "st" ? note.st : note.en} ${told}`.trim(),
    next_steps:
      language === "st"
        ? ["Sheba mohato oa ngoliso leetong la hau", "Kopa thuso haeba u batla motho a latelle", "Boloka lirekoto tsa letsatsi le letsatsi"]
        : ["Review the registration step on your journey", "Request help if you want a person to follow up", "Keep today's sales and expenses"],
    needs_human_help: true,
    reason_for_referral:
      language === "st"
        ? "Potso ea hore na khoebo e tlameha ho ngolisoa ke potso ea molao. Lintlha tsena ke thuto feela."
        : "Whether a business must register is an official question. These notes are education only.",
    sources: [note.title],
    mode: "education-notes",
    help_topic: "registration",
  };
}

function totalsAnswer(request: BuddyRequest, language: BuddyLanguage): BuddyResponse {
  const summary = request.summary;
  if (!summary) return fromArticle("edu-records", language, false, null, "records", request);
  const sales = maloti(summary.sales_this_month);
  const expenses = maloti(summary.expenses_this_month);
  const net = maloti(roundMoney(summary.sales_this_month - summary.expenses_this_month));
  const answer =
    language === "st"
      ? `Likhathing tsa kgwedi ena, lirekoto tsa hau li bontša thekiso ea ${sales} le litšenyehelo tsa ${expenses}. Phapang ke ${net}. Ke kakaretso ea lirekoto feela, eseng bili ea lekhetho kapa phaello e lekhethoang. U na le matsatsi a ${summary.days_with_records} a nang le lirekoto kgweding ena.`
      : `This month your records show sales of ${sales} and expenses of ${expenses}. The difference is ${net}. That is a record summary only, not a tax bill and not taxable profit. You have records on ${summary.days_with_records} day${summary.days_with_records === 1 ? "" : "s"} this month.`;
  return {
    answer,
    next_steps:
      language === "st"
        ? ["Kenya thekiso kapa tšenyehelo ea kajeno", "Sheba kakaretso ea kgwedi"]
        : ["Add today's sale or expense", "Open the monthly summary"],
    needs_human_help: false,
    reason_for_referral: null,
    sources: [RECORD_SOURCE, article("edu-net").title],
    mode: "education-notes",
    help_topic: "records",
  };
}

function nextAnswer(request: BuddyRequest, language: BuddyLanguage): BuddyResponse {
  const note = article("edu-next");
  const next = request.journey_next;
  const personal =
    language === "st"
      ? next
        ? `Mohato o latelang o bolokiloeng ke: ${next}.`
        : "Qala ka ho re bolella ka khoebo ea hau, ebe u boloka thekiso le litšenyehelo."
      : next
        ? `The next step saved for you is: ${next}.`
        : "Start by telling Buddy about your business, then record sales and expenses.";
  return {
    answer: `${personal} ${language === "st" ? note.st : note.en}`,
    next_steps:
      language === "st" ? ["Bula leeto la hau", "Kenya rekoto ea kajeno"] : ["Open your journey", "Record today's sales"],
    needs_human_help: false,
    reason_for_referral: null,
    sources: [note.title],
    mode: "education-notes",
    help_topic: "other",
  };
}

function sesothoOverview(request: BuddyRequest): BuddyResponse {
  const name = request.business?.name;
  const who = name ? `Bakeng sa ${name}, ` : "";
  return {
    answer: `${who}Lekhetho Buddy ke motsoalle oa khoebo ea hau. O boloka thekiso le litšenyehelo, o bontša mohato o latelang oa thuto, 'me o ka romela kōpo ea thuso ho motho prototaipe ena. Ha ke etse qeto ea lekhetho, ha ke bolele sekgahla, 'me ha ke ngodise khoebo le RSL. Phapang ea thekiso le litšenyehelo ha se bili ea lekhetho.`,
    next_steps: ["Boloka lirekoto tsa kajeno", "Botsa hore na o boloka life", "Kopa thuso haeba o sa tsebe"],
    needs_human_help: false,
    reason_for_referral: null,
    sources: [article("edu-limits").title, article("edu-records").title],
    mode: "education-notes",
    help_topic: "understanding",
  };
}

function fromArticle(
  id: string,
  language: BuddyLanguage,
  needsHelp: boolean,
  reason: string | null,
  topic: HelpTopic,
  request: BuddyRequest,
): BuddyResponse {
  const note = article(id);
  const extra = id === "edu-records" ? toldClause(request, language) : "";
  return {
    answer: `${language === "st" ? note.st : note.en}${extra ? ` ${extra}` : ""}`,
    next_steps: needsHelp
      ? language === "st"
        ? ["Kopa thuso", "Tsoela pele ho boloka lirekoto"]
        : ["Request help", "Keep recording sales and expenses"]
      : language === "st"
        ? ["Kenya thekiso ea kajeno", "Kenya tšenyehelo ha chelete e tsoa"]
        : ["Add today's sales", "Add an expense when money goes out"],
    needs_human_help: needsHelp,
    reason_for_referral: needsHelp ? reason : null,
    sources: [note.title],
    mode: "education-notes",
    help_topic: topic,
  };
}

function toldClause(request: BuddyRequest, language: BuddyLanguage): string {
  const business = request.business;
  if (!business?.name) return "";
  const registered =
    business.registered === "yes"
      ? language === "st"
        ? "u re u lumela hore e ngolisitsoe"
        : "you believe it is registered"
      : business.registered === "no"
        ? language === "st"
          ? "u re ha u lumele hore e ngolisitsoe"
          : "you believe it is not registered"
        : language === "st"
          ? "ha u na bonnete ka ngoliso"
          : "you are not sure about registration";
  return language === "st"
    ? `U boleletse Buddy hore ${business.name} ke ${business.kind} ${business.location}, 'me ${registered}. Seo ke polelo ea hau feela, eseng netefatso ea RSL.`
    : `You told Buddy that ${business.name} is a ${business.kind} in ${business.location}, and that ${registered}. That is only your note, not an RSL confirmation.`;
}

function hasRiskyContent(answer: string): boolean {
  return RISKY_CONTENT.test(answer);
}

function sanitize(value: unknown, request: BuddyRequest): BuddyResponse | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.answer !== "string" || !record.answer.trim()) return null;
  if (hasRiskyContent(record.answer)) return null;
  const nextSteps = Array.isArray(record.next_steps)
    ? record.next_steps.filter((step): step is string => typeof step === "string" && step.trim().length > 0).slice(0, 5)
    : [];
  const sources = Array.isArray(record.sources)
    ? record.sources.filter((source): source is string => typeof source === "string" && (ARTICLE_TITLES.has(source) || source === RECORD_SOURCE))
    : [];
  const topic = isHelpTopic(record.help_topic) ? record.help_topic : helpTopic(request.message);
  const needsHelp = record.needs_human_help === true || isHighRisk(request.message) || REGISTER.test(request.message);
  return {
    answer: record.answer.trim().slice(0, 4000),
    next_steps: nextSteps.map((step) => step.trim().slice(0, 180)),
    needs_human_help: needsHelp,
    reason_for_referral:
      typeof record.reason_for_referral === "string" && record.reason_for_referral.trim()
        ? record.reason_for_referral.trim().slice(0, 400)
        : needsHelp
          ? "This should be checked by a person. The assistant will not guess."
          : null,
    sources,
    mode: "assistant",
    help_topic: topic,
  };
}

async function askOpenAI(request: BuddyRequest, apiKey: string, model: string): Promise<unknown> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            message: request.message,
            language: request.language,
            business: request.business,
            summary: request.summary,
            journey_next: request.journey_next,
            articles: ARTICLES.map((item: Article) => ({ title: item.title, en: item.en, st: item.st })),
          }),
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI status ${response.status}`);
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenAI returned an empty answer.");
  return JSON.parse(content) as unknown;
}

function cleanBusiness(value: unknown): BuddyBusinessContext | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = cleanText(record.name, 80);
  if (!name) return null;
  return {
    name,
    kind: cleanText(record.kind, 40) || "business",
    location: cleanText(record.location, 80),
    activity_type: cleanText(record.activity_type, 40),
    registered: cleanText(record.registered, 20),
    has_tin: cleanText(record.has_tin, 20),
    record_method: cleanText(record.record_method, 40),
  };
}

function cleanSummary(value: unknown): BuddySummary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sales = Number(record.sales_this_month);
  const expenses = Number(record.expenses_this_month);
  const days = Number(record.days_with_records);
  if (![sales, expenses, days].every(Number.isFinite)) return null;
  if (sales < 0 || expenses < 0 || days < 0 || days > 31) return null;
  return {
    sales_this_month: roundMoney(sales),
    expenses_this_month: roundMoney(expenses),
    days_with_records: Math.round(days),
  };
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function isHelpTopic(value: unknown): value is HelpTopic {
  return (
    value === "registration" ||
    value === "records" ||
    value === "filing" ||
    value === "payments" ||
    value === "understanding" ||
    value === "other"
  );
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function maloti(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  const formatted = Math.abs(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}M ${formatted}`;
}
