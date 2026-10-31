import type { BuddyPayload, HelpTopic } from "./types";

export interface BuddyRequestBody {
  message: string;
  language: "en" | "st";
  business: {
    name: string;
    kind: string;
    location: string;
    activity_type: string;
    registered: string;
    has_tin: string;
    record_method: string;
  } | null;
  summary: {
    sales_this_month: number;
    expenses_this_month: number;
    days_with_records: number;
  } | null;
  journey_next: string | null;
}

const TOPICS = new Set<HelpTopic>(["registration", "records", "filing", "payments", "understanding", "other"]);

export async function askBuddy(body: BuddyRequestBody): Promise<BuddyPayload> {
  try {
    const response = await fetch("/api/buddy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as unknown;
    if (!response.ok || !isPayload(data)) {
      return unreachable();
    }
    return data;
  } catch {
    return unreachable();
  }
}

function unreachable(): BuddyPayload {
  return {
    answer: "Buddy could not be reached just now. Nothing was filed or sent to RSL. You can try again, or request help.",
    next_steps: ["Try the question again", "Request help"],
    needs_human_help: true,
    reason_for_referral: "The assistant service did not respond.",
    sources: [],
    mode: "education-notes",
    help_topic: "understanding",
  };
}

function isPayload(value: unknown): value is BuddyPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.answer !== "string" || !Array.isArray(record.next_steps) || typeof record.needs_human_help !== "boolean") {
    return false;
  }
  if (!Array.isArray(record.sources)) return false;
  const topic = TOPICS.has(record.help_topic as HelpTopic) ? (record.help_topic as HelpTopic) : "understanding";
  record.help_topic = topic;
  record.mode = record.mode === "assistant" ? "assistant" : "education-notes";
  record.reason_for_referral =
    typeof record.reason_for_referral === "string" || record.reason_for_referral === null ? record.reason_for_referral : null;
  return true;
}
