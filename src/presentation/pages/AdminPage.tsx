import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Shield, Settings, FileText, Search, Plus, Edit, Trash2, MoreVertical, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import type { UserProfile } from "@domain/entities";
import { highlightText } from "../utils/highlightText";

type Tab = "users" | "permissions" | "settings" | "audit";

interface UserRow extends UserProfile {
  email?: string;
  lastLogin?: string;
}

export function AdminPage() {
  const { authContext } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<Tab>("users");
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<UserRow | null>(null);

  // Verificar que solo ADMIN puede acceder
  React.useEffect(() => {
    if (!authContext) {
      navigate("/login");
      return;
    }
    if (authContext.profile.role !== "ADMIN") {
      navigate("/dashboard");
      return;
    }
  }, [authContext, navigate]);

  // Cargar usuarios
  React.useEffect(() => {
    if (activeTab === "users" && authContext?.profile.role === "ADMIN") {
      loadUsers();
    }
  }, [activeTab, authContext]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Obtener perfiles
      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Obtener emails de auth.users (solo si tenemos acceso)
      const usersWithEmail: UserRow[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Obtener email desde auth.users (solo disponible en server-side, aquí usamos null)
          // En producción, esto debería hacerse desde el backend
          const authUser = null;
          
          // Obtener último login
          const { data: loginEvents } = await supabaseClient
            .from("user_login_events")
            .select("login_at")
            .eq("user_id", profile.id)
            .eq("success", true)
            .order("login_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: profile.id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            initials: profile.initials,
            role: profile.role,
            avatarUrl: profile.avatar_url,
            isActive: profile.is_active,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at,
            email: authUser?.user?.email,
            lastLogin: loginEvents?.login_at
          };
        })
      );

      setUsers(usersWithEmail);
    } catch (error) {
      console.error("[AdminPage] Error cargando usuarios:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const tabs = [
    { id: "users" as Tab, label: t("admin.users"), icon: Users },
    { id: "permissions" as Tab, label: t("admin.permissions"), icon: Shield },
    { id: "settings" as Tab, label: t("admin.settings"), icon: Settings },
    { id: "audit" as Tab, label: t("admin.audit"), icon: FileText }
  ];

  if (!authContext || authContext.profile.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          {t("admin.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t("admin.users.title")}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors
                  ${
                    activeTab === tab.id
                      ? "border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-500"
                      : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <UsersTab
                users={filteredUsers}
                loading={loading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onRefresh={loadUsers}
                t={t}
              />
            </motion.div>
          )}

          {activeTab === "permissions" && (
            <motion.div
              key="permissions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PermissionsTab t={t} />
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SystemSettingsTab t={t} />
            </motion.div>
          )}

          {activeTab === "audit" && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AuditTab t={t} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function UsersTab({
  users,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  t
}: {
  users: UserRow[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder={t("admin.users.search")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onRefresh} variant="primary">
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.users.new")}
        </Button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <p className="text-gray-600 dark:text-gray-400">
            {t("common.noResults")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("admin.users.name")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("admin.users.email")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("admin.users.role")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("admin.users.status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("admin.users.lastLogin")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("admin.users.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                        {user.initials}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-50">
                          {highlightText(`${user.firstName} ${user.lastName}`, searchQuery)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {user.email ? highlightText(user.email, searchQuery) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`
                        inline-flex rounded-full px-2 py-1 text-xs font-medium
                        ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                            : user.role === "WAREHOUSE"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }
                      `}
                    >
                      {highlightText(user.role, searchQuery)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        {t("admin.users.active")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-sm text-red-600 dark:text-red-400">
                        <XCircle className="mr-1 h-4 w-4" />
                        {t("admin.users.inactive")}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // TODO: Implementar edición
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // TODO: Implementar eliminación
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PermissionsTab({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="text-center">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {t("common.comingSoon")}
        </p>
      </div>
    </div>
  );
}

function SystemSettingsTab({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="text-center">
        <Settings className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {t("common.comingSoon")}
        </p>
      </div>
    </div>
  );
}

function AuditTab({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {t("common.comingSoon")}
        </p>
      </div>
    </div>
  );
}

