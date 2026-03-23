import { appStore } from "../store/appStore";
import { getStoredTheme, setStoredTheme } from "./storage";

export function initializeTheme(): void {
  const toggleThemeBtn = document.getElementById("toggleTheme") as HTMLElement;
  const body = document.body;
  const initialTheme =
    appStore.getState().theme ||
    (getStoredTheme() === "light" ? "light" : "dark") ||
    body.getAttribute("data-theme") ||
    "dark";

  const renderTheme = (theme: string) => {
    body.setAttribute("data-theme", theme);
    if (!toggleThemeBtn) {
      return;
    }

    if (theme === "light") {
      toggleThemeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
      toggleThemeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
  };

  renderTheme(initialTheme);
  appStore.setTheme(initialTheme === "light" ? "light" : "dark");

  toggleThemeBtn?.addEventListener("click", () => {
    const nextTheme =
      body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    renderTheme(nextTheme);
    appStore.setTheme(nextTheme);
    setStoredTheme(nextTheme);
  });

  appStore.subscribe((state) => {
    renderTheme(state.theme);
  });
}
