import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./index.css";
import Landing from "./pages/Landing";
import MapView from "./pages/MapView";
import SpotDetail from "./pages/SpotDetail";
import RegionDetail from "./pages/RegionDetail";
import AdminSpotForm from "./pages/AdminSpotForm";
import AdminLogin from "./pages/AdminLogin";
import AdminHome from "./pages/AdminHome";
import AdminSpots from "./pages/AdminSpots";
import AdminRegions from "./pages/AdminRegions";
import AdminRegionForm from "./pages/AdminRegionForm";
import AdminReview from "./pages/AdminReview";
import AdminUsers from "./pages/AdminUsers";
import SearchResults from "./pages/SearchResults";
import AdminShell from "./components/AdminShell";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./lib/auth";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/map", element: <MapView /> },
  { path: "/search", element: <SearchResults /> },
  { path: "/spot/:id", element: <SpotDetail /> },
  { path: "/region/:slug", element: <RegionDetail /> },

  // --- admin (auth-gated back office) ---
  { path: "/admin/login", element: <AdminLogin /> },
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <AdminShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AdminHome /> },
      { path: "spots", element: <AdminSpots /> },
      { path: "regions", element: <AdminRegions /> },
      { path: "region/:id/edit", element: <AdminRegionForm /> },
      { path: "review", element: <AdminReview /> },
      { path: "spot/new", element: <AdminSpotForm /> },
      { path: "spot/:id/edit", element: <AdminSpotForm /> },
      {
        path: "users",
        element: (
          <RequireAuth role="admin">
            <AdminUsers />
          </RequireAuth>
        ),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
