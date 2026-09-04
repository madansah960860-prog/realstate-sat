/* ==========================================================================
   Meridian Shore Realty — shared behaviour
   Vanilla JavaScript. No frameworks, no build step, no third-party requests.

   Modules
   01. Boot flags and small helpers
   02. Sticky header shadow (IntersectionObserver, not a scroll listener)
   03. Mobile menu (focus trap, Escape to close, restores focus)
   04. Section reveal on entry (progressive enhancement, never hides content)
   05. Accordions (FAQ and elsewhere)
   06. Property gallery (keyboard-navigable arrows and thumbnails)
   07. Property filters (price, beds, type, community, state)
   08. Saved-property list (localStorage, essential storage only)
   09. Mortgage estimator (clearly labelled as an estimate)
   10. Form validation with inline errors and a real success state
   11. Cookie consent (no non-essential storage before consent)
   12. Back-to-top
   13. Toast messages

   Cookie / storage policy note for maintainers:
   The only browser storage used before consent is `msr-consent` and
   `msr-saved-properties`. Both are strictly necessary to operate features the
   visitor asked for, and neither is used for advertising or cross-site
   tracking. Analytics and advertising tags must be initialised inside
   `initOptionalScripts()` below, which only runs after an explicit opt-in.
   ========================================================================== */

(function () {
  "use strict";

  /* ======================================================================
     01. BOOT FLAGS AND HELPERS
     ====================================================================== */

  document.documentElement.classList.add("js");

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  var prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function safeStorage() {
    try {
      var t = "__msr__";
      window.localStorage.setItem(t, t);
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }
  var store = safeStorage();

  function usd(n) {
    return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }


  /* ======================================================================
     02. STICKY HEADER SHADOW
     ====================================================================== */

  (function stickyHeader() {
    var header = $(".site-header");
    if (!header || !("IntersectionObserver" in window)) return;

    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;";
    document.body.insertBefore(sentinel, document.body.firstChild);

    new IntersectionObserver(function (entries) {
      header.classList.toggle("is-scrolled", !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  })();


  /* ======================================================================
     03. MOBILE MENU
     ====================================================================== */

  (function mobileMenu() {
    var toggle = $(".nav-toggle");
    var menu = $("#mobile-menu");
    if (!toggle || !menu) return;

    var closeBtn = $(".mobile-menu__close", menu);
    var lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      menu.classList.add("is-open");
      document.body.classList.add("menu-open");
      toggle.setAttribute("aria-expanded", "true");
      var first = $(FOCUSABLE, menu);
      if (first) first.focus();
      document.addEventListener("keydown", onKeydown);
    }

    function close() {
      menu.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function onKeydown(e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;

      var items = $$(FOCUSABLE, menu).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    toggle.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) { close(); } else { open(); }
    });
    if (closeBtn) closeBtn.addEventListener("click", close);

    // Close the drawer when the viewport reaches the desktop nav breakpoint
    if (window.matchMedia) {
      var mq = window.matchMedia("(min-width: 1024px)");
      var onChange = function (ev) { if (ev.matches) close(); };
      if (mq.addEventListener) { mq.addEventListener("change", onChange); }
      else if (mq.addListener) { mq.addListener(onChange); }
    }
  })();


  /* ======================================================================
     04. SECTION REVEAL
     ====================================================================== */

  (function reveal() {
    var items = $$(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    items.forEach(function (el) { io.observe(el); });

    // Safety net: if anything is still hidden after 2.5s, show it.
    window.setTimeout(function () {
      items.forEach(function (el) { el.classList.add("is-in"); });
    }, 2500);
  })();


  /* ======================================================================
     05. ACCORDIONS
     ====================================================================== */

  (function accordions() {
    $$(".accordion__trigger").forEach(function (trigger) {
      var panel = document.getElementById(trigger.getAttribute("aria-controls"));
      if (!panel) return;

      trigger.addEventListener("click", function () {
        var expanded = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!expanded));
        panel.setAttribute("data-open", String(!expanded));
      });
    });
  })();


  /* ======================================================================
     06. PROPERTY GALLERY
     ====================================================================== */

  (function galleries() {
    $$("[data-gallery]").forEach(function (root) {
      var stageImg = $("[data-gallery-image]", root);
      var caption = $("[data-gallery-caption]", root);
      var counter = $("[data-gallery-counter]", root);
      var prev = $("[data-gallery-prev]", root);
      var next = $("[data-gallery-next]", root);
      var thumbs = $$("[data-gallery-thumb]", root);
      if (!stageImg || !thumbs.length) return;

      var index = 0;

      function show(i) {
        index = (i + thumbs.length) % thumbs.length;
        var btn = thumbs[index];
        var full = btn.getAttribute("data-full");
        var alt = btn.getAttribute("data-alt") || "";
        var cap = btn.getAttribute("data-caption") || "";

        stageImg.setAttribute("src", full);
        stageImg.setAttribute("alt", alt);
        if (caption) caption.textContent = cap;
        if (counter) counter.textContent = (index + 1) + " of " + thumbs.length;

        thumbs.forEach(function (t, ti) {
          t.setAttribute("aria-current", ti === index ? "true" : "false");
        });
      }

      thumbs.forEach(function (t, ti) {
        t.addEventListener("click", function () { show(ti); });
      });
      if (prev) prev.addEventListener("click", function () { show(index - 1); });
      if (next) next.addEventListener("click", function () { show(index + 1); });

      // Left / right arrow keys operate the gallery when focus is inside it
      root.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
      });

      show(0);
    });
  })();


  /* ======================================================================
     07. PROPERTY FILTERS
     ====================================================================== */

  (function filters() {
    var form = $("#property-filters");
    var list = $("#property-results");
    if (!form || !list) return;

    var cards = $$("[data-listing]", list);
    var countEl = $("#result-count");
    var emptyEl = $("#result-empty");

    function apply() {
      var maxPrice = form.elements.price.value;
      var minBeds = form.elements.beds.value;
      var type = form.elements.type.value;
      var community = form.elements.community.value;
      var state = form.elements.state.value;
      var visible = 0;

      cards.forEach(function (card) {
        var p = parseInt(card.getAttribute("data-price"), 10);
        var b = parseInt(card.getAttribute("data-beds"), 10);
        var ok = true;

        if (maxPrice && p > parseInt(maxPrice, 10)) ok = false;
        if (minBeds && b < parseInt(minBeds, 10)) ok = false;
        if (type && card.getAttribute("data-type") !== type) ok = false;
        if (community && card.getAttribute("data-community") !== community) ok = false;
        if (state && card.getAttribute("data-state") !== state) ok = false;

        card.hidden = !ok;
        if (ok) visible++;
      });

      if (countEl) {
        countEl.textContent = visible === 1
          ? "1 property matches your filters"
          : visible + " properties match your filters";
      }
      if (emptyEl) emptyEl.hidden = visible !== 0;
    }

    $$("select, input", form).forEach(function (el) {
      el.addEventListener("change", apply);
    });

    form.addEventListener("submit", function (e) { e.preventDefault(); apply(); });

    var reset = $("#filter-reset", form);
    if (reset) {
      reset.addEventListener("click", function () {
        form.reset();
        apply();
      });
    }

    apply();
  })();


  /* ======================================================================
     08. SAVED-PROPERTY LIST
     ====================================================================== */

  var SAVED_KEY = "msr-saved-properties";

  function readSaved() {
    if (!store) return [];
    try { return JSON.parse(store.getItem(SAVED_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function writeSaved(list) {
    if (!store) return;
    try { store.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) { /* quota */ }
  }

  (function savedProperties() {
    var buttons = $$("[data-save-property]");
    var panel = $("#saved-panel");
    var panelList = $("#saved-list");
    var panelEmpty = $("#saved-empty");

    function label(btn, isSaved) {
      var name = btn.getAttribute("data-property-name") || "this property";
      btn.setAttribute("aria-pressed", String(isSaved));
      btn.setAttribute("aria-label",
        (isSaved ? "Remove " : "Save ") + name + (isSaved ? " from" : " to") + " your saved list");
      var text = $(".save-btn__text", btn);
      if (text) text.textContent = isSaved ? "Saved" : "Save";
    }

    function renderPanel() {
      if (!panel || !panelList) return;
      var saved = readSaved();
      panelList.innerHTML = "";

      if (!saved.length) {
        if (panelEmpty) panelEmpty.hidden = false;
        return;
      }
      if (panelEmpty) panelEmpty.hidden = true;

      saved.forEach(function (item) {
        var li = document.createElement("li");

        var a = document.createElement("a");
        a.href = item.url;
        a.textContent = item.name;
        li.appendChild(a);

        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "save-btn";
        remove.setAttribute("aria-pressed", "true");
        remove.setAttribute("aria-label", "Remove " + item.name + " from your saved list");
        remove.appendChild(document.createTextNode("Remove"));
        remove.addEventListener("click", function () {
          writeSaved(readSaved().filter(function (s) { return s.id !== item.id; }));
          renderPanel();
          syncButtons();
          toast(item.name + " removed from your saved list.");
        });
        li.appendChild(remove);

        panelList.appendChild(li);
      });
    }

    function syncButtons() {
      var ids = readSaved().map(function (s) { return s.id; });
      buttons.forEach(function (btn) {
        label(btn, ids.indexOf(btn.getAttribute("data-save-property")) > -1);
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-save-property");
        var name = btn.getAttribute("data-property-name") || id;
        var url = btn.getAttribute("data-property-url") || "#";
        var saved = readSaved();
        var exists = saved.some(function (s) { return s.id === id; });

        if (exists) {
          writeSaved(saved.filter(function (s) { return s.id !== id; }));
          toast(name + " removed from your saved list.");
        } else {
          saved.push({ id: id, name: name, url: url });
          writeSaved(saved);
          toast(name + " added to your saved list.");
        }
        syncButtons();
        renderPanel();
      });
    });

    syncButtons();
    renderPanel();
  })();


  /* ======================================================================
     09. MORTGAGE ESTIMATOR
     ====================================================================== */

  (function estimator() {
    var form = $("#estimator-form");
    if (!form) return;

    var out = $("#estimator-output");
    var breakdown = $("#estimator-breakdown");

    function calc() {
      var price = parseFloat(form.elements.price.value) || 0;
      var downPct = parseFloat(form.elements.down.value) || 0;
      var rate = parseFloat(form.elements.rate.value) || 0;
      var years = parseFloat(form.elements.term.value) || 30;
      var taxPct = parseFloat(form.elements.tax.value) || 0;
      var hoaMonthly = parseFloat(form.elements.hoa.value) || 0;
      var insMonthly = parseFloat(form.elements.insurance.value) || 0;

      var principal = price * (1 - downPct / 100);
      var monthlyRate = rate / 100 / 12;
      var n = years * 12;
      var pi;

      if (monthlyRate === 0) {
        pi = n > 0 ? principal / n : 0;
      } else {
        pi = principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
             (Math.pow(1 + monthlyRate, n) - 1);
      }

      var taxMonthly = (price * (taxPct / 100)) / 12;
      var total = pi + taxMonthly + hoaMonthly + insMonthly;

      if (!isFinite(total) || total < 0) total = 0;

      if (out) out.textContent = usd(total) + " per month";
      if (breakdown) {
        breakdown.innerHTML =
          "<li><span class=\"spec-key\">Principal and interest</span><span class=\"spec-val\">" + usd(pi) + "</span></li>" +
          "<li><span class=\"spec-key\">Estimated property tax</span><span class=\"spec-val\">" + usd(taxMonthly) + "</span></li>" +
          "<li><span class=\"spec-key\">HOA or community fee</span><span class=\"spec-val\">" + usd(hoaMonthly) + "</span></li>" +
          "<li><span class=\"spec-key\">Insurance allowance</span><span class=\"spec-val\">" + usd(insMonthly) + "</span></li>" +
          "<li><span class=\"spec-key\">Amount financed</span><span class=\"spec-val\">" + usd(principal) + "</span></li>";
      }
    }

    $$("input, select", form).forEach(function (el) {
      el.addEventListener("input", calc);
      el.addEventListener("change", calc);
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); calc(); });

    calc();
  })();


  /* ======================================================================
     10. FORM VALIDATION
     ====================================================================== */

  (function forms() {
    $$("form[data-validate]").forEach(function (form) {
      var summary = $(".form-summary", form.parentNode) || $(".form-summary", form);
      var summaryList = summary ? $("ul", summary) : null;
      var success = document.getElementById(form.getAttribute("data-success"));

      function fieldWrap(input) {
        return input.closest(".field") || input.closest(".checkbox-row") || input.parentNode;
      }

      function messageFor(input) {
        var name = input.getAttribute("data-label") || input.name || "This field";
        if (input.validity.valueMissing) {
          if (input.type === "checkbox") return "Please tick " + name + " to continue.";
          return "Enter " + name + ".";
        }
        if (input.validity.typeMismatch && input.type === "email") {
          return "Enter an email address in the format name@example.com.";
        }
        if (input.validity.patternMismatch && input.type === "tel") {
          return "Enter a phone number using digits, spaces, brackets, plus or hyphen.";
        }
        if (input.validity.tooShort) {
          return name + " needs at least " + input.minLength + " characters.";
        }
        return "Check " + name + " and try again.";
      }

      function validateField(input) {
        var wrap = fieldWrap(input);
        var errEl = wrap ? wrap.querySelector(".field-error") : null;
        var valid = input.checkValidity();

        if (wrap) wrap.classList.toggle("has-error", !valid);
        input.setAttribute("aria-invalid", valid ? "false" : "true");
        if (errEl) errEl.textContent = valid ? "" : messageFor(input);
        return valid;
      }

      var controls = $$("input, select, textarea", form).filter(function (el) {
        return el.type !== "hidden" && el.type !== "submit";
      });

      controls.forEach(function (input) {
        input.addEventListener("blur", function () { validateField(input); });
        input.addEventListener("change", function () {
          if (fieldWrap(input).classList.contains("has-error")) validateField(input);
        });
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();

        var invalid = controls.filter(function (input) { return !validateField(input); });

        if (invalid.length) {
          if (summary && summaryList) {
            summaryList.innerHTML = "";
            invalid.forEach(function (input) {
              var li = document.createElement("li");
              var a = document.createElement("a");
              if (!input.id) input.id = "field-" + Math.random().toString(36).slice(2, 8);
              a.href = "#" + input.id;
              a.textContent = messageFor(input);
              a.addEventListener("click", function (ev) {
                ev.preventDefault();
                input.focus();
              });
              li.appendChild(a);
              summaryList.appendChild(li);
            });
            summary.classList.add("is-visible");
            summary.setAttribute("tabindex", "-1");
            summary.focus();
          }
          invalid[0].focus();
          return;
        }

        if (summary) summary.classList.remove("is-visible");

        /* No back end is wired up in this static build. When a server or form
           service is connected, POST here and only show the success panel on a
           2xx response. The success copy below tells the visitor exactly who
           will contact them and how to opt out. */
        form.hidden = true;
        if (success) {
          success.classList.add("is-visible");
          success.setAttribute("tabindex", "-1");
          success.focus();
          success.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center"
          });
        }
      });
    });
  })();


  /* ======================================================================
     11. COOKIE CONSENT
     ====================================================================== */

  var CONSENT_KEY = "msr-consent";

  function initOptionalScripts(prefs) {
    /* Analytics and advertising tags belong here and nowhere else.
       This function is only ever called after an explicit opt-in, so no
       non-essential cookie is written before the visitor chooses.
       Example, once a measurement account exists:
         if (prefs.analytics) { loadScript('https://...'); }
         if (prefs.advertising) { loadScript('https://...'); }
       PLACEHOLDER — REPLACE WITH REAL VERIFIED INFORMATION BEFORE LAUNCH */
    void prefs;
  }

  (function cookieConsent() {
    var banner = $("#cookie-banner");
    if (!banner) return;

    var acceptBtn = $("#cookie-accept", banner);
    var rejectBtn = $("#cookie-reject", banner);
    var manageBtn = $("#cookie-manage", banner);
    var prefsPanel = $("#cookie-prefs", banner);
    var saveBtn = $("#cookie-save", banner);
    var analyticsBox = $("#cookie-analytics", banner);
    var adsBox = $("#cookie-advertising", banner);

    var existing = null;
    if (store) {
      try { existing = JSON.parse(store.getItem(CONSENT_KEY) || "null"); }
      catch (e) { existing = null; }
    }

    if (existing) {
      initOptionalScripts(existing);
    } else {
      banner.classList.add("is-visible");
    }

    function record(prefs) {
      prefs.date = new Date().toISOString();
      if (store) {
        try { store.setItem(CONSENT_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
      }
      banner.classList.remove("is-visible");
      initOptionalScripts(prefs);
      toast("Cookie preferences saved. You can change them any time on the Cookie Policy page.");
    }

    if (acceptBtn) acceptBtn.addEventListener("click", function () {
      record({ essential: true, analytics: true, advertising: true });
    });
    if (rejectBtn) rejectBtn.addEventListener("click", function () {
      record({ essential: true, analytics: false, advertising: false });
    });
    if (manageBtn && prefsPanel) manageBtn.addEventListener("click", function () {
      var open = !prefsPanel.hasAttribute("hidden");
      if (open) { prefsPanel.setAttribute("hidden", ""); }
      else { prefsPanel.removeAttribute("hidden"); }
      manageBtn.setAttribute("aria-expanded", String(!open));
    });
    if (saveBtn) saveBtn.addEventListener("click", function () {
      record({
        essential: true,
        analytics: !!(analyticsBox && analyticsBox.checked),
        advertising: !!(adsBox && adsBox.checked)
      });
    });

    // "Manage cookie preferences" links in the footer reopen the banner
    $$("[data-open-cookie-settings]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        banner.classList.add("is-visible");
        if (prefsPanel) prefsPanel.removeAttribute("hidden");
        if (manageBtn) manageBtn.setAttribute("aria-expanded", "true");
        var first = $(FOCUSABLE, banner);
        if (first) first.focus();
      });
    });
  })();


  /* ======================================================================
     12. BACK TO TOP
     ====================================================================== */

  (function backToTop() {
    var btn = $("#back-to-top");
    if (!btn || !("IntersectionObserver" in window)) return;

    var target = $(".site-header") || document.body;

    new IntersectionObserver(function (entries) {
      btn.classList.toggle("is-visible", !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(target);

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
      var skip = $(".skip-link");
      if (skip) skip.focus();
    });
  })();


  /* ======================================================================
     13. TOAST
     ====================================================================== */

  var toastTimer = null;
  function toast(message) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.classList.remove("is-visible");
    }, 4200);
  }

})();
