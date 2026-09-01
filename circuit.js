/**
 * circuit.js
 * ----------
 * Gère la carte interactive du circuit : remplissage des filtres coureur /
 * relais, survol des segments SVG, et affichage du panneau de temps.
 *
 * IMPORTANT : aucune vitesse n'est calculée ici. Toutes les valeurs
 * affichées (temps, vitesse) proviennent telles quelles de
 * data.segments_stats, déjà pré-calculées côté données.
 */

/** Point d'entrée : initialise les filtres puis les interactions de survol. */
function initCircuit(data) {
  remplirFiltreCoureur(data);
  remplirFiltreRelais(data);

  document.getElementById('filter-coureur').addEventListener('change', () => remplirFiltreRelais(data));

  document.querySelectorAll('.circuit-segment').forEach((segment) => {
    segment.addEventListener('mouseenter', () => activerSegment(segment, data));
    segment.addEventListener('focus', () => activerSegment(segment, data));
    segment.addEventListener('mouseleave', () => desactiverSegment(segment));
    segment.addEventListener('blur', () => desactiverSegment(segment));
  });
}

/** Remplit le menu déroulant des coureurs (une fois, au chargement). */
function remplirFiltreCoureur(data) {
  const select = document.getElementById('filter-coureur');
  data.coureurs.forEach((c) => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = `${c.prenom} ${c.nom}`;
    select.appendChild(option);
  });
}

/** Remplit le menu des relais en fonction du coureur actuellement sélectionné. */
function remplirFiltreRelais(data) {
  const coureurId = document.getElementById('filter-coureur').value;
  const select = document.getElementById('filter-relais');
  select.innerHTML = '<option value="tous">Tous les relais</option>';

  const numerosRelais = coureurId === 'tous'
    ? numerosRelaisEquipe(data)
    : data.coureurs.find((c) => c.id === coureurId).relais.map((r) => r.numero);

  numerosRelais.forEach((numero) => {
    const option = document.createElement('option');
    option.value = numero;
    option.textContent = `Relais ${numero}`;
    select.appendChild(option);
  });
}

/** Liste triée de tous les numéros de relais de l'équipe (tous coureurs confondus). */
function numerosRelaisEquipe(data) {
  const numeros = new Set();
  data.coureurs.forEach((c) => c.relais.forEach((r) => numeros.add(r.numero)));
  return [...numeros].sort((a, b) => a - b);
}

/** Met le segment en surbrillance et déclenche la mise à jour du panneau. */
function activerSegment(segment, data) {
  segment.classList.add('is-active');
  updateSegmentTooltip(segment.dataset.segmentId, data);
}

/** Retire la surbrillance et remet le panneau dans son état par défaut. */
function desactiverSegment(segment) {
  segment.classList.remove('is-active');
  reinitialiserTooltip();
}

/**
 * Construit le contenu du panneau de temps pour le segment survolé, en
 * tenant compte des filtres coureur / relais actuellement sélectionnés.
 * C'est ici la seule logique de lecture des données : un simple lookup
 * dans segments_stats, jamais un recalcul.
 */
function updateSegmentTooltip(segmentId, data) {
  const seg = data.segments_stats[segmentId];
  const coureurId = document.getElementById('filter-coureur').value;
  const relaisNum = document.getElementById('filter-relais').value;
  const panel = document.getElementById('circuit-tooltip');

  let corps = '';

  if (relaisNum !== 'tous') {
    // Un relais précis est sélectionné : le résultat est sans ambiguïté.
    const r = seg.par_relais[relaisNum];
    corps = ligneTooltip(`Relais ${relaisNum}`, r.coureur_nom, r.temps, r.vitesse);
  } else if (coureurId !== 'tous') {
    // Un coureur précis, tous ses relais : meilleur temps + moyenne.
    const pc = seg.par_coureur[coureurId];
    const coureur = data.coureurs.find((c) => c.id === coureurId);
    const nom = `${coureur.prenom} ${coureur.nom}`;
    corps = ligneTooltip('Meilleur temps', nom, pc.meilleur.temps, pc.meilleur.vitesse)
      + ligneTooltip('Moyenne', nom, pc.moyenne.temps, pc.moyenne.vitesse);
  } else {
    // Mode équipe par défaut : meilleur temps de l'équipe + sa moyenne.
    corps = ligneTooltip('Meilleur temps équipe', seg.meilleur_equipe.coureur_nom, seg.meilleur_equipe.temps, seg.meilleur_equipe.vitesse)
      + ligneTooltip('Moyenne équipe', null, seg.moyenne_equipe.temps, seg.moyenne_equipe.vitesse);
  }

  panel.innerHTML = `<p class="tooltip-segment-name">${seg.nom}</p>${corps}`;
}

/** Construit une ligne du panneau : libellé (+ nom optionnel), temps, vitesse. */
function ligneTooltip(libelle, nom, temps, vitesse) {
  const suffixe = nom ? ` — ${nom}` : '';
  return `<div class="tooltip-row">
      <span class="tooltip-label">${libelle}${suffixe}</span>
      <span class="tooltip-values">${temps}<span class="tooltip-unit">${vitesse} km/h</span></span>
    </div>`;
}

/** Remet le panneau de temps dans son état d'invite, hors survol. */
function reinitialiserTooltip() {
  document.getElementById('circuit-tooltip').innerHTML =
    '<p class="tooltip-hint">Survolez un segment du circuit pour afficher ses temps.</p>';
}
