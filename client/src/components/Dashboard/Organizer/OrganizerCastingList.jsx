// src/components/Dashboard/Organizer/OrganizerCastingList.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../../UI/Card";
import {
  Calendar,
  MapPin,
  Users,
  Banknote,
  Filter as FilterIcon,
} from "lucide-react";
import { BannerImage, BannerPlaceholder } from "../../UI/BannerImage";
import { apiFetch } from "../../../utils/api";
import Modal from "../../UI/Modal";
import Button from "../../UI/Button";
import { useToast } from "../../../context/ToastProvider";
import EditCastingForm from "./EditCastingForm";

const roleDisplayMap = {
  Model: "Model",
  Photographer: "Fotograf",
  Designer: "Projektant",
  Volunteer: "Wolontariusz",
};

// parser: jeśli backend zwróci ISO bez strefy (YYYY-MM-DDTHH:mm:ss), potraktuj jako UTC
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

// format daty+godziny w PL (Warszawa)
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

// pomocniczo: bezpieczne pobranie totalApplicants nawet jeśli backend nie podał wprost
function getTotalFromStats(stats) {
  if (!stats) return null;
  if (typeof stats.totalApplicants === "number") return stats.totalApplicants;
  const p = Number(stats.pending || 0);
  const a = Number(stats.active || 0);
  const r = Number(stats.rejected || 0);
  return p + a + r;
}

// czy wydarzenie już minęło
const isPastEvent = (iso) => {
  const d = parseApiDate(iso);
  if (!d) return false;
  return d.getTime() < Date.now();
};

// role -> minimalny payload do API (zakładamy role po EN)
const roleNormalize = (roles) =>
  (Array.isArray(roles) ? roles : [])
    .filter((r) => r?.role)
    .map((r) => ({
      role: r.role,
      capacity: Number(r.capacity) || 0,
    }));

function OrganizerCastingCard({
  casting,
  bannerUrl,
  selected,
  onSelect, // otwiera ParticipantsModal
  totalApplicantsOverride,
  onDeleted, // po udanym DELETE/PUT -> refetch u rodzica
  onBannerRefresh, // callback: fetchBannerFor
}) {
  const { show: toast } = useToast();

  // preferuj to co przyszło z listy; fallback do nadpisania z lokalnego fetchu
  const totalApplicants =
    getTotalFromStats(casting?.stats) ??
    (typeof totalApplicantsOverride === "number"
      ? totalApplicantsOverride
      : null) ??
    casting?.totalApplicants ??
    casting?.applicantsCount ??
    0;

  const rawStatus = (casting?.status || "Active").toString();
  // ✅ jeżeli data minęła – pokazujemy Zamknięty (bez czekania na API)
  const status = isPastEvent(casting?.eventDate) ? "Closed" : rawStatus;

  const statusCfg =
    status === "Active"
      ? { text: "Aktywny", cls: "bg-green-100 text-green-800" }
      : status === "Draft"
      ? { text: "Szkic", cls: "bg-gray-100 text-gray-700" }
      : status === "Closed"
      ? { text: "Zamknięty", cls: "bg-red-100 text-red-800" }
      : { text: status, cls: "bg-gray-100 text-gray-700" };

  // Potwierdzenie i stan kasowania
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Modal edycji
  const [editOpen, setEditOpen] = useState(false);

  const openDeleteConfirm = (e) => {
    e?.stopPropagation?.();
    setDeleteError(null);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    setConfirmOpen(false);
    try {
      await apiFetch(`/casting/casting/${casting.id}`, { method: "DELETE" });
      // pokaż loader 1.5s dla lepszego UX
      setTimeout(() => {
        onDeleted?.(casting);
        toast("Casting usunięty.", "success");
        setDeleting(false);
      }, 1500);
    } catch (err) {
      setDeleting(false);
      setDeleteError(err?.message || "Nie udało się usunąć castingu.");
      setConfirmOpen(true);
      toast("Nie udało się usunąć castingu.", "error");
    }
  };

  // ✅ Deduplikacja ról w WIDOKU (nie zmienia stanu/serwera)
  const rolesForView = useMemo(() => {
    const raw = Array.isArray(casting?.roles) ? casting.roles : [];
    const seen = new Set();
    const out = [];
    for (const r of raw) {
      const key = r?.role;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        role: key,
        capacity: r?.capacity ?? 0,
        acceptedCount:
          typeof r?.acceptedCount === "number"
            ? r.acceptedCount
            : typeof r?.accepted === "number"
            ? r.accepted
            : 0,
      });
    }
    // Model pierwszy (jeśli występuje)
    const idx = out.findIndex((x) => x.role === "Model");
    if (idx > 0) {
      const [m] = out.splice(idx, 1);
      out.unshift(m);
    }
    return out;
  }, [casting?.roles]);

  const compensationText = String(casting?.compensation ?? "").trim();
  const hasCompensation = compensationText !== "" && compensationText !== "0";

  return (
    <div
      className={[
        "relative",
        "border rounded-lg p-4 transition-colors outline-none",
        "hover:bg-gray-50",
        // bez czerwonego tła: tylko border przy zaznaczeniu
        selected ? "border-[#EA1A62]" : "border-gray-200",
      ].join(" ")}
    >
      {/* KORPUS (klik otwiera ParticipantsModal) */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-selected={selected}
        onClick={() => onSelect(casting)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(casting);
        }}
        className={[
          deleting ? "blur-[2px] pointer-events-none select-none" : "",
          "cursor-pointer",
        ].join(" ")}
      >
        <div className="w-full mb-3">
          {bannerUrl ? (
            <BannerImage
              src={bannerUrl}
              alt={`Banner castingu ${casting.title}`}
              className="rounded-lg"
            />
          ) : (
            <BannerPlaceholder />
          )}
        </div>

        <h3 className="font-medium text-gray-900 mb-2">{casting.title}</h3>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {casting.location}
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {formatDateTime(casting.eventDate)}
          </div>
          {hasCompensation && (
            <div className="flex items-center">
              <Banknote className="w-4 h-4 mr-1" />
              {compensationText}
            </div>
          )}
        </div>

        {/* Liczniki ról (z deduplikacją) */}
        <div className="flex flex-wrap gap-3 mb-2">
          {rolesForView.map((role, idx) => {
            const roleKey = role?.role;
            const display = roleDisplayMap[roleKey] || roleKey || "Rola";
            const accepted = role?.acceptedCount ?? 0;
            const capacity = role?.capacity ?? 0;

            return (
              <span
                key={`${roleKey}-${idx}`}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                title={`${display}: ${accepted}/${capacity}`}
              >
                {display} {accepted}/{capacity}
              </span>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Utworzono:{" "}
            {casting.createdAt
              ? new Date(casting.createdAt).toLocaleDateString("pl-PL")
              : "-"}
          </p>

          <div className="flex items-center gap-2">
            {/* Wszyscy kandydaci */}
            <span
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-800 text-xs rounded-full"
              title={`Wszyscy kandydaci: ${totalApplicants}${
                casting?.stats
                  ? ` (P:${casting.stats.pending ?? 0} • A:${
                      casting.stats.active ?? 0
                    } • R:${casting.stats.rejected ?? 0})`
                  : ""
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {totalApplicants}
            </span>

            <span className={`px-2 py-1 text-xs rounded-full ${statusCfg.cls}`}>
              {statusCfg.text}
            </span>
          </div>
        </div>
      </div>

      {/* PASEK AKCJI (poza korpusem, nie otwiera ParticipantsModal) */}
      <div className="mt-3 flex items-center justify-between">
        {/* Edytuj – ciemny pomarańcz */}
        <Button
          variant="primary"
          size="sm"
          className="flex items-center bg-amber-600 hover:bg-amber-700"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setEditOpen(true);
          }}
          disabled={deleting}
        >
          Edytuj
        </Button>

        {/* Usuń – czerwony, bez ikonki (spinner tylko w trakcie) */}
        <Button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            openDeleteConfirm(e);
          }}
          variant="primary"
          size="sm"
          disabled={deleting}
          className="flex items-center bg-red-600 hover:bg-red-700"
        >
          {deleting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : null}
          Usuń
        </Button>
      </div>

      {/* Overlay loader podczas usuwania */}
      {deleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-transparent" />
        </div>
      )}

      {/* Modal potwierdzenia usuwania */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => (!deleting ? setConfirmOpen(false) : null)}
      >
        <div className="p-5">
          <h4 className="text-lg font-semibold mb-2">Usunąć casting?</h4>
          <p className="text-sm text-gray-600">
            Tytuł: <span className="font-medium">{casting.title}</span>
          </p>
          {deleteError && (
            <div className="mt-3 bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2 text-sm">
              {deleteError}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            {/* Anuluj — szary */}
            <Button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
              className="bg-gray-500 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-600 transition-colors"
            >
              Anuluj
            </Button>

            {/* Usuń — czerwony */}
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition-colors flex items-center"
            >
              {deleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Usuń
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal edycji */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        panelClassName="w-[96vw] max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <EditCastingForm
          casting={casting}
          bannerUrl={bannerUrl}
          onClose={() => setEditOpen(false)}
          onSaved={() => onDeleted?.(casting)}
          onBannerUploaded={(id) => onBannerRefresh?.(id)}
        />
      </Modal>
    </div>
  );
}

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
      className={`w-full text-left px-3 py-2 rounded-md cursor-pointer transition-colors
        ${sortKey === value ? "bg-gray-100" : "hover:bg-gray-50"}`}
      onClick={() => onChange(value, sortDir)}
    >
      {label}
    </button>
  );

  const DirBtn = ({ label, value }) => (
    <button
      type="button"
      className={`px-2 py-1 border rounded-md text-xs cursor-pointer transition-colors
        ${
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
      {/* przycisk jak na screenie: chip, bez strzałki, z focus ringiem */}
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
          <Item label="Liczba zgłoszeń" value="applicants" />

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

export default function OrganizerCastingList({
  castings,
  castingBanners,
  isLoading,
  selectedCastingId,
  onSelectCasting,
  onAfterDelete, // rodzic: refetchCastings?.()
  onBannerRefresh, // rodzic: fetchBannerFor
}) {
  // lokalny cache totalApplicants gdy backend nie dostarczył statystyk w liście
  const [statsMap, setStatsMap] = useState({}); // { [castingId]: { totalApplicants } }

  // zapamiętaj, które castingi już auto-zamknęliśmy (w tej sesji)
  const [autoClosed, setAutoClosed] = useState(() => new Set());

  // --- SORT & FILTER STATE ---
  const [sortKey, setSortKey] = useState("default"); // default | eventDate | status | applicants
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  // leniwe dociąganie statystyk dla tych castingów, które nie mają stats w liście
  useEffect(() => {
    let alive = true;

    async function fetchMissing() {
      const missing = (castings || [])
        .filter(
          (c) =>
            getTotalFromStats(c?.stats) == null && // nie ma totalApplicants w liście
            statsMap[c.id] == null
        )
        .map((c) => c.id);

      if (!missing.length) return;

      const updates = {};
      for (const id of missing) {
        try {
          const res = await apiFetch(`/casting/casting/${id}/all-users`, {
            method: "GET",
          });
          const total =
            (res?.statistics && Number(res.statistics.totalApplicants)) ||
            (Array.isArray(res) ? res.length : 0);
          updates[id] = { totalApplicants: Number.isFinite(total) ? total : 0 };
        } catch {
          updates[id] = { totalApplicants: 0 };
        }
      }
      if (alive) {
        setStatsMap((prev) => ({ ...prev, ...updates }));
      }
    }

    fetchMissing();
    return () => {
      alive = false;
    };
  }, [castings, statsMap]);

  // ✅ Po fetchu: jeśli wydarzenie minęło i status nie Closed → wyślij PUT, aby utrwalić "Closed"
  useEffect(() => {
    if (!Array.isArray(castings) || !castings.length) return;

    const shouldClose = castings.filter((c) => {
      if (!c || !c.id) return false;
      if (autoClosed.has(c.id)) return false;
      const past = isPastEvent(c.eventDate);
      const closed = String(c.status || "Active") === "Closed";
      return past && !closed;
    });

    if (!shouldClose.length) return;

    (async () => {
      const jobs = shouldClose.map((c) => {
        const payload = {
          title: c.title || "",
          description: c.description || "",
          location: c.location || "",
          eventDate: new Date(c.eventDate).toISOString(),
          requirements: c.requirements || "",
          compensation: (c.compensation ?? "").toString(),
          roles: roleNormalize(c.roles),
          tags: Array.isArray(c.tags) ? c.tags : [],
          status: "Closed",
        };
        return apiFetch(`/casting/casting/${c.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json-patch+json" },
          body: JSON.stringify(payload),
        })
          .then(() => c.id)
          .catch(() => null);
      });

      const results = await Promise.allSettled(jobs);
      const closedIds = results
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter(Boolean);

      if (closedIds.length) {
        setAutoClosed((prev) => {
          const next = new Set(prev);
          closedIds.forEach((id) => next.add(id));
          return next;
        });
        // refetch u rodzica, żeby status przyszedł już z API
        onAfterDelete?.();
      }
    })();
  }, [castings, onAfterDelete, autoClosed]);

  // widok listy + sortowanie (useMemo dla performance)
  const content = useMemo(() => {
    if (isLoading) {
      return (
        <p className="text-gray-500 text-center py-4">Ładowanie castingów...</p>
      );
    }
    if (!castings?.length) {
      return (
        <p className="text-gray-500 text-center py-4">
          Nie masz jeszcze żadnych castingów
        </p>
      );
    }

    // --- helpery przeniesione do środka, żeby nie było warningów deps ---
    const effectiveStatus = (c) =>
      isPastEvent(c?.eventDate) ? "Closed" : String(c?.status || "Active");

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

    const applicantsCount = (c) =>
      getTotalFromStats(c?.stats) ??
      statsMap[c.id]?.totalApplicants ??
      c?.totalApplicants ??
      c?.applicantsCount ??
      0;

    const arr = [...castings];

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
      if (sortKey === "applicants") {
        const aa = applicantsCount(a),
          ab = applicantsCount(b);
        return sortDir === "asc" ? aa - ab : ab - aa;
      }
      // default: Active najpierw (rosnąco po dacie), Closed na końcu (malejąco po dacie)
      const aClosed = effectiveStatus(a) === "Closed";
      const bClosed = effectiveStatus(b) === "Closed";
      if (aClosed !== bClosed) return aClosed ? 1 : -1; // Active → top
      if (!aClosed && !bClosed) {
        // Active → rosnąco
        return ts(a) - ts(b);
      }
      // Closed → malejąco
      return ts(b) - ts(a);
    });

    return (
      <div className="space-y-4">
        {arr.map((c) => (
          <OrganizerCastingCard
            key={c.id}
            casting={c}
            bannerUrl={castingBanners[c.id]}
            selected={selectedCastingId === c.id}
            onSelect={onSelectCasting}
            totalApplicantsOverride={statsMap[c.id]?.totalApplicants}
            onDeleted={() => onAfterDelete?.()}
            onBannerRefresh={onBannerRefresh}
          />
        ))}
      </div>
    );
  }, [
    isLoading,
    castings,
    castingBanners,
    selectedCastingId,
    onSelectCasting,
    statsMap, // dla sortowania po applicants
    onAfterDelete,
    onBannerRefresh,
    sortKey,
    sortDir,
  ]);

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#2B2628]">
            Moje castingi
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
      <Card.Content>{content}</Card.Content>
    </Card>
  );
}
