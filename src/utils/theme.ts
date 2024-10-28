export function initializeTheme(): void {
  const toggleThemeBtn = document.getElementById("toggleTheme") as HTMLElement;
  const body = document.body;

  toggleThemeBtn?.addEventListener("click", () => {
    if (body.getAttribute("data-theme") === "dark") {
      body.setAttribute("data-theme", "light");
      toggleThemeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
      body.setAttribute("data-theme", "dark");
      toggleThemeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
  });
}
