import type { JourneyStatus, YesNoUnsure } from "./types";

export interface JourneyTemplate {
  step_key: string;
  sort_order: number;
  title_en: string;
  title_st: string;
  explanation_en: string;
  explanation_st: string;
}

export const JOURNEY_TEMPLATE: JourneyTemplate[] = [
  {
    step_key: "about",
    sort_order: 1,
    title_en: "Tell us about your business",
    title_st: "Re bolelle ka khoebo ea hau",
    explanation_en: "Your answers personalise guidance. They do not register the business with RSL.",
    explanation_st: "Likarabo tsa hau li thusa ho u tataisa. Ha li ngodise khoebo le RSL.",
  },
  {
    step_key: "registration",
    sort_order: 2,
    title_en: "Understand your registration position",
    title_st: "Utloisisa boemo ba ngoliso",
    explanation_en: "Whether you need to register depends on your circumstances and on RSL rules. Buddy cannot decide this for you.",
    explanation_st: "Hore na u tlameha ho ngolisa ho latela maemo a hau le melao ea RSL. Buddy ha e etse qeto eo.",
  },
  {
    step_key: "records",
    sort_order: 3,
    title_en: "Learn which records to keep",
    title_st: "Ithute hore na u boloka lirekoto life",
    explanation_en: "A useful habit is to note the date and amount of money in and money out. Official record rules can differ by business.",
    explanation_st: "Mokhoa o molemo ke ho ngola letsatsi le chelete e kenang le e tsoang. Melao ea lirekoto e ka fapana ka khoebo.",
  },
  {
    step_key: "habit",
    sort_order: 4,
    title_en: "Build a regular record-keeping habit",
    title_st: "Theha mokhoa oa ho boloka lirekoto",
    explanation_en: "Add sales and expenses as they happen. Missing a day is not a compliance score.",
    explanation_st: "Kenya thekiso le litšenyehelo ha li etsahala. Ho siea letsatsi ha se lintlha tsa ho se latele molao.",
  },
  {
    step_key: "filing",
    sort_order: 5,
    title_en: "Understand applicable filing requirements",
    title_st: "Utloisisa litlhoko tsa ho kenya pego",
    explanation_en: "Filing duties are not the same for every business. This step does not create a deadline and does not submit a return.",
    explanation_st: "Boikarabello ba ho kenya pego ha bo tšoane. Mohato ona ha o etse letsatsi la ho qetela, hape ha o kenye pego.",
  },
  {
    step_key: "payment",
    sort_order: 6,
    title_en: "Understand payment responsibilities",
    title_st: "Utloisisa boikarabello ba tefo",
    explanation_en: "Payment responsibilities depend on rules outside this app. Buddy will not tell you an amount to pay.",
    explanation_st: "Boikarabello ba tefo bo latela melao e kantle ho sesebelisoa sena. Buddy e ke ke ea u joetsa chelete eo u lokelang ho e lefa.",
  },
  {
    step_key: "update",
    sort_order: 7,
    title_en: "Keep your information up to date",
    title_st: "Boloka lintlha tsa hau li le nakong",
    explanation_en: "If your business changes, update the profile. Buddy does not send updates to RSL.",
    explanation_st: "Haeba khoebo ea hau e fetoha, nchafatsa profil. Buddy ha e romelle lintlha ho RSL.",
  },
];

export function registrationStatus(value: YesNoUnsure): JourneyStatus {
  if (value === "yes") return "completed";
  if (value === "not_sure") return "needs_assistance";
  return "in_progress";
}
