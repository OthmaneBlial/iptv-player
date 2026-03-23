import { getStoredTheme, setStoredTheme } from "./storage";

export function initializeTheme(): void {
  const toggleThemeBtn = document.getElementById("toggleTheme") as HTMLElement;
  const body = document.body;
  const storedTheme = getStoredTheme();
  const initialTheme =
    storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : body.getAttribute("data-theme") || "dark";

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

  toggleThemeBtn?.addEventListener("click", () => {
    const nextTheme =
      body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    renderTheme(nextTheme);
    setStoredTheme(nextTheme);
  });
}
