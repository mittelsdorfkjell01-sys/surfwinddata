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
import SearchResults from "./pages/SearchResults";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/map", element: <MapView /> },
  { path: "/search", element: <SearchResults /> },
  { path: "/spot/:id", element: <SpotDetail /> },
  { path: "/region/:slug", element: <RegionDetail /> },
  { path: "/admin/spot/new", element: <AdminSpotForm /> },
  { path: "/admin/spot/:id/edit", element: <AdminSpotForm /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
