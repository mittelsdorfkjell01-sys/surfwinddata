import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./index.css";
import Landing from "./pages/Landing";
import MapView from "./pages/MapView";
import SpotDetail from "./pages/SpotDetail";
import RegionDetail from "./pages/RegionDetail";
import SearchResults from "./pages/SearchResults";
import { ADMIN_DEPLOY, INCLUDE_ADMIN } from "./lib/target";

// The admin back office is code-split behind a build flag: the public build
// (surfwinddata.com) never imports ./adminRoutes, so none of the admin UI ships.
// The admin build (kjellmittelsdorf.de, VITE_INCLUDE_ADMIN=true) pulls it in and
// opens the dashboard at "/". See lib/target.ts.
async function bootstrap() {
  const routes: RouteObject[] = [
    {
      path: "/",
      element: ADMIN_DEPLOY ? <Navigate to="/admin" replace /> : <Landing />,
    },
    { path: "/map", element: <MapView /> },
    { path: "/search", element: <SearchResults /> },
    { path: "/spot/:id", element: <SpotDetail /> },
    { path: "/region/:slug", element: <RegionDetail /> },
  ];

  if (INCLUDE_ADMIN) {
    routes.push(...(await import("./adminRoutes")).default);
  }

  // Unknown paths — including /admin on the public build — fall back home.
  routes.push({ path: "*", element: <Navigate to="/" replace /> });

  const router = createBrowserRouter(routes);
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}

void bootstrap();
