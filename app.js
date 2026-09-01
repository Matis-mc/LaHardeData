/**
 * app.js
 * ------
 * Point d'entrée de l'application : charge data.json puis orchestre
 * l'affichage des différentes vues (KPIs, graphiques équipe, grille des
 * coureurs, fiche individuelle en modal, carte du circuit).
 */

let coureurChartInstance = null; // permet de détruire le graphique du modal entre deux ouvertures

document.addEventListener('DOMContentLoaded', init);

/** Charge les données puis construit toutes les vues du dashboard. */
async function init() {
  const data = await chargerDonnees();
  if (!data) return;

  initChartDefaults();
  renderKPIs(data.equipe);
  buildTeamCharts(data);
  renderTeamGrid(data.coureurs);
  initCircuit(data);
  setupModal(data);
}

/** Récupère et parse data.json, avec un message clair en cas d'échec. */
async function chargerDonnees() {
  try {
    const reponse = await fetch('data.json');
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    return await reponse.json();
  } catch (erreur) {
    console.error('Impossible de charger data.json :', erreur);
    document.getElementById('team-name').textContent = 'Données indisponibles';
    return null;
  }
}

/** Remplit le header : nom d'équipe et trois KPIs globaux. */
function renderKPIs(equipe) {
  document.getElementById('team-name').textContent = equipe.nom;
  document.getElementById('kpi-tours-value').textContent = equipe.tours_total;
  document.getElementById('kpi-km-value').textContent = `${equipe.km_total} km`;
  document.getElementById('kpi-temps-value').textContent = equipe.temps_total;
}

/** Construit les trois graphiques de la vue équipe. */
function buildTeamCharts(data) {
  buildToursParHeureChart(document.getElementById('chart-tours-heure'), data.equipe.tours_par_heure);
  buildTempsParCoureurChart(document.getElementById('chart-temps-coureur'), data.coureurs);
  buildToursParCoureurChart(document.getElementById('chart-tours-coureur'), data.coureurs);
}

/** Construit la grille de cartes résumées, une par coureur. */
function renderTeamGrid(coureurs) {
  const grille = document.getElementById('team-cards-grid');
  grille.innerHTML = coureurs.map(carteCoureurHTML).join('');

  grille.querySelectorAll('[data-open-coureur]').forEach((bouton) => {
    bouton.addEventListener('click', () => ouvrirFiche(bouton.dataset.openCoureur));
  });
}

/** Génère le HTML d'une carte résumée de coureur. */
function carteCoureurHTML(c) {
  const initiales = `${c.prenom[0]}${c.nom[0]}`;
  return `
    <div class="bg-surface border border-border rounded p-5 flex items-center gap-4">
      <div class="w-12 h-12 shrink-0 rounded-full bg-surface2 border border-border flex items-center justify-center font-display font-bold text-amber">
        ${initiales}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium truncate">${c.prenom} ${c.nom}</p>
        <p class="text-sm text-muted">${c.tours_total} tours · ${c.km_total} km</p>
      </div>
      <button data-open-coureur="${c.id}" class="text-sm text-amber hover:underline shrink-0">Voir la fiche</button>
    </div>`;
}

/* =========================================================================
   Fiche individuelle (modal)
   ========================================================================= */

/** Câble les interactions de fermeture du modal (croix, fond, touche Échap). */
function setupModal(data) {
  const modal = document.getElementById('coureur-modal');
  document.getElementById('modal-close').addEventListener('click', fermerFiche);
  modal.addEventListener('click', (e) => { if (e.target === modal) fermerFiche(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerFiche(); });

  // Stocke les données pour que ouvrirFiche() puisse y accéder.
  modal.dataset.ready = 'true';
  window.__dashboardData = data;
}

/** Ouvre la fiche d'un coureur donné et construit son contenu. */
function ouvrirFiche(coureurId) {
  const data = window.__dashboardData;
  const coureur = data.coureurs.find((c) => c.id === coureurId);
  if (!coureur) return;

  renderFicheCoureur(coureur, data);
  document.getElementById('coureur-modal').dataset.state = 'open';
}

/** Ferme la fiche et libère le graphique associé. */
function fermerFiche() {
  document.getElementById('coureur-modal').dataset.state = 'closed';
  if (coureurChartInstance) {
    coureurChartInstance.destroy();
    coureurChartInstance = null;
  }
}

/** Remplit le contenu du modal : KPIs, graphique de régularité, relais. */
function renderFicheCoureur(coureur, data) {
  document.getElementById('modal-coureur-name').textContent = `${coureur.prenom} ${coureur.nom}`;

  document.getElementById('modal-kpis').innerHTML = `
    ${kpiFicheHTML(coureur.tours_total, 'Tours')}
    ${kpiFicheHTML(`${coureur.km_total} km`, 'Kilomètres')}
    ${kpiFicheHTML(coureur.temps_total, 'Temps couru')}
  `;

  document.getElementById('modal-relais-list').innerHTML =
    coureur.relais.map((r) => carteRelaisHTML(r, data)).join('');

  if (coureurChartInstance) coureurChartInstance.destroy();
  coureurChartInstance = buildTempsAuTourChart(document.getElementById('chart-coureur-tours'), coureur);
}

/** Génère le HTML d'un bloc KPI dans le modal. */
function kpiFicheHTML(valeur, libelle) {
  return `
    <div>
      <p class="font-display font-bold text-3xl text-amber leading-none">${valeur}</p>
      <p class="text-xs text-muted mt-1">${libelle}</p>
    </div>`;
}

/** Génère le HTML d'une carte de relais (tours, temps moyen, meilleurs segments). */
function carteRelaisHTML(relais, data) {
  const segments = relais.meilleurs_segments
    .map((s) => `${data.segments_stats[s.segment_id].nom} <span class="text-signal">${s.temps}</span>`)
    .join(' · ');

  return `
    <div class="bg-surface2 border border-border rounded p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
      <p class="font-display font-bold text-lg w-24 shrink-0">Relais ${relais.numero}</p>
      <p class="text-sm text-muted w-32 shrink-0">${relais.tours} tours · ${relais.temps_moyen_tour} / tour</p>
      <p class="text-sm text-muted">Meilleurs segments : ${segments}</p>
    </div>`;
}
