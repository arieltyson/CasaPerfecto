// Registers the generated service worker in production builds, so the site
// keeps working offline after the first visit.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        // Offline support is an enhancement; the site works without it.
      });
  });
}
