import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;
  let result = line.substring(0, maxLen);
  let idx = maxLen;
  while (idx < line.length) {
    result += "\r\n " + line.substring(idx, idx + maxLen - 1);
    idx += maxLen - 1;
  }
  return result;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("lcb_events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !event) {
    return NextResponse.json(
      { error: "Événement introuvable" },
      { status: 404 }
    );
  }

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const now = new Date();

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LCBconnect//Events//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    foldLine(`UID:${event.id}@lcbconnect`),
    foldLine(`DTSTAMP:${formatICSDate(now)}`),
    foldLine(`DTSTART:${formatICSDate(startDate)}`),
    foldLine(`DTEND:${formatICSDate(endDate)}`),
    foldLine(`SUMMARY:${escapeICS(event.title)}`),
    foldLine(`DESCRIPTION:${escapeICS(event.description)}`),
    foldLine(`LOCATION:${escapeICS(event.location)}`),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const icsContent = icsLines.join("\r\n");

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(event.title)}.ics"`,
    },
  });
}
