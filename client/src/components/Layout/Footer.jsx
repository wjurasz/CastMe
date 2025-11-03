// src/components/layout/Footer.jsx
import { useState } from "react";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Modal from "../UI/Modal"; // ścieżkę dostosuj do miejsca, gdzie trzymasz Modal.jsx
import HowItWorks from "../../Pages/HowItWorks.jsx";

function Footer() {
  const [openModal, setOpenModal] = useState(null); // 'terms' | 'privacy' | 'cookies' | null

  const closeModal = () => setOpenModal(null);

  return (
    <footer className="bg-[#2B2628] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo i opis */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-[#EA1A62] rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  className="w-full h-full object-contain"
                  src="src/assets/MONOLOGO.svg"
                  alt="logo"
                />
              </div>
              <span className="text-xl font-bold">CastMe</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Platforma łącząca talenty z możliwościami. Znajdź swój wymarzony
              casting lub odkryj nowych artystów.
            </p>

            {/* Ikony — usunięto słuchawkę, koperta prowadzi do /contact */}
            <div className="flex space-x-4">
              <Link
                to="/contact"
                className="text-gray-300 hover:text-[#EA1A62] transition-colors"
                aria-label="Przejdź do formularza kontaktowego"
                title="Kontakt"
              >
                <Mail className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Szybkie linki */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Szybkie linki</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  O nas
                </Link>
              </li>
              <li>
                <Link
                  to="/how-it-works"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Jak to działa
                </Link>
              </li>
              {/* Cennik usunięty */}
              <li>
                <Link
                  to="/contact"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Kontakt
                </Link>
              </li>
            </ul>
          </div>

          {/* Prawne — otwierają modal z przykładową treścią */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Prawne</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setOpenModal("terms")}
                  className="text-left text-gray-300 hover:text-white transition-colors"
                >
                  Regulamin
                </button>
              </li>
              <li>
                <button
                  onClick={() => setOpenModal("privacy")}
                  className="text-left text-gray-300 hover:text-white transition-colors"
                >
                  Polityka prywatności
                </button>
              </li>
              <li>
                <button
                  onClick={() => setOpenModal("cookies")}
                  className="text-left text-gray-300 hover:text-white transition-colors"
                >
                  Cookies
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-300">
            © 2025 CastMe. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </div>

      {/* === MODALS === */}
      <Modal
        isOpen={openModal === "terms"}
        onClose={closeModal}
        panelClassName="max-w-2xl"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-3">Regulamin</h2>
          <p className="text-gray-700 mb-3">
            Niniejszy regulamin określa zasady korzystania z platformy CastMe.
            Rejestrując konto, akceptujesz postanowienia dotyczące m.in.
            zakładania profilu, publikacji ogłoszeń, zasad płatności oraz
            odpowiedzialności użytkowników.
          </p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Użytkownik odpowiada za poprawność danych w profilu.</li>
            <li>Zakazane są treści naruszające prawo lub dobre obyczaje.</li>
            <li>Ogłoszenia mogą być moderowane, a niewłaściwe — usuwane.</li>
            <li>
              W sprawach nieuregulowanych zastosowanie mają przepisy prawa
              właściwego.
            </li>
          </ul>
        </div>
      </Modal>

      <Modal
        isOpen={openModal === "privacy"}
        onClose={closeModal}
        panelClassName="max-w-2xl"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-3">Polityka prywatności</h2>
          <p className="text-gray-700 mb-3">
            Administratorem danych jest CastMe. Przetwarzamy dane w celu
            świadczenia usług, obsługi konta i kontaktu. Masz prawo dostępu do
            danych, ich sprostowania, usunięcia, ograniczenia oraz przenoszenia.
          </p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Podstawy prawne: art. 6 ust. 1 lit. a–f RODO.</li>
            <li>
              Odbiorcy danych: dostawcy hostingu, systemy płatności, podmioty
              wspierające obsługę serwisu.
            </li>
            <li>
              Okres przechowywania: przez czas świadczenia usług oraz wynikający
              z przepisów.
            </li>
            <li>
              Kontakt w sprawach prywatności:{" "}
              <span className="font-medium">privacy@castme.example</span>
            </li>
          </ul>
        </div>
      </Modal>

      <Modal
        isOpen={openModal === "cookies"}
        onClose={closeModal}
        panelClassName="max-w-2xl"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-3">Polityka Cookies</h2>
          <p className="text-gray-700 mb-3">
            Serwis wykorzystuje pliki cookies w celu zapewnienia działania
            strony, analityki, personalizacji treści i zapamiętywania
            preferencji. Możesz zarządzać zgodami w ustawieniach przeglądarki.
          </p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Cookies niezbędne — wymagane do działania serwisu.</li>
            <li>Cookies analityczne — pomagają nam ulepszać platformę.</li>
            <li>Cookies funkcjonalne — zapamiętują Twoje wybory.</li>
          </ul>
        </div>
      </Modal>
    </footer>
  );
}

export default Footer;
