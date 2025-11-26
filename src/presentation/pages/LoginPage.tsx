import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Package } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Label } from "../components/ui";
import { LanguageSelector } from "../components/ui/LanguageSelector";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/cn";

/**
 * Pantalla de inicio de sesión con estética moderna.
 */
export function LoginPage() {
  const { t } = useLanguage();
  const { login, authContext, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberSession, setRememberSession] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Redirigir si ya está autenticado
  React.useEffect(() => {
    if (!authLoading && authContext) {
      navigate("/dashboard", { replace: true });
    }
  }, [authContext, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password, rememberSession);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="card relative space-y-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20">
          {/* Efecto de brillo sutil en hover */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-500/5 via-transparent to-secondary-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          {/* Controles de idioma y tema integrados en la tarjeta */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <div className="rounded-lg bg-gray-100/80 p-1.5 backdrop-blur-sm transition-all duration-300 hover:bg-gray-200/90 hover:scale-110 dark:bg-gray-700/80 dark:hover:bg-gray-600/90">
              <LanguageSelector />
            </div>
            <div className="rounded-lg bg-gray-100/80 p-1.5 backdrop-blur-sm transition-all duration-300 hover:bg-gray-200/90 hover:scale-110 dark:bg-gray-700/80 dark:hover:bg-gray-600/90">
              <ThemeToggle />
            </div>
          </div>

          {/* Logo y título */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="group relative"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:rotate-3 hover:shadow-xl hover:shadow-primary-500/50">
                <Package className="h-8 w-8 transition-transform duration-300 group-hover:scale-110" />
              </div>
              {/* Efecto de resplandor */}
              <div className="absolute inset-0 rounded-2xl bg-primary-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-30" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-gray-900 transition-colors duration-300 dark:text-gray-50"
            >
              {t("login.title")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              {t("login.subtitle")}
            </motion.p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("login.email")}
              </Label>
              <div className="group relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="relative z-10 transition-all duration-300 focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 group-hover:border-primary-300 dark:group-hover:border-primary-600"
                />
                <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-primary-500/0 via-primary-500/0 to-primary-500/0 opacity-0 blur transition-all duration-300 group-hover:opacity-10" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("login.password")}
              </Label>
              <div className="group relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="relative z-10 pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 group-hover:border-primary-300 dark:group-hover:border-primary-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-all duration-300 hover:bg-gray-100 hover:text-primary-600 hover:scale-110 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-primary-500/0 via-primary-500/0 to-primary-500/0 opacity-0 blur transition-all duration-300 group-hover:opacity-10" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2.5"
            >
              <input
                id="remember"
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 transition-all duration-300 hover:scale-110 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              />
              <label
                htmlFor="remember"
                className="cursor-pointer text-sm text-gray-600 transition-colors duration-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                {t("login.remember")}
              </label>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 shadow-sm transition-all duration-300 hover:shadow-md dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
              >
                {error || t("login.error")}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                type="submit"
                className="group relative w-full overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary-500/50 disabled:hover:scale-100"
                disabled={loading}
              >
                <span className="relative z-10 flex items-center justify-center">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("login.submitting")}
                    </>
                  ) : (
                    t("login.submit")
                  )}
                </span>
                {/* Efecto de brillo en hover */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

