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
  // ---- Straßenseite (Hof) und Grenze zum Nachbarn Nordwest: Lage aus Kataster, Bauteile grob nach Fotos vom 23.11. ----
  vp: {
    garage: { gap: 0.5, v0: 15.0, L: 7.95, W: 6.25, oh: 0.5, eave: 2.6, ridge: 4.4 }, // Nebengebäude parallel zur Grenze SO: 0,5 m Abstand, 0,5 m Dachüberstand (Angabe); 5,4 m ab Hausfront, 7,3 m bis Straße (Karte); Breite Lageplan, Höhen geschätzt
    pav: { u: -15.3, v: 18.7, r: 0.95 },                                         // achteckiger Pavillon an der Grenze (Foto)
    // Nachbarhaus NW: Ostecke (u, v), Richtung der Fassade zur Südecke (Grad), Länge, Tiefe, Höhen (Lageplan + Fotos)
    nb: { u: -19.3, v: 18.7, ang: 255.4, len: 10.3, dep: 10.0, floor: 0.3, og: 3.0, eave: 5.8, ridge: 8.6 },
    zaun: { typ: 'bau', h: 1.8, v0: -2.6, v1: 28.4, off: 0.1 },                   // Zaun an der Grenze NW (Planung)
    car: true,
    b1: { zaun: true, h: 0.9, mulch: true },                                     // Beet 1: Staketenzaun (Kastanie) und Rindenmulch
  },
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
  faecherahorn: {
    name: 'Japanischer Fächerahorn, rotlaubig', latin: "Acer palmatum 'Bloodgood' / 'Atropurpureum'", shape: 'ell',
    stem: 0.5, top: 3.5, w: 3.0, densS: 2.2, densW: 0.25, ever: false,
    color: 0x7b2a2c, growth: [[0.5, 0.45], [0.75, 0.7], [1, 1]], max: [5, 4.5], multi: true,
    info: 'Kleiner Baum mit dunkelrotem, fein geschlitztem Laub, im Herbst leuchtend rot. Wächst langsam (20–30 cm im Jahr), alt 4–5 m hoch und fast so breit; lässt sich gut auslichten. Mag Halbschatten und humosen, feuchten, nicht verdichteten Boden; Morgensonne ist ideal, pralle Mittagssonne verbrennt das Laub. Frosthart bis etwa −20 °C, Austrieb spätfrostgefährdet. Nicht giftig.',
  },
  hortensie: {
    name: "Schneeball-Hortensie 'Annabelle'", latin: "Hydrangea arborescens 'Annabelle' (oder 'Strong Annabelle')", shape: 'ell',
    stem: 0.0, top: 1.3, w: 1.3, densS: 2.6, densW: 0.5, ever: false,
    color: 0x6f9a55, growth: [[0.6, 0.6], [1, 1], [1, 1]], max: [1.5, 1.8],
    info: 'Große weiße Ballblüten Juni bis September, getrocknet bis in den Winter. Blüht am neuen Holz: Rückschnitt im März, Spätfrost schadet nicht. Sicherer als Bauernhortensien auf ca. 750 m. Halbschatten, braucht Wasser. Leicht giftig.',
  },
  anemone: {
    name: 'Herbstanemonen (Gruppe)', latin: "Anemone hupehensis / × hybrida, z. B. 'Honorine Jobert', 'Pamina'", shape: 'ell',
    stem: 0.0, top: 1.1, w: 1.0, densS: 1.2, densW: 0.05, ever: false,
    color: 0x86a862, growth: [[0.6, 0.6], [1, 1], [1, 1]], max: [1.3, 1.5],
    info: 'Weiß oder rosa, August bis Oktober, 80–120 cm. Halbschatten, breitet sich langsam aus. Im Modell als Gruppe aus 3 Pflanzen. Leicht giftig.',
  },
  phlox: {
    name: 'Hohe Stauden (Phlox, Silberkerze)', latin: 'Phlox paniculata, Actaea simplex', shape: 'ell',
    stem: 0.0, top: 1.2, w: 0.9, densS: 1.4, densW: 0.05, ever: false,
    color: 0x7fa45c, growth: [[0.6, 0.6], [1, 1], [1, 1]], max: [1.5, 1.2],
    info: 'Staudenphlox duftet im Juli/August (vorne, wo mehr Licht ist); Silberkerze blüht im September und mag es schattiger (näher am Haus). Im Modell als Gruppe aus 3 Pflanzen.',
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
// Grenze zum Nachbarn Nordwest = Parzellenkante aus dem Kataster, von der Bachseite zur Straße
const NWB = [9, 10, 11, 0].map(i => CFG.parcel[i]);
function nwU(v) { // u der Grenze NW auf Höhe v
  let i = 1; while (i < NWB.length - 1 && v > NWB[i][1]) i++;
  const a = NWB[i - 1], b = NWB[i]; return a[0] + (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]);
}
function distToBoundary(u, v) { // Abstand zur nächsten Grenze mit einem Nachbarn (Südost oder Nordwest)
  let m = Infinity;
  for (const B of [CFG.boundary, NWB]) for (let i = 0; i < B.length - 1; i++) m = Math.min(m, distPointSeg(u, v, B[i], B[i + 1]));
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
function prepCrowns(plants, season, stage, extra) {
  return plants.map(p => { const S = SPECIES[p.sp]; return { cr: crown(p, stage), k: season === 'W' ? S.densW : S.densS }; }).concat(fixedCrowns(), extra || []);
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
  const dHouse = Math.hypot(Math.max(0, H.u0 - p.u, p.u - H.u1), Math.max(0, H.v0 - p.v, p.v - H.v1));
  // Kronen-Grundriss bei Endgröße (Schnittformen: Zielgröße): Überhang zum Nachbarn und an die Hauswand
  const D = dims(p, 3), cr = crown(p, 3), pts = [];
  if (cr.shape === 'box') { for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) pts.push([cr.min[0] + (cr.max[0] - cr.min[0]) * i / 4, cr.min[1] + (cr.max[1] - cr.min[1]) * j / 4]); }
  else for (let i = 0; i < 24; i++) { const a = i / 24 * 2 * Math.PI; pts.push([p.u + Math.cos(a) * cr.r, p.v + Math.sin(a) * cr.r]); }
  let overhang = 0, facade = 0;
  for (const [u, v] of pts) {
    if (!inPoly(u, v, CFG.parcel)) overhang = Math.max(overhang, distToBoundary(u, v));
    if (u > H.u0 && u < H.u1 && v > H.v0 && v < H.v1) facade = Math.max(facade, Math.min(u - H.u0, H.u1 - u, v - H.v0, H.v1 - v));
  }
  return { dB, need, hLegal, ok: own && dB >= need - 1e-6, own, dHouse, overhang, facade, maxTop: D.top, maxW: D.w };
}
// ---- Straßenseite: Beete, Kies, Wege (grob nach Fotos vom 23.11.; werden durch Maße ersetzt) ----
// Lage im Gartensystem: Hausfront Straßenseite v = 9,60, Nordecke des Hauses u = −13,54 (NW-Giebel).
const VP = {
  // Betonpodest am Fuß der Außentreppe: jenseits der NW-Hauskante, die Stahltreppe endet bündig mit der Hauskante (Angabe).
  // Breite so, dass zwischen Podest und Beet B2 ca. 1,2 m zum Vorbeigehen bleiben; Stufen Richtung Hof.
  podest: { u0: -14.84, u1: -13.54, v0: 9.95, v1: 11.15, steps: 2, stepD: 0.3 },
  beete: [ // nur 90°- und 45°-Kanten (Angabe)
    { id: 'B1', name: 'Beet vor der Hausfront', pts: [[-11.7, 10.8], [-6.9, 10.8], [-6.9, 12.4], [-8.2, 13.7], [-11.7, 13.7]] },
    { id: 'B2', name: 'Beet an der Grenze NW', pts: [[nwU(11.15) + 0.55, 11.15], [nwU(11.15) + 2.75, 13.35], [nwU(11.15) + 2.75, 16.5], [nwU(16.5), 16.5], [nwU(11.15), 11.15]] },
    { id: 'B3', name: 'Beet zwischen Haus und Nebengebäude', pts: [[-3.6, 11.05], [0.5, 11.05], [0.5, 13.75], [-3.6, 13.75]] },
    { id: 'B4', name: 'Streifen an der Grenze NW zur Straße', pts: [[nwU(19.9), 19.9], [-15.5, 19.9], [-13.4, 28.3], [nwU(28.3), 28.3]] },
  ],
  wegNb: { v0: 16.5, v1: 17.75 },                                               // Pflaster vor dem Pavillon: Weg zum Nachbarn NW, Tor im Zaun
  schacht: [-6.7, 13.7],                                                        // Schachtdeckel
  wegNW: [[-15.15, 0], [-13.54, 0], [-13.54, 11.15], [-16.2, 11.15], [-16.2, 9.4], [-15.15, 9.4]], // Kiesweg am NW-Giebel, am Podest vorbei
  stufe: { u0: -6.1, u1: -4.2, v0: 9.6, v1: 10.75, h: 0.14 },                   // Granit-Podest vor der Haustür (Foto)
  verteiler: [1.25, 29.2],                                                      // Verteilerkasten an der Straßenecke (Foto)
  car: { u: -8.6, v: 18.8, L: 4.75, B: 1.92 },
};
// Nebengebäude parallel zur Grenze SO. Lokal: a = quer ab SO-Wand Richtung Hof, b = längs ab Giebel zum Haus
function garFrame() {
  const G = CFG.vp.garage, B0 = CFG.boundary[1], B1 = CFG.boundary[0], dl = Math.hypot(B1[0] - B0[0], B1[1] - B0[1]);
  const e = [(B1[0] - B0[0]) / dl, (B1[1] - B0[1]) / dl], c = [-e[1], e[0]], bu = boundaryUAt(G.v0);
  const O = [bu + c[0] * G.gap, G.v0 + c[1] * G.gap], P = (a, b) => [O[0] + a * c[0] + b * e[0], O[1] + a * c[1] + b * e[1]];
  return { G, O, e, c, P, phi: Math.atan2(-e[0], e[1]), S: P(0, 0), Wc: P(G.W, 0), N: P(G.W, G.L), E: P(0, G.L) };
}
// Kiesbett und Wärmepumpe an der Ecke Hofseite/Giebel zum Haus (lokal a, b)
function kiesWP() { const F = garFrame(), W = F.G.W; return [[W, 2.1], [W + 1.35, 2.1], [W + 1.35, 0.4], [W - 0.3, -1.05], [W - 1.45, 0], [W, 0]].map(([a, b]) => F.P(a, b)); }
const WP_LOC = { a0: 0.12, a1: 0.72, b0: 0.35, b1: 1.6, h0: 0.15, h1: 1.55 };     // a ab Hofseite der Garage nach außen
// Stellplätze 1–3 vor dem Giebel zur Straße (Aufteilungsplan: je 2,3 × 5,0 m, 0,7 m vor dem Giebel, 0,6 m von der Grenze)
function stellplaetze() { const F = garFrame(), b0 = F.G.L + 0.7; return [[3, 0.1], [2, 2.4], [1, 4.7]].map(([nr, a]) => ({ nr, pts: [F.P(a, b0), F.P(a + 2.3, b0), F.P(a + 2.3, b0 + 5.0), F.P(a, b0 + 5.0)] })); }
// Pflaster im Hof: bis 0,55 m vor den SO-Giebel, vom Nebengebäude bis zur Straße an der Grenze SO
function hofPoly() {
  const H = CFG.haus, F = garFrame();
  return [[H.u0, H.v1], [0.55, H.v1], [0.55, F.S[1]], F.S, F.E, [boundaryUAt(F.E[1]), F.E[1]], [0.71, 30.17], [-12.43, 30.64], [nwU(30.6), 30.6], [nwU(11.15), 11.15], [H.u0, 11.15]];
}
function polyArea(P) { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a) / 2; }
const ZAUN = {
  bau: { name: 'Bauzaun (heute)', k: 6, h: 2.0, note: 'Gitter, teils mit kaputten Schilfmatten. Im Modell rund 30 % blickdicht.' },
  kein: { name: 'Kein Zaun', k: 0 },
  stak: { name: 'Staketenzaun (Holz, halb offen)', k: 10.5, bw: 0.04, sp: 0.085, note: 'Senkrechte Staketen, gut halb offen. Grenzt ab, schützt kaum vor Blicken.' },
  latt: { name: 'Lattenzaun (Lärche, 3 cm Fuge)', k: 23, bw: 0.09, sp: 0.12, note: 'Senkrechte Latten mit Fuge. Von vorne zu etwa drei Vierteln dicht, schräg fast ganz.' },
  dicht: { name: 'Sichtschutzzaun (Lärche, blickdicht)', k: 80, bw: 0.12, sp: 0.12, note: 'Geschlossene Fläche. Wirkt an der Grenze hart; mit Pflanzen davor weicher.' },
};
// Nachbarhaus NW: Rahmen an der Fassade zum Hof. s = entlang der Fassade ab Ostecke, o = nach außen (negativ = im Haus)
function nbFrame() {
  const N = CFG.vp.nb, a = N.ang * Math.PI / 180, dA = [Math.cos(a), Math.sin(a)], nO = [-dA[1], dA[0]];
  return { dA, nO, P: (s, o) => [N.u + dA[0] * s + nO[0] * o, N.v + dA[1] * s + nO[1] * o], phi: Math.atan2(dA[1], dA[0]) };
}
// Fenster am NW-Giebel und an der Straßenseite (Hauskoordinate x → u = x − 13,54), Höhen ab FFB EG
const VP_WIN = {
  EG: [[1.778, 2.793, 'Schlafzimmer'], [4.293, 5.308, 'Kinderzimmer 1'], [6.808, 7.823, 'Kinderzimmer 1']],
  OG: [[1.778, 2.793, 'Wohnen'], [4.293, 5.308, 'Wohnen'], [6.808, 7.823, 'Bad']],
  DG: [[2.853, 4.705, 'Schlafzimmer'], [4.895, 6.748, 'Kind / Büro']],
  sEG: [[4.192, 5.207, 'Bad'], [11.214, 12.229, 'Büro']],
  sOG: [[2.547, 3.177, 'Bad W2', 1.25], [5.515, 6.145, 'Flur W2', 0.87], [7.395, 8.025, 'Flur W3', 0.87], [10.363, 10.993, 'Bad W3', 1.25]],
};
const LVL_F = { EG: 0, OG: 2.78, DG: 5.54 };
function vpGroups() {
  const H = CFG.haus, f = (l) => H.floor0 + LVL_F[l], uN = H.u0 - 0.05, vS = H.v1 + 0.05, X = (x) => x + H.u0;
  const eyes = [CFG.eyeSit, CFG.eyeStand];
  const gable = (l) => VP_WIN[l].map(([a, b, room]) => ({ room, pts: [a + 0.2, (a + b) / 2, b - 0.2].flatMap(v => eyes.map(e => [uN, v, f(l) + e])) }));
  const street = (list, l) => list.map(([a, b, room]) => ({ room, pts: [X(a) + 0.15, X((a + b) / 2), X(b) - 0.15].flatMap(u => eyes.map(e => [u, vS, f(l) + e])) }));
  const lb = []; for (let x = 4.5; x <= 12.3; x += 1.3) lb.push([X(x), H.v1 + 0.75, f('OG') - 0.04 + CFG.eyeStand]);
  return [
    { id: 'gEG', name: 'NW-Giebel EG', room: 'Wohnung 1: Schlafzimmer, Kinderzimmer 1', wins: gable('EG') },
    { id: 'gOG', name: 'NW-Giebel OG', room: 'Wohnung 2: Wohnen, Bad', wins: gable('OG') },
    { id: 'gDG', name: 'NW-Giebel DG', room: 'Wohnung 2: Schlafzimmer, Kind / Büro', wins: gable('DG') },
    { id: 'sBad', name: 'Badfenster EG', room: 'Wohnung 1, Doppelflügel rechts der Haustür', wins: street(VP_WIN.sEG.slice(0, 1), 'EG') },
    { id: 'sBuero', name: 'Bürofenster EG', room: 'Wohnung 1, links der Haustür', wins: street(VP_WIN.sEG.slice(1), 'EG') },
    { id: 'sOG', name: 'Laubengang OG', room: 'Wohnungstüren, Flur- und Badfenster', wins: [{ room: 'Laubengang', pts: lb, line: lb }].concat(street(VP_WIN.sOG, 'OG')) },
  ];
}
const VP_TGT = {
  haus: { name: 'Haus NW', long: 'Nachbarhaus NW', expl: 'zu den Fenstern im Erdgeschoss und zum Balkon des Nachbarhauses NW (Augenhöhe sitzend und stehend)' },
  garten: { name: 'Garten NW', long: 'Sitzplatz des Nachbarn NW', expl: 'zum Sitzplatz des Nachbarn NW vor seinem Haus (Tisch-, Sitz- und Stehhöhe)' },
  strasse: { name: 'Straße', long: 'Straße', expl: 'zur Straße (Fußgänger 1,65 m, Autofahrer 1,2 m)' },
  hof: { name: 'Hof', long: 'Wege im Hof', expl: 'zu den Wegen im Hof: von der Straße zur Haustür und zur Außentreppe (Augenhöhe 1,65 m)' },
};
function vpTargets(id) {
  const N = CFG.vp.nb, F = nbFrame(), out = [];
  if (id === 'haus') {
    for (const s of [1.6, 3.4, 5.2, 7.0, 8.8]) for (const h of [1.2, 1.65]) out.push([...F.P(s, 0.15), N.floor + h]);
    for (const s of [5.6, 7.3, 9.0]) for (const h of [1.2, 1.65]) out.push([...F.P(s, 0.7), N.og + h]);
  } else if (id === 'garten') {
    for (const s of [2.0, 4.0, 6.0, 8.0]) for (const o of [1.2, 2.3]) for (const h of [0.75, 1.2, 1.65]) out.push([...F.P(s, o), h]);
  } else if (id === 'strasse') {
    for (let u = -16; u <= 0.01; u += 2) { out.push([u, 31.6, 1.65]); out.push([u, 33.5, 1.2]); }
  } else {
    const walk = (a, b, h = 1.65) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 1.5)); for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, h]); };
    walk([-4.0, 29.5], [-5.1, 10.4]);        // Straße → Haustür
    walk([-6.2, 10.25], [-13.3, 10.25]);     // an der Hausfront entlang zur Treppe
    walk([-9.6, 19.0], [-14.2, 12.0]);       // aus dem Hof zwischen den Beeten zur Treppe
  }
  return out;
}
// Feste Hindernisse auf der Straßenseite: Zaun NW (Planung), Nebengebäude, Pavillon, Schuppen NW, Holzstapel, Auto
function vpCrowns() {
  const out = [], Z = CFG.vp.zaun, T = ZAUN[Z.typ] || ZAUN.kein, G = CFG.vp.garage, P = CFG.vp.pav;
  if (T.k) for (let v = Z.v0; v < Z.v1 - 1e-6; v += 0.5) {
    const v1 = Math.min(Z.v1, v + 0.5), vm = (v + v1) / 2, fu = nwU(vm) + Z.off, z = groundH(fu, vm);
    out.push({ cr: { shape: 'box', min: [fu - 0.03, v, z], max: [fu + 0.03, v1, z + (T.h || Z.h)] }, k: T.k });
  }
  const opaque = (min, max, k = 80) => out.push({ cr: { shape: 'box', min, max }, k });
  { const F = garFrame(), cs = [F.S, F.Wc, F.N, F.E], us = cs.map(p => p[0]), vs = cs.map(p => p[1]);
    opaque([Math.min(...us), Math.min(...vs), 0], [Math.max(...us), Math.max(...vs), (G.eave + G.ridge) / 2]); }
  out.push({ cr: { shape: 'cyl', c: [P.u, P.v], r: P.r, h0: 0, h1: 2.9 }, k: 80 });
  opaque([-26.5, 23.0, 0], [-18.8, 28.2, 4.0]);
  if (CFG.vp.car) { const C = VP.car; opaque([C.u - C.B / 2, C.v - C.L / 2, 0.2], [C.u + C.B / 2, C.v + C.L / 2, 1.0]); opaque([C.u - C.B / 2 + 0.1, C.v - 1.2, 1.0], [C.u + C.B / 2 - 0.1, C.v + 1.4, 1.55], 4); }
  return out;
}
function vpCoverage(plants, season, stage, grp, tgt) {
  const crowns = prepCrowns(plants, season, stage, vpCrowns()), T = vpTargets(tgt);
  let s = 0, n = 0;
  for (const w of grp.wins) for (const o of w.pts) for (const t of T) { s += 1 - rayT(o, t, crowns); n++; }
  return n ? s / n : 0;
}
if (typeof module !== 'undefined') module.exports = { CFG, NWB, nwU, VP, ZAUN, vpGroups, vpTargets, vpCrowns, vpCoverage, nbFrame, polyArea, SPECIES, STAGES, coverage, terraceTargets, plantChecks, distToBoundary, boundaryUAt, crown, crown0, dims, inPoly, groundH, groundNat, surveyH, waterV, h0, bachLevel, stairPlan, stairAt, stairZ, stairChecks, TIN, SURVEY };
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
      <button role="tab" id="t-vp" aria-selected="false" aria-controls="p-vp">Straßenseite</button>
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

    <section class="tabpane" id="p-vp" role="tabpanel" aria-labelledby="t-vp" hidden>
      <div class="vdesc">
        <h2>Straßenseite und Grenze Nordwest</h2>
        <p class="small muted">Hof, Beete, Nebengebäude, Wärmepumpe, Podest an der Außentreppe, Pavillon und Bauzaun grob nach den Fotos vom 23.11. Die Lage der Grenze stammt aus dem Kataster. Genaue Maße folgen; geschätzte Werte stehen im Tab „Annahmen“.</p>
        <div class="row"><button class="btn" id="vpPlan">Draufsicht Straßenseite</button><button class="btn" id="vpOver">Übersicht</button><label class="small"><input type="checkbox" id="vp-car" style="accent-color:var(--accent)"> Auto zeigen</label></div>
      </div>
      <div class="vdesc">
        <h2>Zaun zum Nachbarn Nordwest</h2>
        <div class="ctl"><label for="vz-typ" class="glbl">Zaun</label><select id="vz-typ"></select></div>
        <div class="editor" id="vzFields"></div>
        <p class="small" id="vzInfo"></p>
      </div>
      <div class="vdesc">
        <h2 id="vpCovTitle">Verdeckte Blickachsen</h2>
        <div class="row"><span class="glbl" id="vpTgtLbl">Ziel</span>
          <div class="seg" role="group" aria-labelledby="vpTgtLbl" id="vpTgt"></div></div>
        <p class="small muted" id="vpExplain"></p>
      </div>
      <div class="wins" id="vpWins"></div>
      <p class="small muted" id="vpNote"></p>
      <div>
        <h3>Pflanzen auf der Straßenseite</h3>
        <p class="small muted">Neue Pflanzen kommen ins Beet an der Grenze NW. Verschieben in der Draufsicht, Maße im Tab „Pflanzen“. Lage: <b>ab Nordecke</b> = entlang der Hausfront ab der Hausecke Nord (negativ = über den NW-Giebel hinaus Richtung Nachbar), <b>vor Hausfront</b> = Abstand von der Hausfront Richtung Straße.</p>
      </div>
      <div class="row">
        <select id="vpSp" aria-label="Pflanzenart für die Straßenseite"></select>
        <button class="btn primary" id="vpAdd">Pflanze hinzufügen</button>
      </div>
      <div class="plist" id="vpList"></div>
      <div class="vdesc">
        <h2>Beet 1 vor dem Bad</h2>
        <div class="row"><label class="small"><input type="checkbox" id="b1-zaun" style="accent-color:var(--accent)"> Staketenzaun 0,9 m</label><label class="small"><input type="checkbox" id="b1-mulch" style="accent-color:var(--accent)"> Rindenmulch</label><button class="btn" id="b1-reset">Vorschlag Beet 1 neu einsetzen</button></div>
        <div class="tablewrap"><table id="b1Tab"></table></div>
        <ul class="tight small" id="b1Notes"></ul>
      </div>
      <div><h3>Bestand und Flächen</h3></div>
      <div class="tablewrap"><table id="vpAreas"></table></div>
      <ul class="tight small" id="vpNotes"></ul>
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
      <div>
        <h2>Straßenseite</h2>
        <p class="small muted">Aus Lageplan und Fotos geschätzt, bis die Maße da sind. Beete, Kiesbett und Podest sind fest hinterlegt und werden mit den Maßen ersetzt.</p>
      </div>
      <div class="assume" id="assume3"></div>
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
        <span class="glbl">Datum</span>
        <input type="range" id="sunD" min="1" max="365" step="1" value="172" aria-label="Datum für den Sonnenstand">
        <span class="mono" id="sunDLbl">21. Jun</span>
        <span class="glbl">Uhrzeit</span>
        <input type="range" id="sunT" min="4.5" max="21.5" step="0.25" value="11" aria-label="Uhrzeit Sonnenstand">
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

// Vorschlag Beet 1: Fächerahorn vor dem Badfenster, darum lockere Bauerngarten-Stauden 1–1,5 m
function b1Plan() {
  return [
    mk('faecherahorn', -8.85, 12.25, { top: 3.5, w: 3.0, d: 3.0, stem: 0.5 }),
    mk('hortensie', -11.0, 12.6), mk('hortensie', -7.45, 11.55, { w: 1.1, d: 1.1, top: 1.2 }),
    mk('anemone', -10.2, 11.45), mk('anemone', -7.75, 12.95, { w: 0.9, d: 0.9 }),
    mk('phlox', -10.0, 13.15), mk('phlox', -11.15, 11.3, { top: 1.3 }),
  ];
}
// ---------- Zustand ----------
const ST = {
  variant: 'H', season: 'S', stage: 2, plants: [], sel: null, showWin: 'OG2', view: 'overview', sunT: 11, sunDay: 172, target: 'balcony',
  tab: 't-cov', vpTgt: 'haus', vpShow: 'gOG',
};
// Pflanzen auf der Straßenseite bzw. am NW-Giebel gehören nicht zu den Sichtschutz-Varianten am Südost-Giebel
const isVP = (p) => p.v > CFG.haus.v1 + 0.05 || p.u < CFG.haus.u0 - 0.05;
const LS_KEY = 'haus-garten-v1';
const SITE_KEYS = ['terrasse', 'kalk', 'bach', 'zaunNb', 'stair', 'survey'];
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ variant: ST.variant, plants: ST.plants, balcony: CFG.balcony, terrace: CFG.terrace, floor0: CFG.haus.floor0, lattice: CFG.lattice, site2: Object.fromEntries(SITE_KEYS.map(k => [k, CFG[k]])), vp: CFG.vp })); } catch (e) { /* ignorieren */ }
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (!s || !Array.isArray(s.plants)) return false;
    ST.variant = s.variant || 'H';
    ST.plants = s.plants.filter(p => SPECIES[p.sp]);
    ST.plants.forEach(p => { const n = parseInt(String(p.id).slice(1), 10); if (n >= pid) pid = n + 1; });
    if (s.balcony) Object.assign(CFG.balcony, s.balcony);
    if (s.terrace) Object.assign(CFG.terrace, s.terrace);
    if (typeof s.floor0 === 'number') CFG.haus.floor0 = s.floor0;
    if (typeof s.lattice === 'boolean') CFG.lattice = s.lattice;
    if (s.vp && typeof s.vp === 'object') {
      if (s.vp.garage && !('gap' in s.vp.garage)) delete s.vp.garage;
      for (const k of ['garage', 'pav', 'nb', 'zaun']) if (s.vp[k]) for (const [f, x] of Object.entries(s.vp[k])) if (f in CFG.vp[k] && typeof x === typeof CFG.vp[k][f] && (typeof x === 'string' || isFinite(x))) CFG.vp[k][f] = x;
      if (!ZAUN[CFG.vp.zaun.typ]) CFG.vp.zaun.typ = 'bau';
      if (typeof s.vp.car === 'boolean') CFG.vp.car = s.vp.car;
      if (s.vp.b1) for (const f of ['zaun', 'mulch']) if (typeof s.vp.b1[f] === 'boolean') CFG.vp.b1[f] = s.vp.b1[f];
    }
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
  // Straßenseite: Straße, Bahn, Hof mit Pflaster, Beete, Kies, Nachbargarten NW
  drawVorplatz(c, X, Y, poly, winter);
  // Terrasse des Nachbarn (Annahme)
  const T = CFG.terrace; poly([[T.u0, T.v0], [T.u1, T.v0], [T.u1, T.v1], [T.u0, T.v1]], winter ? '#a59d8e' : '#b8ad99');
  c.strokeStyle = 'rgba(90,80,64,0.35)'; c.lineWidth = 1;
  for (let u = T.u0; u <= T.u1 + 1e-6; u += 0.5) { c.beginPath(); c.moveTo(X(u), Y(T.v0)); c.lineTo(X(u), Y(T.v1)); c.stroke(); }
  for (let v = T.v0; v <= T.v1 + 1e-6; v += 0.5) { c.beginPath(); c.moveTo(X(T.u0), Y(v)); c.lineTo(X(T.u1), Y(v)); c.stroke(); }
  // Kiesstreifen am Giebel
  poly([[0, 0], [ub, 0], [ub, 0.6], [1.6, 0.6], [1.6, 7.9], [boundaryUAt(9.6), 9.6], [0, 9.6]], '#bcae97');
  // Grenzabstands-Zonen (Art. 47 AGBGB)
  for (const [zu0, zv1, zw, zh] of [[-0.6, 30.2, 7.2, 42], [-16.9, 32.6, 2.4, 40.6]]) {
  const img = c.getImageData(X(zu0), Y(zv1), Math.ceil(zw * P), Math.ceil(zh * P));
  const d = img.data, wpx = img.width;
  for (let j = 0; j < img.height; j++) for (let i = 0; i < wpx; i++) {
    const u = zu0 + (i + 0.5) / P, v = zv1 - (j + 0.5) / P;
    if (!inPoly(u, v, CFG.parcel) || v < waterV(u) + 0.3) continue;
    const dd = distToBoundary(u, v);
    let a = 0, rgb = null;
    if (dd < 0.5) { rgb = [200, 86, 52]; a = 0.55; } else if (dd < 2.0) { rgb = [236, 186, 74]; a = 0.42; if (((i + j) % 18) < 2) a = 0.62; } else if (dd < 2.06) { rgb = [150, 104, 26]; a = 0.85; }
    if (!rgb) continue;
    const k = (j * wpx + i) * 4;
    d[k] = d[k] * (1 - a) + rgb[0] * a; d[k + 1] = d[k + 1] * (1 - a) + rgb[1] * a; d[k + 2] = d[k + 2] * (1 - a) + rgb[2] * a;
  }
  c.putImageData(img, X(zu0), Y(zv1));
  }
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
  c.beginPath(); CFG.boundary.forEach(([u, v], i) => i ? c.lineTo(X(u), Y(v)) : c.moveTo(X(u), Y(v))); c.stroke();
  c.beginPath(); NWB.forEach(([u, v], i) => i ? c.lineTo(X(u), Y(v)) : c.moveTo(X(u), Y(v))); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#8c2f22'; CFG.boundary.concat(NWB).forEach(([u, v]) => { c.beginPath(); c.arc(X(u), Y(v), 0.16 * P, 0, 7); c.fill(); });
  c.save(); c.translate(X(nwU(6.0) - 0.3), Y(6.0)); c.rotate(-Math.PI / 2); c.fillStyle = '#8c2f22'; c.textAlign = 'center';
  c.font = `700 ${Math.round(0.36 * P)}px "Source Sans 3", sans-serif`; c.fillText('Grenze zum Nachbarn NW', 0, 0); c.restore();
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
  g.add(box(2.2, 10.9, v1, 27.3, 0, og, MAT.cream));
  g.add(prismV(2.2, 10.9, v1, 27.3, og, eave, ridge + 0.4, MAT.woodNb));
  g.add(roof('v', 2.2, 10.9, v1, 27.3, eave, ridge + 0.4, 0.9, 0.5, MAT.roofNb, 0.26));
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
  // weiteres Nachbarhaus (nur Volumen)
  for (const [a0, a1, b0, b1] of [[22.0, 31.0, 9.5, 19.0]]) {
    statics.add(box(a0, a1, b0, b1, 0, 5.4, MAT.house));
    statics.add(prismU(a0, a1, b0, b1, 5.4, 5.4, 7.6, MAT.house));
    statics.add(roof('u', a0, a1, b0, b1, 5.4, 7.6, 0.9, 0.7, MAT.roofGrey, 0.24));
  }
  // Straße und Bahn außerhalb des Lageplan-Ausschnitts (innerhalb: Bodentextur)
  for (const [a, b] of [[-150, GA.u0], [GA.u1, 150]]) { statics.add(box(a, b, 31.0, 36.0, -0.02, 0.03, MAT.street, false)); statics.add(box(a, b, 37.6, 40.6, -0.02, 0.06, MAT.ballast, false)); }
  for (const rv of [38.4, 39.835]) statics.add(box(-150, 150, rv - 0.035, rv + 0.035, 0.06, 0.2, MAT.rail, false));
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
  spots.push([16.5, 20, 13], [-18.0, 21.5, 7], [-18.2, 4.5, 7.5], [27, -2, 10], [-22, -1, 9]); // NW: Baum hinter dem Pavillon, alter Obstbaum am Kiesweg (Fotos)
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

// ---------- Straßenseite: Bauteile in 3D (Bestand nach Fotos vom 23.11., Zaun NW als Planung) ----------
const vpGrp = new THREE.Group(); root.add(vpGrp);
function boardTexture() { // Lärchenschalung senkrecht, Boden-Deckel-Schalung
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), R = rng(5);
  for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(${26 + R() * 6}, ${42 + R() * 10}%, ${44 + R() * 8}%)`; x.fillRect(i * 16, 0, 16, 128); }
  for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(70,40,20,0.35)'; x.fillRect(i * 16 + 13, 0, 3, 128); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function meshTexture() { // Bauzaun-Gitter, Maschen ca. 10 × 25 cm
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const x = c.getContext('2d');
  x.clearRect(0, 0, 32, 64); x.fillStyle = '#c3c8ca'; x.fillRect(0, 0, 3, 64); x.fillRect(0, 0, 32, 3);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
Object.assign(MAT, {
  boards: lam(0xffffff, { map: boardTexture() }), door: lam(0x7a4a2a), gutter: lam(0x3a3d40),
  hp: lam(0x9a9ea2), hpDark: lam(0x2a2d30), car: lam(0x1c1e21), carGlass: lam(0x2c3742), tyre: lam(0x151515),
  mesh: new THREE.MeshLambertMaterial({ map: meshTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }),
  reed: lam(0xa08c63, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }), foot: lam(0x9a968e),
  pavWood: lam(0x7b5a3d), pavRoof: lam(0x7d8082), bin: lam(0x2d68a8), ballast: lam(0x8a857c), rail: lam(0x5b534c),
  staket: lam(0x9b8468), shutter: lam(0x9a7a52), white: lam(0xf2f0ea), grill: lam(0x1d1d1d), granite: lam(0xc9c8c3), woodOld: lam(0x9a7b5f), pv: lam(0x34465a),
});
function cyl(u, v, r, h0, h1, mat, seg = 10) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h1 - h0, seg), mat); m.position.copy(W(u, (h0 + h1) / 2, v)); m.castShadow = true; m.receiveShadow = true; return m; }
function doorAt(face, plane, a0, a1, h, glass = true) { // Holztür mit kleinem Glasfeld
  const g = new THREE.Group(), mk = (b0, b1, c0, c1, e0, e1, mat) => {
    if (face === '+u' || face === '-u') { const sg = face === '+u' ? 1 : -1; g.add(box(plane + (sg > 0 ? b0 : -b1), plane + (sg > 0 ? b1 : -b0), c0, c1, e0, e1, mat, false)); }
    else { const sg = face === '+v' ? 1 : -1; g.add(box(c0, c1, plane + (sg > 0 ? b0 : -b1), plane + (sg > 0 ? b1 : -b0), e0, e1, mat, false)); }
  };
  mk(0, 0.05, a0, a1, 0.02, h, MAT.door);
  if (glass) mk(0.05, 0.06, a0 + 0.15, a1 - 0.15, h * 0.62, h - 0.15, MAT.glass);
  return g;
}
function buildGarage(g) {
  const F = garFrame(), G = F.G, Wd = G.W, L = G.L, oh = G.oh, ang = Math.atan2(G.ridge - G.eave, Wd / 2), eaveOut = G.eave - oh * Math.tan(ang);
  const h = new THREE.Group(); h.position.copy(W(F.O[0], 0, F.O[1])); h.rotation.y = F.phi; g.add(h);
  // lokal: u = −a (0 = SO-Wand, −W = Hofseite), v = b (0 = Giebel zum Haus, L = Giebel zur Straße)
  h.add(texBox(-Wd, 0, 0, L, 0, G.eave, MAT.boards, 1.0));
  h.add(prismV(-Wd, 0, 0, L, G.eave, G.eave, G.ridge, MAT.boards));
  h.add(roof('v', -Wd, 0, 0, L, G.eave, G.ridge, oh, oh, MAT.roofRed, 0.18));
  h.add(doorAt('-u', -Wd, 2.9, 5.9, 2.2, false));                                  // Garagentor zur Hofseite (Angabe; Lage geschätzt)
  h.add(doorAt('-v', 0, -(Wd - 1.0), -(Wd - 1.95), 2.05));                         // zwei Türen im Giebel zum Haus (Angabe)
  h.add(doorAt('-v', 0, -1.45, -0.5, 2.05));
  for (const uu of [-Wd - oh + 0.05, oh - 0.05]) h.add(box(uu - 0.06, uu + 0.06, -oh, L + oh, eaveOut - 0.12, eaveOut, MAT.gutter, false));
  h.add(cyl(-Wd - 0.15, 0.15, 0.045, 0, eaveOut - 0.05, MAT.gutter, 8));
  h.add(box(-Wd - oh + 0.05, -Wd - 0.15, 0.11, 0.19, eaveOut - 0.25, eaveOut - 0.15, MAT.gutter, false));
  const P = WP_LOC;
  h.add(box(-(Wd + P.a1), -(Wd + P.a0), P.b0, P.b1, P.h0, P.h1, MAT.hp));
  h.add(box(-(Wd + P.a0), -Wd, P.b0 + 0.15, P.b1 - 0.15, 0, 0.5, MAT.hpDark));
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 28), MAT.hpDark); fan.rotation.z = Math.PI / 2;
  fan.position.copy(W(-(Wd + P.a1) - 0.01, (P.h0 + P.h1) / 2 + 0.08, (P.b0 + P.b1) / 2)); h.add(fan);
  const lw = label('Wärmepumpe', { size: 0.3 }); lw.position.copy(W(-(Wd + P.a1) - 0.2, P.h1 + 0.4, (P.b0 + P.b1) / 2)); h.add(lw);
  const ln = label('Nebengebäude', { size: 0.4 }); ln.position.copy(W(-Wd / 2, G.ridge + 0.7, L / 2)); h.add(ln);
}
function buildPodest(g) {
  const P = VP.podest, n = P.steps + 1, zTop = n * (2.74 + CFG.haus.floor0) / 17;   // Außentreppe mit 17 gleichen Steigungen: 13 Stahlstufen, Podest, 2 Betonstufen zum Hof
  g.add(box(P.u0, P.u1, P.v0, P.v1, 0, zTop, MAT.concrete));
  for (let i = 1; i <= P.steps; i++) g.add(box(P.u0, P.u1, P.v1, P.v1 + i * P.stepD, 0, zTop * (n - i) / n, MAT.concrete));
  const rl = (a, b, h) => { const du = b[0] - a[0], dv = b[1] - a[1], L = Math.hypot(du, dv), m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, 0.12), MAT.larch); m.position.copy(W((a[0] + b[0]) / 2, h, (a[1] + b[1]) / 2)); m.rotation.y = Math.atan2(dv, du); m.castShadow = true; g.add(m); };
  const A = [P.u1 - 0.04, P.v0 + 0.04], A2 = [P.u0 + 0.04, P.v0 + 0.04], B = [P.u0 + 0.04, P.v1 - 0.04], C = [P.u0 + 0.45, P.v1 - 0.04];
  for (const [u, v] of [A, A2, B, C]) g.add(box(u - 0.04, u + 0.04, v - 0.04, v + 0.04, zTop, zTop + 1.0, MAT.larch));
  for (const h of [zTop + 0.5, zTop + 0.97]) { rl(A, A2, h); rl(A2, B, h); rl(B, C, h); }
}
function buildPavillon(g) {
  const P = CFG.vp.pav, wall = new THREE.Mesh(new THREE.CylinderGeometry(P.r, P.r, 2.1, 8), MAT.pavWood);
  wall.position.copy(W(P.u, 1.05, P.v)); wall.rotation.y = Math.PI / 8; wall.castShadow = wall.receiveShadow = true; g.add(wall);
  const rf = new THREE.Mesh(new THREE.ConeGeometry(P.r + 0.3, 1.1, 8), MAT.pavRoof); rf.position.copy(W(P.u, 2.1 + 0.55, P.v)); rf.rotation.y = Math.PI / 8; rf.castShadow = true; g.add(rf);
  const lp = label('Pavillon', { size: 0.32 }); lp.position.copy(W(P.u, 3.5, P.v)); g.add(lp);
}
function buildBauzaun(g, v0, v1) {
  const L = 3.45, n = Math.max(1, Math.round((v1 - v0) / L)), pl = (v1 - v0) / n;
  for (let i = 0; i < n; i++) {
    const va = v0 + i * pl, vb = va + pl, vm = (va + vb) / 2, u = nwU(vm) + 0.05, z = groundH(u, vm);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pl - 0.06, 1.9), MAT.mesh.clone()); m.material.map = MAT.mesh.map.clone(); m.material.map.repeat.set((pl - 0.06) / 0.1, 1.9 / 0.25); m.material.map.needsUpdate = true;
    m.rotation.y = Math.PI / 2; m.position.copy(W(u, z + 0.15 + 0.95, vm)); g.add(m);
    if (vm < 19 && i % 4 !== 3) { const r = new THREE.Mesh(new THREE.PlaneGeometry(pl * 0.7, 1.75), MAT.reed); r.rotation.y = Math.PI / 2; r.position.copy(W(u + 0.03, z + 0.15 + 0.9, vm - pl * 0.1)); g.add(r); }
    g.add(box(u - 0.015, u + 0.015, va + 0.02, vb - 0.02, z + 2.06, z + 2.1, MAT.galv, false));
    g.add(box(u - 0.015, u + 0.015, va + 0.02, vb - 0.02, z + 0.15, z + 0.19, MAT.galv, false));
    for (const vv of [va + 0.03, vb - 0.03]) g.add(cyl(u, vv, 0.02, z + 0.12, z + 2.1, MAT.galv, 6));
    g.add(box(u - 0.33, u + 0.33, va - 0.1, va + 0.1, z, z + 0.15, MAT.foot));
  }
}
function buildZaunNW(g) {
  const Z = CFG.vp.zaun, T = ZAUN[Z.typ];
  if (!T || Z.typ === 'kein') return;
  if (Z.typ === 'bau') { buildBauzaun(g, Z.v0, Z.v1); return; }
  const n = Math.max(1, Math.floor((Z.v1 - Z.v0) / T.sp)), im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 1, T.bw), MAT.fenceNew, n);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const v = Z.v0 + (i + 0.5) * (Z.v1 - Z.v0) / n, u = nwU(v) + Z.off, z = groundH(u, v), hh = Z.h - 0.05;
    sc.set(1, hh, 1); M.compose(W(u, z + 0.05 + hh / 2, v), q, sc); im.setMatrixAt(i, M);
  }
  im.castShadow = true; im.receiveShadow = true; g.add(im);
  const np = Math.max(1, Math.round((Z.v1 - Z.v0) / 1.9));
  for (let i = 0; i <= np; i++) {
    const v = Z.v0 + (Z.v1 - Z.v0) * i / np, u = nwU(v) + Z.off + 0.06, z = groundH(u, v);
    g.add(box(u - 0.045, u + 0.045, v - 0.045, v + 0.045, z, z + Z.h + 0.04, MAT.larchDark));
    if (i < np) { const v2 = Z.v0 + (Z.v1 - Z.v0) * (i + 1) / np; for (const hh of [0.3, Z.h - 0.3]) g.add(box(u - 0.035, u + 0.015, v, v2, z + hh - 0.035, z + hh + 0.035, MAT.larchDark, false)); }
  }
  // Tor zum Nachbarn NW vor dem Pavillon: stärkere Pfosten
  const T0 = VP.wegNb, tv0 = (T0.v0 + T0.v1) / 2 - 0.55, tv1 = tv0 + 1.1;
  if (tv0 > Z.v0 && tv1 < Z.v1) for (const v of [tv0, tv1]) { const u = nwU(v) + Z.off + 0.06; g.add(box(u - 0.06, u + 0.06, v - 0.06, v + 0.06, 0, Z.h + 0.12, MAT.larchDark)); }
}
function buildNbNW(g) { // Nachbarhaus NW: altes Bauernhaus, Fensterläden, Balkon an der Hofseite (Fotos, Maße geschätzt)
  const N = CFG.vp.nb, F = nbFrame(), h = new THREE.Group();
  h.position.copy(W(N.u, 0, N.v)); h.rotation.y = F.phi;
  h.add(box(0, N.len, -N.dep, 0, 0, N.og, MAT.cream));
  h.add(box(0, N.len, -N.dep, 0, N.og, N.eave, MAT.woodOld));
  h.add(prismU(0, N.len, -N.dep, 0, N.eave, N.eave, N.ridge, MAT.woodOld));
  h.add(roof('u', 0, N.len, -N.dep, 0, N.eave, N.ridge, 1.0, 0.9, MAT.roofNb, 0.26));
  const win = (a0, a1, z0, z1) => { h.add(windowAt('+v', 0, a0, a1, z0, z1)); for (const [b0, b1] of [[a0 - 0.48, a0 - 0.04], [a1 + 0.04, a1 + 0.48]]) h.add(box(b0, b1, 0.0, 0.04, z0, z1, MAT.shutter, false)); };
  for (const a of [1.2, 3.2, 6.2, 8.4]) win(a, a + 0.95, N.floor + 0.9, N.floor + 2.1);
  for (const a of [1.5, 8.4]) win(a, a + 0.95, N.og + 0.9, N.og + 2.1);
  for (const a of [3.6, 6.0]) h.add(windowAt('+v', 0, a, a + 0.95, N.og, N.og + 2.1, true));
  // Balkon über die ganze Hofseite, Brüstung mit Brettern, Zierleiste darunter (Foto)
  const b0 = 0.2, b1 = N.len - 0.2;
  h.add(box(b0, b1, 0, 1.3, N.og - 0.18, N.og, MAT.woodOld));
  h.add(box(b0, b1, 1.24, 1.3, N.og, N.og + 1.0, MAT.woodOld));
  h.add(box(b0, b1, 1.22, 1.3, N.og - 0.4, N.og - 0.18, MAT.woodOld, false));
  for (const a of [b0, b1 - 0.06]) h.add(box(a, a + 0.06, 0, 1.3, N.og, N.og + 1.0, MAT.woodOld));
  // PV-Module auf der Dachseite zum Hof (Foto)
  { const ang = Math.atan2(N.ridge - N.eave, N.dep / 2), L = (N.dep / 2) / Math.cos(ang) * 0.75, pv = new THREE.Mesh(new THREE.BoxGeometry(N.len * 0.8, 0.04, L), MAT.pv);
    pv.position.copy(W(N.len / 2, (N.eave + N.ridge) / 2 + 0.32, -N.dep / 4)); pv.rotation.x = -ang; h.add(pv); }
  // Bank und Grill am Sitzplatz (Fotos)
  h.add(box(2.4, 3.9, 0.35, 0.8, 0.42, 0.47, MAT.white)); h.add(box(2.4, 3.9, 0.35, 0.4, 0.47, 0.9, MAT.white));
  const gr = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), MAT.grill); gr.position.copy(W(5.6, 0.85, 1.9)); gr.castShadow = true; h.add(gr);
  for (const a of [0, 2.1, 4.2]) h.add(cyl(5.6 + 0.2 * Math.cos(a), 1.9 + 0.2 * Math.sin(a), 0.015, 0, 0.7, MAT.grill, 4));
  const lb = label('Nachbar NW', { size: 0.75 }); lb.position.copy(W(N.len / 2, N.ridge + 1.0, -N.dep / 2)); h.add(lb);
  g.add(h);
  // Schuppen des Nachbarn an der Straße (Holz, rotes Ziegeldach)
  g.add(box(-26.5, -18.8, 23.0, 28.2, 0, 3.0, MAT.woodNb));
  g.add(prismU(-26.5, -18.8, 23.0, 28.2, 3.0, 3.0, 5.0, MAT.woodNb));
  g.add(roof('u', -26.5, -18.8, 23.0, 28.2, 3.0, 5.0, 0.7, 0.6, MAT.roofRed, 0.2));
}
function buildCar(g) {
  const C = VP.car, u0 = C.u - C.B / 2, u1 = C.u + C.B / 2, v0 = C.v - C.L / 2, v1 = C.v + C.L / 2;
  g.add(box(u0, u1, v0, v1, 0.22, 0.95, MAT.car)); g.add(box(u0 + 0.12, u1 - 0.12, C.v - 1.25, C.v + 1.45, 0.95, 1.55, MAT.carGlass));
  for (const [uu, vv] of [[u0 + 0.12, v0 + 0.8], [u1 - 0.12, v0 + 0.8], [u0 + 0.12, v1 - 0.85], [u1 - 0.12, v1 - 0.85]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14), MAT.tyre); w.rotation.z = Math.PI / 2; w.position.copy(W(uu, 0.34, vv)); g.add(w); }
}
function buildStaketen(g) { // Kastanien-Staketenzaun rund um Beet 1, 10 cm innerhalb der Einfassung
  const B = CFG.vp.b1; if (!B.zaun) return;
  const P = VP.beete.find(b => b.id === 'B1').pts, n = P.length, cx = P.reduce((a, q) => a + q[0], 0) / n, cy = P.reduce((a, q) => a + q[1], 0) / n;
  const ins = P.map(([u, v]) => { const d = Math.hypot(u - cx, v - cy); return [u - (u - cx) / d * 0.12, v - (v - cy) / d * 0.12]; });
  const pick = [], posts = [];
  for (let i = 0; i < n; i++) {
    const a = ins[i], b = ins[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.floor(L / 0.08);
    for (let j = 0; j < k; j++) { const t = (j + 0.5) / k; if (i === n - 1 && Math.abs(t - 0.5) * L < 0.4) continue; pick.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (j * 7919) % 5]); }
    const np = Math.max(1, Math.round(L / 1.6)); for (let j = 0; j < np; j++) posts.push([a[0] + (b[0] - a[0]) * j / np, a[1] + (b[1] - a[1]) * j / np]);
    for (const hh of [0.2, B.h - 0.2]) { const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.01, 0.01), MAT.galv); m.position.copy(W((a[0] + b[0]) / 2, hh, (a[1] + b[1]) / 2)); m.rotation.y = Math.atan2(b[1] - a[1], b[0] - a[0]); g.add(m); }
  }
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.016, 0.02, 1, 5), MAT.staket, pick.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  pick.forEach(([u, v, r], i) => { const hh = B.h - 0.04 * r; sc.set(1, hh, 1); M.compose(W(u, hh / 2, v), q, sc); im.setMatrixAt(i, M); });
  im.castShadow = true; g.add(im);
  for (const [u, v] of posts) g.add(cyl(u, v, 0.04, 0, B.h + 0.05, MAT.staket, 6));
}
function buildVorplatz() {
  clearGroup(vpGrp); const g = vpGrp;
  buildGarage(g); buildPodest(g); buildPavillon(g); buildZaunNW(g); buildNbNW(g); buildStaketen(g);
  if (CFG.vp.car) buildCar(g);
  const [su, sv] = VP.schacht; g.add(cyl(su, sv, 0.36, 0, 0.02, MAT.frame, 20));
  { const S = VP.stufe; g.add(box(S.u0, S.u1, S.v0, S.v1, 0, S.h, MAT.granite)); }
  { const [vu, vv] = VP.verteiler; g.add(box(vu - 0.45, vu + 0.45, vv - 0.22, vv + 0.22, 0, 1.3, MAT.foot)); }
  req();
}
// ---------- Straßenseite: Bodentextur ----------
function drawVorplatz(c, X, Y, poly, winter) {
  const P = GA.px, H = CFG.haus, GF = garFrame(), R = rng(23);
  const path = (pts) => { c.beginPath(); pts.forEach(([u, v], i) => i ? c.lineTo(X(u), Y(v)) : c.moveTo(X(u), Y(v))); c.closePath(); };
  const speckle = (pts, base, cols, per) => { poly(pts, base); c.save(); path(pts); c.clip(); let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity; for (const [u, v] of pts) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); } const n = Math.round((u1 - u0) * (v1 - v0) * per); for (let i = 0; i < n; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(X(u0 + R() * (u1 - u0)), Y(v0 + R() * (v1 - v0)), 2, 2); } c.restore(); };
  const curb = (pts) => { c.strokeStyle = '#dcdbd5'; c.lineWidth = 0.1 * P; c.lineJoin = 'miter'; path(pts); c.stroke(); };
  // Straße, Bankett, Grünstreifen, Bahn
  poly([[GA.u0, 30.7], [GA.u1, 30.1], [GA.u1, 31.0], [GA.u0, 31.0]], '#a49e93');
  poly([[GA.u0, 31.0], [GA.u1, 31.0], [GA.u1, 36.0], [GA.u0, 36.0]], '#727270');
  poly([[GA.u0, 36.0], [GA.u1, 36.0], [GA.u1, 37.6], [GA.u0, 37.6]], winter ? '#8a917a' : '#7b955a');
  poly([[GA.u0, 37.6], [GA.u1, 37.6], [GA.u1, 40.6], [GA.u0, 40.6]], '#8d877d');
  c.fillStyle = '#5a4a3c'; for (let u = GA.u0; u < GA.u1; u += 0.6) c.fillRect(X(u), Y(40.0), 0.16 * P, 2.0 * P);
  poly([[-16.35, 32.53], [-11.71, 31.92], [-12.43, 30.64], [-16.4, 30.66]], '#a49e93');               // Ecke der Parzelle an der Straße (Kies)
  // Hof: Betonpflaster in Reihen parallel zur Hausfront, gemischte Steine (Foto)
  const hof = hofPoly();
  poly(hof, '#6f685e'); c.save(); path(hof); c.clip();
  for (let v = H.v1; v < 30.8; v += 0.155) for (let u = -17 - R() * 0.2; u < 2;) {
    const L = [0.14, 0.17, 0.21][Math.floor(R() * 3)], white = R() < 0.14;
    c.fillStyle = white ? `hsl(40, 5%, ${68 + R() * 7}%)` : `hsl(${26 + R() * 14}, ${8 + R() * 6}%, ${47 + R() * 12}%)`;
    c.fillRect(X(u) + 0.6, Y(v + 0.155) + 0.6, L * P - 1.2, 0.155 * P - 1.2); u += L;
  }
  c.restore();
  // alter Plattenweg entlang der Grenze SO bis zur Straße, Kiesstreifen an der SO-Wand des Nebengebäudes (Fotos)
  const bS = [boundaryUAt(GF.S[1]), GF.S[1]], bE = [boundaryUAt(GF.E[1]), GF.E[1]], pl = [[0.55, H.v1], [2.2, H.v1], [2.2, 30.1], [0.71, 30.17], bS, [0.55, GF.S[1]]];
  poly(pl, '#a6a29a'); c.strokeStyle = 'rgba(60,56,50,0.35)'; c.lineWidth = 1; c.save(); path(pl); c.clip();
  for (let v = H.v1; v < 30.3; v += 0.5) { c.beginPath(); c.moveTo(X(0.5), Y(v)); c.lineTo(X(2.3), Y(v)); c.stroke(); }
  for (let u = 0.55; u < 2.3; u += 0.5) { c.beginPath(); c.moveTo(X(u), Y(H.v1)); c.lineTo(X(u), Y(30.3)); c.stroke(); }
  c.restore();
  speckle([GF.S, GF.E, bE, bS], '#b3aea5', ['#8f8a82', '#cfcbc4'], 400);
  curb([bS, [0.71, 30.17]]);
  curb([[0.55, H.v1], [0.55, GF.S[1]], bS]);
  // NW-Giebel: Kiesweg, daneben Wiese bis zur Grenze
  speckle(VP.wegNW, '#aaa397', ['#8f887c', '#c4beb3', '#7d776d'], 260);
  // Beete (Erde), Kiesbett unter der Wärmepumpe, Rinnen, Schacht
  for (const b of VP.beete) {
    if (b.id === 'B1' && CFG.vp.b1.mulch) speckle(b.pts, '#5a3b26', ['#7a4f30', '#3f2818', '#8a5a36', '#4a3020'], 900);    // Rindenmulch
    else speckle(b.pts, winter ? '#6a5a4a' : '#6e5c49', ['#5a4a3b', '#857260', '#4c3f33'], 160);
  }
  const kw = kiesWP(); speckle(kw, '#bdb9b1', ['#9c978e', '#d6d3cc', '#86817a'], 400);
  for (const b of VP.beete) curb(b.pts);
  curb(kw.slice(0, 5));
  poly([GF.P(0.3, 0), GF.P(GF.G.W - 0.4, 0), GF.P(GF.G.W - 0.4, -0.12), GF.P(0.3, -0.12)], '#26282a');   // Rinne vor dem Giebel zum Haus
  // Stellplätze 1–3 vor dem Giebel zur Straße (Aufteilungsplan)
  c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 0.08 * P; c.setLineDash([]);
  for (const sp of stellplaetze()) { path(sp.pts); c.stroke(); const m = sp.pts.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0]);
    c.save(); c.fillStyle = 'rgba(255,255,255,0.95)'; c.font = `700 ${Math.round(0.7 * P)}px "Source Sans 3", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(sp.nr), X(m[0]), Y(m[1])); c.restore(); }
  const [su, sv] = VP.schacht; c.fillStyle = '#6f6a62'; c.beginPath(); c.arc(X(su), Y(sv), 0.52 * P, 0, 7); c.fill();
  // Garten des Nachbarn NW: Plattenweg und Sitzplatz vor der Hofseite (Fotos)
  const F = nbFrame(), sitz = [F.P(0.4, 0.15), F.P(9.6, 0.15), F.P(9.6, 2.9), F.P(0.4, 2.9)];
  poly(sitz, '#b3aa98'); c.save(); path(sitz); c.clip(); c.strokeStyle = 'rgba(70,64,54,0.45)'; c.lineWidth = 1.2;
  for (let i = 0; i < 70; i++) { const [a, b] = F.P(0.4 + R() * 9.2, 0.15 + R() * 2.75); c.beginPath(); c.moveTo(X(a), Y(b)); c.lineTo(X(a + (R() - 0.5) * 0.9), Y(b + (R() - 0.5) * 0.9)); c.stroke(); }
  c.restore();
  // Beschriftung: Beete mit Fläche, Abstände an der Grenze NW
  c.fillStyle = 'rgba(255,255,255,0.92)'; c.font = `600 ${Math.round(0.3 * P)}px "Source Sans 3", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const b of VP.beete) { let su2 = 0, sv2 = 0; b.pts.forEach(([u, v]) => { su2 += u; sv2 += v; }); const cu = su2 / b.pts.length, cv = sv2 / b.pts.length; c.fillText(`${b.id} · ${fmt(polyArea(b.pts), 0)} m²`, X(cu), Y(cv)); }
  c.fillStyle = 'rgba(28,36,29,0.85)'; c.font = `600 ${Math.round(0.3 * P)}px "IBM Plex Mono", monospace`; c.textAlign = 'left';
  for (let b = 2; b <= 20; b += 2) { const v = H.v1 + b; if (v < 11.3 || v > 29) continue; c.fillText(`${b} m`, X(nwU(v) + 0.25), Y(v)); c.fillRect(X(nwU(v)), Y(v) - 1, 0.2 * P, 2); }
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
  if (ST.tab === 't-vp') { rebuildSightVP(); return; }
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

function rebuildSightVP() {
  const g = vpGroups().find(x => x.id === ST.vpShow);
  if (!g) { req(); return; }
  const crowns = prepCrowns(ST.plants, ST.season, ST.stage, vpCrowns()), T = vpTargets(ST.vpTgt);
  const eyes = g.wins.flatMap(w => w.line || [w.pts[3] || w.pts[w.pts.length - 1]]);
  const pos = [], cols = [], cc = new THREE.Color();
  const colorFor = (t) => t > 0.66 ? cc.set(0xd8432f) : (t > 0.33 ? cc.set(0xe3a21a) : cc.set(0x2e9a52));
  for (const e of eyes) for (const t of T) {
    colorFor(rayT(e, t, crowns)); const a = W(e[0], e[2], e[1]), b = W(t[0], t[2], t[1]);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z); cols.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: eyes.length > 6 ? 0.5 : 0.8 }));
  lines.renderOrder = 5; lines.visible = !firstPerson(); sightGrp.add(lines);
  const dotGeo = new THREE.SphereGeometry(0.07, 8, 6), eGeo = new THREE.SphereGeometry(0.1, 10, 8), eMat = new THREE.MeshBasicMaterial({ color: 0x9c5a22 });
  for (const t of T) { let s = 0; for (const e of eyes) s += rayT(e, t, crowns); s /= eyes.length; const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: colorFor(s).getHex() })); m.position.copy(W(t[0], t[2], t[1])); sightGrp.add(m); }
  for (const e of eyes) { const m = new THREE.Mesh(eGeo, eMat); m.position.copy(W(e[0], e[2], e[1])); sightGrp.add(m); }
  req();
}

// ---------- Sonne ----------
// Tag im Jahr (1–365, ohne Schaltjahr) → „21. Jun“
const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], MLEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function dayText(n) { let m = 0; while (n > MLEN[m]) { n -= MLEN[m]; m++; } return `${n}. ${MON[m]}`; }
// Sonnenstand für Tag im Jahr und Uhrzeit (MEZ, im Sommer MESZ): Deklination und Zeitgleichung nach den üblichen Näherungen (±0,5°)
function sunDir(day, clock) {
  const lat = 47.75 * Math.PI / 180, lon = 11.82; // Lage auf ca. 1 km gerundet (keine genaue Adresse im Repo); für den Sonnenstand ohne Einfluss
  const dec = 23.44 * Math.sin(2 * Math.PI * (284 + day) / 365) * Math.PI / 180;
  const dst = day >= 87 && day <= 300 ? 1 : 0;                 // Sommerzeit etwa Ende März bis Ende Oktober
  const Bq = 2 * Math.PI * (day - 81) / 364, eot = 9.87 * Math.sin(2 * Bq) - 7.53 * Math.cos(Bq) - 1.5 * Math.sin(Bq); // Zeitgleichung in Minuten
  const solar = clock - dst - (15 - lon) / 15 + eot / 60;
  const H = (solar - 12) * 15 * Math.PI / 180;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) + Math.PI;
  const b = az - CFG.bearingV * Math.PI / 180;
  return { u: Math.cos(alt) * Math.sin(b), v: Math.cos(alt) * Math.cos(b), h: Math.sin(alt), alt: alt * 180 / Math.PI, az: az * 180 / Math.PI };
}
function updateSun() {
  const s = sunDir(ST.sunDay, ST.sunT);
  const c = W(-3, 0, 3);
  sun.position.copy(toWorld(W(-3 + s.u * 80, Math.max(s.h, 0.02) * 80, 3 + s.v * 80)));
  sun.target.position.copy(toWorld(c)); sun.target.updateMatrixWorld();
  const up = Math.max(0, Math.min(1, s.alt / 8));
  sun.intensity = 0.95 * up; hemi.intensity = 0.6 + 0.25 * up;
  const hh = Math.floor(ST.sunT), mm = Math.round((ST.sunT - hh) * 60);
  $('sunLbl').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` + (s.alt < 0 ? ' · Nacht' : '');
  $('sunT').setAttribute('aria-valuetext', `${hh} Uhr ${mm}, Sonnenhöhe ${Math.round(s.alt)} Grad`);
  $('sunD').value = String(ST.sunDay); $('sunDLbl').textContent = dayText(ST.sunDay); $('sunD').setAttribute('aria-valuetext', dayText(ST.sunDay));
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
  { id: 'vp', name: 'Straßenseite' },
  { id: 'vpPlan', name: 'Draufsicht Hof' },
  { id: 'laub', name: 'Vom Laubengang' },
  { id: 'nwOG', name: 'Blick NW-Giebel OG' },
  { id: 'nwEG', name: 'Blick Kinderzimmer EG' },
  { id: 'nbNW', name: 'Vom Garten NW' },
  { id: 'hof', name: 'Von der Einfahrt' },
  { id: 'bad', name: 'Blick aus dem Bad' },
  { id: 'beet1', name: 'Beet 1' },
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
  if (id === 'vp') return { pos: W(5, 13, 41), tgt: W(-9, 0.8, 15.5), fov: 50 };
  if (id === 'laub') return { pos: W(-6.0, H.floor0 + 2.74 + CFG.eyeStand, 10.95), tgt: W(-15.5, 1.6, 17.5), fov: 66 };
  if (id === 'bad') return { pos: W(-8.84, H.floor0 + CFG.eyeStand, H.v1 - 0.6), tgt: W(-8.84, 1.5, 16), fov: 70 };
  if (id === 'beet1') return { pos: W(-12.5, 3.4, 18.5), tgt: W(-9.0, 0.9, 12.0), fov: 55 };
  if (id === 'hof') return { pos: W(-6.5, 1.65, 29.2), tgt: W(-10, 1.6, 12), fov: 62 };
  { const F = nbFrame(), N = CFG.vp.nb;
    if (id === 'nwOG') { const t = F.P(5, 1); return { pos: W(H.u0 - 0.2, fo + CFG.eyeStand, 4.8), tgt: W(t[0], N.og + 1.2, t[1]), fov: 72 }; }
    if (id === 'nwEG') { const t = F.P(4, 1.5); return { pos: W(H.u0 - 0.2, H.floor0 + CFG.eyeStand, 7.3), tgt: W(t[0], 1.4, t[1]), fov: 72 }; }
    if (id === 'nbNW') { const e = F.P(5.0, 1.9); return { pos: W(e[0], 1.65, e[1]), tgt: W(-12, 3.4, 7.5), fov: 64 }; } }
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
  else if (id === 'vpPlan') P = { pos: W(-7.0, 80, 17.95), tgt: W(-7.0, 0, 18), fov: 27 };
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
function firstPerson() { return WIN.includes(ST.view) || ['nbBalk', 'nbTerr', 'nwOG', 'nwEG', 'nbNW', 'laub', 'hof', 'bad'].includes(ST.view); }
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
  drag.p.u = Math.max(-19, Math.min(14, nu)); drag.p.v = Math.max(-11, Math.min(30, nv)); drag.moved = true;
  const g = plantObjs.get(drag.p.id); if (g) g.position.copy(W(drag.p.u, groundH(drag.p.u, drag.p.v), drag.p.v));
  const now = performance.now(); if (now - lastCov > 120) { lastCov = now; rebuildSight(); renderCoverage(); updateEditorPos(); }
  req();
});
const endDrag = (e) => {
  if (!active()) { drag = null; down = null; return; }
  if (drag) {
    const moved = drag.moved; drag = null;
    if (moved) { rebuildPlants(); afterEdit(true); updateEditorPos(); renderVPList(); }
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
  const ps = ST.plants.filter(p => !isVP(p));
  if (!ps.length) return null;
  const bad = ps.filter(p => !plantChecks(p).ok);
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
  renderVPCov();
  $('covNote').textContent = `Wuchs: ${STAGES[ST.stage]}. Sommer = belaubt, Winter = Laubfall (Hainbuche hält teils braunes Laub). Das Balkongeländer ist nicht als Sichtschutz gerechnet${CFG.lattice ? ', das vorhandene Rankgitter am Balkon schon' : ''}.`;
}
function posText(p) {
  const H = CFG.haus;
  if (!isVP(p)) return `${fmt(p.u)} m vor Giebel · ${fmt(p.v)} m ab Gartenecke`;
  return `${fmt(p.u - H.u0)} m ab Nordecke · ${p.v >= H.v1 ? fmt(p.v - H.v1) + ' m vor Hausfront' : fmt(p.v) + ' m ab Gartenecke'}`;
}
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
  const isBox = S.shape === 'box', vp = isVP(p), ou = vp ? CFG.haus.u0 : 0, ov = vp ? CFG.haus.v1 : 0;
  wrap.innerHTML = `<div class="editor">
    <div class="full row" style="justify-content:space-between"><h3>Pflanze ${n} bearbeiten</h3></div>
    <div class="field full"><label class="glbl" for="e-sp">Art</label><select id="e-sp">${opts}</select><span class="small muted">${S.latin}. ${S.info}</span><span class="small"><b>Endgröße:</b> ${S.max ? `${fmt(S.max[0])} m hoch, ${fmt(S.max[1])} m breit${S.cut ? ' ohne Schnitt' : ''}. Die orange Hülle im Modell zeigt sie.` : (S.maxNote || '')}</span></div>
    <div class="field"><label class="glbl" for="e-u">${vp ? 'Ab Nordecke (m)' : 'Vor Giebel (m)'}</label><input type="number" id="e-u" step="0.1" value="${(p.u - ou).toFixed(2)}"></div>
    <div class="field"><label class="glbl" for="e-v">${vp ? 'Vor Hausfront (m)' : 'Ab Gartenecke (m)'}</label><input type="number" id="e-v" step="0.1" value="${(p.v - ov).toFixed(2)}"></div>
    ${slider('e-top', 'Höhe (Ziel)', S.hedge ? 0.8 : 1.5, S.hedge ? (S.max ? S.max[0] + 0.5 : 3) : 10, 0.1, p.top)}
    ${slider('e-w', isBox ? 'Länge' : 'Kronenbreite', 0.6, S.hedge ? 12 : 5, 0.1, p.w)}
    ${S.stem > 0.05 ? slider('e-stem', 'Stammhöhe', 0.2, 3.2, 0.1, p.stem) : ''}
    ${isBox ? `<div class="field"><span class="glbl">Ausrichtung</span><div class="seg" role="group" aria-label="Ausrichtung"><button id="e-r0" aria-pressed="${p.rot !== 90}">parallel Giebel</button><button id="e-r9" aria-pressed="${p.rot === 90}">quer</button></div></div>` : ''}
    <div class="checks full" id="e-checks"></div>
    <div class="full row"><button class="btn" id="e-dup">Duplizieren</button><button class="btn danger" id="e-del">Entfernen</button></div>
  </div>`;
  const upd = () => { rebuildPlants(); afterEdit(true); };
  $('e-sp').onchange = (e) => { const s2 = SPECIES[e.target.value]; Object.assign(p, { sp: e.target.value, stem: s2.stem, top: s2.top, w: s2.w, d: s2.d || s2.w }); rebuildPlants(); afterEdit(); };
  $('e-u').onchange = (e) => { p.u = (+e.target.value || 0) + ou; upd(); };
  $('e-v').onchange = (e) => { p.v = (+e.target.value || 0) + ov; upd(); };
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
  const vp = isVP(p), eu = $('e-u'), ev = $('e-v'); if (eu) eu.value = (p.u - (vp ? CFG.haus.u0 : 0)).toFixed(2); if (ev) ev.value = (p.v - (vp ? CFG.haus.v1 : 0)).toFixed(2);
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
// ---------- Straßenseite: Bedienfeld ----------
function rebuildVP() { buildVorplatz(); drawGround(); rebuildSight(); renderVP(); }
const VZ_FIELDS = [
  ['vz-h', 'Höhe', 0.6, 2.0, 0.05, () => CFG.vp.zaun.h, (x) => CFG.vp.zaun.h = x],
  ['vz-v0', 'Beginn (m vor Hausfront, negativ = am Giebel Richtung Bach)', -12.5, 18, 0.1, () => CFG.vp.zaun.v0 - CFG.haus.v1, (x) => CFG.vp.zaun.v0 = Math.min(x + CFG.haus.v1, CFG.vp.zaun.v1 - 1)],
  ['vz-v1', 'Ende (m vor Hausfront)', -10, 21, 0.1, () => CFG.vp.zaun.v1 - CFG.haus.v1, (x) => CFG.vp.zaun.v1 = Math.max(x + CFG.haus.v1, CFG.vp.zaun.v0 + 1)],
  ['vz-off', 'Abstand zur Grenze (auf deiner Seite)', 0, 0.6, 0.05, () => CFG.vp.zaun.off, (x) => CFG.vp.zaun.off = x],
];
function renderVPFields() {
  const Z = CFG.vp.zaun;
  $('vz-typ').innerHTML = Object.entries(ZAUN).map(([k, z]) => `<option value="${k}">${z.name}</option>`).join('');
  $('vz-typ').value = Z.typ;
  $('vzFields').innerHTML = VZ_FIELDS.map(([id, l, mn, mx, st, g]) => `<div class="field${id === 'vz-v0' ? ' full' : ''}"><label for="${id}" class="glbl">${l}</label><input type="range" id="${id}" min="${mn}" max="${mx}" step="${st}" value="${g()}"><span class="val" id="${id}-v">${fmt(g(), 2)} m</span></div>`).join('');
  for (const [id, , , , , g, set] of VZ_FIELDS) $(id).oninput = (e) => { set(+e.target.value); $(id + '-v').textContent = fmt(g(), 2) + ' m'; buildVorplatz(); rebuildSight(); renderVPInfo(); renderVPCov(); };
  for (const [id] of VZ_FIELDS) $(id).onchange = () => { renderVPFields(); save(); };
  $('vzFields').querySelectorAll('input').forEach(el => { el.disabled = Z.typ === 'kein' || (Z.typ === 'bau' && el.id === 'vz-h'); });
  renderVPInfo();
}
function renderVPInfo() {
  const Z = CFG.vp.zaun, T = ZAUN[Z.typ], L = Z.v1 - Z.v0, H = CFG.haus;
  if (Z.typ === 'kein') { $('vzInfo').innerHTML = 'Kein Zaun an der Grenze NW. Sichtschutz nur durch Pflanzen.'; return; }
  const h = T.h || Z.h, posts = Math.round(L / 1.9) + 1;
  const lines = [`<b>${fmt(L)} m</b> lang, ${fmt(h, 2)} m hoch, von ${fmt(Z.v0 - H.v1)} bis ${fmt(Z.v1 - H.v1)} m vor der Hausfront${Z.typ === 'bau' ? '' : ` · ca. ${posts} Pfosten im Abstand von 1,9 m`}.`, T.note || ''];
  if (Z.typ !== 'bau' && h > 2.0 + 1e-6) lines.push('<span style="color:var(--warn)">Über 2 m Höhe ist eine Einfriedung in Bayern nicht mehr verfahrensfrei.</span>');
  $('vzInfo').innerHTML = lines.filter(Boolean).join(' ');
}
function renderVPCov() {
  if (ST.tab !== 't-vp') return;
  const T = VP_TGT[ST.vpTgt];
  $('vpTgt').innerHTML = Object.entries(VP_TGT).map(([k, t]) => `<button data-t="${k}" aria-pressed="${ST.vpTgt === k}">${t.name}</button>`).join('');
  $('vpTgt').querySelectorAll('button').forEach(b => b.onclick = () => { ST.vpTgt = b.dataset.t; rebuildSight(); renderVPCov(); });
  $('vpCovTitle').textContent = `Verdeckte Blickachsen → ${T.long}`;
  $('vpExplain').textContent = `Anteil der Sichtlinien von den Fenstern (sitzend und stehend, über die Fensterbreite) bzw. vom Laubengang ${T.expl}, die verdeckt sind: durch Pflanzen, Zaun, Nebengebäude oder Pavillon. Karte antippen zeigt die Linien.`;
  const G = vpGroups();
  $('vpWins').innerHTML = G.map(g => {
    const cs = vpCoverage(ST.plants, 'S', ST.stage, g, ST.vpTgt), cw = vpCoverage(ST.plants, 'W', ST.stage, g, ST.vpTgt);
    return `<button class="win" data-g="${g.id}" aria-pressed="${ST.vpShow === g.id}"><span><span class="t">${g.name}</span> <span class="r">· ${g.room}</span></span><span class="r">${ST.vpShow === g.id ? 'Linien an' : 'Linien zeigen'}</span>
      <span class="bars">${bar('Sommer', cs, covColor(cs))}${bar('Winter', cw, covColor(cw))}</span></button>`;
  }).join('');
  $('vpWins').querySelectorAll('.win').forEach(b => b.addEventListener('click', () => { ST.vpShow = ST.vpShow === b.dataset.g ? '' : b.dataset.g; rebuildSight(); renderVPCov(); }));
  $('vpNote').textContent = `Wuchs: ${STAGES[ST.stage]}. Zaun: ${ZAUN[CFG.vp.zaun.typ].name}. Nicht gerechnet: Bäume und Sträucher des Nachbarn, Geländer von Laubengang und Treppe${CFG.vp.car ? '' : ', das Auto (ausgeblendet)'}.`;
}
function renderVPList() {
  const el = $('vpList'); if (!el) return;
  const ps = ST.plants.filter(isVP);
  el.innerHTML = ps.length ? ps.map(p => {
    const S = SPECIES[p.sp], c = plantChecks(p), i = ST.plants.indexOf(p);
    const pill = !c.own ? '<span class="pill bad">Nachbargrund</span>' : (c.ok ? '<span class="pill ok">Abstand ok</span>' : '<span class="pill warn">Zustimmung</span>');
    return `<button class="prow" data-id="${p.id}" aria-pressed="${ST.sel === p.id}"><span class="badge">${i + 1}</span><span style="min-width:0"><b>${S.name}</b><br><span class="meta">${posText(p)} · ${fmt(p.top)} m hoch</span></span>${pill}</button>`;
  }).join('') : '<p class="small muted">Noch keine Pflanzen auf der Straßenseite.</p>';
  el.querySelectorAll('.prow').forEach(b => b.addEventListener('click', () => { ST.sel = ST.sel === b.dataset.id ? null : b.dataset.id; rebuildPlants(); renderPlants(); renderVPList(); }));
}
function renderVPAreas() {
  const H = CFG.haus, G = CFG.vp.garage, kw = kiesWP(), Pd = VP.podest, row = (a, b) => `<tr><td>${a}</td><td class="n">${b}</td></tr>`;
  const hof = hofPoly();
  const inHof = VP.beete.filter(b => b.id === 'B1' || b.id === 'B3').reduce((a, b) => a + polyArea(b.pts), 0);
  const other = VP.beete.filter(b => b.id === 'B2' || b.id === 'B4').reduce((a, b) => a + polyArea(b.pts), 0);
  const pflaster = polyArea(hof) - inHof - other - G.W * G.L - polyArea(kw);
  $('vpAreas').innerHTML = '<tr><th>Fläche</th><th>ca.</th></tr>' + VP.beete.map(b => row(`${b.id} · ${b.name}`, `${fmt(polyArea(b.pts))} m²`)).join('')
    + row('Kiesbett Wärmepumpe', `${fmt(polyArea(kw))} m²`)
    + row('Stellplätze 1–3 vor dem Nebengebäude', 'je 2,3 × 5,0 m')
    + row('Pflaster im Hof (ohne Beete, Nebengebäude, Kies)', `${fmt(pflaster, 0)} m²`)
    + row('Nebengebäude (Abstand zur Grenze SO, Dachüberstand)', `${fmt(G.W, 2)} × ${fmt(G.L, 2)} m (${fmt(G.gap, 2)} m, ${fmt(G.oh, 2)} m)`)
    + row('Grenze NW von der Terrasse bis zur Straße', `${fmt(Math.hypot(NWB[3][0] - NWB[0][0], 30.6 - (-2.9)))} m`)
    + row('NW-Giebel bis Grenze NW (Kataster-Aufmaß; Karte misst 2,9 m)', `${fmt(H.u0 - nwU(0), 2)} m (Gartenseite) · ${fmt(H.u0 - nwU(H.v1), 2)} m (Hausfront)`);
}
function renderVPNotes() {
  const H = CFG.haus, dG = H.u0 - nwU(5), save0 = clone(CFG.vp.zaun), pct = (x) => Math.round(x * 100) + ' %';
  const G = vpGroups(), gi = (id) => G.find(g => g.id === id);
  const covWith = (z, id) => { Object.assign(CFG.vp.zaun, z); const c = vpCoverage([], 'S', 2, gi(id), 'haus'); Object.assign(CFG.vp.zaun, save0); return c; };
  const z18 = { typ: 'dicht', h: 1.8, v0: -2.6, v1: 28.4, off: 0.1 }, z20 = Object.assign({}, z18, { h: 2.0 });
  const eg18 = covWith(z18, 'gEG'), eg20 = covWith(z20, 'gEG'), og20 = covWith(z20, 'gOG'), dg20 = covWith(z20, 'gDG');
  $('vpNotes').innerHTML = [
    `Zwischen NW-Giebel und Grenze liegen nur rund ${fmt(dG)} m. Die Fenster am NW-Giebel blicken direkt auf Haus und Sitzplatz des Nachbarn NW.`,
    `Ein blickdichter Zaun ohne Pflanzen verdeckt die Blickachsen vom EG-Giebel zum Nachbarhaus mit 1,8 m zu ${pct(eg18)}, mit 2,0 m zu ${pct(eg20)}. Vom OG sind es mit 2,0 m nur ${pct(og20)}, vom DG ${pct(dg20)}: man schaut über den Zaun hinweg.`,
    'Für OG und DG braucht es Laub zwischen etwa 2,5 und 6 m. Bäume über 2 m müssen 2 m von der Grenze weg (Art. 47 AGBGB). Am Giebel bleibt dann rund 1 m bis zur Hauswand: dort passen nur schmale Säulen oder Spaliere, oder es geht mit Zustimmung des Nachbarn näher an die Grenze.',
    'Hecken bis 2 m Höhe brauchen 0,5 m Grenzabstand und passen in den Streifen neben dem Kiesweg und ins Beet B2.',
    'Einfriedungen bis 2 m Höhe sind in Bayern verfahrensfrei (Art. 57 Abs. 1 Nr. 7a BayBO), wenn kein Bebauungsplan und keine Ortssatzung etwas anderes regeln. Ein Zaun direkt auf der Grenze braucht die Zustimmung des Nachbarn. Keine Rechtsberatung.',
    'Vor dem Pavillon führt ein Weg zum Nachbarn NW. Im Zaun ist dort ein Tor mit 1,1 m Breite vorgesehen.',
  ].map(t => `<li>${t}</li>`).join('');
}
const B1_LIST = [ // [Pflanze, botanisch, Höhe, Blüte, Menge, Platz im Beet]
  ['Japanischer Fächerahorn, rot', "Acer palmatum 'Bloodgood'", '3–4 m (alt 5)', 'Laub rot, Herbst leuchtend', '1 (Solitär 125–150 cm)', 'vor dem Badfenster, 2,6 m von der Wand'],
  ["Schneeball-Hortensie 'Annabelle'", 'Hydrangea arborescens', '1,0–1,5 m', 'Juni–Sept., weiß', '2', 'NW-Ende und vor dem WC-Fenster'],
  ['Herbstanemone', "Anemone × hybrida 'Honorine Jobert' (weiß), 'Pamina' (rosa)", '0,8–1,2 m', 'Aug.–Okt.', '6', 'zwei Gruppen neben dem Ahorn'],
  ['Staudenphlox', "Phlox paniculata, z. B. 'David' (weiß), 'Bright Eyes'", '0,8–1,2 m', 'Juli–Aug., duftet', '3', 'vorne zum Hof (mehr Licht)'],
  ['Silberkerze', "Actaea simplex 'Brunette'", '1,2–1,5 m', 'Sept.–Okt.', '2', 'hinten am NW-Ende (schattig)'],
  ['Pfingstrose', 'Paeonia lactiflora', '0,8–1,0 m', 'Mai–Juni', '1', 'vorne an der Schräge'],
  ['Akelei', 'Aquilegia vulgaris', '0,6–0,8 m', 'Mai–Juni, sät sich aus', '5', 'locker verteilt'],
  ['Storchschnabel', "Geranium 'Rozanne'", '0,4–0,5 m', 'Juni–Okt.', '3', 'Lücken am Rand füllen'],
  ['Frauenmantel', 'Alchemilla mollis', '0,3–0,4 m', 'Juni–Juli, gelbgrün', '5', 'Kante zum Pflaster'],
  ['Japanwaldgras', 'Hakonechloa macra', '0,3–0,4 m', 'Gras, Herbst goldgelb', '3', 'unter dem Ahorn'],
  ['Zwiebeln', 'Narzissen, Allium, Wildtulpen', '0,3–0,8 m', 'März–Juni', 'ca. 40', 'zwischen den Stauden'],
];
function renderB1() {
  const B = CFG.vp.b1, bed = VP.beete.find(b => b.id === 'B1'), A = polyArea(bed.pts);
  $('b1-zaun').checked = B.zaun; $('b1-mulch').checked = B.mulch;
  let L = 0; for (let i = 0; i < bed.pts.length; i++) { const a = bed.pts[i], b = bed.pts[(i + 1) % bed.pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  $('b1Tab').innerHTML = '<tr><th>Pflanze</th><th>Höhe · Blüte</th><th>Menge · Platz</th></tr>' + B1_LIST.map(([n, l, h, f, m, w]) => `<tr><td><b>${n}</b><br><span class="muted small">${l}</span></td><td>${h}<br><span class="muted small">${f}</span></td><td>${m}<br><span class="muted small">${w}</span></td></tr>`).join('');
  const G = vpGroups().find(g => g.id === 'sBad'), cov = (pl, t, se) => Math.round(vpCoverage(pl, se, ST.stage, G, t) * 100);
  const mine = ST.plants.filter(isVP), none = ST.plants.filter(p => !isVP(p));
  $('b1Notes').innerHTML = [
    `Beet ca. ${fmt(A)} m², Einfassung ca. ${fmt(L)} m; Staketenzaun ca. ${fmt(L - 0.9)} m (Kastanie, 0,9 m hoch, mit 0,8 m Durchgang an der Stirnseite zum Podest).`,
    `Badfenster, verdeckte Blickachsen aus dem Hof (Wuchs: ${STAGES[ST.stage]}): mit Bepflanzung Sommer ${cov(ST.plants, 'hof', 'S')} %, Winter ${cov(ST.plants, 'hof', 'W')} %; ohne Pflanzen ${cov(none, 'hof', 'S')} %. Von der Straße aus: Sommer ${cov(ST.plants, 'strasse', 'S')} %, Winter ${cov(ST.plants, 'strasse', 'W')} %.`,
    'Wer auf dem Pflasterstreifen zwischen Haus und Beet zur Außentreppe läuft, geht direkt am Fenster vorbei. Das deckt kein Beet ab; dort helfen nur Glas, Plissee oder Folie im unteren Drittel.',
    'Lage: Die Hausfront schaut nach Nordost. Das Beet hat Morgensonne bis etwa Mittag, danach Schatten vom Haus. Das passt gut zu Fächerahorn, Hortensie, Herbstanemone und Silberkerze. Phlox und Pfingstrose gehören nach vorne, wo es am hellsten ist.',
    '„Blutahorn“ heißt im Handel oft auch der Spitzahorn \'Crimson King\' (15–20 m) und „Rotahorn“ der amerikanische Acer rubrum (15–20 m). Beide sind viel zu groß. Gemeint ist hier der Japanische Fächerahorn mit rotem Laub.',
    'Rindenmulch 5–7 cm, vorher Hornspäne streuen (Mulch bindet Stickstoff). Um die Stauden etwas weniger, damit Akelei und Phlox sich aussäen und ausbreiten können; mit den Jahren schließen Storchschnabel und Frauenmantel die Fläche.',
    'Mit Kleinkind: Hortensie und Herbstanemone sind leicht giftig, der Ahorn nicht. Fingerhut, Eisenhut und Goldregen habe ich bewusst weggelassen.',
    'Der Ahorn steht ca. 2,6 m vor der Hauswand. Bei 4–5 m Endbreite alle paar Jahre zur Hauswand hin auslichten.',
  ].map(t => `<li>${t}</li>`).join('');
}
function renderVP() {
  $('vp-car').checked = CFG.vp.car;
  renderVPFields(); renderVPCov(); renderVPList(); renderVPAreas(); renderVPNotes(); renderB1();
}
// Annahmen der Straßenseite: [id, Text, Quelle, lesen, schreiben, Schritt, min, max]
const AS_VP = (() => {
  const H = CFG.haus, G = () => CFG.vp.garage, P = () => CFG.vp.pav, N = () => CFG.vp.nb;
  return [
    ['v-gv0', 'Nebengebäude: Hausfront bis Giebel (m, Karte 5,4)', 'p', () => G().v0 - H.v1, (x) => { G().v0 = H.v1 + x; }, 0.05, 2, 12],
    ['v-gL', 'Nebengebäude: Länge (m, aus Karte: Giebel bis Straße 7,3)', 'p', () => G().L, (x) => { G().L = x; }, 0.05, 3, 14],
    ['v-gg', 'Nebengebäude: Abstand zur Grenze SO (m)', 'm', () => G().gap, (x) => { G().gap = x; }, 0.05, 0, 3],
    ['v-gB', 'Nebengebäude: Breite (m)', 'g', () => G().W, (x) => { G().W = x; }, 0.05, 3, 9],
    ['v-ge', 'Nebengebäude: Traufhöhe (m)', 'g', () => G().eave, (x) => { G().eave = Math.min(x, G().ridge - 0.3); }, 0.05, 2, 4],
    ['v-gr', 'Nebengebäude: Firsthöhe (m)', 'g', () => G().ridge, (x) => { G().ridge = Math.max(x, G().eave + 0.3); }, 0.05, 3, 7],
    ['v-pa', 'Pavillon: Mitte ab Hausecke Nord (m, negativ = Richtung Nachbar NW)', 'g', () => P().u - H.u0, (x) => { P().u = H.u0 + x; }, 0.05, -4, 2],
    ['v-pb', 'Pavillon: Mitte vor Hausfront (m)', 'g', () => P().v - H.v1, (x) => { P().v = H.v1 + x; }, 0.05, 2, 20],
    ['v-pd', 'Pavillon: Durchmesser (m)', 'g', () => 2 * P().r, (x) => { P().r = x / 2; }, 0.05, 1, 3.5],
    ['v-na', 'Nachbarhaus NW: Ostecke bis Grenze (m)', 'g', () => nwU(N().v) - N().u, (x) => { N().u = nwU(N().v) - x; }, 0.1, 0.5, 10],
    ['v-nb', 'Nachbarhaus NW: Ostecke vor Hausfront (m)', 'g', () => N().v - H.v1, (x) => { N().v = H.v1 + x; }, 0.1, -5, 20],
    ['v-nf', 'Nachbarhaus NW: Balkonboden über Gelände (m)', 'g', () => N().og, (x) => { N().og = x; }, 0.05, 2, 4.5],
  ];
})();
function renderAssumeVP() {
  $('assume3').innerHTML = AS_VP.map(([id, l, src, g, , st, mn, mx]) => `<label for="${id}">${l} <span class="src ${src}">${SRC[src]}</span></label><input type="number" id="${id}" step="${st}" min="${mn}" max="${mx}" value="${g().toFixed(2)}">`).join('');
  for (const [id, , , g, set, , mn, mx] of AS_VP) $(id).onchange = (e) => {
    const x = parseFloat(e.target.value); if (!isFinite(x)) { e.target.value = g().toFixed(2); return; }
    set(Math.max(mn, Math.min(mx, x))); e.target.value = g().toFixed(2); rebuildVP(); save();
  };
}
function markCustom() { if (ST.variant !== 'eigen') { ST.variant = 'eigen'; $('variant').value = 'eigen'; } }
function afterEdit(keepEditor) {
  const p = ST.plants.find(x => x.id === ST.sel);
  if (!p || !isVP(p)) markCustom();
  rebuildSight(); renderCoverage(); renderPlants(keepEditor); renderVPList(); save();
}
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }
function loadVariant(id) {
  const v = VARIANTS.find(x => x.id === id); if (!v) return;
  ST.variant = id; ST.plants = ST.plants.filter(isVP).concat(v.plants()); ST.sel = null;
  rebuildPlants(); rebuildSight(); renderCoverage(); renderPlants(); save();
}

// ---------- Ereignisse ----------
$('variant').addEventListener('change', (e) => { if (e.target.value !== 'eigen') loadVariant(e.target.value); });
const setSeason = (s) => { ST.season = s; ST.sunDay = s === 'W' ? 355 : 172; $('sS').setAttribute('aria-pressed', String(s === 'S')); $('sW').setAttribute('aria-pressed', String(s === 'W')); drawGround(); buildCtxTrees(); rebuildPlants(); rebuildSight(); updateSun(); };
$('sS').onclick = () => setSeason('S'); $('sW').onclick = () => setSeason('W');
$('tgB').onclick = () => setTarget('balcony'); $('tgT').onclick = () => setTarget('terrace');
$('stage').innerHTML = STAGES.map((s, i) => `<option value="${i}">${s}</option>`).join(''); $('stage').value = String(ST.stage);
$('stage').addEventListener('change', (e) => { ST.stage = +e.target.value; rebuildPlants(); rebuildSight(); renderCoverage(); });
$('sunT').addEventListener('input', (e) => { ST.sunT = +e.target.value; updateSun(); });
$('sunD').addEventListener('input', (e) => { ST.sunDay = +e.target.value; updateSun(); });
$('addSp').innerHTML = Object.entries(SPECIES).map(([k, s]) => `<option value="${k}">${s.name}</option>`).join('');
$('addBtn').onclick = () => { const p = mk($('addSp').value, 2.4, 1.0); ST.plants.push(p); ST.sel = p.id; markCustom(); rebuildPlants(); afterEdit(); toast('Pflanze ' + ST.plants.length + ' eingefügt. In der Draufsicht verschieben.'); };
$('resetBtn').onclick = () => { const id = ST.variant === 'eigen' ? 'H' : ST.variant; $('variant').value = id; loadVariant(id); toast('Variante zurückgesetzt'); };
$('asReset').onclick = () => { Object.assign(CFG.balcony, clone(CFG0.balcony)); Object.assign(CFG.terrace, clone(CFG0.terrace)); CFG.haus.floor0 = CFG0.haus.floor0; CFG.lattice = CFG0.lattice; for (const k of SITE_KEYS) Object.assign(CFG[k], clone(CFG0[k])); for (const k of ['garage', 'pav', 'nb']) Object.assign(CFG.vp[k], clone(CFG0.vp[k])); renderAssumeVP(); buildVorplatz(); renderAssume(); renderStairFields(); placeRoot(); buildWinLabels(); buildHouseNb(); rebuildSite(); updateSun(); applyLabels(); renderInsights(); save(); };
$('copyBtn').onclick = () => {
  const txt = JSON.stringify({ balkon: CFG.balcony, pflanzen: ST.plants.map((p, i) => ({ nr: i + 1, art: SPECIES[p.sp].name, vorGiebel_m: +p.u.toFixed(2), abGartenecke_m: +p.v.toFixed(2), hoehe_m: p.top, breite_m: p.w, stamm_m: p.stem, quer: p.rot === 90 })) }, null, 1);
  const fb = () => { const ta = $('copyFallback'); ta.hidden = false; ta.value = txt; ta.select(); toast('Text markiert, bitte kopieren'); };
  try { navigator.clipboard.writeText(txt).then(() => toast('Plan kopiert'), fb); } catch (e) { fb(); }
};
panelEl.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  panelEl.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  panelEl.querySelectorAll('.tabpane').forEach(p => { p.hidden = p.id !== b.getAttribute('aria-controls'); });
  const was = ST.tab; ST.tab = b.id;
  if (b.id === 't-vp') renderVP();
  if ((was === 't-vp') !== (b.id === 't-vp')) rebuildSight();
}));
$('vz-typ').addEventListener('change', (e) => { CFG.vp.zaun.typ = e.target.value; buildVorplatz(); rebuildSight(); renderVPFields(); renderVPCov(); renderVPNotes(); save(); });
$('vp-car').addEventListener('change', (e) => { CFG.vp.car = e.target.checked; buildVorplatz(); rebuildSight(); renderVPCov(); save(); });
$('b1-zaun').addEventListener('change', (e) => { CFG.vp.b1.zaun = e.target.checked; buildVorplatz(); save(); });
$('b1-mulch').addEventListener('change', (e) => { CFG.vp.b1.mulch = e.target.checked; drawGround(); save(); });
$('b1-reset').onclick = () => { const bed = VP.beete.find(b => b.id === 'B1').pts; ST.plants = ST.plants.filter(p => !inPoly(p.u, p.v, bed)).concat(b1Plan()); ST.sel = null; rebuildPlants(); afterEdit(); renderB1(); toast('Vorschlag Beet 1 eingesetzt'); };
$('vpPlan').onclick = () => setView('vpPlan'); $('vpOver').onclick = () => setView('vp');
$('vpSp').innerHTML = Object.entries(SPECIES).map(([k, sp]) => `<option value="${k}">${sp.name}</option>`).join(''); $('vpSp').value = 'hecke';
$('vpAdd').onclick = () => { const n = ST.plants.filter(isVP).length, p = mk($('vpSp').value, -15.9, 12.2 + (n % 4) * 1.2); ST.plants.push(p); ST.sel = p.id; rebuildPlants(); afterEdit(); toast('Pflanze ' + ST.plants.length + ' eingefügt. In der Draufsicht Hof verschieben.'); };
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
if (!load()) ST.plants = VARIANTS.find(v => v.id === 'H').plants();
if (!ST.plants.some(isVP)) ST.plants = ST.plants.concat(b1Plan());
placeRoot();
renderVariantSelect();
buildTerrain(); buildWinLabels(); buildHouseNb(); buildContext(); buildSite(); buildVorplatz(); buildCtxTrees(); drawGround();
rebuildPlants(); rebuildSight(); updateSun();
renderCoverage(); renderPlants(); renderSpecies(); renderInsights(); renderAssume(); renderAssumeVP(); renderStairFields(); renderStair(); renderVP();
applyLabels();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawGround(); buildWinLabels(); buildHouseNb(); buildVorplatz(); rebuildPlants(); applyLabels(); });

return {
  panel: panelEl,
  // Garten betreten: Übersicht anfahren (oder die zuletzt gewählte Ansicht)
  enter() { applyLabels(); setView(ST.view || 'overview'); },
  leave() { tween = null; drag = null; applyLabels(); },
  step,
  floor0: () => CFG.haus.floor0,
  // begehbare Terrasse für den Rundgang (Hauskoordinaten: x, y, z ab FFB EG)
  terrace() { const T = CFG.terrasse; return { x0: T.uA + OFF_X, x1: T.over - T.curb + OFF_X, y0: -T.depth + T.curb, y1: 0, z: T.top - T.fill - CFG.haus.floor0 }; },
  debug: { ST, CFG, VP, vpGroups, vpCoverage, renderVP, setView, loadVariant, coverage, setSeason, rebuildSite, groundH, stairPlan, stairChecks },
};
};
