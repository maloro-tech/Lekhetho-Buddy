export type Role = "owner" | "officer";
export type Language = "en" | "st";
export type YesNoUnsure = "yes" | "no" | "not_sure";
export type ActivityType = "permanent" | "seasonal" | "occasional";
export type BusinessKind = "shop" | "salon" | "food" | "taxi" | "clothing" | "services" | "other";
export type RecordMethod = "notebook" | "phone" | "spreadsheet" | "none" | "other";
export type ExpenseCategory = "stock" | "transport" | "rent" | "utilities" | "wages" | "other";
export type JourneyStatus = "not_started" | "in_progress" | "completed" | "needs_assistance";
export type HelpTopic = "registration" | "records" | "filing" | "payments" | "understanding" | "other";
export type HelpStatus = "open" | "in_progress" | "resolved";
export type NoteAction = "note" | "assign" | "in_progress" | "resolved";

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  preferred_language: Language;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  kind: BusinessKind;
  kind_other: string | null;
  location: string;
  activity_type: ActivityType;
  registered: YesNoUnsure;
  has_tin: YesNoUnsure;
  record_method: RecordMethod;
  record_method_other: string | null;
  preferred_language: Language;
  share_summary_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessContact {
  business_id: string;
  owner_id: string;
  phone: string | null;
  contact_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile extends Business {
  phone: string | null;
  contact_consent: boolean;
}

export interface SalesEntry {
  id: string;
  business_id: string;
  owner_id: string;
  amount: number;
  entry_date: string;
  note: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseEntry {
  id: string;
  business_id: string;
  owner_id: string;
  amount: number;
  entry_date: string;
  category: ExpenseCategory;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneyStep {
  id: string;
  business_id: string;
  owner_id: string;
  step_key: string;
  sort_order: number;
  title_en: string;
  title_st: string;
  explanation_en: string;
  explanation_st: string;
  status: JourneyStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  owner_id: string;
  business_id: string;
  created_at: string;
  updated_at: string;
}

export interface BuddyPayload {
  answer: string;
  next_steps: string[];
  needs_human_help: boolean;
  reason_for_referral: string | null;
  sources: string[];
  mode: "education-notes" | "assistant";
  help_topic: HelpTopic;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  owner_id: string;
  role: "user" | "assistant";
  content: string;
  payload: BuddyPayload | null;
  created_at: string;
}

export interface HelpRequest {
  id: string;
  owner_id: string;
  business_id: string;
  topic: HelpTopic;
  description: string;
  language: Language;
  status: HelpStatus;
  reference_number: string;
  assignee_id: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficerNote {
  id: string;
  help_request_id: string;
  officer_id: string;
  body: string;
  action: NoteAction;
  created_at: string;
}

export interface StoredUser extends Profile {
  password_hash: string;
}

export interface Database {
  users: StoredUser[];
  businesses: Business[];
  contacts: BusinessContact[];
  sales: SalesEntry[];
  expenses: ExpenseEntry[];
  journey: JourneyStep[];
  chat_sessions: ChatSession[];
  chat_messages: ChatMessage[];
  help_requests: HelpRequest[];
  officer_notes: OfficerNote[];
  drafts: Record<string, Partial<BusinessInput>>;
  reference_seq: number;
}

export interface BusinessInput {
  name: string;
  kind: BusinessKind;
  kind_other: string | null;
  location: string;
  activity_type: ActivityType;
  registered: YesNoUnsure;
  has_tin: YesNoUnsure;
  record_method: RecordMethod;
  record_method_other: string | null;
  preferred_language: Language;
  phone: string | null;
  contact_consent: boolean;
  share_summary_consent: boolean;
}

export interface SaleInput {
  amount: number;
  entry_date: string;
  note: string | null;
  category: string | null;
}

export interface ExpenseInput {
  amount: number;
  entry_date: string;
  category: ExpenseCategory;
  note: string | null;
}

export interface OfficerBusiness {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  name: string;
  kind: BusinessKind;
  kind_other: string | null;
  location: string;
  activity_type: ActivityType;
  registered: YesNoUnsure;
  has_tin: YesNoUnsure;
  record_method: RecordMethod;
  preferred_language: Language;
  share_summary_consent: boolean;
  created_at: string;
}

export interface RecordSummary {
  sales: number;
  expenses: number;
  net: number;
  days_with_records: number;
  month_label: string;
}

export interface OfficerRequest extends HelpRequest {
  business_name: string;
  owner_name: string;
  owner_email: string;
}

export interface OfficerRequestDetail {
  request: OfficerRequest;
  notes: Array<OfficerNote & { officer_name: string }>;
  summary: RecordSummary | null;
}

export interface OfficerBusinessDetail {
  business: OfficerBusiness;
  summary: RecordSummary | null;
  requests: Array<Pick<HelpRequest, "id" | "reference_number" | "topic" | "status" | "created_at">>;
}

export interface OfficerOverview {
  businesses: number;
  requests: number;
  awaiting: number;
}

export interface OfficerActivity extends OfficerNote {
  officer_name: string;
  reference_number: string;
}
