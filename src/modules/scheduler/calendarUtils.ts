export interface CalendarEventDetails {
  title: string;
  description?: string;
  locationName: string;
  locationAddress?: string;
  startTime: string | Date;
  durationMinutes?: number;
  partnerName?: string;
  partnerEmail?: string;
  userEmail?: string;
}

/**
 * Formats a Date object or ISO string to UTC format required by iCalendar: YYYYMMDDTHHmmssZ
 */
export function formatDateForIcs(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Pure-TypeScript RFC 5545 compliant .ics calendar file generator
 * Guarantees standard fields: BEGIN:VCALENDAR, SUMMARY, DTSTART, DTEND, LOCATION, END:VCALENDAR
 */
export function generateIcsFile(details: CalendarEventDetails): string {
  const startDate = typeof details.startTime === 'string' ? new Date(details.startTime) : details.startTime;
  const duration = details.durationMinutes || 45;
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  const dtStamp = formatDateForIcs(new Date());
  const dtStart = formatDateForIcs(startDate);
  const dtEnd = formatDateForIcs(endDate);

  const fullLocation = details.locationAddress
    ? `${details.locationName}, ${details.locationAddress}`
    : details.locationName;

  const uid = `tp-meetup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@thirdplace.gatech.edu`;

  const description = details.description
    ? details.description.replace(/\n/g, '\\n')
    : `Georgia Tech ThirdPlace 1-on-1 Coffee Meetup with ${details.partnerName || 'Partner'}.`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ThirdPlace Campus Solutions//Georgia Tech Meetups//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${details.title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${fullLocation}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Generates a one-click Google Calendar deep link
 */
export function generateGoogleCalendarUrl(details: CalendarEventDetails): string {
  const startDate = typeof details.startTime === 'string' ? new Date(details.startTime) : details.startTime;
  const duration = details.durationMinutes || 45;
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  const startStr = formatDateForIcs(startDate);
  const endStr = formatDateForIcs(endDate);

  const fullLocation = details.locationAddress
    ? `${details.locationName}, ${details.locationAddress}`
    : details.locationName;

  const summary = details.title;
  const description = details.description || `ThirdPlace 1-on-1 Meetup with ${details.partnerName || 'Partner'}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary,
    dates: `${startStr}/${endStr}`,
    details: description,
    location: fullLocation,
  });
  // Pre-adds the other person as a guest on the Google Calendar event
  if (details.partnerEmail) params.set('add', details.partnerEmail);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** "45 min", "1 hr", "1.5 hr", "3 hr" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} hr`;
}

/**
 * Browser-safe .ics file downloader
 */
export function downloadIcsFile(filename: string, icsContent: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const safeFilename = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
