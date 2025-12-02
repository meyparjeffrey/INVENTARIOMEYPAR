import * as React from "react";
import { motion } from "framer-motion";
import { Palette } from "lucide-react";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { useTranslation } from "../../hooks/useTranslation";
import type { UserSettings } from "@domain/entities";

interface ThemeColorsProps {
  settings: UserSettings;
  onChange: (updates: Partial<UserSettings>) => void;
}

/**
 * Componente para personalizar los colores del tema claro.
 * Solo visible cuando el tema está en modo claro.
 */
export function ThemeColors({ settings, onChange }: ThemeColorsProps) {
  const { t } = useTranslation();

  const handleColorChange = React.useCallback((key: "primaryColor" | "secondaryColor", value: string) => {
    onChange({ [key]: value });
  }, [onChange]);

  // Colores predefinidos
  const presetColors = [
    { name: t("theme.colors.red"), value: "#DC2626" },
    { name: t("theme.colors.blue"), value: "#2563EB" },
    { name: t("theme.colors.green"), value: "#16A34A" },
    { name: t("theme.colors.purple"), value: "#9333EA" },
    { name: t("theme.colors.orange"), value: "#EA580C" },
    { name: t("theme.colors.pink"), value: "#DB2777" },
    { name: t("theme.colors.cyan"), value: "#0891B2" },
    { name: t("theme.colors.indigo"), value: "#4F46E5" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center gap-2">
        <Palette className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t("theme.colors.title")}
        </h3>
      </div>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        {t("theme.colors.description")}
      </p>

      <div className="space-y-6">
        {/* Color primario */}
        <div>
          <Label htmlFor="primaryColor">{t("theme.colors.primary")}</Label>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {t("theme.colors.primaryHelp")}
          </p>
          
          {/* Colores predefinidos */}
          <div className="mb-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {presetColors.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleColorChange("primaryColor", preset.value)}
                className={`
                  group relative h-10 w-full rounded-md border-2 transition-all
                  ${settings.primaryColor === preset.value
                    ? "border-gray-900 dark:border-gray-100 scale-110"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }
                `}
                style={{ backgroundColor: preset.value }}
                title={preset.name}
              >
                {settings.primaryColor === preset.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <svg
                      className="h-5 w-5 text-white drop-shadow-lg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          {/* Selector de color personalizado */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                id="primaryColor"
                type="color"
                value={settings.primaryColor}
                onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                className="h-12 w-full cursor-pointer"
              />
            </div>
            <Input
              type="text"
              value={settings.primaryColor}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                  handleColorChange("primaryColor", value);
                }
              }}
              placeholder="#DC2626"
              className="flex-1 font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>

        {/* Color secundario */}
        <div>
          <Label htmlFor="secondaryColor">{t("theme.colors.secondary")}</Label>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {t("theme.colors.secondaryHelp")}
          </p>

          {/* Selector de color personalizado */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                id="secondaryColor"
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => handleColorChange("secondaryColor", e.target.value)}
                className="h-12 w-full cursor-pointer"
              />
            </div>
            <Input
              type="text"
              value={settings.secondaryColor}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                  handleColorChange("secondaryColor", value);
                }
              }}
              placeholder="#F3F4F6"
              className="flex-1 font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("theme.colors.preview")}
          </p>
          <div className="flex gap-2">
            <div
              className="flex h-12 flex-1 items-center justify-center rounded-md text-sm font-medium text-white shadow-md"
              style={{ backgroundColor: settings.primaryColor }}
            >
              {t("theme.colors.primary")}
            </div>
            <div
              className="flex h-12 flex-1 items-center justify-center rounded-md text-sm font-medium text-gray-900 shadow-md"
              style={{ backgroundColor: settings.secondaryColor }}
            >
              {t("theme.colors.secondary")}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

