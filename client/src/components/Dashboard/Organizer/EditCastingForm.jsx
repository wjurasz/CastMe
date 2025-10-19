// src/components/Dashboard/Organizer/EditCastingForm.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../../UI/Card";
import Button from "../../UI/Button";
import Input from "../../UI/Input";
import { X, Plus } from "lucide-react";
import { apiFetch } from "../../../utils/api";
import { BannerImage } from "../../UI/BannerImage";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "../../../context/ToastProvider";

const ALL_ROLES = ["Model", "Fotograf", "Projektant", "Wolontariusz"];
// na górze pliku
// tylko te dwa statusy
const STATUS_VALUES = ["Active", "Closed"];
const STATUS_LABELS = {
  Active: "Aktywny",
  Closed: "Zamknięty",
};

// UI(PL) -> API(EN)
const roleMap = {
  Model: "Model",
  Fotograf: "Photographer",
  Projektant: "Designer",
  Wolontariusz: "Volunteer",
};
// API(EN) -> UI(PL)
const roleMapBack = {
  Model: "Model",
  Photographer: "Fotograf",
  Designer: "Projektant",
  Volunteer: "Wolontariusz",
};

/** Absolutny URL dla ścieżek z API (np. '/uploads/...') */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "");
const toAbsoluteUrl = (u) => {
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
};
const bust = (url) =>
  !url ? "" : `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;

/** Wspólny cache bannerów z listą */
const BANNERS_STORAGE_KEY = "castingBannerUrls";
const readBannerCache = () => {
  try {
    return JSON.parse(localStorage.getItem(BANNERS_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};
const writeBannerCache = (obj) => {
  try {
    localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(obj));
  } catch {}
};

const ALLOWED_IMAGE = /^image\/(png|jpe?g|webp|gif)$/i;
const MAX_IMAGE_MB = 5;
const TAG_MAX_LEN = 24;
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 100;

const toDatetimeLocalValue = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

// z API -> do formularza (PL), bez duplikatów, Model pierwszy
function sanitizeRolesFromApi(apiRoles) {
  const arr = Array.isArray(apiRoles) ? apiRoles : [];
  const seen = new Set();
  const unique = [];
  for (const r of arr) {
    const pl = roleMapBack[r?.role] || "Model";
    if (seen.has(pl)) continue;
    seen.add(pl);
    unique.push({ role: pl, capacity: r?.capacity ?? "" });
  }
  const modelIdx = unique.findIndex((r) => r.role === "Model");
  if (modelIdx === -1) unique.unshift({ role: "Model", capacity: "" });
  else if (modelIdx !== 0) {
    const [m] = unique.splice(modelIdx, 1);
    unique.unshift(m);
  }
  return unique;
}

// z formularza -> do API (EN), bez duplikatów, Model pierwszy
function normalizeRolesForSubmit(rolesPl) {
  const cleaned = (Array.isArray(rolesPl) ? rolesPl : [])
    .filter((r) => r?.role)
    .map((r) => ({
      role: roleMap[r.role],
      capacity: Math.trunc(Number(r.capacity)),
    }))
    .filter(
      (r) =>
        r.role &&
        Number.isFinite(r.capacity) &&
        r.capacity >= CAPACITY_MIN &&
        r.capacity <= CAPACITY_MAX
    );

  const seen = new Set();
  const out = [];
  for (const r of cleaned) {
    if (seen.has(r.role)) continue;
    seen.add(r.role);
    out.push(r);
  }
  const modelIdx = out.findIndex((r) => r.role === "Model");
  if (modelIdx > 0) {
    const [m] = out.splice(modelIdx, 1);
    out.unshift(m);
  }
  if (modelIdx === -1) {
    const modelCap = Math.trunc(Number(rolesPl?.[0]?.capacity)) || 1;
    out.unshift({ role: "Model", capacity: modelCap });
  }
  return out;
}

// schema
const roleItemSchema = z.object({
  role: z.enum(ALL_ROLES, { required_error: "Wybierz rolę" }),
  capacity: z.union([z.string(), z.number()]).refine((v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isInteger(n) && n >= CAPACITY_MIN && n <= CAPACITY_MAX;
  }, `Podaj poprawną liczbę miejsc (${CAPACITY_MIN}–${CAPACITY_MAX})`),
});

const formSchema = z
  .object({
    title: z
      .string({ required_error: "Tytuł jest wymagany" })
      .trim()
      .min(5)
      .max(100),
    description: z
      .string({ required_error: "Opis jest wymagany" })
      .trim()
      .min(20)
      .max(2000),
    requirements: z.string().trim().max(1000),
    location: z.string().trim().min(2).max(100),
    deadline: z
      .string({ required_error: "Termin jest wymagany" })
      .refine((v) => !Number.isNaN(new Date(v).getTime()), "Niepoprawna data"),
    showCompensation: z.boolean().default(false),
    compensation: z
      .string()
      .transform((v) => v.trim())
      .optional(),
    roles: z.array(roleItemSchema).min(1).max(ALL_ROLES.length),
    tags: z
      .string()
      .transform((v) => v.trim())
      .optional(),
    bannerFile: z
      .any()
      .optional()
      .refine(
        (file) =>
          !file || file instanceof File || (file && file[0] instanceof File),
        "Nieprawidłowy plik"
      )
      .refine((file) => {
        const f = file instanceof File ? file : file?.[0];
        if (!f) return true;
        return ALLOWED_IMAGE.test(f.type);
      }, "Dozwolone formaty: PNG, JPG, JPEG, WEBP, GIF")
      .refine((file) => {
        const f = file instanceof File ? file : file?.[0];
        if (!f) return true;
        return f.size <= MAX_IMAGE_MB * 1024 * 1024;
      }, `Maksymalny rozmiar pliku to ${MAX_IMAGE_MB} MB`),
    status: z.enum(STATUS_VALUES).default("Active"),
  })
  .refine(
    (data) => {
      if (!data.showCompensation) return true;
      const txt = (data.compensation || "").trim();
      return txt.length <= 100;
    },
    { path: ["compensation"], message: "Wynagrodzenie maks. 100 znaków" }
  )
  .refine((data) => data.roles[0]?.role === "Model", {
    path: ["roles", 0, "role"],
    message: "Pierwsza rola musi być „Model”",
  });

const DEFAULT_VALUES = {
  title: "",
  description: "",
  requirements: "",
  location: "",
  compensation: "",
  showCompensation: false,
  tags: "",
  roles: [{ role: "Model", capacity: "" }],
  deadline: "",
  bannerFile: undefined,
  status: "Active",
};

export default function EditCastingForm({
  casting,
  onClose,
  onSaved,
  onBannerUploaded, // np. fetchBannerFor z rodzica
  bannerUrl, // aktualny URL do podglądu
}) {
  const { show } = useToast();
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "roles",
  });

  // Inicjalizacja formularza danymi castingu
  useEffect(() => {
    if (!casting) return;
    const initialRoles = sanitizeRolesFromApi(casting.roles);
    reset({
      title: casting.title || "",
      description: casting.description || "",
      requirements: casting.requirements || "",
      location: casting.location || "",
      compensation: casting.compensation || "",
      showCompensation:
        !!casting.compensation && String(casting.compensation).trim() !== "0",
      tags: (Array.isArray(casting.tags) ? casting.tags : []).join(", "),
      roles: initialRoles,
      deadline: toDatetimeLocalValue(casting.eventDate),
      bannerFile: undefined,
      status: STATUS_VALUES.includes(casting?.status)
        ? casting.status
        : "Active",
    });
    replace(initialRoles); // ważne przy RHF – faktycznie podmienia tablicę pól
  }, [casting, reset, replace]);

  // Watchery
  const roles = watch("roles");
  const showCompensation = watch("showCompensation");
  const bannerField = watch("bannerFile");

  const selectedRoleNames = useMemo(
    () => roles.map((r) => r.role).filter(Boolean),
    [roles]
  );
  const availableExtraRoles = useMemo(
    () =>
      ALL_ROLES.filter((r) => r !== "Model" && !selectedRoleNames.includes(r)),
    [selectedRoleNames]
  );

  const addEmptyRoleRow = () => {
    if (roles.length >= ALL_ROLES.length) return;
    append({ role: "", capacity: "" });
  };
  const removeRoleRow = (index) => {
    if (index === 0) return;
    remove(index);
  };

  const onBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setValue("bannerFile", undefined, { shouldValidate: true });
      return;
    }
    if (!ALLOWED_IMAGE.test(file.type)) {
      setError("bannerFile", {
        type: "manual",
        message: "Dozwolone formaty: PNG, JPG, JPEG, WEBP, GIF",
      });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError("bannerFile", {
        type: "manual",
        message: `Maksymalny rozmiar pliku to ${MAX_IMAGE_MB} MB`,
      });
      e.target.value = "";
      return;
    }
    clearErrors("bannerFile");
    setValue("bannerFile", file, { shouldValidate: true });
  };

  const parseTags = (raw) => {
    if (!raw) return [];
    const arr = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());
    const unique = Array.from(new Set(arr));
    return unique.slice(0, 5);
  };

  const uploadCastingBanner = useCallback(
    async (castingId, file) => {
      if (!castingId || !file) return null;
      const fd = new FormData();
      fd.append("File", file);
      const res = await apiFetch(`/casting/casting/${castingId}/banner`, {
        method: "POST",
        body: fd,
      });
      const fileUrl = res?.url ? toAbsoluteUrl(res.url) : "";
      const busted = bust(fileUrl);
      const cache = readBannerCache();
      writeBannerCache({ ...cache, [castingId]: busted || null });
      onBannerUploaded?.(castingId);
      return busted;
    },
    [onBannerUploaded]
  );

  const onSubmit = async (data) => {
    // jeśli nic się nie zmieniło i nie wybrano nowego bannera → nie wysyłamy
    const hasNewBanner = data.bannerFile instanceof File;
    if (!isDirty && !hasNewBanner) {
      show("Brak zmian do zapisania.", "info");
      onClose?.();
      return;
    }

    // tagi (walidacja długości)
    const normalizedTags = parseTags(data.tags);
    const tooLong = normalizedTags.find((t) => t.length > TAG_MAX_LEN);
    if (tooLong) {
      setError("tags", {
        type: "manual",
        message: `Tag "${tooLong}" jest za długi (max ${TAG_MAX_LEN} znaków)`,
      });
      return;
    }

    const rolesForApi = normalizeRolesForSubmit(data.roles);

    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      location: data.location.trim(),
      eventDate: new Date(data.deadline).toISOString(),
      requirements: data.requirements.trim(),
      compensation: data.showCompensation
        ? (data.compensation || "").trim()
        : "",
      roles: rolesForApi,
      tags: normalizedTags,
      status: data.status, // ⬅️ z selecta
    };

    try {
      await apiFetch(`/casting/casting/${casting.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json-patch+json" },
        body: JSON.stringify(payload),
      });

      // opcjonalny upload bannera po zapisie
      const f = data.bannerFile instanceof File ? data.bannerFile : undefined;
      if (f) {
        try {
          setIsUploadingBanner(true);
          await uploadCastingBanner(casting.id, f);
        } finally {
          setIsUploadingBanner(false);
        }
      }

      show("Zmiany zapisane.", "success");
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("Błąd zapisu castingu:", err);
      setError("root", {
        type: "server",
        message: err?.message || "Błąd podczas zapisu castingu",
      });
      show(err?.message || "Błąd podczas zapisu castingu", "error");
    }
  };

  return (
    <Card className="mb-0 relative">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 bg-[#EA1A62] text-white rounded-full p-1.5 hover:bg-[#c7154f] focus:outline-none focus:ring-2 focus:ring-[#EA1A62] hover:cursor-pointer"
        aria-label="Zamknij edycję"
        title="Zamknij"
      >
        <X className="w-4 h-4" />
      </button>

      <Card.Header>
        <h2 className="text-xl font-semibold text-[#2B2628]">Edytuj casting</h2>
      </Card.Header>

      <Card.Content>
        <div className="relative">
          {(isSubmitting || isUploadingBanner) && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <span className="inline-block h-8 w-8 rounded-full border-4 border-[#EA1A62] border-t-transparent animate-spin" />
                <span className="text-[#2B2628] font-medium">
                  {isUploadingBanner
                    ? "Wgrywanie bannera…"
                    : "Zapisywanie zmian…"}
                </span>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 max-w-3xl mx-auto"
            noValidate
          >
            {errors.root?.message && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {errors.root.message}
              </div>
            )}

            {/* Tytuł */}
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  label="Tytuł"
                  name="title"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.title?.message}
                  required
                  placeholder="Sesja zdjęciowa dla marki odzieżowej"
                />
              )}
            />

            {/* Opis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opis <span className="text-red-500">*</span>
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA1A62] focus:border-[#EA1A62] ${
                      errors.description ? "border-red-300" : "border-gray-300"
                    }`}
                    rows="4"
                    placeholder="Opisz szczegóły castingu..."
                  />
                )}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Wymagania */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wymagania
              </label>
              <Controller
                name="requirements"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA1A62] focus:border-[#EA1A62] ${
                      errors.requirements ? "border-red-300" : "border-gray-300"
                    }`}
                    rows="3"
                    placeholder="Napisz, jakie są wymagania wobec uczestników..."
                  />
                )}
              />
              {errors.requirements && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.requirements.message}
                </p>
              )}
            </div>

            {/* Lokalizacja + Wynagrodzenie */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-7">
                <Controller
                  name="location"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Lokalizacja"
                      name="location"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      error={errors.location?.message}
                      required
                      placeholder="Warszawa"
                    />
                  )}
                />
              </div>

              <div className="md:col-span-5">
                {!showCompensation ? (
                  <div className="md:h-full flex items-center">
                    <button
                      type="button"
                      onClick={() => setValue("showCompensation", true)}
                      className="inline-flex items-center gap-2 text-[#EA1A62] hover:text-[#d01757] text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 cursor-pointer" />
                      <span className="cursor-pointer">
                        Dodaj wynagrodzenie
                      </span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wynagrodzenie (opcjonalnie)
                    </label>
                    <div className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-11">
                        <Controller
                          name="compensation"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              placeholder="np. 300–500 PLN/dzień"
                              className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA1A62] focus:border-[#EA1A62] ${
                                errors.compensation
                                  ? "border-red-300"
                                  : "border-gray-300"
                              }`}
                            />
                          )}
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setValue("showCompensation", false);
                            setValue("compensation", "", {
                              shouldValidate: true,
                            });
                            clearErrors("compensation");
                          }}
                          className="self-center text-gray-400 hover:text-red-500"
                          title="Usuń wynagrodzenie"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {errors.compensation && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.compensation.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Poszukiwane role
              </label>

              {/* Model (stały) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mb-3">
                <div className="md:col-span-6">
                  <input
                    type="text"
                    value="Model"
                    disabled
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 text-gray-700"
                  />
                </div>
                <div className="md:col-span-5">
                  <input
                    type="number"
                    placeholder="Ilość"
                    {...register(`roles.0.capacity`)}
                    className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA1A62] focus:border-[#EA1A62] ${
                      errors.roles?.[0]?.capacity
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  />
                  {errors.roles?.[0]?.capacity && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.roles[0].capacity.message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-1" />
              </div>

              {/* Dodatkowe role */}
              {fields.slice(1).map((field, idx) => {
                const i = idx + 1;
                const options = ALL_ROLES.filter(
                  (role) =>
                    role !== "Model" &&
                    (!selectedRoleNames.includes(role) ||
                      role === roles[i]?.role)
                );
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mb-3"
                  >
                    <div className="md:col-span-6">
                      <select
                        {...register(`roles.${i}.role`)}
                        className="block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA1A62] focus:border-[#EA1A62] border-gray-300 bg-white"
                      >
                        <option value="" disabled>
                          Wybierz rolę
                        </option>
                        {options.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      {errors.roles?.[i]?.role && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.roles[i].role.message}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="number"
                        placeholder="Ilość"
                        {...register(`roles.${i}.capacity`)}
                        className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA1A62] focus:border-[#EA1A62] ${
                          errors.roles?.[i]?.capacity
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.roles?.[i]?.capacity && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.roles[i].capacity.message}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeRoleRow(i)}
                        className="text-gray-400 hover:text-red-500 text-lg"
                        title="Usuń rolę"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {roles.length < ALL_ROLES.length &&
                availableExtraRoles.length > 0 && (
                  <button
                    type="button"
                    onClick={addEmptyRoleRow}
                    className="inline-flex items-center gap-2 text-[#EA1A62] hover:text-[#d01757] text-sm font-medium"
                  >
                    <Plus className="w-4 h-4 cursor-pointer" />
                    <span className="cursor-pointer">Dodaj rolę</span>
                  </button>
                )}
            </div>

            {/* Termin */}
            <Controller
              name="deadline"
              control={control}
              render={({ field }) => (
                <Input
                  label="Termin zgłoszeń (data i godzina)"
                  name="deadline"
                  type="datetime-local"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.deadline?.message}
                  required
                />
              )}
            />

            {/* Banner – podgląd aktualnego lub wybranego */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner castingu{" "}
                {isUploadingBanner && (
                  <span className="text-xs text-gray-500">(wysyłanie…)</span>
                )}
              </label>

              {!bannerField ? (
                bannerUrl ? (
                  <div className="relative w-full">
                    <BannerImage src={bannerUrl} alt="Aktualny banner" />
                    <label className="absolute bottom-2 right-2">
                      <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded cursor-pointer hover:bg-black/70">
                        Zmień banner
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onBannerChange}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full aspect-[16/9] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#EA1A62]">
                    <span className="text-gray-500">
                      Kliknij, aby dodać banner
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onBannerChange}
                    />
                  </label>
                )
              ) : (
                <div className="relative w-full">
                  <BannerImage
                    src={URL.createObjectURL(
                      bannerField instanceof File ? bannerField : bannerField[0]
                    )}
                    alt="Podgląd bannera"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setValue("bannerFile", undefined, {
                        shouldValidate: true,
                      });
                      clearErrors("bannerFile");
                    }}
                    className="absolute top-2 right-2 bg-[#EA1A62] text-white rounded-full p-1 hover:bg-[#c7154f]"
                    title="Usuń wybrany plik"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {errors.bannerFile && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.bannerFile.message}
                </p>
              )}
            </div>

            {/* Tagi */}
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <Input
                  label="Tagi (oddzielone przecinkami, max 5)"
                  name="tags"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.tags?.message}
                  placeholder="fashion, studio, outdoor"
                />
              )}
            />

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA1A62] focus:border-[#EA1A62] border-gray-300 bg-white"
                  >
                    {STATUS_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {STATUS_LABELS[v]}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.status && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.status.message}
                </p>
              )}
            </div>

            {/* Akcje */}
            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingBanner}
                className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting || isUploadingBanner ? (
                  <>
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    {isUploadingBanner ? "Wgrywanie…" : "Zapisywanie…"}
                  </>
                ) : (
                  "Zapisz zmiany"
                )}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="bg-gray-500 text-white px-6 hover:bg-gray-600"
              >
                Anuluj
              </Button>
            </div>
          </form>
        </div>
      </Card.Content>
    </Card>
  );
}
