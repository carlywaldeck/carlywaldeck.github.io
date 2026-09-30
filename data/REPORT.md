# Data report

Generated 2026-09-30 by `scripts/build-data.mjs`. This compares the original hand-written estimates in the app with the values computed from open data.

## Best months (1–5 scores)

- City-months compared: 1440
- Correlation between estimates and data: **0.43** (1 = identical ranking, 0 = unrelated)
- Within one point of each other: **69%**

Biggest disagreements (average points off per month):

| City | Off by | Estimate (Jan–Dec) | Data (Jan–Dec) |
|---|---|---|---|
| Reykjavík | 2.7 | 3 3 3 3 4 5 5 5 4 3 3 3 | 1 1 1 1 1 1 1 1 1 1 1 1 |
| Zakynthos | 2.4 | 1 1 2 3 5 5 4 4 5 3 1 1 | 3 4 4 5 5 2 1 1 2 5 5 3 |
| Edinburgh | 2.3 | 2 2 3 4 5 5 4 4 4 3 2 4 | 1 1 1 1 1 2 1 1 2 1 1 1 |
| Dublin | 2.3 | 2 2 4 4 5 5 4 4 4 3 2 3 | 2 2 1 1 1 1 1 1 2 1 1 1 |
| Cork | 2.2 | 2 2 3 3 4 5 5 5 4 3 2 2 | 2 1 1 1 1 1 1 1 2 1 1 1 |
| Innsbruck | 2.1 | 5 5 4 3 3 4 5 5 5 4 3 5 | 1 1 1 3 4 5 3 2 4 3 2 1 |
| Amsterdam | 1.9 | 2 2 3 5 5 4 4 4 4 3 2 3 | 1 1 2 1 1 3 1 2 3 1 1 1 |
| Cologne | 1.9 | 3 4 3 4 5 5 5 5 4 3 3 4 | 1 1 2 2 2 4 3 3 4 1 1 1 |

## Daily costs (hostel + food + transit + activities, EUR)

- Correlation between estimates and data: **0.81**
- Average difference: **11 EUR/day**

| City | Estimate | Data | Price level | Source |
|---|---|---|---|---|
| Naples | 54 | 87 | 1.07 | eurostat |
| Warsaw | 48 | 76 | 0.92 | eurostat |
| Wrocław | 41 | 69 | 0.92 | eurostat |
| Kraków | 44 | 71 | 0.92 | eurostat |
| Marseille | 60 | 87 | 1.1 | eurostat |
| Palermo | 49 | 76 | 1.07 | eurostat |
| Cork | 71 | 97 | 1.29 | eurostat |
| Reykjavík | 106 | 131 | 1.67 | eurostat |
| Cologne | 66 | 91 | 1.12 | eurostat |
| Brussels | 74 | 98 | 1.24 | eurostat |
| Poznań | 38 | 62 | 0.92 | eurostat |
| Thessaloniki | 44 | 67 | 0.86 | eurostat |

## Interest tags: hand-picked vs. OpenStreetMap

Agreement = share of cities where the hand-picked tag and the data (top 40% of cities) say the same thing.

| Interest | Agreement | Tagged by hand only | Found by data only |
|---|---|---|---|
| food | 54% | Granada, Málaga, San Sebastián, Venice, Naples | Amsterdam, Berlin, Prague, Budapest, Munich |
| nightlife | 69% | Kraków, Málaga, Split, Zagreb, Riga | Paris, Vienna, Rome, Florence, Granada |
| cafes | 72% | Zurich, Ljubljana, Tallinn, Marrakech, Tangier | Barcelona, London, Berlin, Budapest, Edinburgh |
| markets | 66% | Florence, Nice, Bologna, Zagreb, Marrakech | Seville, Lisbon, Porto, Vienna, Budapest |
| art | 75% | Málaga, Nice, Essaouira, Bilbao | Lisbon, Porto, Prague, Budapest, Kraków |
| history | 52% | Granada, Edinburgh, Dublin, Salzburg, Venice | Barcelona, Lisbon, Porto, Málaga, Brussels |
| architecture | 59% | Seville, Granada, Zurich, Salzburg, Bologna | Madrid, London, Amsterdam, Berlin, Kraków |
| castles | 61% | Madrid, Seville, London, Granada, Málaga | Barcelona, Lisbon, Porto, Amsterdam, Rome |
| sacred | 61% | Seville, Sofia, Marrakech, Fez, Amman | Madrid, Porto, London, Amsterdam, Berlin |
| music | 68% | Granada, Salzburg, Riga, Essaouira, Ibiza | Barcelona, Madrid, Paris, Amsterdam, Prague |
| streetart | 68% | Palermo, Vilnius | Madrid, Porto, Paris, Amsterdam, Vienna |
| sports | 75% | Amsterdam, Lyon, Istanbul, Bilbao | Prague, Vienna, Budapest, Kraków, Copenhagen |
| nature | 35% | Porto, Málaga, San Sebastián, Nice, Zurich | Barcelona, Madrid, Seville, Lisbon, Paris |
| hiking | 52% | Málaga, Edinburgh, Dublin, Sofia, Palma de Mallorca | Barcelona, Paris, Amsterdam, Berlin, Prague |
| mountains | 70% | Marrakech, Tbilisi, Funchal (Madeira), Ponta Delgada (Azores) | Barcelona, Prague, Vienna, Budapest, Kraków |
| lakes | 68% | Porto, Belgrade | Madrid, Lisbon, Paris, London, Berlin |
| views | 75% | Edinburgh, Dubrovnik, Split | Madrid, London, Amsterdam, Berlin, Vienna |
| spas | 69% | Amman | Madrid, Paris, London, Amsterdam, Berlin |
| surf | 65% | Dubrovnik, Palma de Mallorca, Faro (Algarve), Ibiza, Cagliari (Sardinia) | Barcelona, Paris, Amsterdam, Berlin, Prague |
| beach | 61% | Valencia, San Sebastián, Ljubljana, Gdańsk, Valletta | Porto, London, Amsterdam, Berlin, Rome |
| islands | 66% | Valletta, Paphos, Tenerife, Las Palmas, Ponta Delgada (Azores) | Paris, London, Amsterdam, Berlin, Prague |
| wine | 69% | Funchal (Madeira) | Barcelona, Madrid, Lisbon, Paris, London |
| snow | 72% | Tbilisi | Madrid, London, Amsterdam, Prague, Vienna |
| wildlife | 51% | Valencia, Agadir, Paphos, Tenerife, Funchal (Madeira) | Barcelona, Paris, London, Amsterdam, Berlin |
| desert | 68% | Marrakech, Agadir, Tunis, Amman | Barcelona, Porto, Amsterdam, Berlin, Prague |
| offbeat | 51% | Bologna, Ljubljana, Zagreb, Riga, Sofia | Lisbon, Porto, Paris, Berlin, Prague |

## Coverage

- Climate: 120/120 cities
- Crowds: 108 from Eurostat, 12 from Wikipedia pageviews
- Prices: 109 from Eurostat, 0 from the World Bank
- OpenStreetMap counts: 71/120 cities
- Wikipedia popularity: 120/120 cities

## Problems on this run

- osm athens: all Overpass servers failed
- osm marseille: all Overpass servers failed
- osm stockholm: all Overpass servers failed
- osm wroclaw: all Overpass servers failed
- time budget reached during osm; remaining cities keep their previous values
