(() => {
  let installPromptEvent = null;
  let registrationPromise = null;
  let applyUpdateOnControllerChange = false;

  const appVersion = () => window.SKILLEX_APP_VERSION || "unknown";
  const updateStatus = (message) => {
    const status = document.getElementById("app-update-status");
    if (status) status.textContent = message;
  };
  const isInstalled = () => window.matchMedia?.("(display-mode: standalone)").matches
    || navigator.standalone === true;

  function showUpdateDialog(registration) {
    updateStatus("A new version is ready to install.");
    const dialog = document.getElementById("app-update-dialog");
    if (dialog && !dialog.open) dialog.showModal();
    return registration.waiting;
  }

  function watchRegistration(registration) {
    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state !== "installed") return;
        if (navigator.serviceWorker.controller) {
          showUpdateDialog(registration);
        } else {
          updateStatus(`Skillex ${appVersion()} is ready on this device.`);
        }
      });
    });

    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdateDialog(registration);
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    registrationPromise = navigator.serviceWorker.register("./service-worker.js", {
      scope: "./",
      updateViaCache: "none"
    });
    registrationPromise.then(watchRegistration, (error) => {
      console.error("Could not register the Skillex app worker:", error);
      updateStatus("App updates are unavailable right now. Check your connection and try again.");
    });
  }

  function setInstallStatus() {
    const button = document.getElementById("install-app");
    const status = document.getElementById("app-install-status");
    if (!button || !status) return;

    if (isInstalled()) {
      button.textContent = "Already installed";
      button.disabled = true;
      status.textContent = "Skillex is installed on this device.";
      return;
    }

    button.textContent = "Install Skillex";
    button.disabled = false;
    status.textContent = installPromptEvent
      ? "Skillex can be installed on this device."
      : "If your browser does not open an install prompt, use its menu to install or add Skillex to your home screen.";
  }

  function installInstructions() {
    const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return isAppleMobile
      ? "In Safari, tap Share, then choose Add to Home Screen."
      : "Open your browser menu and choose Install app or Add to Home Screen.";
  }

  async function handleInstall() {
    if (isInstalled()) {
      setInstallStatus();
      return;
    }
    if (!installPromptEvent) {
      const status = document.getElementById("app-install-status");
      if (status) status.textContent = installInstructions();
      return;
    }

    const promptEvent = installPromptEvent;
    installPromptEvent = null;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      const status = document.getElementById("app-install-status");
      if (status) {
        status.textContent = choice.outcome === "accepted"
          ? "Installation accepted. Follow your browser's prompts to finish."
          : "Installation was canceled. You can try again from your browser menu.";
      }
      setInstallStatus();
    } catch (error) {
      console.error("Could not open the Skillex install prompt:", error);
      const status = document.getElementById("app-install-status");
      if (status) status.textContent = installInstructions();
    }
  }

  async function checkForUpdates() {
    const button = document.getElementById("check-app-update");
    if (button) button.disabled = true;
    updateStatus("Checking for updates…");

    try {
      if (!("serviceWorker" in navigator) || !window.isSecureContext) {
        throw new Error("App updates are available only in a supported secure browser.");
      }
      const registration = await registrationPromise;
      if (!registration) throw new Error("The app update service is not available.");

      await registration.update();
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateDialog(registration);
      } else if (registration.installing) {
        updateStatus("A new version is being prepared. We will ask before switching.");
      } else {
        updateStatus(`No updates available. You are using version ${appVersion()}.`);
      }
    } catch (error) {
      console.error("Could not check for Skillex updates:", error);
      updateStatus(error.message || "Could not check for updates. Please try again.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function initSettings() {
    const installButton = document.getElementById("install-app");
    const updateButton = document.getElementById("check-app-update");
    if (!installButton || !updateButton) return;

    const versionLabel = document.getElementById("app-version");
    if (versionLabel) versionLabel.textContent = `Version ${appVersion()}`;
    setInstallStatus();

    if (!installButton.dataset.bound) {
      installButton.dataset.bound = "true";
      installButton.addEventListener("click", handleInstall);
    }
    if (!updateButton.dataset.bound) {
      updateButton.dataset.bound = "true";
      updateButton.addEventListener("click", checkForUpdates);
    }

    const keepCurrentButton = document.getElementById("keep-current-version");
    if (keepCurrentButton && !keepCurrentButton.dataset.bound) {
      keepCurrentButton.dataset.bound = "true";
      keepCurrentButton.addEventListener("click", () => {
        document.getElementById("app-update-dialog")?.close();
        updateStatus(`You are staying on version ${appVersion()}. The update can be applied later.`);
      });
    }

    const applyUpdateButton = document.getElementById("apply-app-update");
    if (applyUpdateButton && !applyUpdateButton.dataset.bound) {
      applyUpdateButton.dataset.bound = "true";
      applyUpdateButton.addEventListener("click", async () => {
        const dialog = document.getElementById("app-update-dialog");
        try {
          const registration = await registrationPromise;
          if (!registration?.waiting) {
            dialog?.close();
            updateStatus("That update is no longer available. Check again for the latest version.");
            return;
          }
          applyUpdateOnControllerChange = true;
          updateStatus("Installing the update…");
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          dialog?.close();
        } catch (error) {
          console.error("Could not apply the Skillex update:", error);
          updateStatus(error.message || "Could not apply the update. Please try again.");
        }
      });
    }

    if (registrationPromise) {
      registrationPromise.then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          showUpdateDialog(registration);
        }
        checkForUpdates();
      }, () => {
        updateStatus("App updates are unavailable right now. Check your connection and try again.");
      });
    } else {
      updateStatus("App updates require a supported secure browser.");
    }
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    setInstallStatus();
  });
  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    setInstallStatus();
  });
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (applyUpdateOnControllerChange) window.location.reload();
  });

  registerServiceWorker();
  window.SkillexAppLifecycle = { initSettings };
})();
