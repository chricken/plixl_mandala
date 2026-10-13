# Ein Mandala Creator.

## Overview 
Dieser soll vollständig in Javascript funktionieren.
Das Mandala soll auf einem Canvas gezeichnet werden.

Der Code soll modular (ESM) sein, mit Promises (then-Chaining) arbeiten, wo notwendig.
Mit Webworkern arbeiten, wo sinnvoll (z.B. Export)
Ich will ausschließlich Arrow-Funktionen.

### Ebenen
Es können verschiedene Ebenen angelegt werden, jede Ebene nimmt verschiedene Optionen an:
- Art des Elementes (Kreis, Rechteck, Dreieck, Text, Pfad, verschachteltes Mandala)
  - Bei Kreis: Radius, Startwinkel, Endwinkel
  - bei Rechteck: Breite, Höhe, Winkel
  - bei Dreieck: Breite, Höhe, Winkel
  - bei Text: Text, Schriftart, Schriftgröße, 
  - bei Pfad: Zu Pfaden siehe weiter unten
  - bei verschachteltes Mandala: Mandala mit allen Möglichkeiten
- StrokeColor, Fillcolor
- Liniendicke
- Position (x,y)
- Rotation
- Opacity

Zu jeder Ebene kann bestimmt werden, wie sie kopiert werden soll:
- Wie viele Kopien es geben soll
- Wie groß der Gesamtwinkel ist.
- Ein Offset, der die Position der Kopien beeinflusst.
- Eine Skalierung 
- Die Opacity kann ebenso bestimmt werden
- Der Fixpunkt kann bestimmt werden

Die Ebenen können verschachtelt werden, sodass eine Ebene mehrere Ebenen enthält.
Wenn also eine Ebene ein anderes Mandala enthält, dann wird das andere Mandala den Regeln der Ebene unterworfen.  


### Pfade
Wenn ein Pfad als Element gewählt wurde, doll dieser Im Canvas dargestellt werden.

Die einzelnen Stützpunkte des Pfades werden angezeigt und können mit der Maus verschoben werden.
Jeder Stützpunkt hat auch zwei Anfasser, die die Steigung der Kurve an diesem Punkt bestimmen.
Diese Anfasser können auch verschoben werden.

Anfasser, über die die Maus hovert werden hervorgehoben (vielleicht mit einem Schatten?)

## Anzeige der Ebenen
Es gibt eine Übersicht der Ebenen, ähnlich wie in Illustrator und Co.
- Die Ebenen können ineinander und hintereinander verschoben werden (Drag n Drop).
- Sie können ausgeblendet werden (Checkbox).
- Sie können gelöscht werden (Mülleimer).
- Sie erhalten einen Namen (Textfeld).
- Verschachtelte Elemente werden eingerückt angezeigt

Das Element zur Anzeige der Ebenen kann frei verschoben, minimiert und angedockt werden 

## Export
Mandalas können in verschiedenen Formaten exportiert werde:
- SVG
- PNG
- JPG

Das SVG soll auf der Beschreibung basieren und soll hinterher noch in einem Vektorprogramm bearbeitet werden können.

Die Größe des Exports muss eingestellt werden können.