import { NextResponse } from "next/server";

const EURIS_BASE = "https://www.eurisportal.eu/api/v3/nts";

const IDF_FAIRWAYS = ["seine", "marne", "oise", "val de loire - seine"];

export async function GET() {
  try {
    const filter = "countryCode eq 'fr'";
    const params = new URLSearchParams({
      $filter: filter,
      $orderby: "dateIssue desc",
      $top: "100",
    });

    const res = await fetch(`${EURIS_BASE}?${params}`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erreur API EuRIS", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    const items = (data.items || []) as Record<string, unknown>[];

    const now = new Date();

    const idfItems = items.filter((item) => {
      const fairways = item.fairways as string[] | undefined;
      if (!fairways || fairways.length === 0) return false;
      const isIdf = fairways.some((fw) =>
        IDF_FAIRWAYS.includes(fw.toLowerCase())
      );
      if (!isIdf) return false;
      const dateEnd = item.dateEnd as string | undefined;
      if (dateEnd && dateEnd !== "9999-12-31" && new Date(dateEnd) < now) return false;
      return true;
    });

    const notices = idfItems.map((item) => {
      let titleFr = item.title as string;
      let tooltipFr = "";
      try {
        const titles = JSON.parse((item.multilanguageTitles as string) || "{}");
        if (titles.fr) titleFr = titles.fr;
      } catch { /* */ }
      try {
        const tooltips = JSON.parse((item.multilanguageTooltips as string) || "{}");
        if (tooltips.fr) tooltipFr = tooltips.fr;
      } catch { /* */ }

      return {
        id: `${item.headerId}_${item.sectionId}`,
        title: titleFr,
        tooltip: tooltipFr,
        number: item.number,
        organisation: item.organisation || item.originator,
        dateIssue: item.dateIssue,
        dateStart: item.dateStart,
        dateEnd: item.dateEnd,
        fairways: item.fairways,
        limitations: item.limitations,
        messageType: item.messageTypeMessage,
      };
    });

    return NextResponse.json({ notices, count: notices.length });
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur interne", detail: String(e) },
      { status: 500 }
    );
  }
}
