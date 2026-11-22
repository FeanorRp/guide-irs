/* Assistant du guide IRS : répond aux questions en cherchant dans window.GUIDE (aucun serveur, aucune IA). */
(function () {
  "use strict";

  var G = window.GUIDE;
  if (!G) return;

  // ---------- Texte ----------

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'");
  }

  var STOP = ("le la les un une des du de d l au aux a et ou en dans sur pour par avec sans ce cet cette ces " +
    "mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs je tu il elle on nous vous ils elles " +
    "que qui quoi quel quelle quels quelles est sont etre ai as avons avez ont suis es fait faire " +
    "peut peux peuvent pouvoir dois doit doivent devoir faut il y ne pas plus moins tres si se s qu c j m n t " +
    "comment pourquoi quand combien ou est-ce estce alors donc mais car ca cela ceci tout tous toute toutes " +
    "quoi bien aussi encore deja the what how irs").split(" ");
  var STOPSET = {};
  STOP.forEach(function (w) { STOPSET[w] = 1; });

  // Synonymes et formulations courantes -> vocabulaire du guide
  var SYN = {
    cash: "liquide", espece: "liquide", especes: "liquide", billets: "liquide",
    taxe: "impot", taxes: "impot", fisc: "impot", impose: "impot", imposition: "impot",
    voiture: "vehicule", voitures: "vehicule", caisse: "vehicule", auto: "vehicule",
    maison: "propriete", appart: "propriete", appartement: "propriete", immobilier: "propriete",
    patron: "gerant", boss: "gerant", pdg: "gerant", directeur: "gerant", chef: "gerant",
    virer: "licenciement", vire: "licenciement", licencier: "licenciement", renvoyer: "licenciement", renvoi: "licenciement",
    demission: "demission", demissionner: "demission",
    salarie: "employe", salaries: "employe", employes: "employe", travailleur: "employe",
    paye: "salaire", paie: "salaire", payer: "paiement",
    stagiaire: "stage", apprenti: "apprentissage",
    flic: "fdo", police: "fdo", policier: "fdo",
    perquisitionner: "perquisition", fouiller: "fouille",
    contester: "contestation", recours: "contestation", appel: "contestation",
    amendes: "amende", penalite: "amende", penalites: "amende", sanction: "amende", sanctions: "amende",
    fraude: "fraude", frauder: "fraude", blanchir: "blanchiment",
    retard: "retard", oublie: "oubli", oublier: "oubli",
    pub: "publicite", annonce: "annonce", annonces: "annonce",
    age: "age", ans: "age", mineur: "age",
    controler: "controle", controles: "controle", inspection: "controle",
    saisir: "saisie", saisies: "saisie",
    occasion: "occasion", revendre: "vente", vendre: "vente", acheter: "achat",
    secret: "confidentialite", confidentiel: "confidentialite",
    avocat: "avocat", represente: "represente"
  };

  // Racine simple : 5 premiers caractères (declaration / declarer -> decla, temoin / temoigne -> temoi)
  function stem(w) { return w.length > 5 ? w.slice(0, 5) : w; }

  function tokens(text) {
    var out = [];
    norm(text).split(/[^a-z0-9]+/).forEach(function (w) {
      if (!w || STOPSET[w] || (w.length < 3 && !/^\d+$/.test(w))) return;
      if (SYN[w]) w = SYN[w];
      if (w.length > 4 && /[sx]$/.test(w)) w = w.slice(0, -1);
      out.push(stem(w));
    });
    return out;
  }

  // ---------- Index ----------

  var DOCS = [];
  function add(doc) {
    doc.keys = {};
    [["title", 3], ["body", 1], ["effect", 1.5], ["extra", 1], ["penal", 0.5]].forEach(function (f) {
      tokens(doc[f[0]]).forEach(function (k) {
        doc.keys[k] = Math.max(doc.keys[k] || 0, f[1]);
      });
    });
    DOCS.push(doc);
  }

  ["entreprises", "citoyens", "impots", "fiscalite", "droits", "organisation"].forEach(function (slug) {
    var d = G[slug];
    d.articles.concat(d.etapes || []).forEach(function (a) {
      add({ kind: "article", id: a.id, href: "#/" + slug + "/" + a.id, where: d.label, title: a.title,
        body: a.body, effect: a.effect, penal: a.penal, prop: a.proposition });
    });
  });
  G.fiscalite.bareme.forEach(function (b) {
    add({ kind: "bareme", id: b.id, href: "#/fiscalite", where: "Barème des sanctions", title: b.infraction,
      body: "", extra: b.type1 + " " + b.type2 + " amende", penal: b.penal, b: b, prop: b.proposition });
  });
  G.codePenal.groups.forEach(function (g) {
    g.items.forEach(function (it) {
      add({ kind: "penal", id: it.article, href: "#/codePenal", where: "Code pénal - " + g.title,
        title: "Art. " + it.article, body: it.resume, extra: it.usage, it: it });
    });
  });
  if (G.fiscalite.fraude) {
    add({ kind: "article", id: "fraude", href: "#/fiscalite", where: "Fiscalité",
      title: "Fraude fiscale et optimisation", body: G.fiscalite.fraude });
  }

  var IDF = {};
  DOCS.forEach(function (d) { Object.keys(d.keys).forEach(function (k) { IDF[k] = (IDF[k] || 0) + 1; }); });
  Object.keys(IDF).forEach(function (k) { IDF[k] = Math.log(1 + DOCS.length / IDF[k]); });

  // ---------- Recherche ----------

  function byId(q) {
    var n = norm(q);
    var m = n.match(/\b(ce|irs|dc\.?e|dc|b|i|f)\s*\.?\s*(\d{1,2})\b/);
    if (m) {
      var id = (m[1].replace(".", "") === "dce" ? "DC.E" : m[1].toUpperCase() + ".") + m[2];
      var hit = DOCS.filter(function (d) { return d.id === id; })[0];
      if (hit) return hit;
    }
    m = n.match(/\b(?:art(?:icle)?\.?\s*)(\d{1,2}\.\d{1,2})\b/) || n.match(/^\s*(\d{1,2}\.\d{1,2})\s*$/);
    if (m) {
      return DOCS.filter(function (d) {
        return d.kind === "penal" && d.id.split(/\s*\/\s*/).indexOf(m[1]) >= 0;
      })[0] || null;
    }
    return null;
  }

  function search(q) {
    var keys = tokens(q).filter(function (k, i, a) { return a.indexOf(k) === i; });
    if (!keys.length) return { keys: keys, hits: [] };
    // Question à la première personne : favorise les règles visant les particuliers
    var soft = /(^|[^a-z])(je|j|ma|mon|mes|moi)([^a-z]|$)/.test(norm(q)) ? [stem("particulier")] : [];
    var wantsAmount = /combien|montant|amende|prix|cout|tarif|sanction|risque/.test(norm(q));
    var hits = DOCS.map(function (d) {
      var score = 0, matched = 0;
      keys.forEach(function (k) {
        var w = d.keys[k];
        if (w) { score += w * (IDF[k] || 1); matched++; }
      });
      soft.forEach(function (k) { if (matched && d.keys[k]) score += 0.5 * d.keys[k] * (IDF[k] || 1); });
      if (!matched) return null;
      score *= 0.5 + matched / keys.length;
      if (wantsAmount && d.kind === "bareme") score *= 1.3;
      if (d.kind === "penal") score *= 0.85;
      return { d: d, score: score, matched: matched };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
    return { keys: keys, hits: hits };
  }

  // ---------- Réponse ----------

  function lines(text) {
    return String(text || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function renderLines(ls) {
    var html = "", inList = false;
    ls.forEach(function (l) {
      var item = /^(- |\* |\d+\. )/.test(l);
      if (item && !inList) { html += "<ul>"; inList = true; }
      if (!item && inList) { html += "</ul>"; inList = false; }
      html += item ? "<li>" + esc(l.replace(/^(- |\* |\d+\. )/, "")) + "</li>" : "<p>" + esc(l) + "</p>";
    });
    return html + (inList ? "</ul>" : "");
  }

  // Garde les lignes du texte qui parlent le plus de la question (ordre d'origine conservé)
  function excerpt(text, keys, max) {
    var ls = lines(text);
    if (ls.length <= max) return ls;
    var scored = ls.map(function (l, i) {
      var t = tokens(l), s = 0;
      keys.forEach(function (k) { if (t.indexOf(k) >= 0) s += IDF[k] || 1; });
      return { i: i, s: s };
    });
    var keep = scored.filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, max)
      .sort(function (a, b) { return a.i - b.i; });
    if (!keep.length) return ls.slice(0, max);
    // Ajoute la ligne d'introduction d'une liste si un élément de liste est retenu sans elle
    var out = [];
    keep.forEach(function (x) {
      var l = ls[x.i];
      if (/^(- |\d+\. )/.test(l) && x.i > 0) {
        var j = x.i - 1;
        while (j > 0 && /^(- |\d+\. )/.test(ls[j])) j--;
        if (out.indexOf(ls[j]) < 0) out.push(ls[j]);
      }
      if (out.indexOf(l) < 0) out.push(l);
    });
    return out;
  }

  function answer(hit, keys) {
    var d = hit.d, html = "";
    var badge = "";
    html += '<div class="chat-src"><a href="' + d.href + '">' +
      esc(d.title) + "</a>" + badge + "<small>" + esc(d.where) + (d.kind === "article" && d.id !== "fraude" ? " - " + esc(d.id) : "") + "</small></div>";
    if (d.kind === "bareme") {
      html += '<table class="chat-table"><tr><th>Première fois</th><td>' + esc(d.b.type1) + "</td></tr>" +
        "<tr><th>Récidive</th><td>" + esc(d.b.type2) + "</td></tr>" +
        (d.b.penal ? "<tr><th>Code pénal</th><td>" + esc(d.b.penal) + "</td></tr>" : "") + "</table>";
    } else if (d.kind === "penal") {
      html += "<p>" + esc(d.it.resume) + "</p>" + (d.it.usage ? "<p><b>Pour l'IRS :</b> " + esc(d.it.usage) + "</p>" : "");
    } else {
      html += renderLines(excerpt(d.body, keys, 6));
      if (d.effect) html += '<div class="chat-effect"><b>Sanction / effet</b>' + renderLines(excerpt(d.effect, keys, 3)) + "</div>";
      if (d.penal) html += '<div class="chat-penal"><b>Code pénal</b>' + renderLines(lines(d.penal)) + "</div>";
    }
    return html;
  }

  function reply(q) {
    var direct = byId(q);
    if (direct) return answer({ d: direct }, tokens(q));
    var r = search(q);
    if (!r.hits.length) {
      return "<p>Je n'ai rien trouvé dans le guide pour cette question.</p>" +
        "<p>Essaie avec des mots du guide : <i>liquide, licenciement, contrôle, saisie, stage, véhicule d'occasion</i>, " +
        "ou un numéro d'article (<i>CE.24</i>, <i>art 7.1</i>).</p>";
    }
    var top = r.hits[0];
    var html = "";
    if (top.matched < r.keys.length && r.keys.length > 1) {
      html += '<p class="chat-warn">Réponse partielle : tous les mots de la question ne figurent pas dans cet article.</p>';
    }
    html += answer(top, r.keys);
    var more = r.hits.slice(1).filter(function (h) { return h.score >= top.score * 0.45; }).slice(0, 3);
    if (more.length) {
      html += '<div class="chat-more"><b>Voir aussi</b><ul>' + more.map(function (h) {
        return '<li><a href="' + h.d.href + '">' + esc(h.d.title) + "</a> <small>" + esc(h.d.where) + "</small></li>";
      }).join("") + "</ul></div>";
    }
    return html;
  }

  // ---------- Interface ----------

  var root = document.createElement("div");
  root.className = "chat";
  root.innerHTML =
    '<button class="chat-toggle" id="chatToggle" aria-expanded="false">Poser une question</button>' +
    '<section class="chat-panel" id="chatPanel" hidden aria-label="Assistant du guide">' +
    '<header><b>Assistant du guide IRS</b><button class="chat-close" id="chatClose" aria-label="Fermer">×</button></header>' +
    '<div class="chat-log" id="chatLog" aria-live="polite"></div>' +
    '<form class="chat-form" id="chatForm"><input id="chatInput" type="text" autocomplete="off" ' +
    'placeholder="Ex. : combien pour du liquide non justifié ?"><button class="btn" type="submit">Envoyer</button></form>' +
    "</section>";
  document.body.appendChild(root);

  var panel = document.getElementById("chatPanel");
  var toggle = document.getElementById("chatToggle");
  var log = document.getElementById("chatLog");
  var input = document.getElementById("chatInput");

  function push(who, html) {
    var div = document.createElement("div");
    div.className = "msg " + who;
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  var SUGGEST = ["Combien pour du liquide non justifié ?", "Peut-on licencier un employé qui a témoigné ?",
    "L'IRS peut-il entrer sans mandat ?", "Âge minimum pour être barman", "Retard de déclaration d'impôts"];

  push("bot", "<p>Pose une question sur le guide : je cherche la réponse dans les articles, le barème et le code pénal.</p>" +
    '<p class="chat-note">Réponses tirées du texte du guide, sans interprétation. Le code pénal de San Andreas prime.</p>' +
    '<div class="chat-chips">' + SUGGEST.map(function (s) {
      return '<button type="button" class="chip">' + esc(s) + "</button>";
    }).join("") + "</div>");

  function ask(q) {
    q = q.trim();
    if (!q) return;
    push("me", "<p>" + esc(q) + "</p>");
    push("bot", reply(q));
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.hidden = open;
    if (open) input.focus();
  }

  toggle.addEventListener("click", function () { setOpen(true); });
  document.getElementById("chatClose").addEventListener("click", function () { setOpen(false); });
  document.getElementById("chatForm").addEventListener("submit", function (e) {
    e.preventDefault();
    ask(input.value);
    input.value = "";
  });
  log.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (chip) ask(chip.textContent);
  });
})();
