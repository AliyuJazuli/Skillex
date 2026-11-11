(() => {
  try {
    const savedTheme = localStorage.getItem("skillswap-theme");
    const preference = ["system", "light", "dark"].includes(savedTheme) ? savedTheme : "system";
    const useDarkTheme = preference === "dark"
      || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", useDarkTheme);
    document.documentElement.setAttribute("data-theme", useDarkTheme ? "dark" : "light");
    document.documentElement.setAttribute("data-theme-preference", preference);
    document.documentElement.style.colorScheme = useDarkTheme ? "dark" : "light";
  } catch (error) {
    console.error("Could not restore the saved Skillex theme:", error);
  }
})();
