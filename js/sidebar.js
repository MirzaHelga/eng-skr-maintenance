const btnMenu = document.getElementById("btn-menu");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const btnSidebarClose = document.getElementById("sidebar-close");

function setTopbarHeightVar() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  document.documentElement.style.setProperty(
    "--topbar-h",
    topbar.getBoundingClientRect().height + "px"
  );
}

setTopbarHeightVar();

const topbarEl = document.querySelector(".topbar");
if (topbarEl && "ResizeObserver" in window) {
  new ResizeObserver(setTopbarHeightVar).observe(topbarEl);
} else {
  window.addEventListener("resize", setTopbarHeightVar);
  window.addEventListener("load", setTopbarHeightVar);
}

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}

function toggleSidebar() {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

btnMenu.addEventListener("click", toggleSidebar);
btnSidebarClose?.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

function highlightActiveSidebarLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

highlightActiveSidebarLink();