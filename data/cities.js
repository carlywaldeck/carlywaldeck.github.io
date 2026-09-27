// City dataset for the MVP.
// All prices are rough per-person estimates in EUR for a budget traveler
// (hostel dorm bed, cheap eats, public transit, a paid sight or two per day).
// season:     how good each month is to visit, 1 (poor) to 5 (great), Jan..Dec
// priceMult:  how expensive lodging/transport is that month vs. normal (1.0), Jan..Dec
// itinerary:  3 days x [morning, afternoon, evening]; each item is [activity, cost in EUR]

window.CITIES = [
  {
    id: "barcelona", name: "Barcelona", country: "Spain", lat: 41.39, lon: 2.17,
    costs: { hostel: 30, food: 30, transit: 6, activities: 15 },
    interests: ["food", "nightlife", "beach", "architecture", "art"],
    season:    [2, 3, 3, 4, 5, 4, 3, 3, 5, 4, 3, 2],
    priceMult: [0.8, 0.8, 0.9, 1.0, 1.1, 1.3, 1.4, 1.4, 1.2, 1.0, 0.8, 0.9],
    bestTime: "May and September: beach weather without peak-summer prices and crowds.",
    itinerary: [
      [["Walk the Gothic Quarter and El Born", 0], ["Lunch at La Boqueria market", 12], ["Sunset at Bunkers del Carmel", 0]],
      [["Sagrada Família and Sant Pau from outside", 0], ["Afternoon on Barceloneta beach", 0], ["Pintxos crawl on Carrer de Blai", 15]],
      [["Walk up Montjuïc to the castle", 5], ["Picasso Museum", 15], ["Bars in El Raval", 10]]
    ],
    extraDay: "Take the train to Sitges for a beach day or to Montserrat for a mountain hike.",
    tips: [
      "The Picasso Museum is free on Thursday evenings and the first Sunday of each month (book online).",
      "Buy a T-casual 10-ride metro card instead of single tickets."
    ]
  },
  {
    id: "madrid", name: "Madrid", country: "Spain", lat: 40.42, lon: -3.70,
    costs: { hostel: 25, food: 27, transit: 5, activities: 12 },
    interests: ["food", "nightlife", "art", "history"],
    season:    [3, 3, 4, 5, 5, 3, 2, 2, 4, 5, 4, 3],
    priceMult: [0.9, 0.9, 0.9, 1.0, 1.1, 1.0, 0.9, 0.85, 1.0, 1.1, 0.9, 1.0],
    bestTime: "April–May and October: warm, lively, and cheap. August is scorching and half the city leaves.",
    itinerary: [
      [["Retiro Park and the Crystal Palace", 0], ["Menú del día lunch near Sol", 13], ["Sunset at Templo de Debod", 0]],
      [["Royal Palace and Almudena Cathedral from outside", 0], ["El Rastro flea market (Sun) or Malasaña vintage shops", 0], ["Prado free hours, then tapas in La Latina", 15]],
      [["Reina Sofía to see Guernica", 0], ["Chocolate con churros at San Ginés", 5], ["Rooftop at Círculo de Bellas Artes, then Malasaña bars", 20]]
    ],
    extraDay: "Take a day trip to Toledo or Segovia; both are under an hour away by train or bus.",
    tips: [
      "The Prado and Reina Sofía offer free entry during the last two hours on most days.",
      "Order the menú del día at lunch: 3 courses and a drink for about €13."
    ]
  },
  {
    id: "seville", name: "Seville", country: "Spain", lat: 37.39, lon: -5.98,
    costs: { hostel: 22, food: 22, transit: 3, activities: 10 },
    interests: ["food", "history", "architecture", "nightlife"],
    season:    [3, 4, 5, 5, 4, 2, 1, 1, 3, 5, 4, 3],
    priceMult: [0.8, 0.9, 1.0, 1.4, 1.1, 0.9, 0.8, 0.8, 0.9, 1.0, 0.9, 0.9],
    bestTime: "March and October–November. Semana Santa and the April Fair are spectacular, but lodging prices spike. Summer regularly tops 40°C.",
    itinerary: [
      [["Plaza de España and María Luisa Park", 0], ["Cathedral and Giralda tower", 10], ["Flamenco at a bar in Triana", 10]],
      [["Real Alcázar palace", 15], ["Wander Barrio Santa Cruz, tapas lunch", 12], ["Sunset on the Setas (Metropol Parasol)", 15]],
      [["Triana market and ceramic shops", 0], ["Siesta, then a riverside walk", 0], ["Tapas crawl around the Alameda", 15]]
    ],
    extraDay: "Take a day trip to Córdoba for the Mezquita, or to Cádiz for the beach.",
    tips: [
      "Tapas often cost €3–4: order several instead of full plates.",
      "The Real Alcázar has free entry slots on Monday evenings; book online early."
    ]
  },
  {
    id: "lisbon", name: "Lisbon", country: "Portugal", lat: 38.72, lon: -9.14,
    costs: { hostel: 25, food: 25, transit: 6, activities: 12 },
    interests: ["food", "nightlife", "beach", "architecture"],
    season:    [3, 3, 4, 5, 5, 4, 3, 3, 5, 4, 3, 3],
    priceMult: [0.8, 0.8, 0.9, 1.0, 1.1, 1.3, 1.3, 1.4, 1.2, 1.0, 0.8, 0.9],
    bestTime: "May and September. June brings the Santo António street festivals.",
    itinerary: [
      [["Alfama and the Santa Luzia viewpoint", 0], ["Follow the Tram 28 route", 3], ["Fado at a small Alfama tasca", 15]],
      [["Belém: pastéis de nata and the riverside", 5], ["LX Factory", 0], ["Street drinks in Bairro Alto", 10]],
      [["Lunch at Time Out Market", 12], ["Sunset at Miradouro da Senhora do Monte", 0], ["Pink Street, Cais do Sodré", 10]]
    ],
    extraDay: "Take a day trip to Sintra's palaces (cheap train from Rossio).",
    tips: [
      "Load 'zapping' credit on a Navegante card: much cheaper than single tickets.",
      "Skip Tram 28 queues: walk the route or board early at the Martim Moniz end."
    ]
  },
  {
    id: "porto", name: "Porto", country: "Portugal", lat: 41.15, lon: -8.61,
    costs: { hostel: 22, food: 22, transit: 5, activities: 10 },
    interests: ["food", "architecture", "outdoors"],
    season:    [2, 2, 3, 4, 5, 5, 4, 4, 5, 4, 2, 2],
    priceMult: [0.8, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.1, 1.0, 0.8, 0.9],
    bestTime: "May–June and September. Winter is cheap but rainy.",
    itinerary: [
      [["Ribeira riverfront and the top deck of Dom Luís I bridge", 0], ["Port cellar tour in Vila Nova de Gaia", 15], ["Sunset at Jardim do Morro", 0]],
      [["São Bento station tiles and the Clérigos area", 0], ["Francesinha lunch", 12], ["Bars on Rua Galeria de Paris", 10]],
      [["Beach walk at Foz do Douro", 5], ["Serralves park and museum", 10], ["Bolhão market and dinner", 12]]
    ],
    extraDay: "Take the scenic train up the Douro Valley to Pinhão.",
    tips: [
      "Get an Andante card for the metro and buses.",
      "A francesinha is huge; one is a full meal."
    ]
  },
  {
    id: "paris", name: "Paris", country: "France", lat: 48.86, lon: 2.35,
    costs: { hostel: 40, food: 35, transit: 8, activities: 18 },
    interests: ["art", "history", "food", "architecture"],
    season:    [3, 3, 4, 5, 5, 4, 3, 3, 5, 4, 3, 4],
    priceMult: [0.85, 0.85, 0.9, 1.0, 1.1, 1.2, 1.2, 1.1, 1.1, 1.0, 0.9, 1.1],
    bestTime: "April–May and September. Late January–February has the lowest hostel prices.",
    itinerary: [
      [["Île de la Cité, Notre-Dame and the Latin Quarter", 0], ["Picnic in the Luxembourg Gardens", 8], ["Seine walk to the Eiffel Tower at sunset", 0]],
      [["Louvre", 22], ["Falafel lunch in Le Marais", 8], ["Montmartre and Sacré-Cœur at dusk", 0]],
      [["Canal Saint-Martin", 0], ["Père Lachaise cemetery", 0], ["Bars in Belleville", 12]]
    ],
    extraDay: "Take the RER to Versailles; the gardens are free most days.",
    tips: [
      "Under 26 and living in the EU on a long-stay visa? Most national museums, including the Louvre and Orsay, are free.",
      "Bakery lunch: a sandwich plus a pastry is often under €8."
    ]
  },
  {
    id: "london", name: "London", country: "UK", lat: 51.51, lon: -0.13,
    costs: { hostel: 38, food: 38, transit: 10, activities: 12 },
    interests: ["history", "art", "nightlife", "food"],
    season:    [3, 3, 3, 4, 5, 5, 4, 4, 4, 4, 3, 4],
    priceMult: [0.8, 0.85, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.1, 1.0, 0.9, 1.1],
    bestTime: "May–June for long days and parks. January–February is cheapest, and the big museums are free year-round.",
    itinerary: [
      [["British Museum (free)", 0], ["Covent Garden and Soho", 0], ["West End rush or lottery theater tickets", 25]],
      [["South Bank walk and Tate Modern (free)", 0], ["Lunch at Borough Market", 12], ["Pub in Southwark", 10]],
      [["Camden Market", 10], ["Regent's Park and the Primrose Hill view", 0], ["Shoreditch street art and Brick Lane curry", 12]]
    ],
    extraDay: "Take a coach to Oxford or a train to Brighton.",
    tips: [
      "Tap in with a contactless card; daily fare caps apply automatically.",
      "Most major museums are free (donations welcome)."
    ]
  },
  {
    id: "amsterdam", name: "Amsterdam", country: "Netherlands", lat: 52.37, lon: 4.90,
    costs: { hostel: 45, food: 35, transit: 8, activities: 18 },
    interests: ["art", "nightlife", "outdoors", "history"],
    season:    [2, 2, 3, 5, 5, 4, 4, 4, 4, 3, 2, 3],
    priceMult: [0.8, 0.8, 0.9, 1.3, 1.2, 1.2, 1.2, 1.2, 1.1, 1.0, 0.8, 1.0],
    bestTime: "Mid-April tulip season and King's Day (27 April) are the best experience, at the highest prices. September is a good-value compromise.",
    itinerary: [
      [["Canal Ring and Jordaan walk", 0], ["Albert Cuyp market", 10], ["Vondelpark, then a brown café", 8]],
      [["Rijksmuseum", 25], ["Rent a bike for the afternoon", 15], ["Dinner and bars in De Pijp", 15]],
      [["Free ferry to NDSM wharf", 0], ["Anne Frank House", 16], ["Leidseplein nightlife", 12]]
    ],
    extraDay: "Take a day trip to Haarlem or the Zaanse Schans windmills.",
    tips: [
      "Anne Frank House tickets sell out; they're released online about 6 weeks ahead.",
      "The ferries behind Centraal station are free."
    ]
  },
  {
    id: "berlin", name: "Berlin", country: "Germany", lat: 52.52, lon: 13.40,
    costs: { hostel: 28, food: 25, transit: 9, activities: 12 },
    interests: ["nightlife", "history", "art"],
    season:    [2, 2, 3, 4, 5, 5, 5, 5, 4, 3, 2, 3],
    priceMult: [0.8, 0.8, 0.9, 1.0, 1.1, 1.1, 1.1, 1.1, 1.0, 0.9, 0.8, 1.0],
    bestTime: "May–September for open-air bars, lakes and festivals. December for Christmas markets.",
    itinerary: [
      [["Brandenburg Gate, Reichstag dome and Holocaust Memorial", 0], ["Walk Museum Island", 0], ["Döner and bars in Kreuzberg", 12]],
      [["East Side Gallery", 0], ["Picnic on Tempelhofer Feld", 5], ["Rooftop at Klunkerkranich, Neukölln", 5]],
      [["Mauerpark flea market (Sun)", 5], ["Topography of Terror (free)", 0], ["Club night", 18]]
    ],
    extraDay: "Visit Potsdam's palaces, or spend a lake day at Wannsee.",
    tips: [
      "Book the free Reichstag dome visit online a few days ahead.",
      "A 24-hour AB ticket beats buying single rides."
    ]
  },
  {
    id: "prague", name: "Prague", country: "Czechia", lat: 50.08, lon: 14.44,
    costs: { hostel: 20, food: 20, transit: 5, activities: 10 },
    interests: ["history", "architecture", "nightlife"],
    season:    [2, 2, 3, 4, 5, 4, 3, 3, 5, 4, 3, 4],
    priceMult: [0.7, 0.7, 0.8, 1.0, 1.2, 1.2, 1.3, 1.3, 1.1, 1.0, 0.8, 1.2],
    bestTime: "May and September. December markets are magical but crowded. January–February is very cheap.",
    itinerary: [
      [["Old Town Square and the Astronomical Clock", 0], ["Cross Charles Bridge to Malá Strana", 0], ["Czech pub dinner", 12]],
      [["Prague Castle grounds", 0], ["Petřín Hill and gardens", 0], ["Sunset at the Letná beer garden", 6]],
      [["Vyšehrad fortress", 0], ["Jewish Quarter", 18], ["Bars in Žižkov", 10]]
    ],
    extraDay: "Take a day trip to Kutná Hora and its bone church.",
    tips: [
      "Avoid exchange booths near Old Town; pay by card or use a bank ATM.",
      "Weekday lunch menus (polední menu) cost €6–9."
    ]
  },
  {
    id: "vienna", name: "Vienna", country: "Austria", lat: 48.21, lon: 16.37,
    costs: { hostel: 28, food: 28, transit: 6, activities: 14 },
    interests: ["art", "history", "architecture", "food"],
    season:    [2, 2, 3, 4, 5, 4, 4, 4, 5, 4, 3, 5],
    priceMult: [0.8, 0.8, 0.9, 1.0, 1.1, 1.1, 1.1, 1.1, 1.0, 1.0, 0.9, 1.2],
    bestTime: "May and September. December is the best month for Christmas markets, with prices to match.",
    itinerary: [
      [["Stephansdom and the old town", 0], ["Lunch at Naschmarkt", 12], ["Standing-room opera ticket", 15]],
      [["Schönbrunn gardens", 0], ["MuseumsQuartier courtyard", 0], ["Heuriger wine tavern", 15]],
      [["Belvedere to see Klimt's The Kiss", 16], ["Prater park", 0], ["Bars along the Danube Canal", 10]]
    ],
    extraDay: "Bratislava is an hour away by train, making it an easy second country.",
    tips: [
      "Standing-room opera tickets go on sale shortly before each performance.",
      "Vienna's tap water is excellent; skip bottled water."
    ]
  },
  {
    id: "budapest", name: "Budapest", country: "Hungary", lat: 47.50, lon: 19.04,
    costs: { hostel: 18, food: 20, transit: 5, activities: 12 },
    interests: ["nightlife", "history", "architecture", "outdoors"],
    season:    [2, 2, 3, 4, 5, 4, 4, 4, 5, 4, 3, 4],
    priceMult: [0.7, 0.7, 0.8, 1.0, 1.1, 1.2, 1.2, 1.3, 1.1, 0.9, 0.8, 1.0],
    bestTime: "May and September. The thermal baths make winter surprisingly good, and the Sziget festival (August) pushes prices up.",
    itinerary: [
      [["Parliament and the Danube promenade", 0], ["Lunch at Great Market Hall", 10], ["Ruin bars (Szimpla Kert)", 10]],
      [["Széchenyi thermal baths", 30], ["City Park and Vajdahunyad Castle", 0], ["Night view from Fisherman's Bastion", 0]],
      [["Buda Castle district", 0], ["Hike up Gellért Hill", 0], ["Budget dinner and a river walk", 12]]
    ],
    extraDay: "Take the suburban train to Szentendre, or go to Lake Balaton in summer.",
    tips: [
      "Pay in forints, not euros; euro prices are usually worse.",
      "Go to the baths on a weekday morning for smaller crowds."
    ]
  },
  {
    id: "krakow", name: "Kraków", country: "Poland", lat: 50.06, lon: 19.94,
    costs: { hostel: 15, food: 16, transit: 3, activities: 10 },
    interests: ["history", "food", "nightlife"],
    season:    [2, 2, 3, 4, 5, 4, 4, 4, 5, 4, 2, 4],
    priceMult: [0.7, 0.7, 0.8, 1.0, 1.1, 1.2, 1.2, 1.2, 1.0, 0.9, 0.8, 1.0],
    bestTime: "May–June and September. One of Europe's cheapest weekends year-round.",
    itinerary: [
      [["Main Market Square and Cloth Hall", 0], ["Wawel Castle hill", 0], ["Pierogi dinner at a milk bar", 6]],
      [["Kazimierz Jewish Quarter", 0], ["Zapiekanka at Plac Nowy", 3], ["Bars in Kazimierz", 10]],
      [["Auschwitz-Birkenau Memorial (book ahead)", 14], ["Return to the city and rest", 0], ["Riverside bars on the Vistula", 8]]
    ],
    extraDay: "Visit the Wieliczka Salt Mine just outside the city.",
    tips: [
      "Milk bars (bar mleczny) serve full meals for €4–6.",
      "Free entry slots at Auschwitz go fast; book online well ahead."
    ]
  },
  {
    id: "rome", name: "Rome", country: "Italy", lat: 41.90, lon: 12.50,
    costs: { hostel: 32, food: 28, transit: 6, activities: 16 },
    interests: ["history", "art", "food", "architecture"],
    season:    [3, 3, 4, 5, 4, 3, 2, 2, 4, 5, 4, 3],
    priceMult: [0.8, 0.8, 0.9, 1.2, 1.2, 1.2, 1.1, 1.0, 1.1, 1.1, 0.8, 1.0],
    bestTime: "October and late April. Easter week and summer bring crowds and heat, while November–February is cheap and quiet.",
    itinerary: [
      [["Colosseum and Roman Forum", 18], ["Lunch in Monti", 12], ["Trevi Fountain and Piazza Navona at night", 0]],
      [["Vatican Museums", 20], ["St. Peter's Basilica (free)", 0], ["Dinner and drinks in Trastevere", 15]],
      [["Villa Borghese and the Pincio terrace", 0], ["Campo de' Fiori market", 5], ["Aperitivo in Testaccio", 12]]
    ],
    extraDay: "Take a day trip to Ostia Antica's ruins or Tivoli's villas.",
    tips: [
      "The Colosseum is free on the first Sunday of each month; expect crowds.",
      "Refill your bottle at the free 'nasoni' water fountains."
    ]
  },
  {
    id: "florence", name: "Florence", country: "Italy", lat: 43.77, lon: 11.26,
    costs: { hostel: 32, food: 28, transit: 3, activities: 16 },
    interests: ["art", "architecture", "food", "history"],
    season:    [3, 3, 4, 5, 5, 3, 2, 2, 4, 5, 3, 3],
    priceMult: [0.8, 0.8, 0.9, 1.1, 1.2, 1.3, 1.3, 1.2, 1.2, 1.1, 0.8, 0.9],
    bestTime: "April–May and October. State museums are free on the first Sunday of each month.",
    itinerary: [
      [["Duomo and Piazza della Signoria", 0], ["Lunch at Mercato Centrale", 10], ["Sunset at Piazzale Michelangelo", 0]],
      [["Uffizi Gallery", 25], ["Ponte Vecchio and the Oltrarno", 0], ["Aperitivo in Santo Spirito", 10]],
      [["Accademia to see David", 16], ["San Miniato al Monte", 0], ["Schiacciata sandwich and a wine bar", 10]]
    ],
    extraDay: "Take a day trip to Siena, or to Pisa and Lucca.",
    tips: [
      "The Uffizi and Accademia are free on the first Sunday of each month.",
      "Book museum tickets online to skip long lines."
    ]
  },
  {
    id: "athens", name: "Athens", country: "Greece", lat: 37.98, lon: 23.73,
    costs: { hostel: 22, food: 22, transit: 5, activities: 14 },
    interests: ["history", "food", "outdoors", "beach"],
    season:    [3, 3, 4, 5, 5, 4, 2, 2, 5, 5, 4, 3],
    priceMult: [0.8, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.1, 1.0, 0.8, 0.8],
    bestTime: "April–May and September–October. July–August heat is brutal around the Acropolis.",
    itinerary: [
      [["Acropolis", 30], ["Lunch in Plaka", 12], ["Sunset on Areopagus Hill", 0]],
      [["Ancient Agora", 10], ["Monastiraki flea market and souvlaki", 5], ["Rooftop bars in Psyrri", 10]],
      [["Hike Lycabettus Hill", 0], ["National Archaeological Museum", 12], ["Taverna dinner in Koukaki", 14]]
    ],
    extraDay: "Take a ferry to Aegina island, or catch the sunset at Cape Sounion.",
    tips: [
      "EU students under 25 get free entry to many archaeological sites; bring your student ID.",
      "A souvlaki pita costs €3–4 and makes a cheap meal."
    ]
  }
];
