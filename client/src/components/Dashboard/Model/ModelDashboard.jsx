// src/components/Casting/Model/ModelDashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { apiFetch } from "../../../utils/api";
import Card from "../../UI/Card";
import Button from "../../UI/Button";
import ApplicationsList from "./ApplicationsList";
import CastingCard from "./CastingCard";
import Modal from "../../UI/Modal";
import { useCastingBanners } from "../../../hooks/useCastingBanners";
import { useToast } from "../../../context/ToastProvider";
import { Filter as FilterIcon } from "lucide-react";

const sortByEventDate = (arr) => {
  const now = Date.now();
  return [...arr].sort((a, b) => {
    const ta = new Date(a?.eventDate || 0).getTime();
    const tb = new Date(b?.eventDate || 0).getTime();

    const aFuture = ta >= now;
    const bFuture = tb >= now;

    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;

    if (aFuture && bFuture) return ta - tb;
    return tb - ta;
  });
};

const normId = (v) => (v == null ? "" : String(v).toLowerCase());

const roleDisplayMap = {
  Model: "Model",
  Photographer: "Fotograf",
  Designer: "Projektant",
  Volunteer: "Wolontariusz",
};

const withMinDelay = async (promise, ms = 1000) => {
  const [res] = await Promise.all([
    promise,
    new Promise((r) => setTimeout(r, ms)),
  ]);
  return res;
};

// ---------- Filtry/sortowanie (UI chip jak u organizatora, bez strzałki) ----------
function SortMenu({ sortKey, sortDir, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick, { passive: true });
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const Item = ({ label, value }) => (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={sortKey === value}
      className={`w-full text-left px-3 py-2 rounded-md cursor-pointer transition-colors ${
        sortKey === value ? "bg-gray-100" : "hover:bg-gray-50"
      }`}
      onClick={() => onChange(value, sortDir)}
    >
      {label}
    </button>
  );

  const DirBtn = ({ label, value }) => (
    <button
      type="button"
      className={`px-2 py-1 border rounded-md text-xs cursor-pointer transition-colors ${
        sortDir === value
          ? "bg-gray-100 border-gray-300"
          : "hover:bg-gray-50 border-gray-300"
      }`}
      onClick={() => onChange(sortKey, value)}
    >
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-2xl
                   border border-gray-300 bg-gray-50 text-gray-800 shadow-inner
                   hover:bg-gray-100 cursor-pointer
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300
                   focus-visible:ring-offset-1 transition-colors"
        title="Filtry"
      >
        <FilterIcon className="w-4 h-4 text-gray-700" />
        Filtry
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 bg-white border border-gray-200
                     rounded-xl shadow-lg p-2 z-20"
        >
          <div className="px-2 py-1 text-xs text-gray-500">Kryterium</div>
          <Item label="Domyślne (Aktywne↑, Zamknięte↓)" value="default" />
          <Item label="Data wydarzenia" value="eventDate" />
          <Item label="Status (Aktywne↔Zamknięte)" value="status" />
          {/* brak „Liczba zgłoszeń” dla modela */}

          <div className="mt-2 px-2 py-1 text-xs text-gray-500">Kierunek</div>
          <div className="flex items-center gap-2 px-2 pb-2">
            <DirBtn label="Rosnąco" value="asc" />
            <DirBtn label="Malejąco" value="desc" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModelDashboard() {
  const { currentUser } = useAuth();
  const { show } = useToast();

  const [castings, setCastings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCasting, setSelectedCasting] = useState(null);

  // participations
  const [userParticipations, setUserParticipations] = useState([]);
  const [participationsByCastingId, setParticipationsByCastingId] = useState(
    new Map()
  );
  const [loadingParticipations, setLoadingParticipations] = useState(false);

  const [applyingId, setApplyingId] = useState(null);

  const { banners: castingBanners } = useCastingBanners(castings);

  // ----- sort state -----
  const [sortKey, setSortKey] = useState("default"); // default | eventDate | status
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  // 1) list of castings
  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch("/casting/casting");
        setCastings(sortByEventDate(Array.isArray(data) ? data : []));
      } catch (e) {
        console.error(e);
        setError("Błąd pobierania castingów");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 2) participations
  const refreshParticipations = async (userId) => {
    if (!userId) return;
    setLoadingParticipations(true);
    try {
      const res = await apiFetch(`/casting/casting/participations/${userId}`, {
        method: "GET",
      });
      const list = Array.isArray(res) ? res : [];
      setUserParticipations(list);

      const map = new Map();
      for (const row of list) {
        if (!row?.castingId) continue;
        map.set(normId(row.castingId), {
          status: row.assignmentStatus,
          role: row.role || "",
          assignmentId: row.assignmentId || null,
        });
      }
      setParticipationsByCastingId(map);
    } catch (e) {
      console.warn("Nie udało się pobrać moich zgłoszeń (participations):", e);
      setUserParticipations([]);
      setParticipationsByCastingId(new Map());
    } finally {
      setLoadingParticipations(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      refreshParticipations(currentUser.id);
    }
  }, [currentUser?.id]);

  const getApplied = (castingId) =>
    participationsByCastingId.get(normId(castingId)) || null;

  // 🔧 widoczność: wszystkie AKTYWNE + te nieaktywne, w których brałem udział
  const visibleCastings = useMemo(() => {
    if (!Array.isArray(castings) || !castings.length) return [];

    const hasAppliedLocal = (castingId) =>
      participationsByCastingId.has(normId(castingId));

    const isEventInPast = (iso) => {
      const d = iso ? new Date(iso) : null;
      return d ? d.getTime() < Date.now() : false;
    };

    const isActiveCasting = (c) => {
      const closed = String(c?.status || "Active") === "Closed";
      const past = isEventInPast(c?.eventDate);
      // Draft/licha też traktujemy jako nieaktywne
      const draft = String(c?.status || "").toLowerCase() === "draft";
      return !closed && !past && !draft;
    };

    // filtr: aktywne zawsze; nieaktywne tylko jeśli brałem udział
    const filtered = castings.filter(
      (c) => isActiveCasting(c) || hasAppliedLocal(c.id)
    );

    // sortowanie
    const effectiveStatus = (c) =>
      isEventInPast(c?.eventDate) || String(c?.status || "Active") === "Closed"
        ? "Closed"
        : String(c?.status || "Active");

    const ts = (c) => {
      const raw = c?.eventDate || c?.createdAt || 0;
      if (!raw) return 0;
      if (
        typeof raw === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)
      ) {
        return new Date(raw + "Z").getTime();
      }
      return new Date(raw).getTime();
    };

    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortKey === "eventDate") {
        const da = ts(a),
          db = ts(b);
        return sortDir === "asc" ? da - db : db - da;
      }
      if (sortKey === "status") {
        const rank = (c) => {
          const s = effectiveStatus(c);
          return s === "Active" ? 0 : s === "Draft" ? 1 : 2;
        };
        const ra = rank(a),
          rb = rank(b);
        return sortDir === "asc" ? ra - rb : rb - ra;
      }
      // domyślne: Active↑ (po dacie rosnąco), Closed↓ (po dacie malejąco)
      const aClosed = effectiveStatus(a) === "Closed";
      const bClosed = effectiveStatus(b) === "Closed";
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      if (!aClosed && !bClosed) return ts(a) - ts(b);
      return ts(b) - ts(a);
    });

    return arr;
  }, [castings, participationsByCastingId, sortKey, sortDir]);

  // ===== warunkowe ekrany =====
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Ładowanie castingów...
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );

  // pomocniczo: rola bieżącego usera (do komunikatu o braku roli)
  const currentUserRoleName =
    currentUser?.role ||
    currentUser?.roleName ||
    currentUser?.userRole?.name ||
    currentUser?.userRole ||
    null;

  // 3) POST – dołącz do castingu (z loadingiem i 1s min delay)
  const handleApply = async (castingId) => {
    if (!currentUser?.id) {
      show("Musisz być zalogowany, aby się zgłosić.", "error");
      return;
    }

    if (participationsByCastingId.has(normId(castingId)) || applyingId) {
      return;
    }

    try {
      setApplyingId(castingId);

      await withMinDelay(
        apiFetch(
          `/casting/casting/${castingId}/participant/${currentUser.id}`,
          { method: "POST" }
        ),
        1000
      );

      // optymistycznie pokaż Pending
      setParticipationsByCastingId((prev) => {
        const next = new Map(prev);
        next.set(normId(castingId), {
          status: "Pending",
          role: "",
          assignmentId: null,
        });
        return next;
      });

      // dociągnij świeże dane
      refreshParticipations(currentUser.id);

      setSelectedCasting(null);
      show("Zgłoszenie zostało wysłane!", "success");
    } catch (err) {
      console.error("Błąd wysyłania zgłoszenia:", err);

      if (err?.status === 409 || err?.status === 500) {
        setParticipationsByCastingId((prev) => {
          const next = new Map(prev);
          next.set(normId(castingId), {
            status: "Pending",
            role: "",
            assignmentId: null,
          });
          return next;
        });
        setSelectedCasting(null);
        show("Już jesteś zgłoszony do tego castingu.", "info");
      } else {
        const msg =
          err?.status === 403
            ? "Nie możesz dołączyć do tego castingu."
            : err?.status === 404
            ? "Casting nie istnieje."
            : "Błąd wysyłania zgłoszenia.";
        show(msg, "error");
      }
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2B2628] mb-2">
            Witaj{currentUser?.firstName ? `, ${currentUser.firstName}` : ""}!
          </h1>
          <p className="text-gray-600">
            Zarządzaj swoimi zgłoszeniami i znajdź nowe okazje
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Moje zgłoszenia */}
          <div className="lg:col-span-1">
            <ApplicationsList
              applications={userParticipations}
              castings={castings}
            />
          </div>

          {/* Widoczne castingi zgodnie z regułą widoczności */}
          <div className="lg:col-span-2">
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[#2B2628]">
                    Dostępne castingi
                  </h2>
                  <SortMenu
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onChange={(nextKey, nextDir) => {
                      setSortKey(nextKey);
                      setSortDir(nextDir);
                    }}
                  />
                </div>
              </Card.Header>
              <Card.Content>
                {!visibleCastings.length ? (
                  <p className="text-gray-500 text-center py-6">
                    Brak castingów do wyświetlenia.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {visibleCastings.map((casting) => {
                      const applied = getApplied(casting.id);
                      const userHasApplied = !!applied;
                      const appliedStatus = applied?.status || null;
                      const appliedRole = applied?.role || null;

                      // Czy casting przewiduje MOJĄ rolę? (komunikat informacyjny)
                      const myRole = currentUserRoleName || "";
                      const myRolePL = myRole
                        ? roleDisplayMap[myRole] || myRole
                        : "";
                      const roleExists = Array.isArray(casting.roles)
                        ? casting.roles.some(
                            (r) =>
                              String(r.role).toLowerCase() ===
                              String(myRole).toLowerCase()
                          )
                        : false;

                      const blockedReason =
                        !userHasApplied && myRole && !roleExists
                          ? `Casting nie przewiduje roli „${myRolePL}”.`
                          : null;

                      const isClosed =
                        String(casting?.status || "Active") === "Closed";
                      const eventInPast = casting?.eventDate
                        ? new Date(casting.eventDate).getTime() < Date.now()
                        : false;

                      const disabledComputed =
                        isClosed ||
                        eventInPast ||
                        userHasApplied ||
                        loadingParticipations ||
                        applyingId === casting.id;

                      return (
                        <CastingCard
                          key={casting.id}
                          casting={casting}
                          bannerUrl={castingBanners[casting.id]}
                          hasApplied={userHasApplied}
                          appliedStatus={appliedStatus}
                          appliedRole={appliedRole}
                          disabled={disabledComputed}
                          blockedReason={blockedReason}
                          onApply={() => {
                            if (disabledComputed || blockedReason) return;
                            setSelectedCasting(casting);
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>

      {/* MODAL POTWIERDZENIA APLIKACJI (bez pola wiadomości) */}
      <Modal
        isOpen={!!selectedCasting}
        backdropImage={
          selectedCasting ? castingBanners[selectedCasting.id] : ""
        }
        onClose={() => {
          if (applyingId) return; // w trakcie wysyłki nie zamykamy
          setSelectedCasting(null);
        }}
      >
        {selectedCasting && (
          <div className="relative">
            {applyingId && (
              <div
                className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20"
                aria-busy="true"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-block h-8 w-8 rounded-full border-4 border-[#EA1A62] border-t-transparent animate-spin" />
                  <span className="text-[#2B2628] font-medium">
                    Wysyłanie zgłoszenia…
                  </span>
                </div>
              </div>
            )}
            <h3
              id="apply-modal-title"
              className="text-lg font-semibold text-[#2B2628] mb-4 px-6 pt-6"
            >
              Wysłać zgłoszenie do: {selectedCasting.title}?
            </h3>

            <div className="flex space-x-3 px-6 pb-6">
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                disabled={!!applyingId}
                onClick={() => setSelectedCasting(null)}
              >
                Anuluj
              </Button>
              <Button
                className="flex-1"
                type="button"
                disabled={!!applyingId}
                onClick={() => handleApply(selectedCasting.id)}
              >
                Tak, wyślij
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
