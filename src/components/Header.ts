export function Header(): HTMLElement {
  const header = document.createElement("header");
  header.id = "header";
  header.innerHTML = `
    <h1>IPTV Player</h1>
    <button class="toggle-theme" id="toggleTheme">
      <i class="fas fa-moon"></i> Dark Mode
    </button>
  `;
  return header;
}
