export interface Article {
  id: string;
  title: string;
  en: string;
  st: string;
}

/**
 * Educational notes for Lekhetho Buddy.
 * These notes deliberately contain no tax rates, thresholds, deadlines,
 * form names, penalties, or eligibility rules.
 */
export const ARTICLES: Article[] = [
  {
    id: "edu-records",
    title: "Keeping simple business records",
    en: "For each sale, write the date, the amount in maloti, and a short note. For each expense, write the date, the amount, and what the money was for, such as stock, transport, rent, utilities, or wages. Add the entry on the day the money moves. In this app, sales minus expenses is only a record summary. It is not taxable profit and it is not a tax bill. If you are unsure which records Revenue Services Lesotho expects for your kind of business, ask them.",
    st: "Thekisong e 'ngoe le e 'ngoe, ngola letsatsi, chelete ka maloti, le tlhaloso e khutšoanyane. Litšenyehelong, ngola letsatsi, chelete, le hore na o lefile eng, joalo ka thepa, lipalangoang, rente, motlakase, kapa meputso. Kenya rekoto letsatsing leo chelete e tsamaeang ka lona. Phapang pakeng tsa thekiso le litšenyehelo ke kakaretso ea lirekoto feela. Ha se phaello e lekhethoang, hape ha se bili ea lekhetho. Haeba u sa tsebe hore na RSL e batla lirekoto life bakeng sa khoebo ea hau, botse bona.",
  },
  {
    id: "edu-registration",
    title: "Registration is decided outside this app",
    en: "Whether a business must register is decided from Revenue Services Lesotho rules and from that business's circumstances. Lekhetho Buddy cannot make that decision, cannot register a business, and cannot confirm an official status.",
    st: "Hore na khoebo e tlameha ho ngolisoa ke qeto ea melao ea RSL le maemo a khoebo eo. Lekhetho Buddy ha e khone ho etsa qeto eo, ha e ngodise khoebo, hape ha e netefatse boemo ba molao.",
  },
  {
    id: "edu-tin",
    title: "What a tax identification number means",
    en: "A tax identification number is an identifier a revenue authority uses for a taxpayer. Lekhetho Buddy cannot issue one, look one up, or list the official steps to get one. Ask Revenue Services Lesotho if you need to know whether you already have one.",
    st: "Nomoro ea lekhetho ke sesupo seo bolaoli ba lekhetho bo se sebelisang bakeng sa molefi. Lekhetho Buddy ha e e fane, ha e e batle, hape ha e thathamise mehato ea molao ea ho e fumana. Botsa RSL haeba u batla ho tseba hore na u se u e na le eona.",
  },
  {
    id: "edu-obligations",
    title: "Obligations differ by business",
    en: "Tax obligations are not the same for every business. They depend on the work you do and on rules set outside this app. Buddy can help you keep records and prepare a question. It cannot tell you what you owe, and it cannot file or pay anything for you.",
    st: "Boikarabello ba lekhetho ha bo tšoane bakeng sa khoebo e 'ngoe le e 'ngoe. Bo latela mosebetsi oa hau le melao e kantle ho sesebelisoa sena. Buddy e ka u thusa ho boloka lirekoto le ho lokisa potso. Ha e khone ho u joetsa hore na u lekolota bokae, hape ha e khone ho kenya kapa ho lefa letho bakeng sa hau.",
  },
  {
    id: "edu-net",
    title: "Sales minus expenses is not a tax bill",
    en: "The difference between sales and expenses in Lekhetho Buddy is a simple record summary. Do not treat it as taxable income, taxable profit, or a tax liability.",
    st: "Phapang pakeng tsa thekiso le litšenyehelo ho Lekhetho Buddy ke kakaretso ea lirekoto feela. Se ke oa e nka e le chelete e lekhethoang, phaello e lekhethoang, kapa sekoloto sa lekhetho.",
  },
  {
    id: "edu-limits",
    title: "Limits of this educational assistant",
    en: "This assistant shares general education only. It does not state tax rates, thresholds, deadlines, form names, penalties, or amounts to pay, because those must come from Revenue Services Lesotho. It does not register a business, submit a return, collect payment, or deliver a case into RSL's systems.",
    st: "Mothusi enoa o fana ka thuto e akaretsang feela. Ha o bolele litefiso tsa lekhetho, meeli, matsatsi a ho qetela, mabitso a liforomo, likotlo, kapa chelete eo u lokelang ho e lefa, hobane tsona li tlameha ho tsoa ho RSL. Ha o ngodise khoebo, ha o kenye pego, ha o bokelle tefo, hape ha o ise nyeoe litsamaisong tsa RSL.",
  },
  {
    id: "edu-next",
    title: "Choosing a next step",
    en: "Your journey shows one educational step at a time. It is not a compliance score and it does not create a statutory deadline. A missed educational step does not mean the business is non-compliant. If a step is unclear, request help and a person can follow up inside this prototype.",
    st: "Leeto la hau le bontša mohato o le mong oa thuto ka nako. Ha se lintlha tsa ho se latele molao, hape ha le etse letsatsi la molao. Haeba u sa qete mohato oa thuto, seo ha se bolele hore khoebo ha e latele molao. Haeba mohato o sa hlaka, kopa thuso e le hore motho a ka latela taba prototaipe ena.",
  },
];

export const ARTICLE_TITLES = new Set(ARTICLES.map((article) => article.title));

export const RECORD_SOURCE = "Your records in Lekhetho Buddy";

export function article(id: string): Article {
  const found = ARTICLES.find((item) => item.id === id);
  if (!found) throw new Error(`Missing education note ${id}`);
  return found;
}
