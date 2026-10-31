import type {
  ActivityType,
  BusinessKind,
  ExpenseCategory,
  HelpStatus,
  HelpTopic,
  JourneyStatus,
  Language,
  RecordMethod,
  YesNoUnsure,
} from "./types";

function pick(language: Language, en: string, st: string): string {
  return language === "st" ? st : en;
}

const KINDS: Record<BusinessKind, [string, string]> = {
  shop: ["Shop", "Lebenkele"],
  salon: ["Salon", "Salon"],
  food: ["Food stall", "Setallo sa lijo"],
  taxi: ["Taxi", "Tekesi"],
  clothing: ["Clothing", "Liaparo"],
  services: ["Services", "Litšebeletso"],
  other: ["Other", "Tse ling"],
};

const ACTIVITIES: Record<ActivityType, [string, string]> = {
  permanent: ["Permanent", "E sa feleng"],
  seasonal: ["Seasonal", "Ea linako"],
  occasional: ["Occasional trading", "Ka linako tse ling"],
};

const RECORDS: Record<RecordMethod, [string, string]> = {
  notebook: ["Notebook", "Buka"],
  phone: ["Phone", "Fono"],
  spreadsheet: ["Spreadsheet", "Lenane"],
  none: ["I don't record them", "Ha ke li rekote"],
  other: ["Other", "Tse ling"],
};

const YES: Record<YesNoUnsure, [string, string]> = {
  yes: ["Yes", "E"],
  no: ["No", "Che"],
  not_sure: ["Not sure", "Ha ke tsebe"],
};

const EXPENSES: Record<ExpenseCategory, [string, string]> = {
  stock: ["Stock", "Thepa"],
  transport: ["Transport", "Lipalangoang"],
  rent: ["Rent", "Rente"],
  utilities: ["Utilities", "Litšebeletso tsa motheo"],
  wages: ["Wages", "Meputso"],
  other: ["Other", "Tse ling"],
};

const JOURNEY: Record<JourneyStatus, [string, string]> = {
  not_started: ["Not started", "Ha e so qale"],
  in_progress: ["In progress", "E ntse e tsoela pele"],
  completed: ["Completed", "E phethiloe"],
  needs_assistance: ["Needs assistance", "E hloka thuso"],
};

const TOPICS: Record<HelpTopic, [string, string]> = {
  registration: ["Registration", "Ngoliso"],
  records: ["Records", "Lirekoto"],
  filing: ["Filing", "Ho kenya pego"],
  payments: ["Payments", "Litefo"],
  understanding: ["Understanding a tax requirement", "Ho utloisisa tlhoko ea lekhetho"],
  other: ["Other", "Tse ling"],
};

const HELP_STATUS: Record<HelpStatus, [string, string]> = {
  open: ["Open", "E bulehile"],
  in_progress: ["In progress", "E ntse e tsoela pele"],
  resolved: ["Resolved", "E rarollotsoe"],
};

export function kindLabel(kind: BusinessKind, other: string | null, language: Language): string {
  if (kind === "other" && other) return other;
  const [en, st] = KINDS[kind];
  return pick(language, en, st);
}

export function activityLabel(value: ActivityType, language: Language): string {
  const [en, st] = ACTIVITIES[value];
  return pick(language, en, st);
}

export function recordMethodLabel(value: RecordMethod, other: string | null, language: Language): string {
  if (value === "other" && other) return other;
  const [en, st] = RECORDS[value];
  return pick(language, en, st);
}

export function yesNoLabel(value: YesNoUnsure, language: Language): string {
  const [en, st] = YES[value];
  return pick(language, en, st);
}

export function expenseLabel(value: ExpenseCategory, language: Language): string {
  const [en, st] = EXPENSES[value];
  return pick(language, en, st);
}

export function journeyStatusLabel(value: JourneyStatus, language: Language): string {
  const [en, st] = JOURNEY[value];
  return pick(language, en, st);
}

export function topicLabel(value: HelpTopic, language: Language): string {
  const [en, st] = TOPICS[value];
  return pick(language, en, st);
}

export function helpStatusLabel(value: HelpStatus, language: Language): string {
  const [en, st] = HELP_STATUS[value];
  return pick(language, en, st);
}

export const KIND_OPTIONS = Object.keys(KINDS) as BusinessKind[];
export const ACTIVITY_OPTIONS = Object.keys(ACTIVITIES) as ActivityType[];
export const RECORD_OPTIONS = Object.keys(RECORDS) as RecordMethod[];
export const YES_OPTIONS = Object.keys(YES) as YesNoUnsure[];
export const EXPENSE_OPTIONS = Object.keys(EXPENSES) as ExpenseCategory[];
export const TOPIC_OPTIONS = Object.keys(TOPICS) as HelpTopic[];
