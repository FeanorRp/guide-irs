/* Guide IRS - site statique (GitHub Pages). Navigation par hash : #/section ou #/section/ID */
(function () {
  "use strict";

  var G = window.GUIDE;
  var main = document.getElementById("main");

  var PAGES = [
    { slug: "", label: "Accueil" },
    { slug: "entreprises", label: "Code Entreprises" },
    { slug: "impots", label: "Impôts" },
    { slug: "fiscalite", label: "Fiscalité" },
    { slug: "droits", label: "Droits du contribuable" },
    { slug: "organisation", label: "Organisation IRS" },
    { slug: "codePenal", label: "Code pénal (extraits)" },
    { slug: "calculateur", label: "Calculateur" },
    { slug: "references", label: "Références US" },
    { slug: "journal", label: "Journal des modifications" }
  ];

  var DESCRIPTIONS = {
    entreprises: "Règles encadrant les entreprises de San Andreas",
    impots: "Déclaration, paiement, difficultés de paiement",
    fiscalite: "Contrôles, enquêtes, barème des sanctions, recouvrement",
    droits: "Droits face à l'IRS et déroulé d'un contrôle",
    organisation: "Postes, pouvoirs et devoirs des agents",
    codePenal: "Articles du code pénal du serveur utiles à l'IRS",
    calculateur: "Calcul indicatif des amendes",
    references: "Textes de loi américains ayant servi de base",
    journal: "Changements et points à valider par le staff"
  };

  // ---------- Utilitaires ----------

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function money(n) {
    return Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ") + " $";
  }

  // Texte brut -> HTML : listes "- " et "1. ", sous-titres courts, paragraphes
  function fmt(text) {
    var lines = String(text || "").split("\n");
    var html = "", list = null;

    function close() {
      if (list) { html += "</" + list + ">"; list = null; }
    }

    lines.forEach(function (line, i) {
      var t = line.trim();
      var next = (lines[i + 1] || "").trim();
      if (!t) { close(); return; }
      var bullet = /^- /.test(t), num = /^\d+\. /.test(t);
      if (bullet || num) {
        var tag = bullet ? "ul" : "ol";
        if (list !== tag) { close(); html += "<" + tag + ">"; list = tag; }
        html += "<li>" + esc(t.replace(/^(- |\d+\. )/, "")) + "</li>";
        return;
      }
      close();
      var heading = t.length < 60 && !/[.:;,)]$/.test(t) && next && i < lines.length - 1;
      html += heading ? "<h4>" + esc(t) + "</h4>" : "<p>" + esc(t) + "</p>";
    });
    close();
    return html;
  }

  function sub(cls, title, text, open) {
    if (!text) return "";
    return '<details class="sub ' + cls + '"' + (open ? " open" : "") + "><summary>" + title +
      "</summary><div>" + fmt(text) + "</div></details>";
  }

  function card(slug, a) {
    var badge = a.proposition ? '<span class="badge">PROPOSITION - à valider par le staff</span>' : "";
    return '<details class="card" open id="' + esc(a.id) + '" data-search="' +
      esc(norm([a.title, a.body, a.penal, a.us, a.effect, a.change].join(" "))) + '">' +
      "<summary>" + esc(a.title) + ' <span class="ref">- ' + esc(a.id) + "</span>" + badge +
      '<button class="btn copy" data-link="#/' + slug + "/" + esc(a.id) + '">Copier le lien</button></summary>' +
      '<div class="card-body">' + fmt(a.body) +
      sub("effect", "Sanction / effet", a.effect, true) +
      sub("penal", "Code pénal serveur (MDT)", a.penal) +
      sub("us", "Base légale réelle (USA)", a.us) +
      sub("change", "Changement", a.change) +
      "</div></details>";
  }

  function head(title, updated, withTools) {
    return '<div class="page-head"><div><h1>' + esc(title) + "</h1>" +
      (updated ? '<div class="updated">Mise à jour : ' + esc(updated) + "</div>" : "") + "</div>" +
      (withTools ? '<div class="toolbar"><input type="search" id="pageSearch" placeholder="Filtrer cette page...">' +
        '<button class="btn" id="toggleAll">Tout replier</button></div>' : "") + "</div>";
  }

  // ---------- Pages ----------

  function countOf(slug) {
    var d = G[slug];
    if (!d) return "";
    if (d.articles) return d.articles.length + (d.bareme ? d.bareme.length : 0) + (d.etapes ? d.etapes.length : 0);
    if (d.groups) return d.groups.reduce(function (n, g) { return n + g.items.length; }, 0);
    if (d.items) return d.items.length;
    return "";
  }

  function pageHome() {
    var tiles = PAGES.slice(1).map(function (p) {
      var n = countOf(p.slug);
      return '<a class="tile" href="#/' + p.slug + '"><b>' + esc(p.label) + "</b><span>" +
        esc(DESCRIPTIONS[p.slug]) + (n ? " - " + n + " entrées" : "") + "</span></a>";
    }).join("");
    return head("Guide IRS - San Andreas", "31/10/2026") +
      '<div class="notice">' + fmt(G.organisation.intro) + "</div>" +
      '<div class="notice">Le code pénal du serveur (MDT DOJ) prime sur ce guide. ' +
      'Les éléments marqués <span class="badge">PROPOSITION</span> ne s\'appliquent qu\'après validation du staff.</div>' +
      '<div class="grid">' + tiles + "</div>";
  }

  function pageArticles(slug) {
    var d = G[slug];
    var html = head(d.label, d.updated, true);
    if (d.intro) html += '<div class="notice">' + fmt(d.intro) + "</div>";
    html += d.articles.map(function (a) { return card(slug, a); }).join("");
    if (d.etapes) {
      html += "<h2>Déroulé d'un contrôle</h2>" + d.etapes.map(function (a) { return card(slug, a); }).join("");
    }
    if (d.references) html += '<div class="notice">' + fmt(d.references) + "</div>";
    return html;
  }

  function pageFiscalite() {
    var d = G.fiscalite;
    var proc = d.articles.slice(0, 3), enq = d.articles.slice(3);
    var rows = d.bareme.map(function (b) {
      return '<tr class="' + (b.proposition ? "prop" : "") + '" data-search="' +
        esc(norm([b.infraction, b.type1, b.type2, b.penal, b.us].join(" "))) + '">' +
        "<td>" + (b.proposition ? '<span class="badge">PROPOSITION</span> ' : "") + esc(b.infraction) + "</td>" +
        "<td>" + esc(b.type1) + "</td><td>" + esc(b.type2) + "</td><td>" + esc(b.penal) + "</td></tr>" +
        '<tr class="detail"><td colspan="4">Base US : ' + esc(b.us) + "</td></tr>";
    }).join("");
    return head(d.label, d.updated, true) +
      "<h2>Procédure</h2>" + proc.map(function (a) { return card("fiscalite", a); }).join("") +
      "<h2>Barème des sanctions</h2>" +
      '<div class="table-wrap"><table><thead><tr><th>Infraction</th><th>Type 1 : première fois</th>' +
      "<th>Type 2 : récidive</th><th>Code pénal serveur</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      "<h2>Enquêtes et recouvrement</h2>" + enq.map(function (a) { return card("fiscalite", a); }).join("") +
      "<h2>Fraude fiscale et optimisation</h2>" + '<div class="notice">' + fmt(d.fraude) + "</div>";
  }

  function pageGroups(slug, cols, render) {
    var d = G[slug];
    var html = head(d.label, d.source ? "source " + d.source : "", true);
    d.groups.forEach(function (g) {
      html += "<h2>" + esc(g.title) + "</h2>" +
        '<div class="table-wrap"><table><thead><tr>' +
        cols.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
        g.items.map(render).join("") + "</tbody></table></div>";
    });
    return html;
  }

  function pageCodePenal() {
    return pageGroups("codePenal", ["Article", "Résumé", "Usage pour l'IRS"], function (it) {
      return '<tr data-search="' + esc(norm(it.article + " " + it.resume + " " + it.usage)) + '"><td><b>' +
        esc(it.article) + "</b></td><td>" + esc(it.resume) + "</td><td>" + esc(it.usage) + "</td></tr>";
    });
  }

  function pageReferences() {
    return pageGroups("references", ["Texte", "Objet", "Lien"], function (it) {
      return '<tr data-search="' + esc(norm(it.texte + " " + it.objet)) + '"><td><b>' + esc(it.texte) +
        "</b></td><td>" + esc(it.objet) + '</td><td><a href="' + esc(it.url) +
        '" target="_blank" rel="noopener">Ouvrir</a></td></tr>';
    });
  }

  function pageJournal() {
    var d = G.journal;
    var types = [];
    d.items.forEach(function (it) { if (types.indexOf(it.type) < 0) types.push(it.type); });
    var rows = d.items.map(function (it) {
      return '<tr data-type="' + esc(it.type) + '" data-search="' +
        esc(norm([it.type, it.onglet, it.article, it.detail].join(" "))) + '"><td><span class="pill ' +
        esc(it.type) + '">' + esc(it.type) + "</span></td><td>" + esc(it.onglet) + "</td><td>" +
        esc(it.article) + "</td><td>" + esc(it.detail) + "</td></tr>";
    }).join("");
    return '<div class="page-head"><div><h1>' + esc(d.label) + "</h1>" +
      '<div class="updated">Base : version du 17/07/2025 (Code Entreprises, Impôts) et du 26/05/2025 (Fiscalité)</div></div>' +
      '<div class="toolbar"><input type="search" id="pageSearch" placeholder="Filtrer...">' +
      '<select id="typeFilter"><option value="">Tous les types</option>' +
      types.map(function (t) { return "<option>" + esc(t) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="table-wrap"><table><thead><tr><th>Type</th><th>Onglet</th><th>Article</th><th>Détail</th></tr></thead><tbody>' +
      rows + "</tbody></table></div>";
  }

  // ---------- Calculateur ----------

  var PENAL = [
    { id: "p71", label: "Art. 7.1 - Liquide sans justificatif (> 2 000 $)", rate: 0.5, note: "Amende de 50 % de la somme, et saisie de la somme." },
    { id: "p72", label: "Art. 7.2 - Blanchiment", rate: 5, note: "5 $ x somme blanchie, plus prison fédérale (calculateur de peine MDT)." },
    { id: "p74", label: "Art. 7.4 - Détournement de fonds", rate: 2, note: "2 $ x somme détournée, plus prison fédérale (calculateur de peine MDT)." },
    { id: "p75", label: "Art. 7.5 - Fraude fiscale", rate: 2.5, note: "2,5 $ x somme non payée, plus prison fédérale (calculateur de peine MDT)." }
  ];

  function num(s) { return parseFloat(String(s).replace(/\s/g, "").replace(",", ".")) || 0; }

  // Lit une ligne du bareme : montant fixe, unite, somme due, pourcentage d'interets
  function parseBareme(text) {
    var fixed = text.match(/^([\d\s.,]+)\s*\$/);
    var pct = text.match(/(\d+)\s*%\s*d'int/);
    return {
      fixed: fixed ? num(fixed[1]) : 0,
      perUnit: /par (contrat|produit|personne|employé)|nombre de semaines/.test(text),
      withSum: /somme (due|manquante)|trop-perçu/.test(text),
      pct: pct ? num(pct[1]) / 100 : 0,
      unit: /semaines/.test(text) ? "semaines" : (text.match(/par (contrat|produit|personne|employé)/) || [, "unités"])[1]
    };
  }

  function pageCalc() {
    var opts = PENAL.map(function (p) { return '<option value="' + p.id + '">' + esc(p.label) + "</option>"; }).join("") +
      '<optgroup label="Barème IRS">' + G.fiscalite.bareme.map(function (b, i) {
        return '<option value="b' + i + '">' + esc(b.infraction) + "</option>";
      }).join("") + "</optgroup>";
    return head("Calculateur", "", false) +
      '<div class="notice">Calcul indicatif. Les peines de prison, TIG et saisies se calculent avec le calculateur de peine du MDT.</div>' +
      '<div class="calc">' +
      '<label>Infraction<select id="cInf">' + opts + "</select></label>" +
      '<label id="cSumL">Somme concernée ($)<input id="cSum" type="text" inputmode="decimal" value="0"></label>' +
      '<label id="cQtyL">Quantité<input id="cQty" type="number" min="1" value="1"></label>' +
      '<label class="row" id="cRecL"><input id="cRec" type="checkbox"> Récidive (Type 2)</label>' +
      '<div class="result" id="cOut"></div>' +
      '<button class="btn" id="cCopy">Copier le résumé</button></div>';
  }

  function runCalc() {
    var inf = document.getElementById("cInf").value;
    var sum = num(document.getElementById("cSum").value);
    var qty = Math.max(1, parseInt(document.getElementById("cQty").value, 10) || 1);
    var rec = document.getElementById("cRec").checked;
    var show = function (id, on) { document.getElementById(id).style.display = on ? "" : "none"; };
    var label, total, detail;

    if (inf.charAt(0) === "p") {
      var p = PENAL.filter(function (x) { return x.id === inf; })[0];
      show("cSumL", true); show("cQtyL", false); show("cRecL", false);
      label = p.label;
      total = sum * p.rate;
      detail = money(sum) + " x " + String(p.rate).replace(".", ",") + " = " + money(total) + ". " + p.note;
    } else {
      var b = G.fiscalite.bareme[+inf.slice(1)];
      var text = rec ? b.type2 : b.type1;
      var r = parseBareme(text);
      show("cRecL", true); show("cSumL", r.withSum || r.pct > 0); show("cQtyL", r.perUnit);
      label = b.infraction + (rec ? " (Type 2)" : " (Type 1)");
      var base = r.fixed * (r.perUnit ? qty : 1);
      var extra = (r.withSum ? sum : 0) + sum * r.pct;
      total = base + extra;
      detail = "Barème : " + text + ". Calcul : " + money(r.fixed) + (r.perUnit ? " x " + qty + " " + r.unit : "") +
        (r.withSum ? " + somme " + money(sum) : "") + (r.pct ? " + " + Math.round(r.pct * 100) + " % de " + money(sum) : "") +
        " = " + money(total) + ".";
    }
    document.getElementById("cOut").innerHTML = '<div class="total">' + money(total) + "</div><div>" + esc(detail) + "</div>";
    document.getElementById("cOut").dataset.summary = label + " : " + money(total) + ". " + detail;
  }

  // ---------- Recherche ----------

  function bindPageSearch() {
    var input = document.getElementById("pageSearch");
    var typeSel = document.getElementById("typeFilter");
    if (!input) return;
    function apply() {
      var q = norm(input.value).trim();
      var type = typeSel ? typeSel.value : "";
      main.querySelectorAll("[data-search]").forEach(function (el) {
        var ok = (!q || el.dataset.search.indexOf(q) >= 0) && (!type || el.dataset.type === type);
        el.style.display = ok ? "" : "none";
        var next = el.nextElementSibling;
        if (next && next.classList.contains("detail")) next.style.display = ok ? "" : "none";
      });
    }
    input.addEventListener("input", apply);
    if (typeSel) typeSel.addEventListener("change", apply);
  }

  var INDEX = [];
  function buildIndex() {
    ["entreprises", "impots", "fiscalite", "droits", "organisation"].forEach(function (slug) {
      var d = G[slug];
      d.articles.concat(d.etapes || []).forEach(function (a) {
        INDEX.push({ href: "#/" + slug + "/" + a.id, title: a.title, where: d.label,
          text: norm([a.title, a.body, a.penal, a.us, a.effect].join(" ")) });
      });
    });
    G.fiscalite.bareme.forEach(function (b) {
      INDEX.push({ href: "#/fiscalite", title: b.infraction, where: "Barème des sanctions",
        text: norm([b.infraction, b.type1, b.type2, b.penal].join(" ")) });
    });
    G.codePenal.groups.forEach(function (g) {
      g.items.forEach(function (it) {
        INDEX.push({ href: "#/codePenal", title: "Art. " + it.article + " - " + it.resume.slice(0, 70), where: "Code pénal",
          text: norm(it.article + " " + it.resume + " " + it.usage) });
      });
    });
  }

  var modal = document.getElementById("searchModal");
  var gInput = document.getElementById("globalSearch");
  var gList = document.getElementById("globalResults");

  function openSearch() {
    modal.hidden = false;
    gInput.value = "";
    renderGlobal();
    gInput.focus();
  }
  function closeSearch() { modal.hidden = true; }

  function renderGlobal() {
    var q = norm(gInput.value).trim();
    if (!q) { gList.innerHTML = '<li class="empty">Tapez un mot : blanchiment, contrôle, saisie...</li>'; return; }
    var words = q.split(/\s+/);
    var hits = INDEX.filter(function (e) {
      return words.every(function (w) { return e.text.indexOf(w) >= 0; });
    }).slice(0, 40);
    gList.innerHTML = hits.length ? hits.map(function (h, i) {
      return '<li><a href="' + h.href + '"' + (i === 0 ? ' class="sel"' : "") + ">" + esc(h.title) +
        "<small>" + esc(h.where) + "</small></a></li>";
    }).join("") : '<li class="empty">Aucun résultat.</li>';
  }

  gInput.addEventListener("input", renderGlobal);
  gInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var first = gList.querySelector("a");
      if (first) { location.hash = first.getAttribute("href"); closeSearch(); }
    }
  });
  gList.addEventListener("click", function (e) { if (e.target.closest("a")) closeSearch(); });
  modal.addEventListener("click", function (e) { if (e.target === modal) closeSearch(); });
  document.getElementById("searchOpen").addEventListener("click", openSearch);
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    if (e.key === "Escape") closeSearch();
  });

  // ---------- Routage ----------

  document.getElementById("nav").innerHTML = PAGES.map(function (p) {
    var n = countOf(p.slug);
    return '<a href="#/' + p.slug + '" data-slug="' + p.slug + '">' + esc(p.label) +
      (n ? "<span>" + n + "</span>" : "") + "</a>";
  }).join("");

  var sidebar = document.getElementById("sidebar");
  document.getElementById("menuBtn").addEventListener("click", function () { sidebar.classList.toggle("open"); });

  function route() {
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var slug = parts[0] || "", target = decodeURIComponent(parts[1] || "");
    var known = PAGES.some(function (p) { return p.slug === slug; });
    if (!known) slug = "";

    var html;
    if (slug === "") html = pageHome();
    else if (slug === "fiscalite") html = pageFiscalite();
    else if (slug === "codePenal") html = pageCodePenal();
    else if (slug === "references") html = pageReferences();
    else if (slug === "journal") html = pageJournal();
    else if (slug === "calculateur") html = pageCalc();
    else html = pageArticles(slug);
    main.innerHTML = html;

    document.querySelectorAll("#nav a").forEach(function (a) {
      a.classList.toggle("active", a.dataset.slug === slug);
    });
    sidebar.classList.remove("open");
    document.title = (slug ? PAGES.filter(function (p) { return p.slug === slug; })[0].label + " - " : "") + "Guide IRS";

    bindPageSearch();
    var toggle = document.getElementById("toggleAll");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = toggle.textContent === "Tout déplier";
        main.querySelectorAll("details.card").forEach(function (d) { d.open = open; });
        toggle.textContent = open ? "Tout replier" : "Tout déplier";
      });
    }
    if (slug === "calculateur") {
      ["cInf", "cSum", "cQty", "cRec"].forEach(function (id) {
        document.getElementById(id).addEventListener("input", runCalc);
        document.getElementById(id).addEventListener("change", runCalc);
      });
      document.getElementById("cCopy").addEventListener("click", function () {
        navigator.clipboard.writeText(document.getElementById("cOut").dataset.summary || "");
      });
      runCalc();
    }

    var el = target && document.getElementById(target);
    if (el) {
      el.open = true;
      el.classList.add("highlight");
      el.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }

  main.addEventListener("click", function (e) {
    var btn = e.target.closest(".copy");
    if (!btn) return;
    e.preventDefault();
    var url = location.href.split("#")[0] + btn.dataset.link;
    navigator.clipboard.writeText(url);
    btn.textContent = "Lien copié";
    setTimeout(function () { btn.textContent = "Copier le lien"; }, 1500);
  });

  buildIndex();
  window.addEventListener("hashchange", route);
  route();
})();
