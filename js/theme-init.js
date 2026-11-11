(() => {
  try {
    const savedTheme = localStorage.getItem("skillswap-theme");
    const useDarkTheme = savedTheme === "dark";
    document.documentElement.classList.toggle("dark", useDarkTheme);
    document.documentElement.style.colorScheme = useDarkTheme ? "dark" : "light";
  } catch (error) {
    console.error("Could not restore the saved Skillex theme:", error);
  }
})();
