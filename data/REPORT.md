# Data report

Generated 2026-10-06 by `scripts/build-data.mjs`. This compares the original hand-written estimates in the app with the values computed from open data.

## Best months (1–5 scores)

- City-months compared: 1440
- Correlation between estimates and data: **0.74** (1 = identical ranking, 0 = unrelated)
- Within one point of each other: **85%**

Biggest disagreements (average points off per month):

| City | Off by | Estimate (Jan–Dec) | Data (Jan–Dec) |
|---|---|---|---|
| Reykjavík | 1.7 | 3 3 3 3 4 5 5 5 4 3 3 3 | 1 2 3 3 4 2 1 1 2 2 2 1 |
| Innsbruck | 1.7 | 5 5 4 3 3 4 5 5 5 4 3 5 | 1 1 2 3 4 5 4 3 5 4 2 1 |
| Cologne | 1.3 | 3 4 3 4 5 5 5 5 4 3 3 4 | 1 1 2 3 4 5 4 4 5 3 1 1 |
| Lisbon | 1.3 | 3 3 4 5 5 4 3 3 5 4 3 3 | 1 2 2 3 5 5 5 5 5 4 2 1 |
| London | 1.3 | 3 3 3 4 5 5 4 4 4 4 3 4 | 1 1 1 3 4 5 4 4 5 3 1 1 |
| Edinburgh | 1.3 | 2 2 3 4 5 5 4 4 4 3 2 4 | 1 1 2 3 3 4 2 2 4 2 2 1 |
| Copenhagen | 1.3 | 2 2 3 4 5 5 5 5 4 3 2 3 | 1 1 2 3 3 4 3 3 4 2 1 1 |
| Venice | 1.3 | 3 4 3 4 5 4 3 3 4 4 3 3 | 1 2 2 3 4 5 4 4 5 3 2 1 |

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
| Reykjavík | 106 | 132 | 1.67 | eurostat |
| Cologne | 66 | 91 | 1.12 | eurostat |
| Brussels | 74 | 98 | 1.24 | eurostat |
| Thessaloniki | 44 | 68 | 0.86 | eurostat |
| Sarajevo | 36 | 60 | 0.75 | eurostat |
| Poznań | 38 | 62 | 0.92 | eurostat |

## Interest tags: hand-picked vs. OpenStreetMap

Agreement = share of cities where the hand-picked tag and the data (top 40% of cities) say the same thing.

| Interest | Agreement | Tagged by hand only | Found by data only |
|---|---|---|---|
| food | 61% | Granada, Málaga, San Sebastián, Gdańsk, Palma de Mallorca | Amsterdam, Berlin, Prague, Budapest, Edinburgh |
| nightlife | 65% | Málaga, Split, Zagreb, Riga, Bucharest | Paris, Vienna, Rome, Florence, Granada |
| cafes | 68% | Ljubljana, Tallinn, Marrakech, Tangier, Essaouira | Barcelona, London, Berlin, Budapest, Kraków |
| markets | 63% | Florence, Nice, Marrakech, Tangier, Essaouira | Seville, Lisbon, Porto, Prague, Vienna |
| art | 69% | Málaga, Nice, Essaouira, Bilbao, Aarhus | Lisbon, Porto, Prague, Budapest, Kraków |
| history | 52% | Granada, Dublin, Salzburg, Venice, Dubrovnik | Barcelona, Lisbon, Porto, Valencia, Málaga |
| architecture | 62% | Granada, Zurich, Salzburg, Ljubljana, Gdańsk | Madrid, London, Amsterdam, Berlin, Kraków |
| castles | 61% | Madrid, Seville, London, Granada, Málaga | Barcelona, Lisbon, Porto, Amsterdam, Berlin |
| sacred | 57% | Athens, Sofia, Marrakech, Fez, Amman | Madrid, Lisbon, Porto, London, Amsterdam |
| music | 60% | Granada, Salzburg, Essaouira, Ibiza, Cluj-Napoca | Barcelona, Madrid, Paris, Amsterdam, Prague |
| streetart | 62% | Marseille, Palermo, Vilnius, Manchester, Montpellier | Madrid, Porto, Paris, Amsterdam, Prague |
| sports | 73% | Amsterdam, Lyon, Marseille, Bilbao, Toulouse | Prague, Vienna, Budapest, Kraków, Brussels |
| nature | 50% | Málaga, San Sebastián, Nice, Zurich, Salzburg | Barcelona, Madrid, Seville, Lisbon, Paris |
| hiking | 54% | Málaga, Edinburgh, Dublin, Sofia, Palma de Mallorca | Barcelona, Lisbon, Paris, Amsterdam, Berlin |
| mountains | 65% | Marrakech, Tbilisi, Funchal (Madeira), Ponta Delgada (Azores), Reykjavík | Barcelona, Berlin, Prague, Vienna, Budapest |
| lakes | 76% | Porto, Vienna, Lyon, Ljubljana, Belgrade | Paris, London, Berlin, Florence, Edinburgh |
| views | 72% | Edinburgh, Dubrovnik, Split, Reykjavík, Ohrid | Madrid, London, Amsterdam, Berlin, Vienna |
| spas | 77% | Sofia, Amman, Tbilisi, Ponta Delgada (Azores), Antalya | Paris, London, Amsterdam, Berlin, Prague |
| surf | 83% | Porto, Dubrovnik, Split, Palma de Mallorca, Essaouira | Barcelona, Marseille, Gdańsk, Oslo, Genoa |
| beach | 79% | Zurich, Ljubljana, Tangier, Agadir, Essaouira | Porto, Edinburgh, Dublin, Stockholm, Venice |
| islands | 80% | Istanbul, Valletta, Paphos, Tenerife, Las Palmas | San Sebastián, Edinburgh, Copenhagen, Tallinn, Riga |
| wine | 69% | Funchal (Madeira), Santorini | Barcelona, Madrid, Lisbon, Paris, London |
| snow | 94% | Kraków, Granada, Munich, Sofia, Tbilisi | – |
| wildlife | 69% | Valencia, Edinburgh, Stockholm, Agadir, Paphos | Paris, London, Amsterdam, Berlin, Prague |
| desert | 88% | Naples, Marrakech, Agadir, Tunis, Amman | Athens, Lyon, Bologna, Fez, Cologne |
| vintage | 59% | – | Barcelona, Madrid, Lisbon, Porto, Paris |
| books | 59% | – | Barcelona, Madrid, Lisbon, Paris, London |
| vegan | 59% | – | Barcelona, Madrid, Lisbon, Paris, London |
| cycling | 59% | – | Barcelona, Madrid, Seville, Lisbon, Paris |
| caves | 59% | – | Barcelona, Lisbon, Prague, Vienna, Budapest |
| themeparks | 61% | – | Porto, Paris, London, Amsterdam, Berlin |
| gardens | 61% | – | Barcelona, Madrid, Seville, Lisbon, Porto |
| climbing | 59% | – | Barcelona, Madrid, Lisbon, Porto, Paris |
| lgbtq | 62% | – | Barcelona, Madrid, Lisbon, Porto, Paris |
| games | 58% | – | Barcelona, Madrid, Lisbon, Porto, Paris |
| students | 59% | – | Barcelona, Madrid, Lisbon, Paris, London |
| offbeat | 63% | Bologna, Ljubljana, Gdańsk, Riga, Sofia | Granada, Dubrovnik, Split, Valletta, Palma de Mallorca |

## Coverage

- Climate: 120/120 cities
- Crowds: 108 from Eurostat, 12 from Wikipedia pageviews
- Prices: 109 from Eurostat, 11 from the World Bank
- OpenStreetMap counts: 120/120 cities
- Wikipedia popularity: 120/120 cities

## Problems on this run

- osm vilnius: all Overpass servers failed
- osm bordeaux: all Overpass servers failed
- osm hamburg: all Overpass servers failed
- osm cologne: all Overpass servers failed
- osm oslo: all Overpass servers failed
- time budget reached during osm; remaining cities keep their previous values
