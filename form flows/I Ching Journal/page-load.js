const markContentReady = () => {
  document.body.setAttribute("data-content-ready", "true");
};

document.addEventListener("DOMContentLoaded", () => {
  const shouldWait = document.body.getAttribute("data-wait-for-response") === "true";
  if (!shouldWait) {
    requestAnimationFrame(markContentReady);
    return;
  }

  const onReady = () => {
    markContentReady();
  };

  document.addEventListener("page:data-ready", onReady, { once: true });
});
