import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

(() => {
  const stored = window.localStorage.getItem("iuria-theme");
  const theme = stored === "light" || stored === "dark" ? stored : "dark";
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
})();

createRoot(document.getElementById("root")!).render(<App />);
