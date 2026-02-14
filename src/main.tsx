import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service Worker Kill-switch
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
            registration.unregister();
        }
    }).catch((err) => {
        console.error('Service Worker unregistration failed: ', err);
    });
}

createRoot(document.getElementById("root")!).render(<App />);
