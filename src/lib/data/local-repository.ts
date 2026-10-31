import { addDays, isValidDate, monthKey, monthLabel, todayISO } from "../dates";
import { roundMoney } from "../format";
import { JOURNEY_TEMPLATE, registrationStatus } from "../journey";
import { netMaloti, sumMaloti } from "../totals";
import type {
  BuddyPayload,
  Business,
  BusinessContact,
  BusinessInput,
  BusinessProfile,
  Database,
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
  RecordSummary,
  SaleInput,
  SalesEntry,
  StoredUser,
  YesNoUnsure,
} from "../types";
import type { Repository } from "./repository";

const DB_KEY = "lekhetho.db.v1";
const SESSION_KEY = "lekhetho.session.v1";
export const DEMO_PASSWORD = "buddy-demo";
export const DEMO_OWNER_EMAIL = "thabo@lekhetho.demo";
export const DEMO_OFFICER_EMAIL = "mpho@lekhetho.demo";

export class AccessError extends Error {
  constructor(message = "You do not have access to this.") {
    super(message);
    this.name = "AccessError";
  }
}

const KINDS = new Set(["shop", "salon", "food", "taxi", "clothing", "services", "other"]);
const ACTIVITIES = new Set(["permanent", "seasonal", "occasional"]);
const YES = new Set(["yes", "no", "not_sure"]);
const METHODS = new Set(["notebook", "phone", "spreadsheet", "none", "other"]);
const EXPENSES = new Set(["stock", "transport", "rent", "utilities", "wages", "other"]);
const TOPICS = new Set(["registration", "records", "filing", "payments", "understanding", "other"]);
const JOURNEY = new Set(["not_started", "in_progress", "completed", "needs_assistance"]);

function now(): string {
  return new Date().toISOString();
}

function nid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(`lekhetho-local-v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const probe = "__lekhetho_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

function publicUser(user: StoredUser): Profile {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    preferred_language: user.preferred_language,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function emptyDb(): Database {
  return {
    users: [],
    businesses: [],
    contacts: [],
    sales: [],
    expenses: [],
    journey: [],
    chat_sessions: [],
    chat_messages: [],
    help_requests: [],
    officer_notes: [],
    drafts: {},
    reference_seq: 2000,
  };
}

export class LocalRepository implements Repository {
  private db: Database = emptyDb();
  private sessionId: string | null = null;
  ready = false;

  async init(): Promise<void> {
    if (this.ready) return;
    const store = storage();
    const raw = store?.getItem(DB_KEY);
    if (raw) {
      try {
        this.db = { ...emptyDb(), ...JSON.parse(raw) } as Database;
      } catch {
        this.db = await this.seed();
        this.persist();
      }
    } else {
      this.db = await this.seed();
      this.persist();
    }
    this.sessionId = store?.getItem(SESSION_KEY) ?? null;
    if (this.sessionId && !this.db.users.some((user) => user.id === this.sessionId)) {
      this.sessionId = null;
      this.writeSession();
    }
    this.ready = true;
  }

  currentUser(): Profile | null {
    this.assertReady();
    if (!this.sessionId) return null;
    const user = this.db.users.find((item) => item.id === this.sessionId);
    return user ? publicUser(user) : null;
  }

  async signUp(input: { firstName: string; email: string; password: string }): Promise<Profile> {
    this.assertReady();
    const firstName = input.firstName.trim();
    const email = normalizeEmail(input.email);
    if (!/^[\p{L}\p{M}][\p{L}\p{M} '\-]{0,59}$/u.test(firstName)) {
      throw new Error("Enter your name using letters.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email.");
    if (input.password.length < 8) throw new Error("Use at least 8 characters for the password.");
    if (this.db.users.some((user) => user.email === email)) {
      throw new Error("That email already has an account.");
    }
    const timestamp = now();
    const user: StoredUser = {
      id: nid("usr"),
      email,
      first_name: firstName,
      preferred_language: readLanguage(),
      role: "owner",
      password_hash: await hashPassword(input.password),
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.db.users.push(user);
    this.sessionId = user.id;
    this.persist();
    this.writeSession();
    return publicUser(user);
  }

  async signIn(input: { email: string; password: string }): Promise<Profile> {
    this.assertReady();
    const email = normalizeEmail(input.email);
    const hash = await hashPassword(input.password);
    const user = this.db.users.find((item) => item.email === email);
    if (!user || user.password_hash !== hash) {
      throw new Error("Email or password does not match.");
    }
    this.sessionId = user.id;
    this.writeSession();
    return publicUser(user);
  }

  signOut(): void {
    this.sessionId = null;
    this.writeSession();
  }

  setLanguage(language: Language): Profile {
    const user = this.requireUser();
    const row = this.mustUser(user.id);
    row.preferred_language = language;
    row.updated_at = now();
    const business = this.db.businesses.find((item) => item.owner_id === user.id);
    if (business) {
      business.preferred_language = language;
      business.updated_at = now();
    }
    writeLanguage(language);
    this.persist();
    return publicUser(row);
  }

  getBusiness(): BusinessProfile | null {
    const user = this.requireOwner();
    const business = this.db.businesses.find((item) => item.owner_id === user.id);
    if (!business) return null;
    const contact = this.db.contacts.find((item) => item.business_id === business.id);
    return {
      ...business,
      phone: contact?.phone ?? null,
      contact_consent: contact?.contact_consent ?? false,
    };
  }

  saveBusiness(input: BusinessInput): BusinessProfile {
    const user = this.requireOwner();
    assertBusiness(input);
    const timestamp = now();
    const row = this.db.users.find((item) => item.id === user.id);
    if (row) {
      row.preferred_language = input.preferred_language;
      row.updated_at = timestamp;
    }
    writeLanguage(input.preferred_language);
    let business = this.db.businesses.find((item) => item.owner_id === user.id);
    if (!business) {
      business = {
        id: nid("biz"),
        owner_id: user.id,
        name: input.name,
        kind: input.kind,
        kind_other: input.kind_other,
        location: input.location,
        activity_type: input.activity_type,
        registered: input.registered,
        has_tin: input.has_tin,
        record_method: input.record_method,
        record_method_other: input.record_method_other,
        preferred_language: input.preferred_language,
        share_summary_consent: input.share_summary_consent,
        created_at: timestamp,
        updated_at: timestamp,
      };
      this.db.businesses.push(business);
      this.db.journey.push(...this.makeJourney(business, timestamp));
    } else {
      const previous = business.registered;
      business.name = input.name;
      business.kind = input.kind;
      business.kind_other = input.kind_other;
      business.location = input.location;
      business.activity_type = input.activity_type;
      business.registered = input.registered;
      business.has_tin = input.has_tin;
      business.record_method = input.record_method;
      business.record_method_other = input.record_method_other;
      business.preferred_language = input.preferred_language;
      business.share_summary_consent = input.share_summary_consent;
      business.updated_at = timestamp;
      if (previous !== input.registered) {
        const step = this.db.journey.find((item) => item.business_id === business!.id && item.step_key === "registration");
        if (step) {
          step.status = registrationStatus(input.registered);
          step.updated_at = timestamp;
        }
      }
    }
    const contact = this.upsertContact(business, input, timestamp);
    delete this.db.drafts[user.id];
    this.persist();
    return { ...business, phone: contact.phone, contact_consent: contact.contact_consent };
  }

  getDraft(): Partial<BusinessInput> | null {
    const user = this.requireOwner();
    return this.db.drafts[user.id] ?? null;
  }

  saveDraft(draft: Partial<BusinessInput>): void {
    const user = this.requireOwner();
    this.db.drafts[user.id] = draft;
    this.persist();
  }

  clearDraft(): void {
    const user = this.requireOwner();
    delete this.db.drafts[user.id];
    this.persist();
  }

  listSales(): SalesEntry[] {
    const user = this.requireOwner();
    return this.db.sales
      .filter((entry) => entry.owner_id === user.id)
      .sort(byDateDesc);
  }

  listExpenses(): ExpenseEntry[] {
    const user = this.requireOwner();
    return this.db.expenses
      .filter((entry) => entry.owner_id === user.id)
      .sort(byDateDesc);
  }

  addSale(input: SaleInput): SalesEntry {
    const user = this.requireOwner();
    const business = this.ownBusiness();
    const entry: SalesEntry = {
      id: nid("sale"),
      business_id: business.id,
      owner_id: user.id,
      ...normalizeSale(input),
      created_at: now(),
      updated_at: now(),
    };
    this.db.sales.push(entry);
    this.syncHabit(user.id);
    this.persist();
    return entry;
  }

  updateSale(id: string, input: SaleInput): SalesEntry {
    const user = this.requireOwner();
    const entry = this.db.sales.find((item) => item.id === id && item.owner_id === user.id);
    if (!entry) throw new Error("That sale was not found.");
    Object.assign(entry, normalizeSale(input), { updated_at: now() });
    this.syncHabit(user.id);
    this.persist();
    return entry;
  }

  deleteSale(id: string): void {
    const user = this.requireOwner();
    const before = this.db.sales.length;
    this.db.sales = this.db.sales.filter((item) => !(item.id === id && item.owner_id === user.id));
    if (this.db.sales.length === before) throw new Error("That sale was not found.");
    this.syncHabit(user.id);
    this.persist();
  }

  addExpense(input: ExpenseInput): ExpenseEntry {
    const user = this.requireOwner();
    const business = this.ownBusiness();
    const entry: ExpenseEntry = {
      id: nid("exp"),
      business_id: business.id,
      owner_id: user.id,
      ...normalizeExpense(input),
      created_at: now(),
      updated_at: now(),
    };
    this.db.expenses.push(entry);
    this.syncHabit(user.id);
    this.persist();
    return entry;
  }

  updateExpense(id: string, input: ExpenseInput): ExpenseEntry {
    const user = this.requireOwner();
    const entry = this.db.expenses.find((item) => item.id === id && item.owner_id === user.id);
    if (!entry) throw new Error("That expense was not found.");
    Object.assign(entry, normalizeExpense(input), { updated_at: now() });
    this.syncHabit(user.id);
    this.persist();
    return entry;
  }

  deleteExpense(id: string): void {
    const user = this.requireOwner();
    const before = this.db.expenses.length;
    this.db.expenses = this.db.expenses.filter((item) => !(item.id === id && item.owner_id === user.id));
    if (this.db.expenses.length === before) throw new Error("That expense was not found.");
    this.syncHabit(user.id);
    this.persist();
  }

  listJourney(): JourneyStep[] {
    const user = this.requireOwner();
    return this.db.journey
      .filter((step) => step.owner_id === user.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  setJourneyStatus(id: string, status: JourneyStatus): JourneyStep {
    const user = this.requireOwner();
    if (!JOURNEY.has(status)) throw new Error("That status is not available.");
    const step = this.db.journey.find((item) => item.id === id && item.owner_id === user.id);
    if (!step) throw new Error("That step was not found.");
    step.status = status;
    step.updated_at = now();
    this.persist();
    return step;
  }

  listMessages() {
    const user = this.requireOwner();
    const session = this.db.chat_sessions.find((item) => item.owner_id === user.id);
    if (!session) return [];
    return this.db.chat_messages
      .filter((message) => message.session_id === session.id && message.owner_id === user.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  addMessage(input: { role: "user" | "assistant"; content: string; payload: BuddyPayload | null }) {
    const user = this.requireOwner();
    const business = this.ownBusiness();
    let session = this.db.chat_sessions.find((item) => item.owner_id === user.id);
    const timestamp = now();
    if (!session) {
      session = {
        id: nid("chat"),
        owner_id: user.id,
        business_id: business.id,
        created_at: timestamp,
        updated_at: timestamp,
      };
      this.db.chat_sessions.push(session);
    } else {
      session.updated_at = timestamp;
    }
    const message = {
      id: nid("msg"),
      session_id: session.id,
      owner_id: user.id,
      role: input.role,
      content: input.content.trim(),
      payload: input.payload,
      created_at: timestamp,
    };
    this.db.chat_messages.push(message);
    this.persist();
    return message;
  }

  listMyHelpRequests(): HelpRequest[] {
    const user = this.requireOwner();
    return this.db.help_requests
      .filter((request) => request.owner_id === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  createHelpRequest(input: { topic: HelpTopic; description: string; language: Language }): HelpRequest {
    const user = this.requireOwner();
    const business = this.ownBusiness();
    if (!TOPICS.has(input.topic)) throw new Error("Choose a help topic.");
    const description = input.description.trim();
    if (description.length < 10) throw new Error("Describe the question in at least a few words.");
    if (description.length > 2000) throw new Error("Keep the question under 2000 characters.");
    if (input.language !== "en" && input.language !== "st") throw new Error("Choose a language.");
    this.db.reference_seq += 1;
    const timestamp = now();
    const request: HelpRequest = {
      id: nid("help"),
      owner_id: user.id,
      business_id: business.id,
      topic: input.topic,
      description,
      language: input.language,
      status: "open",
      reference_number: `LB-${String(this.db.reference_seq).padStart(4, "0")}`,
      assignee_id: null,
      resolution: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.db.help_requests.push(request);
    this.persist();
    return request;
  }

  officerOverview(): OfficerOverview {
    this.requireOfficer();
    return {
      businesses: this.db.businesses.length,
      requests: this.db.help_requests.length,
      awaiting: this.db.help_requests.filter((request) => request.status !== "resolved").length,
    };
  }

  officerListRequests(filter: { topic: HelpTopic | "all"; status: HelpStatus | "all" }): OfficerRequest[] {
    this.requireOfficer();
    return this.db.help_requests
      .filter((request) => filter.topic === "all" || request.topic === filter.topic)
      .filter((request) => filter.status === "all" || request.status === filter.status)
      .map((request) => this.hydrateRequest(request))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  officerGetRequest(id: string): OfficerRequestDetail {
    this.requireOfficer();
    const request = this.db.help_requests.find((item) => item.id === id);
    if (!request) throw new Error("That request was not found.");
    const business = this.db.businesses.find((item) => item.id === request.business_id);
    return {
      request: this.hydrateRequest(request),
      notes: this.notesFor(request.id),
      summary: business ? this.summaryFor(business) : null,
    };
  }

  officerMarkInProgress(id: string): OfficerRequestDetail {
    const officer = this.requireOfficer();
    const request = this.mustRequest(id);
    if (request.status === "resolved") throw new Error("This request is already resolved.");
    request.status = "in_progress";
    request.assignee_id = officer.id;
    request.updated_at = now();
    this.addOfficerNote(request.id, officer.id, "Marked in progress and assigned.", "in_progress");
    this.persist();
    return this.officerGetRequest(id);
  }

  officerAddNote(id: string, body: string): OfficerRequestDetail {
    const officer = this.requireOfficer();
    const request = this.mustRequest(id);
    const note = body.trim();
    if (note.length < 2) throw new Error("Write a note before saving it.");
    this.addOfficerNote(request.id, officer.id, note, "note");
    request.updated_at = now();
    this.persist();
    return this.officerGetRequest(id);
  }

  officerResolve(id: string, resolution: string): OfficerRequestDetail {
    const officer = this.requireOfficer();
    const request = this.mustRequest(id);
    const outcome = resolution.trim();
    if (outcome.length < 5) throw new Error("Write the outcome before resolving.");
    request.status = "resolved";
    request.resolution = outcome;
    request.assignee_id = request.assignee_id ?? officer.id;
    request.updated_at = now();
    this.addOfficerNote(request.id, officer.id, outcome, "resolved");
    this.persist();
    return this.officerGetRequest(id);
  }

  officerListBusinesses(filter: { search: string; registered: YesNoUnsure | "all" }): OfficerBusiness[] {
    this.requireOfficer();
    const search = filter.search.trim().toLowerCase();
    return this.db.businesses
      .map((business) => this.toOfficerBusiness(business))
      .filter((business) => filter.registered === "all" || business.registered === filter.registered)
      .filter((business) => {
        if (!search) return true;
        return [business.name, business.owner_name, business.owner_email, business.location, business.kind]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  officerGetBusiness(id: string): OfficerBusinessDetail {
    this.requireOfficer();
    const business = this.db.businesses.find((item) => item.id === id);
    if (!business) throw new Error("That business was not found.");
    return {
      business: this.toOfficerBusiness(business),
      summary: this.summaryFor(business),
      requests: this.db.help_requests
        .filter((request) => request.business_id === business.id)
        .map((request) => ({
          id: request.id,
          reference_number: request.reference_number,
          topic: request.topic,
          status: request.status,
          created_at: request.created_at,
        })),
    };
  }

  officerListActivity(): OfficerActivity[] {
    this.requireOfficer();
    return this.db.officer_notes
      .map((note) => {
        const officer = this.db.users.find((user) => user.id === note.officer_id);
        const request = this.db.help_requests.find((item) => item.id === note.help_request_id);
        return {
          ...note,
          officer_name: officer?.first_name ?? "Officer",
          reference_number: request?.reference_number ?? "Request",
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 50);
  }

  private async seed(): Promise<Database> {
    const db = emptyDb();
    const timestamp = now();
    const password_hash = await hashPassword(DEMO_PASSWORD);
    const owner: StoredUser = {
      id: "usr_thabo",
      email: DEMO_OWNER_EMAIL,
      first_name: "Thabo",
      preferred_language: "en",
      role: "owner",
      password_hash,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const officer: StoredUser = {
      id: "usr_mpho",
      email: DEMO_OFFICER_EMAIL,
      first_name: "Mpho",
      preferred_language: "en",
      role: "officer",
      password_hash,
      created_at: timestamp,
      updated_at: timestamp,
    };
    db.users.push(owner, officer);
    const business: Business = {
      id: "biz_thabo",
      owner_id: owner.id,
      name: "Maseru Fresh Produce",
      kind: "shop",
      kind_other: null,
      location: "Maseru",
      activity_type: "permanent",
      registered: "not_sure",
      has_tin: "not_sure",
      record_method: "notebook",
      record_method_other: null,
      preferred_language: "en",
      share_summary_consent: true,
      created_at: timestamp,
      updated_at: timestamp,
    };
    db.businesses.push(business);
    db.contacts.push({
      business_id: business.id,
      owner_id: owner.id,
      phone: null,
      contact_consent: false,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const today = todayISO();
    db.sales.push(
      {
        id: "sale_seed_today",
        business_id: business.id,
        owner_id: owner.id,
        amount: 800,
        entry_date: today,
        note: "Morning vegetables",
        category: "goods",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "sale_seed_yesterday",
        business_id: business.id,
        owner_id: owner.id,
        amount: 400,
        entry_date: addDays(today, -1),
        note: "Afternoon stall",
        category: "goods",
        created_at: timestamp,
        updated_at: timestamp,
      },
    );
    db.expenses.push({
      id: "exp_seed",
      business_id: business.id,
      owner_id: owner.id,
      amount: 150,
      entry_date: addDays(today, -1),
      category: "stock",
      note: "Cabbage from the farm",
      created_at: timestamp,
      updated_at: timestamp,
    });
    db.journey.push(...makeJourneyRows(business, timestamp));
    const habit = db.journey.find((step) => step.step_key === "habit");
    if (habit) habit.status = "in_progress";
    db.reference_seq = 2001;
    db.help_requests.push({
      id: "help_seed",
      owner_id: owner.id,
      business_id: business.id,
      topic: "registration",
      description: "I am not sure whether my produce stall needs to register. Please explain the next question I should ask RSL. This is a demo request.",
      language: "en",
      status: "open",
      reference_number: "LB-2001",
      assignee_id: null,
      resolution: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    return db;
  }

  private persist() {
    const store = storage();
    if (!store) return;
    store.setItem(DB_KEY, JSON.stringify(this.db));
  }

  private writeSession() {
    const store = storage();
    if (!store) return;
    if (this.sessionId) store.setItem(SESSION_KEY, this.sessionId);
    else store.removeItem(SESSION_KEY);
  }

  private assertReady() {
    if (!this.ready) throw new Error("Lekhetho Buddy is still loading.");
  }

  private requireUser(): Profile {
    const user = this.currentUser();
    if (!user) throw new AccessError("Sign in to continue.");
    return user;
  }

  private requireOwner(): Profile {
    const user = this.requireUser();
    if (user.role !== "owner") throw new AccessError("This area is for a business owner.");
    return user;
  }

  private requireOfficer(): Profile {
    const user = this.requireUser();
    if (user.role !== "officer") throw new AccessError("This desk is for an RSL officer.");
    return user;
  }

  private mustUser(id: string): StoredUser {
    const user = this.db.users.find((item) => item.id === id);
    if (!user) throw new Error("That account was not found.");
    return user;
  }

  private ownBusiness(): Business {
    const user = this.requireOwner();
    const business = this.db.businesses.find((item) => item.owner_id === user.id);
    if (!business) throw new Error("Tell Buddy about your business first.");
    return business;
  }

  private mustRequest(id: string): HelpRequest {
    const request = this.db.help_requests.find((item) => item.id === id);
    if (!request) throw new Error("That request was not found.");
    return request;
  }

  private makeJourney(business: Business, timestamp: string): JourneyStep[] {
    return makeJourneyRows(business, timestamp);
  }

  private upsertContact(business: Business, input: BusinessInput, timestamp: string): BusinessContact {
    let contact = this.db.contacts.find((item) => item.business_id === business.id);
    if (!contact) {
      contact = {
        business_id: business.id,
        owner_id: business.owner_id,
        phone: input.phone,
        contact_consent: input.contact_consent,
        created_at: timestamp,
        updated_at: timestamp,
      };
      this.db.contacts.push(contact);
      return contact;
    }
    contact.phone = input.phone;
    contact.contact_consent = input.contact_consent;
    contact.updated_at = timestamp;
    return contact;
  }

  private syncHabit(ownerId: string) {
    const step = this.db.journey.find((item) => item.owner_id === ownerId && item.step_key === "habit");
    if (!step || step.status === "completed" || step.status === "needs_assistance") return;
    const count =
      this.db.sales.filter((entry) => entry.owner_id === ownerId).length +
      this.db.expenses.filter((entry) => entry.owner_id === ownerId).length;
    step.status = count > 0 ? "in_progress" : "not_started";
    step.updated_at = now();
  }

  private hydrateRequest(request: HelpRequest): OfficerRequest {
    const business = this.db.businesses.find((item) => item.id === request.business_id);
    const owner = this.db.users.find((item) => item.id === request.owner_id);
    return {
      ...request,
      business_name: business?.name ?? "Business",
      owner_name: owner?.first_name ?? "Owner",
      owner_email: owner?.email ?? "",
    };
  }

  private notesFor(requestId: string) {
    return this.db.officer_notes
      .filter((note) => note.help_request_id === requestId)
      .map((note) => ({
        ...note,
        officer_name: this.db.users.find((user) => user.id === note.officer_id)?.first_name ?? "Officer",
      }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  private addOfficerNote(requestId: string, officerId: string, body: string, action: OfficerNoteAction) {
    this.db.officer_notes.push({
      id: nid("note"),
      help_request_id: requestId,
      officer_id: officerId,
      body,
      action,
      created_at: now(),
    });
  }

  private toOfficerBusiness(business: Business): OfficerBusiness {
    const owner = this.db.users.find((user) => user.id === business.owner_id);
    return {
      id: business.id,
      owner_id: business.owner_id,
      owner_name: owner?.first_name ?? "Owner",
      owner_email: owner?.email ?? "",
      name: business.name,
      kind: business.kind,
      kind_other: business.kind_other,
      location: business.location,
      activity_type: business.activity_type,
      registered: business.registered,
      has_tin: business.has_tin,
      record_method: business.record_method,
      preferred_language: business.preferred_language,
      share_summary_consent: business.share_summary_consent,
      created_at: business.created_at,
    };
  }

  private summaryFor(business: Business): RecordSummary | null {
    if (!business.share_summary_consent) return null;
    const key = monthKey();
    const sales = this.db.sales.filter((entry) => entry.business_id === business.id && entry.entry_date.startsWith(key));
    const expenses = this.db.expenses.filter((entry) => entry.business_id === business.id && entry.entry_date.startsWith(key));
    const salesTotal = sumMaloti(sales.map((entry) => entry.amount));
    const expensesTotal = sumMaloti(expenses.map((entry) => entry.amount));
    return {
      sales: salesTotal,
      expenses: expensesTotal,
      net: netMaloti(salesTotal, expensesTotal),
      days_with_records: new Set([...sales.map((entry) => entry.entry_date), ...expenses.map((entry) => entry.entry_date)]).size,
      month_label: monthLabel(key),
    };
  }
}

type OfficerNoteAction = "note" | "assign" | "in_progress" | "resolved";

function makeJourneyRows(business: Business, timestamp: string): JourneyStep[] {
  return JOURNEY_TEMPLATE.map((step) => ({
    id: nid("step"),
    business_id: business.id,
    owner_id: business.owner_id,
    step_key: step.step_key,
    sort_order: step.sort_order,
    title_en: step.title_en,
    title_st: step.title_st,
    explanation_en: step.explanation_en,
    explanation_st: step.explanation_st,
    status: step.step_key === "about" ? "completed" : step.step_key === "registration" ? registrationStatus(business.registered) : "not_started",
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

function byDateDesc(a: { entry_date: string; created_at: string }, b: { entry_date: string; created_at: string }) {
  return b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at);
}

function normalizeSale(input: SaleInput) {
  assertAmount(input.amount);
  assertDate(input.entry_date);
  return {
    amount: roundMoney(input.amount),
    entry_date: input.entry_date,
    note: cleanNote(input.note),
    category: cleanNote(input.category),
  };
}

function normalizeExpense(input: ExpenseInput) {
  assertAmount(input.amount);
  assertDate(input.entry_date);
  if (!EXPENSES.has(input.category)) throw new Error("Choose an expense category.");
  return {
    amount: roundMoney(input.amount),
    entry_date: input.entry_date,
    category: input.category,
    note: cleanNote(input.note),
  };
}

function assertAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    throw new Error("Enter an amount greater than zero.");
  }
}

function assertDate(value: string) {
  if (!isValidDate(value)) throw new Error("Choose a valid date.");
}

function cleanNote(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, 280) : null;
}

function assertBusiness(input: BusinessInput) {
  if (input.name.trim().length < 2) throw new Error("Enter the business name.");
  if (!KINDS.has(input.kind)) throw new Error("Choose the kind of business.");
  if (input.kind === "other" && !input.kind_other?.trim()) throw new Error("Describe the kind of business.");
  if (input.location.trim().length < 2) throw new Error("Enter the district, town, or area.");
  if (!ACTIVITIES.has(input.activity_type)) throw new Error("Choose how often the business runs.");
  if (!YES.has(input.registered) || !YES.has(input.has_tin)) throw new Error("Answer the registration questions.");
  if (!METHODS.has(input.record_method)) throw new Error("Choose how you keep records.");
  if (input.record_method === "other" && !input.record_method_other?.trim()) {
    throw new Error("Describe how you keep records.");
  }
  if (input.phone && !/^[0-9+\s()-]{7,20}$/.test(input.phone)) throw new Error("Enter a phone number, or leave it blank.");
  if (input.phone && !input.contact_consent) throw new Error("Consent is required before a phone number is saved.");
  if (!input.phone && input.contact_consent) throw new Error("Add a phone number or turn off contact consent.");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readLanguage(): Language {
  try {
    return localStorage.getItem("lekhetho.lang") === "st" ? "st" : "en";
  } catch {
    return "en";
  }
}

function writeLanguage(language: Language) {
  try {
    localStorage.setItem("lekhetho.lang", language);
  } catch {
    /* The profile still holds the language. */
  }
}

let singleton: LocalRepository | null = null;

export function getLocalRepository(): LocalRepository {
  if (!singleton) singleton = new LocalRepository();
  return singleton;
}
