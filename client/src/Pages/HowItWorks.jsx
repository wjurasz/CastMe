import { Link } from "react-router-dom";
import { UserPlus, ClipboardCheck, Hourglass, ArrowRight } from "lucide-react";

export default function HowItWorks() {
  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 sm:pt-20 sm:pb-16">
          <div className="text-center">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
              Jak to <span className="text-[#EA1A62]">działa</span>?
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-gray-600 text-base sm:text-lg">
              Trzy proste kroki, aby dołączyć do projektów i ról dopasowanych do
              Twoich umiejętności.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#EA1A62] px-4 py-2 text-white hover:bg-[#d1185a] transition-colors"
              >
                Zacznij teraz <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/castings"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zobacz castingi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3 KROKI */}
      <section className="py-10 sm:py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">
            3 kroki do pierwszego castingu
          </h2>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Krok 1 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EA1A62]/10 text-[#EA1A62] font-bold">
                  1
                </span>
                <UserPlus className="w-6 h-6 text-[#EA1A62]" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Zarejestruj się do portalu
              </h3>
              <p className="mt-2 text-gray-600">
                Utwórz konto i uzupełnij profil: zdjęcia, umiejętności,
                doświadczenie oraz preferencje. Dzięki temu łatwiej Cię zauważą.
              </p>
              <Link
                to="/register"
                className="mt-4 inline-flex items-center gap-2 text-[#EA1A62] hover:underline"
              >
                Załóż konto <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Krok 2 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EA1A62]/10 text-[#EA1A62] font-bold">
                  2
                </span>
                <ClipboardCheck
                  className="w-6 h-6 text-[#EA1A62]"
                  aria-hidden
                />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Aplikuj do castingu
              </h3>
              <p className="mt-2 text-gray-600">
                Przeglądaj aktualne ogłoszenia i aplikuj jednym kliknięciem.
                Dopasujemy propozycje do Twojego profilu i lokalizacji.
              </p>
              <Link
                to="/castings"
                className="mt-4 inline-flex items-center gap-2 text-[#EA1A62] hover:underline"
              >
                Przeglądaj castingi <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Krok 3 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EA1A62]/10 text-[#EA1A62] font-bold">
                  3
                </span>
                <Hourglass className="w-6 h-6 text-[#EA1A62]" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Czekaj na potwierdzenie udziału
              </h3>
              <p className="mt-2 text-gray-600">
                Organizator powiadomi Cię w aplikacji i mailowo. W międzyczasie
                uzupełniaj profil i dodawaj nowe materiały, aby zwiększyć
                szanse.
              </p>
              <Link
                to="/dashboard"
                className="mt-4 inline-flex items-center gap-2 text-[#EA1A62] hover:underline"
              >
                Sprawdź status w panelu <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Pasek CTA na dole */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-[#EA1A62] px-5 py-2.5 text-white hover:bg-[#d1185a] transition-colors"
            >
              Dołącz za darmo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Masz pytania? Skontaktuj się
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
