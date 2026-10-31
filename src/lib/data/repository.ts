import type {
  BuddyPayload,
  BusinessInput,
  BusinessProfile,
  ChatMessage,
  ExpenseEntry,
  ExpenseInput,
  HelpRequest,
  HelpStatus,
  HelpTopic,
  JourneyStatus,
  JourneyStep,
  Language,
  OfficerActivity,
  OfficerBusiness,
  OfficerBusinessDetail,
  OfficerOverview,
  OfficerRequest,
  OfficerRequestDetail,
  Profile,
  SaleInput,
  SalesEntry,
  YesNoUnsure,
} from "../types";

/**
 * Persistence contract shared by the local demo and a future Supabase adapter.
 * Owner methods must only return the signed-in owner's rows.
 * Officer methods must reject every other role before reading shared rows.
 * Line-item notes stay with the owner. Officers receive consented monthly totals only.
 */
export interface Repository {
  init(): Promise<void>;
  currentUser(): Profile | null;
  signUp(input: { firstName: string; email: string; password: string }): Promise<Profile>;
  signIn(input: { email: string; password: string }): Promise<Profile>;
  signOut(): void;
  setLanguage(language: Language): Profile;
  getBusiness(): BusinessProfile | null;
  saveBusiness(input: BusinessInput): BusinessProfile;
  getDraft(): Partial<BusinessInput> | null;
  saveDraft(draft: Partial<BusinessInput>): void;
  clearDraft(): void;
  listSales(): SalesEntry[];
  listExpenses(): ExpenseEntry[];
  addSale(input: SaleInput): SalesEntry;
  updateSale(id: string, input: SaleInput): SalesEntry;
  deleteSale(id: string): void;
  addExpense(input: ExpenseInput): ExpenseEntry;
  updateExpense(id: string, input: ExpenseInput): ExpenseEntry;
  deleteExpense(id: string): void;
  listJourney(): JourneyStep[];
  setJourneyStatus(id: string, status: JourneyStatus): JourneyStep;
  listMessages(): ChatMessage[];
  addMessage(input: { role: "user" | "assistant"; content: string; payload: BuddyPayload | null }): ChatMessage;
  listMyHelpRequests(): HelpRequest[];
  createHelpRequest(input: { topic: HelpTopic; description: string; language: Language }): HelpRequest;
  officerOverview(): OfficerOverview;
  officerListRequests(filter: { topic: HelpTopic | "all"; status: HelpStatus | "all" }): OfficerRequest[];
  officerGetRequest(id: string): OfficerRequestDetail;
  officerMarkInProgress(id: string): OfficerRequestDetail;
  officerAddNote(id: string, body: string): OfficerRequestDetail;
  officerResolve(id: string, resolution: string): OfficerRequestDetail;
  officerListBusinesses(filter: { search: string; registered: YesNoUnsure | "all" }): OfficerBusiness[];
  officerGetBusiness(id: string): OfficerBusinessDetail;
  officerListActivity(): OfficerActivity[];
}
