# Data report

Generated 2026-09-30 by `scripts/build-data.mjs`. This compares the original hand-written estimates in the app with the values computed from open data.

## Best months (1–5 scores)

- City-months compared: 1440
- Correlation between estimates and data: **0.74** (1 = identical ranking, 0 = unrelated)
- Within one point of each other: **83%**

Biggest disagreements (average points off per month):

| City | Off by | Estimate (Jan–Dec) | Data (Jan–Dec) |
|---|---|---|---|
| Reykjavík | 1.7 | 3 3 3 3 4 5 5 5 4 3 3 3 | 1 1 2 3 4 3 2 2 2 2 1 1 |
| Innsbruck | 1.6 | 5 5 4 3 3 4 5 5 5 4 3 5 | 1 1 2 3 4 5 4 4 5 4 2 1 |
| Rome | 1.5 | 3 3 4 5 4 3 2 2 4 5 4 3 | 1 2 2 3 5 5 3 3 5 4 2 1 |
| London | 1.4 | 3 3 3 4 5 5 4 4 4 4 3 4 | 1 1 1 3 3 5 3 4 4 2 1 1 |
| Cologne | 1.4 | 3 4 3 4 5 5 5 5 4 3 3 4 | 1 1 2 2 3 5 4 5 4 2 1 1 |
| Salzburg | 1.3 | 2 2 3 4 5 5 5 5 5 4 2 5 | 1 1 2 2 3 5 4 4 4 3 1 1 |
| Lisbon | 1.3 | 3 3 4 5 5 4 3 3 5 4 3 3 | 1 2 2 3 5 5 5 5 5 4 2 1 |
| Paris | 1.3 | 3 3 4 5 5 4 3 3 5 4 3 4 | 1 1 2 4 4 5 4 3 5 3 2 1 |

## Daily costs (hostel + food + transit + activities, EUR)

- Correlation between estimates and data: **0.84**
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
| food | 62% | Granada, Málaga, San Sebastián, Gdańsk, Palma de Mallorca | Amsterdam, Berlin, Prague, Budapest, Stockholm |
| nightlife | 64% | Málaga, Split, Zagreb, Riga, Bucharest | Paris, Vienna, Rome, Florence, Granada |
| cafes | 68% | Ljubljana, Tallinn, Marrakech, Tangier, Essaouira | Barcelona, London, Berlin, Budapest, Kraków |
| markets | 66% | Florence, Nice, Marrakech, Tangier, Essaouira | Seville, Lisbon, Porto, Vienna, Budapest |
| art | 69% | Málaga, Nice, Essaouira, Bilbao, Aarhus | Lisbon, Porto, Prague, Budapest, Kraków |
| history | 53% | Granada, Dublin, Salzburg, Venice, Dubrovnik | Barcelona, Lisbon, Porto, Valencia, Málaga |
| architecture | 62% | Granada, Zurich, Salzburg, Bologna, Ljubljana | Madrid, London, Amsterdam, Berlin, Kraków |
| castles | 60% | Madrid, Seville, London, Granada, Málaga | Barcelona, Lisbon, Porto, Amsterdam, Berlin |
| sacred | 57% | Athens, Sofia, Marrakech, Fez, Amman | Madrid, Lisbon, Porto, London, Amsterdam |
| music | 61% | Granada, Salzburg, Essaouira, Ibiza, Cluj-Napoca | Barcelona, Madrid, Paris, Amsterdam, Prague |
| streetart | 64% | Marseille, Palermo, Vilnius, Manchester, Montpellier | Madrid, Porto, Paris, Amsterdam, Prague |
| sports | 73% | Amsterdam, Lyon, Marseille, Bilbao, Toulouse | Prague, Vienna, Budapest, Kraków, Brussels |
| nature | 48% | Porto, Málaga, San Sebastián, Nice, Zurich | Barcelona, Madrid, Seville, Lisbon, Paris |
| hiking | 54% | Málaga, Edinburgh, Dublin, Sofia, Palma de Mallorca | Barcelona, Lisbon, Paris, Amsterdam, Berlin |
| mountains | 69% | Marrakech, Tbilisi, Funchal (Madeira), Ponta Delgada (Azores), Reykjavík | Barcelona, Prague, Vienna, Budapest, Kraków |
| lakes | 67% | Porto, Vienna, Belgrade, Bordeaux, Ohrid | Madrid, Lisbon, Paris, London, Berlin |
| views | 73% | Edinburgh, Dubrovnik, Split, Reykjavík, Ohrid | Madrid, London, Amsterdam, Berlin, Vienna |
| spas | 66% | Amman, Varna | Barcelona, Madrid, Lisbon, Paris, London |
| surf | 64% | Dubrovnik, Palma de Mallorca, Faro (Algarve), Ibiza, Cagliari (Sardinia) | Barcelona, Paris, Amsterdam, Berlin, Prague |
| beach | 61% | Barcelona, Valencia, San Sebastián, Ljubljana, Gdańsk | Porto, London, Amsterdam, Berlin, Rome |
| islands | 68% | Valletta, Paphos, Tenerife, Las Palmas, Ponta Delgada (Azores) | Paris, London, Amsterdam, Berlin, Vienna |
| wine | 70% | Funchal (Madeira), Santorini | Barcelona, Madrid, Lisbon, Paris, London |
| snow | 68% | Tbilisi | Madrid, London, Amsterdam, Prague, Vienna |
| wildlife | 53% | Valencia, Agadir, Paphos, Tenerife, Funchal (Madeira) | Barcelona, Madrid, Lisbon, Paris, London |
| desert | 70% | Marrakech, Agadir, Tunis, Amman | Barcelona, Porto, Amsterdam, Berlin, Prague |
| offbeat | 53% | Bologna, Ljubljana, Zagreb, Riga, Sofia | Lisbon, Porto, Prague, Vienna, Budapest |

## Coverage

- Climate: 120/120 cities
- Crowds: 108 from Eurostat, 12 from Wikipedia pageviews
- Prices: 109 from Eurostat, 11 from the World Bank
- OpenStreetMap counts: 113/120 cities
- Wikipedia popularity: 120/120 cities

## Problems on this run

- osm nuremberg: all Overpass servers failed
- osm nicosia: all Overpass servers failed
- osm lille: all Overpass servers failed
- osm cork: all Overpass servers failed
- osm rabat: all Overpass servers failed
- osm cairo: all Overpass servers failed
- osm menorca: all Overpass servers failed
- osm barcelona: all Overpass servers failed
- time budget reached during osm; remaining cities keep their previous values
