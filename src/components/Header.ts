export function Header(): HTMLElement {
  const header = document.createElement("header");
  header.id = "header";
  header.innerHTML = `
    <div>
      <p class="header-eyebrow">Live Streaming Workspace</p>
      <h1>IPTV Player</h1>
    </div>
    <button class="toggle-theme" id="toggleTheme">
      <i class="fas fa-moon"></i> Dark Mode
    </button>
  `;
  return header;
}
