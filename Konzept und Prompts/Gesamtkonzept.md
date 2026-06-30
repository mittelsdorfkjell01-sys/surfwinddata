# Wassersport-Plattform – Gesamtkonzept

*Arbeitsname: „windward". Web-Plattform zur Reise- und Spot-Planung für Wind- und Wellensport (v1: Kitesurfen und Wellenreiten). Dieses Dokument erklärt das gesamte Tool und ist eigenständig lesbar — für Reviewer, Kollegen oder zur Weiterarbeit. Zwei technische Begleitdokumente vertiefen Funktionen und Datenmodell.*

---

## 1. Die Idee in einem Satz

Ein foto-getriebener Reise- und Spot-Planer, der zwei Fragen beantwortet: **„Wo und wann mache ich den perfekten Wind- oder Wellen-Trip?"** und **„Ich bin gerade hier — wo geht es, und geht es jetzt?"**

Der Kern ist **Planung**, nicht Live-Vorhersage. Die Spot-Sammlung ist der Held; die Live-Bedingungen sind nur die Detailansicht dahinter.

---

## 2. Warum es das gibt — der Weißraum

Quer durch die etablierten Tools ist fast jedes entweder daten-nerdig (schwarz-neon-Cockpit, für Meteorologen gebaut), oder es hat kaum Spots, oder Bedienung und Gestaltung sind schlecht. Niemand besetzt die Kombination aus **tiefer, gepflegter Spot-Datenbank** und **reisetauglicher, schöner, einfacher** Oberfläche.

Genau dort sitzt das Produkt: Mood von Surf/Travel — Bali, Sri Lanka, sonnengebleicht, hochwertig, foto-getrieben — bewusst weg vom Messgerät-Look. Zielgruppe ca. 20 bis Mitte/Ende 30.

Die Wette ist also nicht „bessere Wetterdaten" (die Daten sind frei und für alle gleich), sondern **bessere Kuration und bessere Entdeckung**.

---

## 3. Das mentale Modell: ein Suchraum mit zwei Achsen

Alles im Tool ist *eine* Karte-plus-Portfolio-Fläche, die entlang zweier Regler bewegt wird. „Suche in alle Richtungen" ist kein Bündel aus vielen Masken, sondern dieselbe Fläche, anders gelesen:

- **Zeitlinse:** *Aktuell* (jetzt + Forecast bis 7 Tage, aus Live-Daten) ⇄ *Saison* (Monats-/Wochenbereich, aus Klimatologie).
- **Granularität:** *Region* (Reise-Ebene) ⇄ *Spot* (Detail-Ebene).

Die vier Felder dieses Rasters sind die vier Suchjobs:

| | **Region** | **Spot** |
|---|---|---|
| **Saison** | Welche Region im Zeitraum? Wann in die Region? | Beste Spots im Zeitraum? Wann zu Spot X? |
| **Aktuell** | Wo läuft es gerade? | Kann ich jetzt hin? |

Karte und Portfolio sind immer dieselbe Ergebnismenge in zwei Darstellungen (räumlich vs. fotogetrieben) und reagieren synchron auf die Regler. Bewegt man die Zeitlinse, ändern sich Pin-Farben, Sortierung und Filter zugleich.

---

## 4. Die Spot-Sammlung *(Kernstück)*

Die Spot-Sammlung ist der Wert des Produkts. Sie hat zwei Ebenen und einen klaren Burggraben.

### 4.1 Zwei Ebenen: Region und Spot

- Eine **Region** ist eine *kuratierte Reise-Marke* — „Tarifa", „Ericeira", „Sardinien", Nord-/Ostsee. Sie hat ein eigenes Foto, eine Beschreibung und eine eigene Saisonkurve, die aus ihren Spots hochgerechnet wird. Regionen sind die inspirierende Einstiegsebene („wo könnte ich als Nächstes hin").
- Ein **Spot** ist die *Datengrundlage* — eine konkrete Koordinate mit allen Mess- und Metadaten. Spots gehören zu einer Region.

Reise-Planung läuft Region-zuerst, dann zoomt man in die Spots; „vor Ort" läuft Spot-zuerst. Beides ist dieselbe Fläche, nur auf anderer Granularität.

Wichtig fürs Ranking auf Region-Ebene: Eine Region gilt in einer Woche als gut, wenn **möglichst viele ihrer Spots laufen** (`spots_working`) — *nicht* nach Durchschnittswind. Eine Region kann top sein, obwohl nur ein Spot passt (weil nur seine Ausrichtung zur Windrichtung passt); ein Mittelwert würde diesen Spot wegmitteln.

### 4.2 Anatomie eines Spots — automatisch vs. redaktionell

Jeder Spot besteht aus zwei Datenschichten:

**Automatisch (aus den Wetterdaten).** Beim Anlegen wird der Spot über seine Koordinate mit Datenquellen verknüpft: die Wind-, Wellen- und Temperatur-Klimatologie (welche Wochen im Jahr typisch welchen Wind/Welle bringen) sowie Live- und Vorhersagewerte. Das passiert ohne Handarbeit.

**Redaktionell (von Hand gepflegt) — der eigentliche Burggraben.** Aus einer Koordinate allein lässt sich *nicht* ableiten, ob ein Spot gut ist. Der Wert hängt an der **Windrichtung relativ zur Ausrichtung des Spots**:

- Beim **Kiten** ist seitlicher Wind ideal, auflandiger meist okay, **ablandiger lebensgefährlich** (treibt aufs offene Meer). Dieselbe Windrichtung ist an Spot A perfekt und an Spot B tödlich.
- Beim **Wellenreiten** kehrt sich die Logik um: ablandiger Wind ist *gut* (hält die Welle sauber), auflandiger zerbläst sie.

Deshalb trägt jeder Spot redaktionelle Metadaten, die keine Automatik liefern kann: nutzbare / ideale / gefährliche Windrichtungen, nutzbarer Windstärkebereich, Wassertyp (Lagune/Flachwasser/Welle), Bodentyp (Sand/Reef/Point), Gezeitenabhängigkeit, Niveau, Gefahren, und für Wellenspots das Swell-Fenster (welche Swell-Richtungen den Spot erreichen). **Genau diese Daten machen die etablierten Tools wertvoll trotz hässlicher Oberfläche — und genau hier entsteht die Qualität, die kopierbare Wetterdaten nicht liefern.**

Diese eine Datenstruktur speist beide Sportarten: Dieselben Ausrichtungs-Sektoren werden im Kite- und im Welle-Modus *gegensätzlich* bewertet.

### 4.3 Wie ein Spot entsteht (Lebenszyklus)

1. Im Admin wird der Spot angelegt: Name, Koordinate, Sportarten, Bild.
2. Das System löst die nächste Wetter-Gitterzelle auf und startet einen **einmaligen Batch-Job**, der die 20-Jahres-Klimatologie für diese Zelle berechnet und speichert.
3. Die redaktionellen Metadaten werden gepflegt (Richtungen, Bereiche, Gefahren).
4. Erst wenn Metadaten vollständig, Klimatologie berechnet und ein Bild vorhanden sind, wird der Spot **öffentlich geschaltet**. Ohne vollständige Metadaten gäbe es weder die Windrose noch einen verlässlichen Score.

### 4.4 Coverage-Strategie: Europa, tief statt breit

Die Wetterdaten sind global und für alle gleich — der Engpass ist die redaktionelle Pflege. Ein weltweit-aber-dünner Katalog wäre genau die Schwäche, die das Produkt vermeiden will. Deshalb: **Start mit Europa, Region für Region vollständig kuratiert**, mit einer „launch-ready"-Checkliste pro Teilregion (z. B. Nord-/Ostsee, Atlantik-Iberien, Mittelmeer, Kanaren). Europa trägt beide Sportarten — Mittelmeer und Atlantik für Kite und Welle, Nord-/Ostsee für den Heimmarkt.

### 4.5 Bilder

Region-Bilder kommen aus kuratiertem Stock (Stimmungen reichen); Spot-Bilder sind echtes, beim Anlegen hinterlegtes Material mit Pflicht-Rechtefeldern (Quelle/Lizenz/Credit). Spätere Community-Uploads mit Moderation sind im Datenmodell vorgesehen, aber erst nach Rechtsklärung.

---

## 5. Der Suchmechanismus *(Kernstück)*

Suche heißt hier: sich durch den Suchraum aus Abschnitt 3 bewegen. Es gibt **zwei Eingänge** und mehrere Richtungen.

### 5.1 Die zwei Eingänge

- **Orts-Achse** (ich weiß *wo*): die Textsuche.
- **Zeit-Achse** (ich weiß *wann*): der Zeitraum-Regler.

Beide zusammen, plus der Region/Spot-Zoom und der Aktuell/Saison-Schalter, sind die vollständige Navigation. Die Textsuche setzt den *Ort*, der Zeitregler setzt die *Zeit* — sie kombinieren sich.

### 5.2 Ortssuche: Spots, Regionen, und ein ehrlicher Umkreis-Fallback

Die Suche findet **Spots und Regionen** aus dem eigenen Index. Zusätzlich wird die Eingabe über Geocoding zu Koordinaten aufgelöst — aber ein Ort ist **nie** selbst ein Treffer, sondern nur der Aufhänger für eine **Umkreissuche**, die ausschließlich echte Wassersport-Spots zurückgibt, keine Dörfer.

Konkret: Gibt man „Laboe" (Kiel) ein, kommt nicht nur Laboe zurück, sondern auch nahegelegene Spots wie Stein — und je nach Datenlage kann Stein **höher** ranken, wenn er bei vergleichbarer Nähe die besseren Werte hat. Die Umkreis-Treffer werden also **nach Score im aktuellen Zeitkontext** gerankt, mit der Distanz als Dämpfung: Ein deutlich besserer Spot etwas weiter weg darf vorrücken, aber ein 80 km entfernter Top-Spot verdrängt keinen guten Spot direkt nebenan. Der Radius beginnt eng (~25 km) und erweitert sich nur, wenn zu wenige Spots gefunden werden.

Der Suchablauf in Reihenfolge: erst der eigene Index (Spots + Regionen); matcht nichts, dann Geocoding → Umkreissuche → Score-Ranking. „In der Nähe" über GPS braucht gar kein Geocoding.

### 5.3 Zeitraum-Suche: ein Bereich, nicht ein Monat

Statt eines einzelnen Monats wählt man eine Spanne (z. B. „März–Mai" oder eine wochengenaue Auswahl). Die Klimatologie wird über das Fenster verdichtet — und zwar nach **„Anteil des Fensters, in dem es durchgehend läuft"**, nicht nach Mittelwert. Eine Region, die nur in der ersten Woche der Spanne gut ist, rankt schlechter als eine, die das ganze Fenster trägt. Das bildet echte Reiseplanung ab: „Ich habe diese drei Wochen frei — wo trägt es durchgehend?". Der Anteil ist zugleich als Faktinfo anzeigbar („an X % der Tage nutzbar").

### 5.4 Die Reverse-Richtungen

- **„Welche Region im Zeitraum?"** — für ein gewähltes Zeitfenster die Regionen nach Eignung ranken (die Reise-Startseite).
- **„Wann in die Region?"** — für eine gewählte Region die geglättete 52-Wochen-Kurve zeigen (wann es dort am besten ist).

Beides ist dieselbe Datenstruktur, einmal über alle Regionen sortiert, einmal auf eine Region fokussiert.

### 5.5 Wind/Welle als Katalog-Neuabfrage

Der Sport-Toggle ist kein reines Umfärben: Er ist eine **neue Abfrage gegen den Katalog**. Es erscheinen andere Spots (Flachwasser-Lagunen fallen im Welle-Modus heraus), andere Metriken stehen im Vordergrund (Wind vs. Swell/Periode/Höhe), und die **Windbewertung invertiert sich** auf denselben Ausrichtungs-Metadaten (ablandig: gefährlich beim Kiten, sauber beim Wellenreiten).

### 5.6 Personalisierung ohne Login

Die Suche ist über ein leichtes **Rider-Profil** personalisiert — Sportart, Niveau, optional Heimat-Ort, lokal gespeichert, kein Account nötig. Das Niveau ist dabei nicht Kosmetik: Es verschiebt die Nutzbarkeitsschwelle, sodass derselbe Spot für einen Anfänger und einen Profi unterschiedlich bewertet wird. Das ist die „Personalisierung", die das Produkt verspricht — über Parameter, nicht über ein Nutzerkonto.

### 5.7 Karte und Portfolio synchron

Jede Suche liefert *eine* Ergebnismenge, dargestellt als Karten-Pins **und** als Portfolio-Karten zugleich; nummerierte Pins entsprechen den Karten. Bei geringem Zoom clustern die Pins, damit nicht zehn Spots in einer Bucht übereinanderliegen — die Schwäche, die andere Tools haben.

---

## 6. Die Daten-Architektur — zwei getrennte Pfade

Hinter dem Tool liegen zwei Datenwelten, die sich nie berühren außer auf der Oberfläche:

- **Saison-Pfad (Klimatologie, offline).** Aus einer Reanalyse historischer Wetterdaten (ERA5, letzte 20 Jahre) wird pro Spot *einmalig* ein Saisonprofil vorberechnet: für jede Kalenderwoche, wie häufig der Wind in nutzbarer Stärke *und* aus brauchbarer Richtung weht, dazu Temperatur-, Wasser- und Wellen-Statistik. Das ist die eigentliche Engineering-Arbeit des Produkts und beantwortet alle Saison- und Reverse-Fragen. Es läuft als Batch-Job beim Anlegen, nicht zur Laufzeit.
- **Aktuell-Pfad (Live + Forecast, Laufzeit).** Aus einem Vorhersagedienst (Open-Meteo, kostenlos, global, ohne Schlüssel) kommen die aktuellen Werte und der 7-Tage-Forecast, kurz zwischengespeichert.

Die Naht zwischen beiden — etwa bei Tag 7 — bleibt **sichtbar**, nicht kaschiert: Der Aktuell/Saison-Schalter macht dem Nutzer bewusst, ob er eine konkrete Vorhersage oder eine statistische Wahrscheinlichkeit sieht. Kein durchgehender Zeit-Schieber, der die Datenquelle heimlich wechselt.

Warum 20 Jahre: Die Schwankung des Windes von Jahr zu Jahr wird von dekadischen Ozean-Atmosphären-Oszillationen (für Europa v. a. der NAO) getrieben; ein zu kurzes Fenster fängt nur eine zufällige Phase ein und schätzt das Klima systematisch falsch. 20 Jahre mitteln mehrere Phasen heraus und bleiben durch ihre Jüngeit nah am aktuellen Regime.

---

## 7. Wind- und Welle-Modus — gleiche Daten, andere Physik

Der Toggle dreht nicht nur die Anzeige, sondern die Bewertung:

- **Wind (Kite):** Windstärke, Böen, Richtung. Ablandig = Gefahr. Eine Windrose zeigt, aus welchen Richtungen der Wind typisch kommt (Länge der Sektoren) und ob diese Richtungen am Spot ideal, nutzbar oder gefährlich sind (Farbe).
- **Welle (Surf):** Swell-Höhe, Periode (lange Periode = kraftvoller Groundswell), Swell-Richtung. Hier braucht es *zwei* Richtungsbeziehungen — das Swell-Fenster (welche Swell-Richtungen den Spot erreichen) und die Wind-Qualität (ablandig = sauber, auflandig = zerblasen, also genau invertiert zum Kiten). Gezeiten spielen beim Surf eine größere Rolle.

---

## 8. Der Score — bewusst sekundär

Das Tool zeigt ein **grobes Ampel-Badge** (gut / mäßig / nein) für die aktuelle Lage und die nächsten Tage. Es ist absichtlich grob und absichtlich *Information*, kein Befehl: „Jetzt: gut" ist eine Zustandsbeschreibung, nie „geh los". Der Score ist **nicht** das zentrale Produkt — die Suche und der Katalog sind es. Der Score gibt nur eine schnelle Einschätzung, ob man hinfahren kann.

Berechnet wird er regelbasiert und transparent: zuerst harte Ausschlüsse (Richtung außerhalb des Fensters, im Gefahren-Sektor, Gezeitenfenster verpasst → „nein"), dann eine grobe Graduierung. Dieselbe Funktion läuft live (auf einen Zeitpunkt) und klimatologisch (über das Saisonprofil) — daher treibt sie Jetzt-Badge, Saisonkurve, Region-Aggregat und Zeitraum-Ranking aus einer Logik.

Jeder Spot trägt eine **Konfidenz**, die ehrlich angezeigt wird: hoch an offenen Küsten, niedriger bei thermisch geprägten Spots und bei Wellenspots (dazu unten).

---

## 9. Zwei Ausbaustufen

- **Stufe 1 — beschreibend.** Saisonkurven und Werte rein deskriptiv („typisch 18 kt, vorwiegend NW; Wasser 17°"). Braucht keine vollständigen Metadaten, macht Karte, Portfolio und Saison sofort lauffähig.
- **Stufe 2 — bewertet.** Sobald die redaktionellen Metadaten je Spot stehen, wird aus der Beschreibung ein Score („an 64 % der Junitage nutzbar"). Dieselben Kurven, geschärft.

Die Datenstruktur ist von Anfang an für Stufe 2 ausgelegt (das volle Richtung×Stärke-Histogramm wird schon in Stufe 1 gespeichert), sodass der Score später keine erneute, teure Neuberechnung der Historie auslöst.

---

## 10. Plattform & Technik

- **Plattform:** responsive Web-App für Mobil und Desktop. Keine native App in v1.
- **Stack:** PostgreSQL + PostGIS (Spots, Geo-Suche, Klimatologie als JSONB), Python/FastAPI (API *und* die ERA5-Pipeline in einer Sprache), Redis (Live-Cache), MapLibre für die Karte mit eigenem hellen Reise-Stil.
- **Datenquellen:** ERA5 (Copernicus, Klimatologie, kostenlos), Open-Meteo (Live/Forecast/Geocoding, kostenlos). Keine Datenkosten, weltweit verfügbar.

---

## 11. Bewusste Grenzen — was das Tool *nicht* verspricht

Ehrlichkeit ist Teil der Positionierung:

- Die freien Modelldaten sind **küstennah ungenau** (grobes Raster glättet lokale Düsen und Thermik). Der Score ist deshalb grob und relativ, keine punktgenaue Vorhersage.
- **Wellendaten sind regional, nicht spotgenau:** Die brechende Welle am Riff (Bathymetrie, Refraktion) steckt nicht in den freien Daten. Der Wellen-Score sagt „kommt diese Saison nutzbarer Swell aus brauchbarer Richtung an", nicht „die Welle ist 1,2 m und sauber an diesem Riff". Wellenspots tragen darum eine niedrigere Konfidenz.
- **Kein Wiederkehr-Hook in v1:** Benachrichtigungen („dein Spot läuft") kommen erst mit einer späteren App. Die Auswertungslogik liegt aber schon serverseitig bereit, damit die App nur noch Zustellkanal ist.
- Ein dauerhafter, sachlicher Hinweis (Modellschätzungen, lokale Bedingungen prüfen, Eigenverantwortung) und Gefahren-Flags begleiten jede Bedingungsanzeige.

---

## 12. Gesetzte Entscheidungen (Stand v1)

- Planung zuerst, Katalog als Held, Spot-Detail untergeordnet.
- Web-App, mobil + Desktop, keine native App.
- Sportarten v1: Kite (Wind) und Surf (Welle), binär per Toggle; Schema offen für weitere.
- Klimatologie aus ERA5, gleitendes 20-Jahres-Fenster.
- Forecast aus Open-Meteo, gekappt auf 7 Tage; danach Klimatologie.
- Suche: Spots + Regionen + Geocoding-Umkreis-Fallback (nur echte Spots), Score-gerankt mit Distanzdämpfung.
- Zeitraum als Bereich, Ranking nach Anteil-über-Schwelle.
- Coverage-Start: Europa, region-für-region tief gepflegt.
- Score: regelbasiert, kategorial, mit Konfidenz; Information, keine Empfehlung.
- Personalisierung über lokales Rider-Profil; Accounts erst mit der App.
- Monetarisierung noch kein Thema — Priorität ist ein ausgereiftes, einfaches, ehrliches Tool.

---

## 13. Status & nächste Schritte

Ausgearbeitet sind: Produktthese, Suchraum, Spot-/Region-Modell, Suchmechanismus, Datenarchitektur, Wind-/Welle-Logik, Score-Logik, Funktionsliste, DB-Schema und Score-Parameter.

Offen: Zusammenführung in einen **sprintweisen Code-Prompt für Claude Code**, Detail der Admin-Validierung, und die Kalibrierung der Score-Schwellen an realen Spots während des Europa-Rollouts.

### Begleitdokumente

- **Funktionsspezifikation** — alle Backend-Funktionen mit Eingaben, Ausgaben, Daten, Stufe und Abhängigkeiten.
- **Datenmodell & Score-Parameter** — vollständiges PostGIS-Schema, JSONB-Strukturen und konkrete Score-Werte.
