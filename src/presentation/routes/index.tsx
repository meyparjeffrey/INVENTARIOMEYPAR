import * as React from "react";
import { createBrowserRouter, createHashRouter, Navigate, RouteObject } from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout";
import { LoginPage } from "../pages/LoginPage";
import { ProtectedRoute } from "./ProtectedRoute";

// Detectar si estamos en Electron (archivos locales)
const isElectron = window.location.protocol === "file:";

const ProductsPage = React.lazy(() =>
  import("../pages/ProductsPage").then((module) => ({ default: module.ProductsPage }))
);

const ProductNewPage = React.lazy(() =>
  import("../pages/ProductNewPage").then((module) => ({ default: module.ProductNewPage }))
);

// Lazy load de páginas
const DashboardPage = React.lazy(() =>
  import("../pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);

// Placeholders para otras páginas
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex h-full items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{title}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">Próximamente...</p>
    </div>
  </div>
);

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/login" replace />
  },
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/dashboard",
        element: (
          <React.Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
              </div>
            }
          >
            <DashboardPage />
          </React.Suspense>
        )
      },
      {
        path: "/products",
        element: (
          <React.Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
              </div>
            }
          >
            <ProductsPage />
          </React.Suspense>
        )
      },
      {
        path: "/products/new",
        element: (
          <React.Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
              </div>
            }
          >
            <ProductNewPage />
          </React.Suspense>
        )
      },
      {
        path: "/batches",
        element: <PlaceholderPage title="Lotes" />
      },
      {
        path: "/movements",
        element: <PlaceholderPage title="Movimientos" />
      },
      {
        path: "/alerts",
        element: <PlaceholderPage title="Alarmas" />
      },
      {
        path: "/scanner",
        element: <PlaceholderPage title="Escáner" />
      },
      {
        path: "/chat",
        element: <PlaceholderPage title="Chat" />
      },
      {
        path: "/reports",
        element: <PlaceholderPage title="Reportes" />
      },
      {
        path: "/settings",
        element: <PlaceholderPage title="Configuración" />
      },
      {
        path: "/admin",
        element: <PlaceholderPage title="Administración" />
      }
    ]
  }
];

// Usar HashRouter en Electron (archivos locales) y BrowserRouter en desarrollo web
// Forzar ruta inicial a /login
const routerConfig = {
  basename: "/",
  // Forzar que la ruta inicial sea /login
  ...(isElectron ? {} : { window: window })
};

export const router = isElectron 
  ? createHashRouter(routes, {
      ...routerConfig,
      // En Electron, forzar hash inicial a /login
      window: typeof window !== "undefined" ? window : undefined
    })
  : createBrowserRouter(routes, routerConfig);

