// src/pages/Castings.jsx
import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Banknote } from "lucide-react";
import Card from "../components/UI/Card";
import { apiFetch } from "../utils/api";
import { useCastingBanners } from "../hooks/useCastingBanners";
import { BannerImage, BannerPlaceholder } from "../components/UI/BannerImage";

// --- helpers (spójne z CastingCard.jsx) ---
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
const ts = (casting) => {
  const raw = casting?.eventDate || casting?.createdAt || 0;
  if (!raw) return 0;
  if (
    typeof raw === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)
  ) {
    return new Date(raw + "Z").getTime();
  }
  return new Date(raw).getTime();
};
const roleDisplayMap = {
  Model: "Model",
  Photographer: "Fotograf",
  Designer: "Projektant",
  Volunteer: "Wolontariusz",
};

// --- prosta karta tylko do podglądu, bez przycisków ---
function PublicCastingCard({ casting, bannerUrl }) {
  const eventDateTime = formatDateTime(casting.eventDate);
  const createdAtDate = casting.createdAt
    ? parseApiDate(casting.createdAt).toLocaleDateString("pl-PL", {
        timeZone: "Europe/Warsaw",
      })
    : "—";

  const isClosed = String(casting?.status || "Active") === "Closed";
  const eventInPast = casting?.eventDate
    ? new Date(casting.eventDate).getTime() < Date.now()
    : false;
  const showClosedOverlay = isClosed || eventInPast;

  const compensation = String(casting?.compensation ?? "").trim();
  const showCompensation = compensation !== "" && compensation !== "0";

  return (
    <div className="border rounded-lg p-4">
      <div className="relative w-full mb-3">
        {bannerUrl ? (
          <BannerImage
            src={bannerUrl}
            alt={`Banner castingu ${casting.title}`}
            className="rounded-lg"
          />
        ) : (
          <BannerPlaceholder />
        )}

        {showClosedOverlay && (
          <span className="absolute bottom-2 right-2 px-3 py-1.5 rounded-md text-lg font-semibold bg-red-600 text-white shadow-sm">
            Zakończony
          </span>
        )}
      </div>

      <h3 className="font-medium text-gray-900 mb-1 break-words">
        {casting.title}
      </h3>

      {casting.description && (
        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {casting.description}
        </p>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center min-w-0 break-words">
          <MapPin className="w-4 h-4 mr-1 shrink-0" />
          {casting.location}
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          {eventDateTime}
        </div>
        {showCompensation && (
          <div className="flex items-center">
            <Banknote className="w-4 h-4 mr-1" />
            {compensation}
          </div>
        )}
      </div>

      {!!casting.roles?.length && (
        <div className="flex flex-wrap gap-2 mb-4">
          {casting.roles.map((role, idx) => {
            const display = roleDisplayMap[role.role] || role.role;
            const accepted = role?.acceptedCount ?? 0;
            const capacity = role?.capacity ?? 0;
            return (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                title={`${display}: ${accepted}/${capacity}`}
              >
                {display} {accepted}/{capacity}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">Utworzono: {createdAtDate}</div>
        {/* brak CTA / statusów — to jest widok publiczny */}
      </div>
    </div>
  );
}

export default function CastingsPage() {
  const [castings, setCastings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // pobierz wszystkie castingi
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("/casting/casting");
        const list = Array.isArray(data) ? data : [];
        setCastings(list);
      } catch (e) {
        console.error(e);
        setError("Nie udało się pobrać listy castingów.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // bannery (ten sam hook co w ModelDashboard)
  const { banners } = useCastingBanners(castings);

  // sort: od najnowszych do najstarszych (eventDate DESC, potem createdAt DESC)
  const sorted = useMemo(() => {
    const arr = Array.isArray(castings) ? [...castings] : [];
    arr.sort((a, b) => ts(b) - ts(a));
    return arr;
  }, [castings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Ładowanie castingów...
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2B2628] mb-2">Castingi</h1>
          <p className="text-gray-600">
            Przeglądaj wszystkie dostępne i zakończone castingi — od najnowszych
            do najstarszych.
          </p>
        </div>

        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold text-[#2B2628]">
              Lista castingów
            </h2>
          </Card.Header>
          <Card.Content>
            {!sorted.length ? (
              <p className="text-gray-500 text-center py-6">
                Brak castingów do wyświetlenia.
              </p>
            ) : (
              <div className="space-y-6">
                {sorted.map((casting) => (
                  <PublicCastingCard
                    key={casting.id}
                    casting={casting}
                    bannerUrl={banners[casting.id]}
                  />
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
