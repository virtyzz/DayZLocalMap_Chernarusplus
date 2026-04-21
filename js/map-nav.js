(function () {
    const currentMap = document.body.dataset.mapId;
    if (!currentMap) {
        return;
    }

    const helpers = window.DayzMapScriptHelpers;
    const heading = document.querySelector(".header h1");
    if (!heading || !helpers) {
        return;
    }

    const maps = [
        { id: "cherno", href: helpers.getMapHref("cherno") },
        { id: "deerisle", href: helpers.getMapHref("deerisle") },
        { id: "deadfall", href: helpers.getMapHref("deadfall") }
    ];

    const wrapper = document.createElement("div");
    wrapper.className = "map-nav";
    wrapper.innerHTML = [
        '<button type="button" class="map-nav__trigger" aria-haspopup="true" aria-expanded="false">',
        '  <span class="map-nav__trigger-label">',
        '    <span class="map-nav__trigger-prefix">DayZ</span>',
        `    <span class="map-nav__trigger-name">${helpers.getMapName(currentMap)}</span>`,
        '  </span>',
        '  <span class="map-nav__trigger-arrow">&#9662;</span>',
        '</button>',
        '<div class="map-nav__panel" hidden>',
        '  <div class="map-nav__panel-header">Выбор карты</div>',
        '  <div class="map-nav__list">',
        maps.map((map) => {
            const meta = helpers.getMapMeta(map.id);
            const activeClass = map.id === currentMap ? " is-active" : "";
            return [
                `<button type="button" class="map-nav__item${activeClass}" data-href="${map.href}" data-map-id="${map.id}">`,
                '  <span class="map-nav__item-top">',
                `    <span class="map-nav__item-name">${meta.name}</span>`,
                `    <span class="map-nav__item-size">${meta.size}</span>`,
                '  </span>',
                `  <span class="map-nav__item-subtitle">${meta.subtitle}</span>`,
                "</button>"
            ].join("");
        }).join(""),
        "  </div>",
        "</div>"
    ].join("");

    const trigger = wrapper.querySelector(".map-nav__trigger");
    const panel = wrapper.querySelector(".map-nav__panel");
    const items = Array.from(wrapper.querySelectorAll(".map-nav__item"));

    function setOpenState(isOpen) {
        wrapper.classList.toggle("is-open", isOpen);
        trigger.setAttribute("aria-expanded", String(isOpen));
        panel.hidden = !isOpen;
    }

    function closePanel() {
        setOpenState(false);
    }

    trigger.addEventListener("click", () => {
        setOpenState(!wrapper.classList.contains("is-open"));
    });

    items.forEach((item) => {
        item.addEventListener("click", () => {
            const targetMapId = item.dataset.mapId;
            const targetHref = item.dataset.href;
            try {
                window.localStorage.setItem("dayzMapSelectedMap", targetMapId);
            } catch (error) {
                // Ignore storage errors.
            }
            window.location.href = targetHref;
        });
    });

    document.addEventListener("click", (event) => {
        if (!wrapper.contains(event.target)) {
            closePanel();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closePanel();
        }
    });

    heading.textContent = "";
    heading.appendChild(wrapper);
})();
