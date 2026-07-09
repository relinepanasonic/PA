'use client';
import { CalendarPlus } from 'lucide-react';

interface AddToGoogleCalendarProps {
  title: string;
  description?: string;
  dateString?: string | null; // ISO or YYYY-MM-DD
}

export default function AddToGoogleCalendar({
  title,
  description = 'Added from Personal Assistant AI Dashboard',
  dateString,
}: AddToGoogleCalendarProps) {
  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Format start/end for Google Calendar URL (YYYYMMDDTHHMMSSZ or YYYYMMDD)
    let datesParam = '';
    if (dateString) {
      const dateObj = new Date(dateString);
      if (!isNaN(dateObj.getTime())) {
        // Create 1 hour duration or full day
        const startIso = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDateObj = new Date(dateObj.getTime() + 60 * 60 * 1000);
        const endIso = endDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        datesParam = `&dates=${startIso}/${endIso}`;
      }
    }

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&details=${encodeURIComponent(description || '')}${datesParam}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={handleAddToCalendar}
      title="Add to Google Calendar"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 hover:bg-blue-500/25 transition-all text-[11px] font-semibold tracking-wide active:scale-95 shadow-sm"
    >
      <CalendarPlus size={13} />
      <span>+ GCal</span>
    </button>
  );
}
