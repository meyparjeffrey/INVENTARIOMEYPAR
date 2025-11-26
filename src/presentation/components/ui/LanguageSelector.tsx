import { Globe } from "lucide-react";
import * as React from "react";
import { useLanguage } from "../../context/LanguageContext";
import { Button } from "./Button";

/**
 * Selector de idioma (ES/CAT).
 */
export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  const languages: Array<{ code: "es-ES" | "ca-ES"; label: string; flag: string }> = [
    { code: "es-ES", label: "Español", flag: "ES" },
    { code: "ca-ES", label: "Català", flag: "CAT" }
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 gap-1.5 px-2.5"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium">
          {languages.find((l) => l.code === language)?.flag ?? "ES"}
        </span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  language === lang.code
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{lang.flag}</span>
                  <span>{lang.label}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

