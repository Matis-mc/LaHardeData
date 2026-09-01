/**
 * chart-config.js
 * ----------------
 * Toute la configuration Chart.js vit ici : thème sombre commun + une
 * fonction "buildXxxChart" par graphique du dashboard. app.js appelle ces
 * fonctions avec les données déjà lues dans data.json.
 *
 * Les seules conversions faites ici sont des conversions d'AFFICHAGE
 * (ex: "HH:MM:SS" -> nombre d'heures pour positionner une barre), jamais
 * de calcul de vitesse ou de statistique métier : ces valeurs sont déjà
 * fournies telles quelles dans data.json.
 */

const CHART_COLORS = {
  amber: '#f2a93b',
  amberSoft: 'rgba(242, 169, 59, 0.15)',
  signal: '#3ecf8e',
  signalSoft: 'rgba(62, 207, 142, 0.15)',
  grid: 'rgba(139, 148, 160, 0.12)',
  text: '#8b94a0',
};

const PREFERS_REDUCED_MOTION =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Applique une base commune à tous les graphiques (police, couleurs, grille). */
function initChartDefaults() {
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = CHART_COLORS.text;
  Chart.defaults.animation = PREFERS_REDUCED_MOTION ? false : { duration: 500 };
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = '#1d242c';
  Chart.defaults.plugins.tooltip.borderColor = '#262e37';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.titleFont = { family: "'Inter', system-ui, sans-serif", weight: '600' };
}

/** Convertit "HH:MM:SS" en nombre d'heures décimal, pour positionner une barre. */
function hmsVersHeures(hms) {
  const [h, m, s] = hms.split(':').map(Number);
  return h + m / 60 + s / 3600;
}

/** Convertit un temps au tour "MM:SS.mmm" en secondes, pour tracer une courbe. */
function tempsTourVersSecondes(tempsStr) {
  const [mm, reste] = tempsStr.split(':');
  return Number(mm) * 60 + parseFloat(reste);
}

/** Options communes à toutes les grilles cartésiennes (axes X/Y). */
function optionsGrilleCommunes() {
  return {
    x: { grid: { display: false }, ticks: { color: CHART_COLORS.text } },
    y: { grid: { color: CHART_COLORS.grid }, ticks: { color: CHART_COLORS.text }, beginAtZero: true },
  };
}

/** Graphique 1 : évolution des tours effectués par heure, toute l'équipe. */
function buildToursParHeureChart(canvas, toursParHeure) {
  const labels = toursParHeure.map((h) => `${h.heure}h`);
  const valeurs = toursParHeure.map((h) => h.tours);

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: valeurs,
        borderColor: CHART_COLORS.amber,
        backgroundColor: CHART_COLORS.amberSoft,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        fill: true,
        tension: 0.75,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: optionsGrilleCommunes(),
      plugins: {
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} tours` } },
      },
    },
  });
}

/** Graphique 2 : temps total couru par coureur (histogramme). */
function buildTempsParCoureurChart(canvas, coureurs) {
  const labels = coureurs.map((c) => c.prenom);
  const heures = coureurs.map((c) => hmsVersHeures(c.temps_total));

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: heures,
        backgroundColor: CHART_COLORS.amber,
        borderRadius: 3,
        maxBarThickness: 42,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: optionsGrilleCommunes(),
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => coureurs[items[0].dataIndex].temps_total,
            label: (ctx) => `${coureurs[ctx.dataIndex].prenom} ${coureurs[ctx.dataIndex].nom}`,
          },
        },
      },
    },
  });
}

/** Graphique 3 : nombre de tours effectués par coureur (histogramme). */
function buildToursParCoureurChart(canvas, coureurs) {
  const labels = coureurs.map((c) => c.prenom);
  const tours = coureurs.map((c) => c.tours_total);

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: tours,
        backgroundColor: CHART_COLORS.signal,
        borderRadius: 3,
        maxBarThickness: 42,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: optionsGrilleCommunes(),
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${tours[ctx.dataIndex]} tours`,
          },
        },
      },
    },
  });
}

/** Graphique de la fiche individuelle : régularité des temps au tour. */
function buildTempsAuTourChart(canvas, coureur) {
  const labels = coureur.temps_au_tour.map((t) => t.tour);
  const secondes = coureur.temps_au_tour.map((t) => tempsTourVersSecondes(t.temps));
  const moyenne = secondes.reduce((a, b) => a + b, 0) / secondes.length;

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Temps au tour',
          data: secondes,
          borderColor: CHART_COLORS.signal,
          backgroundColor: CHART_COLORS.signalSoft,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 1.5,
          tension: 0.15,
        },
        {
          label: 'Moyenne',
          data: labels.map(() => moyenne),
          borderColor: CHART_COLORS.text,
          borderDash: [4, 4],
          borderWidth: 1,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.text, maxTicksLimit: 10 } },
        y: {
          grid: { color: CHART_COLORS.grid },
          ticks: {
            color: CHART_COLORS.text,
            callback: (val) => `${Math.floor(val / 60)}:${String(Math.round(val % 60)).padStart(2, '0')}`,
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => coureur.temps_au_tour[ctx.dataIndex]
              ? `Tour ${coureur.temps_au_tour[ctx.dataIndex].tour} — ${coureur.temps_au_tour[ctx.dataIndex].temps}`
              : 'Moyenne du relais',
          },
        },
      },
    },
  });
}
