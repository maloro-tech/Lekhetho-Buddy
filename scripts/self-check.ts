import { answerLocally, parseRequest } from "../server/buddy.ts";
import { netMaloti, sumMaloti } from "../src/lib/totals.ts";
import { parseAmount } from "../src/lib/format.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const vat = answerLocally(
  parseRequest({
    message: "What is the current VAT rate and the deadline to file?",
    language: "en",
    business: { name: "Lineo Tailoring", kind: "clothing", location: "Maseru", activity_type: "permanent", registered: "not_sure", has_tin: "no", record_method: "phone" },
    summary: { sales_this_month: 1500, expenses_this_month: 300, days_with_records: 1 },
    journey_next: "Understand your registration position",
  }),
);
assert(vat.needs_human_help, "uncertain tax question should ask for a person");
assert(!vat.answer.includes("%"), "uncertain answer must not invent a percent");
assert(!/\d+(?:[.,]\d+)?\s*%/.test(vat.answer), "no rate in the answer");
assert(!/rate is/i.test(vat.answer), "no stated rate");
assert(vat.sources.length > 0, "limit should cite the education note");

const records = answerLocally(
  parseRequest({
    message: "What records should I keep?",
    language: "en",
    business: null,
    summary: null,
    journey_next: null,
  }),
);
assert(records.needs_human_help === false, "record guidance is in the notes");
assert(records.sources.includes("Keeping simple business records"), "records source missing");
assert(!records.answer.includes("%"), "records answer has no rate");

const registration = answerLocally(
  parseRequest({
    message: "Do I need to register my business?",
    language: "en",
    business: { name: "Lineo Tailoring", kind: "clothing", location: "Maseru", activity_type: "permanent", registered: "not_sure", has_tin: "no", record_method: "phone" },
    summary: null,
    journey_next: null,
  }),
);
assert(registration.needs_human_help, "registration is not decided in the app");
assert(/not an RSL confirmation|cannot/i.test(registration.answer), "registration answer should state the limit");
assert(!/you must register/i.test(registration.answer), "must not decide registration");

assert(sumMaloti([1500, 0.1, 0.2]) === 1500.3, "money sum");
assert(netMaloti(1500, 300) === 1200, "net");
assert(parseAmount("1,500") === 1500, "parse grouped amount");
assert(parseAmount("-5") === null, "reject negative");
assert(parseAmount("0") === null, "reject zero");

console.log("self-check ok");
