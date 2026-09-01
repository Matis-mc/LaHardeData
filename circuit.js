/**
 * circuit.js
 * ----------
 * Gère la carte interactive du circuit : survol des segments SVG et
 * affichage du panneau de temps.
 *
 * IMPORTANT : aucune vitesse n'est calculée ici. Toutes les valeurs
 * affichées (temps, vitesse) proviennent telles quelles de
 * data.segments_stats, déjà pré-calculées côté données.
 */

/** Point d'entrée : active uniquement les interactions de survol. */
function initCircuit(data) {
  document.querySelectorAll('.circuit-segment').forEach((segment) => {
    segment.addEventListener('mouseenter', () => activerSegment(segment, data));
    segment.addEventListener('focus', () => activerSegment(segment, data));
    segment.addEventListener('mouseleave', () => desactiverSegment(segment));
    segment.addEventListener('blur', () => desactiverSegment(segment));
  });
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
 * Construit le contenu du panneau de temps pour le segment survolé.
 * L'affichage ne montre plus les relais : il affiche uniquement la moyenne
 * d'équipe et le classement des meilleurs temps de chaque coureur.
 */
function updateSegmentTooltip(segmentId, data) {
  const seg = data.segments_stats[segmentId];
  const panel = document.getElementById('circuit-tooltip');

  if (!seg) {
    panel.innerHTML = '<p class="tooltip-hint">Segment introuvable.</p>';
    return;
  }

  const classement = Object.entries(seg.par_coureur || {})
    .map(([coureurId, stats]) => {
      const coureur = data.coureurs.find((c) => c.id === coureurId);
      const meilleur = stats?.meilleur;

      if (!meilleur || !meilleur.temps || meilleur.vitesse == null) {
        return null;
      }

      return {
        coureurId,
        nom: coureur ? `${coureur.prenom} ${coureur.nom}` : coureurId,
        temps: meilleur.temps,
        vitesse: meilleur.vitesse,
      };
    })
    .filter(Boolean)
    .sort((a, b) => tempsSegmentEnSecondes(a.temps) - tempsSegmentEnSecondes(b.temps));

  const corps = [
    ligneTooltip('Moyenne équipe', null, seg.moyenne_equipe.temps, seg.moyenne_equipe.vitesse),
    ...classement.map((entry, index) => ligneTooltip(`${index + 1}. ${entry.nom}`, null, entry.temps, entry.vitesse))
  ].join('');

  panel.innerHTML = `<p class="tooltip-segment-name">${seg.nom}</p>${corps}`;
}

/** Convertit un temps au format mm:ss.mmm en secondes pour pouvoir trier. */
function tempsSegmentEnSecondes(temps) {
  if (!temps || typeof temps !== 'string') return Number.POSITIVE_INFINITY;

  const match = temps.match(/^(\d+):(\d{2})(?:\.(\d+))?$/);
  if (!match) return Number.POSITIVE_INFINITY;

  const [, minutes, secondes, millisecondes = '0'] = match;
  return Number(minutes) * 60 + Number(secondes) + Number(millisecondes) / 1000;
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
