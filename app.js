(function () {
  var header = document.querySelector("[data-header]");
  var navToggle = document.querySelector("[data-nav-toggle]");
  var mobileMenu = document.querySelector("[data-mobile-menu]");
  var megaToggles = document.querySelectorAll("[data-mega-toggle]");
  var backToTop = document.querySelector("[data-back-to-top]");
  var floatingContact = document.querySelector("[data-floating-contact]");
  var floatingToggle = document.querySelector("[data-floating-toggle]");
  var vipCards = document.querySelectorAll("[data-vip-card]");
  var scrollProgressBar = document.querySelector("[data-scroll-progress]");
  var zenWhySection = document.querySelector("[data-zen-why]");
  var processSection = document.querySelector("[data-process-timeline]");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealSelector = ".reveal, .reveal-up, .reveal-scale, .stagger-item, .zen-hero-benefits a, .zen-about-story__features article, .lux-procedure-list a, .lux-location__cards article, .lux-minimal__portrait, .lux-map-actions a";
  var zenConfig = window.ZEN_CONFIG || {};
  var turnstileReady = null;
  var contactPhone = "+40720558515";
  var contactPhoneLabel = "+40 720 558 515";
  var contactWhatsapp = "40720558515";
  var contactWhatsappText = "Bună ziua, aș dori o programare la ZEN Clinics.";
  var siteFooter = document.querySelector(".zen-footer, .lux-footer, .site-footer, footer");
  var floatingContactHidden = false;
  var vipTooltipNode = null;
  var activeVipBadge = null;
  var vipTooltipFrame = 0;
  var pageTransitionTimer = 0;

  if (!scrollProgressBar) {
    scrollProgressBar = document.createElement("div");
    scrollProgressBar.className = "scroll-progress-bar";
    scrollProgressBar.setAttribute("data-scroll-progress", "");
    scrollProgressBar.setAttribute("aria-hidden", "true");
    document.body.appendChild(scrollProgressBar);
  }

  function createFloatingContactLink(options) {
    var link = document.createElement("a");
    var label = document.createElement("span");

    link.className = "floating-contact__button floating-contact__button--" + options.type;
    link.href = options.href;
    link.setAttribute("aria-label", options.ariaLabel);
    link.innerHTML = options.icon;

    if (options.target) {
      link.target = options.target;
      link.rel = "noopener";
    }

    label.textContent = options.label;
    link.appendChild(label);

    return link;
  }

  function ensureFloatingContact() {
    var aside;
    var items;

    if (floatingContact || document.body.classList.contains("owner-login-page")) {
      return floatingContact;
    }

    aside = document.createElement("aside");
    aside.className = "floating-contact floating-contact--quick";
    aside.setAttribute("data-floating-contact", "");
    aside.setAttribute("aria-label", "Contact rapid");

    items = document.createElement("div");
    items.className = "floating-contact__items";

    items.appendChild(createFloatingContactLink({
      type: "phone",
      href: "tel:" + contactPhone,
      label: "Sună",
      ariaLabel: "Sună acum la " + contactPhoneLabel,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l3 3-2 2c1.5 3 3 4.5 6 6l2-2 3 3-1.5 3C10.5 19 5 13.5 4 6.5L7 5z"/></svg>'
    }));

    items.appendChild(createFloatingContactLink({
      type: "whatsapp",
      href: "https://wa.me/" + contactWhatsapp + "?text=" + encodeURIComponent(contactWhatsappText),
      target: "_blank",
      label: "WhatsApp",
      ariaLabel: "Scrie pe WhatsApp",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20l1.2-3.5A8 8 0 1 1 9 19.3L5 20z"/><path d="M8.8 8.7c.4 3.2 2.4 5.3 5.6 6.1l1.1-1.2-2-1-1 1c-1.3-.6-2.4-1.8-3-3.1l1-1.1-1-2-1.7 1.3z"/></svg>'
    }));

    aside.appendChild(items);
    document.body.appendChild(aside);
    document.body.classList.add("has-floating-contact");

    return aside;
  }

  floatingContact = ensureFloatingContact();
  floatingToggle = floatingContact ? floatingContact.querySelector("[data-floating-toggle]") : floatingToggle;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeText(value) {
    return (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function isConsultationLabel(value) {
    var text = normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();

    return text.indexOf("consult") === 0;
  }

  function formatPriceValue(name, value) {
    var raw = String(value || "").trim();
    var normalized = normalizeText(raw);
    var withoutPrefix;

    if (isConsultationLabel(name)) {
      return "1000 RON";
    }

    if (!raw) {
      return "";
    }

    if (normalized.indexOf("de la") === 0) {
      withoutPrefix = raw.replace(/^de\s+la\s+/i, "").trim();
      return "DE LA " + withoutPrefix;
    }

    if (!/\d/.test(raw)) {
      return raw;
    }

    return "DE LA " + raw;
  }

  function isExcludedPriceItem(name) {
    return normalizeText(name).indexOf("cazare") !== -1;
  }

  function isConsultationPriceItem(name) {
    var text = normalizeText(name).replace(/[^a-z0-9]+/g, " ").trim();

    return text.indexOf("consult") === 0 || text.indexOf("control") === 0 || text.indexOf("evaluare") === 0;
  }

  function hasManualVipBadge(entry) {
    return Array.isArray(entry) && entry[2] === true;
  }

  function getVipBenefitNote(name, category) {
    var service = normalizeText(name);
    var categoryName = normalizeText((category && category.title) || "");

    if (isConsultationPriceItem(name)) {
      return "ZEN VIP Card: consultatie gratuita doar dupa activarea cardului in urma unei proceduri efectuate.";
    }

    if (/botox|toxina|hialuronic|volumizare buze|full face|rinocorectie|reconturare|cearcane|pomet|menton|gummy|smoker/.test(service)) {
      return "ZEN VIP Card: reducere dedicata pentru acid hialuronic / botox dupa procedura efectuata si activarea cardului.";
    }

    if (/mezoterapie|skinbooster|dermapen|peeling|laser|co2|prp|vampir|polinucleotid|exozom|sculptra|radiesse|topirea|lipoliza|hiperhidroza|xantelasme/.test(service)) {
      return "ZEN VIP Card: beneficiu pentru cosmetica medicala si proceduri selectate dupa activarea cardului.";
    }

    if (/anestezie locala|labioplastie|vaginoplastie|volumizare peniana|circumcizie|chist|lipom|scleroterapie|flebectomie/.test(service)) {
      return "ZEN VIP Card: reducere pentru proceduri cu anestezie locala, unde indicatia permite, dupa activarea cardului.";
    }

    if (/chirurgie|implant|lifting|rinoplastie|blefaroplastie|abdominoplastie|lipo|ginecomastie|micsorare|reductie|bbl|postbariatrica|diastaza|stomac/.test(service + " " + categoryName)) {
      return "ZEN VIP Card: reducere pentru proceduri chirurgicale cu anestezie generala, conform planului medical, dupa activarea cardului.";
    }

    return "";
  }

  function addUniquePriceItem(list, entry) {
    var key = normalizeText(entry && entry[0]);

    if (!entry || !entry[0] || list.some(function (item) { return normalizeText(item[0]) === key; })) {
      return;
    }

    list.push(entry);
  }

  function classifySurgeryPriceItem(entry) {
    var name = normalizeText(entry && entry[0]);

    if (/bustiera|ciorapi|analize|pansament/.test(name)) {
      return "pregatire";
    }

    if (/flebectomie|evta|rfa|stripping|scleroterapie|ulcer|indice|glezna|vascular/.test(name)) {
      return "vasculara";
    }

    if (/penis|circumcizie|labioplastie|vaginoplastie|volumizare peniana/.test(name)) {
      return "intima";
    }

    if (/implant mamar|lifting mamar|lifting cu implant|reductie mamara|micsorare sani|lipofilling sani|schimbare implant|ginecomastie/.test(name)) {
      return "san";
    }

    if (/abdominoplastie|lipoaspiratie|liposuctie|brahioplastie|bbl|fese|gambe|genunchi|coapse|brate|spate|zona pubiana|postbariatrica|diastaza|stomac/.test(name)) {
      return "corp";
    }

    if (/rinoplastie|blefaroplastie|lifting facial|mini lifting|sprancene|otoplastie|urechi|bichectomie|cervicala/.test(name)) {
      return "fata";
    }

    return "generala";
  }

  function splitSurgeryPriceCategory(category, items) {
    var buckets = {
      fata: [],
      san: [],
      corp: [],
      intima: [],
      vasculara: [],
      generala: [],
      pregatire: []
    };
    var order = [
      ["fata", "chirurgie", "Chirurgia fe\u021bei", "Proceduri pentru profil, pleoape, expresie \u0219i contur facial."],
      ["san", "chirurgie-san", "Chirurgia oncologic\u0103", "Interven\u021bii pentru volum, pozi\u021bie \u0219i propor\u021bie."],
      ["corp", "chirurgie-corp", "Chirurgia corpului", "Contur corporal, abdomen, lipoaspira\u021bie \u0219i remodelare."],
      ["intima", "chirurgie-intima", "Estetic\u0103 intim\u0103 chirurgical\u0103", "Proceduri intime feminine \u0219i masculine, abordate discret."],
      ["vasculara", "chirurgie-vasculara", "Chirurgie vascular\u0103", "Proceduri vasculare \u0219i servicii asociate."],
      ["generala", "chirurgie-generala-preturi", "Chirurgie general\u0103", "Interven\u021bii \u0219i servicii chirurgicale stabilite dup\u0103 evaluare."],
      ["pregatire", "pregatire-postoperatorie", "Preg\u0103tire \u0219i consumabile", "Elemente asociate procedurilor \u0219i recuper\u0103rii."]
    ];

    items.forEach(function (entry) {
      buckets[classifySurgeryPriceItem(entry)].push(entry);
    });

    return order
      .filter(function (group) { return buckets[group[0]].length; })
      .map(function (group) {
        return {
          id: group[1],
          title: group[2],
          summary: group[3],
          items: buckets[group[0]]
        };
      });
  }

  // Render price branches exactly as stored (panel = single source of truth).
  // No auto-splitting or auto-grouping; the owner panel controls every branch.
  function organizePriceCategories(categories) {
    return (categories || [])
      .filter(function (category) {
        return category && category.id !== "stomatologie";
      })
      .map(function (category) {
        return {
          id: category.id,
          title: category.title,
          summary: category.summary,
          items: ((category.items) || []).filter(function (entry) {
            return entry && entry[0] && !isExcludedPriceItem(entry[0]);
          })
        };
      })
      .filter(function (category) {
        return category.items.length;
      });
  }

  function createVipPriceBadge() {
    var badge = document.createElement("a");
    var tooltipText = "ZEN VIP Card se acorda DOAR dupa o procedura efectuata la ZEN Clinics. Consultatia simpla nu activeaza cardul.";

    badge.className = "price-vip-badge";
    badge.href = getLocalHref("card-loialitate.html#activare");
    badge.setAttribute("aria-label", "ZEN VIP Card se acorda doar dupa o procedura efectuata, nu dupa simpla consultatie.");
    badge.setAttribute("data-vip-tooltip", tooltipText);
    badge.textContent = "VIP";

    return badge;
  }

  function ensureVipTooltip() {
    if (vipTooltipNode) {
      return vipTooltipNode;
    }

    vipTooltipNode = document.createElement("div");
    vipTooltipNode.className = "price-vip-tooltip";
    vipTooltipNode.id = "price-vip-tooltip";
    vipTooltipNode.setAttribute("role", "tooltip");
    vipTooltipNode.setAttribute("aria-hidden", "true");
    document.body.appendChild(vipTooltipNode);

    return vipTooltipNode;
  }

  function positionVipTooltip(badge) {
    var tooltip = vipTooltipNode;
    var badgeRect;
    var tooltipRect;
    var left;
    var top;
    var gap = 10;
    var viewportGap = 12;

    if (!tooltip || !badge) {
      return;
    }

    badgeRect = badge.getBoundingClientRect();
    tooltipRect = tooltip.getBoundingClientRect();
    left = badgeRect.left + badgeRect.width / 2 - tooltipRect.width / 2;
    left = clamp(left, viewportGap, window.innerWidth - tooltipRect.width - viewportGap);
    top = badgeRect.top - tooltipRect.height - gap;

    if (top < viewportGap) {
      top = badgeRect.bottom + gap;
      tooltip.setAttribute("data-placement", "bottom");
    } else {
      tooltip.setAttribute("data-placement", "top");
    }

    tooltip.style.left = left + "px";
    tooltip.style.top = clamp(top, viewportGap, window.innerHeight - tooltipRect.height - viewportGap) + "px";
  }

  function showVipTooltip(badge) {
    var tooltipText;
    var tooltip;

    if (!badge) {
      return;
    }

    tooltipText = badge.getAttribute("data-vip-tooltip") || "";
    if (!tooltipText) {
      return;
    }

    activeVipBadge = badge;
    tooltip = ensureVipTooltip();
    tooltip.textContent = tooltipText;
    tooltip.setAttribute("aria-hidden", "false");
    badge.setAttribute("aria-describedby", tooltip.id);

    window.requestAnimationFrame(function () {
      positionVipTooltip(badge);
      tooltip.classList.add("is-visible");
    });
  }

  function hideVipTooltip(badge) {
    if (badge && activeVipBadge && badge !== activeVipBadge) {
      return;
    }

    if (activeVipBadge) {
      activeVipBadge.removeAttribute("aria-describedby");
    }

    activeVipBadge = null;

    if (vipTooltipNode) {
      vipTooltipNode.classList.remove("is-visible");
      vipTooltipNode.setAttribute("aria-hidden", "true");
    }
  }

  function queueVipTooltipPosition() {
    if (!activeVipBadge || vipTooltipFrame) {
      return;
    }

    vipTooltipFrame = window.requestAnimationFrame(function () {
      vipTooltipFrame = 0;
      positionVipTooltip(activeVipBadge);
    });
  }

  function initVipBadgeTooltips() {
    if (document.documentElement.getAttribute("data-vip-tooltips-ready") === "true") {
      return;
    }

    document.documentElement.setAttribute("data-vip-tooltips-ready", "true");

    document.addEventListener("pointerover", function (event) {
      var badge = event.target.closest ? event.target.closest(".price-vip-badge") : null;

      if (badge) {
        showVipTooltip(badge);
      }
    });

    document.addEventListener("pointerout", function (event) {
      var badge = event.target.closest ? event.target.closest(".price-vip-badge") : null;

      if (badge && (!event.relatedTarget || !badge.contains(event.relatedTarget))) {
        hideVipTooltip(badge);
      }
    });

    document.addEventListener("focusin", function (event) {
      var badge = event.target.closest ? event.target.closest(".price-vip-badge") : null;

      if (badge) {
        showVipTooltip(badge);
      }
    });

    document.addEventListener("focusout", function (event) {
      var badge = event.target.closest ? event.target.closest(".price-vip-badge") : null;

      if (badge) {
        hideVipTooltip(badge);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        hideVipTooltip();
      }
    });

    window.addEventListener("scroll", queueVipTooltipPosition, true);
    window.addEventListener("resize", queueVipTooltipPosition);
  }

  function getPricesApiUrl() {
    return zenConfig.pricesApiUrl || (window.location.protocol.indexOf("http") === 0 ? window.location.origin + "/api/prices.php" : "");
  }

  function fetchRemotePrices() {
    var endpoint = getPricesApiUrl();

    if (!endpoint) {
      return Promise.resolve(null);
    }

    return fetch(endpoint, { cache: "no-store" }).then(function (response) {
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error("Remote prices unavailable");
      }

      return response.json();
    }).then(function (payload) {
      if (!payload) {
        return null;
      }

      if (Array.isArray(payload)) {
        return payload;
      }

      if (Array.isArray(payload.prices)) {
        return payload.prices;
      }

      if (Array.isArray(payload.categories)) {
        return payload.categories;
      }

      return null;
    });
  }

  function renderPriceLists(sourceCategories) {
    var dataNode = document.querySelector("[data-price-data]");
    var root = document.querySelector("[data-price-root]");
    var storedData;
    var categories;

    if (!dataNode || !root) {
      return;
    }

    if (Array.isArray(sourceCategories)) {
      categories = sourceCategories;
    } else {
    try {
      storedData = window.localStorage && window.localStorage.getItem("zen-owner-price-data");
      categories = storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      categories = null;
    }

    try {
      categories = Array.isArray(categories) ? categories : JSON.parse(dataNode.textContent);
    } catch (error) {
      root.textContent = "Lista de prețuri nu a putut fi încărcată.";
      return;
    }

    }

    if (!Array.isArray(categories)) {
      return;
    }

    categories = organizePriceCategories(categories);

    root.innerHTML = "";

    categories.forEach(function (category, index) {
      var article = document.createElement("article");
      var head = document.createElement("div");
      var title = document.createElement("h2");
      var count = document.createElement("span");
      var summary = document.createElement("p");
      var list = document.createElement("ul");
      var listId = "price-list-" + (category.id || "category-" + index);
      var toggle;

      article.className = "price-card reveal-up";
      if (index < 2) {
        article.classList.add("price-card--featured");
      }
      article.id = category.id || "";
      article.setAttribute("data-price-card", "");

      head.className = "price-card__head";
      title.textContent = category.title || "Ramură";
      count.className = "price-card__count";
      var visibleItems = (category.items || []).filter(function (entry) {
        return entry && !isExcludedPriceItem(entry[0] || "");
      });

      count.textContent = (visibleItems.length || 0) + " servicii";
      head.appendChild(title);
      head.appendChild(count);

      summary.textContent = category.summary || "";
      list.className = "price-list";
      list.id = listId;

      visibleItems.forEach(function (entry) {
        var item = document.createElement("li");
        var name = document.createElement("span");
        var nameText = document.createElement("span");
        var price = document.createElement("strong");
        var serviceName = entry[0] || "";

        item.setAttribute("data-price-item", "");
        name.className = "price-name-wrap";
        nameText.textContent = serviceName;
        name.appendChild(nameText);

        var vipNote = hasManualVipBadge(entry)
          ? "ZEN VIP Card: beneficiu VIP disponibil dupa activarea cardului in urma unei proceduri efectuate."
          : getVipBenefitNote(serviceName, category);

        if (vipNote) {
          item.classList.add("price-list__consultation");
          name.appendChild(createVipPriceBadge());
        }

        if (isConsultationPriceItem(serviceName)) {
          var freeLabel = document.createElement("span");
          var oldPrice = document.createElement("del");

          price.className = "price-consultation-value";
          freeLabel.className = "price-consultation-free";
          freeLabel.textContent = "Gratuit";
          oldPrice.textContent = "1000 RON";
          price.appendChild(freeLabel);
          price.appendChild(oldPrice);
        } else if (category.id === "terapii-iv") {
          price.textContent = String(entry[1] || "").trim();
        } else {
          price.textContent = formatPriceValue(serviceName, entry[1] || "");
        }
        if (vipNote) {
          var note = document.createElement("small");
          note.className = "price-vip-note";
          note.textContent = vipNote;
          name.appendChild(note);
        }
        item.appendChild(name);
        item.appendChild(price);
        list.appendChild(item);
      });

      article.appendChild(head);
      article.appendChild(summary);
      article.appendChild(list);

      if (visibleItems.length) {
        toggle = document.createElement("button");
        article.classList.add("price-card--collapsible");
        toggle.className = "price-card__toggle";
        toggle.type = "button";
        toggle.setAttribute("data-price-toggle", "");
        toggle.setAttribute("aria-controls", listId);
        toggle.setAttribute("aria-expanded", "false");
        toggle.dataset.expandLabel = "Vezi lista (" + visibleItems.length + " servicii)";
        toggle.dataset.collapseLabel = "Restrânge lista";
        toggle.textContent = toggle.dataset.expandLabel;
        article.appendChild(toggle);
      }

      root.appendChild(article);
    });

    // Ensure newly created price cards are observed for reveal effects
    if (window.revealObserver) {
      document.querySelectorAll(".price-card.reveal-up").forEach(function(card) {
        if (!card.classList.contains("is-visible")) {
          window.revealObserver.observe(card);
        }
      });
    } else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
      // Fallback: add is-visible immediately if observer isn't available
      document.querySelectorAll(".price-card.reveal-up").forEach(function(card) {
        card.classList.add("is-visible");
      });
    }
  }

  function updateHeader() {
    var isScrolled = window.scrollY > 12;

    if (header) {
      header.classList.toggle("is-scrolled", isScrolled);
    }

    if (backToTop) {
      backToTop.classList.toggle("is-visible", window.scrollY > 520);
    }

    updateScrollProgress();
    updateZenWhyTransition();
    updateFloatingContact();
  }

  function updateScrollProgress() {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var progress = scrollable > 0 ? window.scrollY / scrollable : 0;

    if (scrollProgressBar) {
      scrollProgressBar.style.transform = "scaleX(" + clamp(progress, 0, 1).toFixed(4) + ")";
    }
  }

  function updateZenWhyTransition() {
    var rect;
    var viewport;
    var progress;

    if (!zenWhySection || reduceMotion) {
      return;
    }

    rect = zenWhySection.getBoundingClientRect();
    viewport = window.innerHeight || document.documentElement.clientHeight;
    progress = clamp((viewport - rect.top) / (viewport * 0.78 + rect.height * 0.52), 0, 1);

    zenWhySection.style.setProperty("--zen-why-progress", progress.toFixed(3));
    zenWhySection.style.setProperty("--zen-why-shift", (progress * 10).toFixed(2) + "%");
    zenWhySection.style.setProperty("--zen-why-ornament-opacity", (0.3 + progress * 0.32).toFixed(3));
    zenWhySection.style.setProperty("--zen-why-overlay", (1 - progress * 0.72).toFixed(3));
  }

  function setFloatingContactHidden(hidden) {
    if (!floatingContact || floatingContactHidden === hidden) {
      return;
    }

    floatingContactHidden = hidden;
    floatingContact.setAttribute("aria-hidden", String(hidden));

    floatingContact.querySelectorAll("a, button").forEach(function (control) {
      if (hidden) {
        control.setAttribute("tabindex", "-1");
      } else {
        control.removeAttribute("tabindex");
      }
    });
  }

  function updateFloatingContact() {
    var viewport;
    var footerTop;
    var footerHidden = false;
    var menuHidden = header && header.classList.contains("menu-open");

    if (!floatingContact) {
      return;
    }

    if (siteFooter) {
      viewport = window.innerHeight || document.documentElement.clientHeight;
      footerTop = siteFooter.getBoundingClientRect().top;
      footerHidden = footerTop <= viewport - 8;
    }

    floatingContact.classList.toggle("is-footer-hidden", footerHidden);
    floatingContact.classList.toggle("is-menu-hidden", menuHidden);
    setFloatingContactHidden(footerHidden || menuHidden);
  }

  function setMenu(open) {
    if (!navToggle || !mobileMenu || !header) {
      return;
    }

    navToggle.setAttribute("aria-expanded", String(open));
    mobileMenu.hidden = !open;
    header.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    updateFloatingContact();

    try {
      document.dispatchEvent(new CustomEvent("zen:menu-state", { detail: { open: open } }));
    } catch (error) {
      var menuEvent = document.createEvent("CustomEvent");
      menuEvent.initCustomEvent("zen:menu-state", false, false, { open: open });
      document.dispatchEvent(menuEvent);
    }
  }

  function getMegaItem(button) {
    return button.closest("[data-mega-item]") || button.closest(".mega-item");
  }

  function closeMegaMenus(exceptItem) {
    document.querySelectorAll("[data-mega-toggle]").forEach(function (button) {
      var item = getMegaItem(button);

      if (item && item !== exceptItem) {
        item.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
      }
    });
  }

  function resetTransientPageState(showContent) {
    if (pageTransitionTimer) {
      window.clearTimeout(pageTransitionTimer);
      pageTransitionTimer = 0;
    }

    document.body.classList.remove("is-page-leaving", "is-intro-active");
    document.body.style.overflow = "";
    closeMegaMenus();
    setMenu(false);
    hideVipTooltip();

    document.querySelectorAll(".site-intro").forEach(function (intro) {
      if (intro.parentNode) {
        intro.parentNode.removeChild(intro);
      }
    });

    if (showContent) {
      document.querySelectorAll(revealSelector).forEach(function (element) {
        element.classList.add("is-visible");
      });

      if (processSection) {
        processSection.classList.add("is-process-visible");
      }

      handleScroll();
    }
  }

  function initPageRestoreGuards() {
    if (document.documentElement.getAttribute("data-page-restore-ready") === "true") {
      return;
    }

    document.documentElement.setAttribute("data-page-restore-ready", "true");

    window.addEventListener("pageshow", function (event) {
      if (event.persisted || document.body.classList.contains("is-page-leaving")) {
        window.requestAnimationFrame(function () {
          resetTransientPageState(true);
        });
      }
    });

    window.addEventListener("pagehide", function () {
      resetTransientPageState(false);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && document.body.classList.contains("is-page-leaving")) {
        resetTransientPageState(true);
      }
    });
  }

  function applyStaggerIndexes() {
    var groups = document.querySelectorAll(
      ".zen-hero-benefits, .zen-welcome-bridge__grid, .zen-why-light__cards, .zen-popular-grid--visual, .zen-loyalty-benefits, .zen-about-story__features, .lux-hero__quick, .lux-values, .lux-location__cards, .lux-minimal__visual, .lux-procedure-list, .lux-pricing__cards, .lux-privilege__benefits, .lux-reasons__grid, .zen-principles-grid, .lux-timeline, .lux-map-actions"
    );

    groups.forEach(function (group) {
      var items = Array.prototype.slice.call(group.querySelectorAll(".stagger-item, article, li, a"));

      items.forEach(function (item, index) {
        item.style.transitionDelay = reduceMotion ? "0ms" : Math.min(index * 74, 520) + "ms";
      });
    });
  }

  function initSiteIntro() {
    var intro;
    var logoSrc;
    var seenIntro = false;

    if (reduceMotion || document.body.classList.contains("owner-login-page")) {
      return;
    }

    try {
      seenIntro = window.sessionStorage && window.sessionStorage.getItem("zen-intro-seen") === "true";
    } catch (error) {
      seenIntro = false;
    }

    if (seenIntro) {
      return;
    }

    intro = document.createElement("div");
    logoSrc = window.location.pathname.indexOf("/sections/") >= 0 ? "../gallery/logo.jpg" : "gallery/logo.jpg";
    intro.className = "site-intro";
    intro.setAttribute("aria-hidden", "true");
    intro.innerHTML = '<div class="site-intro__content"><span class="site-intro__mark"><img class="site-intro__logo" src="' + logoSrc + '" alt=""></span><span class="site-intro__title">ZEN Clinics</span><span class="site-intro__caption">Frumusețe cu măsură. Rezultate cu sens.</span></div>';
    document.body.appendChild(intro);
    document.body.classList.add("is-intro-active");

    try {
      window.sessionStorage && window.sessionStorage.setItem("zen-intro-seen", "true");
    } catch (error) {
      // Session storage can be unavailable in private contexts; the visual still works.
    }

    window.setTimeout(function () {
      intro.classList.add("is-hiding");
      document.body.classList.remove("is-intro-active");
    }, 1450);

    window.setTimeout(function () {
      if (intro.parentNode) {
        intro.parentNode.removeChild(intro);
      }
    }, 2100);
  }

  function initPageTransitions() {
    if (reduceMotion) {
      return;
    }

    document.addEventListener("click", function (event) {
      var link = event.target.closest ? event.target.closest("a[href]") : null;
      var href;
      var targetUrl;

      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      href = link.getAttribute("href") || "";

      if (!href || href.charAt(0) === "#" || link.hasAttribute("download") || (link.target && link.target !== "_self")) {
        return;
      }

      if (/^(mailto:|tel:|sms:|https:\/\/wa\.me)/i.test(href)) {
        return;
      }

      try {
        targetUrl = new URL(href, window.location.href);
      } catch (error) {
        return;
      }

      if (targetUrl.origin !== window.location.origin || targetUrl.pathname === window.location.pathname && targetUrl.hash) {
        return;
      }

      event.preventDefault();
      closeMegaMenus();
      setMenu(false);
      document.body.classList.add("is-page-leaving");

      if (pageTransitionTimer) {
        window.clearTimeout(pageTransitionTimer);
      }

      pageTransitionTimer = window.setTimeout(function () {
        pageTransitionTimer = 0;
        window.location.href = targetUrl.href;
      }, 280);
    });
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      closeMegaMenus();
      setMenu(!isOpen);
    });

    mobileMenu.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMenu(false);
      }
    });
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest ? event.target.closest("[data-mega-toggle]") : null;
    var item;
    var isOpen;

    if (!button) {
      return;
    }

    item = getMegaItem(button);
    isOpen = button.getAttribute("aria-expanded") === "true";

    closeMegaMenus(item);

    if (!item) {
      return;
    }

    item.classList.toggle("is-open", !isOpen);
    button.setAttribute("aria-expanded", String(!isOpen));
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest("[data-mega-item], .mega-item")) {
      closeMegaMenus();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setMenu(false);
      closeMegaMenus();
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var targetId = link.getAttribute("href");
      var target;

      if (!targetId || targetId === "#") {
        return;
      }

      target = document.querySelector(targetId);

      if (!target) {
        return;
      }

      event.preventDefault();
      closeMegaMenus();
      setMenu(false);
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  document.querySelectorAll("[data-surgery-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      var image = document.querySelector("[data-surgery-image]");
      var title = document.querySelector("[data-surgery-title]");
      var text = document.querySelector("[data-surgery-text]");
      var showcase = image ? image.closest(".lux-surgery__showcase") : null;
      var nextTitle = button.dataset.title || button.textContent;
      var nextText = button.dataset.text || "";

      document.querySelectorAll("[data-surgery-tab]").forEach(function (tab) {
        var active = tab === button;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });

      function applySurgeryContent() {
        if (title) {
          title.textContent = nextTitle;
        }

        if (text) {
          text.textContent = nextText;
        }
      }

      if (image && button.dataset.image && !reduceMotion) {
        if (showcase) {
          showcase.classList.add("is-switching");
        }

        window.setTimeout(function () {
          image.src = button.dataset.image;
          image.alt = button.dataset.alt || "";
          applySurgeryContent();

          if (showcase) {
            window.setTimeout(function () {
              showcase.classList.remove("is-switching");
            }, 80);
          }
        }, 180);
      } else if (image && button.dataset.image) {
        image.src = button.dataset.image;
        image.alt = button.dataset.alt || "";
        applySurgeryContent();
      } else {
        applySurgeryContent();
      }
    });
  });

  document.querySelectorAll("[data-testimonial-slider]").forEach(function (slider) {
    var slides = Array.prototype.slice.call(slider.querySelectorAll("[data-testimonial-slide]"));
    var prev = slider.querySelector("[data-testimonial-prev]");
    var next = slider.querySelector("[data-testimonial-next]");
    var current = 0;

    function showSlide(index) {
      if (!slides.length) {
        return;
      }

      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        var active = slideIndex === current;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
      });
    }

    if (prev) {
      prev.addEventListener("click", function () {
        showSlide(current - 1);
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        showSlide(current + 1);
      });
    }

    showSlide(0);
  });

  function syncFaqPanelHeight(panel) {
    if (!panel || panel.hidden) {
      return;
    }

    panel.style.maxHeight = panel.scrollHeight + "px";
  }

  document.querySelectorAll("[data-faq-item]").forEach(function (item) {
    var button = item.querySelector("[data-faq-toggle]");
    var panel = item.querySelector("[data-faq-panel]");
    var isOpen;

    if (!button || !panel) {
      return;
    }

    isOpen = item.classList.contains("is-open") || button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(isOpen));
    panel.hidden = !isOpen;
    panel.style.maxHeight = isOpen ? panel.scrollHeight + "px" : "0px";

    button.addEventListener("click", function () {
      var nextOpen = button.getAttribute("aria-expanded") !== "true";

      button.setAttribute("aria-expanded", String(nextOpen));

      if (nextOpen) {
        panel.hidden = false;
        item.classList.add("is-open");
        panel.style.maxHeight = "0px";

        window.requestAnimationFrame(function () {
          panel.style.maxHeight = panel.scrollHeight + "px";
        });
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";

        window.requestAnimationFrame(function () {
          item.classList.remove("is-open");
          panel.style.maxHeight = "0px";
        });

        window.setTimeout(function () {
          if (!item.classList.contains("is-open")) {
            panel.hidden = true;
          }
        }, reduceMotion ? 0 : 580);
      }
    });
  });

  document.addEventListener("click", function (event) {
    var toggle = event.target.closest ? event.target.closest("[data-price-toggle]") : null;
    var card;
    var expanded;

    if (!toggle) {
      return;
    }

    card = toggle.closest("[data-price-card]");

    if (!card) {
      return;
    }

    expanded = !card.classList.contains("is-expanded");

    if (expanded && card.parentNode) {
      card.parentNode.querySelectorAll("[data-price-card].is-expanded").forEach(function (openCard) {
        var openToggle = openCard.querySelector("[data-price-toggle]");

        if (openCard === card) {
          return;
        }

        openCard.classList.remove("is-expanded");

        if (openToggle) {
          openToggle.setAttribute("aria-expanded", "false");
          openToggle.textContent = openToggle.dataset.expandLabel;
        }
      });
    }

    card.classList.toggle("is-expanded", expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? toggle.dataset.collapseLabel : toggle.dataset.expandLabel;
  });

  function initPriceSearch() {
    document.querySelectorAll("[data-price-search]").forEach(function (input) {
      var searchFrame = 0;
      var searchTimer = 0;

      if (input.getAttribute("data-price-search-ready") === "true") {
        return;
      }

      input.setAttribute("data-price-search-ready", "true");

      function filterPrices() {
        var query = normalizeText(input.value.replace(/[<>{}[\]$]/g, "").slice(0, 80));
        var cards = Array.prototype.slice.call(document.querySelectorAll("[data-price-card]"));

        cards.forEach(function (card) {
          var items = Array.prototype.slice.call(card.querySelectorAll("[data-price-item]"));
          var visibleItems = 0;

          card.classList.toggle("is-searching", !!query);

          items.forEach(function (item) {
            var match = !query || normalizeText(item.textContent).indexOf(query) !== -1 || normalizeText(card.querySelector("h2").textContent).indexOf(query) !== -1;
            item.classList.toggle("is-hidden", !match);
            visibleItems += match ? 1 : 0;
          });

          card.classList.toggle("is-hidden", visibleItems === 0);
        });
        searchFrame = 0;
      }

      input.addEventListener("input", function () {
        var sanitized = input.value.replace(/[<>{}[\]$]/g, "").slice(0, 80);

        if (sanitized !== input.value) {
          input.value = sanitized;
        }

        if (searchFrame) {
          window.cancelAnimationFrame(searchFrame);
        }

        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(function () {
          if (getFunctionUrl("price-search") && sanitized.length >= 2) {
            submitSecureForm("price-search", { query: sanitized }).catch(function () {});
          }
        }, 900);

        searchFrame = window.requestAnimationFrame(filterPrices);
      });
    });
  }

  renderPriceLists();
  initPriceSearch();
  initVipBadgeTooltips();
  fetchRemotePrices().then(function (prices) {
    if (Array.isArray(prices) && prices.length) {
      renderPriceLists(prices);
      initPriceSearch();
      initVipBadgeTooltips();
    }
  }).catch(function () {
    // The embedded price list remains available when the remote blob is not configured yet.
  });

  var bookingContextBySlug = {
    "medicina-estetica": { branch: "Medicină estetică", procedure: "Consultație estetică" },
    "cosmetologie": { branch: "Cosmetologie", procedure: "Consultație cosmetologie" },
    "chirurgie-estetica": { branch: "Chirurgie estetică", procedure: "Consultație chirurgie estetică" },
    "chirurgie-generala": { branch: "Chirurgie generală", procedure: "Consultație chirurgie generală" },
    "volumizarea-buzelor": { branch: "Medicină estetică", procedure: "Volumizare buze" },
    "full-face-acid-hialuronic": { branch: "Medicină estetică", procedure: "Full face cu acid hialuronic" },
    "estompare-riduri": { branch: "Medicină estetică", procedure: "Estompare riduri / Botox" },
    "tratamentul-ridurilor": { branch: "Medicină estetică", procedure: "Estompare riduri / Botox" },
    "rinocorectie-acid-hialuronic": { branch: "Medicină estetică", procedure: "Rinocorecție cu acid hialuronic" },
    "rejuvenare-faciala": { branch: "Medicină estetică", procedure: "Consultație estetică" },
    "mezoterapia": { branch: "Medicină estetică", procedure: "Mezoterapie" },
    "skinbooster": { branch: "Medicină estetică", procedure: "Skinbooster" },
    "prp": { branch: "Medicină estetică", procedure: "PRP / terapia vampir" },
    "terapia-vampir": { branch: "Medicină estetică", procedure: "PRP / terapia vampir" },
    "microneedling": { branch: "Medicină estetică", procedure: "Microneedling / Dermapen" },
    "topirea-grasimii": { branch: "Medicină estetică", procedure: "Topirea grăsimii" },
    "conturare-tample": { branch: "Medicină estetică", procedure: "Consultație estetică" },
    "marirea-pometilor": { branch: "Medicină estetică", procedure: "Mărirea pomeților" },
    "marirea-mentonului": { branch: "Medicină estetică", procedure: "Mărirea mentonului" },
    "reconturare-mandibulara": { branch: "Medicină estetică", procedure: "Conturare mandibulară" },
    "estompare-cearcane": { branch: "Medicină estetică", procedure: "Estompare cearcăne" },
    "eliminare-cearcane-barbati": { branch: "Medicină estetică", procedure: "Estompare cearcăne" },
    "laser-co2": { branch: "Dermatologie estetică", procedure: "Laser fracționar CO2" },
    "peeling-facial": { branch: "Dermatologie estetică", procedure: "Peeling facial" },
    "xantelasme": { branch: "Dermatologie estetică", procedure: "Xantelasme" },
    "hiperhidroza": { branch: "Dermatologie estetică", procedure: "Hiperhidroză" },
    "zambet-gingival": { branch: "Dermatologie estetică", procedure: "Zâmbet gingival" },
    "rinoplastie": { branch: "Chirurgie estetică", procedure: "Rinoplastie" },
    "rinoplastie-ultrasonica": { branch: "Chirurgie estetică", procedure: "Rinoplastie ultrasonică" },
    "blefaroplastie": { branch: "Chirurgie estetică", procedure: "Blefaroplastie" },
    "lifting-facial": { branch: "Chirurgie estetică", procedure: "Lifting facial" },
    "otoplastie": { branch: "Chirurgie estetică", procedure: "Otoplastie" },
    "bichectomie": { branch: "Chirurgie estetică", procedure: "Bichectomie" },
    "urechi-despicate": { branch: "Chirurgie estetică", procedure: "Otoplastie" },
    "implanturi-cu-silicon": { branch: "Chirurgie estetică", procedure: "Implant mamar" },
    "ridicare-sani": { branch: "Chirurgie estetică", procedure: "Ridicare sâni" },
    "micsorare-sani": { branch: "Chirurgie estetică", procedure: "Micșorare sâni" },
    "ginecomastie": { branch: "Chirurgie estetică", procedure: "Ginecomastie" },
    "liposuctie": { branch: "Chirurgie estetică", procedure: "Liposucție" },
    "liposuctie-dame": { branch: "Chirurgie estetică", procedure: "Liposucție" },
    "liposuctie-cervicala-barbati": { branch: "Chirurgie estetică", procedure: "Liposucție cervicală" },
    "liposuctia-cervicala": { branch: "Chirurgie estetică", procedure: "Liposucție cervicală" },
    "abdominoplastie-femei": { branch: "Chirurgie estetică", procedure: "Abdominoplastie" },
    "abdominoplastie-barbati": { branch: "Chirurgie estetică", procedure: "Abdominoplastie" },
    "lifting-brate": { branch: "Chirurgie estetică", procedure: "Lifting brațe" },
    "lifting-coapse": { branch: "Chirurgie estetică", procedure: "Lifting coapse" },
    "lifting-brazilian": { branch: "Chirurgie estetică", procedure: "Lifting brazilian" },
    "remodelare-postnatala": { branch: "Chirurgie estetică", procedure: "Remodelare postnatală" },
    "operatie-postbariatrica": { branch: "Chirurgie generală", procedure: "Operație postbariatrică" },
    "diastaza-abdominala": { branch: "Chirurgie generală", procedure: "Diastază abdominală" },
    "micsorare-stomac": { branch: "Chirurgie generală", procedure: "Micșorare stomac" },
    "transplant-de-par-fue-advance": { branch: "Chirurgie estetică", procedure: "Consultație chirurgie estetică" },
    "labioplastie": { branch: "Estetică ginecologică", procedure: "Labioplastie" },
    "rejuvenare-intima": { branch: "Estetică ginecologică", procedure: "Rejuvenare intimă" },
    "vaginoplastie": { branch: "Estetică ginecologică", procedure: "Vaginoplastie" },
    "volumizare-peniana": { branch: "Estetică ginecologică", procedure: "Volumizare peniană" }
  };

  function findSelectOption(select, value) {
    var normalizedValue = normalizeText(value);
    var options = Array.prototype.slice.call(select.options);

    return options.find(function (option) {
      return option.value === value || normalizeText(option.value) === normalizedValue || normalizeText(option.textContent) === normalizedValue;
    });
  }

  function setFieldValue(field, value, allowNewOption, optionBranch) {
    var option;

    if (!field || !value) {
      return false;
    }

    if (field.tagName === "SELECT") {
      option = findSelectOption(field, value);

      if (!option && allowNewOption) {
        option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        if (optionBranch) {
          option.setAttribute("data-branch", optionBranch);
        }
        field.appendChild(option);
      }

      if (option) {
        field.value = option.value;
        return true;
      }

      return false;
    }

    field.value = value;
    return true;
  }

  function refreshProcedureOptions(form, keepCurrent) {
    var branchSelect = form.querySelector("[data-branch-select]");
    var procedureSelect = form.querySelector("[data-procedure-select]");
    var branch = branchSelect ? branchSelect.value : "";
    var currentValue = procedureSelect ? procedureSelect.value : "";
    var selectedOption;

    if (!procedureSelect) {
      return;
    }

    Array.prototype.forEach.call(procedureSelect.options, function (option) {
      var optionBranch = option.getAttribute("data-branch") || "";
      var isVisible = !option.value || !branch || !optionBranch || optionBranch === branch;

      option.hidden = !isVisible;
      option.disabled = !isVisible;
    });

    if (!keepCurrent && currentValue) {
      selectedOption = procedureSelect.options[procedureSelect.selectedIndex];
      if (selectedOption && selectedOption.disabled) {
        procedureSelect.value = "";
      }
    }
  }

  function applyBookingPrefill(form) {
    var params = new URLSearchParams(window.location.search);
    var branch = params.get("branch") || params.get("ramura") || "";
    var procedure = params.get("procedure") || params.get("procedura") || params.get("service") || "";
    var branchSelect = form.querySelector("[data-branch-select], [name='branch']");
    var procedureField = form.querySelector("[data-procedure-select], [name='procedure']");

    if (branch) {
      setFieldValue(branchSelect, branch, true);
    }

    refreshProcedureOptions(form, true);

    if (procedure) {
      setFieldValue(procedureField, procedure, true, branch);
    }

    refreshProcedureOptions(form, true);
  }

  function getCurrentProcedureContext() {
    var fileName = decodeURIComponent(window.location.pathname.split("/").pop() || "");
    var slug = fileName.replace(/\.html$/i, "");

    return bookingContextBySlug[slug] || null;
  }

  function withBookingParams(href, context) {
    var hashIndex = href.indexOf("#");
    var hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
    var beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    var queryIndex = beforeHash.indexOf("?");
    var path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
    var query = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : "";
    var params = new URLSearchParams(query);

    params.set("branch", context.branch);
    params.set("procedure", context.procedure);

    return path + "?" + params.toString() + hash;
  }

  function enrichBookingLinks() {
    var context = getCurrentProcedureContext();

    if (!context) {
      return;
    }

    document.querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      var hash = href.indexOf("#") >= 0 ? href.slice(href.indexOf("#")) : "";
      var goesToBooking = hash === "#programare" || hash === "#formular";
      var goesToKnownForm = href.indexOf("index.html") >= 0 || href.indexOf("contact.html") >= 0;

      if (goesToBooking && goesToKnownForm) {
        link.setAttribute("href", withBookingParams(href, context));
      }
    });
  }

  function getLocalHref(path) {
    var inSections = window.location.pathname.indexOf("/sections/") >= 0;

    return (inSections ? "../" : "") + path;
  }

  function getSocialLinks() {
    var configured = zenConfig.socialLinks || {};

    return [
      {
        key: "instagram",
        label: "Instagram ZEN Clinics",
        href: configured.instagram || "https://www.instagram.com/zenclinics.ro/"
      },
      {
        key: "facebook",
        label: "Facebook ZEN Clinics",
        href: configured.facebook || "https://www.facebook.com/share/1MDxxfXbxU/"
      },
      {
        key: "tiktok",
        label: "TikTok ZEN Clinics",
        href: configured.tiktok || "https://www.tiktok.com/@zen.clinicsbucuresti"
      }
    ].filter(function (item) {
      return item.href;
    });
  }

  function getSocialIcon(key) {
    switch (key) {
      case "instagram":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"></rect><circle cx="12" cy="12" r="3.4"></circle><circle cx="17" cy="7" r="1"></circle></svg>';
      case "facebook":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 8.1h-2.1c-.6 0-.9.3-.9 1v2h2.8l-.4 3h-2.4V22h-3.2v-7.9H7v-3h2.3V8.8c0-2.6 1.6-4.1 4-4.1 1.1 0 2 .1 2.2.1z"></path></svg>';
      case "tiktok":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 3c.4 2.5 1.8 4 4.1 4.3v3.1a7.4 7.4 0 0 1-4.1-1.3v5.7A5.2 5.2 0 1 1 9 9.6c.4 0 .8 0 1.2.1v3.2a2 2 0 1 0 1.1 1.8V3z"></path></svg>';
      default:
        return "";
    }
  }

  function createSocialLinks(variant) {
    var list = document.createElement("div");

    list.className = "zen-social-links zen-social-links--" + variant;
    list.setAttribute("aria-label", "Social media ZEN Clinics");

    getSocialLinks().forEach(function (item) {
      var link = document.createElement("a");

      link.className = "zen-social-link zen-social-link--" + item.key;
      link.href = item.href;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-label", item.label);
      link.title = item.label;
      link.innerHTML = getSocialIcon(item.key);
      list.appendChild(link);
    });

    return list;
  }

  function initSocialLinks() {
    document.querySelectorAll(".zen-header-actions, .lux-header__actions, .header-inner").forEach(function (target) {
      var toggle;

      if (target.querySelector(".zen-social-links--nav")) {
        return;
      }

      toggle = target.querySelector("[data-nav-toggle]");
      target.insertBefore(createSocialLinks("nav"), toggle || null);
    });

    document.querySelectorAll("[data-booking-form], [data-privilege-form], [data-vip-form]").forEach(function (form) {
      var status;

      if (form.querySelector(".zen-social-links--form")) {
        return;
      }

      status = form.querySelector("[data-form-status], [data-privilege-status], [data-vip-status]");
      form.insertBefore(createSocialLinks("form"), status || null);
    });

    document.querySelectorAll("footer").forEach(function (footer) {
      var target;

      if (footer.querySelector(".zen-social-links--footer")) {
        return;
      }

      target = footer.querySelector(".zen-footer__contact") ||
        footer.querySelector(".lux-footer__grid > div:last-child") ||
        footer.querySelector(".footer-grid > div:last-child") ||
        footer;
      target.appendChild(createSocialLinks("footer"));
    });
  }

  function initBnrRates() {
    var root = document.querySelector("[data-bnr-rates]");
    var status;
    var eurNode;
    var usdNode;
    var gbpNode;
    var sourceNode;
    var endpoints;

    if (!root || !window.fetch || !window.DOMParser) {
      return;
    }

    status = root.querySelector("[data-bnr-status]");
    eurNode = root.querySelector("[data-bnr-eur]");
    usdNode = root.querySelector("[data-bnr-usd]");
    gbpNode = root.querySelector("[data-bnr-gbp]");
    sourceNode = root.querySelector("[data-bnr-source]");
    endpoints = [
      zenConfig.bnrRatesProxyUrl || (window.location.protocol.indexOf("http") === 0 ? window.location.origin + "/api/bnr-rates" : ""),
      "https://www.bnr.ro/nbrfxrates.xml"
    ].filter(Boolean);

    function setStatus(message, isError) {
      if (status) {
        status.textContent = message;
        status.classList.toggle("is-error", Boolean(isError));
      }
    }

    function getRateNode(xml, currency) {
      var rates = Array.prototype.slice.call(xml.getElementsByTagName("Rate"));

      return rates.find(function (rate) {
        return rate.getAttribute("currency") === currency;
      }) || null;
    }

    function getRate(xml, currency) {
      var node = getRateNode(xml, currency);
      var multiplier = node ? Number(node.getAttribute("multiplier") || "1") : 1;
      var value = node ? Number((node.textContent || "").replace(",", ".")) : 0;

      if (!node || !value) {
        return "";
      }

      return (multiplier > 1 ? multiplier + " " : "1 ") + currency + " = " + value.toFixed(4) + " RON";
    }

    function loadFromEndpoint(index) {
      var endpoint = endpoints[index];

      if (!endpoint) {
        setStatus("Cursul BNR nu a putut fi încărcat automat. Verifică sursa oficială.", true);
        return;
      }

      fetch(endpoint, { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          throw new Error("BNR response failed");
        }

        return response.text();
      }).then(function (text) {
        var xml = new window.DOMParser().parseFromString(text, "application/xml");
        var cube = Array.prototype.find.call(xml.getElementsByTagName("Cube"), function (node) {
          return node.getAttribute("date");
        });
        var xmlError = xml.querySelector("parsererror");

        if (xmlError) {
          throw new Error("BNR XML parse failed");
        }

        if (eurNode) {
          eurNode.textContent = getRate(xml, "EUR") || "EUR indisponibil";
        }

        if (usdNode) {
          usdNode.textContent = getRate(xml, "USD") || "USD indisponibil";
        }

        if (gbpNode) {
          gbpNode.textContent = getRate(xml, "GBP") || "GBP indisponibil";
        }

        if (sourceNode) {
          sourceNode.href = "https://www.bnr.ro/nbrfxrates.xml";
        }

        setStatus("Actualizat BNR" + (cube ? ": " + cube.getAttribute("date") : "") + ".");
      }).catch(function () {
        loadFromEndpoint(index + 1);
      });
    }

    setStatus("Se încarcă automat cursul BNR...");
    loadFromEndpoint(0);
  }

  function initCookieConsent() {
    var CONSENT_KEY = "zen-cookie-consent-v1";
    var analyticsId = (zenConfig.googleAnalyticsId || "").trim();
    var panel;
    var settingsPanel;
    var analyticsCheckbox;
    var preferenceButton;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied"
    });

    function readConsent() {
      try {
        return JSON.parse(window.localStorage && window.localStorage.getItem(CONSENT_KEY));
      } catch (error) {
        return null;
      }
    }

    function writeConsent(value) {
      try {
        if (window.localStorage) {
          window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
        }
      } catch (error) {}
    }

    function updateGoogleConsent(analyticsAllowed) {
      window.gtag("consent", "update", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: analyticsAllowed ? "granted" : "denied"
      });
    }

    function loadAnalytics() {
      var script;

      if (!analyticsId || window.ZEN_ANALYTICS_LOADED) {
        return;
      }

      window.ZEN_ANALYTICS_LOADED = true;
      script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(analyticsId);
      document.head.appendChild(script);

      window.gtag("js", new Date());
      window.gtag("config", analyticsId, {
        anonymize_ip: true
      });
    }

    function applyConsent(consent) {
      var analyticsAllowed = !!(consent && consent.analytics);

      updateGoogleConsent(analyticsAllowed);

      if (analyticsAllowed) {
        loadAnalytics();
      }
    }

    function closePanel() {
      if (!panel) {
        return;
      }

      document.body.classList.remove("has-cookie-consent-open");
      panel.classList.remove("is-visible");
      window.setTimeout(function () {
        panel.hidden = true;
      }, reduceMotion ? 0 : 220);
    }

    function saveConsent(analyticsAllowed) {
      var value = {
        necessary: true,
        analytics: !!analyticsAllowed,
        updatedAt: new Date().toISOString()
      };

      writeConsent(value);
      applyConsent(value);
      closePanel();
      showPreferenceButton();
    }

    function showSettings(open) {
      if (!settingsPanel) {
        return;
      }

      settingsPanel.hidden = !open;
      panel.classList.toggle("has-settings-open", open);
    }

    function openPanel() {
      if (!panel) {
        return;
      }

      document.body.classList.add("has-cookie-consent-open");
      panel.hidden = false;
      window.requestAnimationFrame(function () {
        panel.classList.add("is-visible");
      });
    }

    function showPreferenceButton() {
      if (preferenceButton || !document.body) {
        return;
      }

      preferenceButton = document.createElement("button");
      preferenceButton.type = "button";
      preferenceButton.className = "zen-cookie-preferences-button";
      preferenceButton.setAttribute("data-cookie-preferences", "");
      preferenceButton.textContent = "Setări cookies";
      document.body.appendChild(preferenceButton);
    }

    function buildPanel() {
      if (panel || !document.body) {
        return;
      }

      panel = document.createElement("section");
      panel.className = "zen-cookie-consent";
      panel.hidden = true;
      panel.setAttribute("data-cookie-consent", "");
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-labelledby", "cookie-consent-title");
      panel.setAttribute("aria-describedby", "cookie-consent-text");
      panel.innerHTML = [
        '<div class="zen-cookie-consent__content">',
        '<p class="zen-cookie-consent__kicker">Confidențialitate</p>',
        '<h2 id="cookie-consent-title">Alegerea ta pentru cookies</h2>',
        '<p id="cookie-consent-text">Folosim cookies necesare pentru funcționarea site-ului. Cu acordul tău, folosim și Google Analytics pentru statistici agregate despre vizitarea paginilor. Poți accepta, respinge sau modifica preferințele oricând.</p>',
        '<div class="zen-cookie-consent__actions">',
        '<button type="button" class="zen-cookie-consent__button zen-cookie-consent__button--ghost" data-cookie-reject>Respinge</button>',
        '<button type="button" class="zen-cookie-consent__button zen-cookie-consent__button--ghost" data-cookie-settings>Setări</button>',
        '<button type="button" class="zen-cookie-consent__button zen-cookie-consent__button--gold" data-cookie-accept>Accept analytics</button>',
        '</div>',
        '<div class="zen-cookie-consent__settings" data-cookie-settings-panel hidden>',
        '<div class="zen-cookie-consent__setting">',
        '<span><strong>Cookies necesare</strong><small>Active permanent pentru securitate, preferințe tehnice și afișarea corectă a site-ului.</small></span>',
        '<em>Activ</em>',
        '</div>',
        '<label class="zen-cookie-consent__setting zen-cookie-consent__setting--toggle">',
        '<span><strong>Analytics</strong><small>Permite măsurarea vizitelor prin Google Analytics numai după consimțământ.</small></span>',
        '<input type="checkbox" data-cookie-analytics>',
        '<i aria-hidden="true"></i>',
        '</label>',
        '<button type="button" class="zen-cookie-consent__button zen-cookie-consent__button--gold" data-cookie-save>Salvează preferințele</button>',
        '</div>',
        '<p class="zen-cookie-consent__links"><a href="' + getLocalHref("politica-confidentialitate.html#cookies") + '">Politica de confidențialitate și cookies</a></p>',
        '</div>'
      ].join("");

      document.body.appendChild(panel);

      settingsPanel = panel.querySelector("[data-cookie-settings-panel]");
      analyticsCheckbox = panel.querySelector("[data-cookie-analytics]");

      panel.querySelector("[data-cookie-accept]").addEventListener("click", function () {
        saveConsent(true);
      });

      panel.querySelector("[data-cookie-reject]").addEventListener("click", function () {
        saveConsent(false);
      });

      panel.querySelector("[data-cookie-settings]").addEventListener("click", function () {
        showSettings(settingsPanel.hidden);
      });

      panel.querySelector("[data-cookie-save]").addEventListener("click", function () {
        saveConsent(analyticsCheckbox && analyticsCheckbox.checked);
      });
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest ? event.target.closest("[data-cookie-preferences]") : null;
      var currentConsent;

      if (!trigger) {
        return;
      }

      event.preventDefault();
      buildPanel();
      currentConsent = readConsent();

      if (analyticsCheckbox) {
        analyticsCheckbox.checked = !!(currentConsent && currentConsent.analytics);
      }

      showSettings(true);
      openPanel();
    });

    buildPanel();

    if (readConsent()) {
      applyConsent(readConsent());
      showPreferenceButton();
    } else {
      window.setTimeout(openPanel, 600);
    }
  }

  function initLegalFooterLinks() {
    var footers = document.querySelectorAll("footer");

    footers.forEach(function (footer) {
      var nav;

      if (footer.querySelector("[data-legal-links]")) {
        return;
      }

      nav = document.createElement("nav");
      nav.className = "zen-legal-links";
      nav.setAttribute("data-legal-links", "");
      nav.setAttribute("aria-label", "Linkuri legale");
      nav.innerHTML = [
        '<a href="' + getLocalHref("termeni-si-conditii.html") + '">Termeni și condiții</a>',
        '<a href="' + getLocalHref("politica-confidentialitate.html") + '">Confidențialitate & cookies</a>',
        '<button type="button" data-cookie-preferences>Setări cookies</button>'
      ].join("");

      var credit = footer.querySelector(".footer-webcredit-bar");
      if (credit) {
        footer.insertBefore(nav, credit);
      } else {
        footer.appendChild(nav);
      }
    });
  }

  function initPromoBump() {
    var promotions = [
      {
        badge: "Acces privilegiat",
        amount: "VIP",
        amountLabel: "card",
        title: "Devino membru ZEN VIP",
        text: "Cardul VIP se acorda DOAR dupa o procedura efectuata la ZEN Clinics. Consultatia simpla nu activeaza cardul.",
        cta: "Vezi conditia VIP →",
        kind: "vip",
        href: "card-loialitate.html#activare"
      },
      {
        badge: "Doar luna aceasta",
        amount: "GRATIS",
        amountLabel: "consultații",
        title: "Consultații gratuite luna aceasta",
        text: "Programează o consultație în această lună și evaluarea inițială este gratuită, în limita locurilor disponibile.",
        cta: "Programează gratuit →",
        kind: "offer",
        href: "contact.html#formular"
      },
      {
        badge: "Ofertă estetică",
        amount: "-10%",
        amountLabel: "reducere",
        title: "Acid hialuronic & Botox",
        text: "Reducere dedicata pacientilor cu ZEN VIP Card activat dupa procedura efectuata, confirmata in clinica.",
        cta: "Solicită oferta →",
        href: "sections/estompare-riduri.html"
      },
      {
        badge: "Proceduri selectate",
        amount: "-7%",
        amountLabel: "reducere",
        title: "Blefaroplastie și intervenții locale",
        text: "Beneficiu VIP dupa activarea cardului in urma unei proceduri efectuate, in functie de indicatie.",
        cta: "Vezi blefaroplastie \u2192",
        href: "sections/blefaroplastie.html"
      },
      {
        badge: "Chirurgie estetică",
        amount: "-5%",
        amountLabel: "reducere",
        title: "Implant mamar",
        text: "Avantaj VIP dupa activarea cardului in urma unei proceduri efectuate, stabilit individual.",
        cta: "Vezi implant mamar \u2192",
        href: "sections/implanturi-cu-silicon.html"
      }
    ];

    var socialPromoMeta = {
      instagram: {
        title: "ZEN Clinics pe Instagram",
        text: "Fotografii, transformări și momente din clinică, direct pe Instagram.",
        cta: "Deschide Instagram →"
      },
      facebook: {
        title: "ZEN Clinics pe Facebook",
        text: "Noutăți, campanii și informații utile pe pagina de Facebook.",
        cta: "Deschide Facebook →"
      },
      tiktok: {
        title: "ZEN Clinics pe TikTok",
        text: "Clipuri din clinică, rezultate reale și noutăți, pe TikTok.",
        cta: "Deschide TikTok →"
      }
    };

    getSocialLinks().forEach(function (item) {
      var meta = socialPromoMeta[item.key];

      if (meta && item.href) {
        promotions.push({
          kind: "social",
          key: item.key,
          badge: "Urmărește-ne",
          title: meta.title,
          text: meta.text,
          cta: meta.cta,
          href: item.href
        });
      }
    });

    var STORAGE_KEY = "zen-promo-bump-next-index";
    var INITIAL_DELAY = 12000;
    var REOPEN_DELAY = 40000;
    var POST_CLOSE_DELAY = 28000;
    var SCROLL_IDLE_DELAY = 900;
    var panel;
    var closeButton;
    var bodyLink;
    var visual;
    var badge;
    var amount;
    var amountLabel;
    var title;
    var text;
    var activeIndex = 0;
    var timer = 0;
    var scrollIdleTimer = 0;
    var hasShownPromo = false;

    if (!document.body || document.querySelector("[data-promo-bump]") || /login-owner/i.test(window.location.pathname)) {
      return;
    }

    panel = document.createElement("aside");
    panel.className = "zen-promo-bump is-hidden";
    panel.setAttribute("data-promo-bump", "");
    panel.setAttribute("aria-label", "Promoții ZEN Clinics");
    panel.hidden = true;
    panel.innerHTML = [
      '<button class="zen-promo-bump__close" type="button" aria-label="Închide promoția">×</button>',
      '<a class="zen-promo-bump__body" href="#">',
      '<span class="zen-promo-bump__badge"></span>',
      '<span class="zen-promo-bump__visual" aria-hidden="true"></span>',
      '<strong class="zen-promo-bump__deal"><span class="zen-promo-bump__amount"></span><small class="zen-promo-bump__amount-label"></small></strong>',
      '<p class="zen-promo-bump__title"></p>',
      '<em class="zen-promo-bump__text"></em>',
      '<span class="zen-promo-bump__cta">Solicită oferta →</span>',
      '</a>'
    ].join("");

    document.body.appendChild(panel);

    closeButton = panel.querySelector(".zen-promo-bump__close");
    bodyLink = panel.querySelector(".zen-promo-bump__body");
    visual = panel.querySelector(".zen-promo-bump__visual");
    badge = panel.querySelector(".zen-promo-bump__badge");
    amount = panel.querySelector(".zen-promo-bump__amount");
    amountLabel = panel.querySelector(".zen-promo-bump__amount-label");
    title = panel.querySelector(".zen-promo-bump__title");
    text = panel.querySelector(".zen-promo-bump__text");

    function renderPromo(index) {
      var promo = promotions[index % promotions.length];

      activeIndex = index % promotions.length;
      panel.classList.remove(
        "zen-promo-bump--vip",
        "zen-promo-bump--offer",
        "zen-promo-bump--social",
        "zen-promo-bump--instagram",
        "zen-promo-bump--facebook",
        "zen-promo-bump--tiktok"
      );
      badge.textContent = promo.badge;
      title.textContent = promo.title;
      text.textContent = promo.text;
      panel.querySelector(".zen-promo-bump__cta").textContent = promo.cta || "Solicită oferta →";

      if (promo.kind === "social") {
        panel.classList.add("zen-promo-bump--social", "zen-promo-bump--" + promo.key);
        amount.textContent = "";
        amountLabel.textContent = "";
        bodyLink.href = promo.href;
        bodyLink.target = "_blank";
        bodyLink.rel = "noopener";
        visual.innerHTML = '<span class="zen-promo-bump__social-icon">' + getSocialIcon(promo.key) + "</span>";
      } else {
        if (promo.kind === "vip") {
          panel.classList.add("zen-promo-bump--vip");
        }
        if (promo.kind === "offer") {
          panel.classList.add("zen-promo-bump--offer");
        }
        amount.textContent = promo.amount;
        amountLabel.textContent = promo.amountLabel || "reducere";
        bodyLink.href = getLocalHref(promo.href);
        bodyLink.removeAttribute("target");
        bodyLink.removeAttribute("rel");
        visual.innerHTML = promo.kind === "vip"
          ? '<span class="zen-promo-bump__vip-card"><img src="' + getLocalHref("assets/optimized/card-1000.jpg") + '" alt="" loading="lazy" decoding="async"><span>VIP CARD</span><strong>ZEN</strong><em>CLINICS</em></span>'
          : "";
      }
    }

    function getNextIndex() {
      var stored = 0;

      try {
        stored = Number(window.localStorage && window.localStorage.getItem(STORAGE_KEY)) || 0;
        if (window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, String((stored + 1) % promotions.length));
        }
      } catch (error) {
        stored = Math.floor(Date.now() / 1000);
      }

      return stored % promotions.length;
    }

    function isPromoBlocked() {
      return (header && header.classList.contains("menu-open")) ||
        document.body.classList.contains("has-cookie-consent-open");
    }

    function hidePromo() {
      panel.classList.add("is-hidden");
      window.clearTimeout(timer);

      window.setTimeout(function () {
        panel.hidden = true;
      }, reduceMotion ? 0 : 260);
    }

    function showPromo(index) {
      window.clearTimeout(timer);

      if (isPromoBlocked()) {
        waitForScrollIdle(index, POST_CLOSE_DELAY);
        return;
      }

      hasShownPromo = true;
      renderPromo(index);
      panel.hidden = false;
      window.requestAnimationFrame(function () {
        panel.classList.remove("is-hidden");
      });
    }

    function startPromoCountdown(index, delay) {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        showPromo(index);
      }, reduceMotion ? Math.min(delay, 1200) : delay);
    }

    function waitForScrollIdle(index, delay) {
      window.clearTimeout(timer);
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(function () {
        startPromoCountdown(index, delay);
      }, SCROLL_IDLE_DELAY);
    }

    closeButton.addEventListener("click", function () {
      var nextIndex = activeIndex + 1;

      hidePromo();
      waitForScrollIdle(nextIndex, POST_CLOSE_DELAY);
    });

    window.addEventListener("scroll", function () {
      if (!panel.hidden && !panel.classList.contains("is-hidden")) {
        hidePromo();
      }

      waitForScrollIdle(activeIndex + 1, hasShownPromo ? REOPEN_DELAY : INITIAL_DELAY);
    }, { passive: true });

    document.addEventListener("zen:menu-state", function (event) {
      if (event.detail && event.detail.open) {
        hidePromo();
      } else {
        waitForScrollIdle(activeIndex + 1, hasShownPromo ? REOPEN_DELAY : INITIAL_DELAY);
      }
    });

    waitForScrollIdle(getNextIndex(), INITIAL_DELAY);
  }

  function setPlainNavLink(link, href, label) {
    if (!link) {
      return;
    }

    link.setAttribute("href", getLocalHref(href));
    link.textContent = label;
  }

  function isIndexPage() {
    var fileName = window.location.pathname.split("/").pop().toLowerCase();
    return !fileName || fileName === "index.html";
  }

  function getPlainMegaDestination(label) {
    switch (label) {
      case "despre noi":
        return { href: "despre-noi.html", text: "Despre noi" };
      case "proceduri":
        return { href: "proceduri.html", text: "Proceduri" };
      case "medicina estetica":
      case "chirurgie estetica":
        return { href: "chirurgie-estetica.html", text: "Chirurgie estetică" };
      case "chirurgie generala":
        return { href: "chirurgie-generala.html", text: "Chirurgie generală" };
      case "estetica ginecologica":
        return { href: "sections/labioplastie.html", text: "Estetică ginecologică" };
      case "dermatologie estetica":
        return { href: "sections/laser-co2.html", text: "Dermatologie estetică" };
      case "cosmetologie":
        return { href: "cosmetologie.html", text: "Cosmetologie" };
      case "preturi":
        return { href: "preturi-rate.html", text: "Prețuri" };
      default:
        return null;
    }
  }

  function buildAestheticSurgeryLinks(panel) {
    if (!panel) {
      return;
    }

    panel.classList.add("zen-mega-menu", "zen-mega-menu--compact");
    panel.innerHTML = [
      '<a href="' + getLocalHref("index.html") + '"><strong>Pagina principală</strong><small>Față, sân și corp într-un cadru estetic</small></a>',
      '<a href="' + getLocalHref("chirurgie-estetica.html#fata") + '"><strong>Chirurgia feței</strong><small>Evaluare și plan personalizat</small></a>',
      '<a href="' + getLocalHref("chirurgie-estetica.html#san") + '"><strong>Chirurgia oncologică</strong><small>Volum, poziție și proporții</small></a>',
      '<a href="' + getLocalHref("chirurgie-estetica.html#corp") + '"><strong>Chirurgia corpului</strong><small>Contur corporal discutat medical</small></a>',
      '<a href="' + getLocalHref("chirurgie-estetica.html#minim-invazive") + '"><strong>Minim invazive</strong><small>Injectări și proceduri de cabinet</small></a>'
    ].join("");
  }

  function buildGeneralSurgeryLinks(panel) {
    if (!panel) {
      return;
    }

    panel.classList.add("zen-mega-menu", "zen-mega-menu--compact");
    panel.classList.remove("general-surgery-menu");
    panel.innerHTML = [
      '<a href="' + getLocalHref("index.html") + '"><strong>Pagina principală</strong><small>Chirurgie generală explicată clar</small></a>',
      '<a href="' + getLocalHref("chirurgie-generala.html#cabinet") + '"><strong>Proceduri de cabinet</strong><small>Gesturi medicale cu traumă redusă</small></a>',
      '<a href="' + getLocalHref("chirurgie-generala.html#chirurgie") + '"><strong>Chirurgie</strong><small>Intervenții și direcții chirurgicale</small></a>'
    ].join("");
  }

  function replaceMegaItemWithLink(item, href, label) {
    var link;

    if (!item || !item.parentNode) {
      return;
    }

    link = document.createElement("a");
    link.href = getLocalHref(href);
    link.textContent = label;
    item.parentNode.replaceChild(link, item);
  }

  function replacePlainLinkWithMegaItem(link) {
    var item;
    var button;
    var panel;
    var id;

    if (!link || !link.parentNode) {
      return;
    }

    id = "menu-chirurgie-generala-" + Math.random().toString(36).slice(2, 8);
    item = document.createElement("div");
    item.className = "mega-item";
    item.setAttribute("data-mega-item", "");

    button = document.createElement("button");
    button.className = "mega-toggle";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", id);
    button.setAttribute("data-mega-toggle", "");
    button.textContent = "Chirurgie generală";

    panel = document.createElement("div");
    panel.className = "mega-panel";
    panel.id = id;
    panel.setAttribute("data-mega-menu", "");
    buildGeneralSurgeryLinks(panel);

    item.appendChild(button);
    item.appendChild(panel);
    link.parentNode.replaceChild(item, link);
  }

  function ensureOrlLink(nav) {
    var link;
    var contactLink;
    var ctaLink;

    if (!nav || nav.querySelector("a[href$='orl.html'], a[href='../orl.html']")) {
      return;
    }

    link = document.createElement("a");
    link.href = getLocalHref("orl.html");
    link.textContent = "O.R.L";

    contactLink = Array.prototype.find.call(nav.querySelectorAll("a"), function (anchor) {
      return normalizeText(anchor.textContent) === "contact";
    });
    ctaLink = nav.querySelector(".mobile-cta");

    if (contactLink && contactLink.parentNode === nav) {
      nav.insertBefore(link, contactLink);
    } else if (ctaLink && ctaLink.parentNode === nav) {
      nav.insertBefore(link, ctaLink);
    } else {
      nav.appendChild(link);
    }
  }

  function normalizeNavigationTaxonomy() {
    var navContainers = document.querySelectorAll(".zen-main-nav__inner, .lux-primary-nav__inner, .zen-mobile-menu nav, .lux-mobile__panel, .desktop-nav, .mobile-menu-panel");
    var desktopNavContainers = document.querySelectorAll(".zen-main-nav__inner, .lux-primary-nav__inner, .desktop-nav");
    var allowDropdowns = isIndexPage();

    document.querySelectorAll(".mega-item").forEach(function (item) {
      var button = item.querySelector(".mega-toggle");
      var panel = item.querySelector(".mega-panel");
      var label = normalizeText(button ? button.textContent : "");
      var destination = getPlainMegaDestination(label);

      if (!allowDropdowns) {
        if (destination) {
          replaceMegaItemWithLink(item, destination.href, destination.text);
        }
        return;
      }

      if (label === "medicina estetica") {
        button.textContent = "Chirurgie estetică";
        buildAestheticSurgeryLinks(panel);
      }

      if (label === "chirurgie generala") {
        button.textContent = "Chirurgie generală";
        buildGeneralSurgeryLinks(panel);
      }
    });

    document.querySelectorAll("a[href]").forEach(function (link) {
      var label = normalizeText(link.textContent);
      var href = link.getAttribute("href") || "";

      if (label === "medicina estetica") {
        setPlainNavLink(link, "chirurgie-estetica.html", "Chirurgie estetică");
      } else if (label === "chirurgie estetica" && href.indexOf("medicina-estetica.html") >= 0) {
        link.setAttribute("href", getLocalHref("chirurgie-estetica.html"));
      } else if (label === "chirurgie generala" && href.indexOf("chirurgie-estetica.html") >= 0) {
        link.setAttribute("href", getLocalHref("chirurgie-generala.html"));
      }
    });

    if (allowDropdowns) {
      desktopNavContainers.forEach(function (nav) {
        Array.prototype.slice.call(nav.children).forEach(function (child) {
          if (child.tagName === "A" && normalizeText(child.textContent) === "chirurgie generala") {
            replacePlainLinkWithMegaItem(child);
          }
        });
      });
    }

    navContainers.forEach(ensureOrlLink);
  }

  normalizeNavigationTaxonomy();
  enrichBookingLinks();
  initSocialLinks();
  initBnrRates();
  initLegalFooterLinks();
  initCookieConsent();
  initPromoBump();
  initMiniContact();

  function initMiniContact() {
    var form = document.querySelector("[data-mini-contact]");
    var WHATSAPP_NUMBER = "40720558515";
    var EMAIL = "office@zenclinics.ro";

    if (!form) {
      return;
    }

    form.addEventListener("submit", function (event) {
      var nameField = form.querySelector("[data-mini-name]");
      var messageField = form.querySelector("[data-mini-message]");
      var channelField = form.querySelector("[data-mini-channel]:checked");
      var name = nameField ? nameField.value.trim() : "";
      var message = messageField ? messageField.value.trim() : "";
      var channel = channelField ? channelField.value : "whatsapp";
      var intro = "Bună ziua! Sunt " + (name || "[numele tău]") + " și aș dori o programare la ZEN Clinics.";
      var fullMessage = message ? intro + "\n\n" + message : intro;

      event.preventDefault();

      if (channel === "email") {
        window.location.href = "mailto:" + EMAIL +
          "?subject=" + encodeURIComponent("Solicitare programare ZEN Clinics") +
          "&body=" + encodeURIComponent(fullMessage);
      } else {
        window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(fullMessage), "_blank", "noopener");
      }
    });
  }

  function getFieldLabel(field) {
    var label = field.closest("label");
    var labelText = label ? label.querySelector("span") : null;

    if (labelText && labelText.textContent.trim()) {
      return labelText.textContent.trim();
    }

    return (field.name || "Câmp").replace(/[_-]+/g, " ");
  }

  function getFieldValue(field) {
    if (field.type === "checkbox") {
      return field.checked ? "Da" : "";
    }

    if (field.tagName === "SELECT") {
      return field.options[field.selectedIndex] ? field.options[field.selectedIndex].textContent.trim() : field.value.trim();
    }

    return String(field.value || "").trim();
  }

  function collectFormPayload(form, type) {
    var payload = {
      type: type || "contact",
      page: window.location.href,
      submittedAt: new Date().toISOString(),
      fields: {}
    };

    Array.prototype.forEach.call(form.elements, function (field) {
      var value;

      if (!field.name && field.type !== "checkbox") {
        return;
      }

      if (field.type === "submit" || field.type === "button" || field.type === "reset") {
        return;
      }

      value = getFieldValue(field);

      if (!value) {
        return;
      }

      payload.fields[field.name || getFieldLabel(field)] = value;
    });

    return payload;
  }

  function buildFormMessage(form, subject) {
    var lines = [subject, ""];

    Array.prototype.forEach.call(form.elements, function (field) {
      var value;

      if (!field.name && field.type !== "checkbox") {
        return;
      }

      if (field.type === "submit" || field.type === "button" || field.type === "reset") {
        return;
      }

      value = getFieldValue(field);

      if (!value) {
        return;
      }

      lines.push(getFieldLabel(field) + ": " + value);
    });

    lines.push("");
    lines.push("Pagina: " + window.location.href);

    return lines.join("\n");
  }

  function getFunctionUrl(functionName) {
    var baseUrl = (zenConfig.supabaseFunctionsUrl || "").replace(/\/+$/, "");

    return baseUrl ? baseUrl + "/" + functionName : "";
  }

  function loadTurnstile() {
    var script;

    if (!zenConfig.turnstileSiteKey) {
      return Promise.resolve(false);
    }

    if (window.turnstile) {
      return Promise.resolve(true);
    }

    if (turnstileReady) {
      return turnstileReady;
    }

    turnstileReady = new Promise(function (resolve, reject) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = function () {
        resolve(true);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return turnstileReady;
  }

  function setupTurnstile(form) {
    var slot;
    var tokenInput;

    if (!zenConfig.turnstileSiteKey || form.querySelector("[name='turnstileToken']")) {
      return;
    }

    slot = document.createElement("div");
    slot.className = "zen-turnstile";
    tokenInput = document.createElement("input");
    tokenInput.type = "hidden";
    tokenInput.name = "turnstileToken";

    form.appendChild(slot);
    form.appendChild(tokenInput);

    loadTurnstile().then(function () {
      if (!window.turnstile) {
        return;
      }

      window.turnstile.render(slot, {
        sitekey: zenConfig.turnstileSiteKey,
        callback: function (token) {
          tokenInput.value = token;
        },
        "expired-callback": function () {
          tokenInput.value = "";
        }
      });
    }).catch(function () {
      // If Turnstile cannot load, the Edge Function still rejects missing tokens.
    });
  }

  function submitSecureForm(functionName, payload) {
    var endpoint = getFunctionUrl(functionName);

    if (!endpoint) {
      return Promise.resolve({ skipped: true });
    }

    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Request failed");
      }

      return response.json().catch(function () {
        return {};
      });
    });
  }

  function getSupabaseTableUrl(tableName) {
    var baseUrl = (zenConfig.supabaseUrl || "").replace(/\/+$/, "");

    return baseUrl ? baseUrl + "/rest/v1/" + tableName : "";
  }

  function submitSupabaseInsert(tableName, payload) {
    var endpoint = getSupabaseTableUrl(tableName);
    var anonKey = zenConfig.supabaseAnonKey || "";

    if (!endpoint || !anonKey) {
      return Promise.resolve({ skipped: true });
    }

    return fetch(endpoint, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Authorization": "Bearer " + anonKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) {
        return response.text().then(function (text) {
          throw new Error(text || "Supabase insert failed");
        });
      }

      return { ok: true };
    });
  }

  function getFormDataValue(formData, names) {
    var index;
    var value;

    for (index = 0; index < names.length; index += 1) {
      value = formData.get(names[index]);

      if (value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }

    return "";
  }

  function collectAppointmentPayload(form) {
    var formData = new FormData(form);
    var age = getFormDataValue(formData, ["age"]);

    return {
      full_name: getFormDataValue(formData, ["full_name", "name"]),
      phone: getFormDataValue(formData, ["phone", "telefon"]),
      age: age ? Number(age) : null,
      email: getFormDataValue(formData, ["email"]) || null,
      branch: getFormDataValue(formData, ["branch"]) || null,
      procedure: getFormDataValue(formData, ["procedure"]) || null,
      contact_method: getFormDataValue(formData, ["contact_method"]) || null,
      request_type: getFormDataValue(formData, ["request_type"]) || null,
      message: getFormDataValue(formData, ["message"]) || null
    };
  }

  function collectVipEnrollmentPayload(form) {
    var formData = new FormData(form);

    return {
      email: getFormDataValue(formData, ["email"]),
      full_name: getFormDataValue(formData, ["full_name", "name"]) || null,
      marketing_consent: formData.get("marketing_consent") === "on" || formData.get("consent") === "on"
    };
  }

  function openRequestChannels(subject, message) {
    var email = "office@zenclinics.ro";
    var phone = "40720558515";
    var mailtoUrl = "mailto:" + email + "?subject=" + encodeURIComponent(subject || "Cerere ZEN Clinics") + "&body=" + encodeURIComponent(message || "");
    var whatsappUrl = "https://wa.me/" + phone + "?text=" + encodeURIComponent(message || subject || "Cerere ZEN Clinics");

    window.open(whatsappUrl, "_blank", "noopener");
    window.setTimeout(function () {
      window.location.href = mailtoUrl;
    }, 120);

    return {
      mailto: mailtoUrl,
      whatsapp: whatsappUrl
    };
  }

  function renderRequestLinks(status, links) {
    var text = document.createTextNode("Cererea de programare a fost pregatita. Am deschis canalele rapide: ");
    var whatsappLink = document.createElement("a");
    var separator = document.createTextNode(" | ");
    var emailLink = document.createElement("a");

    status.classList.remove("is-error");
    status.textContent = "";

    whatsappLink.href = links.whatsapp;
    whatsappLink.target = "_blank";
    whatsappLink.rel = "noopener";
    whatsappLink.textContent = "WhatsApp";

    emailLink.href = links.mailto;
    emailLink.textContent = "Email";

    status.appendChild(text);
    status.appendChild(whatsappLink);
    status.appendChild(separator);
    status.appendChild(emailLink);
  }

  function renderVipSuccess(status) {
    status.classList.remove("is-error");
    status.textContent = "Solicitarea pentru ZEN VIP Card a fost trimisa. Emailul automatizat confirma clar: cardul se acorda doar dupa procedura efectuata, nu dupa simpla consultatie.";
  }

  document.querySelectorAll("[data-booking-form]").forEach(function (form) {
    var branchSelect = form.querySelector("[data-branch-select]");

    setupTurnstile(form);
    refreshProcedureOptions(form, true);
    applyBookingPrefill(form);

    if (branchSelect) {
      branchSelect.addEventListener("change", function () {
        refreshProcedureOptions(form, false);
      });
    }

    form.addEventListener("submit", function (event) {
      var status = form.querySelector("[data-form-status]");
      var nameInput = form.querySelector("[name='full_name'], [name='name']");
      var phoneInput = form.querySelector("[name='phone'], [name='telefon']");
      var emailInput = form.querySelector("[name='email']");
      var missingRequired = null;
      var subject = "Cerere programare ZEN Clinics";
      var message;
      var links;
      var payload;
      var appointmentPayload;
      var nameValue = nameInput ? nameInput.value.trim() : "";
      var phoneValue = phoneInput ? phoneInput.value.trim() : "";
      var emailValue = emailInput ? emailInput.value.trim() : "";
      var phoneDigits = phoneValue.replace(/\D/g, "");
      var emailValid = !emailValue || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
      var errors = [];

      event.preventDefault();

      if (nameInput && nameValue.length < 2) {
        errors.push("Completează numele.");
      }

      if (phoneInput && phoneDigits.length < 7) {
        errors.push("Completează un număr de telefon valid.");
      }

      if (emailInput && !emailValid) {
        errors.push("Completează o adresă de email validă sau lasă câmpul gol.");
      }

      Array.prototype.some.call(form.querySelectorAll("[required]"), function (field) {
        var isKnownField = field === nameInput || field === phoneInput || field === emailInput;
        var isMissing = field.type === "checkbox" ? !field.checked : !String(field.value || "").trim();

        if (!isKnownField && isMissing) {
          missingRequired = field;
          return true;
        }

        return false;
      });

      if (missingRequired) {
        errors.push("Completează câmpurile obligatorii.");
      }

      if (status) {
        status.classList.toggle("is-error", errors.length > 0);
        status.textContent = errors.length
          ? errors.join(" ")
          : "";
      }

      if (errors.length > 0) {
        if (nameInput && nameValue.length < 2) {
          nameInput.focus();
        } else if (phoneInput && phoneDigits.length < 7) {
          phoneInput.focus();
        } else if (emailInput && !emailValid) {
          emailInput.focus();
        } else if (missingRequired) {
          missingRequired.focus();
        }

        return;
      }

      message = buildFormMessage(form, subject);
      payload = collectFormPayload(form, "contact");
      payload.message = message;
      appointmentPayload = collectAppointmentPayload(form);

      if (status) {
        status.classList.remove("is-error");
        status.textContent = getSupabaseTableUrl("appointments") || getFunctionUrl("submit-contact") ? "Se trimite..." : "";
      }

      submitSupabaseInsert("appointments", appointmentPayload).catch(function () {});

      submitSecureForm("submit-contact", payload).then(function (result) {
        links = openRequestChannels(subject, message);

        if (status) {
          renderRequestLinks(status, links);
        }

        form.reset();
        refreshProcedureOptions(form, false);
      }).catch(function () {
        if (status) {
          status.classList.add("is-error");
          status.textContent = "Trimiterea nu a reușit. Te rugăm încearcă din nou sau contactează-ne telefonic.";
        }
      });
    });
  });

  document.querySelectorAll("[data-privilege-form], [data-vip-form]").forEach(function (form) {
    setupTurnstile(form);

    form.addEventListener("submit", function (event) {
      var status = form.querySelector("[data-privilege-status], [data-vip-status]");
      var subject = "Solicitare ZEN VIP Card";
      var message;
      var payload;
      var vipPayload;

      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      message = buildFormMessage(form, subject);
      payload = collectFormPayload(form, "loyalty");
      payload.message = message;
      vipPayload = collectVipEnrollmentPayload(form);

      if (status) {
        status.classList.remove("is-error");
        status.textContent = "Se trimite...";
      }

      submitSupabaseInsert("vip_card_enrollments", vipPayload).catch(function () {});

      fetch("/api/send-vip-email.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: vipPayload.email, full_name: vipPayload.full_name || "" })
      }).then(function (response) {
        if (!response.ok) {
          return response.json().then(function (body) { throw new Error(body.error || "failed"); });
        }
        return response.json();
      }).then(function () {
        if (status) {
          renderVipSuccess(status);
        }

        form.reset();
      }).catch(function () {
        if (status) {
          status.classList.add("is-error");
          status.textContent = "Trimiterea nu a reușit. Te rugăm încearcă din nou sau contactează-ne telefonic.";
        }
      });
    });
  });

  vipCards.forEach(function (card) {
    function setFlipped(nextState) {
      card.classList.toggle("is-flipped", nextState);
      card.setAttribute("aria-pressed", String(nextState));
    }

    card.addEventListener("click", function () {
      setFlipped(!card.classList.contains("is-flipped"));
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setFlipped(!card.classList.contains("is-flipped"));
      }
    });
  });

  if (floatingContact && floatingToggle) {
    floatingToggle.addEventListener("click", function () {
      var collapsed = floatingContact.classList.toggle("is-collapsed");

      if (!reduceMotion) {
        floatingContact.classList.remove("is-toggling");
        window.requestAnimationFrame(function () {
          floatingContact.classList.add("is-toggling");
          window.setTimeout(function () {
            floatingContact.classList.remove("is-toggling");
          }, 430);
        });
      }

      floatingToggle.setAttribute("aria-expanded", String(!collapsed));
      floatingToggle.setAttribute("aria-label", collapsed ? "Deschide contact rapid" : "Închide contact rapid");
    });
  }

  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth"
      });
    });
  }

  applyStaggerIndexes();
  initSiteIntro();
  initPageRestoreGuards();
  initPageTransitions();

  if (processSection) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      processSection.classList.add("is-process-visible");
    } else {
      var processObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            processSection.classList.add("is-process-visible");
            processObserver.unobserve(processSection);
          }
        });
      }, {
        rootMargin: "0px 0px -22% 0px",
        threshold: 0.22
      });

      processObserver.observe(processSection);
    }
  }

  if (reduceMotion) {
    document.querySelectorAll(revealSelector).forEach(function (element) {
      element.classList.add("is-visible");
    });
  } else if ("IntersectionObserver" in window) {
    window.revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          window.revealObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: "0px 0px 14% 0px",
      threshold: 0.08
    });

    document.querySelectorAll(revealSelector).forEach(function (element) {
      window.revealObserver.observe(element);
    });
  } else {
    document.querySelectorAll(revealSelector).forEach(function (element) {
      element.classList.add("is-visible");
    });
  }

  var scrollTicking = false;
  var resizeTimer = 0;

  function requestScrollUpdate() {
    if (scrollTicking) {
      return;
    }

    scrollTicking = true;
    window.requestAnimationFrame(function () {
      updateHeader();
      scrollTicking = false;
    });
  }

  function requestResizeUpdate() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      updateHeader();
      document.querySelectorAll("[data-faq-panel]").forEach(syncFaqPanelHeight);
    }, 120);
  }

  updateHeader();
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestResizeUpdate);
}());
