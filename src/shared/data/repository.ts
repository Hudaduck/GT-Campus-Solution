import {
  UserProfile,
  EventItem,
  MatchItem,
  CalendarMeetup,
  CoffeeSpotSuggestion,
  CareerOverlapBadge,
  SwipeCandidate,
  ChatMessage,
} from '../contracts';
import { getMutualIntents, resolveIntents } from '../intents';

const STORAGE_KEYS = {
  EVENTS: 'thirdplace_events_data',
  PROFILES: 'thirdplace_profiles_data',
  CURRENT_USER: 'thirdplace_current_user',
  MATCHES: 'thirdplace_matches_data',
  SWIPES: 'thirdplace_swipes_history',
  MEETUPS: 'thirdplace_meetups_data',
  MESSAGES: 'thirdplace_messages_data',
  CHAT_READ: 'thirdplace_chat_read',
  // Built-in pop-ups the host deleted, so the rolling seeds don't bring them back
  DELETED_EVENTS: 'thirdplace_deleted_events',
};

// Simulated partner reply delay (no backend, so the matched person answers the opener once)
export const DEMO_REPLY_DELAY_MS = 1800;

export function buildDemoPartnerReply(partner: UserProfile, viewer: UserProfile): string {
  const shared = partner.hobbies.find((h) => viewer.hobbies.some((v) => v.toLowerCase() === h.toLowerCase()));
  const hook = shared ? `Always great to meet another ${shared} person. ` : '';
  return `Hey ${viewer.name.split(' ')[0]}! Thanks for reaching out. ${hook}Happy to chat more. Would you rather grab coffee in person or hop on a quick video call?`;
}

// Only allow http(s) links so a pasted value can never become a javascript: href
export function sanitizeMeetingLink(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export const POPULAR_HOBBIES = [
  'Bouldering',
  'Pour-Over Coffee',
  'AI Startups',
  'Running',
  'Fintech',
  'Pickleball',
  'Board Games',
  'Robotics',
  'Baking',
  'Hiking',
  'Volleyball',
];

// Type-ahead suggestions for the hobby search (popular first). People can still add anything.
export const HOBBY_SUGGESTIONS = [
  ...POPULAR_HOBBIES,
  'Basketball',
  'Soccer',
  'Tennis',
  'Swimming',
  'Cycling',
  'Yoga',
  'Weightlifting',
  'Rock Climbing',
  'Ultimate Frisbee',
  'Golf',
  'Skiing',
  'Surfing',
  'Photography',
  'Painting',
  'Drawing',
  'Writing',
  'Reading',
  'Podcasts',
  'Film',
  'Music Production',
  'Guitar',
  'Piano',
  'Singing',
  'Dancing',
  'Cooking',
  'Coffee Roasting',
  'Wine Tasting',
  'Gardening',
  'Travel',
  'Camping',
  'Video Games',
  'Esports',
  'Chess',
  'Hackathons',
  'Open Source',
  'Web3',
  'Investing',
  'Product Design',
  'Volunteering',
  'Language Learning',
  'Anime',
  'Fashion',
  'Sneakers',
  'Formula 1',
  'College Football',
];

export const MIDPOINT_COFFEE_SPOTS: CoffeeSpotSuggestion[] = [
  {
    name: 'Dancing Goats Coffee Bar',
    address: '33 Peachtree Pl NE, Atlanta, GA 30309',
    neighborhood: 'Midtown (Peachtree St)',
    perk: 'Spacious patio, fast Wi-Fi, 5-min walk from Tech Square',
  },
  {
    name: 'Blue Bottle Coffee',
    address: '1100 Howell Mill Rd, Atlanta, GA 30318',
    neighborhood: 'West Midtown',
    perk: 'Single-origin pour overs, modern minimalist ambiance',
  },
  {
    name: 'Starbucks @ Tech Square',
    address: '777 Spring St NW, Atlanta, GA 30308',
    neighborhood: 'Tech Square',
    perk: 'Heart of campus startup ecosystem, high student energy',
  },
  {
    name: 'Octane / Revelator Westside',
    address: '1009 Marietta St NW, Atlanta, GA 30318',
    neighborhood: 'Westside Provisions',
    perk: 'Iconic GT founder hangout, specialty espressos',
  },
];

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'user_alex_chen',
    name: 'Alex Chen',
    email: 'alex.chen@gatech.edu',
    role: 'student',
    gradYear: 2026,
    major: 'Computer Science (AI & ML)',
    companyOrLab: 'GT VIP Lab • AI Researcher',
    currentCity: 'Atlanta',
    neighborhoodZone: 'Midtown • Tech Square',
    distanceText: 'Within 0.4 mi',
    bio: 'CS junior training small language models. Always up for Stone Summit bouldering or debating vector search over a cortado.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    intents: ['co-founder', 'find-mentor'],
    hobbies: ['AI Startups', 'Bouldering', 'Pour-Over Coffee'],
    workHistory: [
      { company: 'GT VIP Autonomous Agents Lab', role: 'Undergraduate AI Researcher', period: '2024 - Present', isCurrent: true },
      { company: 'NCR Voyix', role: 'Software Engineering Intern', period: 'Summer 2024' },
    ],
    targetCompanies: ['Anthropic', 'OpenAI', 'Stripe', 'Google', 'Scale AI'],
    targetRoles: ['AI/ML Engineer', 'Founding SWE', 'Distributed Systems Intern'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 12, // +12 hours
    verified: true,
    verificationMethod: 'gatech_sso',
    vouchesCount: 8,
  },
  {
    id: 'user_sarah_jenkins',
    name: 'Sarah Jenkins',
    email: 'sjenkins@alumni.gatech.edu',
    role: 'alumni',
    gradYear: 2018,
    major: 'Industrial & Systems Engineering',
    companyOrLab: 'Stripe • Senior Product Lead',
    currentCity: 'Atlanta',
    neighborhoodZone: 'Midtown • Piedmont Park',
    distanceText: 'Within 1.1 mi',
    bio: 'ISyE ’18. Building payments infra at Stripe. Running the BeltLine 10k and advising early student founders on go-to-market.',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    intents: ['give-mentorship', 'co-founder'],
    hobbies: ['Running', 'Fintech', 'Pour-Over Coffee'],
    workHistory: [
      { company: 'Stripe', role: 'Senior Product Lead (Payments Rails)', period: '2021 - Present', isCurrent: true },
      { company: 'Delta Air Lines', role: 'Revenue Strategy Analyst', period: '2018 - 2021' },
      { company: 'Bain & Company', role: 'Associate Consultant Intern', period: 'Summer 2017' },
    ],
    targetCompanies: ['Stripe', 'Anthropic', 'Figma', 'Linear'],
    targetRoles: ['VP of Product', 'Founder / Early Stage Advisor'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 18,
    verified: true,
    verificationMethod: 'linkedin',
    linkedinUrl: 'https://linkedin.com/in/sarah-jenkins-gt',
    vouchesCount: 14,
  },
  {
    id: 'user_marcus_vance',
    name: 'Marcus Vance',
    email: 'mvance@gatech.edu',
    role: 'student',
    gradYear: 2025,
    major: 'Mechanical Engineering',
    companyOrLab: 'GT EcoCAR Lab • Battery Lead',
    currentCity: 'Atlanta',
    neighborhoodZone: 'West Campus • Howell Mill',
    distanceText: 'Within 0.8 mi',
    bio: 'Senior ME working on battery pack thermal management. Looking for climbing buddies and weekend running partners.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    intents: ['casual', 'find-mentor'],
    hobbies: ['Bouldering', 'Running', 'Robotics'],
    workHistory: [
      { company: 'GT EcoCAR EV Team', role: 'Battery Thermal Lead', period: '2023 - Present', isCurrent: true },
      { company: 'Rivian', role: 'Thermal Systems Engineering Co-op', period: 'Spring 2024' },
      { company: 'Tesla', role: 'Manufacturing Intern', period: 'Summer 2023' },
    ],
    targetCompanies: ['Tesla', 'Rivian', 'SpaceX', 'Anduril'],
    targetRoles: ['Hardware Engineer', 'Thermal Systems Lead', 'Robotics Engineer'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 8,
    verified: true,
    verificationMethod: 'gatech_sso',
    vouchesCount: 5,
  },
  {
    id: 'user_elena_rostova',
    name: 'Elena Rostova',
    email: 'erostova@alumni.gatech.edu',
    role: 'alumni',
    gradYear: 2020,
    major: 'Computer Science',
    companyOrLab: 'Anthropic • Research Engineer',
    currentCity: 'SF',
    neighborhoodZone: 'SF • SoMa / Mission',
    distanceText: 'SF Bay Area Hub',
    bio: 'GT CS ’20. LLM evaluations and interpretability at Anthropic. Visiting ATL for homecoming week, love chatting AI startups & specialty roast.',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    intents: ['co-founder', 'find-mentor'],
    hobbies: ['AI Startups', 'Pour-Over Coffee', 'Bouldering'],
    workHistory: [
      { company: 'Anthropic', role: 'Research Engineer (Model Interpretability)', period: '2022 - Present', isCurrent: true },
      { company: 'Google Brain', role: 'AI Resident', period: '2020 - 2022' },
      { company: 'Meta', role: 'SWE Intern (FAIR)', period: 'Summer 2019' },
    ],
    targetCompanies: ['Anthropic', 'OpenAI', 'DeepMind', 'Stripe'],
    targetRoles: ['Research Scientist', 'AI Safety Lead', 'Founding AI Architect'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 24,
    verified: true,
    verificationMethod: 'peer_vouch',
    vouchesCount: 19,
  },
  {
    id: 'user_priya_sharma',
    name: 'Priya Sharma',
    email: 'psharma@gatech.edu',
    role: 'student',
    gradYear: 2026,
    major: 'Business Analytics & CS',
    companyOrLab: 'Scheller Student Fund • Quant Analyst',
    currentCity: 'Atlanta',
    neighborhoodZone: 'Tech Square • Scheller',
    distanceText: 'Within 0.2 mi',
    bio: 'Quantitative finance & crypto risk modeling. Let’s grab Dancing Goats and talk algorithmic trading and high-yield liquidity.',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    intents: ['study', 'find-mentor'],
    hobbies: ['Fintech', 'Pour-Over Coffee', 'Board Games'],
    workHistory: [
      { company: 'Scheller Student Managed Fund', role: 'Quantitative Analyst', period: '2024 - Present', isCurrent: true },
      { company: 'BlackRock', role: 'Summer Analyst (Aladdin Risk)', period: 'Summer 2024' },
    ],
    targetCompanies: ['Two Sigma', 'Citadel', 'Stripe', 'BlackRock', 'Jane Street'],
    targetRoles: ['Quantitative Trader', 'Fintech PM', 'Risk Strategist'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 6,
    verified: true,
    verificationMethod: 'gatech_sso',
    vouchesCount: 7,
  },
  {
    id: 'user_david_park',
    name: 'David Park',
    email: 'dpark@alumni.gatech.edu',
    role: 'alumni',
    gradYear: 2017,
    major: 'Electrical & Computer Engineering',
    companyOrLab: 'Two Sigma • Quant Dev Lead',
    currentCity: 'NYC',
    neighborhoodZone: 'NYC • Flatiron / Madison Sq',
    distanceText: 'NYC GT Alumni Club',
    bio: 'GT ECE ’17. High frequency trading systems at Two Sigma. Running the Central Park loop and mentoring Yellow Jackets moving to NYC.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    intents: ['give-mentorship'],
    hobbies: ['Fintech', 'Running', 'Bouldering'],
    workHistory: [
      { company: 'Two Sigma', role: 'Quantitative Developer Lead', period: '2020 - Present', isCurrent: true },
      { company: 'Citadel Securities', role: 'Low-Latency C++ Engineer', period: '2017 - 2020' },
      { company: 'Qualcomm', role: 'Firmware Intern', period: 'Summer 2016' },
    ],
    targetCompanies: ['Two Sigma', 'Citadel', 'Jump Trading', 'Stripe'],
    targetRoles: ['Head of High-Frequency Infrastructure', 'Alumni Angel Investor'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 16,
    verified: true,
    verificationMethod: 'linkedin',
    linkedinUrl: 'https://linkedin.com/in/david-park-gt',
    vouchesCount: 12,
  },
  {
    id: 'user_jordan_miller',
    name: 'Jordan Miller',
    email: 'jmiller@gatech.edu',
    role: 'student',
    gradYear: 2025,
    major: 'Aerospace Engineering',
    companyOrLab: 'Space Systems Design Lab',
    currentCity: 'Atlanta',
    neighborhoodZone: 'North Ave • Centennial',
    distanceText: 'Within 0.7 mi',
    bio: 'CubeSat orbital mechanics & propulsion. Avid climber at The Overlook and pour-over gear enthusiast.',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    intents: ['casual'],
    hobbies: ['Bouldering', 'Pour-Over Coffee', 'Robotics'],
    workHistory: [
      { company: 'Space Systems Design Lab (SSDL)', role: 'CubeSat Avionics Lead', period: '2023 - Present', isCurrent: true },
      { company: 'SpaceX', role: 'Propulsion Intern', period: 'Summer 2024' },
    ],
    targetCompanies: ['SpaceX', 'NASA JPL', 'Anduril', 'Relativity Space'],
    targetRoles: ['Avionics Engineer', 'Propulsion Specialist', 'Flight Dynamics Engineer'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 5,
    verified: true,
    verificationMethod: 'gatech_sso',
    vouchesCount: 6,
  },
  {
    id: 'user_maya_patel',
    name: 'Maya Patel',
    email: 'mpatel@alumni.gatech.edu',
    role: 'alumni',
    gradYear: 2019,
    major: 'Biomedical Engineering',
    companyOrLab: 'Verily Life Sciences • Bio-Data Scientist',
    currentCity: 'SF',
    neighborhoodZone: 'SF • Mission Bay',
    distanceText: 'SF Bay Area Hub',
    bio: 'BME ’19. Clinical trials & AI diagnostics at Verily. Passionate about marathon training and connecting GT bio-engineers with tech.',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    intents: ['give-mentorship', 'casual'],
    hobbies: ['Running', 'AI Startups', 'Hiking'],
    workHistory: [
      { company: 'Verily Life Sciences', role: 'Bio-Data Scientist (Clinical AI)', period: '2021 - Present', isCurrent: true },
      { company: 'Genentech', role: 'Bioinformatics Analyst', period: '2019 - 2021' },
    ],
    targetCompanies: ['Verily', 'Genentech', 'Recursion Pharma', 'Anthropic'],
    targetRoles: ['Director of Clinical Data', 'Bio-Tech Founder'],
    isOpenToMeet: false,
    verified: true,
    verificationMethod: 'peer_vouch',
    vouchesCount: 11,
  },
  {
    id: 'user_liam_wright',
    name: 'Liam Wright',
    email: 'lwright@gatech.edu',
    role: 'student',
    gradYear: 2027,
    major: 'Computer Science (Systems)',
    companyOrLab: 'HackGT • Tech Lead',
    currentCity: 'Atlanta',
    neighborhoodZone: 'East Campus • Bobby Dodd',
    distanceText: 'Within 0.5 mi',
    bio: 'Freshman hacking on distributed databases and Rust. Always down for late night pickleball or hackathons.',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    intents: ['study', 'give-mentorship'],
    hobbies: ['AI Startups', 'Pickleball', 'Fintech'],
    workHistory: [
      { company: 'GT HackGT Organizing Team', role: 'Tech Infrastructure Lead', period: '2024 - Present', isCurrent: true },
      { company: 'Open Source Community', role: 'Rust Distributed DB Contributor', period: '2023 - 2024' },
    ],
    targetCompanies: ['Stripe', 'Databricks', 'Cloudflare', 'Linear'],
    targetRoles: ['Systems Software Engineer', 'Database Engine Intern'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 10,
    verified: true,
    verificationMethod: 'gatech_sso',
    vouchesCount: 4,
  },
  {
    id: 'user_chloe_dubois',
    name: 'Chloe Dubois',
    email: 'cdubois@alumni.gatech.edu',
    role: 'alumni',
    gradYear: 2016,
    major: 'Architecture & Urban Design',
    companyOrLab: 'Perkins&Will • Senior Urban Architect',
    currentCity: 'Atlanta',
    neighborhoodZone: 'Midtown • Colony Square',
    distanceText: 'Within 1.3 mi',
    bio: 'M.Arch ’16. Designing sustainable public spaces in ATL. Sourdough baker, weekend boulderer, and Midtown history buff.',
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80',
    intents: ['casual'],
    hobbies: ['Bouldering', 'Baking', 'Hiking'],
    workHistory: [
      { company: 'Perkins&Will', role: 'Senior Urban Architect', period: '2019 - Present', isCurrent: true },
      { company: 'Atlanta BeltLine Inc.', role: 'Urban Design Fellow', period: '2016 - 2019' },
    ],
    targetCompanies: ['Perkins&Will', 'Gensler', 'Sidewalk Labs'],
    targetRoles: ['Principal Urban Designer', 'Smart Cities Consultant'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 14,
    verified: true,
    verificationMethod: 'linkedin',
    linkedinUrl: 'https://linkedin.com/in/chloe-dubois-gt',
    vouchesCount: 16,
  },
];

const HOUR_MS = 60 * 60 * 1000;

/**
 * Demo pop-ups start at sensible, round times: on the hour, during the day (roughly 9 AM-9 PM).
 * Mornings/early afternoons schedule them later today; afternoons/nights roll them to tomorrow
 * starting 9 AM. Offsets keep the seeds' relative order. They leave the map when they end.
 */
export function seedTimes(now: number, startOffsetHours: number, durationHours: number) {
  const anchor = new Date(now);
  anchor.setMinutes(0, 0, 0);
  anchor.setHours(anchor.getHours() + 1); // next full hour
  if (anchor.getHours() < 8) {
    anchor.setHours(7); // 7 AM today -> first seed ~9 AM
  } else if (anchor.getHours() > 13) {
    anchor.setDate(anchor.getDate() + 1);
    anchor.setHours(7); // tomorrow morning
  }
  const start = anchor.getTime() + startOffsetHours * HOUR_MS;
  const end = start + durationHours * HOUR_MS;
  return { startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(), expiresAt: end };
}

// Seed pop-ups, timed relative to `now` so they can be re-issued when they expire
export function buildInitialEvents(now: number = Date.now()): EventItem[] {
  return [
    {
      id: 'event_gt_ai_founders_coffee',
      title: 'Yellow Jacket AI Founders & Builders Pour-Over',
      description: 'Casual pour-over meetup at Dancing Goats. Demos of local LLM pipelines, autonomous agents, and startup war stories.',
      hostId: 'user_alex_chen',
      hostName: 'Alex Chen',
      hostRole: 'student',
      hostAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      locationName: 'Dancing Goats Coffee Bar (Midtown)',
      lat: 33.7788,
      lng: -84.3845,
      neighborhoodZone: 'Midtown • Peachtree Pl',
      ...seedTimes(now, 3, 3),
      ttlHours: 8,
      createdAt: now - 1000 * 60 * 60 * 2,
      category: 'startup',
      maxAttendees: 15,
      attendees: ['user_alex_chen', 'user_elena_rostova', 'user_liam_wright'],
      tags: ['AI Startups', 'Pour-Over Coffee', 'Startups'],
      isHostAlum: false,
    },
    {
      id: 'event_stone_summit_bouldering',
      title: 'Stone Summit Midtown Bouldering Crew',
      description: 'V3 to V7 project session! Warm up together, then tacos at Bartaco after. Open to beginners and seasoned crushers alike.',
      hostId: 'user_marcus_vance',
      hostName: 'Marcus Vance',
      hostRole: 'student',
      hostAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      locationName: 'Stone Summit Midtown Bouldering Gym',
      lat: 33.7745,
      lng: -84.3872,
      neighborhoodZone: 'Midtown • West Peachtree',
      ...seedTimes(now, 5, 3),
      ttlHours: 12,
      createdAt: now - 1000 * 60 * 30,
      category: 'sports',
      maxAttendees: 12,
      attendees: ['user_marcus_vance', 'user_alex_chen', 'user_chloe_dubois'],
      tags: ['Bouldering', 'Sports', 'Fitness'],
      isHostAlum: false,
    },
    {
      id: 'event_fintech_alumni_dinner',
      title: 'Fintech & Quant Fireside Chat @ Tech Square',
      description: 'Alumni working across Stripe, Two Sigma, and Citadel sharing insights on quantitative risk and high-throughput transaction rails.',
      hostId: 'user_sarah_jenkins',
      hostName: 'Sarah Jenkins',
      hostRole: 'alumni',
      hostAvatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      locationName: 'Tech Square Club & Lounge',
      lat: 33.7765,
      lng: -84.3888,
      neighborhoodZone: 'Tech Square • 5th St',
      ...seedTimes(now, 7, 3),
      ttlHours: 10,
      createdAt: now - 1000 * 60 * 120,
      category: 'networking',
      maxAttendees: 20,
      attendees: ['user_sarah_jenkins', 'user_priya_sharma', 'user_david_park'],
      tags: ['Fintech', 'Mentorship', 'Networking'],
      isHostAlum: true,
    },
    {
      id: 'event_beltline_sunset_run',
      title: 'BeltLine Eastside Trail 5K Social Run',
      description: 'Meet at Piedmont Park Active Oval, easy conversational pace (9:00/mi) along the BeltLine down to Krog Street Market for popsicles.',
      hostId: 'user_sarah_jenkins',
      hostName: 'Sarah Jenkins',
      hostRole: 'alumni',
      hostAvatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      locationName: 'Piedmont Park Active Oval',
      lat: 33.7850,
      lng: -84.3735,
      neighborhoodZone: 'Piedmont Park',
      ...seedTimes(now, 4, 2),
      ttlHours: 6,
      createdAt: now - 1000 * 60 * 90,
      category: 'sports',
      maxAttendees: 18,
      attendees: ['user_sarah_jenkins', 'user_marcus_vance', 'user_maya_patel'],
      tags: ['Running', 'Sports', 'Fitness'],
      isHostAlum: true,
    },
    {
      id: 'event_west_midtown_coffee_study',
      title: 'Blue Bottle Specialty Roast & Co-Working Session',
      description: 'Deep work sprint on Howell Mill. Noise-cancelling headphones, cold brew on tap, and quick 10-minute breaks to discuss hardware/software.',
      hostId: 'user_jordan_miller',
      hostName: 'Jordan Miller',
      hostRole: 'student',
      hostAvatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
      locationName: 'Blue Bottle Coffee (West Midtown)',
      lat: 33.7828,
      lng: -84.4075,
      neighborhoodZone: 'West Midtown • Howell Mill',
      ...seedTimes(now, 2, 3),
      ttlHours: 7,
      createdAt: now - 1000 * 60 * 45,
      category: 'study',
      maxAttendees: 8,
      attendees: ['user_jordan_miller', 'user_alex_chen'],
      tags: ['Pour-Over Coffee', 'Study', 'Robotics'],
      isHostAlum: false,
    },
    {
      id: 'event_culc_study_jam',
      title: 'Clough (CULC) 3rd Floor Hack & Study Jam',
      description: 'Whiteboard cram jam for upcoming systems & algorithm finals. Energy drinks and pizza slices provided.',
      hostId: 'user_liam_wright',
      hostName: 'Liam Wright',
      hostRole: 'student',
      hostAvatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
      locationName: 'Clough Undergraduate Learning Commons (CULC)',
      lat: 33.7749,
      lng: -84.3964,
      neighborhoodZone: 'Central Campus • Tech Green',
      ...seedTimes(now, 8, 4),
      ttlHours: 14,
      createdAt: now - 1000 * 60 * 10,
      category: 'study',
      maxAttendees: 10,
      attendees: ['user_liam_wright', 'user_priya_sharma'],
      tags: ['Study', 'AI Startups', 'Fintech'],
      isHostAlum: false,
    },
    {
      id: 'event_peters_deck_pickleball',
      title: 'Peters Parking Deck Rooftop Pickleball Open Play',
      description: 'Portable nets on the top deck with city skyline backdrop. Paddles available if you do not have your own. All skill levels welcome!',
      hostId: 'user_marcus_vance',
      hostName: 'Marcus Vance',
      hostRole: 'student',
      hostAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      locationName: 'Peters Parking Deck Top Level',
      lat: 33.7758,
      lng: -84.3922,
      neighborhoodZone: 'East Campus • Fowler St',
      ...seedTimes(now, 6, 3),
      ttlHours: 9,
      createdAt: now - 1000 * 60 * 60,
      category: 'sports',
      maxAttendees: 12,
      attendees: ['user_marcus_vance', 'user_liam_wright'],
      tags: ['Pickleball', 'Sports', 'Fitness'],
      isHostAlum: false,
    },
    {
      id: 'event_scheller_boardgame_social',
      title: 'Tech Square Board Game & Strategy Meetup',
      description: 'Settlers of Catan, Terraforming Mars, and Wingspan. Great way to decompress and meet fellow Yellow Jackets in a relaxed environment.',
      hostId: 'user_priya_sharma',
      hostName: 'Priya Sharma',
      hostRole: 'student',
      hostAvatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      locationName: 'Scheller Atrium & Courtyard',
      lat: 33.7761,
      lng: -84.3875,
      neighborhoodZone: 'Tech Square • Spring St',
      ...seedTimes(now, 4, 3),
      ttlHours: 8,
      createdAt: now - 1000 * 60 * 40,
      category: 'social',
      maxAttendees: 16,
      attendees: ['user_priya_sharma', 'user_alex_chen', 'user_chloe_dubois'],
      tags: ['Board Games', 'Social', 'Fintech'],
      isHostAlum: false,
    },

  ];
}

export const SEED_BUILT_AT = Date.now();
export const INITIAL_EVENTS: EventItem[] = buildInitialEvents(SEED_BUILT_AT);

export const INITIAL_CURRENT_USER: UserProfile = {
  id: 'current_user_sarah_18',
  name: 'Sarah Jenkins',
  email: 'sjenkins@alumni.gatech.edu',
  role: 'alumni',
  gradYear: 2018,
  major: 'Industrial & Systems Engineering',
  companyOrLab: 'Stripe • Senior Product Lead',
  currentCity: 'Atlanta',
  neighborhoodZone: 'Midtown • Piedmont Park',
  distanceText: 'Within 1.1 mi',
  bio: 'ISyE ’18. Building payments infra at Stripe. Running the BeltLine 10k and advising early student founders on go-to-market.',
  avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
  intents: ['give-mentorship', 'co-founder'],
  hobbies: ['Running', 'Fintech', 'Pour-Over Coffee'],
  workHistory: [
    { company: 'Stripe', role: 'Senior Product Lead (Payments Rails)', period: '2021 - Present', isCurrent: true },
    { company: 'Delta Air Lines', role: 'Revenue Strategy Analyst', period: '2018 - 2021' },
    { company: 'Bain & Company', role: 'Associate Consultant Intern', period: 'Summer 2017' },
  ],
  targetCompanies: ['Stripe', 'Anthropic', 'Figma', 'Linear'],
  targetRoles: ['VP of Product', 'Founder / Early Stage Advisor'],
  isOpenToMeet: true,
  openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 18,
  verified: true,
  verificationMethod: 'linkedin',
  linkedinUrl: 'https://linkedin.com/in/sarah-jenkins-gt',
  vouchesCount: 14,
};

export const DEMO_STUDENT_USER: UserProfile = {
  id: 'current_user_alex_26',
  name: 'Alex Chen',
  email: 'alex.chen@gatech.edu',
  role: 'student',
  gradYear: 2026,
  major: 'Computer Science (AI & ML)',
  companyOrLab: 'GT VIP Lab • AI Researcher',
  currentCity: 'Atlanta',
  neighborhoodZone: 'Midtown • Tech Square',
  distanceText: 'Within 0.4 mi',
  bio: 'CS junior training small language models. Always up for Stone Summit bouldering or debating vector search over a cortado.',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  intents: ['co-founder', 'find-mentor'],
  hobbies: ['AI Startups', 'Bouldering', 'Pour-Over Coffee'],
  workHistory: [
    { company: 'GT VIP Autonomous Agents Lab', role: 'Undergraduate AI Researcher', period: '2024 - Present', isCurrent: true },
    { company: 'NCR Voyix', role: 'Software Engineering Intern', period: 'Summer 2024' },
  ],
  targetCompanies: ['Anthropic', 'OpenAI', 'Stripe', 'Google', 'Scale AI'],
  targetRoles: ['AI/ML Engineer', 'Founding SWE', 'Distributed Systems Intern'],
  isOpenToMeet: true,
  openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 12,
  verified: true,
  verificationMethod: 'gatech_sso',
  vouchesCount: 8,
};

// ---------------------------------------------------------------------------
// Volleyball & Baking ecosystem: seeded when a LinkedIn-imported profile launches,
// so the recommender and Swipe Radar immediately have rich matches to surface.
// ---------------------------------------------------------------------------

export const HOBBY_ECOSYSTEM_PROFILES: UserProfile[] = [
  {
    id: 'user_jasmine_lee',
    name: 'Jasmine Lee',
    email: 'jlee@alumni.gatech.edu',
    role: 'alumni',
    gradYear: 2019,
    major: 'Computer Science',
    companyOrLab: 'Google • Senior Software Engineer',
    currentCity: 'Atlanta',
    neighborhoodZone: 'Midtown • Piedmont Park',
    distanceText: 'Within 0.9 mi',
    bio: "CS '19. Building Maps infra at Google's Midtown office. Runs Sunday sand volleyball at Piedmont and loves mentoring GT engineers.",
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    intents: ['give-mentorship'],
    hobbies: ['Volleyball', 'Pour-Over Coffee', 'Hiking'],
    workHistory: [
      { company: 'Google', role: 'Senior Software Engineer (Maps)', period: '2021 - Present', isCurrent: true },
      { company: 'Delta Air Lines', role: 'Software Engineer', period: '2019 - 2021' },
    ],
    targetCompanies: ['Google', 'Anthropic', 'Figma'],
    targetRoles: ['Staff Software Engineer', 'Engineering Manager'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 20,
    verified: true,
    verificationMethod: 'linkedin',
    linkedinUrl: 'https://linkedin.com/in/jasmine-lee-gt',
    vouchesCount: 13,
  },
  {
    id: 'user_marco_alvarez',
    name: 'Marco Alvarez',
    email: 'malvarez@alumni.gatech.edu',
    role: 'alumni',
    gradYear: 2021,
    major: 'Industrial & Systems Engineering',
    companyOrLab: 'Stripe • Product Manager',
    currentCity: 'Atlanta',
    neighborhoodZone: 'Midtown • Colony Square',
    distanceText: 'Within 1.0 mi',
    bio: "ISyE '21. PM on Stripe Billing. Weekend sourdough obsessive, Tuesday-night volleyball regular, always happy to talk APM recruiting.",
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    intents: ['give-mentorship', 'casual'],
    hobbies: ['Baking', 'Volleyball', 'Fintech'],
    workHistory: [
      { company: 'Stripe', role: 'Product Manager (Billing)', period: '2022 - Present', isCurrent: true },
      { company: 'Google', role: 'Associate Product Manager', period: '2021 - 2022' },
    ],
    targetCompanies: ['Stripe', 'Figma', 'Linear'],
    targetRoles: ['Senior Product Manager', 'APM / Product Manager'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 16,
    verified: true,
    verificationMethod: 'linkedin',
    linkedinUrl: 'https://linkedin.com/in/marco-alvarez-gt',
    vouchesCount: 10,
  },
  {
    id: 'user_nina_okafor',
    name: 'Nina Okafor',
    email: 'nokafor@gatech.edu',
    role: 'student',
    gradYear: 2027,
    major: 'Computer Science',
    companyOrLab: 'GT Club Volleyball • Treasurer',
    currentCity: 'Atlanta',
    neighborhoodZone: 'Tech Square • 5th St',
    distanceText: 'Within 0.3 mi',
    bio: 'CS sophomore, club volleyball setter, and the person who brings croissants to every study session. Hunting SWE internships.',
    avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&auto=format&fit=crop&q=80',
    intents: ['study', 'find-mentor'],
    hobbies: ['Baking', 'Volleyball', 'Board Games'],
    workHistory: [
      { company: 'GT Club Volleyball', role: 'Treasurer & Setter', period: '2024 - Present', isCurrent: true },
      { company: 'NCR Voyix', role: 'Software Engineering Intern', period: 'Summer 2025' },
    ],
    targetCompanies: ['Google', 'Stripe', 'Anthropic'],
    targetRoles: ['Software Engineer', 'AI/ML Engineer'],
    isOpenToMeet: true,
    openToMeetExpiresAt: Date.now() + 1000 * 60 * 60 * 10,
    verified: true,
    verificationMethod: 'gatech_sso',
    vouchesCount: 5,
  },
];

// Built on demand so start/expiry times are always relative to "now"
export function buildHobbyEcosystemEvents(now: number = Date.now()): EventItem[] {
  const [jasmine, , nina] = HOBBY_ECOSYSTEM_PROFILES;
  return [
    {
      id: 'event_piedmont_sand_volleyball',
      title: 'Piedmont Park Sand Volleyball Pickup',
      description:
        'Casual 4v4 pickup on the Piedmont Park sand courts. All levels welcome; GT alumni from Google and Stripe rotate in between games.',
      hostId: jasmine.id,
      hostName: jasmine.name,
      hostRole: 'alumni',
      hostAvatarUrl: jasmine.avatarUrl,
      locationName: 'Piedmont Park Sand Volleyball Courts',
      lat: 33.787,
      lng: -84.3737,
      neighborhoodZone: 'Piedmont Park',
      ...seedTimes(now, 2, 2),
      ttlHours: 6,
      createdAt: now,
      category: 'sports',
      maxAttendees: 16,
      attendees: ['user_jasmine_lee', 'user_marco_alvarez', 'user_nina_okafor'],
      tags: ['Volleyball', 'Sports', 'Fitness'],
      isHostAlum: true,
    },
    {
      id: 'event_midtown_sourdough_swap',
      title: 'Midtown Sourdough & Pastry Swap',
      description:
        'Bring a loaf, leave with three. Starter sharing, lamination tips, and coffee in the Colony Square courtyard with GT bakers.',
      hostId: nina.id,
      hostName: nina.name,
      hostRole: 'student',
      hostAvatarUrl: nina.avatarUrl,
      locationName: 'Colony Square Courtyard',
      lat: 33.7838,
      lng: -84.3836,
      neighborhoodZone: 'Midtown • Colony Square',
      ...seedTimes(now, 3, 2),
      ttlHours: 8,
      createdAt: now,
      category: 'social',
      maxAttendees: 14,
      attendees: ['user_nina_okafor', 'user_marco_alvarez', 'user_chloe_dubois'],
      tags: ['Baking', 'Social', 'Pour-Over Coffee'],
      isHostAlum: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Hobby / tag formatting: every hobby and event tag is shown capitalized
// ("pour-over coffee" → "Pour-Over Coffee"). Applied on read and write so older
// saved data and user-typed hobbies are normalized too.
// ---------------------------------------------------------------------------

const HOBBY_SPECIAL_CASES: Record<string, string> = {
  'ai startups': 'AI Startups',
};

export function formatHobby(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const special = HOBBY_SPECIAL_CASES[trimmed.toLowerCase()];
  if (special) return special;
  return trimmed.replace(/(^|[\s\-/&])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

// Formats and de-duplicates (case-insensitively), keeping first-seen order
export function formatHobbies(list: string[] = []): string[] {
  const seen = new Set<string>();
  return list.map(formatHobby).filter((h) => {
    const key = h.toLowerCase();
    if (!h || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const normalizeProfile = <T extends UserProfile>(profile: T): T => {
  const { intent: _legacy, ...rest } = profile as T & { intent?: string };
  return {
    ...(rest as T),
    hobbies: formatHobbies(profile.hobbies),
    intents: resolveIntents(profile as T & { intent?: string }),
  };
};
const normalizeEvent = (event: EventItem): EventItem => ({ ...event, tags: formatHobbies(event.tags) });

// Automatic TTL expiration helper
export function filterExpiredItems<T extends { expiresAt?: number }>(items: T[]): T[] {
  const now = Date.now();
  return items.filter((item) => {
    if (!item.expiresAt) return true;
    return item.expiresAt > now;
  });
}

// ---------------------------------------------------------------------------
// Career & Network Overlap helpers (shared by Swipe Radar + Events Map)
// ---------------------------------------------------------------------------

const normalize = (value: string) => value.trim().toLowerCase();

// "Google Brain" matches target "Google"; "Stripe • Senior Product Lead" matches "Stripe"
export function companyMatches(company: string | undefined, target: string): boolean {
  if (!company || !target.trim()) return false;
  const c = normalize(company.split('•')[0]);
  const t = normalize(target);
  return c === t || c.includes(t);
}

export function rolesOverlap(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}

export type CompanyAffiliation = 'current' | 'past' | null;

// Does `profile` currently work at (or previously work at) `targetCompany`?
export function getCompanyAffiliation(profile: UserProfile, targetCompany: string): CompanyAffiliation {
  const history = profile.workHistory || [];
  const isCurrent =
    history.some((w) => w.isCurrent && companyMatches(w.company, targetCompany)) ||
    companyMatches(profile.companyOrLab, targetCompany);
  if (isCurrent) return 'current';
  if (history.some((w) => !w.isCurrent && companyMatches(w.company, targetCompany))) return 'past';
  return null;
}

// Current employer label used in compact attendee tags, e.g. "Stripe"
export function getCurrentCompany(profile: UserProfile): string | undefined {
  const current = profile.workHistory?.find((w) => w.isCurrent);
  if (current) return current.company;
  return profile.companyOrLab?.split('•')[0].trim() || undefined;
}

// Demo personas have seed "twins" (same person, different id) — match by id or email
export function isSamePerson(a: UserProfile, b: UserProfile): boolean {
  return a.id === b.id || (!!a.email && normalize(a.email) === normalize(b.email || ''));
}

export function getSharedHobbies(viewer: UserProfile, other: UserProfile): string[] {
  return other.hobbies.filter((h) => viewer.hobbies.some((mine) => normalize(mine) === normalize(h)));
}

// Badges for the swipe card: "Works at X" / "Ex-X" when X is one of the viewer's
// targetCompanies, plus "Targeting: Role @ Company" pills for the candidate's goals.
export function getCareerOverlapBadges(viewer: UserProfile, candidate: UserProfile): CareerOverlapBadge[] {
  const badges: CareerOverlapBadge[] = [];
  const viewerTargets = viewer.targetCompanies || [];

  for (const target of viewerTargets) {
    const affiliation = getCompanyAffiliation(candidate, target);
    if (affiliation === 'current') {
      badges.push({ kind: 'works-at', label: `Works at ${target}`, company: target });
    } else if (affiliation === 'past') {
      badges.push({ kind: 'ex-company', label: `Ex-${target}`, company: target });
    }
  }

  const candidateCompanies = candidate.targetCompanies || [];
  const candidateRoles = candidate.targetRoles || [];
  if (candidateCompanies.length > 0 && candidateRoles.length > 0) {
    const viewerEmployer = getCurrentCompany(viewer);
    const relevance = (company: string) => {
      if (viewerEmployer && companyMatches(viewerEmployer, company)) return 2; // they want to work where you work
      if (viewerTargets.some((t) => normalize(t) === normalize(company))) return 1; // you share a target
      return 0;
    };
    const companies = [...candidateCompanies].sort((a, b) => relevance(b) - relevance(a));
    const viewerRoles = viewer.targetRoles || [];
    const roles = [...candidateRoles].sort(
      (a, b) =>
        Number(viewerRoles.some((r) => rolesOverlap(r, b))) - Number(viewerRoles.some((r) => rolesOverlap(r, a)))
    );

    companies.slice(0, 2).forEach((company, i) => {
      const role = roles[i % roles.length];
      badges.push({
        kind: relevance(company) > 0 ? 'shared-target' : 'targeting',
        label: `Targeting: ${role} @ ${company}`,
        company,
        role,
      });
    });
  }

  return badges;
}

// Each intent that genuinely lines up (e.g. mentor <-> mentee) is worth as much as two shared hobbies
export const SWIPE_MUTUAL_INTENT_WEIGHT = 20;

export function buildSwipeCandidate(viewer: UserProfile, profile: UserProfile): SwipeCandidate {
  const sharedHobbies = getSharedHobbies(viewer, profile);
  const careerBadges = getCareerOverlapBadges(viewer, profile);
  const mutualIntents = getMutualIntents(viewer, profile);
  const overlapScore =
    mutualIntents.length * SWIPE_MUTUAL_INTENT_WEIGHT +
    sharedHobbies.length * 10 +
    careerBadges.reduce((sum, b) => {
      if (b.kind === 'works-at') return sum + 30;
      if (b.kind === 'ex-company') return sum + 15;
      if (b.kind === 'shared-target') return sum + 10;
      return sum;
    }, 0);

  return {
    ...profile,
    workHistory: profile.workHistory || [],
    targetCompanies: profile.targetCompanies || [],
    targetRoles: profile.targetRoles || [],
    sharedHobbies,
    careerBadges,
    mutualIntents,
    overlapScore,
  };
}

// ---------------------------------------------------------------------------
// Multi-Factor Event Recommendation Engine
// ---------------------------------------------------------------------------

export const EVENT_SCORE_WEIGHTS = {
  sharedTag: 15,
  attendeeSharedHobby: 5,
  attendeeAtTargetCompany: 25,
  attendeeExTargetCompany: 15,
  attendeeSameMajor: 12,
  attendeeSameGradYear: 10,
  attendeeSharedTargetRole: 12,
  perAttendee: 3,
  maxAttendeeVolume: 15,
} as const;

// "Recommended For You" = the top few events that also clear an absolute score bar
export const RECOMMENDED_SCORE_THRESHOLD = 50;
export const RECOMMENDED_MAX_COUNT = 4;

export interface OverlappingAttendee {
  id: string;
  name: string;
  avatarUrl: string;
  reason: string;
  tag: string; // compact label, e.g. "'18 @ Stripe"
  weight: number;
}

export interface EventScoreDetails {
  score: number;
  matchReasons: string[];
  attendeeHighlightText?: string;
  overlappingAttendees: OverlappingAttendee[];
}

const majorKey = (major: string) => normalize(major).split(/[\s(&]/)[0];
const classTag = (year: number) => `'${String(year).slice(-2)}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function getEventScoreDetails(
  event: EventItem,
  user: UserProfile,
  allUsers: UserProfile[] = INITIAL_PROFILES
): EventScoreDetails {
  const W = EVENT_SCORE_WEIGHTS;
  let score = 0;
  const matchReasons: string[] = [];

  // 1. Shared hobbies between the viewer and the event's tags
  const sharedTags = event.tags.filter((t) => user.hobbies.some((h) => normalize(h) === normalize(t)));
  score += sharedTags.length * W.sharedTag;
  if (sharedTags.length > 0) {
    matchReasons.push(plural(sharedTags.length, 'Shared Hobby', 'Shared Hobbies'));
  }

  // 2. Who is going: weighted network overlap per attendee
  const attendees = (event.attendees || [])
    .filter((id) => id !== user.id)
    .map((id) => allUsers.find((p) => p.id === id))
    .filter((p): p is UserProfile => !!p && !isSamePerson(p, user));

  const overlapping: OverlappingAttendee[] = [];
  const matchedCompanies = new Set<string>();
  let atTargetCount = 0;
  let sameMajorCount = 0;
  let sameClassCount = 0;
  let sharedRoleCount = 0;
  const attendeeHobbies = new Set<string>();

  for (const attendee of attendees) {
    let weight = 0;
    const reasons: string[] = [];
    let matchedCompany: string | undefined;

    for (const target of user.targetCompanies || []) {
      const affiliation = getCompanyAffiliation(attendee, target);
      if (affiliation === 'current') {
        weight += W.attendeeAtTargetCompany;
        reasons.push(`Works at ${target}`);
        matchedCompany = target;
        break;
      }
      if (affiliation === 'past' && !matchedCompany) {
        weight += W.attendeeExTargetCompany;
        reasons.push(`Ex-${target}`);
        matchedCompany = target;
        break;
      }
    }
    if (matchedCompany) {
      atTargetCount++;
      matchedCompanies.add(matchedCompany);
    }

    if (user.major && attendee.major && majorKey(user.major) === majorKey(attendee.major)) {
      weight += W.attendeeSameMajor;
      sameMajorCount++;
      reasons.push(`${attendee.major.split(' (')[0]} major`);
    }

    if (user.gradYear && attendee.gradYear === user.gradYear) {
      weight += W.attendeeSameGradYear;
      sameClassCount++;
      reasons.push(`Class of ${classTag(attendee.gradYear)}`);
    }

    const sharedRole = (user.targetRoles || []).find((r) =>
      (attendee.targetRoles || []).some((ar) => rolesOverlap(r, ar))
    );
    if (sharedRole) {
      weight += W.attendeeSharedTargetRole;
      sharedRoleCount++;
      reasons.push(`Also targeting ${sharedRole}`);
    }

    const shared = getSharedHobbies(user, attendee);
    if (shared.length > 0) {
      weight += shared.length * W.attendeeSharedHobby;
      shared.forEach((h) => attendeeHobbies.add(h));
      reasons.push(`Shares ${shared[0]}`);
    }

    score += weight;

    if (weight > 0) {
      const company = matchedCompany || (attendee.role === 'alumni' ? getCurrentCompany(attendee) : undefined);
      overlapping.push({
        id: attendee.id,
        name: attendee.name,
        avatarUrl: attendee.avatarUrl,
        reason: reasons[0],
        tag: company ? `${classTag(attendee.gradYear)} @ ${company}` : classTag(attendee.gradYear),
        weight,
      });
    }
  }

  overlapping.sort((a, b) => b.weight - a.weight);

  if (atTargetCount > 0) {
    matchReasons.push(`${atTargetCount} Going from ${Array.from(matchedCompanies).join(', ')}`);
  }
  if (sameMajorCount > 0) {
    matchReasons.push(`${sameMajorCount} from your Major`);
  }
  if (sameClassCount > 0) {
    matchReasons.push(`${sameClassCount} from Class of ${classTag(user.gradYear)}`);
  }
  if (sharedRoleCount > 0) {
    matchReasons.push(`${sharedRoleCount} Share Your Target Roles`);
  }
  if (sharedTags.length === 0 && attendeeHobbies.size > 0) {
    matchReasons.push(`Attendees into ${Array.from(attendeeHobbies).slice(0, 2).join(', ')}`);
  }

  // 3. Host & intent alignment
  if (event.isHostAlum) {
    score += user.role === 'student' ? 20 : 15;
    matchReasons.push(user.role === 'student' ? 'Alumni-Hosted Pop-Up' : 'Alumni Peer Network');
  }
  if (user.intents.includes('co-founder') && (event.category === 'startup' || event.tags.some((t) => normalize(t) === 'ai startups'))) {
    score += 25;
    matchReasons.push('Aligned with Co-Founder Intent');
  }
  const wantsMentorship = user.intents.includes('find-mentor') || user.intents.includes('give-mentorship');
  if (wantsMentorship && (event.isHostAlum || event.category === 'networking')) {
    score += 25;
    matchReasons.push('Mentorship Focus');
  }
  if (user.intents.includes('casual') && ['coffee', 'social', 'sports'].includes(event.category)) {
    score += 20;
  }

  // 4. General momentum: a few points for each person going
  score += Math.min((event.attendees || []).length * W.perAttendee, W.maxAttendeeVolume);

  // Human-readable summary, e.g. "2 Shared Hobbies • Sarah ('18 @ Stripe) + 2 going"
  const parts: string[] = [];
  if (sharedTags.length > 0) parts.push(plural(sharedTags.length, 'Shared Hobby', 'Shared Hobbies'));
  const lead = overlapping[0] ?? (attendees[0] && { name: attendees[0].name, tag: classTag(attendees[0].gradYear) });
  if (lead) {
    const others = attendees.length - 1;
    const firstName = lead.name.split(' ')[0];
    parts.push(`${firstName} (${lead.tag})${others > 0 ? ` + ${others} going` : ' is going'}`);
  }

  return {
    score,
    matchReasons: matchReasons.slice(0, 4),
    attendeeHighlightText: parts.length > 0 ? parts.join(' • ') : undefined,
    overlappingAttendees: overlapping.slice(0, 4),
  };
}

// Hobby & Network Overlap Scoring (returns the numeric score for backwards compatibility)
export function scoreEventByHobbiesAndNetwork(
  event: EventItem,
  user: UserProfile,
  allUsers: UserProfile[] = INITIAL_PROFILES
): number {
  return getEventScoreDetails(event, user, allUsers).score;
}

// Fired (async) whenever the signed-in profile changes so isolated modules can re-sync
export const USER_CHANGED_EVENT = 'thirdplace:user-changed';

export class Repository {
  private static isSafeStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && 'localStorage' in window;
    } catch {
      return false;
    }
  }

  static getCurrentUser(): UserProfile {
    if (this.isSafeStorageAvailable()) {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (data) {
          const parsed = JSON.parse(data);
          // Check TTL on openToMeet
          if (parsed.openToMeetExpiresAt && parsed.openToMeetExpiresAt < Date.now()) {
            parsed.isOpenToMeet = false;
          }
          return normalizeProfile(parsed);
        }
      } catch (e) {
        console.warn('Error reading currentUser from localStorage, resetting:', e);
      }
    }
    return INITIAL_CURRENT_USER;
  }

  static setCurrentUser(user: UserProfile): void {
    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(normalizeProfile(user)));
      } catch (e) {
        console.warn('Error saving currentUser to localStorage:', e);
      }
      // Deferred so listeners never setState while another component is rendering
      setTimeout(() => window.dispatchEvent(new Event(USER_CHANGED_EVENT)), 0);
    }
  }

  // Merge a change into the current user and the shared directory (for views without AuthContext)
  static updateCurrentUser(updates: Partial<UserProfile>): UserProfile {
    const updated = { ...this.getCurrentUser(), ...updates };
    this.setCurrentUser(updated);
    this.saveProfile(updated);
    return updated;
  }

  static getEvents(): EventItem[] {
    let events: EventItem[] = [];
    if (this.isSafeStorageAvailable()) {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
        if (data) {
          events = JSON.parse(data);
        } else {
          events = INITIAL_EVENTS;
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        }
      } catch (e) {
        console.warn('Error reading events from localStorage, resetting to initial:', e);
        events = INITIAL_EVENTS;
      }
    } else {
      events = INITIAL_EVENTS;
    }

    // Roll demo pop-ups forward, capitalize tags, then apply expiration filtering
    const stored = events;
    events = this.renewSeedEvents(events).map(normalizeEvent);
    const validEvents = filterExpiredItems(events);
    const changed =
      validEvents.length !== stored.length ||
      validEvents.some((e, i) => e.id !== stored[i]?.id || e.expiresAt !== stored[i]?.expiresAt);
    if (changed && this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(validEvents));
      } catch {}
    }
    return this.asCurrentUser(validEvents);
  }

  /**
   * Demo personas have seed "twins" (same person, different id): seed pop-ups list e.g.
   * 'user_sarah_jenkins' while the signed-in Sarah is 'current_user_sarah_18'. Read the twin's
   * RSVPs/hosting as the signed-in user's, so "Going", Leave, counts and My Plans all agree.
   */
  private static asCurrentUser(events: EventItem[]): EventItem[] {
    const me = this.getCurrentUser();
    const directory = this.readStoredProfiles();
    const twins = new Set(
      (directory.length ? directory : INITIAL_PROFILES).filter((p) => p.id !== me.id && isSamePerson(p, me)).map((p) => p.id)
    );
    if (twins.size === 0) return events;
    return events.map((e) => {
      const touches = twins.has(e.hostId) || e.attendees.some((id) => twins.has(id));
      if (!touches) return e;
      return {
        ...e,
        hostId: twins.has(e.hostId) ? me.id : e.hostId,
        attendees: [...new Set(e.attendees.map((id) => (twins.has(id) ? me.id : id)))],
      };
    });
  }

  /**
   * Built-in demo pop-ups are "recurring": when one expires (or was already pruned),
   * it is re-issued with fresh start / end / expiry times so the radar never goes empty
   * between demo sessions. RSVPs on it are kept. User-hosted pop-ups expire normally.
   */
  private static renewSeedEvents(events: EventItem[]): EventItem[] {
    const now = Date.now();
    const freshSeeds = buildInitialEvents(now);
    const ecosystemSeeds = buildHobbyEcosystemEvents(now);
    const templates = new Map([...freshSeeds, ...ecosystemSeeds].map((e) => [e.id, e]));

    const renewed = events.map((event) => {
      const template = templates.get(event.id);
      if (!template || event.expiresAt > now) return event;
      const { startTime, endTime, expiresAt, createdAt } = template;
      return { ...event, startTime, endTime, expiresAt, createdAt };
    });

    // Restore seeds that an older build already pruned from storage. Volleyball / Baking
    // pop-ups only come back if a LinkedIn import seeded that ecosystem before.
    const present = new Set(renewed.map((e) => e.id));
    const hasEcosystem = this.readStoredProfiles().some((p) => p.id === HOBBY_ECOSYSTEM_PROFILES[0].id);
    const deleted = new Set(this.getDeletedEventIds());
    const missing = [...freshSeeds, ...(hasEcosystem ? ecosystemSeeds : [])].filter(
      (e) => !present.has(e.id) && !deleted.has(e.id)
    );
    return [...renewed, ...missing];
  }

  private static readStoredProfiles(): UserProfile[] {
    if (!this.isSafeStorageAvailable()) return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '[]');
    } catch {
      return [];
    }
  }

  static saveEvent(event: EventItem): void {
    const current = this.getEvents();
    const updated = [normalizeEvent(event), ...current.filter((e) => e.id !== event.id)];
    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving event:', e);
      }
    }
  }

  private static getDeletedEventIds(): string[] {
    if (!this.isSafeStorageAvailable()) return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_EVENTS) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Delete a pop-up. Only its host can (twins count, see isSamePerson). Built-in demo pop-ups
   * are remembered as deleted so renewSeedEvents doesn't re-issue them.
   */
  static deleteEvent(eventId: string, viewer: UserProfile): boolean {
    const events = this.getEvents(); // twin hosts already read as the signed-in user
    const event = events.find((e) => e.id === eventId);
    if (!event || event.hostId !== viewer.id) return false;
    if (!this.isSafeStorageAvailable()) return false;
    try {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events.filter((e) => e.id !== eventId)));
      const deleted = new Set(this.getDeletedEventIds());
      deleted.add(eventId);
      localStorage.setItem(STORAGE_KEYS.DELETED_EVENTS, JSON.stringify([...deleted]));
    } catch (e) {
      console.warn('Error deleting event:', e);
      return false;
    }
    return true;
  }

  static rsvpEvent(eventId: string, userId: string): boolean {
    const events = this.getEvents();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return false;

    const event = events[index];
    const isAttending = event.attendees.includes(userId);
    // The host can't "leave" their own pop-up; they delete it instead (deleteEvent)
    if (isAttending && event.hostId === userId) return false;
    if (isAttending) {
      event.attendees = event.attendees.filter((id) => id !== userId);
    } else {
      if (event.attendees.length < event.maxAttendees) {
        event.attendees.push(userId);
      } else {
        return false; // full
      }
    }
    events[index] = event;

    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
      } catch (e) {
        console.warn('Error updating RSVP in localStorage:', e);
      }
    }
    return true;
  }

  static getProfiles(): UserProfile[] {
    let profiles: UserProfile[] = [];
    if (this.isSafeStorageAvailable()) {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
        if (data) {
          profiles = JSON.parse(data);
        } else {
          profiles = INITIAL_PROFILES;
          localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
        }
      } catch (e) {
        console.warn('Error reading profiles from localStorage, resetting to initial:', e);
        profiles = INITIAL_PROFILES;
      }
    } else {
      profiles = INITIAL_PROFILES;
    }

    // Capitalize hobbies, keep demo people "Open to Meet", and apply the openToMeet expiry
    const now = Date.now();
    const seedOpenFor = new Map(
      [...INITIAL_PROFILES, ...HOBBY_ECOSYSTEM_PROFILES]
        .filter((p) => p.isOpenToMeet && p.openToMeetExpiresAt)
        .map((p) => [p.id, p.openToMeetExpiresAt! - SEED_BUILT_AT])
    );
    return profiles.map((p) => {
      let profile = normalizeProfile(p);
      const openFor = seedOpenFor.get(profile.id);
      if (openFor && (profile.openToMeetExpiresAt ?? 0) < now) {
        profile = { ...profile, isOpenToMeet: true, openToMeetExpiresAt: now + openFor };
      }
      if (profile.openToMeetExpiresAt && profile.openToMeetExpiresAt < now) {
        return { ...profile, isOpenToMeet: false };
      }
      return profile;
    });
  }

  static saveProfile(profile: UserProfile): void {
    const current = this.getProfiles();
    const updated = [normalizeProfile(profile), ...current.filter((p) => p.id !== profile.id)];
    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving profile:', e);
      }
    }
  }

  // One match per pair of people, regardless of who swiped first
  private static pairKey(m: Pick<MatchItem, 'user1Id' | 'user2Id'>): string {
    return [m.user1Id, m.user2Id].sort().join('|');
  }

  /**
   * Collapses duplicate matches for the same pair (older builds created a new match on every
   * Connect). Keeps the first-saved record's id and the furthest-along status.
   */
  private static dedupeMatches(matches: MatchItem[]): MatchItem[] {
    const byPair = new Map<string, MatchItem>();
    // Stored newest-first; walk oldest-first so the original match id survives
    for (const m of [...matches].reverse()) {
      const key = this.pairKey(m);
      const prev = byPair.get(key);
      if (!prev) {
        byPair.set(key, m);
      } else {
        byPair.set(key, {
          ...prev,
          partnerProfile: m.partnerProfile, // freshest profile snapshot
          status: prev.status === 'scheduled' || m.status === 'scheduled' ? 'scheduled' : m.status,
        });
      }
    }
    return [...byPair.values()].reverse();
  }

  static getMatches(): MatchItem[] {
    if (this.isSafeStorageAvailable()) {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.MATCHES);
        if (data) {
          // Upgrade legacy records (single `mutualIntent`, old profile shape), then merge duplicates
          const normalized = (JSON.parse(data) as (MatchItem & { mutualIntent?: string })[]).map(
            ({ mutualIntent: _legacy, ...m }) => ({
              ...m,
              partnerProfile: normalizeProfile(m.partnerProfile),
              mutualIntents: Array.isArray(m.mutualIntents) ? m.mutualIntents : [],
            })
          );
          return this.dedupeMatches(normalized);
        }
      } catch (e) {
        console.warn('Error reading matches:', e);
      }
    }
    return [];
  }

  /**
   * Matches that belong to this viewer, with `partnerProfile` always being the *other* person.
   * Matches between other people (e.g. the other demo persona's) are excluded.
   */
  static getMatchesFor(viewer: UserProfile): MatchItem[] {
    const profiles = this.getProfiles();
    return this.getMatches().flatMap((m) => {
      if (m.user1Id === viewer.id) return isSamePerson(m.partnerProfile, viewer) ? [] : [m];
      if (m.user2Id === viewer.id) {
        const other = profiles.find((p) => p.id === m.user1Id);
        return other && !isSamePerson(other, viewer) ? [{ ...m, partnerProfile: other }] : [];
      }
      return [];
    });
  }

  /**
   * Cancels a meetup the viewer booked: removes it, puts the match back to pending (so it can be
   * re-planned), and leaves a note in the chat thread. Returns the removed meetup, if any.
   */
  static cancelMeetup(meetupId: string, viewer: UserProfile): CalendarMeetup | undefined {
    const all = this.getScheduledMeetups();
    const meetup = all.find((m) => m.id === meetupId);
    if (!meetup) return undefined;
    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.MEETUPS, JSON.stringify(all.filter((m) => m.id !== meetupId)));
      } catch (e) {
        console.warn('Error cancelling meetup:', e);
      }
    }
    const match = this.findMatchWith(viewer.id, meetup.partnerId) ?? this.getMatches().find((m) => m.id === meetup.matchId);
    if (match) {
      // saveMatch() never downgrades scheduled -> matched (duplicate protection); cancelling is the one
      // legitimate downgrade, so set the status directly
      this.setMatchStatus(match.id, 'matched');
      const when = new Date(meetup.scheduledTime).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      this.sendMessage(match.id, viewer, `Cancelled our meetup on ${when}.`);
    }
    return meetup;
  }

  /** Sets a match's status directly (unlike saveMatch, this can move scheduled back to matched). */
  static setMatchStatus(matchId: string, status: MatchItem['status']): void {
    const updated = this.getMatches().map((m) => (m.id === matchId ? { ...m, status } : m));
    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error updating match status:', e);
      }
    }
  }

  /** Meetups this viewer booked (never one "with themselves" from another persona's data). */
  static getMeetupsFor(viewer: UserProfile): CalendarMeetup[] {
    const matches = this.getMatches();
    const profiles = this.getProfiles();
    return this.getScheduledMeetups().filter((m) => {
      const owner = this.meetupOwner(m, matches);
      if (owner) return owner === viewer.id;
      // Unknown owner (very old record): keep it unless it's with the viewer themself
      const partner = profiles.find((p) => p.id === m.partnerId);
      return m.partnerId !== viewer.id && !(partner && isSamePerson(partner, viewer));
    });
  }

  // Existing match between two people (either direction), if any
  static findMatchWith(viewerId: string, partnerId: string): MatchItem | undefined {
    const key = this.pairKey({ user1Id: viewerId, user2Id: partnerId });
    return this.getMatches().find((m) => this.pairKey(m) === key);
  }

  /** Saves a match; a match for a pair that already has one updates it instead of duplicating. */
  static saveMatch(match: MatchItem): void {
    const matches = this.getMatches();
    const existing = matches.find((m) => m.id === match.id || this.pairKey(m) === this.pairKey(match));
    const merged: MatchItem = existing
      ? {
          ...existing,
          ...match,
          id: existing.id,
          // never downgrade a scheduled match back to pending
          status: existing.status === 'scheduled' && match.status === 'matched' ? 'scheduled' : match.status,
        }
      : match;
    const updated = [merged, ...matches.filter((m) => m !== existing)];
    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving match:', e);
      }
    }
  }

  // Who booked a meetup: explicit ownerId, else the person who started its match
  private static meetupOwner(m: CalendarMeetup, matches: MatchItem[]): string | undefined {
    return m.ownerId ?? matches.find((x) => x.id === m.matchId)?.user1Id;
  }

  // One upcoming meetup per (viewer, partner): stored newest-first, so the first one seen wins
  private static dedupeMeetups(meetups: CalendarMeetup[]): CalendarMeetup[] {
    const matches = this.getMatches();
    const seen = new Set<string>();
    return meetups.filter((m) => {
      const key = `${this.meetupOwner(m, matches) ?? '?'}|${m.partnerId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  static getScheduledMeetups(): CalendarMeetup[] {
    if (this.isSafeStorageAvailable()) {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.MEETUPS);
        if (data) return this.dedupeMeetups(JSON.parse(data));
      } catch (e) {
        console.warn('Error reading meetups:', e);
      }
    }
    return [];
  }

  /** Saves a meetup. Scheduling the same person again reschedules (replaces) their meetup. */
  static saveScheduledMeetup(meetup: CalendarMeetup): void {
    const meetups = this.getScheduledMeetups();
    const matches = this.getMatches();
    const owner = this.meetupOwner(meetup, matches);
    const sameSlot = (m: CalendarMeetup) => m.partnerId === meetup.partnerId && this.meetupOwner(m, matches) === owner;
    const updated = [meetup, ...meetups.filter((m) => m.id !== meetup.id && !sameSlot(m))];
    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.MEETUPS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving meetup:', e);
      }
    }
  }

  // Messaging needs a match id; Re-Connect contacts may not have one yet
  static getOrCreateMatch(viewer: UserProfile, partner: UserProfile): MatchItem {
    const existing = this.findMatchWith(viewer.id, partner.id);
    if (existing) return existing;
    const match: MatchItem = {
      id: `match_${viewer.id}_${partner.id}`,
      user1Id: viewer.id,
      user2Id: partner.id,
      partnerProfile: partner,
      matchedAt: Date.now(),
      status: 'matched',
      sharedHobbies: getSharedHobbies(viewer, partner),
      mutualIntents: getMutualIntents(viewer, partner),
    };
    this.saveMatch(match);
    return match;
  }

  private static readAllMessages(): ChatMessage[] {
    if (!this.isSafeStorageAvailable()) return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
    } catch {
      return [];
    }
  }

  // Thread for one match, oldest first. Includes pending (future `sentAt`) simulated replies.
  static getMessages(matchId: string): ChatMessage[] {
    return this.readAllMessages()
      .filter((m) => m.matchId === matchId)
      .sort((a, b) => a.sentAt - b.sentAt);
  }

  /**
   * Scheduling is unlocked only once both people have actually talked (each has sent at
   * least one delivered message), so availability can be worked out in chat first.
   */
  static hasConversation(matchId: string, viewerId: string, now: number = Date.now()): boolean {
    const delivered = this.getMessages(matchId).filter((m) => m.sentAt <= now);
    return delivered.some((m) => m.senderId === viewerId) && delivered.some((m) => m.senderId !== viewerId);
  }

  // ---- Inbox: conversations + read state (per viewer, so the demo personas stay separate) ----

  private static readChatRead(): Record<string, number> {
    if (!this.isSafeStorageAvailable()) return {};
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_READ) || '{}');
    } catch {
      return {};
    }
  }

  /** Marks everything delivered in a thread (up to `at`) as read by this viewer. */
  static markThreadRead(matchId: string, viewerId: string, at: number = Date.now()): void {
    const read = this.readChatRead();
    const key = `${viewerId}|${matchId}`;
    if ((read[key] ?? 0) >= at) return;
    read[key] = at;
    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.CHAT_READ, JSON.stringify(read));
      } catch {
        // read state is a convenience
      }
    }
  }

  /**
   * The viewer's conversations (threads with at least one delivered message), newest first,
   * with the last message and how many of the partner's messages are unread.
   */
  static getConversations(
    viewer: UserProfile,
    now: number = Date.now()
  ): { match: MatchItem; partner: UserProfile; last: ChatMessage; unread: number }[] {
    const read = this.readChatRead();
    return this.getMatchesFor(viewer)
      .map((match) => {
        const delivered = this.getMessages(match.id).filter((m) => m.sentAt <= now);
        if (delivered.length === 0) return null;
        const lastRead = read[`${viewer.id}|${match.id}`] ?? 0;
        const unread = delivered.filter((m) => m.senderId !== viewer.id && m.sentAt > lastRead).length;
        return { match, partner: match.partnerProfile, last: delivered[delivered.length - 1], unread };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.last.sentAt - a.last.sentAt);
  }

  static getUnreadCount(viewer: UserProfile, now: number = Date.now()): number {
    return this.getConversations(viewer, now).reduce((n, c) => n + c.unread, 0);
  }

  /**
   * Appends a message. When the viewer sends their first message in a thread and a
   * `replyFrom` partner is given, a simulated reply is queued DEMO_REPLY_DELAY_MS later.
   */
  static sendMessage(
    matchId: string,
    sender: UserProfile,
    text: string,
    replyFrom?: UserProfile
  ): ChatMessage | null {
    const body = text.trim();
    if (!body) return null;
    const all = this.readAllMessages();
    const now = Date.now();
    const message: ChatMessage = {
      id: `msg_${now}_${Math.random().toString(36).slice(2, 8)}`,
      matchId,
      senderId: sender.id,
      text: body,
      sentAt: now,
    };
    const next = [...all, message];

    const partnerHasSpoken = all.some((m) => m.matchId === matchId && m.senderId === replyFrom?.id);
    if (replyFrom && !partnerHasSpoken) {
      next.push({
        id: `msg_${now}_reply`,
        matchId,
        senderId: replyFrom.id,
        text: buildDemoPartnerReply(replyFrom, sender),
        sentAt: now + DEMO_REPLY_DELAY_MS,
      });
    }

    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next));
      } catch (e) {
        console.warn('Error saving message:', e);
      }
    }
    return message;
  }

  /**
   * Launches an imported profile into the live ecosystem: makes it the current user,
   * registers it in the shared directory, and seeds the Volleyball / Baking profiles
   * and pop-up events (idempotently) so recommendations light up immediately.
   */
  static registerImportedProfile(profile: UserProfile): void {
    const profiles = this.getProfiles();
    const knownIds = new Set(profiles.map((p) => p.id));
    const nextProfiles = [
      normalizeProfile(profile),
      ...HOBBY_ECOSYSTEM_PROFILES.filter((p) => !knownIds.has(p.id)),
      ...profiles.filter((p) => p.id !== profile.id),
    ];

    const events = this.getEvents();
    const knownEvents = new Set(events.map((e) => e.id));
    const nextEvents = [...buildHobbyEcosystemEvents().filter((e) => !knownEvents.has(e.id)), ...events];

    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(nextProfiles));
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(nextEvents));
      } catch (e) {
        console.warn('Error registering imported profile:', e);
      }
    }
    this.setCurrentUser(profile);
  }

  static resetAllData(): void {
    if (this.isSafeStorageAvailable()) {
      try {
        localStorage.removeItem(STORAGE_KEYS.EVENTS);
        localStorage.removeItem(STORAGE_KEYS.PROFILES);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.MATCHES);
        localStorage.removeItem(STORAGE_KEYS.SWIPES);
        localStorage.removeItem(STORAGE_KEYS.MEETUPS);
        localStorage.removeItem(STORAGE_KEYS.MESSAGES);
        localStorage.removeItem(STORAGE_KEYS.CHAT_READ);
        localStorage.removeItem(STORAGE_KEYS.DELETED_EVENTS);
        // Fresh seed times relative to *now* (INITIAL_EVENTS is stamped once at module load)
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(buildInitialEvents(Date.now())));
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(INITIAL_PROFILES));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_CURRENT_USER));
      } catch (e) {
        console.warn('Error resetting storage:', e);
      }
    }
  }
}
