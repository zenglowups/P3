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
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealSelector = ".reveal, .reveal-up, .reveal-scale, .stagger-item, .zen-hero-benefits a, .zen-about-story__features article, .lux-procedure-list a, .lux-location__cards article, .lux-minimal__portrait, .lux-map-actions a";

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
    var categories;

    if (!dataNode || !root) {
      return;
    }

    try {
      categories = JSON.parse(dataNode.textContent);
    } catch (error) {
      root.textContent = "Lista de prețuri nu a putut fi încărcată.";
      return;
    }

    if (!Array.isArray(categories)) {
      return;
    }

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

    if (!zenWhySection) {
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
    var seenIntro = false;

    if (!document.body.classList.contains("home-page") || reduceMotion) {
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
    intro.className = "site-intro";
    intro.setAttribute("aria-hidden", "true");
    intro.innerHTML = '<div class="site-intro__content"><span class="site-intro__mark"></span><span class="site-intro__title">ZEN Clinics</span><span class="site-intro__caption">Medical aesthetics with discretion</span></div>';
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

  document.querySelectorAll("[data-faq-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var item = button.closest("[data-faq-item]");
      var panel = item ? item.querySelector("[data-faq-panel]") : null;
      var isOpen = button.getAttribute("aria-expanded") === "true";

      if (!panel) {
        return;
      }

      button.setAttribute("aria-expanded", String(!isOpen));
      panel.hidden = isOpen;
      item.classList.toggle("is-open", !isOpen);
    });
  });

  renderPriceLists();

  document.querySelectorAll("[data-price-search]").forEach(function (input) {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-price-card]"));

    input.addEventListener("input", function () {
      var query = normalizeText(input.value);

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
    });
  });

  document.querySelectorAll("[data-booking-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      var status = form.querySelector("[data-form-status]");
      var nameInput = form.querySelector("[name='full_name'], [name='name']");
      var phoneInput = form.querySelector("[name='phone'], [name='telefon']");
      var emailInput = form.querySelector("[name='email']");
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

      if (status) {
        status.classList.toggle("is-error", errors.length > 0);
        status.textContent = errors.length
          ? errors.join(" ")
          : "Solicitarea a fost pregătită. Echipa ZEN Clinics va putea primi aceste date după conectarea formularului la backend.";
      }

      if (errors.length > 0) {
        if (nameInput && nameValue.length < 2) {
          nameInput.focus();
        } else if (phoneInput && phoneDigits.length < 7) {
          phoneInput.focus();
        } else if (emailInput && !emailValid) {
          emailInput.focus();
        }

        return;
      }

      form.reset();
    });
  });

  document.querySelectorAll("[data-privilege-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      var status = form.querySelector("[data-privilege-status]");

      event.preventDefault();

      if (status) {
        status.textContent = "Cererea ta a fost înregistrată local. Conectează formularul la backend pentru trimitere reală.";
      }
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

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", updateHeader);
}());
