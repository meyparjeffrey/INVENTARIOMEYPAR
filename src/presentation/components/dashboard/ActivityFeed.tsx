import { Clock } from "lucide-react";
import * as React from "react";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";

interface Activity {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities?: Activity[];
}

/**
 * Feed de actividad reciente del dashboard.
 */
export function ActivityFeed({ activities = [] }: ActivityFeedProps) {
  const [realActivities, setRealActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadActivities() {
      try {
        // Obtener logs de auditoría recientes
        const { data: auditLogs, error } = await supabaseClient
          .from("audit_logs")
          .select(`
            *,
            profiles:user_id (
              first_name,
              last_name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;

        const mappedActivities: Activity[] = (auditLogs ?? []).map((log) => {
          const profile = log.profiles as { first_name: string; last_name: string } | null;
          const userName = profile ? `${profile.first_name} ${profile.last_name}` : "Usuario";
          
          let action = "";
          let details = "";

          switch (log.action) {
            case "CREATE":
              action = `creó ${log.entity_type}`;
              details = log.entity_type === "products" ? `Producto: ${log.new_value || ""}` : "";
              break;
            case "UPDATE":
              action = `actualizó ${log.entity_type}`;
              details = log.field_name ? `${log.field_name}: ${log.new_value || ""}` : "";
              break;
            case "DELETE":
              action = `eliminó ${log.entity_type}`;
              break;
            case "VIEW":
              action = `consultó ${log.entity_type}`;
              break;
            default:
              action = `${log.action.toLowerCase()} ${log.entity_type}`;
          }

          const timeAgo = getTimeAgo(new Date(log.created_at));

          return {
            id: log.id,
            user: userName,
            action,
            details,
            timestamp: timeAgo
          };
        });

        setRealActivities(mappedActivities);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error cargando actividad:", error);
        // Si no hay datos, usar mock
        setRealActivities([
          {
            id: "1",
            user: "Sistema",
            action: "inicializado",
            details: "Dashboard cargado",
            timestamp: "Ahora"
          }
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, []);

  function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  }

  const displayActivities = activities.length > 0 ? activities : realActivities;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Actividad Reciente</h3>
      </div>
      <ul className="space-y-3">
        {loading && displayActivities.length === 0 ? (
          <li className="text-sm text-gray-500 dark:text-gray-400">Cargando actividad...</li>
        ) : displayActivities.length === 0 ? (
          <li className="text-sm text-gray-500 dark:text-gray-400">No hay actividad reciente</li>
        ) : (
          displayActivities.map((activity) => (
          <li key={activity.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-gray-700">
            <p className="text-sm text-gray-900 dark:text-gray-50">
              <span className="font-semibold">{activity.user}</span> {activity.action}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{activity.details}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{activity.timestamp}</p>
          </li>
          ))
        )}
      </ul>
    </div>
  );
}

