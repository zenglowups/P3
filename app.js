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

  if (!scrollProgressBar) {
    scrollProgressBar = document.createElement("div");
    scrollProgressBar.className = "scroll-progress-bar";
    scrollProgressBar.setAttribute("data-scroll-progress", "");
    scrollProgressBar.setAttribute("aria-hidden", "true");
    document.body.appendChild(scrollProgressBar);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeText(value) {
    return (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function renderPriceLists() {
    var dataNode = document.querySelector("[data-price-data]");
    var root = document.querySelector("[data-price-root]");
    var storedData;
    var categories;

    if (!dataNode || !root) {
      return;
    }

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

    if (!Array.isArray(categories)) {
      return;
    }

    categories = categories.filter(function (category) {
      return category && category.id !== "stomatologie";
    });

    root.innerHTML = "";

    categories.forEach(function (category, index) {
      var article = document.createElement("article");
      var head = document.createElement("div");
      var title = document.createElement("h2");
      var count = document.createElement("span");
      var summary = document.createElement("p");
      var list = document.createElement("ul");

      article.className = "price-card reveal-up";
      if (index < 2) {
        article.classList.add("price-card--featured");
      }
      article.id = category.id || "";
      article.setAttribute("data-price-card", "");

      head.className = "price-card__head";
      title.textContent = category.title || "Ramură";
      count.className = "price-card__count";
      count.textContent = (category.items && category.items.length ? category.items.length : 0) + " servicii";
      head.appendChild(title);
      head.appendChild(count);

      summary.textContent = category.summary || "";
      list.className = "price-list";

      (category.items || []).forEach(function (entry) {
        var item = document.createElement("li");
        var name = document.createElement("span");
        var price = document.createElement("strong");

        item.setAttribute("data-price-item", "");
        name.textContent = entry[0] || "";
        price.textContent = entry[1] || "";
        item.appendChild(name);
        item.appendChild(price);
        list.appendChild(item);
      });

      article.appendChild(head);
      article.appendChild(summary);
      article.appendChild(list);
      root.appendChild(article);
    });
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

  function setMenu(open) {
    if (!navToggle || !mobileMenu || !header) {
      return;
    }

    navToggle.setAttribute("aria-expanded", String(open));
    mobileMenu.hidden = !open;
    header.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  }

  function getMegaItem(button) {
    return button.closest("[data-mega-item]") || button.closest(".mega-item");
  }

  function closeMegaMenus(exceptItem) {
    megaToggles.forEach(function (button) {
      var item = getMegaItem(button);

      if (item && item !== exceptItem) {
        item.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
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

      window.setTimeout(function () {
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

  megaToggles.forEach(function (button) {
    button.addEventListener("click", function () {
      var item = getMegaItem(button);
      var isOpen = button.getAttribute("aria-expanded") === "true";

      closeMegaMenus(item);

      if (!item) {
        return;
      }

      item.classList.toggle("is-open", !isOpen);
      button.setAttribute("aria-expanded", String(!isOpen));
    });
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

  renderPriceLists();

  document.querySelectorAll("[data-price-search]").forEach(function (input) {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-price-card]"));
    var searchFrame = 0;
    var searchTimer = 0;

    function filterPrices() {
      var query = normalizeText(input.value.replace(/[<>{}[\]$]/g, "").slice(0, 80));

      cards.forEach(function (card) {
        var items = Array.prototype.slice.call(card.querySelectorAll("[data-price-item]"));
        var visibleItems = 0;

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

  var bookingContextBySlug = {
    "medicina-estetica": { branch: "Medicină estetică", procedure: "Consultație estetică" },
    "cosmetologie": { branch: "Cosmetologie", procedure: "Consultație cosmetologie" },
    "chirurgie-estetica": { branch: "Chirurgie generală", procedure: "Consultație chirurgie" },
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
    "rinoplastie": { branch: "Chirurgie generală", procedure: "Rinoplastie" },
    "rinoplastie-ultrasonica": { branch: "Chirurgie generală", procedure: "Rinoplastie ultrasonică" },
    "blefaroplastie": { branch: "Chirurgie generală", procedure: "Blefaroplastie" },
    "lifting-facial": { branch: "Chirurgie generală", procedure: "Lifting facial" },
    "otoplastie": { branch: "Chirurgie generală", procedure: "Otoplastie" },
    "bichectomie": { branch: "Chirurgie generală", procedure: "Bichectomie" },
    "urechi-despicate": { branch: "Chirurgie generală", procedure: "Otoplastie" },
    "implanturi-cu-silicon": { branch: "Chirurgie generală", procedure: "Implant mamar" },
    "ridicare-sani": { branch: "Chirurgie generală", procedure: "Ridicare sâni" },
    "micsorare-sani": { branch: "Chirurgie generală", procedure: "Micșorare sâni" },
    "ginecomastie": { branch: "Chirurgie generală", procedure: "Ginecomastie" },
    "liposuctie": { branch: "Chirurgie generală", procedure: "Liposucție" },
    "liposuctie-dame": { branch: "Chirurgie generală", procedure: "Liposucție" },
    "liposuctie-cervicala-barbati": { branch: "Chirurgie generală", procedure: "Liposucție cervicală" },
    "liposuctia-cervicala": { branch: "Chirurgie generală", procedure: "Liposucție cervicală" },
    "abdominoplastie-femei": { branch: "Chirurgie generală", procedure: "Abdominoplastie" },
    "abdominoplastie-barbati": { branch: "Chirurgie generală", procedure: "Abdominoplastie" },
    "lifting-brate": { branch: "Chirurgie generală", procedure: "Lifting brațe" },
    "lifting-coapse": { branch: "Chirurgie generală", procedure: "Lifting coapse" },
    "lifting-brazilian": { branch: "Chirurgie generală", procedure: "Lifting brazilian" },
    "remodelare-postnatala": { branch: "Chirurgie generală", procedure: "Remodelare postnatală" },
    "operatie-postbariatrica": { branch: "Chirurgie generală", procedure: "Operație postbariatrică" },
    "diastaza-abdominala": { branch: "Chirurgie generală", procedure: "Diastază abdominală" },
    "micsorare-stomac": { branch: "Chirurgie generală", procedure: "Micșorare stomac" },
    "transplant-de-par-fue-advance": { branch: "Chirurgie generală", procedure: "Consultație chirurgie" },
    "labioplastie": { branch: "Estetică ginecologică", procedure: "Labioplastie" }
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

  enrichBookingLinks();

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
      preferred_date: getFormDataValue(formData, ["preferred_date"]) || null,
      preferred_time: getFormDataValue(formData, ["preferred_time"]) || null,
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
      marketing_consent: formData.get("marketing_consent") === "on"
    };
  }

  function openRequestChannels(subject, message) {
    var email = "office@zenclinics.ro";
    var whatsappPhone = "40720558515";
    var mailtoUrl = "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(message);
    var whatsappUrl = "https://wa.me/" + whatsappPhone + "?text=" + encodeURIComponent(message);

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
    var text = document.createTextNode("Cererea este pregătită pentru WhatsApp și email. Dacă nu s-au deschis automat, folosește linkurile: ");
    var whatsappLink = document.createElement("a");
    var separator = document.createTextNode(" · ");
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

      submitSupabaseInsert("appointments", appointmentPayload).then(function () {
        return submitSecureForm("submit-contact", payload);
      }).then(function () {
        links = openRequestChannels(subject, message);

        if (status) {
          renderRequestLinks(status, links);
        }

        form.reset();
        refreshProcedureOptions(form, false);
      }).catch(function () {
        if (status) {
          status.classList.add("is-error");
          status.textContent = "Trimiterea nu a reusit. Verifica tabela appointments, politica RLS din Supabase sau incearca din nou.";
        }
      });
    });
  });

  document.querySelectorAll("[data-privilege-form], [data-vip-form]").forEach(function (form) {
    setupTurnstile(form);

    form.addEventListener("submit", function (event) {
      var status = form.querySelector("[data-privilege-status], [data-vip-status]");
      var links;
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
        status.textContent = getSupabaseTableUrl("vip_card_enrollments") || getFunctionUrl("submit-loyalty") ? "Se trimite..." : "";
      }

      submitSupabaseInsert("vip_card_enrollments", vipPayload).then(function () {
        return submitSecureForm("submit-loyalty", payload);
      }).then(function () {
        links = openRequestChannels(subject, message);

        if (status) {
          renderRequestLinks(status, links);
        }

        form.reset();
      }).catch(function () {
        if (status) {
          status.classList.add("is-error");
          status.textContent = "Trimiterea nu a reusit. Verifica tabela vip_card_enrollments, politica RLS din Supabase sau incearca din nou.";
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
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12
    });

    document.querySelectorAll(revealSelector).forEach(function (element) {
      observer.observe(element);
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
