'use client';
import { CalendarPlus } from 'lucide-react';

interface AddToGoogleCalendarProps {
  title: string;
  description?: string;
  dateString?: string | null; // ISO or YYYY-MM-DD
  startTime?: string;
  endTime?: string;
}

export default function AddToGoogleCalendar({
  title,
  description = 'Added from Personal Assistant AI Dashboard',
  dateString,
  startTime,
  endTime,
}: AddToGoogleCalendarProps) {
  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Format start/end for Google Calendar URL (YYYYMMDDTHHMMSSZ)
    let datesParam = '';
    if (dateString) {
      const ymd = dateString.slice(0, 10);
      const [y, m, d] = ymd.split('-').map(Number);

      let startDateObj: Date;
      let endDateObj: Date;

      if (startTime && /^\d{1,2}:\d{2}/.test(startTime)) {
        const [sHr, sMin] = startTime.split(':').map(Number);
        startDateObj = new Date(y, m - 1, d, sHr, sMin, 0);

        if (endTime && /^\d{1,2}:\d{2}/.test(endTime)) {
          const [eHr, eMin] = endTime.split(':').map(Number);
          endDateObj = new Date(y, m - 1, d, eHr, eMin, 0);
          if (endDateObj <= startDateObj) {
            endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000);
          }
        } else {
          endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000);
        }
      } else {
        startDateObj = new Date(dateString);
        if (isNaN(startDateObj.getTime())) {
          startDateObj = new Date(y, m - 1, d, 9, 0, 0);
        }
        endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000);
      }

      if (!isNaN(startDateObj.getTime())) {
        const startIso = startDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
