import * as React from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Palette, 
  Square, 
  Circle, 
  Eye, 
  Sparkles
} from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useTranslation } from "../../hooks/useTranslation";
import type { AvatarSize, AvatarShape, AvatarShadowIntensity, UserSettings } from "@domain/entities";

interface AvatarSettingsProps {
  settings: UserSettings;
  profileName: string;
  profileInitials: string;
  profileAvatarUrl: string | null;
  onChange: (updates: Partial<UserSettings>) => void;
}

/**
 * Componente de configuración avanzada del avatar con preview en tiempo real.
 */
export function AvatarSettings({
  settings,
  profileName,
  profileInitials,
  profileAvatarUrl,
  onChange
}: AvatarSettingsProps) {
  const { t } = useTranslation();

  const handleChange = React.useCallback((key: keyof UserSettings, value: unknown) => {
    onChange({ [key]: value } as Partial<UserSettings>);
  }, [onChange]);

  const sizeOptions: { value: AvatarSize; label: string }[] = [
    { value: "xs", label: t("avatar.size.xs") },
    { value: "sm", label: t("avatar.size.sm") },
    { value: "md", label: t("avatar.size.md") },
    { value: "lg", label: t("avatar.size.lg") },
    { value: "xl", label: t("avatar.size.xl") },
    { value: "custom", label: t("avatar.size.custom") }
  ];

  const shapeOptions: { value: AvatarShape; label: string; icon: React.ReactNode }[] = [
    { value: "circle", label: t("avatar.shape.circle"), icon: <Circle className="h-4 w-4" /> },
    { value: "square", label: t("avatar.shape.square"), icon: <Square className="h-4 w-4" /> },
    { value: "rounded", label: t("avatar.shape.rounded"), icon: <Square className="h-4 w-4 rounded-md" /> }
  ];

  const shadowOptions: { value: AvatarShadowIntensity; label: string }[] = [
    { value: "none", label: t("avatar.shadow.none") },
    { value: "sm", label: t("avatar.shadow.sm") },
    { value: "md", label: t("avatar.shadow.md") },
    { value: "lg", label: t("avatar.shadow.lg") }
  ];

  return (
    <div className="space-y-6">
      {/* Preview en tiempo real */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100/50 p-6 dark:border-primary-800 dark:from-primary-900/20 dark:to-primary-800/10"
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <Avatar
              name={profileName}
              initials={profileInitials}
              imageUrl={profileAvatarUrl}
              size={settings.avatarSize}
              customSize={settings.avatarCustomSize ?? undefined}
              borderEnabled={settings.avatarBorderEnabled}
              borderWidth={settings.avatarBorderWidth}
              borderColor={settings.avatarBorderColor}
              shadowEnabled={settings.avatarShadowEnabled}
              shadowIntensity={settings.avatarShadowIntensity}
              shape={settings.avatarShape}
              animationEnabled={settings.avatarAnimationEnabled}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t("avatar.preview.title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("avatar.preview.description")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tamaño */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("avatar.section.size")}
          </h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="avatarSize">{t("avatar.size.label")}</Label>
            <select
              id="avatarSize"
              value={settings.avatarSize}
              onChange={(e) => handleChange("avatarSize", e.target.value as AvatarSize)}
              className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
              style={{ textOverflow: "ellipsis", overflow: "visible", whiteSpace: "normal" }}
            >
              {sizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {settings.avatarSize === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Label htmlFor="avatarCustomSize">{t("avatar.size.customLabel")}</Label>
              <Input
                id="avatarCustomSize"
                type="number"
                min="24"
                max="200"
                value={settings.avatarCustomSize ?? 48}
                onChange={(e) => handleChange("avatarCustomSize", parseInt(e.target.value, 10) || 48)}
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("avatar.size.customHelp")}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Forma */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-2">
          <Square className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("avatar.section.shape")}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {shapeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange("avatarShape", option.value)}
              className={`
                flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all
                ${
                  settings.avatarShape === option.value
                    ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                }
              `}
            >
              <div className={`
                flex h-12 w-12 items-center justify-center bg-primary-600 text-white
                ${option.value === "circle" ? "rounded-full" : ""}
                ${option.value === "square" ? "rounded-none" : ""}
                ${option.value === "rounded" ? "rounded-lg" : ""}
              `}>
                {option.icon}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Borde */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("avatar.section.border")}
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("avatar.border.enabled")}</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("avatar.border.enabledHelp")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange("avatarBorderEnabled", !settings.avatarBorderEnabled)}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${settings.avatarBorderEnabled ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"}
              `}
            >
              <span
                className={`
                  inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out
                  ${settings.avatarBorderEnabled ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </button>
          </div>
          {settings.avatarBorderEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <Label htmlFor="avatarBorderWidth">{t("avatar.border.width")}</Label>
                <Input
                  id="avatarBorderWidth"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.avatarBorderWidth}
                  onChange={(e) => handleChange("avatarBorderWidth", parseInt(e.target.value, 10) || 2)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="avatarBorderColor">{t("avatar.border.color")}</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="avatarBorderColor"
                    type="color"
                    value={settings.avatarBorderColor}
                    onChange={(e) => handleChange("avatarBorderColor", e.target.value)}
                    className="h-10 w-20 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.avatarBorderColor}
                    onChange={(e) => handleChange("avatarBorderColor", e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder="#DC2626"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Sombra */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("avatar.section.shadow")}
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("avatar.shadow.enabled")}</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("avatar.shadow.enabledHelp")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange("avatarShadowEnabled", !settings.avatarShadowEnabled)}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${settings.avatarShadowEnabled ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"}
              `}
            >
              <span
                className={`
                  inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out
                  ${settings.avatarShadowEnabled ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </button>
          </div>
          {settings.avatarShadowEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Label htmlFor="avatarShadowIntensity">{t("avatar.shadow.intensity")}</Label>
              <select
                id="avatarShadowIntensity"
                value={settings.avatarShadowIntensity}
                onChange={(e) => handleChange("avatarShadowIntensity", e.target.value as AvatarShadowIntensity)}
                className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
                style={{ textOverflow: "ellipsis", overflow: "visible", whiteSpace: "normal" }}
              >
                {shadowOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Animaciones */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("avatar.section.animation")}
          </h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>{t("avatar.animation.enabled")}</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("avatar.animation.enabledHelp")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("avatarAnimationEnabled", !settings.avatarAnimationEnabled)}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              ${settings.avatarAnimationEnabled ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"}
            `}
          >
            <span
              className={`
                inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out
                ${settings.avatarAnimationEnabled ? "translate-x-5" : "translate-x-0"}
              `}
            />
          </button>
        </div>
      </motion.div>

    </div>
  );
}

