/* ================= Garten =================
   Gelände nach Aufmaß, Terrasse, Hang zum Bach, Nachbargrundstück, Sichtschutz-Pflanzen und Treppe zum Bach.
   Läuft als Modul in index.html: GartenModul(api) baut alles in api.root. Diese Gruppe liegt in Gartenkoordinaten
   (u, h, v → x, y, z = u, h, −v) und ist so verschoben, dass sie zum Hausmodell passt:
   u = x − 13,54 (Hauskoordinate x), v = y, h = z + FFB EG über Gelände. */
window.GartenModul = function (api) {
'use strict';
const THREE = window.THREE;
// ===== CORE (Geometrie, Pflanzen, Sichtachsen) — auch in Node testbar =====
// Lokales Koordinatensystem (Meter):
//   u = entlang der Hauslängsachse Richtung Nachbar (Südost), 0 = Außenkante Südost-Giebel
//   v = entlang des Giebels Richtung Straße (Nordost), 0 = Außenkante Gartenfassade (Südwest)
//   h = Höhe über Gelände
const CFG = {
  bearingV: 32, // Kompassrichtung der +v-Achse (Giebelrichtung aus dem Aufmaß: 32,05°)
  // Grenzen aus dem Aufmaß des Vermessers (16.01.2024), umgerechnet auf die Südecke des Neubaus
  boundary: [[0.71, 30.17], [1.59, 7.99], [5.33, 7.63], [5.34, -1.78], [5.40, -11.29]], // Grenze zum Nachbarn
  parcel: [[-16.35, 32.53], [-11.71, 31.92], [-12.43, 30.64], [0.71, 30.17], [1.59, 7.99], [5.33, 7.63], [5.34, -1.78], [5.40, -11.29], [4.95, -11.20], [-16.83, -7.46], [-16.66, 6.24], [-16.42, 25.16]],
  haus: { u0: -13.54, u1: 0, v0: 0, v1: 9.60, floor0: 0.25, og: 2.78, dg: 5.54, eave: 6.70, ridge: 9.04, ohEave: 1.4, ohGable: 0.9 },
  winOG: [
    { id: 'OG1', name: 'OG-Fenster 1', room: 'Wohnen, gartenseitig', v0: 1.778, v1: 2.793 },
    { id: 'OG2', name: 'OG-Fenster 2', room: 'Wohnen, Mitte', v0: 4.293, v1: 5.308 },
    { id: 'OG3', name: 'OG-Fenster 3', room: 'Bad (lt. Plan)', v0: 6.808, v1: 7.823 },
  ],
  winDG: [
    { id: 'DG1', name: 'DG-Fenster 1', room: 'Giebel', v0: 2.853, v1: 4.705 },
    { id: 'DG2', name: 'DG-Fenster 2', room: 'Giebel', v0: 4.895, v1: 6.748 },
  ],
  winEG: [
    { id: 'EG1', name: 'EG-Fenster 1', room: 'Küche lt. Plan, bachseitig', v0: 1.577, v1: 2.643 },
    { id: 'EG2', name: 'EG-Fenster 2', room: 'Kinderzimmer lt. Plan', v0: 5.056, v1: 6.071 },
    { id: 'EG3', name: 'EG-Fenster 3', room: 'Büro lt. Plan', v0: 7.908, v1: 8.923 },
  ],
  brh: 0.87, winH: 1.265,
  eyeStand: 1.65, eyeSit: 1.20,
  // Balkon des Nachbarn (Annahme aus Fotos — in "Annahmen" anpassbar)
  balcony: { u0: 4.8, u1: 11.0, depth: 1.5, wallV: 9.70, floor: 2.75 },
  // Terrasse des Nachbarn (Annahme: vor dem Erdgeschoss unter und vor dem Balkon)
  terrace: { u0: 5.4, u1: 11.0, v0: 6.2, v1: 9.7 },
  lattice: true, // vorhandenes Rankgitter am Nordwest-Ende des Balkons (Foto), ca. 50 % blickdicht
  // ---- Bachseite: Lage und Höhen aus dem Aufmaß (16.01.2024), Bauteile aus den Fotos vom 11.11. ----
  // h = 0 ist das Gelände am Südost-Giebel. Absolut: h0 = survey.beam - terrasse.top (m ü. NHN).
  terrasse: {
    uA: -16.6,      // Nordwest-Ende der Mauer (Aufmaß)
    over: 0.58,     // Außenkante Betonbalken über der Giebelflucht (Aufmaß: Mauerrücksprung, Neubau 0,70 m nordwestlich der Altbau-Ecke)
    depth: 2.93,    // Hauswand → Außenkante Betonbalken (Meterstab; passt zum Aufmaß)
    curb: 0.28, curbH: 0.27, // Betonbalken Breite / Höhe (Meterstab)
    top: 0.15,      // OK Betonbalken über Gelände am Giebel (geschätzt)
    fill: 0.08,     // Kies liegt so weit unter OK Balken
    rail: 0.88,     // OK Handlauf über OK Balken (Meterstab)
    sideRail: 2.1,  // Länge des seitlichen Geländers ab Ecke Süd (Meterstab)
    board: 1.15,    // Hausecke → Ende Betonbalken (Foto; im Aufmaß endet der Mauerrücksprung an derselben Stelle)
  },
  survey: { beam: 746.30 }, // OK Betonbalken in m ü. NHN: Mauerfuß an der Ecke Süd 744,64 (Aufmaß) + 1,65 m (Meterstab)
  kalk: { gap: 0.9, v: -1.95, h: 1.1, d: 0.45 },   // Kalksteinmauer (nach dem Aufmaß gebaut): Lücke zur Terrassenmauer (Meterstab), Vorderkante, Höhe, Tiefe
  bach: { H: 740.5, width: 4.5, slope: 0.75, far: -1.5, minV: -4.0 }, // Wasserkante 740,44–740,57 m ü. NHN (Aufmaß); Breite und Gegenufer angenommen
  zaunNb: { newV0: -2.6, newV1: 1.0 },            // die zwei neuen Sichtschutzelemente des Nachbarn (aus Fotos)
  // Geplante Treppe: Beton-Blockstufen auf dem bestehenden Weg. Oben ein Podest auf Terrassenhöhe, dann in der Lücke
  // zwischen Terrassenmauer und Kalksteinmauer hinunter, im Bogen nach Westen und hinunter auf die Ebene am Bach.
  stair: {
    on: true,
    w: 0.80,       // Laufbreite
    side: 0.05,    // Abstand zur Terrassenmauer
    s: 0.18,       // Stufenhöhe = Höhe der Blockstufe
    a: 0.27,       // Auftritt in der Lauflinie (Mitte)
    r: 1.2,        // Bogenradius der Lauflinie
    showOld: true, // bestehenden Weg (alte Treppe laut Aufmaß) mit Höhen einblenden
  },
};
function fixedCrowns() {
  const b = CFG.balcony, out = [], opaque = (min, max) => out.push({ cr: { shape: 'box', min, max }, k: 80 });
  if (CFG.lattice) out.push({ cr: { shape: 'box', min: [b.u0, b.wallV - b.depth + 0.1, b.floor + 1.0], max: [b.u0 + 0.05, b.wallV - 0.05, b.floor + 2.25] }, k: 14 });
  // Zaun an der Grenze (Sichtschutz 1,8 m, weiter zum Bach nur Staketenzaun 1,0 m, halb durchsichtig), Schuppen, Balkonplatte
  for (let v = CFG.boundary[2][1]; v > -9.4; v -= 1) {
    const vm = v - 0.5, bu = boundaryUAt(vm), tall = vm > CFG.zaunNb.newV0, h = tall ? 1.8 : 1.0, z = groundH(bu + 0.15, vm);
    out.push({ cr: { shape: 'box', min: [bu + 0.12, v - 1, z], max: [bu + 0.18, v, z + h] }, k: tall ? 80 : 6 });
  }
  opaque([1.85, 8.05, 0], [4.95, b.wallV, 2.35]);
  opaque([b.u0, b.wallV - b.depth, b.floor - 0.18], [b.u1, b.wallV, b.floor]);
  return out;
}

const SPECIES = {
  spalier: {
    name: 'Spalier-Hainbuche', latin: 'Carpinus betulus, Spalierform', shape: 'box',
    stem: 2.2, top: 5.0, w: 1.8, d: 0.6, densS: 2.8, densW: 1.4, ever: false, marc: true,
    color: 0x4f7d34, growth: [[0.65, 0.83], [1, 1], [1, 1]],
    cut: true, maxNote: 'Schnittform. Ohne Schnitt wird daraus ein Baum mit 15–20 m.',
    info: 'Stamm 2,2 m, flache Kastenkrone. Unten frei, oben dicht. Als fertiges Spalier kaufbar (z. B. Stamm 220 cm, Gerüst 180 cm); volle Höhe nach 1–2 Jahren. Hält im Winter oft braunes Laub.',
  },
  saeule: {
    name: 'Säulen-Hainbuche', latin: "Carpinus betulus 'Frans Fontaine'", shape: 'cyl',
    stem: 0.4, top: 6.5, w: 1.6, densS: 2.2, densW: 1.0, ever: false, marc: true,
    color: 0x557f38, growth: [[0.5, 0.55], [0.75, 0.8], [1, 1]], max: [10, 2.5],
    info: 'Schmale Säule, verträgt Schnitt. Kein Spaliergerüst nötig. Hält im Winter teils braunes Laub.',
  },
  eibe: {
    name: 'Säulen-Eibe', latin: "Taxus baccata 'Fastigiata'", shape: 'cyl',
    stem: 0.0, top: 3.5, w: 1.1, densS: 3.2, densW: 3.2, ever: true,
    color: 0x2f5a35, growth: [[0.5, 0.55], [0.72, 0.75], [1, 1]], max: [5, 2.0],
    info: 'Immergrün, schattenverträglich, wächst langsam. Giftig (Kinder, Haustiere).',
  },
  bambus: {
    name: 'Schirmbambus', latin: 'Fargesia murielae / robusta (horstig)', shape: 'cyl',
    stem: 0.0, top: 3.5, w: 1.4, densS: 2.0, densW: 1.8, ever: true,
    color: 0x6f9a3f, growth: [[0.55, 0.5], [0.9, 0.85], [1, 1]], max: [4.5, 2.0],
    info: 'Immergrün, horstig (keine Rhizomsperre nötig). Braucht Wasser. Passt in schmale Streifen.',
  },
  felsenbirne: {
    name: 'Felsenbirne mehrstämmig', latin: 'Amelanchier lamarckii', shape: 'ell',
    stem: 0.8, top: 5.0, w: 3.5, densS: 1.1, densW: 0.15, ever: false,
    color: 0x5f8a3c, growth: [[0.5, 0.35], [0.8, 0.7], [1, 1]], max: [7, 5], multi: true,
    info: 'Lockerer Kleinbaum mit Blüte im April und roter Herbstfarbe. Schützt im Sommer, im Winter kaum.',
  },
  hecke: {
    name: 'Hainbuchenhecke', latin: 'Carpinus betulus, Schnitthecke', shape: 'box',
    stem: 0.0, top: 1.8, w: 4.0, d: 0.6, densS: 2.8, densW: 1.4, ever: false, marc: true, hedge: true,
    color: 0x4a7a33, growth: [[0.8, 1], [1, 1], [1, 1]], cut: true, maxNote: 'Schnittform. Ohne Schnitt wächst Hainbuche zum Baum.',
    info: 'Bis 2 m Höhe reichen 0,5 m Grenzabstand. Schützt nur bodennah.',
  },
  eibenhecke: {
    name: 'Eibenhecke', latin: 'Taxus baccata, Schnitthecke', shape: 'box',
    stem: 0.0, top: 1.8, w: 4.0, d: 0.6, densS: 3.5, densW: 3.5, ever: true, hedge: true,
    color: 0x2c5532, growth: [[0.55, 1], [0.8, 1], [1, 1]], cut: true, maxNote: 'Schnittform. Ohne Schnitt sehr langsam bis ca. 10 m.',
    info: 'Immergrün, sehr dicht. Bis 2 m Höhe reichen 0,5 m Grenzabstand. Giftig.',
  },
  liguster: {
    name: 'Liguster-Hecke', latin: "Ligustrum vulgare 'Atrovirens', Schnitthecke", shape: 'box',
    stem: 0.0, top: 3.0, w: 4.0, d: 0.8, densS: 3.0, densW: 2.0, ever: false, semi: true, hedge: true,
    color: 0x3b5c33, winterColor: 0x4f5638, growth: [[0.45, 1], [0.9, 1], [1, 1]], cut: true, max: [5, 3],
    maxNote: 'Ohne Schnitt 3–5 m hoch und 2–3 m breit.',
    info: 'Heimisch, sehr schnittverträglich, wächst 30–50 cm im Jahr. Wintergrün: behält das Laub meist bis ins Frühjahr, bei strengem Frost teilweise Laubfall. Beeren giftig.',
  },
  ligusterfrei: {
    name: 'Liguster freiwachsend', latin: "Ligustrum vulgare 'Atrovirens'", shape: 'ell',
    stem: 0.2, top: 3.5, w: 2.5, densS: 2.4, densW: 1.5, ever: false, semi: true,
    color: 0x41613a, winterColor: 0x535a3c, growth: [[0.4, 0.4], [0.8, 0.8], [1, 1]], max: [5, 3.5], multi: true,
    info: 'Lockerer, dichter Strauch, ohne Schnitt 3–5 m hoch und 2,5–3,5 m breit. Wintergrün, Blüte im Juni, schwarze Beeren (giftig).',
  },
  oelweide: {
    name: 'Schmalblättrige Ölweide', latin: 'Elaeagnus angustifolia', shape: 'ell',
    stem: 1.4, top: 5.5, w: 4.5, densS: 1.1, densW: 0.15, ever: false,
    color: 0x788a68, growth: [[0.5, 0.35], [0.8, 0.7], [1, 1]], max: [8, 6],
    info: 'Kleiner Baum mit silbrigem Laub und duftender Blüte im Juni. Sehr frosthart, will Sonne und eher trockenen Boden. Dornig, bildet teils Wurzelausläufer. Typisch 5–7 m hoch und 4–6 m breit, alt bis 10 m. Lockere Krone.',
  },
  oelweideW: {
    name: 'Wintergrüne Ölweide', latin: 'Elaeagnus × ebbingei', shape: 'ell',
    stem: 0.2, top: 3.0, w: 2.5, densS: 2.4, densW: 2.2, ever: true,
    color: 0x6b7c57, growth: [[0.35, 0.4], [0.75, 0.75], [1, 1]], max: [4, 3.5], multi: true,
    info: 'Immergrüner Strauch, Laub unten silbrig, Duftblüte im Herbst. 2–4 m hoch, 2–3,5 m breit. Nur bis ca. −15 °C frosthart: auf ca. 750 m geschützt pflanzen, Frostschäden in strengen Wintern möglich.',
  },
};

const STAGES = ['Pflanzung', 'nach ca. 5 Jahren', 'Zielbild (ca. 8–10 J.)', 'Endgröße ohne Schnitt (15–20 J.)'];

// ---- Geometrie-Helfer ----
function distPointSeg(pu, pv, a, b) {
  const du = b[0] - a[0], dv = b[1] - a[1];
  const L2 = du * du + dv * dv;
  let t = L2 ? ((pu - a[0]) * du + (pv - a[1]) * dv) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qu = a[0] + t * du - pu, qv = a[1] + t * dv - pv;
  return Math.hypot(qu, qv);
}
function distToBoundary(u, v) {
  const B = CFG.boundary; let m = Infinity;
  for (let i = 0; i < B.length - 1; i++) m = Math.min(m, distPointSeg(u, v, B[i], B[i + 1]));
  return m;
}
function inPoly(u, v, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ui, vi] = P[i], [uj, vj] = P[j];
    if ((vi > v) !== (vj > v) && u < (uj - ui) * (v - vi) / (vj - vi) + ui) c = !c;
  }
  return c;
}
function boundaryUAt(v) { // u der Grenze zum Nachbarn auf Höhe v (oberhalb des Versatzes, im Versatz, unterhalb)
  const B = CFG.boundary, seg = (a, b) => a[0] + (b[0] - a[0]) * (v - a[1]) / ((b[1] - a[1]) || 1e-9);
  if (v >= B[1][1]) return seg(B[0], B[1]);
  if (v >= B[2][1]) return B[2][0];
  for (let i = 3; i < B.length - 1; i++) if (v >= B[i][1]) return seg(B[i - 1], B[i]);
  return seg(B[B.length - 2], B[B.length - 1]);
}

// u der Kalksteinmauer-Stirn: Außenfläche der Terrassenmauer (5 cm vor dem Betonbalken) plus Lücke
function kalkU0() { return CFG.terrasse.over + 0.05 + CFG.kalk.gap; }
// ---- Aufmaß des Vermessers (16.01.2024, Höhen DHHN2016) in Modellkoordinaten ----
// P: Geländepunkte [u, v, Höhe m ü. NHN], T: Dreiecksnetz des Vermessers, bach: Wasserkante,
// zaun: aufgenommener Zaun an der Grenze zum Nachbarn, treppe/kanten/mauer: Bestandslinien 2024.
// Lage: Neubau-Ecke Süd liegt 0,70 m nordwestlich und 0,53 m bachseitig der Altbau-Ecke Südost. Hergeleitet aus
// Giebelabstand 1,55 m zur Grenze (Lageplan), Hauswand → Mauer 2,98 m (Meterstab) und der unveränderten Nordfassade.
const SURVEY = {
  P: [[-10.86,40.82,746.32],[2.11,38.68,746.23],[-18.67,35.8,746.48],[-17.7,34.66,746.5],[-17.55,33.4,746.54],[-16.85,32.63,746.55],[-10.19,30.96,746.49],[-6.22,30.17,746.53],[1.98,28.79,746.45],[0.1,31.25,746.3],[-6.09,32.17,746.41],[-10.81,33.54,746.47],[-6.13,32.03,746.51],[-0.02,31.12,746.45],[-4.88,31.87,746.42],[-4.92,31.76,746.52],[-10.69,31.84,746.52],[-12.39,31.99,746.53],[-12.82,31.26,746.6],[-8.1,26.0,746.26],[-11.39,26.16,746.28],[-12.3,23.54,746.21],[-12.88,21.7,746.15],[-14.58,18.39,746.33],[-15.5,18.32,746.27],[-16.24,10.02,746.47],[-12.79,11.46,746.35],[-1.72,12.54,746.42],[-0.11,11.13,746.59],[-0.39,17.3,746.37],[-0.99,21.4,746.44],[-0.66,21.1,746.39],[-0.24,27.27,746.53],[-4.11,26.78,746.35],[-5.29,19.53,746.3],[-9.83,18.19,746.25],[-12.7,10.02,746.42],[-10.38,9.61,746.43],[-0.03,9.85,746.46],[-19.35,17.64,746.53],[-16.95,7.09,746.32],[-17.19,2.57,745.99],[-21.68,3.12,746.25],[-21.25,7.31,746.55],[-16.72,-0.71,745.66],[-21.72,-0.23,744.01],[-21.75,-2.63,742.7],[-22.63,-4.65,741.78],[-22.72,-5.69,740.44],[-18.79,-4.17,742.83],[-16.86,-3.06,743.58],[-16.83,-6.28,742.08],[-12.72,-6.91,742.16],[-10.24,-7.37,742.21],[-10.25,-5.68,742.74],[-9.86,-3.42,744.08],[-6.3,-3.06,743.82],[-9.95,-7.81,741.59],[-9.56,-6.19,741.98],[-8.07,-6.4,741.66],[-5.66,-7.1,741.65],[-8.0,-9.09,740.48],[-3.41,-9.25,741.49],[1.33,-10.24,741.49],[1.42,-10.88,740.51],[5.05,-10.48,741.87],[4.89,-11.77,740.57],[5.12,-8.54,742.38],[1.96,-7.22,741.51],[-1.1,-7.17,741.54],[-4.31,-7.41,741.52],[-4.96,-6.54,741.82],[-6.53,-6.55,741.72],[-4.32,-7.12,741.96],[-4.37,-6.25,742.14],[-4.29,-3.03,743.98],[-2.0,-6.18,742.46],[0.03,-6.94,742.8],[0.65,-4.4,744.34],[1.72,-4.68,744.29],[0.58,-3.09,744.64],[1.95,0.2,745.76],[1.89,1.07,746.07],[5.0,-4.11,744.95],[1.74,-3.07,744.86],[1.75,-1.63,745.54],[5.06,-1.81,745.66],[5.04,1.35,745.88],[5.18,7.4,746.15],[1.54,7.57,746.48],[2.01,6.85,746.33],[1.98,3.41,746.1],[0.82,28.39,746.48],[2.03,-6.87,742.9],[1.33,11.17,746.5]],
  T: [[0,1,10],[0,2,11],[0,10,11],[1,9,14],[1,10,14],[2,3,11],[3,4,5],[3,5,17],[3,11,17],[5,18,20],[5,20,21],[5,21,39],[6,7,19],[6,7,12],[6,12,16],[6,18,20],[6,19,20],[7,8,13],[7,8,92],[7,12,15],[7,13,15],[7,19,33],[7,32,33],[7,32,92],[9,13,14],[10,11,12],[10,12,15],[10,14,15],[11,12,16],[11,16,17],[13,14,15],[19,20,21],[19,21,35],[19,33,34],[19,34,35],[21,22,39],[21,22,35],[22,23,35],[22,23,24],[22,24,39],[23,24,26],[23,26,35],[24,25,39],[24,25,26],[25,26,36],[25,39,43],[25,40,43],[26,36,37],[27,28,94],[27,28,38],[27,29,34],[27,29,94],[28,38,94],[29,31,34],[29,31,92],[29,92,94],[30,31,32],[30,31,34],[30,32,33],[30,33,34],[31,32,92],[40,41,42],[40,42,43],[41,42,45],[41,44,45],[42,45,46],[44,45,46],[44,46,49],[44,49,50],[46,47,49],[47,48,51],[47,49,51],[48,51,61],[49,50,51],[50,51,52],[50,52,55],[51,52,61],[52,53,54],[52,53,57],[52,54,55],[52,57,61],[53,54,58],[53,57,58],[54,55,56],[54,56,74],[54,58,59],[54,59,74],[56,74,75],[57,58,59],[59,72,74],[60,70,73],[60,71,72],[60,71,73],[61,62,64],[62,63,69],[62,63,64],[62,69,70],[63,64,65],[63,65,67],[63,67,68],[63,68,69],[64,65,66],[67,68,93],[67,83,93],[68,69,77],[68,77,93],[71,72,74],[71,73,74],[74,75,76],[75,76,80],[76,78,80],[77,79,93],[79,83,93],[79,83,84],[81,82,87],[81,85,86],[81,86,87],[82,87,91],[83,84,86],[84,85,86],[87,88,91],[88,89,90],[88,90,91]],
  bach: [[-22.72,-5.69],[-8.0,-9.09],[1.42,-10.88],[4.89,-11.77]],
  zaun: [[[5.18,7.4],[5.04,1.35]],[[5.04,1.35],[5.06,-1.81]],[[5.0,-4.11],[5.06,-1.81]],[[5.0,-4.11],[5.12,-8.54]],[[5.12,-8.54],[5.05,-10.48]]],
  treppe: [[[2.01,6.85],[0.7,6.85]],[[1.54,7.57],[0.7,7.57]],[[0.7,7.57],[0.7,6.94]],[[2.01,6.85],[1.54,7.57]],[[2.01,6.85],[1.98,3.41]],[[1.89,1.07],[1.95,0.2]],[[0.77,0.21],[1.95,0.2]],[[1.89,1.07],[0.7,1.07]],[[0.7,0.53],[0.77,0.21]],[[1.89,1.07],[1.98,3.41]],[[0.77,0.21],[0.67,-1.17]],[[1.95,0.2],[1.75,-1.63]],[[1.75,-1.63],[1.74,-3.07]],[[1.74,-3.07],[1.72,-4.68]],[[-1.81,-7.0],[1.72,-4.68]],[[-2.0,-6.18],[0.65,-4.4]],[[0.65,-4.4],[0.58,-3.09]],[[-1.81,-7.0],[-4.32,-7.12]],[[-4.32,-7.12],[-4.37,-6.25]],[[-4.37,-6.25],[-2.0,-6.18]]],
  kanten: [[[-22.63,-4.65],[-16.83,-6.28]],[[-12.72,-6.91],[-16.83,-6.28]],[[-12.72,-6.91],[-10.24,-7.37]],[[-10.24,-7.37],[-10.25,-5.68]],[[-10.24,-7.37],[-9.95,-7.81],[-6.54,-8.36],[-3.41,-9.25],[1.33,-10.24]],[[1.33,-10.24],[5.05,-10.48]],[[-1.81,-7.0],[0.03,-6.94]],[[-4.37,-6.25],[-10.25,-5.68]],[[-16.86,-3.06],[-16.62,-2.47]],[[2.03,-6.87],[0.03,-6.94]],[[1.96,-7.22],[2.03,-6.87]],[[1.75,-1.63],[5.06,-1.81]],[[-9.95,-7.81],[-9.56,-6.19]],[[-9.56,-6.19],[-8.07,-6.4],[-6.53,-6.55],[-5.66,-7.1],[-4.31,-7.41],[-1.1,-7.17],[1.96,-7.22],[1.33,-10.24]],[[-4.31,-7.41],[-4.32,-7.12]]],
  mauer: [[[-16.62,-2.47],[-7.35,-2.69],[-4.86,-2.59],[0.24,-2.55],[0.24,-1.15],[0.67,-1.17],[0.58,-3.09],[-4.29,-3.03],[-6.3,-3.06],[-9.86,-3.42],[-16.86,-3.06]]],
};
const TIN = (() => {
  const P = SURVEY.P, cnt = new Map();
  const tris = SURVEY.T.map(([a, b, c]) => {
    for (const [i, j] of [[a, b], [b, c], [a, c]]) { const k = Math.min(i, j) + '_' + Math.max(i, j); cnt.set(k, (cnt.get(k) || 0) + 1); }
    const A = P[a], B = P[b], C = P[c];
    return { A, B, C, det: (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]), u0: Math.min(A[0], B[0], C[0]), u1: Math.max(A[0], B[0], C[0]), v0: Math.min(A[1], B[1], C[1]), v1: Math.max(A[1], B[1], C[1]) };
  });
  return { tris, hull: [...cnt].filter(([, n]) => n === 1).map(([k]) => k.split('_').map(i => P[+i])) };
})();
// Höhe in m ü. NHN aus dem Aufmaß. Außerhalb des Netzes (Nachbargrund, frühere Gebäudeflächen): Höhe am nächsten Netzrand.
function surveyH(u, v) {
  for (const t of TIN.tris) {
    if (u < t.u0 || u > t.u1 || v < t.v0 || v > t.v1) continue;
    const l1 = ((t.B[1] - t.C[1]) * (u - t.C[0]) + (t.C[0] - t.B[0]) * (v - t.C[1])) / t.det, l2 = ((t.C[1] - t.A[1]) * (u - t.C[0]) + (t.A[0] - t.C[0]) * (v - t.C[1])) / t.det, l3 = 1 - l1 - l2;
    if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) return l1 * t.A[2] + l2 * t.B[2] + l3 * t.C[2];
  }
  let best = Infinity, h = 0;
  for (const [a, b] of TIN.hull) {
    const du = b[0] - a[0], dv = b[1] - a[1], L2 = du * du + dv * dv, t = L2 ? Math.max(0, Math.min(1, ((u - a[0]) * du + (v - a[1]) * dv) / L2)) : 0;
    const d = (u - a[0] - t * du) ** 2 + (v - a[1] - t * dv) ** 2;
    if (d < best) { best = d; h = a[2] + t * (b[2] - a[2]); }
  }
  return h;
}
function h0() { return CFG.survey.beam - CFG.terrasse.top; }   // m ü. NHN auf Modellhöhe 0
function bachLevel() { return CFG.bach.H - h0(); }           // Wasserspiegel in Modellhöhe

// ---- Gelände (Hang zum Bach) ----
function lerpPts(x, pts) { // stückweise linear; pts = [[x, y], ...] aufsteigend in x
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return b[0] - a[0] < 1e-9 ? b[1] : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
  return pts[pts.length - 1][1];
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));
// v der hausseitigen Wasserkante (Aufmaß), über die aufgenommenen Enden hinaus gerade verlängert
function waterV(u) {
  const Wl = SURVEY.bach, n = Wl.length; let a = Wl[n - 2], b = Wl[n - 1];
  for (let i = 1; i < n; i++) if (u <= Wl[i][0]) { a = Wl[i - 1]; b = Wl[i]; break; }
  return Math.min(CFG.bach.minV, a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]));
}
// Geländehöhe ohne die geplante Treppe (0 = Gelände am Südost-Giebel): Hang, Ufer und Fläche unter der Terrasse nach dem
// Aufmaß 2024. Seither gebaut und hier ergänzt: das aufgefüllte Beet hinter der Kalksteinmauer. Straßenseite und
// Giebelgarten bleiben wie im Sichtschutz-Modell eben auf 0.
function groundNat(u, v) {
  if (v >= 0.8) return 0;
  const K = CFG.kalk, B = CFG.bach, lvl = bachLevel(), s = v - waterV(u);
  if (s <= 0) { // Bachbett: beide Ufer fallen unter den Wasserspiegel, dahinter das Gegenufer (angenommen)
    if (s > -B.width) return lvl - Math.min(0.42, B.slope * Math.min(-s, B.width + s));
    return lvl + (B.far - lvl) * clamp01((-s - B.width) / 4);
  }
  let h = Math.max(surveyH(u, v) - h0(), lvl);
  const uK = kalkU0(), kv = K.v;
  if (v > kv + 0.05 && u > uK) {
    const uG = !CFG.stair.on && v > kv + K.d + 0.15 ? uK + 0.45 : uK;          // hinter dem Mauerkopf weitet sich die Lücke (heute: Paletten)
    const fNb = clamp01((u - boundaryUAt(v)) / 1.5);                           // auf dem Grund des Nachbarn läuft die Auffüllung aus (Annahme)
    h += (0 - h) * clamp01((u - uG) / 0.35) * (1 - fNb);
  }
  if (v > 0.2) h *= 1 - (v - 0.2) / 0.6;                                       // Übergang zur ebenen Fläche am Giebel
  return h;
}

// ---- Geplante Treppe: folgt dem bestehenden Weg mit seinem Bogen ----
// Achse: Podestkante → Knick des alten Wegs (v = -4,55) → schräg nach Westen → Wegende am Grillplatz → Ebene am Bach.
// Die Knicke sind mit dem Bogenradius ausgerundet. Alle Stufen sind gleich hoch; an den Bögen liegen Podeste auf der
// Höhe, die der bestehende Weg dort laut Aufmaß hat.
const STAIR_KINK_V = -4.55, STAIR_ROUTE = [[-1.9, -6.6], [-4.35, -6.7], [-4.35, -7.95]];
let _spKey = '', _sp = null;
function stairPlan() {
  const S = CFG.stair, T = CFG.terrasse, key = JSON.stringify([S, T, CFG.survey]);
  if (key === _spKey) return _sp;
  const u0 = T.over + 0.05 + S.side, u1 = u0 + S.w, uc = (u0 + u1) / 2, top = T.top, vTop = -Math.min(T.board, T.depth - 0.5), H0 = h0();
  const nodes = [[uc, vTop], [uc, STAIR_KINK_V], ...STAIR_ROUTE], path = [], arcs = [];
  const add = (u, v) => { const q = path[path.length - 1], d = q ? Math.hypot(u - q.u, v - q.v) : 0; if (!q || d > 1e-6) path.push({ u, v, s: q ? q.s + d : 0 }); };
  const line = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.05)); for (let i = 0; i <= n; i++) add(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n); };
  let cur = nodes[0];
  for (let i = 1; i < nodes.length - 1; i++) { // Knick i ausrunden
    const A = nodes[i - 1], N = nodes[i], B = nodes[i + 1], l0 = Math.hypot(N[0] - A[0], N[1] - A[1]), l1 = Math.hypot(B[0] - N[0], B[1] - N[1]);
    const d0 = [(N[0] - A[0]) / l0, (N[1] - A[1]) / l0], d1 = [(B[0] - N[0]) / l1, (B[1] - N[1]) / l1];
    const th = Math.acos(Math.max(-1, Math.min(1, d0[0] * d1[0] + d0[1] * d1[1]))), sg = Math.sign(d0[0] * d1[1] - d0[1] * d1[0]) || 1;
    const t = Math.min(S.r * Math.tan(th / 2), 0.45 * l0, 0.45 * l1), R = t / Math.tan(th / 2);
    const P0 = [N[0] - d0[0] * t, N[1] - d0[1] * t], C = [P0[0] - sg * d0[1] * R, P0[1] + sg * d0[0] * R];
    line(cur, P0); const sA = path[path.length - 1].s, a0 = Math.atan2(P0[1] - C[1], P0[0] - C[0]), n = Math.max(2, Math.ceil(R * th / 0.05));
    for (let k = 1; k <= n; k++) add(C[0] + R * Math.cos(a0 + sg * th * k / n), C[1] + R * Math.sin(a0 + sg * th * k / n));
    arcs.push({ s0: sA, s1: path[path.length - 1].s, R, th }); cur = [path[path.length - 1].u, path[path.length - 1].v];
  }
  line(cur, nodes[nodes.length - 1]);
  const L = path[path.length - 1].s, end = nodes[nodes.length - 1];
  const bot = surveyH(end[0], end[1]) - H0, H = Math.max(0.3, top - bot), n = Math.max(2, Math.round(H / S.s)), s = H / n;
  // Podeste an den Bögen: nach so vielen Steigungen, dass die Höhe des bestehenden Wegs am Knick getroffen wird
  const ks = []; let last = 0;
  for (let j = 1; j < nodes.length - 1; j++) { const k = Math.max(last + 1, Math.min(n - (nodes.length - 1 - j), Math.round((top - (surveyH(nodes[j][0], nodes[j][1]) - H0)) / s))); ks.push(k); last = k; }
  const steps = []; let sp = 0, li = 0;
  for (let i = 1; i < n; i++) {
    const land = i === ks[li], len = land ? Math.max(0.8, arcs[li].s1 + 0.1 - sp) : S.a; if (land) li++;
    steps.push({ i, z: top - i * s, s0: sp, s1: sp + len, land }); sp += len;
  }
  const slack = L - sp; // Rest der Achse: dem letzten Podest zuschlagen, damit die letzte Stufe am Wegende sitzt
  if (slack > 0) { let hit = false; for (const st of steps) { if (hit) { st.s0 += slack; st.s1 += slack; } else if (st.i === ks[ks.length - 1]) { st.s1 += slack; hit = true; } } }
  const us = path.map(q => q.u), vs = path.map(q => q.v);
  _spKey = key; _sp = { u0, u1, uc, top, vTop, bot, H, n, s, ks, steps, path, arcs, nodes, L, slack, sEnd: steps.length ? steps[steps.length - 1].s1 : 0,
    bb: [Math.min(...us) - 1.2, Math.max(...us) + 1.2, Math.min(...vs) - 1.2, Math.max(...vs) + 1.2] };
  return _sp;
}
function stairAt(P, s) { // Punkt und Richtung der Laufachse bei der Bogenlänge s (über die Enden hinaus gerade verlängert)
  const p = P.path; let i = 1;
  if (s > 0) { let lo = 1, hi = p.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (p[m].s < s) lo = m + 1; else hi = m; } i = lo; }
  const a = p[i - 1], b = p[i], d = b.s - a.s, tu = (b.u - a.u) / d, tv = (b.v - a.v) / d;
  return { u: a.u + tu * (s - a.s), v: a.v + tv * (s - a.s), tu, tv };
}
function stairProj(P, u, v) { // nächster Punkt der Laufachse: Bogenlänge s und Abstand d
  const p = P.path; let best = Infinity, sb = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], du = b.u - a.u, dv = b.v - a.v, L2 = du * du + dv * dv, t = Math.max(0, Math.min(1, ((u - a.u) * du + (v - a.v) * dv) / L2));
    const d = (u - a.u - t * du) ** 2 + (v - a.v - t * dv) ** 2;
    if (d < best) { best = d; sb = a.s + t * (b.s - a.s); }
  }
  return { s: sb, d: Math.sqrt(best) };
}
function stairZ(P, s) { // Höhe der Treppenoberfläche bei der Bogenlänge s
  if (s <= 0) return P.top;
  for (const st of P.steps) if (s < st.s1) return st.z;
  return P.bot;
}
// Gelände mit Treppe: nördlich der Podestkante aufgefüllt auf Giebelgarten-Niveau; entlang des Laufs abgetragen, wo der Boden höher liegt
function groundH(u, v) {
  const g = groundNat(u, v), S = CFG.stair;
  if (!S.on || v >= 0.8) return g;
  const P = stairPlan();
  if (v >= P.vTop + 0.02) return (u > CFG.terrasse.over - 0.03 && u <= kalkU0() + 0.4) ? 0 : g;
  if (u < P.bb[0] || u > P.bb[1] || v < P.bb[2] || v > P.bb[3]) return g;
  const q = stairProj(P, u, v);
  return q.d > S.w / 2 + 0.3 ? g : Math.min(g, stairZ(P, q.s + 0.27) - 0.06);
}
function stairChecks() {
  const S = CFG.stair, K = CFG.kalk, P = stairPlan(), sm = 2 * P.s + S.a, H0 = h0(), hw = S.w / 2;
  const lv = (ok, warn) => ok ? 'ok' : (warn ? 'warn' : 'bad');
  let maxFill = 0, iFill = 0, maxCut = 0, iCut = 0, inner = Infinity;
  for (const st of P.steps) {
    const m = stairAt(P, (st.s0 + st.s1) / 2), d = st.z - groundNat(m.u, m.v); // + = Trittfläche über dem Gelände laut Aufmaß
    if (d > maxFill) { maxFill = d; iFill = st.i; }
    if (-d > maxCut) { maxCut = -d; iCut = st.i; }
    if (!st.land) { const a = stairAt(P, st.s0), b = stairAt(P, st.s1); for (const sg of [-1, 1]) inner = Math.min(inner, Math.hypot(b.u - sg * b.tv * hw - (a.u - sg * a.tv * hw), b.v + sg * b.tu * hw - (a.v + sg * a.tu * hw))); }
  }
  const cuts = [0, ...P.ks, P.n], flight = Math.max(...cuts.slice(1).map((k, i) => k - cuts[i])), clear = K.gap - S.side - S.w;
  const lands = P.steps.filter(t => t.land).map((t, j) => ({ i: t.i, len: t.s1 - t.s0, plan: t.z + H0, ist: surveyH(P.nodes[j + 1][0], P.nodes[j + 1][1]) }));
  return {
    sm, smL: lv(sm >= 0.61 && sm <= 0.65, sm >= 0.59 && sm <= 0.67),
    sL: lv(P.s >= 0.14 && P.s <= 0.185, P.s >= 0.12 && P.s <= 0.195),
    aL: lv(S.a >= 0.26, S.a >= 0.23),
    inner, innerL: lv(inner >= 0.18, inner >= 0.10),
    slack: P.slack, fitL: lv(P.slack >= -0.05, P.slack >= -0.4),
    flight, flightL: lv(flight <= 18, flight <= 21),
    clear, wL: lv(clear >= 0.02 && S.w >= 0.8, clear >= 0 && S.w >= 0.6),
    maxFill, iFill, maxCut, iCut, podFill: P.top - groundNat(P.uc, P.vTop + 0.3),
    lands, blocks: P.steps.filter(t => !t.land).length, dBlock: P.s - S.s,
  };
}

// Wirksame Maße einer Pflanze im gewählten Zeitpunkt
function dims(p, stage) {
  const S = SPECIES[p.sp];
  if (stage === 3 && S.max && !S.cut) {
    return { stem: p.stem, top: Math.max(p.top, S.max[0]), w: Math.max(p.w, S.max[1]), d: Math.max(p.d || p.w, S.max[1]) };
  }
  const g = S.growth[stage] || [1, 1];
  const top = p.stem > 0.05 ? p.stem + (p.top - p.stem) * g[0] : p.top * g[0];
  return { stem: p.stem, top: Math.max(top, p.stem + 0.3), w: p.w * g[1], d: (p.d || S.d || p.w) * (S.shape === 'box' ? Math.max(0.7, g[1]) : g[1]) };
}
function crown(p, stage) { // Krone in Modellkoordinaten: steht auf dem Gelände am Standort
  const c = crown0(p, stage), z = groundH(p.u, p.v);
  if (!z) return c;
  if (c.shape === 'box') { c.min[2] += z; c.max[2] += z; } else if (c.shape === 'cyl') { c.h0 += z; c.h1 += z; } else c.c[2] += z;
  return c;
}
function crown0(p, stage) { // Krone relativ zum Fußpunkt der Pflanze
  const S = SPECIES[p.sp], D = dims(p, stage);
  if (S.shape === 'box') {
    const along = D.w / 2, across = D.d / 2;
    const rot = p.rot === 90;
    return { shape: 'box', min: [p.u - (rot ? along : across), p.v - (rot ? across : along), D.stem], max: [p.u + (rot ? along : across), p.v + (rot ? across : along), D.top] };
  }
  if (S.shape === 'cyl') return { shape: 'cyl', c: [p.u, p.v], r: D.w / 2, h0: Math.max(D.stem, 0), h1: D.top - D.w * 0.18 };
  return { shape: 'ell', c: [p.u, p.v, (D.stem + D.top) / 2], r: D.w / 2, rh: (D.top - D.stem) / 2 };
}

// Länge des Strahls o + t*d (t in [0,1]) innerhalb einer Krone
function segLen(o, d, cr) {
  let t0 = 0, t1 = 1;
  if (cr.shape === 'box') {
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < cr.min[i] || o[i] > cr.max[i]) return 0; continue; }
      let a = (cr.min[i] - o[i]) / d[i], b = (cr.max[i] - o[i]) / d[i];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 >= t1) return 0;
    }
  } else if (cr.shape === 'cyl') {
    const ou = o[0] - cr.c[0], ov = o[1] - cr.c[1];
    const A = d[0] * d[0] + d[1] * d[1], Bq = 2 * (ou * d[0] + ov * d[1]), C = ou * ou + ov * ov - cr.r * cr.r;
    if (A < 1e-12) { if (C > 0) return 0; } else {
      const disc = Bq * Bq - 4 * A * C; if (disc <= 0) return 0;
      const s = Math.sqrt(disc); t0 = Math.max(t0, (-Bq - s) / (2 * A)); t1 = Math.min(t1, (-Bq + s) / (2 * A));
      if (t0 >= t1) return 0;
    }
    if (Math.abs(d[2]) < 1e-9) { if (o[2] < cr.h0 || o[2] > cr.h1) return 0; } else {
      let a = (cr.h0 - o[2]) / d[2], b = (cr.h1 - o[2]) / d[2]; if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 >= t1) return 0;
    }
  } else {
    const q = [(o[0] - cr.c[0]) / cr.r, (o[1] - cr.c[1]) / cr.r, (o[2] - cr.c[2]) / cr.rh];
    const e = [d[0] / cr.r, d[1] / cr.r, d[2] / cr.rh];
    const A = e[0] * e[0] + e[1] * e[1] + e[2] * e[2], Bq = 2 * (q[0] * e[0] + q[1] * e[1] + q[2] * e[2]), C = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] - 1;
    const disc = Bq * Bq - 4 * A * C; if (disc <= 0) return 0;
    const s = Math.sqrt(disc); t0 = Math.max(t0, (-Bq - s) / (2 * A)); t1 = Math.min(t1, (-Bq + s) / (2 * A));
    if (t0 >= t1) return 0;
  }
  return (t1 - t0) * Math.hypot(d[0], d[1], d[2]);
}

function windowSources(win, level) {
  const H = CFG.haus, f = H.floor0 + (level === 'DG' ? H.dg : (level === 'EG' ? 0 : H.og));
  const out = [];
  for (const sv of [win.v0 + 0.2, (win.v0 + win.v1) / 2, win.v1 - 0.2])
    for (const eh of [CFG.eyeSit, CFG.eyeStand]) out.push([0.05, sv, f + eh]);
  return out;
}
function balconyTargets() {
  const b = CFG.balcony, out = [], n = 7;
  for (let i = 0; i < n; i++) {
    const u = b.u0 + 0.4 + (b.u1 - b.u0 - 0.8) * i / (n - 1);
    for (const v of [b.wallV - b.depth + 0.35, b.wallV - 0.45])
      for (const dh of [0.9, 1.25, 1.65]) out.push([u, v, b.floor + dh]);
  }
  return out;
}
function terraceTargets() {
  const t = CFG.terrace, out = [], nu = 6, nv = 3;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u = t.u0 + 0.4 + (t.u1 - t.u0 - 0.8) * i / (nu - 1), v = t.v0 + 0.4 + (t.v1 - t.v0 - 0.8) * j / (nv - 1);
    for (const h of [0.75, 1.2, 1.65]) out.push([u, v, h]);
  }
  return out;
}
function rayT(o, t, crowns) {
  const d = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  let tau = 0;
  for (const c of crowns) { const L = segLen(o, d, c.cr); if (L > 0) tau += L * c.k; }
  return Math.exp(-tau);
}
function prepCrowns(plants, season, stage) {
  return plants.map(p => { const S = SPECIES[p.sp]; return { cr: crown(p, stage), k: season === 'W' ? S.densW : S.densS }; }).concat(fixedCrowns());
}
function coverage(plants, season, stage, wins, level, targets) {
  const crowns = prepCrowns(plants, season, stage), T = targets === 'terrace' ? terraceTargets() : balconyTargets();
  return wins.map(w => {
    let s = 0, n = 0;
    for (const o of windowSources(w, level)) for (const t of T) { s += 1 - rayT(o, t, crowns); n++; }
    return { id: w.id, cov: s / n };
  });
}
function plantChecks(p) {
  const S = SPECIES[p.sp], msgs = [];
  let dB;
  if (S.hedge) { // Hecke: Mittellinie
    const half = p.w / 2; const ends = p.rot === 90 ? [[p.u - half, p.v], [p.u + half, p.v]] : [[p.u, p.v - half], [p.u, p.v + half]];
    dB = Infinity; for (let i = 0; i <= 10; i++) { const uu = ends[0][0] + (ends[1][0] - ends[0][0]) * i / 10, vv = ends[0][1] + (ends[1][1] - ends[0][1]) * i / 10; dB = Math.min(dB, distToBoundary(uu, vv)); }
  } else dB = distToBoundary(p.u, p.v);
  const hLegal = S.cut || !S.max ? p.top : Math.max(p.top, S.max[0]);
  const need = hLegal > 2.0 ? 2.0 : 0.5;
  const own = inPoly(p.u, p.v, CFG.parcel);
  const H = CFG.haus;
  const dHouse = (p.v >= H.v0 && p.v <= H.v1) ? p.u - H.u1 : Math.hypot(Math.max(0, p.u - H.u1), Math.max(0, H.v0 - p.v, p.v - H.v1));
  // Kronen-Grundriss bei Endgröße (Schnittformen: Zielgröße): Überhang zum Nachbarn und an die Hauswand
  const D = dims(p, 3), cr = crown(p, 3), pts = [];
  if (cr.shape === 'box') { for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) pts.push([cr.min[0] + (cr.max[0] - cr.min[0]) * i / 4, cr.min[1] + (cr.max[1] - cr.min[1]) * j / 4]); }
  else for (let i = 0; i < 24; i++) { const a = i / 24 * 2 * Math.PI; pts.push([p.u + Math.cos(a) * cr.r, p.v + Math.sin(a) * cr.r]); }
  let overhang = 0, facade = 0;
  for (const [u, v] of pts) {
    if (!inPoly(u, v, CFG.parcel)) overhang = Math.max(overhang, distToBoundary(u, v));
    if (u < H.u1 && v > H.v0 && v < H.v1) facade = Math.max(facade, H.u1 - u);
  }
  return { dB, need, hLegal, ok: own && dB >= need - 1e-6, own, dHouse, overhang, facade, maxTop: D.top, maxW: D.w };
}
if (typeof module !== 'undefined') module.exports = { CFG, SPECIES, STAGES, coverage, terraceTargets, plantChecks, distToBoundary, boundaryUAt, crown, crown0, dims, inPoly, groundH, groundNat, surveyH, waterV, h0, bachLevel, stairPlan, stairAt, stairZ, stairChecks, TIN, SURVEY };
// ===== CORE ENDE =====

// ===== APP =====
// ---------- Bedienfeld (rechte Leiste) und Einblendungen über der Szene ----------
const PANEL_HTML = `<h2 class="gtitle">Garten · Sichtschutz und Bachseite</h2>
    <div class="gctl">
      <div class="ctl"><label for="variant">Variante</label><select id="variant"></select></div>
      <div class="ctl"><span class="glbl" id="seasonLbl">Jahreszeit</span>
        <div class="seg" role="group" aria-labelledby="seasonLbl"><button id="sS" aria-pressed="true">Sommer</button><button id="sW" aria-pressed="false">Winter</button></div></div>
      <div class="ctl"><label for="stage">Wuchs</label><select id="stage"></select></div>
    </div>
    <div class="tabs" role="tablist" aria-label="Planung">
      <button role="tab" id="t-cov" aria-selected="true" aria-controls="p-cov">Sichtschutz</button>
      <button role="tab" id="t-pl" aria-selected="false" aria-controls="p-pl">Pflanzen</button>
      <button role="tab" id="t-st" aria-selected="false" aria-controls="p-st">Treppe</button>
      <button role="tab" id="t-as" aria-selected="false" aria-controls="p-as">Annahmen</button>
      <button role="tab" id="t-hi" aria-selected="false" aria-controls="p-hi">Hinweise</button>
    </div>

    <section class="tabpane" id="p-cov" role="tabpanel" aria-labelledby="t-cov">
      <div class="vdesc" id="vdesc"></div>
      <div class="vdesc">
        <h2 id="covTitle">Verdeckte Blickachsen</h2>
        <div class="row"><span class="glbl" id="tgtLbl">Ziel beim Nachbarn</span>
          <div class="seg" role="group" aria-labelledby="tgtLbl"><button id="tgB" aria-pressed="true">Balkon</button><button id="tgT" aria-pressed="false">Terrasse</button></div></div>
        <p class="small muted" id="covExplain"></p>
      </div>
      <div class="wins" id="wins"></div>
      <div>
        <h3>Dachgeschoss (zur Info)</h3>
        <div id="dgrows"></div>
      </div>
      <p class="small muted" id="covNote"></p>
    </section>

    <section class="tabpane" id="p-pl" role="tabpanel" aria-labelledby="t-pl" hidden>
      <div class="row">
        <select id="addSp" aria-label="Pflanzenart zum Hinzufügen"></select>
        <button class="btn primary" id="addBtn">Pflanze hinzufügen</button>
      </div>
      <p class="small muted">Lage: <b>vor Giebel</b> = Abstand von der Südost-Hauswand Richtung Nachbar. <b>ab Gartenecke</b> = Abstand von der Hausecke Süd (Gartenseite) Richtung Straße. Im Modell sind beide als 1-m-Raster auf dem Boden.</p>
      <div class="plist" id="plist"></div>
      <div id="editorWrap"></div>
      <div>
        <h3>Einkaufsliste dieser Variante</h3>
        <div class="tablewrap"><table id="shop"></table></div>
      </div>
      <div class="row">
        <button class="btn" id="copyBtn">Plan als Text kopieren</button>
        <button class="btn" id="resetBtn">Variante zurücksetzen</button>
      </div>
      <textarea id="copyFallback" hidden rows="5" style="width:100%;font-family:var(--font-mono);font-size:12px" aria-label="Plan als Text"></textarea>
    </section>

    <section class="tabpane" id="p-st" role="tabpanel" aria-labelledby="t-st" hidden>
      <div class="vdesc">
        <h2>Treppe zum Bach</h2>
        <p class="small muted">Beton-Blockstufen auf dem bestehenden Weg. Oben ein Podest auf Terrassenhöhe, von dem man auf die Terrasse und in den Giebelgarten kommt. Dann in der Lücke zwischen Terrassenmauer und Kalksteinmauer hinunter, im Bogen nach Westen wie die alte Treppe und weiter auf die Ebene am Bach, 1 m über dem Wasser.</p>
        <div class="row"><button class="btn" id="stView">Im Modell zeigen</button><label class="small"><input type="checkbox" id="st-on" style="accent-color:var(--accent)"> Treppe einblenden</label><label class="small"><input type="checkbox" id="st-old" style="accent-color:var(--accent)"> Bestehenden Weg mit Höhen zeigen</label></div>
      </div>
      <div><div class="tablewrap"><table id="stRes"></table></div></div>
      <div>
        <h3>Längsschnitt</h3>
        <div id="stSec"></div>
        <p class="small muted" id="stSecNote"></p>
      </div>
      <div><h3>Maße der Treppe</h3></div>
      <div class="assume" id="stFields"></div>
      <ul class="tight small" id="stNotes"></ul>
    </section>

    <section class="tabpane" id="p-as" role="tabpanel" aria-labelledby="t-as" hidden>
      <div>
        <h2>Annahmen prüfen</h2>
        <p class="small muted">Balkon und Terrasse des Nachbarn sind aus Fotos geschätzt. Als „EG 1“ rechne ich das Giebelfenster, das am nächsten zum Bach liegt (Küche laut Plan). Wenn du Balkon oder Terrasse nachmisst, hier eintragen: Modell und Prozentwerte rechnen sofort neu.</p>
      </div>
      <div class="assume" id="assume"></div>
      <div>
        <h2>Terrasse, Hang und Bach</h2>
        <p class="small muted">Lage und Höhen von Mauer, Hang, Bach und Grenzen stammen aus dem Aufmaß des Vermessers vom 16.01.2024 und sind fest hinterlegt. Änderbar ist, was seither gebaut wurde oder nur geschätzt ist. <span class="src v">Aufmaß</span> = vom Vermesser. <span class="src m">Meterstab</span> = im Foto abgelesen (± 5 cm). <span class="src g">geschätzt</span> = bitte nachmessen. <span class="src p">Plan</span> = aus dem Werkplan abgeleitet.</p>
      </div>
      <div class="assume" id="assume2"></div>
      <button class="btn" id="asReset">Annahmen zurücksetzen</button>
      <div>
        <h3>Aus Plänen und Karte übernommen</h3>
        <div class="tablewrap"><table>
          <tr><th>Wert</th><th>Maß</th><th>Quelle</th></tr>
          <tr><td>Haus Außenmaß</td><td class="n">13,54 × 9,60 m</td><td>Werkplan</td></tr>
          <tr><td>OG-Fußboden / Traufe / First</td><td class="n">+2,78 / +6,70 / +9,04 m</td><td>Schnitt</td></tr>
          <tr><td>OG-Fenster Südost-Giebel</td><td class="n">1,78–2,79 · 4,29–5,31 · 6,81–7,82 m</td><td>Fensterplan OG</td></tr>
          <tr><td>Brüstung / Fensterhöhe</td><td class="n">0,87 / 1,265 m</td><td>Fensterplan</td></tr>
          <tr><td>Giebel → Grenze (straßenseitig)</td><td class="n">1,55 m am Haus, 0,7 m an der Straße</td><td>Lageplan, Aufmaß</td></tr>
          <tr><td>Grenzversatz Richtung Nachbar</td><td class="n">3,74 m</td><td>Aufmaß</td></tr>
          <tr><td>Giebel → Grenze (gartenseitig)</td><td class="n">5,33 m</td><td>Aufmaß</td></tr>
          <tr><td>Versatz ab Gartenfassade</td><td class="n">7,6–8,0 m</td><td>Aufmaß</td></tr>
          <tr><td>Achse Giebel → Straße</td><td class="n">32° (NO)</td><td>Aufmaß</td></tr>
        </table></div>
      </div>
      <div>
        <h3>Aus dem Aufmaß (16.01.2024, Höhen in m ü. NHN)</h3>
        <div class="tablewrap"><table>
          <tr><th>Wert</th><th>Maß</th></tr>
          <tr><td>Gelände am Giebel, von der Straße zur Hausecke Süd</td><td class="n">746,48 → 746,07</td></tr>
          <tr><td>Terrasse alt, hinter der Mauer</td><td class="n">745,51–745,79</td></tr>
          <tr><td>Mauerfuß an der Bachseite</td><td class="n">743,58–744,08</td></tr>
          <tr><td>Mauerfuß an der Ecke Süd</td><td class="n">744,64</td></tr>
          <tr><td>Grillplatz</td><td class="n">741,6–742,0</td></tr>
          <tr><td>Ebene am Bach (im Plan „Schuppen“)</td><td class="n">741,5</td></tr>
          <tr><td>Wasserkante</td><td class="n">740,44–740,57</td></tr>
          <tr><td>Mauer bis Wasserkante, Ecke Süd / Nordwest-Ende</td><td class="n">7,9 m / 4,2 m</td></tr>
        </table></div>
        <p class="small muted">Lage des Neubaus im Aufmaß: Ecke Süd 0,70 m nordwestlich und 0,53 m bachseitig der alten Hausecke. Hergeleitet aus 1,55 m Giebelabstand zur Grenze (Lageplan) und 2,98 m von der Hauswand zur Mauer (Meterstab). Die Nordfassade liegt damit auf der alten Flucht. Höhe des Betonbalkens: Mauerfuß an der Ecke Süd (744,64) plus 1,65 m vom Meterstab.</p>
      </div>
      <div>
        <h3>In den Fotos am Meterstab abgelesen</h3>
        <div class="tablewrap"><table>
          <tr><th>Wert</th><th>Maß</th></tr>
          <tr><td>Terrassenmauer an der Ecke Süd, Boden bis OK Betonbalken</td><td class="n">1,65 m</td></tr>
          <tr><td>Betonbalken Höhe / Breite</td><td class="n">0,27 / 0,28 m</td></tr>
          <tr><td>OK Handlauf über OK Betonbalken</td><td class="n">0,88 m</td></tr>
          <tr><td>Terrasse: Hauswand bis Innenkante Balken</td><td class="n">2,65 m</td></tr>
          <tr><td>Seitliches Geländer (Südost), Länge</td><td class="n">2,1 m</td></tr>
          <tr><td>Lücke Terrassenmauer ↔ Kalksteinmauer</td><td class="n">0,9 m</td></tr>
          <tr><td>Kiesstreifen am Giebel bis zum Beet</td><td class="n">1,6 m</td></tr>
        </table></div>
      </div>
      <p class="small muted">Nicht modelliert: Gerüst, Möbel und Baumaterial auf der Terrasse, Balkongeländer des Nachbarn als Sichtschutz, Fenster und Türen des Nachbarn hinter dem Balkon. Der Hang zeigt den Stand des Aufmaßes vom Januar 2024, also vor dem Einbau der Jurakalk-Blöcke und der Terrassen im Hang. Ergänzt sind nur die obere Kalksteinmauer und das Beet. Die Höhen des bestehenden Wegs und der alten Treppe gelten nach deiner Angabe unverändert. Bachbreite und Gegenufer sind angenommen. Straßenseite und Giebelgarten sind als ebene Fläche gerechnet.</p>
    </section>

    <section class="tabpane" id="p-hi" role="tabpanel" aria-labelledby="t-hi" hidden>
      <div>
        <h2>Was das Modell zeigt</h2>
      </div>
      <ul class="tight small" id="insights"></ul>
      <div>
        <h3>Grenzabstand in Bayern (Art. 47 AGBGB)</h3>
      </div>
      <ul class="tight small">
        <li>Pflanzen bis 2 m Höhe: mindestens 0,5 m von der Grenze.</li>
        <li>Pflanzen über 2 m Höhe: mindestens 2 m von der Grenze, gemessen ab Stammmitte am Boden.</li>
        <li>Mit schriftlicher Zustimmung des Nachbarn geht auch weniger. Das Modell markiert solche Pflanzen gelb.</li>
        <li>Die Grenze verspringt auf Höhe des Schuppens um 3,5 m. Auch dieser Versatz zählt als Grenze.</li>
      </ul>
      <p class="note">Kurzfassung, keine Rechtsberatung. Vor dem Pflanzen bei der Gemeinde nachfragen, ob ein Bebauungsplan oder eine Satzung etwas anderes regelt.</p>
      <div><h3>Arten im Modell</h3></div>
      <div class="tablewrap"><table id="species"></table></div>
    </section>
  `;
const OVERLAY_HTML = `
    <nav class="views" id="views" aria-label="Ansichten im Garten"></nav>
    <div class="toast" id="toast" role="status"></div>
    <div class="hud">
      <div class="card-float sun">
        <span class="glbl">Sonne</span>
        <input type="range" id="sunT" min="5" max="21" step="0.25" value="11" aria-label="Uhrzeit Sonnenstand">
        <span class="mono" id="sunLbl">11:00</span>
      </div>
      <div class="card-float legend" id="legend">
        <span><i style="background:#d8432f"></i>Sicht frei</span>
        <span><i style="background:#e3a21a"></i>teilweise</span>
        <span><i style="background:#2e9a52"></i>verdeckt</span>
        <span><i style="background:#e8b84a;height:8px;opacity:.7"></i>&lt; 2 m zur Grenze</span>
      </div>
    </div>
    <div class="ghint">Ziehen dreht die Ansicht. Pflanze antippen und ziehen verschiebt sie.</div>
`;
// Elemente liegen in der rechten Leiste (auch wenn sie gerade nicht eingehängt ist) oder über der Szene
const panelEl = document.createElement('div'); panelEl.className = 'garden'; panelEl.innerHTML = PANEL_HTML;
const ovEl = document.createElement('div'); ovEl.className = 'gv'; ovEl.innerHTML = OVERLAY_HTML; api.overlayHost.appendChild(ovEl);
const $ = (id) => panelEl.querySelector('#' + id) || ovEl.querySelector('#' + id);
const fmt = (x, d = 1) => x.toFixed(d).replace('.', ',');
const clone = (o) => JSON.parse(JSON.stringify(o));
const CFG0 = clone(CFG);

// ---------- Varianten ----------
let pid = 1;
function mk(sp, u, v, o = {}) {
  const S = SPECIES[sp];
  return Object.assign({ id: 'p' + (pid++), sp, u, v, rot: 0, stem: S.stem, top: S.top, w: S.w, d: S.d || S.w }, o);
}
const VARIANTS = [
  { id: 'ist', name: 'Ist-Zustand (nur Zaun)', desc: 'Nur der vorhandene Zaun mit 1,8 m. So offen ist die Sicht zwischen OG und Balkon heute.', plants: () => [] },
  { id: 'A', name: 'A · Spalier-Hainbuchen', rec: true, desc: 'Drei Spalier-Hainbuchen 2,4 m vor dem Giebel, mind. 2 m von der Grenze. Die Krone sitzt genau im Sichtband zwischen 2,2 und 5,0 m. Darunter bleiben Garten und Erdgeschoss offen und hell.',
    plants: () => [mk('spalier', 2.4, 2.2), mk('spalier', 2.4, 4.0), mk('spalier', 2.4, 5.8)] },
  { id: 'B', name: 'B · Säulen-Hainbuchen', desc: 'Drei schmale Säulen 2,8 m vor dem Giebel. Deckt am meisten ab, auch für das Dachgeschoss. Dafür mehr Schatten auf Erdgeschoss und Vormittagssonne.',
    plants: () => [mk('saeule', 2.8, 1.9), mk('saeule', 2.8, 3.9), mk('saeule', 2.85, 5.85)] },
  { id: 'C', name: 'C · A + Bad-Ecke + Hecke', desc: 'Variante A plus ein quer gestelltes Spalier vor dem Badfenster (OG 3) und eine 1,8-m-Hainbuchenhecke entlang der Grenze. Das Eck-Spalier steht weniger als 2 m vom Grenzversatz: nur mit schriftlicher Zustimmung des Nachbarn.',
    plants: () => [mk('spalier', 2.4, 2.2), mk('spalier', 2.4, 4.0), mk('spalier', 2.4, 5.8), mk('spalier', 1.6, 7.45, { rot: 90, w: 1.6 }), mk('hecke', 4.3, 3.6, { w: 6.6 })] },
  { id: 'D', name: 'D · Locker und natürlich', desc: 'Mehrstämmige Felsenbirne, zwei Säulen-Hainbuchen und eine Eibenhecke mit 1,8 m. Wirkt weniger streng und schützt im Sommer gut, im Winter deutlich weniger.',
    plants: () => [mk('felsenbirne', 2.7, 5.4, { w: 3.0 }), mk('saeule', 2.85, 3.0), mk('saeule', 2.8, 1.0), mk('eibenhecke', 4.3, 3.6, { w: 6.6 })] },
  { id: 'E', name: 'E · Spalierwand an der Grenze', near: true, desc: 'Sechs Spalier-Hainbuchen 0,5–0,7 m vor der Grenze, als L entlang des Versatzes bis vor das Badfenster. Der Streifen am Haus bleibt ganz frei, und OG 3 ist mit abgedeckt. Alle sechs stehen unter 2 m zur Grenze: nur mit schriftlicher Zustimmung des Nachbarn.',
    plants: () => [mk('spalier', 4.4, 0.9), mk('spalier', 4.4, 2.7), mk('spalier', 4.4, 4.5), mk('spalier', 4.4, 6.3), mk('spalier', 3.4, 7.35, { rot: 90 }), mk('spalier', 1.6, 7.45, { rot: 90, w: 1.6 })] },
  { id: 'F', name: 'F · Liguster-Hochhecke 4,5 m', near: true, desc: 'Wintergrüne Liguster-Schnitthecke an der Grenze und entlang des Versatzes, auf 4,5 m gehalten. Bester Schutz im Winter. Liguster wird ohne Schnitt nur 3–5 m hoch: 4,5 m liegt nahe an seiner Endhöhe, braucht etwa 8 Jahre und zwei Schnitte im Jahr mit Gerüst. Beschattet den Streifen stark. Nur mit Zustimmung des Nachbarn.',
    plants: () => [mk('liguster', 4.5, 3.7, { w: 7.4, top: 4.5 }), mk('liguster', 2.85, 7.35, { rot: 90, w: 3.3, top: 4.5 })] },
  { id: 'G', name: 'G · Ölweiden und Liguster', near: true, desc: 'Zwei Schmalblättrige Ölweiden als kleine Bäume, ein freiwachsender Liguster vor dem Badfenster und eine 2-m-Ligusterhecke an der Grenze. Im Sommer der dichteste Schutz, im Winter bleibt vor allem der Liguster. Achtung Endgröße: Ölweiden werden 5–7 m hoch und 4–6 m breit. Im 4,9 m breiten Streifen ragen sie bis zu 2 m zum Nachbarn hinüber. Geht nur mit Zustimmung und jährlichem Rückschnitt.',
    plants: () => [mk('oelweide', 3.9, 1.8), mk('oelweide', 3.7, 5.8), mk('ligusterfrei', 2.0, 7.3, { top: 4.5 }), mk('liguster', 4.35, 3.7, { w: 7.0, top: 2.0, d: 0.7 })] },
  { id: 'H', name: 'H · Eine Ölweide am Versatz', near: true, desc: 'Dein Entwurf: eine Schmalblättrige Ölweide 3,7 m vor dem Giebel und 5,8 m ab der Gartenecke, durch Schnitt auf 5,0 m Höhe und 3,5 m Kronenbreite gehalten, Stamm 1,4 m. Deckt im Sommer OG 1 und OG 2 gut ab, im Winter nur etwa ein Drittel. OG 3 bleibt frei. Sie steht 1,3 m von der Grenze: nur mit Zustimmung des Nachbarn. Schon in Zielgröße ragt die Krone ca. 0,4 m hinüber; ohne Schnitt würde sie 8 m hoch und 6 m breit.',
    plants: () => [mk('oelweide', 3.7, 5.8, { top: 5.0, w: 3.5, d: 3.5, stem: 1.4 })] },
];

// ---------- Zustand ----------
const ST = {
  variant: 'A', season: 'S', stage: 2, plants: [], sel: null, showWin: 'OG2', view: 'overview', sunT: 11, target: 'balcony',
};
const LS_KEY = 'haus-garten-v1';
const SITE_KEYS = ['terrasse', 'kalk', 'bach', 'zaunNb', 'stair', 'survey'];
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ variant: ST.variant, plants: ST.plants, balcony: CFG.balcony, terrace: CFG.terrace, floor0: CFG.haus.floor0, lattice: CFG.lattice, site2: Object.fromEntries(SITE_KEYS.map(k => [k, CFG[k]])) })); } catch (e) { /* ignorieren */ }
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (!s || !Array.isArray(s.plants)) return false;
    ST.variant = s.variant || 'A';
    ST.plants = s.plants.filter(p => SPECIES[p.sp]);
    ST.plants.forEach(p => { const n = parseInt(String(p.id).slice(1), 10); if (n >= pid) pid = n + 1; });
    if (s.balcony) Object.assign(CFG.balcony, s.balcony);
    if (s.terrace) Object.assign(CFG.terrace, s.terrace);
    if (typeof s.floor0 === 'number') CFG.haus.floor0 = s.floor0;
    if (typeof s.lattice === 'boolean') CFG.lattice = s.lattice;
    if (s.site2) for (const k of SITE_KEYS) if (s.site2[k]) for (const [f, x] of Object.entries(s.site2[k])) if (f in CFG[k] && typeof x === typeof CFG[k][f] && (typeof x === 'boolean' || isFinite(x))) CFG[k][f] = x;
    return true;
  } catch (e) { return false; }
}

// ---------- Anbindung an die Szene des Hausmodells ----------
// root liegt in Gartenkoordinaten; Welt = lokal + root.position (x um 13,54 m, Höhe um FFB EG über Gelände verschoben)
const { canvas, camera, controls, sun, hemi } = api;
const root = api.root;
const OFF_X = api.houseLength;
function placeRoot() { root.position.set(OFF_X, -CFG.haus.floor0, 0); root.updateMatrixWorld(true); }
placeRoot();
const W = (u, h, v) => new THREE.Vector3(u, h, -v);
const toWorld = (p) => p.clone().add(root.position);              // lokaler Punkt → Welt
const toLocal = (p) => p.clone().sub(root.position);              // Welt → lokal
const req = () => api.requestRender();
const active = () => api.active();
// Im Garten die Kamera nie unter das Gelände
controls.addEventListener('change', () => {
  if (!active()) return;
  const l = toLocal(camera.position), m = surfaceH(l.x, -l.z) + 0.3 - CFG.haus.floor0;
  if (camera.position.y < m) camera.position.y = m;
});
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 170 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;

// ---------- Materialien ----------
const lam = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
const MAT = {
  plaster: lam(0xf1efe8), plinth: lam(0x77736c), larch: lam(0xc69863), larchDark: lam(0xb4844f),
  roofH: lam(0x6e3b2b), frame: lam(0x4a4541), glass: lam(0x3b4a56), sill: lam(0x5d5853),
  cream: lam(0xebe2cc), woodNb: lam(0x6a4730), roofNb: lam(0x5b4637), roofRed: lam(0x974b33),
  shed: lam(0x5a3a27), shedRoof: lam(0x6f706c), fence: lam(0x9d968a), fenceNew: lam(0xd9c49c), post: lam(0x2f5a3c),
  gate: lam(0xe7e5dd), balcony: lam(0x6c4e36), box: lam(0x8c2b58), awning: lam(0xe3d39f),
  trunk: lam(0x6b5442), branch: lam(0x5e4a3a), street: lam(0x8f8f8a), mountain: lam(0x9fb0bd), house: lam(0xd9d3c4),
  roofGrey: lam(0x6d5a4d), culm: lam(0x7a9a45),
};
function stoneTexture() { // Natursteinmauer: graue Bruchsteine in Mörtel, kachelbar in u
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), R = rng(11);
  x.fillStyle = '#8f8b82'; x.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256;) {
    const h = Math.min(256 - y, 38 + Math.round(R() * 22));
    for (let px = -Math.round(R() * 50); px < 256;) {
      const w = 44 + Math.round(R() * 70), l = 36 + R() * 20, hue = 205 + R() * 25, sat = 4 + R() * 6;
      for (const off of [0, 256]) {
        x.fillStyle = `hsl(${hue}, ${sat}%, ${l}%)`; x.fillRect(px + 3 - off, y + 3, w - 6, h - 6);
        x.fillStyle = `hsl(${hue}, ${sat}%, ${l + 9}%)`; x.fillRect(px + 3 - off, y + 3, w - 6, 4);
        x.fillStyle = `hsl(${hue}, ${sat}%, ${l - 9}%)`; x.fillRect(px + 3 - off, y + h - 8, w - 6, 5);
      }
      px += w;
    }
    y += h;
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
Object.assign(MAT, {
  stone: lam(0xffffff, { map: stoneTexture() }), concrete: lam(0xbdbab1), gravel: lam(0xa69e92), galv: lam(0xaab1b4),
  kalk: [lam(0xd6c69c), lam(0xc9b88c), lam(0xddcfaa)], water: lam(0x5f8ea6, { transparent: true, opacity: 0.9 }),
  pallet: lam(0x8a6f52), chest: lam(0x5e5046), stepC: lam(0x8f7466), deck: lam(0x8a7458), outer: lam(0x7b955a),
  glassNb: lam(0xa9c2b4, { transparent: true, opacity: 0.6 }), blockstep: lam(0xb7b4ac), stairBlock: lam(0xb7b4ac, { side: THREE.DoubleSide }), stairLand: lam(0xa9a69e, { side: THREE.DoubleSide }), stairBase: lam(0x7d7a74, { side: THREE.DoubleSide }),
});
function clearGroup(g) {
  g.traverse(o => { if (o.geometry && o.geometry !== ICO) o.geometry.dispose(); if (o.isSprite) { o.material.map.dispose(); o.material.dispose(); } });
  g.clear();
}
// Kasten mit Textur im Maßstab (tile = Meter je Kachel)
function texBox(u0, u1, v0, v1, h0, h1, mat, tile = 1.6) {
  const m = box(u0, u1, v0, v1, h0, h1, mat), uv = m.geometry.attributes.uv, dx = u1 - u0, dy = h1 - h0, dz = v1 - v0;
  const F = [[dz, dy], [dz, dy], [dx, dz], [dx, dz], [dx, dy], [dx, dy]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * F[f][0] / tile, uv.getY(k) * F[f][1] / tile); }
  uv.needsUpdate = true; return m;
}
function box(u0, u1, v0, v1, h0, h1, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, h1 - h0, v1 - v0), mat);
  m.position.copy(W((u0 + u1) / 2, (h0 + h1) / 2, (v0 + v1) / 2));
  m.castShadow = cast; m.receiveShadow = true; return m;
}
// Giebelkörper, First entlang u (Profil in v-h-Ebene)
function prismU(u0, u1, v0, v1, h0, eaveH, ridgeH, mat) {
  const vc = (v0 + v1) / 2, s = new THREE.Shape();
  s.moveTo(v0, h0); s.lineTo(v1, h0); s.lineTo(v1, eaveH); s.lineTo(vc, ridgeH); s.lineTo(v0, eaveH); s.lineTo(v0, h0);
  const g = new THREE.ExtrudeGeometry(s, { depth: u1 - u0, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.x = u0; m.castShadow = true; m.receiveShadow = true; return m;
}
// Giebelkörper, First entlang v (Profil in u-h-Ebene)
function prismV(u0, u1, v0, v1, h0, eaveH, ridgeH, mat) {
  const uc = (u0 + u1) / 2, s = new THREE.Shape();
  s.moveTo(u0, h0); s.lineTo(u1, h0); s.lineTo(u1, eaveH); s.lineTo(uc, ridgeH); s.lineTo(u0, eaveH); s.lineTo(u0, h0);
  const g = new THREE.ExtrudeGeometry(s, { depth: v1 - v0, bevelEnabled: false });
  const m = new THREE.Mesh(g, mat); m.position.z = -v1; m.castShadow = true; m.receiveShadow = true; return m;
}
function roof(axis, u0, u1, v0, v1, eaveH, ridgeH, ohE, ohG, mat, th = 0.28) {
  const grp = new THREE.Group();
  const span = axis === 'u' ? (v1 - v0) : (u1 - u0), half = span / 2, rise = ridgeH - eaveH, ang = Math.atan2(rise, half);
  const run = half + ohE, len = run / Math.cos(ang);
  const lenL = (axis === 'u' ? (u1 - u0) : (v1 - v0)) + 2 * ohG;
  for (const side of [-1, 1]) {
    const geo = axis === 'u' ? new THREE.BoxGeometry(lenL, th, len) : new THREE.BoxGeometry(len, th, lenL);
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
    const off = th / 2 / Math.cos(ang);
    const hm = ridgeH - (run / 2) * Math.tan(ang) + off;
    if (axis === 'u') {
      const vm = (v0 + v1) / 2 + side * run / 2;
      m.position.copy(W((u0 + u1) / 2, hm, vm)); m.rotation.x = side < 0 ? ang : -ang;
    } else {
      const um = (u0 + u1) / 2 + side * run / 2;
      m.position.copy(W(um, hm, (v0 + v1) / 2)); m.rotation.z = side < 0 ? ang : -ang;
    }
    grp.add(m);
  }
  return grp;
}
// Fenster in einer Fassade. face: '+u' | '-u' | '+v' | '-v'; a0..a1 entlang Fassade, h0..h1
function windowAt(face, plane, a0, a1, h0, h1, door = false) {
  const g = new THREE.Group(), t = 0.06, inset = 0.06;
  const mk = (b0, b1, c0, c1, e0, e1, mat) => {
    let m;
    if (face === '+u' || face === '-u') { const s = face === '+u' ? 1 : -1; m = box(plane + (s > 0 ? b0 : -b1), plane + (s > 0 ? b1 : -b0), c0, c1, e0, e1, mat, false); }
    else { const s = face === '+v' ? 1 : -1; m = box(c0, c1, plane + (s > 0 ? b0 : -b1), plane + (s > 0 ? b1 : -b0), e0, e1, mat, false); }
    g.add(m);
  };
  mk(0, t, a0, a1, h0, h1, MAT.frame);
  mk(t, t + 0.01, a0 + inset, a1 - inset, h0 + inset, h1 - inset, MAT.glass);
  if (!door) mk(0, 0.12, a0 - 0.03, a1 + 0.03, h0 - 0.05, h0, MAT.sill);
  return g;
}
function label(text, opts = {}) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), fs = opts.fs || 44;
  ctx.font = `700 ${fs}px "Source Sans 3", system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + fs, h = Math.ceil(fs * 1.6);
  c.width = w; c.height = h;
  ctx.font = `700 ${fs}px "Source Sans 3", system-ui, sans-serif`;
  ctx.fillStyle = opts.bg || 'rgba(28,36,29,0.82)';
  const r = h / 2; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(r, h); ctx.arc(r, r, r, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  ctx.fillStyle = opts.fg || '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: opts.depthTest !== false, transparent: true }));
  const sc = (opts.size || 0.55); sp.scale.set(sc * w / h, sc, 1); sp.renderOrder = 10; return sp;
}

// ---------- Boden (Lageplan als Textur) ----------
const GA = { u0: -32, u1: 36, v0: -26, v1: 42, px: 30 };
const gCanvas = document.createElement('canvas');
gCanvas.width = Math.round((GA.u1 - GA.u0) * GA.px); gCanvas.height = Math.round((GA.v1 - GA.v0) * GA.px);
const gTex = new THREE.CanvasTexture(gCanvas); gTex.anisotropy = 8;
const groundMat = new THREE.MeshLambertMaterial({ map: gTex });
const terrGrp = new THREE.Group(); root.add(terrGrp);
let ground = null;
function uniq(a) { a.sort((x, y) => x - y); return a.filter((x, i) => !i || x - a[i - 1] > 1e-4); }
// Gitter-Mesh über sortierten u-/v-Linien; hFn(u, v, i, j, nu, nv) liefert die Höhe
function gridMesh(us, vs, hFn, mat, withUV) {
  const nu = us.length, nv = vs.length, pos = new Float32Array(nu * nv * 3), uv = withUV ? new Float32Array(nu * nv * 2) : null, idx = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const k = j * nu + i, u = us[i], v = vs[j];
    pos[k * 3] = u; pos[k * 3 + 1] = hFn(u, v, i, j, nu, nv); pos[k * 3 + 2] = -v;
    if (uv) { uv[k * 2] = (u - GA.u0) / (GA.u1 - GA.u0); uv[k * 2 + 1] = (v - GA.v0) / (GA.v1 - GA.v0); }
  }
  for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nu - 1; i++) { const a = j * nu + i, b = a + 1, c = a + nu, d = c + 1; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
// Gelände: fein um Terrasse und Hang, grob im Lageplan-Ausschnitt, dazu das Umland und der Bach
function buildTerrain() {
  clearGroup(terrGrp);
  const T = CFG.terrasse, K = CFG.kalk, B = CFG.bach, e = 0.03, us = [GA.u0 - 0.01, GA.u1 + 0.01], vs = [GA.v0 - 0.01, GA.v1 + 0.01];
  for (let u = GA.u0; u <= GA.u1 + 1e-6; u += 1) us.push(u);
  for (let v = GA.v0; v <= GA.v1 + 1e-6; v += 1) vs.push(v);
  for (let u = Math.min(-17, T.uA - 3); u <= 9; u += 0.25) us.push(u);
  for (let v = -14; v <= 1.5; v += 0.25) vs.push(v);
  const kv = Math.max(K.v, -T.depth + 0.3), pair = (arr, x) => arr.push(x - 0.004, x + 0.004);
  [T.uA + e, T.over - e, kalkU0(), kalkU0() + 0.45].forEach(x => pair(us, x));
  [-T.depth + e, -e, kv + 0.05, kv + K.d + 0.15].forEach(x => pair(vs, x));
  if (CFG.stair.on) pair(vs, stairPlan().vTop + 0.02);
  ground = gridMesh(uniq(us), uniq(vs), (u, v, i, j, nu, nv) => groundH(u, v) - (i === 0 || j === 0 || i === nu - 1 || j === nv - 1 ? 1.5 : 0), groundMat, true);
  ground.receiveShadow = true; terrGrp.add(ground);
  const ou = [GA.u0, GA.u1], ov = [GA.v0, GA.v1];
  for (let u = -150; u <= 150; u += 1.5) ou.push(u);
  for (let v = -111; v <= 111; v += 1.5) ov.push(v);
  const inside = (u, v) => u > GA.u0 + 0.01 && u < GA.u1 - 0.01 && v > GA.v0 + 0.01 && v < GA.v1 - 0.01;
  const far = gridMesh(uniq(ou), uniq(ov), (u, v) => groundH(u, v) - (inside(u, v) ? 2.5 : 0.02), MAT.outer, false);
  far.receiveShadow = true; terrGrp.add(far);
  const wp = [], wn = [], wi = [];
  for (let u = -150, n = 0; u <= 150; u += 3, n++) {
    const vw = waterV(u), lvl = bachLevel(); wp.push(u, lvl, -(vw + 0.5), u, lvl, -(vw - B.width - 0.5)); wn.push(0, 1, 0, 0, 1, 0);
    if (n) { const a = (n - 1) * 2; wi.push(a, a + 3, a + 2, a, a + 1, a + 3); }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setAttribute('normal', new THREE.Float32BufferAttribute(wn, 3)); wg.setIndex(wi);
  const water = new THREE.Mesh(wg, MAT.water); water.receiveShadow = true; terrGrp.add(water);
  req();
}
// begehbare Oberfläche: Gelände bzw. Kies der Terrasse
function surfaceH(u, v) { const T = CFG.terrasse; return (u > T.uA && u < T.over && v > -T.depth && v < 0) ? T.top - T.fill : groundH(u, v); }
function drawGround() {
  const c = gCanvas.getContext('2d'), P = GA.px;
  const X = (u) => (u - GA.u0) * P, Y = (v) => (GA.v1 - v) * P;
  const poly = (pts, fill) => { c.beginPath(); pts.forEach(([u, v], i) => i ? c.lineTo(X(u), Y(v)) : c.moveTo(X(u), Y(v))); c.closePath(); c.fillStyle = fill; c.fill(); };
  const winter = ST.season === 'W';
  c.fillStyle = winter ? '#8a917a' : '#7b955a'; c.fillRect(0, 0, gCanvas.width, gCanvas.height);
  MAT.outer.color.set(winter ? 0x8a917a : 0x7b955a);
  poly(CFG.parcel, winter ? '#8f977f' : '#809c5d');
  // Strasse
  poly([[GA.u0, 30.6], [GA.u1, 30.6], [GA.u1, 37.4], [GA.u0, 37.4]], '#9b9a94');
  // Hang: Treppe/Rampe zwischen Terrassenmauer und Kalksteinmauer, Beet im Giebelgarten (Gründüngung)
  const T27 = CFG.terrasse, K = CFG.kalk, Bc = CFG.bach, ub = T27.over, uK = kalkU0(), kv = Math.max(K.v, -T27.depth + 0.3), vP = kv + K.d + 0.15;
  poly([[ub, -T27.depth - 0.5], [uK, -T27.depth - 0.5], [uK, vP], [uK + 0.45, vP], [uK + 0.45, 0.6], [ub, 0.6]], '#b2a792');
  poly([[uK, kv + 0.05], [boundaryUAt(kv) - 0.25, kv + 0.05], [boundaryUAt(7.7) - 0.25, 7.7], [1.6, 7.7], [1.6, 0.6], [uK + 0.45, 0.6], [uK + 0.45, vP], [uK, vP]], winter ? '#86876c' : '#6f9450');
  // Bach mit Böschungen, Gegenufer mit Weg
  const wline = (off) => { const a = []; for (let u = GA.u0; u <= GA.u1 + 1e-6; u += 1) a.push([u, waterV(u) + off]); return a; };
  const band = (o1, o0, fill) => poly(wline(o1).concat(wline(o0).reverse()), fill);
  band(0.7, 0, winter ? '#7f8468' : '#6f8a52');
  band(0, -Bc.width, '#5f8ea6');
  band(-Bc.width, -Bc.width - 2.6, winter ? '#7f8468' : '#6f8a52');
  band(-Bc.width - 4.6, -Bc.width - 6.0, '#b3aa98');
  // Bestand laut Aufmaß 2024: alte Treppe, Geländekanten, Ebenen am Bach
  c.strokeStyle = 'rgba(40,34,26,0.45)'; c.lineWidth = 1.5;
  for (const pl of SURVEY.treppe.concat(SURVEY.kanten)) { c.beginPath(); pl.forEach(([u, v], i) => i ? c.lineTo(X(u), Y(v)) : c.moveTo(X(u), Y(v))); c.stroke(); }
  c.fillStyle = 'rgba(28,36,29,0.8)'; c.font = `600 ${Math.round(0.3 * P)}px "Source Sans 3", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('Grillplatz 741,7', X(-7.3), Y(-7.25)); c.fillText('Ebene am Bach 741,5', X(-1.7), Y(-8.7));
  // Zufahrt / Gemeinschaftsfläche G
  poly([[-16.6, 9.6], [boundaryUAt(9.6), 9.6], [boundaryUAt(30.17), 30.17], [-16.4, 30.2]], '#aaa598');
  // Terrasse des Nachbarn (Annahme)
  const T = CFG.terrace; poly([[T.u0, T.v0], [T.u1, T.v0], [T.u1, T.v1], [T.u0, T.v1]], winter ? '#a59d8e' : '#b8ad99');
  c.strokeStyle = 'rgba(90,80,64,0.35)'; c.lineWidth = 1;
  for (let u = T.u0; u <= T.u1 + 1e-6; u += 0.5) { c.beginPath(); c.moveTo(X(u), Y(T.v0)); c.lineTo(X(u), Y(T.v1)); c.stroke(); }
  for (let v = T.v0; v <= T.v1 + 1e-6; v += 0.5) { c.beginPath(); c.moveTo(X(T.u0), Y(v)); c.lineTo(X(T.u1), Y(v)); c.stroke(); }
  // Kiesstreifen am Giebel
  poly([[0, 0], [ub, 0], [ub, 0.6], [1.6, 0.6], [1.6, 7.9], [boundaryUAt(9.6), 9.6], [0, 9.6]], '#bcae97');
  // Grenzabstands-Zonen (Art. 47 AGBGB)
  const img = c.getImageData(X(-0.6), Y(30.2), Math.ceil(7.2 * P), Math.ceil(42 * P));
  const d = img.data, wpx = img.width;
  for (let j = 0; j < img.height; j++) for (let i = 0; i < wpx; i++) {
    const u = -0.6 + (i + 0.5) / P, v = 30.2 - (j + 0.5) / P;
    if (!inPoly(u, v, CFG.parcel) || v < waterV(u) + 0.3) continue;
    const dd = distToBoundary(u, v);
    let a = 0, rgb = null;
    if (dd < 0.5) { rgb = [200, 86, 52]; a = 0.55; } else if (dd < 2.0) { rgb = [236, 186, 74]; a = 0.42; if (((i + j) % 18) < 2) a = 0.62; } else if (dd < 2.06) { rgb = [150, 104, 26]; a = 0.85; }
    if (!rgb) continue;
    const k = (j * wpx + i) * 4;
    d[k] = d[k] * (1 - a) + rgb[0] * a; d[k + 1] = d[k + 1] * (1 - a) + rgb[1] * a; d[k + 2] = d[k + 2] * (1 - a) + rgb[2] * a;
  }
  c.putImageData(img, X(-0.6), Y(30.2));
  // 1-m-Raster im Giebelgarten
  c.strokeStyle = 'rgba(255,255,255,0.32)'; c.lineWidth = 1;
  for (let u = 0; u <= 5; u++) { c.beginPath(); c.moveTo(X(u), Y(u < uK + 0.45 ? 0 : kv + K.d)); c.lineTo(X(u), Y(u <= 1.5 ? 9.6 : 7.6)); c.stroke(); }
  for (let v = Math.ceil(kv + K.d); v <= 9; v++) { c.beginPath(); c.moveTo(X(v < 0 ? uK + 0.45 : 0), Y(v)); c.lineTo(X(boundaryUAt(v)), Y(v)); c.stroke(); }
  // Masszahlen
  c.fillStyle = 'rgba(28,36,29,0.85)'; c.font = `600 ${Math.round(0.36 * P)}px "IBM Plex Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let u = 2; u <= 4; u++) c.fillText(u + ' m', X(u), Y(kv + K.d + 0.35));
  c.textAlign = 'left';
  for (let v = 0; v <= 8; v += 2) c.fillText(v + ' m', X(1.12), Y(v));
  // Grenze
  c.strokeStyle = '#8c2f22'; c.lineWidth = 0.12 * P; c.setLineDash([0.5 * P, 0.25 * P]);
  c.beginPath(); CFG.boundary.forEach(([u, v], i) => i ? c.lineTo(X(u), Y(v)) : c.moveTo(X(u), Y(v))); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#8c2f22'; CFG.boundary.forEach(([u, v]) => { c.beginPath(); c.arc(X(u), Y(v), 0.16 * P, 0, 7); c.fill(); });
  // Beschriftung entlang der 2-m-Linie
  const bA = CFG.boundary[CFG.boundary.length - 2], bB = CFG.boundary[CFG.boundary.length - 1], bRot = -Math.PI / 2 - Math.atan2(bA[0] - bB[0], bA[1] - bB[1]);
  c.save(); c.translate(X(boundaryUAt(-4.8) - 2.3), Y(-4.8)); c.rotate(bRot); c.fillStyle = 'rgba(120,80,14,0.95)'; c.textAlign = 'center';
  c.font = `700 ${Math.round(0.34 * P)}px "Source Sans 3", sans-serif`; c.fillText('2 m Grenzabstand (Pflanzen über 2 m)', 0, 0); c.restore();
  c.save(); c.translate(X(boundaryUAt(-4.8) + 0.35), Y(-4.8)); c.rotate(bRot); c.fillStyle = '#8c2f22'; c.textAlign = 'center';
  c.font = `700 ${Math.round(0.36 * P)}px "Source Sans 3", sans-serif`; c.fillText('Grenze zum Nachbarn', 0, 0); c.restore();
  gTex.needsUpdate = true; req();
}

// ---------- Gebäude ----------
const statics = new THREE.Group(); root.add(statics);
let houseNb = null, winLabels = null;
// Das Haus selbst kommt aus dem Hausmodell. Hier nur die Kennungen der OG-Fenster am Südost-Giebel.
function buildWinLabels() {
  if (winLabels) statics.remove(winLabels);
  const H = CFG.haus, g = new THREE.Group(), fo = H.floor0 + H.og;
  CFG.winOG.forEach((w, i) => { const l = label('OG ' + (i + 1), { size: 0.36, bg: 'rgba(156,90,34,0.92)' }); l.position.copy(W(0.25, fo + CFG.brh + CFG.winH + 0.32, (w.v0 + w.v1) / 2)); g.add(l); });
  winLabels = g; statics.add(g);
}
function railing(u0, u1, v0, v1, h, H = 1.0) {
  // Geländer: Pfosten + Stäbe auf drei Seiten (vorn, links, rechts)
  const g = new THREE.Group();
  const front = [[u0, v0], [u1, v0]], left = [[u0, v1], [u0, v0]], right = [[u1, v0], [u1, v1]];
  const geo = new THREE.BoxGeometry(0.05, H - 0.1, 0.05);
  let count = 0; const pts = [];
  for (const [[a0, b0], [a1, b1]] of [front, left, right]) {
    const L = Math.hypot(a1 - a0, b1 - b0), n = Math.max(2, Math.round(L / 0.13));
    for (let i = 0; i <= n; i++) pts.push([a0 + (a1 - a0) * i / n, b0 + (b1 - b0) * i / n]);
  }
  const im = new THREE.InstancedMesh(geo, MAT.balcony, pts.length); const M = new THREE.Matrix4();
  pts.forEach(([u, v], i) => { M.makeTranslation(u, h + (H - 0.1) / 2, -v); im.setMatrixAt(i, M); count++; });
  im.castShadow = true; g.add(im);
  g.add(box(u0 - 0.05, u1 + 0.05, v0 - 0.05, v0 + 0.06, h + H - 0.1, h + H, MAT.balcony));
  g.add(box(u0 - 0.05, u0 + 0.06, v0, v1, h + H - 0.1, h + H, MAT.balcony));
  g.add(box(u1 - 0.06, u1 + 0.05, v0, v1, h + H - 0.1, h + H, MAT.balcony));
  return g;
}
function lattice(u, v0, v1, h0, h1) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 192; const x = c.getContext('2d');
  x.strokeStyle = '#6c4e36'; x.lineWidth = 7;
  for (let i = -192; i < 320; i += 30) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 192, 192); x.stroke(); x.beginPath(); x.moveTo(i + 192, 0); x.lineTo(i, 192); x.stroke(); }
  x.lineWidth = 14; x.strokeRect(0, 0, 128, 192);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(v1 - v0, h1 - h0), new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
  m.rotation.y = Math.PI / 2; m.position.copy(W(u, (h0 + h1) / 2, (v0 + v1) / 2)); m.castShadow = true; return m;
}
function buildHouseNb() {
  if (houseNb) statics.remove(houseNb);
  const g = new THREE.Group(), B = CFG.balcony;
  const og = B.floor, eave = og + 2.65, ridge = eave + 1.55, wv = B.wallV;
  const u0 = 2.6, u1 = 11.6, v1 = 17.0, uw = 4.6;
  g.add(box(u0, u1, wv, v1, 0, og, MAT.cream));
  g.add(prismU(u0, uw, wv, v1, og, eave, ridge, MAT.cream));
  g.add(prismU(uw, u1, wv, v1, og, eave, ridge, MAT.woodNb));
  g.add(roof('u', u0, u1, wv, v1, eave, ridge, 1.1, 0.7, MAT.roofNb, 0.26));
  // Anbau mit rotem Dach
  g.add(box(u1, 14.6, 10.2, v1, 0, 3.0, MAT.cream));
  g.add(prismU(u1, 14.6, 10.2, v1, 3.0, 3.0, 4.4, MAT.cream));
  g.add(roof('u', u1, 14.6, 10.2, v1, 3.0, 4.4, 0.6, 0.4, MAT.roofRed, 0.2));
  // Flügel zur Strasse
  g.add(box(3.2, 10.9, v1, 25.5, 0, og, MAT.cream));
  g.add(prismV(3.2, 10.9, v1, 25.5, og, eave, ridge + 0.4, MAT.woodNb));
  g.add(roof('v', 3.2, 10.9, v1, 25.5, eave, ridge + 0.4, 0.9, 0.5, MAT.roofNb, 0.26));
  // Fenster EG / OG an der Balkonseite
  for (const [a, b] of [[5.2, 6.3], [7.2, 8.3], [9.3, 10.4]]) g.add(windowAt('-v', wv, a, b, 0.9, 2.1));
  g.add(windowAt('-v', wv, 3.2, 3.9, 1.0, 1.9));
  const doorU = Math.min(Math.max(B.u0 + 1.2, u0 + 0.6), u1 - 1.6);
  g.add(windowAt('-v', wv, doorU, doorU + 1.0, og, og + 2.1, true));
  for (let a = doorU + 1.5; a + 1.1 <= Math.min(B.u1, u1) - 0.3; a += 1.6) g.add(windowAt('-v', wv, a, a + 1.1, og + 0.9, og + 2.1));
  g.add(windowAt('-v', wv, 3.3, 4.0, og + 0.9, og + 2.0));
  // Balkon
  const bv0 = wv - B.depth;
  g.add(box(B.u0, B.u1, bv0, wv, og - 0.18, og, MAT.balcony));
  g.add(railing(B.u0, B.u1, bv0, wv, og));
  for (let a = B.u0 + 0.8; a < B.u1 - 0.5; a += 1.7) g.add(box(a, a + 0.6, bv0 - 0.16, bv0 - 0.02, og + 0.82, og + 1.0, MAT.box, false));
  if (CFG.lattice) g.add(lattice(B.u0 + 0.02, bv0 + 0.1, wv - 0.05, og + 1.0, og + 2.25));
  g.add(box(B.u0 + 0.4, B.u1 - 0.4, wv - 0.22, wv, og + 2.35, og + 2.5, MAT.awning, false));
  // Treppe vom Balkon nach Suedost
  const steps = 14, rise = og / steps, sU0 = B.u1, run = 0.25, sv0 = bv0 + 0.1, sv1 = bv0 + 1.1;
  for (let i = 0; i < steps; i++) { const h1 = og - i * rise; g.add(box(sU0 + i * run, sU0 + (i + 1) * run, sv0, sv1, h1 - rise - 0.05, h1 - rise + 0.04, MAT.balcony)); }
  const sl = steps * run, hyp = Math.hypot(sl, og);
  for (const vv of [sv0, sv1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(hyp, 0.06, 0.06), MAT.balcony);
    r.position.copy(W(sU0 + sl / 2, og / 2 + 0.95, vv)); r.rotation.z = -Math.atan2(og, sl); r.castShadow = true; g.add(r);
  }
  // Terrassenmöbel (Annahme)
  const T = CFG.terrace, tu = Math.min(T.u1 - 1.0, Math.max(T.u0 + 1.0, T.u0 + 2.4)), tv = Math.max(T.v0 + 0.9, Math.min(T.v1 - 0.9, bv0 - 0.9));
  g.add(box(tu - 0.45, tu + 0.45, tv - 0.45, tv + 0.45, 0.72, 0.76, MAT.balcony));
  g.add(box(tu - 0.04, tu + 0.04, tv - 0.04, tv + 0.04, 0, 0.72, MAT.frame));
  for (const [du, dv] of [[-0.8, 0], [0.8, 0], [0, -0.8], [0, 0.8]]) {
    g.add(box(tu + du - 0.22, tu + du + 0.22, tv + dv - 0.22, tv + dv + 0.22, 0.42, 0.47, MAT.frame));
    const bu = du ? Math.sign(du) * 0.2 : 0, bv = dv ? Math.sign(dv) * 0.2 : 0;
    if (du) g.add(box(tu + du + bu - 0.03, tu + du + bu + 0.03, tv - 0.22, tv + 0.22, 0.47, 0.9, MAT.frame));
    else g.add(box(tu - 0.22, tu + 0.22, tv + dv + bv - 0.03, tv + dv + bv + 0.03, 0.47, 0.9, MAT.frame));
  }
  const lt = label('Nachbarterrasse', { size: 0.4, bg: 'rgba(178,63,44,0.92)' }); lt.position.copy(W(tu, 2.1, tv)); g.add(lt);
  // Schuppen am Grenzversatz
  g.add(box(1.85, 4.95, 8.05, wv - 0.02, 0, 2.35, MAT.shed));
  const sr = box(1.7, 5.1, 7.85, wv, 2.35, 2.47, MAT.shedRoof); g.add(sr);
  const lab = label('Nachbar', { size: 0.75 }); lab.position.copy(W(8, ridge + 1.0, 13)); g.add(lab);
  const lb = label('Nachbarbalkon', { size: 0.42, bg: 'rgba(178,63,44,0.92)' }); lb.position.copy(W((B.u0 + B.u1) / 2, og + 2.9, bv0 + 0.3)); g.add(lb);
  houseNb = g; statics.add(g);
}
function fenceAlong(a, b, h, mat, panel = 1.8, offset = 0.15) {
  const g = new THREE.Group();
  const du = b[0] - a[0], dv = b[1] - a[1], L = Math.hypot(du, dv), n = Math.max(1, Math.round(L / panel));
  const nu = -dv / L, nv = du / L; // Normale Richtung Nachbar (+u)
  const ang = Math.atan2(dv, du); // Drehung um y (Welt-z = -v)
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
    const pu = a[0] + du * tm + nu * offset, pv = a[1] + dv * tm + nv * offset;
    const m = new THREE.Mesh(new THREE.BoxGeometry(L / n - 0.06, h, 0.035), mat);
    m.position.copy(W(pu, h / 2, pv)); m.rotation.y = ang; m.castShadow = true; m.receiveShadow = true; g.add(m);
    const qu = a[0] + du * t0 + nu * offset, qv = a[1] + dv * t0 + nv * offset;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, h + 0.08, 0.08), MAT.post); p.position.copy(W(qu, (h + 0.08) / 2, qv)); p.castShadow = true; g.add(p);
  }
  return g;
}
function lerpB(v) { return [boundaryUAt(v), v]; }
// ---------- Bachseite: Terrasse, Balkon, Kalksteinmauer, Zäune (nach Fotos vom 11.11.) ----------
const siteGrp = new THREE.Group(); root.add(siteGrp);
// Geländer der Terrasse: verzinkte Pfosten außen am Betonbalken, zwei Lärchenriegel, wahlweise senkrechte Latten
function railT(a, b, out, base, H, postAt, slats) {
  const g = new THREE.Group(), du = b[0] - a[0], dv = b[1] - a[1], L = Math.hypot(du, dv), ang = Math.atan2(dv, du);
  const at = (t, off) => [a[0] + du * t / L + out[0] * off, a[1] + dv * t / L + out[1] * off];
  for (const hc of [base + 0.26, base + H - 0.045]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.09, 0.045), MAT.larch), [pu, pv] = at(L / 2, 0.085);
    m.position.copy(W(pu, hc, pv)); m.rotation.y = ang; m.castShadow = true; g.add(m);
  }
  for (const t of postAt) {
    const [pu, pv] = at(t, 0.03), po = new THREE.Mesh(new THREE.BoxGeometry(0.06, H + 0.2, 0.05), MAT.galv);
    po.position.copy(W(pu, base - 0.22 + (H + 0.2) / 2, pv)); po.rotation.y = ang; po.castShadow = true; g.add(po);
    const [qu, qv] = at(t, 0.006), pl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.012), MAT.galv);
    pl.position.copy(W(qu, base - 0.14, qv)); pl.rotation.y = ang; g.add(pl);
  }
  if (slats) {
    const n = Math.max(1, Math.round(L / 0.095)), im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, H + 0.17, 0.028), MAT.larch, n), M = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const [pu, pv] = at((i + 0.5) * L / n, 0.122); M.makeRotationY(ang); M.setPosition(W(pu, base - 0.11 + (H + 0.17) / 2, pv)); im.setMatrixAt(i, M); }
    im.castShadow = true; g.add(im);
  }
  return g;
}
function buildTerrasse(g) {
  const T = CFG.terrasse, ub = T.over, vT = -T.depth, top = T.top, wallTop = top - T.curbH, floor = top - T.fill, c = T.curb;
  let hBot = 0; for (let u = T.uA; u <= ub; u += 0.5) hBot = Math.min(hBot, groundNat(u, vT - 0.3));
  hBot -= 0.8; const vB = -Math.min(T.board, T.depth - 0.5);
  // Natursteinmauer (steht 5 cm vor dem Betonbalken), Kiesfläche, Betonbalken, Holzbohle am Südost-Ende
  g.add(texBox(T.uA - 0.05, ub + 0.05, vT - 0.05, 0, hBot, wallTop, MAT.stone));
  g.add(box(T.uA, ub, vT, 0, wallTop, floor, MAT.gravel, false));
  g.add(box(T.uA, ub, vT, vT + c, wallTop, top, MAT.concrete));
  g.add(box(ub - c, ub, vT + c, vB, wallTop, top, MAT.concrete));
  g.add(box(T.uA, T.uA + c, vT + c, 0, wallTop, top, MAT.concrete));
  g.add(box(ub - 0.05, ub, vB, 0, wallTop + 0.03, top - 0.03, MAT.larchDark));
  const posts = (L, sp = 1.35) => { const n = Math.max(1, Math.round((L - 0.5) / sp)), a = []; for (let i = 0; i <= n; i++) a.push(0.25 + (L - 0.5) * i / n); return a; };
  g.add(railT([T.uA - 0.11, vT], [ub + 0.11, vT], [0, -1], top, T.rail, posts(ub - T.uA + 0.22), true));   // Bachseite, mit Latten
  const ls = Math.min(T.sideRail, T.depth - 0.2);
  g.add(railT([ub, vT - 0.11], [ub, vT + ls], [1, 0], top, T.rail, [0.59, Math.min(1.69, ls - 0.1)], false)); // Südost: Latten fehlen noch
  g.add(railT([T.uA, vT - 0.11], [T.uA, -0.05], [-1, 0], top, T.rail, posts(T.depth), true));               // Nordwest-Ende (Annahme)
  const lb = label('Terrasse', { size: 0.4, bg: 'rgba(156,90,34,0.92)' }); lb.position.copy(W((T.uA + ub) / 2, top + T.rail + 0.45, vT - 0.2)); g.add(lb);
}
function buildKalk(g) {
  const T = CFG.terrasse, K = CFG.kalk, R = rng(31), uK = kalkU0(), kv = Math.max(K.v, -T.depth + 0.3), hc = K.h / 3, uEnd = boundaryUAt(kv) - 0.35;
  // Kalksteinmauer: drei Lagen grobe Blöcke, untere Lagen stehen etwas vor
  for (let c = 0; c < 3; c++) {
    const z0 = -K.h + c * hc, front = kv - (2 - c) * 0.05;
    for (let u = uK - (2 - c) * 0.04; u < uEnd - 0.2;) {
      let len = 0.75 + R() * 0.5; if (uEnd - (u + len) < 0.45) len = uEnd - u;
      g.add(box(u, u + len - 0.02, front + R() * 0.03, kv + K.d, z0 - (c ? 0 : 0.2), z0 + hc - 0.012 + (c === 2 ? 0.06 : 0), MAT.kalk[Math.floor(R() * 3)]));
      u += len;
    }
  }
  // kleine Einfassungen am Hang darunter (Lage geschätzt)
  for (const [dv, n] of [[-2.2, 5], [-3.9, 3]]) for (let i = 0; i < n; i++) {
    const u = uK + 0.1 + i * 0.5, v = kv + dv, z = groundH(u + 0.22, v);
    g.add(box(u, u + 0.46, v - 0.11, v + 0.11, z - 0.15, z + 0.2, MAT.kalk[i % 3]));
  }
  if (CFG.stair.on) return; // mit der geplanten Treppe entfallen die alten Betonkanten und die Paletten
  // alte Betonkanten als Stufen zwischen Terrassenmauer und Kalksteinmauer
  for (let v = -T.depth + 0.25; v < Math.min(-0.5, kv + 1.0); v += 0.42) { const z = groundH((T.over + uK) / 2, v); g.add(box(T.over + 0.1, uK - 0.05, v - 0.03, v + 0.03, z - 0.14, z + 0.07, MAT.stepC)); }
  // Paletten mit Truhe oben an der Lücke (stehen dort im Foto)
  const pu = T.over + 0.15, va = kv + 0.7, za = groundH(pu + 0.6, va + 0.3) - 0.02, vb = va + 0.85, zb = groundH(pu + 0.6, vb + 0.3) - 0.02;
  for (let i = 0; i < 2; i++) g.add(box(pu, pu + 1.2, va, va + 0.8, za + i * 0.15, za + i * 0.15 + 0.14, MAT.pallet));
  g.add(box(pu + 0.1, pu + 1.1, va + 0.12, va + 0.68, za + 0.29, za + 0.79, MAT.chest));
  g.add(box(pu, pu + 1.2, vb, vb + 0.8, zb, zb + 0.14, MAT.pallet));
}
function buildFences(g) {
  // Sichtschutzelemente des Nachbarn (alt grau, zwei neue helle mit grünen Pfosten), Gartentür, alter Staketenzaun bis zur Böschung
  const F = CFG.zaunNb, v1 = Math.min(7.0, Math.max(F.newV1, F.newV0 + 0.9));
  const seg = (va, vb, h, mat, panel) => {
    const n = Math.max(1, Math.round((va - vb) / panel));
    for (let i = 0; i < n; i++) {
      const a = va - (va - vb) * i / n, b = va - (va - vb) * (i + 1) / n, f = fenceAlong(lerpB(a), lerpB(b), h, mat, panel + 2);
      f.position.y = groundH(boundaryUAt((a + b) / 2) + 0.15, (a + b) / 2); g.add(f);
    }
  };
  seg(CFG.boundary[2][1], v1, 1.8, MAT.fence, 1.8);
  seg(v1, F.newV0, 1.8, MAT.fenceNew, 1.8);
  g.add(fenceAlong(lerpB(5.9), lerpB(5.0), 1.75, MAT.gate, 1.0, 0.1));
  const pts = []; // alter Staketenzaun: Verlauf aus dem Aufmaß, steht 0,2–0,3 m innerhalb der Grenze auf unserem Grund
  for (const [a, b] of SURVEY.zaun) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 0.09)); for (let i = 0; i < n; i++) { const u = a[0] + (b[0] - a[0]) * i / n, v = a[1] + (b[1] - a[1]) * i / n; pts.push([u, v, groundH(u, v)]); } }
  const pk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 1.0, 0.045), MAT.fence, pts.length), rl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.05, 0.1), MAT.fence, pts.length * 2), M = new THREE.Matrix4();
  pts.forEach(([u, v, z], i) => {
    M.makeTranslation(u, z + 0.52, -v); pk.setMatrixAt(i, M);
    M.makeTranslation(u - 0.025, z + 0.3, -v); rl.setMatrixAt(i * 2, M); M.makeTranslation(u - 0.025, z + 0.78, -v); rl.setMatrixAt(i * 2 + 1, M);
  });
  pk.castShadow = true; g.add(pk, rl);
}
function buildPavilionNb(g) {
  // Gartenhaus des Nachbarn Richtung Bach: nur Kulisse, Lage und Größe aus einem Foto geschätzt
  const u0 = 8.0, u1 = 11.4, v0 = -5.8, v1 = -1.0, hp = -0.25, zmin = Math.min(groundH(u0, v0 - 0.3), groundH(u1, v0 - 0.3)) - 0.4;
  g.add(box(u0 - 0.3, u1 + 0.3, v0 - 0.3, v1 + 0.3, zmin, hp, MAT.deck));
  g.add(box(u0 + 0.03, u1 - 0.03, v0 + 0.03, v1 - 0.03, hp, hp + 0.8, MAT.fenceNew));
  g.add(box(u0 + 0.03, u1 - 0.03, v0 + 0.03, v1 - 0.03, hp + 0.8, hp + 2.25, MAT.glassNb, false));
  const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
  for (const [a, b] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1], [um, v0], [um, v1], [u0, vm], [u1, vm]]) g.add(box(a - 0.06, a + 0.06, b - 0.06, b + 0.06, hp, hp + 2.3, MAT.post));
  g.add(box(u0 - 0.5, u1 + 0.5, v0 - 0.5, v1 + 0.5, hp + 2.3, hp + 2.42, MAT.roofNb));
}
// Körper entlang der Laufachse zwischen den Bogenlängen sA und sB (im Bogen keilförmig), Breite 2·hw, Höhe zBot…zTop
function prismAlong(P, sA, sB, zTop, zBot, mat, hw) {
  const n = Math.max(1, Math.ceil((sB - sA) / 0.12)), pos = [], idx = [];
  for (let j = 0; j <= n; j++) {
    const q = stairAt(P, sA + (sB - sA) * j / n), lu = q.u - q.tv * hw, lv = q.v + q.tu * hw, ru = q.u + q.tv * hw, rv = q.v - q.tu * hw;
    pos.push(lu, zTop, -lv, ru, zTop, -rv, lu, zBot, -lv, ru, zBot, -rv);
  }
  for (let j = 0; j < n; j++) { const a = j * 4, b = a + 4; idx.push(a, a + 1, b + 1, a, b + 1, b, a, b, b + 2, a, b + 2, a + 2, a + 1, a + 3, b + 3, a + 1, b + 3, b + 1); }
  const e = n * 4; idx.push(0, 2, 3, 0, 3, 1, e, e + 1, e + 3, e, e + 3, e + 2);
  let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  geo = geo.toNonIndexed(); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
// Geplante Treppe: Podest oben, Blockstufen und Podeste entlang des bestehenden Wegs, jeweils mit Unterbau bis zum Boden
function buildStair(g) {
  if (!CFG.stair.on) return;
  const S = CFG.stair, T = CFG.terrasse, P = stairPlan(), uE = kalkU0(), hw = S.w / 2;
  g.add(box(T.over, uE, P.vTop, 0, P.top - 0.16, P.top, MAT.blockstep));                       // Podest auf Terrassenhöhe
  for (const st of P.steps) {
    const th = st.land ? 0.12 : P.s; let gm = Infinity;
    for (let k = 0; k <= 4; k++) { const q = stairAt(P, st.s0 + (st.s1 - st.s0) * k / 4); gm = Math.min(gm, groundH(q.u, q.v), groundNat(q.u, q.v)); }
    g.add(prismAlong(P, st.s0 - 0.03, st.s1, st.z, st.z - th, st.land ? MAT.stairLand : MAT.stairBlock, hw));
    g.add(prismAlong(P, st.s0, st.s1, st.z - th, Math.min(st.z - th - 0.08, gm - 0.05), MAT.stairBase, hw - 0.01));
  }
  const lb = label('Treppe (geplant)', { size: 0.36, bg: 'rgba(60,66,70,0.92)' }); lb.position.copy(W(P.uc, P.top + 0.75, P.vTop - 0.5)); g.add(lb);
}
// Bestehender Weg laut Aufmaß 2024 (alte Treppe in der Lücke, schräg hinunter zum Grillplatz). Seine Höhen gelten weiter;
// der Hang daneben ist seither mit Jurakalk-Blöcken terrassiert und im Modell noch auf dem Stand des Aufmaßes.
// Die geplante Treppe folgt diesem Weg.
const OLD_PATH = [[1.2, -1.4], [1.2, -3.08], [1.2, -4.55], [-1.9, -6.6], [-4.35, -6.7], [-7.3, -7.25], [-1.7, -8.7]];
function buildOldPath(g) {
  if (!CFG.stair.showOld) return;
  const mat = new THREE.LineBasicMaterial({ color: 0xd2601a });
  for (const pl of SURVEY.treppe) for (let i = 1; i < pl.length; i++) {
    const a = pl[i - 1], b = pl[i]; if (Math.max(a[1], b[1]) > 0.3) continue; // nur der Teil am Hang
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2)), pts = [];
    for (let k = 0; k <= n; k++) { const u = a[0] + (b[0] - a[0]) * k / n, v = a[1] + (b[1] - a[1]) * k / n; pts.push(W(u, Math.max(groundH(u, v), groundNat(u, v)) + 0.07, v)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  for (const [u, v] of OLD_PATH) { const lb = label(fmt(surveyH(u, v), 2), { size: 0.24, bg: 'rgba(178,82,20,0.92)', depthTest: false }); lb.position.copy(W(u, groundNat(u, v) + 0.45, v)); g.add(lb); }
}
function buildSite() {
  clearGroup(siteGrp);
  buildTerrasse(siteGrp); buildKalk(siteGrp); buildFences(siteGrp); buildPavilionNb(siteGrp); buildStair(siteGrp); buildOldPath(siteGrp);
  const B = CFG.bach, lb = label('Bach', { size: 0.5, bg: 'rgba(52,104,130,0.92)' }); lb.position.copy(W(-3, bachLevel() + 1.3, waterV(-3) - B.width / 2)); siteGrp.add(lb);
  req();
}
function buildContext() {
  // Garage
  statics.add(box(-5.0, 1.25, 14.8, 23.0, 0, 2.6, MAT.larchDark));
  statics.add(prismV(-5.0, 1.25, 14.8, 23.0, 2.6, 2.6, 4.4, MAT.larchDark));
  statics.add(roof('v', -5.0, 1.25, 14.8, 23.0, 2.6, 4.4, 0.6, 0.6, MAT.roofRed, 0.2));
  statics.add(windowAt('-v', 14.8, -0.6, 0.3, 0.02, 2.0, true));
  // weitere Nachbarhäuser (nur Volumen)
  for (const [a0, a1, b0, b1] of [[-28.5, -19.5, 9.0, 18.0], [22.0, 31.0, 9.5, 19.0]]) {
    statics.add(box(a0, a1, b0, b1, 0, 5.4, MAT.house));
    statics.add(prismU(a0, a1, b0, b1, 5.4, 5.4, 7.6, MAT.house));
    statics.add(roof('u', a0, a1, b0, b1, 5.4, 7.6, 0.9, 0.7, MAT.roofGrey, 0.24));
  }
  // Strasse
  const st = box(-60, 70, 30.6, 37.4, 0, 0.03, MAT.street, false); statics.add(st);
  // Berge (Richtung Sueden, mit Dunst)
  const mts = [[-60, -150, 48, 70], [10, -175, 60, 85], [80, -140, 40, 65], [-120, -95, 35, 55], [140, -110, 45, 60]];
  for (const [u, v, h, r] of mts) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), MAT.mountain); m.position.copy(W(u, h / 2 - 2, v)); statics.add(m);
  }
}
// ---------- Umgebungsbäume ----------
const ctxTrees = new THREE.Group(); root.add(ctxTrees);
const ICO = new THREE.IcosahedronGeometry(1, 0);
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function buildCtxTrees() {
  ctxTrees.clear();
  const R = rng(7), winter = ST.season === 'W';
  const spots = [];
  // Bäume am Gegenufer
  for (let u = -30; u <= 34; u += 4.2) { const uu = u + R() * 2, vv = waterV(uu) - CFG.bach.width - 0.8 - R() * 2.0, hh = 9 + R() * 8; if (uu < -27 || uu > 23) spots.push([uu, vv, hh]); } // vor Haus und Giebelgarten ausgespart (Blick von der Bachseite)
  spots.push([16.5, 20, 13], [-14, 26, 8], [27, -2, 10], [-22, -1, 9]);
  for (const [u, v, h] of spots) {
    const g = new THREE.Group(); g.position.copy(W(u, groundH(u, v), v));
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h * 0.6, 6), MAT.trunk); tr.position.y = h * 0.3; tr.castShadow = true; g.add(tr);
    const n = winter ? 0 : 14, im = new THREE.InstancedMesh(ICO, lam(0xffffff, { flatShading: true }), Math.max(n, 1)); im.count = n;
    const M = new THREE.Matrix4(), col = new THREE.Color(), rr = h * 0.28;
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, r = Math.sqrt(R()) * rr, y = h * 0.62 + (R() - 0.3) * h * 0.38;
      const s = rr * (0.45 + R() * 0.3);
      M.compose(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, 0)), new THREE.Vector3(s, s * 0.9, s));
      im.setMatrixAt(i, M); col.setHSL(0.24 + R() * 0.06, 0.38, 0.33 + R() * 0.08); im.setColorAt(i, col);
    }
    im.castShadow = true; g.add(im);
    if (winter) for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, h * 0.45, 4), MAT.branch);
      const a = i / 6 * 6.28; b.position.set(Math.cos(a) * h * 0.08, h * 0.68, Math.sin(a) * h * 0.08); b.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(b);
    }
    ctxTrees.add(g);
  }
  req();
}

// ---------- Pflanzen ----------
const plantGrp = new THREE.Group(); root.add(plantGrp);
const plantObjs = new Map();
const MAT_LEAF = lam(0xffffff, { flatShading: true });
function crownProfile(S, t) { // t 0..1 Höhe in der Krone, Rückgabe Radius-Faktor
  if (S.latin.startsWith('Fargesia')) return 0.45 + 0.55 * Math.sqrt(Math.sin(Math.min(1, t * 1.1) * Math.PI / 2)) * (t > 0.85 ? (1 - (t - 0.85) / 0.15 * 0.6) : 1);
  return Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 3)), 1 / 3);
}
function buildPlant(p) {
  const S = SPECIES[p.sp], D = dims(p, ST.stage), cr = crown0(p, ST.stage), winter = ST.season === 'W';
  const R = rng(hashStr(p.id + p.sp));
  const g = new THREE.Group(); g.position.copy(W(p.u, groundH(p.u, p.v), p.v)); g.userData.pid = p.id;
  const pts = [];
  const leafVisible = !winter || S.ever ? 1 : (S.semi ? 0.85 : (S.marc ? 0.5 : 0));
  // Stämme / Halme
  const addTrunk = (x, z, h, r) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 6), MAT.trunk); t.position.set(x, h / 2, z); t.castShadow = true; g.add(t); };
  if (S.shape === 'box' && !S.hedge) addTrunk(0, 0, D.stem + 0.4, 0.07);
  else if (S.multi) { for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.3, b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, D.top * 0.75, 5), MAT.trunk); b.position.set(Math.cos(a) * 0.35, D.top * 0.36, Math.sin(a) * 0.35); b.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); b.castShadow = true; g.add(b); } }
  else if (S.latin.startsWith('Fargesia')) { const n = 26; const geo = new THREE.CylinderGeometry(0.012, 0.018, 1, 4); const im = new THREE.InstancedMesh(geo, MAT.culm, n); const M = new THREE.Matrix4(); for (let i = 0; i < n; i++) { const a = R() * 6.28, r = R() * D.w * 0.18, h = D.top * (0.75 + R() * 0.25), lean = 0.12 + R() * 0.12; M.compose(new THREE.Vector3(Math.cos(a) * (r + h * lean * 0.5), h / 2, Math.sin(a) * (r + h * lean * 0.5)), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a) * lean, 0, -Math.cos(a) * lean)), new THREE.Vector3(1, h, 1)); im.setMatrixAt(i, M); } g.add(im); }
  else if (!S.hedge) addTrunk(0, 0, Math.max(0.6, D.stem + 0.8), 0.08);
  // Laubwolken
  const clump = S.hedge ? 0.2 : (S.latin.startsWith('Fargesia') ? 0.17 : 0.23);
  const sp = clump * 1.18;
  if (cr.shape === 'box') {
    const lu = cr.max[0] - cr.min[0], lv = cr.max[1] - cr.min[1];
    const steps = (a, b) => { const n = Math.max(1, Math.round((b - a) / sp)); return Array.from({ length: n }, (_, i) => a + (i + 0.5) * (b - a) / n); };
    for (const x of steps(-lu / 2, lu / 2)) for (const z of steps(-lv / 2, lv / 2)) for (const y of steps(cr.min[2], cr.max[2]))
      pts.push([x + (R() - 0.5) * 0.12, y + (R() - 0.5) * 0.12, -(z + (R() - 0.5) * 0.12)]);
  } else {
    const h0 = cr.shape === 'cyl' ? cr.h0 : cr.c[2] - cr.rh, h1 = cr.shape === 'cyl' ? D.top : cr.c[2] + cr.rh, r = cr.r;
    const nz = Math.max(3, Math.round((h1 - h0) / (sp * 0.9)));
    for (let k = 0; k < nz; k++) {
      const t = (k + 0.5) / nz, y = h0 + t * (h1 - h0);
      const rf = cr.shape === 'ell' ? Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 2))) : crownProfile(S, t);
      const rr = Math.max(0.12, r * rf - clump * 0.55);
      const ring = Math.max(3, Math.round(2 * Math.PI * rr / sp));
      for (let i = 0; i < ring; i++) { const a = i / ring * 6.283 + R() * 0.5; pts.push([Math.cos(a) * rr, y + (R() - 0.5) * 0.15, -Math.sin(a) * rr]); }
      if (rr > sp * 1.2) { const inner = Math.round(ring / 2.5); for (let i = 0; i < inner; i++) { const a = R() * 6.283, q = rr * 0.45; pts.push([Math.cos(a) * q, y, -Math.sin(a) * q]); } }
    }
  }
  const keep = pts.filter(() => R() < leafVisible);
  const im = new THREE.InstancedMesh(ICO, MAT_LEAF, Math.max(1, keep.length)); im.count = keep.length;
  const M = new THREE.Matrix4(), col = new THREE.Color(S.color), hsl = {}; col.getHSL(hsl);
  const brown = new THREE.Color(S.semi ? S.winterColor : 0xa7804c), bh = {}; brown.getHSL(bh);
  keep.forEach((q, i) => {
    const s = clump * (0.85 + R() * 0.4);
    M.compose(new THREE.Vector3(q[0], q[1], q[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)), new THREE.Vector3(s, s * 0.92, s));
    im.setMatrixAt(i, M);
    const c = new THREE.Color();
    if (winter && !S.ever) c.setHSL(bh.h + (R() - 0.5) * 0.03, bh.s * (0.8 + R() * 0.3), bh.l * (0.85 + R() * 0.3));
    else c.setHSL(hsl.h + (R() - 0.5) * 0.04, hsl.s * (0.85 + R() * 0.3), hsl.l * (0.82 + R() * 0.4));
    im.setColorAt(i, c);
  });
  im.castShadow = true; im.receiveShadow = true; im.userData.pid = p.id; g.add(im);
  // Astgerüst im Winter
  if (winter && !S.ever && !S.semi) {
    const add = (x0, y0, z0, x1, y1, z1, r) => { const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), L = a.distanceTo(b); const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, L, 4), MAT.branch); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); m.castShadow = true; g.add(m); };
    if (cr.shape === 'box' && !S.hedge) {
      const along = p.rot === 90 ? 'x' : 'z', half = D.w / 2;
      for (let y = D.stem + 0.25; y < D.top; y += 0.55) along === 'x' ? add(-half, y, 0, half, y, 0, 0.025) : add(0, y, -half, 0, y, half, 0.025);
      add(0, D.stem, 0, 0, D.top, 0, 0.05);
    } else if (cr.shape === 'cyl') {
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; add(0, cr.h0 + 0.3, 0, Math.cos(a) * cr.r * 0.6, D.top - 0.3, Math.sin(a) * cr.r * 0.6, 0.03); }
    } else if (cr.shape === 'ell') {
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; add(Math.cos(a) * 0.3, D.top * 0.45, Math.sin(a) * 0.3, Math.cos(a) * cr.r * 0.85, D.top * (0.75 + (i % 3) * 0.08), Math.sin(a) * cr.r * 0.85, 0.03); }
    }
  }
  // Nummer
  const n = ST.plants.indexOf(p) + 1;
  const chk = plantChecks(p);
  const lb = label(String(n), { size: 0.42, bg: chk.ok ? 'rgba(28,36,29,0.88)' : 'rgba(176,112,22,0.95)', depthTest: false });
  lb.position.set(0, D.top + 0.45, 0); lb.userData.plantLabel = true; lb.visible = active() && (!firstPerson() || ST.view === 'plan'); g.add(lb);
  // Auswahlrahmen
  if (ST.sel === p.id) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.42, 28), new THREE.MeshBasicMaterial({ color: 0xd9822b, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    const bb = new THREE.Box3();
    if (cr.shape === 'box') bb.set(new THREE.Vector3(cr.min[0] - p.u, cr.min[2], -(cr.max[1] - p.v)), new THREE.Vector3(cr.max[0] - p.u, cr.max[2], -(cr.min[1] - p.v)));
    else { const h0 = cr.shape === 'cyl' ? cr.h0 : cr.c[2] - cr.rh, h1 = cr.shape === 'cyl' ? D.top : cr.c[2] + cr.rh; bb.set(new THREE.Vector3(-cr.r, h0, -cr.r), new THREE.Vector3(cr.r, h1, cr.r)); }
    const helper = new THREE.Box3Helper(bb, 0xd9822b); g.add(helper);
    // Endgröße ohne Schnitt als durchscheinende Hülle
    const gm = new THREE.MeshBasicMaterial({ color: 0xd9822b, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    let ghost = null;
    if (S.max && !S.cut && ST.stage !== 3) {
      const c3 = crown0(p, 3), D3 = dims(p, 3);
      if (c3.shape === 'ell') { ghost = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), gm); ghost.scale.set(c3.r, c3.rh, c3.r); ghost.position.y = c3.c[2]; }
      else if (c3.shape === 'cyl') { ghost = new THREE.Mesh(new THREE.CylinderGeometry(c3.r, c3.r, D3.top - c3.h0, 24), gm); ghost.position.y = (D3.top + c3.h0) / 2; }
    } else if (S.cut && S.max && S.shape === 'box') {
      const along = p.rot === 90, w = p.w, d = S.max[1];
      ghost = new THREE.Mesh(new THREE.BoxGeometry(along ? w : d, S.max[0], along ? d : w), gm); ghost.position.y = S.max[0] / 2;
    }
    if (ghost) {
      ghost.renderOrder = 3; ghost.raycast = () => {}; g.add(ghost);
      const wire = new THREE.Mesh(ghost.geometry, new THREE.MeshBasicMaterial({ color: 0xd9822b, wireframe: true, transparent: true, opacity: 0.35, depthWrite: false }));
      wire.position.copy(ghost.position); wire.scale.copy(ghost.scale); wire.raycast = () => {}; g.add(wire);
    }
  }
  return g;
}
function rebuildPlants() {
  plantGrp.clear(); plantObjs.clear();
  for (const p of ST.plants) { const g = buildPlant(p); plantGrp.add(g); plantObjs.set(p.id, g); }
  req();
}

// ---------- Sichtlinien ----------
const sightGrp = new THREE.Group(); root.add(sightGrp);
function allWins() { return [[CFG.winEG[0], 'EG']].concat(CFG.winOG.map(w => [w, 'OG']), CFG.winDG.map(w => [w, 'DG'])); }
function targetsNow() { return ST.target === 'terrace' ? terraceTargets() : balconyTargets(); }
function rebuildSight() {
  sightGrp.clear();
  const found = allWins().find(([w]) => w.id === ST.showWin);
  if (!found) { req(); return; }
  const [w, lvl] = found;
  const crowns = prepCrowns(ST.plants, ST.season, ST.stage), T = targetsNow(), srcs = windowSources(w, lvl);
  const eye = srcs[3];
  const pos = [], cols = [], cc = new THREE.Color();
  const colorFor = (t) => t > 0.66 ? cc.set(0xd8432f) : (t > 0.33 ? cc.set(0xe3a21a) : cc.set(0x2e9a52));
  for (const t of T) {
    const tr = rayT(eye, t, crowns); colorFor(tr);
    const a = W(eye[0], eye[2], eye[1]), b = W(t[0], t[2], t[1]);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z); cols.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
  }
  const inWin = WIN.includes(ST.view);
  sightGrp.visible = active() && ST.view !== 'nbBalk' && ST.view !== 'nbTerr';
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }));
  lines.renderOrder = 5; lines.visible = !inWin; sightGrp.add(lines);
  const dotGeo = new THREE.SphereGeometry(0.07, 8, 6);
  for (const t of T) {
    let s = 0; for (const o of srcs) s += rayT(o, t, crowns); s /= srcs.length;
    const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: colorFor(s).getHex() })); m.position.copy(W(t[0], t[2], t[1])); sightGrp.add(m);
  }
  const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0x9c5a22 })); e.position.copy(W(eye[0], eye[2], eye[1])); sightGrp.add(e);
  req();
}

// ---------- Sonne ----------
function sunDir(season, clock) {
  const lat = 48 * Math.PI / 180, lon = 12; // gerundet (keine Koordinaten im Repo), Fehler unter 0,3°
  const dec = (season === 'W' ? -23.44 : 23.44) * Math.PI / 180;
  const dst = season === 'W' ? 0 : 1;
  const solar = clock - dst - (15 - lon) / 15;
  const H = (solar - 12) * 15 * Math.PI / 180;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) + Math.PI;
  const b = az - CFG.bearingV * Math.PI / 180;
  return { u: Math.cos(alt) * Math.sin(b), v: Math.cos(alt) * Math.cos(b), h: Math.sin(alt), alt: alt * 180 / Math.PI, az: az * 180 / Math.PI };
}
function updateSun() {
  const s = sunDir(ST.season, ST.sunT);
  const c = W(-3, 0, 3);
  sun.position.copy(toWorld(W(-3 + s.u * 80, Math.max(s.h, 0.02) * 80, 3 + s.v * 80)));
  sun.target.position.copy(toWorld(c)); sun.target.updateMatrixWorld();
  const up = Math.max(0, Math.min(1, s.alt / 8));
  sun.intensity = 0.95 * up; hemi.intensity = 0.6 + 0.25 * up;
  const hh = Math.floor(ST.sunT), mm = Math.round((ST.sunT - hh) * 60);
  $('sunLbl').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` + (s.alt < 0 ? ' · Nacht' : '');
  $('sunT').setAttribute('aria-valuetext', `${hh} Uhr ${mm}, Sonnenhöhe ${Math.round(s.alt)} Grad`);
  req();
}

// ---------- Kamera-Ansichten ----------
const VIEWS = [
  { id: 'overview', name: 'Übersicht' },
  { id: 'plan', name: 'Draufsicht' },
  { id: 'garden', name: 'Garten' },
  { id: 'OG1', name: 'Blick OG 1' },
  { id: 'OG2', name: 'Blick OG 2' },
  { id: 'OG3', name: 'Blick OG 3' },
  { id: 'EG1', name: 'Blick EG 1' },
  { id: 'nbBalk', name: 'Vom Nachbarbalkon' },
  { id: 'nbTerr', name: 'Von der Nachbarterrasse' },
  { id: 'side', name: 'Vom Nachbargrund' },
  { id: 'terrasse', name: 'Terrasse' },
  { id: 'bach', name: 'Bachseite' },
  { id: 'hang', name: 'Vom Hang' },
  { id: 'treppe', name: 'Treppe' },
];
let tween = null;
function viewPose(id) {
  const H = CFG.haus, B = CFG.balcony, fo = H.floor0 + H.og;
  const bc = W((B.u0 + B.u1) / 2, B.floor + 1.1, B.wallV - B.depth / 2);
  if (id === 'overview') return { pos: W(17, 14, -14), tgt: W(1.5, 2.8, 4.0), fov: 45 };
  const T7 = CFG.terrasse;
  if (id === 'garden') return { pos: W(T7.over - 0.6, T7.top + 1.6, -T7.depth + 0.7), tgt: W(4.8, 3.2, 8.5), fov: 60 }; // von der Terrassenecke Süd
  if (id === 'terrasse') return { pos: W(-4.2, T7.top + 1.6, -1.3), tgt: W(4.5, 0.8, -1.2), fov: 64 };
  if (id === 'bach') return { pos: W(8.5, bachLevel() + 5.2, waterV(8.5) - CFG.bach.width - 3.0), tgt: W(-3.5, -2.2, -4.0), fov: 56 }; // vom Gegenufer
  if (id === 'treppe') { const P = stairPlan(); return { pos: W(3.4, P.bot + 6.4, waterV(3.4) + 0.2), tgt: W(-1.7, (P.top + P.bot) / 2 - 0.9, -5.5), fov: 60 }; }
  if (id === 'hang') { const pu = 3.3, pv = Math.max(waterV(3.3) + 2.6, -T7.depth - 2.4); return { pos: W(pu, groundH(pu, pv) + 1.6, pv), tgt: W(-0.6, 0.5, -1.4), fov: 64 }; }
  if (id === 'nbBalk') return { pos: W((B.u0 + B.u1) / 2, B.floor + 1.3, B.wallV - 0.55), tgt: W(0, fo + 1.5, 4.6), fov: 60 };
  if (id === 'side') return { pos: W(13.5, 1.65, -3.5), tgt: W(1.5, 3.4, 5.0), fov: 58 };
  const T = CFG.terrace, tc = [(T.u0 + T.u1) / 2, Math.max(T.v0 + 0.6, Math.min(T.v1 - 0.6, B.wallV - B.depth - 0.6))];
  if (id === 'nbTerr') return { pos: W(tc[0], 1.3, tc[1]), tgt: W(0, fo + 1.2, 4.0), fov: 62 };
  if (id === 'EG1') { const w = CFG.winEG[0]; return { pos: W(0.2, H.floor0 + CFG.eyeStand - 0.1, (w.v0 + w.v1) / 2), tgt: W(tc[0], 1.3, tc[1]), fov: 72 }; }
  const w = CFG.winOG.find(x => x.id === id);
  if (w) { const vc = (w.v0 + w.v1) / 2; return { pos: W(0.2, fo + CFG.eyeStand, vc), tgt: bc, fov: 72 }; }
  return null;
}
function setView(id) {
  ST.view = id;
  ovEl.querySelectorAll('#views .chip[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === id)));
  let P;
  if (id === 'plan') P = { pos: W(2.2, 80, 2.95), tgt: W(2.2, 0, 3), fov: 22 };   // Draufsicht: steil von oben, enger Blickwinkel
  else P = viewPose(id);
  if (!P) return;
  if (id === 'EG1' && ST.target !== 'terrace') setTarget('terrace', true);
  if (WIN.includes(id) && ST.showWin !== id) { ST.showWin = id; renderCoverage(); }
  rebuildSight();
  applyLabels();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  tween = { t0: performance.now(), dur: reduce ? 0 : 750, p0: camera.position.clone(), p1: toWorld(P.pos), q0: controls.target.clone(), q1: toWorld(P.tgt), f0: camera.fov, f1: P.fov };
  req();
}
const WIN = ['OG1', 'OG2', 'OG3', 'EG1'];
function firstPerson() { return WIN.includes(ST.view) || ST.view === 'nbBalk' || ST.view === 'nbTerr'; }
// Beschriftungen und Sichtlinien gehören zur Gartenplanung: außerhalb des Gartens ausblenden
function applyLabels() {
  const on = active();
  root.traverse(o => { if (o.isSprite) o.visible = on && !(o.userData.plantLabel && firstPerson() && ST.view !== 'plan'); });
  sightGrp.visible = on && ST.view !== 'nbBalk' && ST.view !== 'nbTerr';
  ovEl.hidden = !on;
}

// ---------- Auswahl & Ziehen ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), gPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let drag = null, down = null, lastCov = 0;
function pick(e) {
  const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function groundAt() { // Treffer auf dem Gelände, sonst auf der Ebene h = 0; Ergebnis in Gartenkoordinaten
  const hit = ground ? ray.intersectObject(ground, false)[0] : null; if (hit) return toLocal(hit.point);
  gPlane.constant = -root.position.y;
  const p = new THREE.Vector3(); return ray.ray.intersectPlane(gPlane, p) ? toLocal(p) : null;
}
canvas.addEventListener('pointerdown', (e) => {
  if (!active()) return;
  down = { x: e.clientX, y: e.clientY };
  pick(e);
  const hits = ray.intersectObjects(plantGrp.children, true).filter(h => h.object.type !== 'Sprite');
  if (!hits.length) return;
  let o = hits[0].object; while (o && !o.userData.pid) o = o.parent;
  if (!o) return;
  const p = ST.plants.find(x => x.id === o.userData.pid); if (!p) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const gp = groundAt();
  drag = { p, off: gp ? [p.u - gp.x, p.v + gp.z] : [0, 0], moved: false };
  canvas.setPointerCapture(e.pointerId);
  if (ST.sel !== p.id) { ST.sel = p.id; rebuildPlants(); renderPlants(); }
}, { capture: true });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  pick(e); const gp = groundAt(); if (!gp) return;
  const nu = Math.round((gp.x + drag.off[0]) * 20) / 20, nv = Math.round((-gp.z + drag.off[1]) * 20) / 20;
  if (Math.abs(nu - drag.p.u) < 1e-6 && Math.abs(nv - drag.p.v) < 1e-6) return;
  drag.p.u = Math.max(-16, Math.min(14, nu)); drag.p.v = Math.max(-11, Math.min(29, nv)); drag.moved = true;
  const g = plantObjs.get(drag.p.id); if (g) g.position.copy(W(drag.p.u, groundH(drag.p.u, drag.p.v), drag.p.v));
  const now = performance.now(); if (now - lastCov > 120) { lastCov = now; rebuildSight(); renderCoverage(); updateEditorPos(); }
  req();
});
const endDrag = (e) => {
  if (!active()) { drag = null; down = null; return; }
  if (drag) {
    const moved = drag.moved; drag = null;
    if (moved) { rebuildPlants(); afterEdit(true); updateEditorPos(); }
    return;
  }
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4 && ST.sel) { ST.sel = null; rebuildPlants(); renderPlants(); }
  down = null;
};
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', () => { drag = null; });

// ---------- Panel ----------
function renderVariantSelect() {
  const s = $('variant'); s.innerHTML = '';
  const groups = [['', VARIANTS.filter(v => v.id === 'ist')], ['Mit 2 m Grenzabstand', VARIANTS.filter(v => ['A', 'B', 'D'].includes(v.id))], ['Unter 2 m: nur mit Zustimmung des Nachbarn', VARIANTS.filter(v => ['C', 'E', 'F', 'G', 'H'].includes(v.id))]];
  for (const [gl, vs] of groups) {
    const parent = gl ? document.createElement('optgroup') : s; if (gl) { parent.label = gl; s.appendChild(parent); }
    for (const v of vs) { const o = document.createElement('option'); o.value = v.id; o.textContent = v.name + (v.rec ? ' (Empfehlung)' : ''); parent.appendChild(o); }
  }
  const o = document.createElement('option'); o.value = 'eigen'; o.textContent = 'Eigene Anordnung'; s.appendChild(o);
  s.value = ST.variant;
}
function consentState() {
  if (!ST.plants.length) return null;
  const bad = ST.plants.filter(p => !plantChecks(p).ok);
  return bad;
}
function renderVariantDesc() {
  const v = VARIANTS.find(x => x.id === ST.variant);
  const bad = consentState();
  const pill = bad === null ? '' : (bad.length ? `<span class="pill warn">Zustimmung des Nachbarn nötig (${bad.map(p => 'Nr. ' + (ST.plants.indexOf(p) + 1)).join(', ')})</span>` : '<span class="pill ok">Grenzabstand eingehalten</span>');
  $('vdesc').innerHTML = `<h2>${v ? v.name : 'Eigene Anordnung'}</h2><p class="small">${v ? v.desc : 'Von einer Variante ausgehend verändert. Werte unten gelten für diese Anordnung.'}</p><div class="row">${pill}</div>`;
}
function bar(label, val, color) {
  return `<span class="muted">${label}</span><span class="track"><span class="fill" style="display:block;width:${Math.round(val * 100)}%;background:${color}"></span></span><span class="num">${Math.round(val * 100)} %</span>`;
}
function covColor(c) { return c >= 0.75 ? 'var(--ok)' : (c >= 0.45 ? 'var(--warn)' : 'var(--bad)'); }
function setTarget(t, quiet) {
  ST.target = t; $('tgB').setAttribute('aria-pressed', String(t === 'balcony')); $('tgT').setAttribute('aria-pressed', String(t === 'terrace'));
  if (!quiet) { rebuildSight(); renderCoverage(); }
}
function renderCoverage() {
  const tg = ST.target === 'terrace' ? 'terrace' : undefined, tName = tg ? 'Terrasse' : 'Balkon';
  $('covTitle').textContent = `Verdeckte Blickachsen → ${tName} des Nachbarn`;
  $('covExplain').textContent = tg
    ? 'Anteil der Sichtlinien von jedem Fenster (sitzend und stehend, über die Fensterbreite) zur Terrasse des Nachbarn (Tisch-, Sitz- und Stehhöhe), die verdeckt sind: durch Pflanzen, Zaun, Schuppen oder die Balkonplatte. Karte antippen zeigt die Linien.'
    : 'Anteil der Sichtlinien von jedem Fenster (sitzend und stehend, über die Fensterbreite) zum Balkon des Nachbarn (Tisch-, Sitz- und Stehhöhe), die verdeckt sind. Karte antippen zeigt die Linien.';
  const rows = [[CFG.winEG[0], 'EG', 'EG 1']].concat(CFG.winOG.map((w, i) => [w, 'OG', 'OG ' + (i + 1)]));
  const cs = rows.map(([w, l]) => coverage(ST.plants, 'S', ST.stage, [w], l, tg)[0]), cw = rows.map(([w, l]) => coverage(ST.plants, 'W', ST.stage, [w], l, tg)[0]);
  $('wins').innerHTML = rows.map(([w, , nm], i) => `<button class="win" data-w="${w.id}" aria-pressed="${ST.showWin === w.id}">
      <span><span class="t">${nm}</span> <span class="r">· ${w.room}</span></span><span class="r">${ST.showWin === w.id ? 'Linien an' : 'Linien zeigen'}</span>
      <span class="bars">${bar('Sommer', cs[i].cov, covColor(cs[i].cov))}${bar('Winter', cw[i].cov, covColor(cw[i].cov))}</span></button>`).join('');
  $('wins').querySelectorAll('.win').forEach(b => b.addEventListener('click', () => { ST.showWin = ST.showWin === b.dataset.w ? '' : b.dataset.w; rebuildSight(); renderCoverage(); }));
  const ds = coverage(ST.plants, 'S', ST.stage, CFG.winDG, 'DG', tg), dw = coverage(ST.plants, 'W', ST.stage, CFG.winDG, 'DG', tg);
  $('dgrows').innerHTML = CFG.winDG.map((w, i) => `<div class="dgrow"><button class="btn" style="min-height:28px;padding:2px 8px" data-w="${w.id}" aria-pressed="${ST.showWin === w.id}">DG ${i + 1}</button><span class="num">Sommer ${Math.round(ds[i].cov * 100)} %</span><span class="num">Winter ${Math.round(dw[i].cov * 100)} %</span></div>`).join('');
  $('dgrows').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { ST.showWin = ST.showWin === b.dataset.w ? '' : b.dataset.w; rebuildSight(); renderCoverage(); }));
  $('covNote').textContent = `Wuchs: ${STAGES[ST.stage]}. Sommer = belaubt, Winter = Laubfall (Hainbuche hält teils braunes Laub). Das Balkongeländer ist nicht als Sichtschutz gerechnet${CFG.lattice ? ', das vorhandene Rankgitter am Balkon schon' : ''}.`;
}
function posText(p) { return `${fmt(p.u)} m vor Giebel · ${fmt(p.v)} m ab Gartenecke`; }
function renderPlants(keepEditor) {
  const el = $('plist');
  if (!ST.plants.length) { el.innerHTML = '<p class="small muted">Noch keine Pflanzen. Wähle oben eine Art und tippe auf „Pflanze hinzufügen“, oder wähle eine Variante.</p>'; }
  else el.innerHTML = ST.plants.map((p, i) => {
    const S = SPECIES[p.sp], c = plantChecks(p);
    const pill = !c.own ? '<span class="pill bad">Nachbargrund</span>' : (c.ok ? '<span class="pill ok">Abstand ok</span>' : '<span class="pill warn">Zustimmung</span>');
    return `<button class="prow" data-id="${p.id}" aria-pressed="${ST.sel === p.id}"><span class="badge">${i + 1}</span><span style="min-width:0"><b>${S.name}</b><br><span class="meta">${posText(p)} · ${fmt(p.top)} m hoch${S.max && !S.cut ? ` (ohne Schnitt bis ${fmt(S.max[0])} m)` : ''}</span></span>${pill}</button>`;
  }).join('');
  el.querySelectorAll('.prow').forEach(b => b.addEventListener('click', () => { ST.sel = ST.sel === b.dataset.id ? null : b.dataset.id; rebuildPlants(); renderPlants(); }));
  if (keepEditor) { const p = ST.plants.find(x => x.id === ST.sel); if (p) renderChecks(p, plantChecks(p)); } else renderEditor();
  renderShop(); renderVariantDesc();
}
function slider(id, label, min, max, step, val, unit = ' m') {
  return `<div class="field"><label for="${id}" class="glbl">${label}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><span class="val" id="${id}-v">${fmt(+val, step < 0.1 ? 2 : 1)}${unit}</span></div>`;
}
function renderEditor() {
  const wrap = $('editorWrap'), p = ST.plants.find(x => x.id === ST.sel);
  if (!p) { wrap.innerHTML = ''; return; }
  const S = SPECIES[p.sp], c = plantChecks(p), n = ST.plants.indexOf(p) + 1;
  const opts = Object.entries(SPECIES).map(([k, s]) => `<option value="${k}" ${k === p.sp ? 'selected' : ''}>${s.name}</option>`).join('');
  const isBox = S.shape === 'box';
  wrap.innerHTML = `<div class="editor">
    <div class="full row" style="justify-content:space-between"><h3>Pflanze ${n} bearbeiten</h3></div>
    <div class="field full"><label class="glbl" for="e-sp">Art</label><select id="e-sp">${opts}</select><span class="small muted">${S.latin}. ${S.info}</span><span class="small"><b>Endgröße:</b> ${S.max ? `${fmt(S.max[0])} m hoch, ${fmt(S.max[1])} m breit${S.cut ? ' ohne Schnitt' : ''}. Die orange Hülle im Modell zeigt sie.` : (S.maxNote || '')}</span></div>
    <div class="field"><label class="glbl" for="e-u">Vor Giebel (m)</label><input type="number" id="e-u" step="0.1" value="${p.u.toFixed(2)}"></div>
    <div class="field"><label class="glbl" for="e-v">Ab Gartenecke (m)</label><input type="number" id="e-v" step="0.1" value="${p.v.toFixed(2)}"></div>
    ${slider('e-top', 'Höhe (Ziel)', S.hedge ? 0.8 : 1.5, S.hedge ? (S.max ? S.max[0] + 0.5 : 3) : 10, 0.1, p.top)}
    ${slider('e-w', isBox ? 'Länge' : 'Kronenbreite', 0.6, S.hedge ? 12 : 5, 0.1, p.w)}
    ${S.stem > 0.05 ? slider('e-stem', 'Stammhöhe', 0.2, 3.2, 0.1, p.stem) : ''}
    ${isBox ? `<div class="field"><span class="glbl">Ausrichtung</span><div class="seg" role="group" aria-label="Ausrichtung"><button id="e-r0" aria-pressed="${p.rot !== 90}">parallel Giebel</button><button id="e-r9" aria-pressed="${p.rot === 90}">quer</button></div></div>` : ''}
    <div class="checks full" id="e-checks"></div>
    <div class="full row"><button class="btn" id="e-dup">Duplizieren</button><button class="btn danger" id="e-del">Entfernen</button></div>
  </div>`;
  const upd = () => { rebuildPlants(); afterEdit(true); };
  $('e-sp').onchange = (e) => { const s2 = SPECIES[e.target.value]; Object.assign(p, { sp: e.target.value, stem: s2.stem, top: s2.top, w: s2.w, d: s2.d || s2.w }); rebuildPlants(); afterEdit(); };
  $('e-u').onchange = (e) => { p.u = +e.target.value || 0; upd(); };
  $('e-v').onchange = (e) => { p.v = +e.target.value || 0; upd(); };
  for (const k of ['top', 'w', 'stem']) { const el = $('e-' + k); if (!el) continue; el.oninput = (e) => { p[k] = +e.target.value; if (k === 'stem' && p.top < p.stem + 0.5) p.top = p.stem + 0.5; $('e-' + k + '-v').textContent = fmt(p[k], 1) + ' m'; upd(); }; }
  if (isBox) { $('e-r0').onclick = () => { p.rot = 0; rebuildPlants(); afterEdit(); }; $('e-r9').onclick = () => { p.rot = 90; rebuildPlants(); afterEdit(); }; }
  $('e-dup').onclick = () => { const q = Object.assign(clone(p), { id: 'p' + (pid++), v: p.v + (p.rot === 90 ? 0 : p.w + 0.1), u: p.u + (p.rot === 90 ? p.w + 0.1 : 0) }); ST.plants.push(q); ST.sel = q.id; markCustom(); rebuildPlants(); afterEdit(); };
  $('e-del').onclick = () => { ST.plants = ST.plants.filter(x => x !== p); ST.sel = null; markCustom(); rebuildPlants(); afterEdit(); };
  renderChecks(p, c);
}
function renderChecks(p, c) {
  const el = $('e-checks'); if (!el) return;
  const lines = [];
  if (!c.own) lines.push('<span class="bad">Steht auf dem Grundstück des Nachbarn.</span>');
  const S = SPECIES[p.sp];
  const hTxt = c.hLegal > p.top ? `wächst ohne Schnitt auf ${fmt(c.hLegal)} m` : `${c.hLegal > 2 ? 'über' : 'bis'} 2 m Höhe`;
  lines.push(c.dB >= c.need ? `<span class="ok">Grenzabstand ${fmt(c.dB, 2)} m (nötig ${fmt(c.need)} m, ${hTxt}).</span>` : `<span class="warn">Grenzabstand ${fmt(c.dB, 2)} m, nötig ${fmt(c.need)} m (${hTxt}): nur mit Zustimmung des Nachbarn.</span>`);
  if (c.overhang > 0.05) lines.push(`<span class="warn">${S.cut ? 'Ohne Rückschnitt' : 'Bei Endgröße'} ragt die Krone ca. ${fmt(c.overhang)} m zum Nachbarn hinüber. Überhang darf der Nachbar nach Fristsetzung abschneiden (§ 910 BGB).</span>`);
  if (c.facade > 0.05) lines.push(`<span class="warn">Bei Endgröße stößt die Krone an die Hauswand (${fmt(c.facade)} m zu breit): regelmäßig zurückschneiden oder weiter weg pflanzen.</span>`);
  else if (c.dHouse < 1.2) lines.push(`<span class="warn">Nur ${fmt(c.dHouse)} m bis zur Hauswand: Krone und Wurzeln brauchen Platz.</span>`);
  el.innerHTML = lines.join('');
}
function updateEditorPos() {
  const p = ST.plants.find(x => x.id === ST.sel); if (!p) return;
  const eu = $('e-u'), ev = $('e-v'); if (eu) eu.value = p.u.toFixed(2); if (ev) ev.value = p.v.toFixed(2);
  renderChecks(p, plantChecks(p));
}
function renderShop() {
  const counts = {};
  for (const p of ST.plants) { const k = p.sp; counts[k] = counts[k] || { n: 0, len: 0 }; counts[k].n++; counts[k].len += p.w; }
  const sizes = { spalier: 'Spalierbaum, Stamm 220 cm, Gerüst ca. 150 × 180 cm', saeule: 'Solitär 300–350 cm, mehrfach verpflanzt', eibe: 'Solitär 175–200 cm, mit Ballen', bambus: 'Container 150–200 cm', felsenbirne: 'Solitär mehrstämmig 250–300 cm', hecke: 'Heckenpflanzen 125–150 cm, 3 St. je m', eibenhecke: 'Heckenpflanzen 80–100 cm, 3 St. je m', liguster: 'Heckenpflanzen 125–150 cm, 3 St. je m', ligusterfrei: 'Solitär 150–175 cm', oelweide: 'Hochstamm oder Solitär 250–300 cm', oelweideW: 'Container 100–125 cm' };
  const rows = Object.entries(counts).map(([k, c]) => { const S = SPECIES[k]; const qty = S.hedge ? `${fmt(c.len)} m ≈ ${Math.ceil(c.len * 3)} St.` : `${c.n} St.`; return `<tr><td>${S.name}</td><td class="n">${qty}</td><td>${sizes[k] || ''}</td></tr>`; });
  $('shop').innerHTML = rows.length ? `<tr><th>Art</th><th>Menge</th><th>Pflanzgröße</th></tr>${rows.join('')}` : '<tr><td class="muted">Keine Pflanzen.</td></tr>';
}
function renderSpecies() {
  $('species').innerHTML = '<tr><th>Art</th><th>Modell</th><th>Endgröße</th><th>Winter</th></tr>' + Object.values(SPECIES).map(S => `<tr><td><b>${S.name}</b><br><span class="muted small">${S.latin}. ${S.info}</span></td><td class="n">${fmt(S.top)} m</td><td class="n">${S.max ? `${fmt(S.max[0])} × ${fmt(S.max[1])} m${S.cut ? '<br><span class="muted">ohne Schnitt</span>' : ''}` : '<span class="muted">Schnittform</span>'}</td><td>${S.ever ? 'immergrün' : (S.semi ? 'wintergrün' : (S.marc ? 'teils Laub' : 'kahl'))}</td></tr>`).join('');
}
function renderInsights() {
  const H = CFG.haus, B = CFG.balcony, fo = H.floor0 + H.og;
  const pct = (x) => Math.round(x * 100) + ' %';
  const egT = coverage([], 'S', 2, [CFG.winEG[0]], 'EG', 'terrace')[0].cov;
  const ogT = coverage([], 'S', 2, CFG.winOG.slice(0, 2), 'OG', 'terrace').reduce((a, x) => a + x.cov, 0) / 2;
  const lo = Math.min(B.floor + 0.9, fo + CFG.eyeSit), hi = fo + CFG.eyeStand;
  $('insights').innerHTML = [
    `Die Blicke zwischen OG und Balkon verlaufen in ${fmt(lo)} bis ${fmt(hi)} m Höhe. Eine 1,8-m-Hecke oder der Zaun ändern daran nichts. Wirksam ist Laub zwischen etwa 2,5 und 5 m.`,
    'Je näher die Pflanze am Fenster steht, desto mehr Blickwinkel deckt sie. Deshalb wirkt eine Reihe 2,4 m vor dem Giebel besser als eine Reihe direkt an der Grenze, und sie hält gleichzeitig die 2 m Grenzabstand ein.',
    'OG 3 (laut Plan das Bad) blickt fast gerade auf den Balkon. Von deinem Grundstück aus lässt sich das nur mit einer Pflanze in der Ecke am Grenzversatz abdecken, und die braucht die Zustimmung des Nachbarn. Alternative: Milchglas oder Folie.',
    'Spalier-Hainbuchen kommen fertig gezogen. Bei Pflanzung reicht die Krone meist bis ca. 4 m; die volle Wirkung kommt nach 1–2 Jahren. Wer sofort Schutz will, kauft ein höheres Gerüst.',
    'Im Winter schützt Hainbuche noch etwa zur Hälfte, weil sie braunes Laub lange hält. Felsenbirne ist dann fast durchsichtig.',
    'Die Bäume stehen südöstlich vom Giebel. Am Vormittag beschatten sie die Fenster. Mit dem Sonnen-Regler im Modell siehst du die Schatten.',
    `Terrasse des Nachbarn: Vom EG-Fenster 1 aus verdecken Zaun und Schuppen heute schon ${pct(egT)} der Blickachsen. Vom OG aus sind es ohne Pflanzen nur ${pct(ogT)}, weil man über den Zaun hinweg nach unten schaut. Dieselben Pflanzen, die den Balkon abdecken, decken auch die Terrasse.`,
    'Liguster ‚Atrovirens‘ ist wintergrün und die dichteste Option im Winter. Er wird ohne Schnitt aber nur 3–5 m hoch. Direkt an der Grenze muss er auf etwa 4,5 m stehen, um das Sichtband zu treffen: das ist fast seine Endhöhe und viel Schnittarbeit.',
    'Die Schmalblättrige Ölweide wird 5–7 m hoch und 4–6 m breit. Der Streifen zwischen Giebel und Grenze ist nur 4,9 m breit. Sie ragt also entweder zum Nachbarn hinüber oder bis an die Hauswand, auch mit Grenzabstand. Wählst du in Wuchs „Endgröße“, zeigt das Modell das.',
    'Die Wintergrüne Ölweide (Elaeagnus × ebbingei) bleibt mit 2–4 m kleiner, ist auf etwa 750 m Höhe aber nur bedingt winterhart.',
    `Der Giebelgarten endet zum Bach hin an der Kalksteinmauer, ${fmt(CFG.kalk.h)} m über dem Hang. Pflanzen unterhalb der Mauer stehen entsprechend tiefer und brauchen so viel mehr Höhe, um das Sichtband zu erreichen. Das Modell rechnet die Geländehöhe am Standort mit.`,
  ].map(t => `<li>${t}</li>`).join('');
}
const AS_FIELDS = [
  ['b-u0', 'Balkon beginnt (m vor Giebel)', () => CFG.balcony.u0, (x) => CFG.balcony.u0 = x, 0.1],
  ['b-u1', 'Balkon endet (m vor Giebel)', () => CFG.balcony.u1, (x) => CFG.balcony.u1 = x, 0.1],
  ['b-d', 'Balkontiefe (m)', () => CFG.balcony.depth, (x) => CFG.balcony.depth = x, 0.1],
  ['b-f', 'Balkonboden über Gelände (m)', () => CFG.balcony.floor, (x) => CFG.balcony.floor = x, 0.05],
  ['b-w', 'Hauswand Nachbarhaus (m ab Gartenecke)', () => CFG.balcony.wallV, (x) => CFG.balcony.wallV = x, 0.1],
  ['t-u0', 'Terrasse beginnt (m vor Giebel)', () => CFG.terrace.u0, (x) => CFG.terrace.u0 = x, 0.1],
  ['t-u1', 'Terrasse endet (m vor Giebel)', () => CFG.terrace.u1, (x) => CFG.terrace.u1 = x, 0.1],
  ['t-v0', 'Terrasse vorderer Rand (m ab Gartenecke)', () => CFG.terrace.v0, (x) => CFG.terrace.v0 = x, 0.1],
  ['t-v1', 'Terrasse hinterer Rand (m ab Gartenecke)', () => CFG.terrace.v1, (x) => CFG.terrace.v1 = x, 0.1],
  ['h-f', 'EG-Fußboden über Gelände (m)', () => CFG.haus.floor0, (x) => CFG.haus.floor0 = x, 0.05],
];
// [id, Text, Quelle (m = Meterstab, g = geschätzt, p = Plan), lesen, schreiben, Schritt, min, max]
const AS_SITE = [
  ['s-abs', 'OK Betonbalken der Terrasse (m ü. NHN)', 'g', () => CFG.survey.beam, (x) => CFG.survey.beam = x, 0.01, 745, 748],
  ['s-top', 'OK Betonbalken über Gelände am Giebel (m)', 'g', () => CFG.terrasse.top, (x) => CFG.terrasse.top = x, 0.01, -0.3, 0.6],
  ['s-rl', 'Geländer: OK Handlauf über OK Betonbalken (m)', 'm', () => CFG.terrasse.rail, (x) => CFG.terrasse.rail = x, 0.01, 0.6, 1.3],
  ['s-kg', 'Lücke Terrassenmauer ↔ Kalksteinmauer (m)', 'm', () => CFG.kalk.gap, (x) => CFG.kalk.gap = x, 0.05, 0.3, 3],
  ['s-kh', 'Kalksteinmauer: Höhe (m)', 'g', () => CFG.kalk.h, (x) => CFG.kalk.h = x, 0.05, 0.3, 2.5],
  ['s-kv', 'Kalksteinmauer: Vorderkante (m ab Gartenecke, negativ = Richtung Bach)', 'g', () => CFG.kalk.v, (x) => CFG.kalk.v = x, 0.05, -5, -0.8],
  ['s-wh', 'Bach: Wasserspiegel (m ü. NHN)', 'v', () => CFG.bach.H, (x) => CFG.bach.H = x, 0.05, 739, 742],
  ['s-f1', 'Neue Sichtschutzelemente des Nachbarn beginnen (m ab Gartenecke)', 'g', () => CFG.zaunNb.newV1, (x) => CFG.zaunNb.newV1 = x, 0.1, -6, 7],
  ['s-f0', 'Neue Sichtschutzelemente des Nachbarn enden (m ab Gartenecke, negativ = Richtung Bach)', 'g', () => CFG.zaunNb.newV0, (x) => CFG.zaunNb.newV0 = x, 0.1, -7, 6],
];
const SRC = { m: 'Meterstab', g: 'geschätzt', p: 'Plan', v: 'Aufmaß' };
function rebuildSite() { buildTerrain(); buildSite(); buildCtxTrees(); drawGround(); rebuildPlants(); rebuildSight(); renderCoverage(); renderPlants(true); renderStair(); }
// ---------- Treppe: Maße, Prüfung, Längsschnitt ----------
const ST_FIELDS = [
  ['st-w', 'Laufbreite (m)', () => CFG.stair.w, (x) => CFG.stair.w = x, 0.05, 0.5, 1.5],
  ['st-s', 'Stufenhöhe = Höhe der Blockstufe (m)', () => CFG.stair.s, (x) => CFG.stair.s = x, 0.01, 0.12, 0.22],
  ['st-a', 'Auftritt in der Lauflinie (m)', () => CFG.stair.a, (x) => CFG.stair.a = x, 0.01, 0.2, 0.45],
  ['st-r', 'Bogenradius der Lauflinie (m)', () => CFG.stair.r, (x) => CFG.stair.r = x, 0.1, 0.5, 3],
  ['st-sd', 'Abstand zur Terrassenmauer (m)', () => CFG.stair.side, (x) => CFG.stair.side = x, 0.01, 0, 0.5],
];
function renderStairFields() {
  const dec = (st) => st >= 1 ? 0 : 2;
  $('stFields').innerHTML = ST_FIELDS.map(([id, l, g, , st, mn, mx]) => `<label for="${id}">${l}</label><input type="number" id="${id}" step="${st}" min="${mn}" max="${mx}" value="${g().toFixed(dec(st))}">`).join('');
  for (const [id, , g, set, st, mn, mx] of ST_FIELDS) $(id).onchange = (e) => {
    const x = parseFloat(e.target.value); if (isFinite(x)) set(Math.max(mn, Math.min(mx, x)));
    e.target.value = g().toFixed(dec(st)); rebuildSite(); save();
  };
  $('st-on').checked = CFG.stair.on;
  $('st-on').onchange = (e) => { CFG.stair.on = e.target.checked; rebuildSite(); save(); };
  $('st-old').checked = CFG.stair.showOld;
  $('st-old').onchange = (e) => { CFG.stair.showOld = e.target.checked; buildSite(); save(); };
  $('stView').onclick = () => setView('treppe');
}
function renderStair() {
  const S = CFG.stair, T = CFG.terrasse, P = stairPlan(), C = stairChecks(), H0 = h0(), cm = (x, d = 1) => fmt(x * 100, d), nhn = (h) => fmt(h + H0, 2);
  const TXT = { ok: 'passt', warn: 'grenzwertig', bad: 'passt nicht' }, pill = (l) => `<span class="pill ${l}">${TXT[l]}</span>`;
  const row = (a, b, l) => `<tr><td>${a}</td><td class="n">${b}</td><td>${l ? pill(l) : ''}</td></tr>`;
  const NAMES = ['Podest im Bogen', 'Podest am zweiten Knick', 'Podest am Wegende'];
  $('stRes').innerHTML = '<tr><th>Wert</th><th>Ergebnis</th><th></th></tr>' + [
    row('Podest oben / Austritt unten (m ü. NHN)', `${nhn(P.top)} / ${nhn(P.bot)}`),
    row('Höhe Podest bis Austritt', `${fmt(P.H, 2)} m`),
    row('Steigungen', `${P.n} × ${cm(P.s)} cm`, C.sL),
    row('Auftritt in der Lauflinie', `${cm(S.a, 0)} cm`, C.aL),
    row('Schrittmaß 2 × Steigung + Auftritt (Ziel 61–65 cm)', `${cm(C.sm)} cm`, C.smL),
    row('Schmalste Trittfläche an der Bogeninnenseite', isFinite(C.inner) ? `${cm(C.inner, 0)} cm` : '–', C.innerL),
    row('Längster Lauf ohne Podest (höchstens 18)', `${C.flight} Steigungen`, C.flightL),
    row('Länge der Lauflinie ab Podestkante', `${fmt(P.L, 2)} m`, C.fitL),
    row('Breite in der Lücke, Rest zur Kalksteinmauer', `${cm(C.clear, 0)} cm`, C.wL),
  ].concat(C.lands.map((l, j) => row(`${NAMES[j] || 'Podest'} nach Steigung ${l.i}, ${fmt(l.len, 2)} m lang`, `${fmt(l.plan, 2)}<br><span class="muted">Weg heute ${fmt(l.ist, 2)}</span>`))).join('');
  // Längsschnitt: abgewickelt entlang der Lauflinie, links das Podest
  const pre = 1.6, x0 = pre, xMax = pre + P.L + 1.2, hs = [P.top, 0, P.bot], gPt = [];
  for (let sx = -pre; sx <= P.L + 1.2 + 1e-6; sx += 0.1) { const q = sx < 0 ? { u: P.uc, v: P.vTop - sx } : stairAt(P, sx), gh = groundNat(q.u, q.v); hs.push(gh); gPt.push([x0 + sx, gh]); }
  const yTop = Math.max(...hs) + 0.75, yBot = Math.min(...hs) - 0.5, Y = (h) => (yTop - h).toFixed(2), X = (sx) => (x0 + sx).toFixed(2);
  let st = `M0,${Y(0)} L${X(P.vTop)},${Y(0)} L${X(P.vTop)},${Y(P.top)} L${X(0)},${Y(P.top)}`;
  for (const t of P.steps) st += ` L${X(t.s0)},${Y(t.z)} L${X(t.s1)},${Y(t.z)}`;
  st += ` L${X(P.sEnd)},${Y(P.bot)} L${X(P.sEnd + 1.0)},${Y(P.bot)}`;
  const tx = (x, h, s, anchor = 'start') => `<text x="${x}" y="${(yTop - h - 0.15).toFixed(2)}" text-anchor="${anchor}">${s}</text>`;
  $('stSec').innerHTML = S.on ? `<svg viewBox="0 0 ${xMax.toFixed(2)} ${(yTop - yBot).toFixed(2)}" role="img" aria-label="Längsschnitt der Treppe entlang der Lauflinie mit dem Gelände aus dem Aufmaß">
    ${P.arcs.map(a => `<rect x="${X(a.s0)}" y="0" width="${(a.s1 - a.s0).toFixed(2)}" height="${(yTop - yBot).toFixed(2)}" fill="currentColor" opacity="0.08"/>`).join('')}
    <polygon points="0,${(yTop - yBot).toFixed(2)} ${gPt.map(([x, h]) => x.toFixed(2) + ',' + Y(h)).join(' ')} ${xMax.toFixed(2)},${(yTop - yBot).toFixed(2)}" fill="#a58a63" opacity="0.55"/>
    <path d="${st}" fill="none" stroke="currentColor" stroke-width="0.05" stroke-linejoin="miter"/>
    ${tx('0.15', P.top, 'Podest ' + nhn(P.top))}
    ${P.steps.filter(t => t.land).map(t => tx(X(t.s0 + 0.05), t.z, nhn(t.z))).join('')}
    ${tx((xMax - 0.1).toFixed(2), P.bot + 0.5, 'Ebene am Bach ' + nhn(P.bot), 'end')}
  </svg>` : '<p class="small muted">Treppe ist ausgeblendet.</p>';
  $('stSecNote').textContent = 'Abgewickelt entlang der Lauflinie. Braun: bestehender Weg laut Aufmaß vom 16.01.2024; seine Höhen gelten weiter. Linie: neue Treppe. Grau hinterlegt: Bögen. Höhen in m ü. NHN.';
  const landTxt = C.lands.map(l => `${fmt(S.w, 2)} × ${fmt(l.len, 2)} m`).join(', ');
  const notes = [
    `<b>Verlauf:</b> wie die alte Treppe. ${P.ks[0]} Steigungen gerade in der Lücke, dann ein Podest im Bogen (${Math.round(P.arcs[0].th * 180 / Math.PI)}° nach Westen), ${P.ks[1] - P.ks[0]} Steigungen schräg hinunter, ${P.ks[2] - P.ks[1]} Steigungen im Weg Richtung Grillplatz und zuletzt ${P.n - P.ks[2]} Steigungen hinunter auf die Ebene am Bach.`,
    `<b>Material:</b> ${C.blocks} Blockstufen, je ${cm(S.w, 0)} cm breit, ${cm(S.s, 0)} cm hoch und mindestens ${cm(S.a + 0.03, 0)} cm tief (Auftritt plus 3 cm Überdeckung). Dazu das obere Podest mit ${fmt(kalkU0() - T.over, 2)} × ${fmt(-P.vTop, 2)} m und ${C.lands.length} Podeste im Lauf (${landTxt}); die Podeste in den Bögen sind keilförmig.`,
    Math.abs(C.dBlock) > 0.0005 ? `Rechnerisch ergibt die Höhe ${cm(P.s)} cm je Stufe, die Blockstufe hat ${cm(S.s, 0)} cm. Die ${fmt(Math.abs(C.dBlock) * 1000, 0)} mm Unterschied je Stufe gleichst du über das Mörtelbett aus.` : '',
    `<b>Unterbau:</b> Das obere Podest liegt rund ${fmt(Math.max(0, C.podFill), 2)} m über dem heutigen Boden, weil die Terrasse höher liegt als der alte Antritt.${C.maxFill > 0.05 ? ` Die ersten Stufen liegen bis zu ${fmt(C.maxFill, 2)} m über dem bestehenden Weg (Stufe ${C.iFill}): dort auffüllen und verdichten.` : ''}${C.maxCut > 0.05 ? ` Größter Abtrag: ${fmt(C.maxCut, 2)} m bei Stufe ${C.iCut}.` : ''} Ab etwa Stufe 9 folgt die Treppe dem Weg auf wenige Zentimeter.`,
    `Zum Giebelgarten bleibt am oberen Podest eine Stufe von ${cm(Math.max(0, P.top), 0)} cm.`,
    C.fitL !== 'ok' ? '<span style="color:var(--bad)">Die Stufen reichen über das Wegende hinaus. Stufen höher wählen oder den Auftritt kürzen.</span>' : '',
    'Die letzten Steigungen vom Wegende auf die Ebene am Bach stehen so nicht im Aufmaß: dort ist heute ein Absatz von rund 0,45 m. Bis ans Wasser wären es von der Ebene noch einmal 1,0 m.',
    'Die Höhe des oberen Podests hängt an der Oberkante des Betonbalkens (746,30 m ü. NHN, aus Meterstab und Aufmaß hergeleitet). Diese eine Höhe vor dem Bestellen nachmessen und im Tab „Annahmen“ eintragen.',
    'Stufen an der Uferböschung können genehmigungspflichtig sein (Art. 20 BayWG). Vorher bei der Gemeinde oder beim Landratsamt nachfragen. Keine Rechtsberatung.',
    'Bei dieser Höhe ist ein Handlauf sinnvoll. Er ist im Modell noch nicht dargestellt.',
  ];
  $('stNotes').innerHTML = S.on ? notes.filter(Boolean).map(t => `<li>${t}</li>`).join('') : '';
  $('stRes').style.display = S.on ? '' : 'none';
}
function renderAssume() {
  $('assume2').innerHTML = AS_SITE.map(([id, l, src, g, , st, mn, mx]) => `<label for="${id}">${l} <span class="src ${src}">${SRC[src]}</span></label><input type="number" id="${id}" step="${st}" min="${mn}" max="${mx}" value="${g().toFixed(2)}">`).join('');
  for (const [id, , , g, set, , mn, mx] of AS_SITE) $(id).onchange = (e) => {
    const x = parseFloat(e.target.value); if (!isFinite(x)) { e.target.value = g().toFixed(2); return; }
    set(Math.max(mn, Math.min(mx, x))); e.target.value = g().toFixed(2); rebuildSite(); renderInsights(); save();
  };
  $('assume').innerHTML = AS_FIELDS.map(([id, l, g, , st]) => `<label for="${id}">${l}</label><input type="number" id="${id}" step="${st}" value="${g().toFixed(2)}">`).join('')
    + `<label for="b-lat">Vorhandenes Rankgitter am Balkon mitrechnen (ca. 1,4 × 1,25 m, halb blickdicht)</label><input type="checkbox" id="b-lat" ${CFG.lattice ? 'checked' : ''} style="justify-self:start;width:20px;height:20px;accent-color:var(--accent)">`;
  $('b-lat').onchange = (e) => { CFG.lattice = e.target.checked; buildHouseNb(); rebuildSight(); renderCoverage(); save(); };
  for (const [id, , , s] of AS_FIELDS) $(id).onchange = (e) => { const x = parseFloat(e.target.value); if (!isFinite(x)) return; s(x); placeRoot(); buildWinLabels(); buildHouseNb(); buildSite(); updateSun(); applyLabels(); drawGround(); rebuildSight(); renderCoverage(); renderInsights(); save(); };
}
function markCustom() { if (ST.variant !== 'eigen') { ST.variant = 'eigen'; $('variant').value = 'eigen'; } }
function afterEdit(keepEditor) {
  markCustom();
  rebuildSight(); renderCoverage(); renderPlants(keepEditor); save();
}
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }
function loadVariant(id) {
  const v = VARIANTS.find(x => x.id === id); if (!v) return;
  ST.variant = id; ST.plants = v.plants(); ST.sel = null;
  rebuildPlants(); rebuildSight(); renderCoverage(); renderPlants(); save();
}

// ---------- Ereignisse ----------
$('variant').addEventListener('change', (e) => { if (e.target.value !== 'eigen') loadVariant(e.target.value); });
const setSeason = (s) => { ST.season = s; $('sS').setAttribute('aria-pressed', String(s === 'S')); $('sW').setAttribute('aria-pressed', String(s === 'W')); drawGround(); buildCtxTrees(); rebuildPlants(); rebuildSight(); updateSun(); };
$('sS').onclick = () => setSeason('S'); $('sW').onclick = () => setSeason('W');
$('tgB').onclick = () => setTarget('balcony'); $('tgT').onclick = () => setTarget('terrace');
$('stage').innerHTML = STAGES.map((s, i) => `<option value="${i}">${s}</option>`).join(''); $('stage').value = String(ST.stage);
$('stage').addEventListener('change', (e) => { ST.stage = +e.target.value; rebuildPlants(); rebuildSight(); renderCoverage(); });
$('sunT').addEventListener('input', (e) => { ST.sunT = +e.target.value; updateSun(); });
$('addSp').innerHTML = Object.entries(SPECIES).map(([k, s]) => `<option value="${k}">${s.name}</option>`).join('');
$('addBtn').onclick = () => { const p = mk($('addSp').value, 2.4, 1.0); ST.plants.push(p); ST.sel = p.id; markCustom(); rebuildPlants(); afterEdit(); toast('Pflanze ' + ST.plants.length + ' eingefügt. In der Draufsicht verschieben.'); };
$('resetBtn').onclick = () => { const id = ST.variant === 'eigen' ? 'A' : ST.variant; $('variant').value = id; loadVariant(id); toast('Variante zurückgesetzt'); };
$('asReset').onclick = () => { Object.assign(CFG.balcony, clone(CFG0.balcony)); Object.assign(CFG.terrace, clone(CFG0.terrace)); CFG.haus.floor0 = CFG0.haus.floor0; CFG.lattice = CFG0.lattice; for (const k of SITE_KEYS) Object.assign(CFG[k], clone(CFG0[k])); renderAssume(); renderStairFields(); placeRoot(); buildWinLabels(); buildHouseNb(); rebuildSite(); updateSun(); applyLabels(); renderInsights(); save(); };
$('copyBtn').onclick = () => {
  const txt = JSON.stringify({ balkon: CFG.balcony, pflanzen: ST.plants.map((p, i) => ({ nr: i + 1, art: SPECIES[p.sp].name, vorGiebel_m: +p.u.toFixed(2), abGartenecke_m: +p.v.toFixed(2), hoehe_m: p.top, breite_m: p.w, stamm_m: p.stem, quer: p.rot === 90 })) }, null, 1);
  const fb = () => { const ta = $('copyFallback'); ta.hidden = false; ta.value = txt; ta.select(); toast('Text markiert, bitte kopieren'); };
  try { navigator.clipboard.writeText(txt).then(() => toast('Plan kopiert'), fb); } catch (e) { fb(); }
};
panelEl.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  panelEl.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  panelEl.querySelectorAll('.tabpane').forEach(p => { p.hidden = p.id !== b.getAttribute('aria-controls'); });
}));
$('views').innerHTML = VIEWS.map(v => `<button class="chip" data-v="${v.id}" aria-pressed="false">${v.name}</button>`).join('') + '<button class="chip" id="plToggle" aria-pressed="false">Pflanzen ausblenden</button>';
$('views').querySelectorAll('.chip[data-v]').forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
$('plToggle').onclick = () => { plantGrp.visible = !plantGrp.visible; $('plToggle').setAttribute('aria-pressed', String(!plantGrp.visible)); $('plToggle').textContent = plantGrp.visible ? 'Pflanzen ausblenden' : 'Pflanzen einblenden'; req(); };

// ---------- Kamerafahrt (vom Hausmodell in jedem Bild aufgerufen) ----------
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function step(now) {
  if (!tween) return false;
  if (!active()) { tween = null; return false; }
  const k = tween.dur ? Math.min(1, (now - tween.t0) / tween.dur) : 1, e = ease(k);
  camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.q0, tween.q1, e);
  camera.fov = tween.f0 + (tween.f1 - tween.f0) * e; camera.updateProjectionMatrix(); controls.update();
  if (k >= 1) tween = null;
  return !!tween;
}

// ---------- Start ----------
if (!load()) ST.plants = VARIANTS.find(v => v.id === 'A').plants();
placeRoot();
renderVariantSelect();
buildTerrain(); buildWinLabels(); buildHouseNb(); buildContext(); buildSite(); buildCtxTrees(); drawGround();
rebuildPlants(); rebuildSight(); updateSun();
renderCoverage(); renderPlants(); renderSpecies(); renderInsights(); renderAssume(); renderStairFields(); renderStair();
applyLabels();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawGround(); buildWinLabels(); buildHouseNb(); rebuildPlants(); applyLabels(); });

return {
  panel: panelEl,
  // Garten betreten: Übersicht anfahren (oder die zuletzt gewählte Ansicht)
  enter() { applyLabels(); setView(ST.view || 'overview'); },
  leave() { tween = null; drag = null; applyLabels(); },
  step,
  floor0: () => CFG.haus.floor0,
  // begehbare Terrasse für den Rundgang (Hauskoordinaten: x, y, z ab FFB EG)
  terrace() { const T = CFG.terrasse; return { x0: T.uA + OFF_X, x1: T.over - T.curb + OFF_X, y0: -T.depth + T.curb, y1: 0, z: T.top - T.fill - CFG.haus.floor0 }; },
  debug: { ST, CFG, setView, loadVariant, coverage, setSeason, rebuildSite, groundH, stairPlan, stairChecks },
};
};
