import { UserProfile, UserRole, WorkExperience } from '../../shared/contracts';

// Hobbies every imported profile starts with (plus any interests detected in the pasted text)
export const DEFAULT_IMPORT_HOBBIES = ['Volleyball', 'Baking'];
const MAX_HOBBIES = 5;

const DEFAULT_MAJOR = 'B.S. Computer Science';
const DEFAULT_ZONE = 'Midtown • Tech Square';
const DEFAULT_TARGET_COMPANIES = ['Stripe', 'Google', 'Anthropic', 'Delta Air Lines'];
const DEFAULT_TARGET_ROLES = ['Software Engineer', 'APM / Product Manager'];

// Interests we can recognise in an About section (canonical casing on the right)
const INTEREST_KEYWORDS: Record<string, string> = {
  volleyball: 'Volleyball',
  baking: 'Baking',
  sourdough: 'Baking',
  bouldering: 'Bouldering',
  climbing: 'Bouldering',
  'pour-over': 'Pour-Over Coffee',
  coffee: 'Pour-Over Coffee',
  running: 'Running',
  marathon: 'Running',
  pickleball: 'Pickleball',
  hiking: 'Hiking',
  'board games': 'Board Games',
  robotics: 'Robotics',
  fintech: 'Fintech',
  startup: 'AI Startups',
  'machine learning': 'AI Startups',
};

// Georgia Tech majors, matched longest-first so "Computer Engineering" beats "Computer"
const GT_MAJORS = [
  'Computer Science',
  'Computer Engineering',
  'Electrical Engineering',
  'Electrical & Computer Engineering',
  'Industrial & Systems Engineering',
  'Industrial Engineering',
  'Mechanical Engineering',
  'Aerospace Engineering',
  'Biomedical Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Business Administration',
  'Business Analytics',
  'Computational Media',
  'Mathematics',
  'Physics',
  'Economics',
  'Industrial Design',
  'Architecture',
  'Neuroscience',
].sort((a, b) => b.length - a.length);

// Companies we recognise anywhere in free text (helps when lines aren't "Role at Company")
const KNOWN_COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Stripe', 'Anthropic', 'OpenAI', 'Figma', 'Linear',
  'Delta Air Lines', 'Delta', 'Coca-Cola', 'Home Depot', 'NCR Voyix', 'NCR', 'UPS', 'Cox Enterprises',
  'Mailchimp', 'Salesforce', 'Goldman Sachs', 'JPMorgan', 'BlackRock', 'Two Sigma', 'Citadel', 'Bain',
  'McKinsey', 'Deloitte', 'Accenture', 'Tesla', 'SpaceX', 'Lockheed Martin', 'Boeing', 'NVIDIA', 'IBM',
  'Oracle', 'Databricks', 'Cloudflare', 'Scale AI', 'Rivian', 'Chick-fil-A', 'Intuit', 'Capital One',
];

// Common first names used to split joined slugs like "ethanhu" → "Ethan Hu"
const COMMON_FIRST_NAMES = [
  'alexander', 'christopher', 'jonathan', 'benjamin', 'nicholas', 'samantha', 'jennifer', 'michelle',
  'isabella', 'victoria', 'jessica', 'michael', 'matthew', 'william', 'andrew', 'joshua', 'daniel',
  'olivia', 'sophia', 'hannah', 'rachel', 'sarah', 'jordan', 'priya', 'kevin', 'brian', 'jason', 'ethan',
  'aaron', 'emily', 'grace', 'chloe', 'emma', 'david', 'james', 'jacob', 'ryan', 'eric', 'alex', 'liam',
  'noah', 'lucas', 'maya', 'elena', 'anna', 'amy', 'leo', 'max', 'sam', 'ian', 'kai', 'zoe', 'ava', 'mia',
].sort((a, b) => b.length - a.length);

const ROLE_KEYWORDS = /\b(intern|engineer|developer|analyst|manager|researcher|scientist|designer|consultant|associate|founder|lead|director|assistant|fellow|ta|teaching assistant|product|swe)\b/i;
const PERIOD_RE =
  /((?:Summer|Spring|Fall|Winter|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?(?:'?\d{2}|\d{4})\s*(?:[-–—]|to)\s*(Present|Current|Now|(?:(?:Summer|Spring|Fall|Winter|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?(?:'?\d{2}|\d{4}))|(?:Summer|Spring|Fall|Winter)\s+'?\d{2,4}/i;

// "Demo Preset: My LinkedIn" quick-fill for live pitches.
// The About / Experience text is sample content — replace it with your real LinkedIn text.
export const DEMO_LINKEDIN_PRESET = {
  url: 'https://www.linkedin.com/in/ethanhu05/',
  text: [
    'Georgia Tech B.S. Computer Science, Class of 2027.',
    'Undergraduate Researcher at GT Research Lab · 2024 - Present',
    'Software Engineering Intern at Google · Summer 2025',
    'Outside of class: volleyball, baking, and pour-over coffee around Midtown.',
  ].join('\n'),
};

export interface LinkedInImportResult {
  ok: boolean;
  error?: string;
  slug: string;
  profile: UserProfile;
  detected: {
    name: boolean;
    major: boolean;
    gradYear: boolean;
    workHistory: number;
    extraHobbies: string[];
  };
}

// GT Navy circle with Buzz Gold initials, used until the user adds a photo
export function initialsAvatar(name: string): string {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'GT';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
    `<rect width="200" height="200" fill="#051E39"/>` +
    `<text x="100" y="124" font-family="Inter,Arial,sans-serif" font-size="76" font-weight="800" fill="#B39051" text-anchor="middle">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const titleCase = (word: string) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word);

export function extractLinkedInSlug(url: string): string | null {
  const match = url.trim().match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return match[1].toLowerCase();
  }
}

// "first-last" → "First Last"; "first-last-1a2b3c4d" → "First Last"; "ethanhu05" → "Ethan Hu"
export function nameFromSlug(slug: string): string {
  const parts = slug
    .split(/[-_.]+/)
    .map((p) => p.replace(/\d+$/, '')) // trailing numbers ("ethanhu05")
    .filter((p) => p && !/\d/.test(p)); // LinkedIn's random id suffixes contain digits

  if (parts.length === 1) {
    const joined = parts[0];
    const first = COMMON_FIRST_NAMES.find((n) => joined.startsWith(n) && joined.length - n.length >= 2);
    if (first) return `${titleCase(first)} ${titleCase(joined.slice(first.length))}`;
  }
  return parts.map(titleCase).join(' ');
}

function detectMajor(text: string): string | null {
  for (const major of GT_MAJORS) {
    if (new RegExp(`\\b${major.replace(/[&]/g, '(?:&|and)')}\\b`, 'i').test(text)) {
      const degree = /\b(M\.?S\.?|Master'?s|MBA|Ph\.?D)\b/i.test(text) ? 'M.S.' : 'B.S.';
      return `${degree} ${major}`;
    }
  }
  if (/\bCS\b/.test(text)) return DEFAULT_MAJOR;
  return null;
}

function detectGradYear(text: string): number | null {
  const patterns = [
    /class of\s*'?(\d{4}|\d{2})/i,
    /(?:graduat\w*|expected|grad)\D{0,20}(\d{4})/i,
    /(?:georgia tech|georgia institute of technology|gatech|B\.?S\.?|M\.?S\.?)[^\n]{0,60}?\b(20\d{2})\b/i,
    /\b(?:GT|Tech)\s*['’](\d{2})\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const year = m[1].length === 2 ? 2000 + Number(m[1]) : Number(m[1]);
      if (year >= 1960 && year <= 2035) return year;
    }
  }
  return null;
}

function detectPeriod(line: string): { period?: string; isCurrent: boolean } {
  const m = line.match(PERIOD_RE);
  if (!m) return { isCurrent: /\b(present|current)\b/i.test(line) };
  const period = m[0].replace(/\s*(?:–|—|to)\s*/i, ' - ').replace(/\s+/g, ' ').trim();
  return { period, isCurrent: /present|current|now/i.test(period) };
}

const cleanSegment = (s: string) =>
  s
    .replace(PERIOD_RE, '')
    .replace(/[·|•()]+.*$/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,:;-]+|[\s,:;.-]+$/g, '')
    .trim();

// Recognises "Role at Company", "Role @ Company", "Company — Role" and "Role, Company" lines
function parseExperienceLine(line: string): WorkExperience | null {
  const { period, isCurrent } = detectPeriod(line);
  const body = line.replace(/^[\s•*-]+/, '');

  let role: string | undefined;
  let company: string | undefined;

  const at = body.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  const dash = body.match(/^(.+?)\s+[—–|-]\s+(.+)$/);
  const comma = body.match(/^([^,]+),\s*(.+)$/);

  if (at) {
    role = cleanSegment(at[1]);
    company = cleanSegment(at[2]);
  } else if (dash || comma) {
    const [a, b] = (dash || comma)!.slice(1).map(cleanSegment);
    // Whichever side reads like a job title is the role
    if (ROLE_KEYWORDS.test(b) && !ROLE_KEYWORDS.test(a)) {
      company = a;
      role = b;
    } else if (ROLE_KEYWORDS.test(a)) {
      role = a;
      company = b;
    }
  }

  if (!role || !company || !ROLE_KEYWORDS.test(role) || company.length > 60 || role.length > 80) return null;
  return { company, role, period: period || 'Recent', ...(isCurrent ? { isCurrent: true } : {}) };
}

function detectWorkHistory(text: string): WorkExperience[] {
  const seen = new Set<string>();
  const history: WorkExperience[] = [];

  for (const raw of text.split(/\n|;|(?<=\.)\s+(?=[A-Z])/)) {
    const line = raw.trim();
    if (line.length < 6) continue;
    const exp = parseExperienceLine(line);
    if (exp && !seen.has(exp.company.toLowerCase())) {
      seen.add(exp.company.toLowerCase());
      history.push(exp);
    }
  }

  // Companies mentioned without a parsable title still count as experience
  for (const company of KNOWN_COMPANIES) {
    const mentioned = new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
    const covered = Array.from(seen).some((s) => s.includes(company.toLowerCase()) || company.toLowerCase().includes(s));
    if (mentioned && !covered) {
      seen.add(company.toLowerCase());
      history.push({ company, role: 'Team Member', period: 'Recent' });
    }
  }

  // Exactly one current position, preferring the first one marked Present
  const currentIdx = history.findIndex((h) => h.isCurrent);
  return history.map((h, i) => ({ ...h, isCurrent: i === (currentIdx === -1 ? 0 : currentIdx) || undefined }));
}

function detectInterests(text: string): string[] {
  const lower = text.toLowerCase();
  const found = Object.entries(INTEREST_KEYWORDS)
    .filter(([keyword]) => lower.includes(keyword))
    .map(([, hobby]) => hobby);
  return Array.from(new Set(found));
}

/**
 * Zero-backend LinkedIn importer. Reads the profile URL slug and (optionally) pasted
 * About / Experience text, then fills any gaps with realistic Georgia Tech defaults.
 */
export function parseLinkedInInput(url: string, pastedText = '', now: Date = new Date()): LinkedInImportResult {
  const slug = extractLinkedInSlug(url);
  const text = pastedText.trim();
  const year = now.getFullYear();

  const name = slug ? nameFromSlug(slug) : '';
  const major = detectMajor(text);
  const detectedYear = detectGradYear(text);
  const gradYear = detectedYear ?? year + 1;
  const role: UserRole = gradYear <= year || /\balum(?:na|nus|ni)?\b/i.test(text) ? 'alumni' : 'student';
  const workHistory = detectWorkHistory(text);
  const extraHobbies = detectInterests(text).filter(
    (h) => !DEFAULT_IMPORT_HOBBIES.some((d) => d.toLowerCase() === h.toLowerCase())
  );
  const hobbies = [...DEFAULT_IMPORT_HOBBIES, ...extraHobbies].slice(0, MAX_HOBBIES);

  const current = workHistory.find((w) => w.isCurrent);
  const companyOrLab = current ? `${current.company} • ${current.role}` : 'Georgia Tech • Tech Square';
  // Well-known past employers stay on the target list (return offers), then GT-popular defaults
  const knownPast = workHistory
    .map((w) => KNOWN_COMPANIES.find((k) => k.toLowerCase() === w.company.toLowerCase()))
    .filter((c): c is string => !!c);
  const targetCompanies = Array.from(new Set([...knownPast, ...DEFAULT_TARGET_COMPANIES])).slice(0, 5);
  const targetRoles = Array.from(
    new Set([
      ...workHistory
        .map((w) => w.role.replace(/\s*\(.*\)$/, '').replace(/\bintern(ship)?\b/i, '').trim())
        .filter((r) => r.length > 2 && r !== 'Team Member'),
      ...DEFAULT_TARGET_ROLES,
    ])
  ).slice(0, 3);

  const majorLabel = major ?? DEFAULT_MAJOR;
  const shortYear = `'${String(gradYear).slice(-2)}`;
  const firstLine = text.split('\n').find((l) => l.trim().length > 20)?.trim();
  const bio =
    firstLine && firstLine.length <= 220
      ? firstLine
      : `${majorLabel.replace(/^(B|M)\.S\. /, '')} ${shortYear}${current ? ` @ ${current.company}` : ''}. ` +
        `Down for ${hobbies.slice(0, 2).join(' & ').toLowerCase()} around Midtown and coffee chats about careers.`;

  const profile: UserProfile = {
    id: `linkedin_${slug ?? 'profile'}`,
    name: name || 'New Yellow Jacket',
    email: `${slug ?? 'linkedin.profile'}@linkedin.import`,
    role,
    gradYear,
    major: majorLabel,
    currentCity: 'Atlanta',
    neighborhoodZone: DEFAULT_ZONE,
    distanceText: 'Within 0.3 mi',
    bio,
    avatarUrl: initialsAvatar(name || 'GT'),
    companyOrLab,
    workHistory,
    targetCompanies,
    targetRoles,
    intents: [], // not inferable from LinkedIn (anyone can mentor or be mentored); picked in the review step
    hobbies,
    isOpenToMeet: true,
    openToMeetExpiresAt: now.getTime() + 1000 * 60 * 60 * 12,
    verified: !!slug,
    verificationMethod: 'linkedin',
    linkedinUrl: slug ? `https://www.linkedin.com/in/${slug}/` : undefined,
    vouchesCount: 0,
  };

  return {
    ok: !!slug,
    error: slug ? undefined : 'Enter a LinkedIn profile URL like https://www.linkedin.com/in/first-last/',
    slug: slug ?? '',
    profile,
    detected: {
      name: !!name,
      major: !!major,
      gradYear: detectedYear !== null,
      workHistory: workHistory.length,
      extraHobbies,
    },
  };
}
