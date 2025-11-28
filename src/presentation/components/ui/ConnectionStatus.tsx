import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import * as React from "react";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";

type ConnectionStatus = "connected" | "disconnected" | "checking";

/**
 * Componente que muestra el estado de conexión con Supabase (verificación real).
 */
export function ConnectionStatus({ className }: { className?: string }) {
  const [status, setStatus] = React.useState<ConnectionStatus>("checking");
  const { t } = useLanguage();

  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        // Hacer una consulta simple para verificar la conexión REAL
        const { error } = await supabaseClient.from("products").select("id", { head: true, count: "exact" });
        
        if (error && error.code !== "42P01") {
          // Error que no sea "tabla no existe" significa problema de conexión
          setStatus("disconnected");
        } else {
          setStatus("connected");
        }
      } catch {
        setStatus("disconnected");
      }
    };

    checkConnection();
    // Verificar cada 30 segundos
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
        status === "connected" &&
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        status === "disconnected" &&
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        status === "checking" &&
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        className
      )}
      title={t(`connection.title.${status}`)}
    >
      {status === "connected" ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{t("connection.connected")}</span>
        </>
      ) : status === "disconnected" ? (
        <>
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{t("connection.disconnected")}</span>
        </>
      ) : (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{t("connection.checking")}</span>
        </>
      )}
    </div>
  );
}

