# Holzhaus · 3D-Modell

3D-Modell des Holzhauses mit drei Wohnungen:
- **Wohnung 1** im Erdgeschoss, mit unseren Einbau-Projekten
- **Wohnungen 2 und 3** als Maisonette in OG und DG

Seite: `index.html`. three.js 0.147 (MIT-Lizenz) liegt lokal in `vendor/`, es werden keine externen Dienste geladen.

**Ansichten:** Außen, Puppenhaus (Dach und obere Geschosse ausgeblendet), Rundgang auf Augenhöhe (Handy: wischen und auf den Boden tippen, Computer: W A S D), Grundriss mit Flächen. Die Beispielmöblierung in OG und DG lässt sich ein- und ausblenden.

## Erdgeschoss (Wohnung 1)
Wände, Türen und Fenster stammen aus dem Fensterplan EG. Die Küche ist nach Fotos und Aufmaß gebaut. In der rechten Leiste stehen:
- **Ansichten:** Wohnraum, Essecke, Von vorne, Von oben, Linkes Fach, Küche, Kinderküche
- **Projekt 1 · Wohnzimmer-Einbauten:** Rückkasten mit Klappen, Trennwand mit Balken, Eckbank mit Rollkästen und Ablage, Ofen, Sofa und Tisch. Alle Regler und Schalter aus dem Einzelmodell sind übernommen.
- **Projekt 3 · Hängeregal über der Halbinsel:** zwei Varianten zum Umschalten. Standard ist der Hängeschrank (50 cm tief) mit zwei zu beiden Seiten offenen Nischen für Vasen, die zweite Variante ein offenes Regal im Stahlrahmen. Maße per Regler.
- **Projekt 2 · Kinderküche an der Halbinsel:** Bank, Trittstufe und Kinder-Arbeitsplatz in einem (45 cm hoch, höchstens 40 cm tief, runde Ecken vorn). Ein Kind lässt sich stehend, sitzend oder schneidend zeigen.

`wohnzimmer.html` ist das ursprüngliche Einzelmodell der Wohnzimmer-Einbauten. Es bleibt zum Vergleich erhalten.

**Neues Projekt hinzufügen:** in `index.html` ein Modul nach dem Muster von `KK` (Kinderküche) anlegen: Maße `S`, Regler `sliderDefs`, `build()`, `report()`. Dazu eine eigene Gruppe in `G` und einen Abschnitt in `renderPanelEG()`.

## Veröffentlichen (GitHub Pages)
Settings → Pages → *Deploy from a branch* → Branch wählen (z. B. `main`), Ordner `/ (root)`.

## Datengrundlage
- Maße aus dem Werkplan der Zimmerei (08/2025). Wohnung 3 ist das Spiegelbild von Wohnung 2.
- EG-Aufmaß: Schlafzimmer an der Gartenwand innen 4,03 m. Akzentwand bis Pfosten 2,44 m. Halbinsel 2,46 m, Platte 99 × 91 cm. Abstand zur Schrankzeile 1,17 m. Stirnseite bis Schiebetür 1,16 m. Hochschränke 124 × 59 × 225 cm.
- Annahmen in OG und DG: Balkon OG tiefer Teil 2,55 m, flacher Teil ca. 0,98 m. Balkon DG 2,55 m unter dem Zwerchgiebel. Giebelüberstand ca. 1,0 m (nach Foto).
- Fassade, Dach, Laubengang und Außentreppe nach Außenfotos.
- Wohnfläche Wohnung 2 und 3 laut Ausschreibung 94 m² (inkl. anteiligem Balkon).

Keine Adresse, keine Koordinaten, keine Namen im Repo.
