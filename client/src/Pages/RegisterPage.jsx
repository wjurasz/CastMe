// src/pages/RegisterPage.jsx
import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "../components/UI/Input";
import Button from "../components/UI/Button";
import Card from "../components/UI/Card";
import Textarea from "../components/UI/Textarea";
import Modal from "../components/UI/Modal";
import { policy } from "../data/policy";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// ---- Walidacja plików i limity ----
const ALLOWED_IMAGE = /^image\/(png|jpe?g|webp|gif)$/i;
const MAX_IMAGE_MB = 5;
const HEIGHT_MIN = 100;
const HEIGHT_MAX = 250;
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 250;
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// ---- Schemat Zod ----
const registerSchema = z
  .object({
    // krok 1
    FirstName: z
      .string({ required_error: "Imię jest wymagane" })
      .trim()
      .min(2, "Imię musi mieć min. 2 znaki")
      .max(50, "Imię nie może przekraczać 50 znaków"),
    LastName: z
      .string({ required_error: "Nazwisko jest wymagane" })
      .trim()
      .min(2, "Nazwisko musi mieć min. 2 znaki")
      .max(50, "Nazwisko nie może przekraczać 50 znaków"),
    Email: z
      .string({ required_error: "Email jest wymagany" })
      .trim()
      .email("Podaj poprawny adres e-mail"),
    Phone: z
      .string({ required_error: "Telefon jest wymagany" })
      .trim()
      .regex(
        /^\+?[0-9\s-]{7,20}$/,
        "Podaj poprawny numer telefonu (7–20 znaków)"
      ),
    Password: z
      .string({ required_error: "Hasło jest wymagane" })
      .min(8, "Hasło musi mieć min. 8 znaków")
      .max(128, "Hasło jest zbyt długie"),
    ConfirmPassword: z.string({ required_error: "Potwierdź hasło" }),
    AcceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Musisz zaakceptować regulamin" }),
    }),

    // krok 2
    UserName: z
      .string({ required_error: "Nazwa użytkownika jest wymagana" })
      .trim()
      .min(3, "Nazwa użytkownika musi mieć min. 3 znaki")
      .max(30, "Nazwa użytkownika nie może przekraczać 30 znaków"),
    RoleName: z
      .enum(["Model", "Photographer", "Designer", "Volunteer"], {
        required_error: "Rola jest wymagana",
      })
      .default("Model"),
    DateOfBirth: z
      .string({ required_error: "Data urodzenia jest wymagana" })
      .refine((v) => {
        const dt = new Date(v);
        if (Number.isNaN(dt.getTime())) return false;
        const now = new Date();
        if (dt > now) return false;
        const thirteenAgo = new Date(
          now.getFullYear() - 13,
          now.getMonth(),
          now.getDate()
        );
        return dt <= thirteenAgo;
      }, "Minimalny wiek to 13 lat"),
    Country: z
      .string({ required_error: "Kraj jest wymagany" })
      .trim()
      .min(2, "Kraj jest zbyt krótki")
      .max(100, "Kraj jest zbyt długi"),
    City: z
      .string({ required_error: "Miasto jest wymagane" })
      .trim()
      .min(2, "Miasto jest zbyt krótkie")
      .max(100, "Miasto jest zbyt długie"),
    Gender: z.union([z.literal(1), z.literal(2), z.literal(3)], {
      required_error: "Wybierz płeć",
    }),
    Height: z.union([z.string(), z.number()]).refine((v) => {
      const n = typeof v === "string" ? Number(v) : v;
      return (
        Number.isFinite(n) &&
        Math.trunc(n) === n &&
        n >= HEIGHT_MIN &&
        n <= HEIGHT_MAX
      );
    }, `Wzrost musi być liczbą całkowitą ${HEIGHT_MIN}–${HEIGHT_MAX} cm`),
    Weight: z.union([z.string(), z.number()]).refine((v) => {
      const n = typeof v === "string" ? Number(v) : v;
      return (
        Number.isFinite(n) &&
        Math.trunc(n) === n &&
        n >= WEIGHT_MIN &&
        n <= WEIGHT_MAX
      );
    }, `Waga musi być liczbą całkowitą ${WEIGHT_MIN}–${WEIGHT_MAX} kg`),
    HairColor: z
      .string({ required_error: "Kolor włosów jest wymagany" })
      .trim()
      .min(2, "Kolor włosów jest zbyt krótki")
      .max(30, "Kolor włosów jest zbyt długi"),
    ClothingSize: z
      .string({ required_error: "Rozmiar odzieży jest wymagany" })
      .trim()
      .refine((v) => CLOTHING_SIZES.includes(v.toUpperCase()), {
        message: `Dozwolone rozmiary: ${CLOTHING_SIZES.join(", ")}`,
      })
      .transform((v) => v.toUpperCase()),
    Description: z
      .string()
      .trim()
      .max(500, "Opis nie może przekraczać 500 znaków")
      .optional()
      .or(z.literal("")),
    Photos: z
      .any()
      .refine(
        (val) =>
          Array.isArray(val) ||
          (val && typeof val === "object" && "length" in val),
        "Nieprawidłowe zdjęcia"
      )
      .refine(
        (files) => (files?.length || 0) >= 1,
        "Dodaj przynajmniej jedno zdjęcie"
      )
      .refine((files) => {
        const arr = Array.from(files || []);
        return arr.every((f) => ALLOWED_IMAGE.test(f.type));
      }, "Dozwolone formaty: PNG, JPG, JPEG, WEBP, GIF")
      .refine((files) => {
        const arr = Array.from(files || []);
        return arr.every((f) => f.size <= MAX_IMAGE_MB * 1024 * 1024);
      }, `Maksymalny rozmiar pliku to ${MAX_IMAGE_MB} MB`),
  })
  .refine((data) => data.Password === data.ConfirmPassword, {
    path: ["ConfirmPassword"],
    message: "Hasła muszą się zgadzać",
  });

const DEFAULT_VALUES = {
  UserName: "testName",
  FirstName: "Johnny",
  LastName: "Doe",
  Email: "johnny.doe@example.com",
  Phone: "+123456789",
  Password: "password123",
  ConfirmPassword: "password123",
  Country: "USA",
  City: "New York",
  Gender: 1,
  DateOfBirth: "2000-01-01",
  Height: 180,
  Weight: 75,
  HairColor: "Brown",
  ClothingSize: "M",
  Description: "A passionate model.",
  RoleName: "Model",
  Photos: [],
  AcceptTerms: false,
};

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPostRegisterModal, setShowPostRegisterModal] = useState(false);
  const navigate = useNavigate();

  // jeśli useAuth ma logout, użyjemy go po rejestracji, by nie pozostawiać zalogowania
  const { register: doRegister, logout } = useAuth?.() || {};

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
  });

  // helper do autoskalowania textarea (Opis)
  const autoResize = useCallback((el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const descLen = (watch("Description") || "").length;

  // prosty wrapper na Controller + Input
  const RHFInput = ({
    name,
    label,
    type = "text",
    required = false,
    ...rest
  }) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Input
          label={label}
          name={name}
          type={type}
          value={field.value ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={errors?.[name]?.message}
          required={required}
          {...rest}
        />
      )}
    />
  );

  // --- Obsługa plików (doklejanie + natychmiastowa weryfikacja) ---
  const handleFileChange = async (e) => {
    const newFiles = Array.from(e.target.files || []);
    const current = Array.from(getValues("Photos") || []);
    const merged = [...current, ...newFiles];
    setValue("Photos", merged, { shouldValidate: true });
    e.target.value = "";
    await trigger("Photos");
  };

  // --- Walidacja kroków ---
  const step1Fields = [
    "FirstName",
    "LastName",
    "Email",
    "Phone",
    "Password",
    "ConfirmPassword",
    "AcceptTerms",
  ];
  const step2Fields = [
    "UserName",
    "RoleName",
    "DateOfBirth",
    "Country",
    "City",
    "Gender",
    "Height",
    "Weight",
    "HairColor",
    "ClothingSize",
    "Description",
    "Photos",
  ];

  const goStep2 = async () => {
    const ok = await trigger(step1Fields);
    if (ok) setStep(2);
  };

  const onSubmit = async (data) => {
    const ok = await trigger(step2Fields);
    if (!ok) return;

    const payload = {
      ...data,
      DateOfBirth: new Date(data.DateOfBirth).toISOString(),
    };

    try {
      const result = await doRegister(payload);
      if (result?.success) {
        // upewniamy się, że użytkownik NIE pozostaje zalogowany po rejestracji
        try {
          await logout?.();
        } catch (_) {
          // jeżeli nie ma logout albo rzucił błąd — ignorujemy
        }
        // pokaż modal z FocusTrap (tylko OK)
        setShowPostRegisterModal(true);
      } else {
        // fallback: prosty komunikat błędu
        // możesz tu użyć swojego systemu błędów/Toast jeśli chcesz
        // ale zgodnie z prośbą nie pokazujemy zielonych toastów
        window.alert(result?.error || "Wystąpił błąd podczas rejestracji");
      }
    } catch (err) {
      console.error(err);
      window.alert("Wystąpił błąd podczas rejestracji");
    }
  };

  return (
    <div className="relative min-h-screen">
      <div
        className={`${
          showTermsModal || showPostRegisterModal ? "opacity-40" : "opacity-100"
        } transition-opacity`}
      >
        <div className="flex items-center justify-center py-12 px-4 min-h-screen bg-gray-50">
          <div className="max-w-lg w-full">
            <h1 className="text-3xl font-bold text-center mb-6">
              Dołącz do CastMe
            </h1>

            {/* Wskaźnik postępu */}
            <div className="mb-4">
              <p className="text-center text-sm font-medium">Krok {step} z 2</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step === 1 ? "w-1/2 bg-pink-500" : "w-full bg-pink-500"
                  }`}
                />
              </div>
            </div>

            <Card>
              <Card.Content>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-6"
                  noValidate
                >
                  {/* Krok 1 */}
                  {step === 1 && (
                    <>
                      <RHFInput name="FirstName" label="Imię" required />
                      <RHFInput name="LastName" label="Nazwisko" required />
                      <RHFInput
                        name="Email"
                        label="Email"
                        type="email"
                        required
                      />
                      <RHFInput name="Phone" label="Telefon" required />
                      <RHFInput
                        name="Password"
                        label="Hasło"
                        type="password"
                        required
                      />
                      <RHFInput
                        name="ConfirmPassword"
                        label="Potwierdź hasło"
                        type="password"
                        required
                      />

                      {/* Regulamin */}
                      <div className="flex items-start">
                        <Controller
                          name="AcceptTerms"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="checkbox"
                              name="AcceptTerms"
                              checked={!!field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 text-[#EA1A62] border-gray-300 rounded"
                            />
                          )}
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Zaakceptuj regulamin aby korzystać z serwisu.
                          Regulamin znajdziesz{" "}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-[#EA1A62] hover:underline"
                          >
                            tutaj
                          </button>
                          .
                        </label>
                      </div>
                      {errors.AcceptTerms && (
                        <p className="text-red-500">
                          {errors.AcceptTerms.message}
                        </p>
                      )}

                      {/* Nawigacja */}
                      <div className="flex justify-between mt-6">
                        <button
                          type="button"
                          disabled
                          className="bg-gray-300 text-gray-500 py-2 px-6 rounded-lg w-32 cursor-not-allowed"
                        >
                          Wstecz
                        </button>
                        <Button
                          type="button"
                          onClick={goStep2}
                          className="w-32 py-2 text-lg"
                        >
                          Dalej
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Krok 2 */}
                  {step === 2 && (
                    <>
                      <RHFInput
                        name="UserName"
                        label="Nazwa użytkownika"
                        required
                      />
                      <RHFInput
                        name="DateOfBirth"
                        label="Data urodzenia"
                        type="date"
                        required
                      />
                      <RHFInput name="Country" label="Kraj" required />
                      <RHFInput name="City" label="Miasto" required />

                      {/* Płeć */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Płeć
                        </label>
                        <Controller
                          name="Gender"
                          control={control}
                          render={({ field }) => (
                            <div className="flex gap-4">
                              {[
                                { id: 1, label: "Mężczyzna" },
                                { id: 2, label: "Kobieta" },
                                { id: 3, label: "Inna" },
                              ].map((opt) => (
                                <label
                                  key={opt.id}
                                  className="flex items-center gap-1"
                                >
                                  <input
                                    type="radio"
                                    name="Gender"
                                    value={opt.id}
                                    checked={Number(field.value) === opt.id}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value, 10)
                                      )
                                    }
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          )}
                        />
                        {errors.Gender && (
                          <p className="text-red-500">
                            {errors.Gender.message}
                          </p>
                        )}
                      </div>

                      <RHFInput
                        name="Height"
                        label="Wzrost (cm)"
                        type="number"
                        required
                      />
                      <RHFInput
                        name="Weight"
                        label="Waga (kg)"
                        type="number"
                        required
                      />
                      <RHFInput
                        name="HairColor"
                        label="Kolor włosów"
                        required
                      />
                      <RHFInput
                        name="ClothingSize"
                        label="Rozmiar odzieży"
                        required
                      />

                      {/* Opis – Textarea z autogrow i licznikiem 0/500 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Opis
                        </label>
                        <Controller
                          name="Description"
                          control={control}
                          render={({ field }) => {
                            const value = field.value ?? "";
                            return (
                              <>
                                <Textarea
                                  label={undefined}
                                  value={value}
                                  rows={6}
                                  maxLength={500}
                                  placeholder="Opowiedz coś o sobie..."
                                  ref={(node) => {
                                    if (typeof field.ref === "function")
                                      field.ref(node);
                                    else if (field.ref)
                                      field.ref.current = node;
                                    autoResize(node);
                                  }}
                                  onInput={(e) => {
                                    autoResize(e.currentTarget);
                                    field.onChange(e);
                                  }}
                                  onChange={(e) => field.onChange(e)}
                                  onBlur={field.onBlur}
                                  className={`w-full ${
                                    errors.Description ? "border-red-300" : ""
                                  }`}
                                />
                                <div className="mt-1 text-right text-xs text-gray-500">
                                  {value.length}/500
                                </div>
                                {errors.Description && (
                                  <p className="text-sm text-red-600 mt-1">
                                    {errors.Description.message}
                                  </p>
                                )}
                              </>
                            );
                          }}
                        />
                      </div>

                      {/* Rola */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rola
                        </label>
                        <Controller
                          name="RoleName"
                          control={control}
                          render={({ field }) => (
                            <select
                              name="RoleName"
                              value={field.value}
                              onChange={field.onChange}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA1A62] focus:border-[#EA1A62]"
                            >
                              <option value="Model">Model</option>
                              <option value="Photographer">Fotograf</option>
                              <option value="Designer">Projektant</option>
                              <option value="Volunteer">Wolontariusz</option>
                            </select>
                          )}
                        />
                        {errors.RoleName && (
                          <p className="text-red-500">
                            {errors.RoleName.message}
                          </p>
                        )}
                      </div>

                      {/* Zdjęcia */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zdjęcia
                        </label>

                        <input
                          type="file"
                          id="photoUpload"
                          name="Photos"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="photoUpload"
                          className="inline-flex items-center px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg shadow hover:bg-pink-700 cursor-pointer"
                        >
                          Wybierz zdjęcia
                        </label>

                        <Controller
                          name="Photos"
                          control={control}
                          render={({ field }) => {
                            const files = Array.from(field.value || []);
                            return (
                              <>
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                  {files.map((file, index) => (
                                    <div
                                      key={`${file.name}-${index}`}
                                      className="relative border rounded-lg p-2 flex flex-col items-center bg-gray-50 shadow-sm"
                                    >
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt={`photo-${index}`}
                                        className="w-full h-24 object-cover rounded-md"
                                      />
                                      <p className="text-xs mt-2 text-gray-600 truncate w-full text-center">
                                        {file.name}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...files];
                                          updated.splice(index, 1);
                                          setValue("Photos", updated, {
                                            shouldValidate: true,
                                          });
                                        }}
                                        className="absolute top-1 right-1 bg-pink-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-pink-700"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                {errors.Photos && (
                                  <p className="text-red-500 mt-2">
                                    {errors.Photos.message?.toString()}
                                  </p>
                                )}
                              </>
                            );
                          }}
                        />
                      </div>

                      {/* Nawigacja */}
                      <div className="flex justify-between mt-6">
                        <Button
                          type="button"
                          onClick={() => setStep(1)}
                          className="w-32 py-2 text-lg"
                        >
                          Wstecz
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-32 py-2 text-lg"
                        >
                          {isSubmitting ? "Rejestruję..." : "Zarejestruj"}
                        </Button>
                      </div>
                    </>
                  )}
                </form>

                <p className="mt-6 text-center text-gray-600">
                  Masz już konto?{" "}
                  <Link to="/login" className="text-[#EA1A62] font-medium">
                    Zaloguj się
                  </Link>
                </p>
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal z regulaminem (Twój komponent) */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        panelClassName="max-w-lg p-6"
      >
        <h2 className="text-2xl font-bold mb-4">Regulamin</h2>
        <div className="text-gray-700 max-h-64 overflow-y-auto pr-1">
          {policy.map((item) => (
            <div key={item.id} className="mb-4">
              <p>
                <strong>
                  {item.id}. {item.title}
                </strong>
              </p>
              <p>{item.content}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setShowTermsModal(false)}>Zamknij</Button>
        </div>
      </Modal>

      {/* Modal po udanej rejestracji — FocusTrap, bez zamykania po kliknięciu w tło, bez krzyżyka */}
      <Modal
        isOpen={showPostRegisterModal}
        onClose={undefined} // brak zamykania ESC/krzyżykiem
        closeOnOverlayClick={false}
        showCloseButton={false}
        panelClassName="max-w-md p-6"
      >
        <h3 className="text-lg font-semibold mb-2">Rejestracja udana</h3>
        <p className="text-gray-700">
          Twoje konto zostało utworzone, ale{" "}
          <strong>wymaga zatwierdzenia przez organizatora</strong>. Do czasu
          zatwierdzenia <strong>nie będziesz mógł/mogła się zalogować</strong>.
        </p>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => {
              setShowPostRegisterModal(false);
              // przekierowanie na / i scroll na górę strony
              navigate("/", { replace: true });
              // po nawigacji przewiń na samą górę
              setTimeout(() => {
                try {
                  window.scrollTo({ top: 0, behavior: "auto" });
                } catch {}
              }, 0);
            }}
          >
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default RegisterPage;
