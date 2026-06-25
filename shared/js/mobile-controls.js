(function () {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const header = document.querySelector(".header");
    const toggleButton = document.getElementById("mobileControlsToggle");

    if (!header || !toggleButton) {
        return;
    }

    const storageKey = "dayzMapMobileControlsOpen";

    function readSavedState() {
        try {
            return window.localStorage.getItem(storageKey) === "1";
        } catch (error) {
            return false;
        }
    }

    function saveState(isOpen) {
        try {
            window.localStorage.setItem(storageKey, isOpen ? "1" : "0");
        } catch (error) {
            // Ignore storage errors.
        }
    }

    function updateButton(isOpen) {
        toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
        toggleButton.textContent = isOpen ? "Скрыть инструменты" : "Показать инструменты";
    }

    function applyState(isMobile, isOpen) {
        header.classList.toggle("mobile-controls-ready", isMobile);
        header.classList.toggle("mobile-controls-open", isMobile && isOpen);
        updateButton(isMobile && isOpen);
    }

    function syncState() {
        applyState(mediaQuery.matches, readSavedState());
    }

    toggleButton.addEventListener("click", function () {
        if (!mediaQuery.matches) {
            return;
        }

        const nextOpen = !header.classList.contains("mobile-controls-open");
        saveState(nextOpen);
        applyState(true, nextOpen);
    });

    if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", syncState);
    } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(syncState);
    }

    syncState();
})();
