import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import ErrorFallback from "./ErrorFallback";

/**
 * Route-level error element: React Router renders this instead of a blank screen
 * when a route's element throws during render (or a loader rejects).
 */
export default function RouteError() {
  const err = useRouteError();
  const status = isRouteErrorResponse(err) ? err.status : null;
  return (
    <ErrorFallback
      title={status ? `Fehler ${status}` : "Etwas ist schiefgelaufen"}
      detail={
        status === 404
          ? "Diese Seite gibt es nicht."
          : "Es ist ein unerwarteter Fehler aufgetreten. Bitte lade die Seite neu."
      }
    />
  );
}
