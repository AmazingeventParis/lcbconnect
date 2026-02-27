import { NextResponse } from "next/server";

const EURIS_BASE = "https://www.eurisportal.eu/api/v3/nts";

// Voies navigables Ile-de-France et region parisienne
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
      next: { revalidate: 300 }, // Cache 5 minutes
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erreur API EuRIS", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    const items = (data.items || []) as Record<string, unknown>[];

    // Filtrer pour les voies IDF
    const idfItems = items.filter((item) => {
      const fairways = item.fairways as string[] | undefined;
      if (!fairways || fairways.length === 0) return false;
      return fairways.some((fw) =>
        IDF_FAIRWAYS.includes(fw.toLowerCase())
      );
    });

    // Filtrer les avis expires
    const now = new Date();
    const activeItems = idfItems.filter((item) => {
      const dateEnd = item.dateEnd as string | undefined;
      if (!dateEnd || dateEnd === "9999-12-31") return true;
      return new Date(dateEnd) >= now;
    });

    const notices = activeItems.map((item) => {
      // Titre en francais
      let titleFr = item.title as string;
      try {
        const titles = JSON.parse(
          (item.multilanguageTitles as string) || "{}"
        );
        if (titles.fr) titleFr = titles.fr;
      } catch {
        /* use default */
      }

      return {
        id: `${item.headerId}_${item.sectionId}`,
        title: titleFr,
        number: item.number,
        organisation: item.organisation,
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
