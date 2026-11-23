# Holzhaus mit Garten · 3D-Modell

Ein gemeinsames 3D-Modell von Haus und Garten:
- **Wohnung 1** im Erdgeschoss, mit unseren Einbau-Projekten
- **Wohnungen 2 und 3** als Maisonette in OG und DG
- **Garten:** Gelände nach Aufmaß, Terrasse, Hang zum Bach, Sichtschutz zum Nachbarn, Treppe zum Bach

Seite: `index.html`, der Garten-Teil liegt in `garten/garten.js`. three.js 0.147 (MIT-Lizenz) liegt lokal in `vendor/`, es werden keine externen Dienste geladen.

**Ansichten:** Außen, Puppenhaus (Dach und obere Geschosse ausgeblendet), Rundgang auf Augenhöhe (Handy: wischen und auf den Boden tippen, Computer: W A S D), Grundriss mit Flächen. Die Beispielmöblierung in OG und DG lässt sich ein- und ausblenden.

## Erdgeschoss (Wohnung 1)
Wände, Türen und Fenster stammen aus dem Fensterplan EG. Die Küche ist nach Fotos und Aufmaß gebaut. In der rechten Leiste stehen:
- **Ansichten:** Wohnraum, Essecke, Von vorne, Von oben, Linkes Fach, Küche, Kinderküche
- **Projekt 1 · Wohnzimmer-Einbauten:** Rückkasten mit Klappen, Trennwand mit Balken, Eckbank mit Rollkästen und Ablage, Ofen, Sofa und Tisch. Alle Regler und Schalter aus dem Einzelmodell sind übernommen.
- **Projekt 3 · Hängeregal über der Halbinsel:** zwei Varianten zum Umschalten. Standard ist der Hängeschrank (50 cm tief) mit zwei zu beiden Seiten offenen Nischen für Vasen, die zweite Variante ein offenes Regal im Stahlrahmen. Maße per Regler.
- **Projekt 2 · Kinderküche an der Halbinsel:** Bank, Trittstufe und Kinder-Arbeitsplatz in einem (45 cm hoch, höchstens 40 cm tief, runde Ecken vorn). Ein Kind lässt sich stehend, sitzend oder schneidend zeigen.

`wohnzimmer.html` ist das ursprüngliche Einzelmodell der Wohnzimmer-Einbauten. Es bleibt zum Vergleich erhalten.

**Neues Projekt hinzufügen:** in `index.html` ein Modul nach dem Muster von `KK` (Kinderküche) anlegen: Maße `S`, Regler `sliderDefs`, `build()`, `report()`. Dazu eine eigene Gruppe in `G` und einen Abschnitt in `renderPanelEG()`.

## Garten
Oben auf **Garten** tippen. Das Haus ist dasselbe Modell wie in den Wohnungen, der Garten liegt drumherum und ist in allen 3D-Ansichten zu sehen. Im Rundgang geht es durch die Schiebetür auf die Terrasse. Beschriftungen, Sichtlinien und das Verschieben von Pflanzen gibt es nur im Bereich Garten.
- **Ansichten:** Übersicht, Draufsicht, Garten, Blick aus EG 1 und OG 1–3, vom Nachbarbalkon, von der Nachbarterrasse, vom Nachbargrund, Terrasse, Bachseite, vom Hang, Treppe. Dazu Sonnenstand per Regler, Sommer und Winter, Wuchsstadium.
- **Sichtschutz:** Varianten mit 2 m Grenzabstand (A, B, D) und unter 2 m, nur mit Zustimmung des Nachbarn (C, E, F, G, H). Pflanzen lassen sich ziehen. Berechnet wird, wie viel der Blickachsen Fenster → Nachbarbalkon bzw. Nachbarterrasse verdeckt ist, dazu Grenzabstand (Art. 47 AGBGB), Überhang und Abstand zur Hauswand.
- **Bachseite:** Terrassenmauer, Hang, Bach und Grenzen aus dem Aufmaß des Vermessers (16.01.2024, Höhen DHHN2016), als Dreiecksnetz hinterlegt. Seither Gebautes (Betonbalken, Geländer, Kalksteinmauer, Beet) nach Fotos vom 11.11.
- **Treppe zum Bach:** Beton-Blockstufen auf dem bestehenden Weg, mit Podesten in den Bögen. Stufenhöhe, Auftritt, Bogenradius und Breite sind einstellbar; geprüft werden Steigung, Auftritt, Schrittmaß, Trittfläche innen und Lauflänge, dazu ein Längsschnitt.
- **Annahmen:** Im Tab „Annahmen“ steht, was aus dem Aufmaß stammt, was am Meterstab abgelesen und was geschätzt ist. Nachbarhaus und Nachbarbalkon sind aus Fotos geschätzt.

Gartenkoordinaten: „vor Giebel“ = Abstand von der Südost-Hauswand Richtung Nachbar, „ab Gartenecke“ = Abstand von der Hausecke Süd Richtung Straße. Umrechnung ins Hausmodell: Gartenkoordinate = Hauskoordinate x − 13,54 m; Höhe 0 im Garten = Gelände am Südost-Giebel, 0,25 m unter FFB EG. Der Sonnenstand wird mit der auf etwa 1 km gerundeten Lage des Hauses gerechnet. Eigene Pflanzanordnungen speichert der Browser.

## Veröffentlichen (GitHub Pages)
Settings → Pages → *Deploy from a branch* → Branch wählen (z. B. `main`), Ordner `/ (root)`.

## Datengrundlage
- Maße aus dem Werkplan der Zimmerei (08/2025). Wohnung 3 ist das Spiegelbild von Wohnung 2.
- EG-Aufmaß: Schlafzimmer an der Gartenwand innen 4,03 m. Akzentwand bis Pfosten 2,44 m. Halbinsel 2,46 m, Platte 99 × 91 cm. Abstand zur Schrankzeile 1,17 m. Stirnseite bis Schiebetür 1,16 m. Hochschränke 124 × 59 × 225 cm.
- PV-Anlage: Trina Vertex S+ 440 W (1762 × 1134 × 30 mm), hochkant. Straßenseite ganz belegt, je Haushälfte 7 × 3 Module mit einem Ziegelstreifen in der Mitte (Foto). Gartenseite im gleichen Raster neben dem Zwerchgiebel, an den Kehlen getreppt; der Zwerchgiebel selbst ist frei. Im Modell 42 + 24 = 66 Module (ca. 29 kWp), Gartenseite nach dem Dachfoto geschätzt.
- Giebelüberstand 1,55 m, abgeleitet aus dem PV-Foto (2 × 7 Module passen sonst nicht aufs Dach).
- Annahmen in OG und DG: Balkon OG tiefer Teil 2,55 m, flacher Teil ca. 0,98 m. Balkon DG 2,55 m unter dem Zwerchgiebel.
- Fassade, Dach, Laubengang und Außentreppe nach Außenfotos.
- Wohnfläche Wohnung 2 und 3 laut Ausschreibung 94 m² (inkl. anteiligem Balkon).

Keine Adresse, keine Koordinaten, keine Namen im Repo.
