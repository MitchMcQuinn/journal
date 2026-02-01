const loadSharedHeader = async () => {
  const container = document.querySelector("[data-shared-header]");
  if (!container) {
    return;
  }
  try {
    const response = await fetch("header.html", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const html = await response.text();
    container.innerHTML = html;
  } catch (error) {
    // Ignore header load failures.
  }
};

document.addEventListener("DOMContentLoaded", loadSharedHeader);
