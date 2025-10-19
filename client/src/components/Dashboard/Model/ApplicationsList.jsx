// src/components/Casting/Model/ApplicationsList.jsx
import Card from "../../UI/Card";
import {
  Calendar,
  MapPin,
  BadgeCheck,
  Clock,
  XCircle,
  Banknote,
} from "lucide-react";

function StatusPill({ status }) {
  const s = String(status).toLowerCase();
  if (s === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-50 text-green-800">
        <BadgeCheck className="w-3.5 h-3.5" />
        Zaakceptowano
      </span>
    );
  }
  if (s === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-50 text-yellow-800">
        <Clock className="w-3.5 h-3.5" />
        Oczekujące
      </span>
    );
  }
  if (s === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-50 text-red-800">
        <XCircle className="w-3.5 h-3.5" />
        Odrzucono
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
      {status}
    </span>
  );
}

const roleDisplayMap = {
  Model: "Model",
  Photographer: "Fotograf",
  Designer: "Projektant",
  Volunteer: "Wolontariusz",
};

// format „data + godzina” po polsku, w strefie PL
const parseApiDate = (val) => {
  if (!val) return null;
  if (
    typeof val === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(val)
  ) {
    return new Date(val + "Z");
  }
  return new Date(val);
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = parseApiDate(iso);
  return d.toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// pomocnicze: określ czy casting zakończony (status Closed lub data w przeszłości)
const isCastingFinished = (row, casting) => {
  const statusClosed = String(casting?.status || "Active") === "Closed";
  const eventIso = row?.eventDate || casting?.eventDate || null;
  const d = eventIso ? parseApiDate(eventIso) : null;
  const inPast = d ? d.getTime() < Date.now() : false;
  return statusClosed || inPast;
};

export default function ApplicationsList({ applications, castings }) {
  const rows = Array.isArray(applications) ? applications : [];
  const list = Array.isArray(castings) ? castings : [];

  // Wzbogacamy wiersze o eventDate i referencję castingu,
  // filtrujemy zakończone, a następnie sortujemy malejąco po dacie wydarzenia (najnowsze na górze).
  const prepared = rows
    .map((row) => {
      const casting = list.find((c) => c.id === row.castingId);
      const eventIso = row?.eventDate || casting?.eventDate || null;
      const ts = eventIso ? parseApiDate(eventIso)?.getTime() || 0 : 0;
      return { row, casting, eventIso, ts };
    })
    .filter(({ row, casting }) => {
      // Nie pokazuj zgłoszeń z zakończonych castingów
      if (!casting && !row?.eventDate) return true; // brak danych o castingu i dacie — zachowawczo pokaż
      return !isCastingFinished(row, casting);
    })
    .sort((a, b) => b.ts - a.ts); // najnowsze (większy ts) najpierw

  return (
    <Card>
      <Card.Header>
        <h2 className="text-xl font-semibold text-[#2B2628]">
          Moje zgłoszenia
        </h2>
      </Card.Header>
      <Card.Content>
        {!prepared.length ? (
          <p className="text-gray-500 text-center py-4">Brak zgłoszeń.</p>
        ) : (
          <div className="space-y-3">
            {prepared.map(({ row, casting, eventIso }) => {
              const title = row.title || casting?.title || "—";
              const location = row.location || casting?.location || "—";
              const eventDate = eventIso;

              // compensation jako surowy tekst (bez formatowania waluty)
              const rawComp = row?.compensation ?? casting?.compensation ?? "";
              const compensation = String(rawComp || "").trim();
              const showCompensation =
                compensation !== "" && compensation !== "0";

              return (
                <div
                  key={row.assignmentId || row.castingId}
                  className="border rounded-lg p-3 bg-white flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {title}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {location}
                      </span>
                      <span className="inline-flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDateTime(eventDate)}
                      </span>
                      {showCompensation && (
                        <span className="inline-flex items-center">
                          <Banknote className="w-4 h-4 mr-1" />
                          {compensation}
                        </span>
                      )}
                      {row.role ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                          {roleDisplayMap[row.role] || row.role}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <StatusPill status={row.assignmentStatus} />
                </div>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
