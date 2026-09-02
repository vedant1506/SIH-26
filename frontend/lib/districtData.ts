// ============================================================================
// State, District & Place Master Geospatial Knowledge Engine (April 2026 Dataset)
// High-Precision Geocoding across all 780+ Indian Districts & Interstate Corridors
// ============================================================================

export interface PlaceNode {
  place: string;
  district: string;
  coords: [number, number];
  keywords?: string[];
}

export interface InterstateNode {
  keywords: string[];
  state: string;
  district: string;
  place: string;
  coords: [number, number];
}

export interface DistrictSummary {
  district: string;
  state: string;
  projectCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCostCr: number;
  avgProgress: number;
  coords: [number, number];
  places: string[];
}

export const INTERSTATE_CORRIDORS: InterstateNode[] = [
  {
    "keywords": [
      "FAGNE",
      "MAHARASHTRA/GUJARAT BORDER",
      "GUJARAT/MAHARASHTRA",
      "NAVAPUR",
      "SONGADH",
      "SURAT-DHULE",
      "NH-53"
    ],
    "state": "Multi-States (Gujarat, Maharashtra)",
    "district": "Dhule / Nandurbar / Tapi Border",
    "place": "Fagne - Navapur - Songadh NH-53 Corridor",
    "coords": [
      21.05,
      74.2
    ]
  },
  {
    "keywords": [
      "VADODARA MUMBAI",
      "MUMBAI-AHMEDABAD",
      "TALSARI",
      "KARVAD",
      "JUJUWA",
      "PALGHAR BORDER"
    ],
    "state": "Multi-States (Gujarat, Maharashtra)",
    "district": "Valsad / Palghar Border",
    "place": "Vadodara-Mumbai Expressway Border Node",
    "coords": [
      20.3,
      72.95
    ]
  },
  {
    "keywords": [
      "BELGAUM",
      "SANKESHWAR",
      "MH-KNT BORDER",
      "MH/KN BORDER",
      "KAGAL BORDER"
    ],
    "state": "Multi-States (Karnataka, Maharashtra)",
    "district": "Kolhapur / Belagavi Border",
    "place": "Belagavi - Kolhapur NH-48 Border Corridor",
    "coords": [
      16.25,
      74.45
    ]
  },
  {
    "keywords": [
      "AKKALKOT",
      "SOLAPUR KN",
      "AKKALKOT MH/KN",
      "NH-150C"
    ],
    "state": "Multi-States (Karnataka, Maharashtra)",
    "district": "Solapur / Kalaburagi Border",
    "place": "Akkalkot - Kalaburagi NH-150C Corridor",
    "coords": [
      17.48,
      76.22
    ]
  },
  {
    "keywords": [
      "BELAGONDAPALLI",
      "TN/KNT",
      "STRR",
      "HOSUR TO DHAMRAPURI",
      "NERALURU",
      "THORAPALLI"
    ],
    "state": "Multi-States (Karnataka, Tamil Nadu)",
    "district": "Bengaluru Urban / Krishnagiri Border",
    "place": "Bengaluru - Hosur Interstate Highway Corridor",
    "coords": [
      12.74,
      77.82
    ]
  },
  {
    "keywords": [
      "THALAPADDY",
      "CHENGALA",
      "KT/KL BORDER"
    ],
    "state": "Multi-States (Karnataka, Kerala)",
    "district": "Dakshina Kannada / Kasaragod Border",
    "place": "Thalapaddy - Kasaragod NH-66 Corridor",
    "coords": [
      12.78,
      74.92
    ]
  },
  {
    "keywords": [
      "THALASSERY MAHE",
      "MAHE BYPASS",
      "MAHE"
    ],
    "state": "Multi-States (Kerala, Puducherry)",
    "district": "Kannur / Mahe Border",
    "place": "Thalassery - Mahe Coastal Bypass (NH-66)",
    "coords": [
      11.7,
      75.53
    ]
  },
  {
    "keywords": [
      "SAHARANPUR BYPASS",
      "DELHI- DEHRADUN",
      "DELHI-DEHRADUN",
      "GANESHPUR"
    ],
    "state": "Multi-States (Uttar Pradesh, Uttarakhand)",
    "district": "Saharanpur / Dehradun Border",
    "place": "Delhi - Dehradun Economic Expressway Corridor",
    "coords": [
      30.15,
      77.85
    ]
  },
  {
    "keywords": [
      "PILIBHIT - SITARGANJ",
      "SITARGANJ"
    ],
    "state": "Multi-States (Uttar Pradesh, Uttarakhand)",
    "district": "Pilibhit / Udham Singh Nagar Border",
    "place": "Pilibhit - Sitarganj NH-30 Corridor",
    "coords": [
      28.85,
      79.75
    ]
  },
  {
    "keywords": [
      "RUDRAPUR BYPASS"
    ],
    "state": "Multi-States (Uttar Pradesh, Uttarakhand)",
    "district": "Rampur / Udham Singh Nagar Border",
    "place": "Rampur - Rudrapur Interstate Bypass",
    "coords": [
      28.98,
      79.4
    ]
  },
  {
    "keywords": [
      "KASHIPUR",
      "MORADABAD-THAKURDWARA"
    ],
    "state": "Multi-States (Uttar Pradesh, Uttarakhand)",
    "district": "Moradabad / Udham Singh Nagar Border",
    "place": "Moradabad - Kashipur NH-734 Corridor",
    "coords": [
      29.15,
      78.95
    ]
  },
  {
    "keywords": [
      "HARIDWAR",
      "MUZAFFARNAGARHARIDWAR",
      "SPUR TO HARIDWAR",
      "HARIDWAR-NAGINA"
    ],
    "state": "Multi-States (Uttar Pradesh, Uttarakhand)",
    "district": "Muzaffarnagar / Haridwar Border",
    "place": "Haridwar - Roorkee Highway Link",
    "coords": [
      29.85,
      78.0
    ]
  },
  {
    "keywords": [
      "ALIGARH-PALWAL",
      "KURANA",
      "EASTERN PERIPHERAL"
    ],
    "state": "Multi-States (Haryana, Uttar Pradesh)",
    "district": "Palwal / Aligarh Border",
    "place": "Palwal - Aligarh NH-334D Corridor",
    "coords": [
      28.05,
      77.65
    ]
  },
  {
    "keywords": [
      "SHAMLI -AMBALA",
      "SHAMLI-AMBALA",
      "RANIPUR BARSI",
      "ADHOYA"
    ],
    "state": "Multi-States (Haryana, Uttar Pradesh)",
    "district": "Shamli / Ambala Border",
    "place": "Shamli - Ambala Greenfield Expressway",
    "coords": [
      29.8,
      77.2
    ]
  },
  {
    "keywords": [
      "JEWAR INTERNATIONAL AIRPORT",
      "JEWAR AIRPORT",
      "BALLABHGARH BYPASS",
      "DND- FARIDABAD"
    ],
    "state": "Multi-States (Haryana, Uttar Pradesh)",
    "district": "Faridabad / Gautam Buddha Nagar Border",
    "place": "Faridabad - Jewar Airport Expressway Spur",
    "coords": [
      28.25,
      77.45
    ]
  },
  {
    "keywords": [
      "DELHI-AMRITSAR-KATRA",
      "PATHANKOT- GURDASPUR",
      "HIRANAGAR",
      "GURHA BAILDARAN"
    ],
    "state": "Multi-States (Jammu and Kashmir, Punjab)",
    "district": "Pathankot / Kathua Border",
    "place": "Pathankot - Kathua - Hiranagar Expressway",
    "coords": [
      32.35,
      75.5
    ]
  },
  {
    "keywords": [
      "KHAJURI",
      "WYNDHAMGANJ",
      "NH-75"
    ],
    "state": "Multi-States (Jharkhand, Uttar Pradesh)",
    "district": "Sonbhadra / Garhwa Border",
    "place": "Sonbhadra - Garhwa NH-75 Border Corridor",
    "coords": [
      24.25,
      83.42
    ]
  },
  {
    "keywords": [
      "BARWA ADDA",
      "PANAGARH",
      "BARWA ADDA KM"
    ],
    "state": "Multi-States (Jharkhand, West Bengal)",
    "district": "Dhanbad / Paschim Bardhaman Border",
    "place": "Dhanbad - Asansol - Panagarh NH-19 Corridor",
    "coords": [
      23.75,
      86.85
    ]
  },
  {
    "keywords": [
      "VARANASI- RANCHI- KOLKATA",
      "VARANASI - RANCHI - KOLKATA",
      "LEPO",
      "KAMLAPUR",
      "JH/WB BORDER"
    ],
    "state": "Multi-States (Jharkhand, West Bengal)",
    "district": "Bokaro / Purulia Border",
    "place": "Varanasi - Ranchi - Kolkata Expressway Border",
    "coords": [
      23.45,
      86.05
    ]
  },
  {
    "keywords": [
      "PURULIA",
      "CHANDIL",
      "JH / WB BORDER",
      "OLD NH-32"
    ],
    "state": "Multi-States (Jharkhand, West Bengal)",
    "district": "Seraikela / Purulia Border",
    "place": "Chandil - Purulia Interstate Highway",
    "coords": [
      23.1,
      86.15
    ]
  },
  {
    "keywords": [
      "MIRZA CHAUKI",
      "FARAKKA",
      "NH-80"
    ],
    "state": "Multi-States (Jharkhand, West Bengal)",
    "district": "Sahibganj / Murshidabad Border",
    "place": "Mirza Chauki - Farakka Ganga Corridor",
    "coords": [
      24.8,
      87.9
    ]
  },
  {
    "keywords": [
      "GOVINDPUR",
      "CHAS",
      "WB BORDER"
    ],
    "state": "Multi-States (Jharkhand, West Bengal)",
    "district": "Dhanbad / Bokaro / Purulia Border",
    "place": "Govindpur - Chas - Purulia Corridor",
    "coords": [
      23.65,
      86.2
    ]
  },
  {
    "keywords": [
      "MANGLOOR",
      "RAJURA",
      "KORPANA",
      "ADILABAD",
      "BAMNI",
      "WARUR",
      "DEVADA"
    ],
    "state": "Multi-States (Maharashtra, Telangana)",
    "district": "Chandrapur / Adilabad Border",
    "place": "Chandrapur - Adilabad Inter-State Highway",
    "coords": [
      19.75,
      79.15
    ]
  },
  {
    "keywords": [
      "SHAHPUR TO MUKTAINAGAR",
      "MUKTAINAGAR",
      "BOREGAON BUZURG"
    ],
    "state": "Multi-States (Madhya Pradesh, Maharashtra)",
    "district": "Burhanpur / Jalgaon Border",
    "place": "Burhanpur - Muktainagar NH-753L Corridor",
    "coords": [
      21.15,
      76.05
    ]
  },
  {
    "keywords": [
      "KEN-BETWA",
      "KEN BETWA",
      "DAUDHAN"
    ],
    "state": "Multi-States (Madhya Pradesh, Uttar Pradesh)",
    "district": "Chhatarpur / Banda Border",
    "place": "Ken-Betwa River Linkage Complex",
    "coords": [
      24.65,
      79.85
    ]
  },
  {
    "keywords": [
      "LALITPUR-SAGAR",
      "LALITPUR",
      "SAGAR- LAKHNADON"
    ],
    "state": "Multi-States (Madhya Pradesh, Uttar Pradesh)",
    "district": "Lalitpur / Sagar Border",
    "place": "Lalitpur - Sagar NH-44 North-South Corridor",
    "coords": [
      24.3,
      78.6
    ]
  },
  {
    "keywords": [
      "CHOWKA",
      "KAIMAHA",
      "MP/UP BORDER",
      "CHHATARPUR BYPASS"
    ],
    "state": "Multi-States (Madhya Pradesh, Uttar Pradesh)",
    "district": "Chhatarpur / Mahoba Border",
    "place": "Chhatarpur - Mahoba NH-34 Corridor",
    "coords": [
      25.1,
      79.7
    ]
  },
  {
    "keywords": [
      "NORTH KOEL",
      "KUTKU DAM",
      "MOHAMMADGANJ"
    ],
    "state": "Multi-States (Bihar, Jharkhand)",
    "district": "Palamu / Aurangabad Border",
    "place": "North Koel Multi-Purpose Reservoir System",
    "coords": [
      24.1,
      84.05
    ]
  },
  {
    "keywords": [
      "VILUPPURAM",
      "PUDUCHERRY KM",
      "POONDIYANKUPPAM",
      "SATTANATHAPURAM",
      "NAGAPATTINAM"
    ],
    "state": "Multi-States (Puducherry, Tamil Nadu)",
    "district": "Viluppuram / Puducherry / Cuddalore Border",
    "place": "Viluppuram - Puducherry - Nagapattinam Coastal Corridor",
    "coords": [
      11.9,
      79.78
    ]
  }
];

export const STATE_GEO_KNOWLEDGE: Record<string, PlaceNode[]> = {
  "GUJARAT": [
    {
      "place": "Naliya & Jakhau Port Rail Corridor",
      "district": "Kutch",
      "coords": [
        23.25,
        68.83
      ],
      "keywords": [
        "NALIYA",
        "JAKHAU",
        "NALIYA TO JAKHAU",
        "ABDASA",
        "VAYOR",
        "DESALPAR",
        "HAJIPIR",
        "LUNA",
        "LAKHPAT"
      ]
    },
    {
      "place": "Kandla Port & Tuna-Tekra",
      "district": "Kutch",
      "coords": [
        23.01,
        70.22
      ],
      "keywords": [
        "KANDLA",
        "DEENDAYAL PORT",
        "TUNA-TEKRA",
        "TUNA TEKRA",
        "OIL JETTY",
        "GANDHIDHAM",
        "ANJAR",
        "BHIMASAR"
      ]
    },
    {
      "place": "Mundra Mega Port & SEZ",
      "district": "Kutch",
      "coords": [
        22.84,
        69.7
      ],
      "keywords": [
        "MUNDRA",
        "PORT MUNDRA",
        "ADANI MUNDRA",
        "MUNDRA SEZ"
      ]
    },
    {
      "place": "Khavda 30 GW Renewable Hybrid Park",
      "district": "Kutch",
      "coords": [
        23.85,
        69.75
      ],
      "keywords": [
        "KHAVDA",
        "KUTCH HYBRID",
        "BHUJ",
        "SAMAKHIALI GANDHIDHAM",
        "SAMAKHIYALI",
        "KUTCH"
      ]
    },
    {
      "place": "Santalpur NH-27 Corridor",
      "district": "Patan",
      "coords": [
        23.8347,
        71.3094
      ],
      "keywords": [
        "SANTALPUR",
        "RADHANPUR",
        "SAMAKHIYALI TO SANTALPUR",
        "SANCHORE - SANTALPUR",
        "SANCHORE-SANTALPUR"
      ]
    },
    {
      "place": "Patan City & Rajpur",
      "district": "Patan",
      "coords": [
        23.85,
        72.125
      ],
      "keywords": [
        "PATAN NEAR RAJPUR",
        "PATAN TO GOJARIYA",
        "PATAN"
      ]
    },
    {
      "place": "Mehsana, Vadnagar & Kheralu",
      "district": "Mehsana",
      "coords": [
        23.588,
        72.3693
      ],
      "keywords": [
        "MEHSANA",
        "GOJARIYA",
        "KADI",
        "UNJHA",
        "VISNAGAR",
        "VADNAGAR",
        "KHERALU",
        "BECHRAJI",
        "BECHARAJI",
        "MARUTI",
        "DHAROI",
        "SATLASANA"
      ]
    },
    {
      "place": "Dholera Smart City & Expressway",
      "district": "Ahmedabad",
      "coords": [
        22.25,
        72.19
      ],
      "keywords": [
        "DHOLERA",
        "SIR DHOLERA",
        "DHOLERA AIRPORT",
        "DHOLERA EXPRESSWAY",
        "DSIR",
        "ADHELAI",
        "SINDHREJ",
        "VEJALLKA"
      ]
    },
    {
      "place": "Lothal Maritime Heritage Complex (NMHC)",
      "district": "Ahmedabad",
      "coords": [
        22.52,
        72.25
      ],
      "keywords": [
        "NMHC",
        "MARITIME HERITAGE",
        "LOTHAL",
        "DHOLKA"
      ]
    },
    {
      "place": "Sabarmati Bullet Train & Metro Hub",
      "district": "Ahmedabad",
      "coords": [
        23.08,
        72.58
      ],
      "keywords": [
        "SABARMATI",
        "AHMEDABAD",
        "SANAND",
        "VIRAMGAM",
        "BAWLA",
        "SARKHEJ",
        "NAROL",
        "GERATPUR",
        "BAREJADI",
        "NANDEJ",
        "ISCON"
      ]
    },
    {
      "place": "Hazira Petrochemical Terminal & Surat Metro",
      "district": "Surat",
      "coords": [
        21.1702,
        72.8311
      ],
      "keywords": [
        "SURAT",
        "HAZIRA",
        "SACHIN",
        "BARDOLI",
        "PALSANA",
        "OLPAD",
        "KIM",
        "KOSAMBA",
        "UMARPADA",
        "KRIBHCO"
      ]
    },
    {
      "place": "Koyali Refinery & Bullet Train Depot",
      "district": "Vadodara",
      "coords": [
        22.3072,
        73.1812
      ],
      "keywords": [
        "VADODARA",
        "BARODA",
        "KOYALI",
        "MANJUSAR",
        "SAVLI",
        "PADRA",
        "KARJAN",
        "MIYAGAM",
        "DABHOI",
        "SAMLAYA",
        "DODKA",
        "PRATAP NAGAR",
        "PRATAPNAGAR"
      ]
    },
    {
      "place": "Dahej PCPIR Petrochemical SEZ",
      "district": "Bharuch",
      "coords": [
        21.7051,
        72.9959
      ],
      "keywords": [
        "DAHEJ",
        "BHARUCH",
        "ANKLESHWAR",
        "PCPIR",
        "JAGHADIA",
        "VALIA",
        "JAMBUSAR",
        "SAMNI"
      ]
    },
    {
      "place": "Moti Khavdi & Sikka Petrochem Complex",
      "district": "Jamnagar",
      "coords": [
        22.4707,
        70.0577
      ],
      "keywords": [
        "JAMNAGAR",
        "MOTI KHAVDI",
        "SIKKA",
        "BEDI",
        "RELIANCE JAMNAGAR",
        "DIGVIJAYGRAM",
        "DHROL",
        "AMRAN",
        "PIPALIYA"
      ]
    },
    {
      "place": "Hirasar International Airport & AIIMS",
      "district": "Rajkot",
      "coords": [
        22.3039,
        70.8022
      ],
      "keywords": [
        "RAJKOT",
        "HIRASAR",
        "METODA",
        "SHAPAR",
        "GONDAL",
        "JETPUR",
        "DHORAJI",
        "JAMKANDORNA",
        "KANALUS"
      ]
    },
    {
      "place": "GIFT City & Mahatma Mandir",
      "district": "Gandhinagar",
      "coords": [
        23.2156,
        72.6369
      ],
      "keywords": [
        "GANDHINAGAR",
        "GIFT CITY",
        "KALOL",
        "MANSA",
        "KUDASAN",
        "CHILODA",
        "NARODA"
      ]
    },
    {
      "place": "Veraval Somnath Port & Kodinar",
      "district": "Gir Somnath",
      "coords": [
        20.9,
        70.37
      ],
      "keywords": [
        "GIR SOMNATH",
        "VERAVAL",
        "SOMNATH",
        "KODINAR",
        "UNA",
        "KAGVADAR"
      ]
    },
    {
      "place": "Bhavnagar Port, Talaja & Mahuva",
      "district": "Bhavnagar",
      "coords": [
        21.7645,
        72.1519
      ],
      "keywords": [
        "BHAVNAGAR",
        "ALANG",
        "TALAJA",
        "MAHUVA",
        "BADHADA",
        "PIPLI",
        "SIHOR"
      ]
    },
    {
      "place": "Palanpur & Ambaji Rail",
      "district": "Banaskantha",
      "coords": [
        24.172,
        72.4346
      ],
      "keywords": [
        "BANASKANTHA",
        "PALANPUR",
        "DISA",
        "DEESA",
        "DANTA",
        "AMBAJI",
        "THARAD",
        "BHILDI",
        "TARANGA"
      ]
    },
    {
      "place": "Himmatnagar & Idar Corridor",
      "district": "Sabarkantha",
      "coords": [
        23.6,
        72.95
      ],
      "keywords": [
        "SABARKANTHA",
        "HIMMATNAGAR",
        "IDAR",
        "VIJAYANAGAR",
        "KHOKHARA",
        "PRANTIJ"
      ]
    },
    {
      "place": "Modasa-Shamlaji DMIC Corridor",
      "district": "Aravalli",
      "coords": [
        23.46,
        73.3
      ],
      "keywords": [
        "ARAVALLI",
        "MODASA",
        "SHAMLAJI",
        "BHILODA",
        "MOTACHILODA"
      ]
    },
    {
      "place": "Nadiad, Petlad & Anand Dairy Hub",
      "district": "Anand",
      "coords": [
        22.5645,
        72.9289
      ],
      "keywords": [
        "ANAND",
        "KHEDA",
        "NADIAD",
        "PETLAD",
        "BHADRAN",
        "KHAMBHAT",
        "TARAPUR"
      ]
    },
    {
      "place": "Dwarka Pilgrimage & Okha Port",
      "district": "Devbhumi Dwarka",
      "coords": [
        22.2442,
        68.9685
      ],
      "keywords": [
        "DWARKA",
        "DEVBHUMI DWARKA",
        "KHAMBHALIA",
        "OKHA",
        "BEYT DWARKA",
        "MITHAPUR",
        "DEVARIYA"
      ]
    },
    {
      "place": "Dahod 9000 HP Locomotive Complex",
      "district": "Dahod",
      "coords": [
        22.83,
        74.26
      ],
      "keywords": [
        "DAHOD",
        "JHALOD",
        "LOCOMOTIVE",
        "ELECTRIC LOCOMOTIVES"
      ]
    },
    {
      "place": "Chhota Udaipur & Bodeli",
      "district": "Chhota Udaipur",
      "coords": [
        22.31,
        74.01
      ],
      "keywords": [
        "CHHOTA UDAIPUR",
        "CHHOTA UDEPUR",
        "JABUGAM",
        "DHAMASIYA",
        "BODELI"
      ]
    },
    {
      "place": "Vapi-Valsad & Daman Border",
      "district": "Valsad",
      "coords": [
        20.61,
        72.93
      ],
      "keywords": [
        "VALSAD",
        "VAPI",
        "SARIGAM",
        "UMBERGAON",
        "KARVAD",
        "JUJUWA",
        "TALSARI"
      ]
    },
    {
      "place": "Navsari & Bilimora",
      "district": "Navsari",
      "coords": [
        20.95,
        72.93
      ],
      "keywords": [
        "NAVSARI",
        "BILIMORA",
        "GANDEVA",
        "ENA"
      ]
    },
    {
      "place": "Sardar Sarovar Project & Statue of Unity",
      "district": "Narmada",
      "coords": [
        21.87,
        73.72
      ],
      "keywords": [
        "SARDAR SAROVAR",
        "CADWM",
        "NARMADA",
        "KEVADIA",
        "EKTA NAGAR",
        "RAJPIPLA"
      ]
    },
    {
      "place": "Godhra & Halol Industrial Zone",
      "district": "Panchmahal",
      "coords": [
        22.7756,
        73.6149
      ],
      "keywords": [
        "PANCHMAHAL",
        "GODHRA",
        "HALOL",
        "TIMBA ROAD"
      ]
    },
    {
      "place": "Morbi Ceramic SEZ & Highway",
      "district": "Morbi",
      "coords": [
        22.812,
        70.8378
      ],
      "keywords": [
        "MORBI",
        "WANKANER",
        "MALIYA",
        "HALVAD"
      ]
    }
  ],
  "SIKKIM": [
    {
      "place": "Pakyong Greenfield Airport & Slope Stabilization",
      "district": "Pakyong",
      "coords": [
        27.234,
        88.5878
      ],
      "keywords": [
        "PAKYONG",
        "RHENOCK",
        "MENLA",
        "RONGLI",
        "CHOCHENPHERI",
        "ROLEP",
        "NH-717"
      ]
    },
    {
      "place": "Gangtok Smart City, GMC & NIT Khamdong",
      "district": "Gangtok (East Sikkim)",
      "coords": [
        27.3389,
        88.6065
      ],
      "keywords": [
        "GANGTOK",
        "EAST SIKKIM",
        "RANIPOOL",
        "BURTUK",
        "KHAMDONG",
        "TETELIA",
        "SIVOK-RANGPO"
      ]
    },
    {
      "place": "Yangang Sikkim University & Rangit Hydro",
      "district": "Namchi (South Sikkim)",
      "coords": [
        27.1667,
        88.35
      ],
      "keywords": [
        "NAMCHI",
        "SOUTH SIKKIM",
        "YANGANG",
        "RABANGLA",
        "RANGIT",
        "JPCL",
        "NAMCHI"
      ]
    },
    {
      "place": "Teesta-VI Hydroelectric Power Plant (500 MW)",
      "district": "Mangan (North Sikkim)",
      "coords": [
        27.5,
        88.53
      ],
      "keywords": [
        "MANGAN",
        "NORTH SIKKIM",
        "TEESTA",
        "CHUNGTHANG",
        "LACHEN",
        "LACHUNG"
      ]
    },
    {
      "place": "Gyalshing Pelling Tourism Node",
      "district": "Gyalshing (West Sikkim)",
      "coords": [
        27.2833,
        88.25
      ],
      "keywords": [
        "GYALSHING",
        "GEYZING",
        "WEST SIKKIM",
        "PELLING",
        "DENTAM"
      ]
    },
    {
      "place": "Soreng Smart Sub-Division",
      "district": "Soreng",
      "coords": [
        27.17,
        88.21
      ],
      "keywords": [
        "SORENG",
        "CHAKBUNG",
        "ROTHAK"
      ]
    }
  ],
  "MAHARASHTRA": [
    {
      "place": "Bandra-Kurla Complex (BKC) & Metro",
      "district": "Mumbai Suburban",
      "coords": [
        19.0657,
        72.8687
      ],
      "keywords": [
        "BKC",
        "BANDRA",
        "KURLA",
        "ANDHERI",
        "BORIVALI",
        "GHATKOPAR",
        "SANTA CRUZ",
        "MUMBAI CENTRAL VIRAR"
      ]
    },
    {
      "place": "Mumbai Coastal Road & Port",
      "district": "Mumbai City",
      "coords": [
        18.9388,
        72.8354
      ],
      "keywords": [
        "MUMBAI",
        "COASTAL ROAD",
        "SEWRI",
        "WORLI",
        "COLABA",
        "CHURCHGATE",
        "CSMT",
        "MTRL"
      ]
    },
    {
      "place": "Navi Mumbai International Airport & JNPT",
      "district": "Raigad",
      "coords": [
        18.99,
        73.07
      ],
      "keywords": [
        "NAVI MUMBAI",
        "NMIAL",
        "JNPT",
        "NHAVA SHEVA",
        "PANVEL",
        "ROHA",
        "ALIBAG",
        "TALOJA",
        "RAIGAD"
      ]
    },
    {
      "place": "Thane-Kalyan-Bhiwandi Logistics Hub",
      "district": "Thane",
      "coords": [
        19.2183,
        72.9781
      ],
      "keywords": [
        "THANE",
        "KALYAN",
        "BHIWANDI",
        "DOMBIVLI",
        "MUMBRA",
        "KASARA",
        "DIVA",
        "TITWALA"
      ]
    },
    {
      "place": "Hinjawadi IT & Ring Road",
      "district": "Pune",
      "coords": [
        18.5204,
        73.8567
      ],
      "keywords": [
        "PUNE",
        "HINJAWADI",
        "HADAPSAR",
        "TALEGAON",
        "CHAKAN",
        "SHIVAJINAGAR",
        "PIMPRI",
        "CHINCHWAD"
      ]
    },
    {
      "place": "MIHAN Multi-Modal Cargo Hub",
      "district": "Nagpur",
      "coords": [
        21.1458,
        79.0882
      ],
      "keywords": [
        "NAGPUR",
        "MIHAN",
        "BUTIBORI",
        "KAMPTEE",
        "RAMTEK",
        "KALMESHWAR"
      ]
    },
    {
      "place": "Ambad & Sinnar Industrial SEZ",
      "district": "Nashik",
      "coords": [
        19.9975,
        73.7898
      ],
      "keywords": [
        "NASHIK",
        "SINNAR",
        "AMBAD",
        "SATPUR",
        "MALEGAON",
        "IGATPURI",
        "OZAR"
      ]
    },
    {
      "place": "Shendra-Bidkin DMIC Node",
      "district": "Chhatrapati Sambhajinagar",
      "coords": [
        19.8762,
        75.3433
      ],
      "keywords": [
        "SAMBHAJINAGAR",
        "AURANGABAD",
        "SHENDRA",
        "BIDKIN",
        "WALUJ",
        "CHIKALTHANA"
      ]
    },
    {
      "place": "Solapur NTPC & Highway",
      "district": "Solapur",
      "coords": [
        17.6599,
        75.9064
      ],
      "keywords": [
        "SOLAPUR",
        "PANDHARPUR",
        "AKKALKOT",
        "BARSHI",
        "MOHOL"
      ]
    },
    {
      "place": "Helwak-Patan-Karad Corridor",
      "district": "Satara",
      "coords": [
        17.37,
        73.9
      ],
      "keywords": [
        "SATARA",
        "PATAN-KARAD",
        "HELWAK-PATAN",
        "KARAD",
        "MAHABALESHWAR",
        "WAI",
        "KHANDALA"
      ]
    },
    {
      "place": "Kolhapur Textile & Auto Node",
      "district": "Kolhapur",
      "coords": [
        16.705,
        74.2433
      ],
      "keywords": [
        "KOLHAPUR",
        "ICHALKARANJI",
        "KAGAL",
        "SHIROL",
        "GOKUL SHIRGAON"
      ]
    },
    {
      "place": "Chandrapur Super Thermal & Coal",
      "district": "Chandrapur",
      "coords": [
        19.9615,
        79.2961
      ],
      "keywords": [
        "CHANDRAPUR",
        "BALLARPUR",
        "WARORA",
        "TADOBA",
        "WCL"
      ]
    },
    {
      "place": "Dhule-Nardana DMIC Corridor",
      "district": "Dhule",
      "coords": [
        20.9,
        74.77
      ],
      "keywords": [
        "DHULE",
        "FAGNE",
        "NARDANA",
        "SHIRPUR"
      ]
    }
  ],
  "UTTAR PRADESH": [
    {
      "place": "Jewar Noida International Airport & YEIDA",
      "district": "Gautam Buddha Nagar",
      "coords": [
        28.18,
        77.58
      ],
      "keywords": [
        "JEWAR",
        "NOIDA",
        "GREATER NOIDA",
        "YAMUNA EXPRESSWAY",
        "DADRI",
        "YEIDA"
      ]
    },
    {
      "place": "Amausi Airport & Shaheed Path",
      "district": "Lucknow",
      "coords": [
        26.8467,
        80.9462
      ],
      "keywords": [
        "LUCKNOW",
        "AMAUSI",
        "SHAHEED PATH",
        "GOMTI",
        "CHARBAGH"
      ]
    },
    {
      "place": "Varanasi Ring Road & Inland Port",
      "district": "Varanasi",
      "coords": [
        25.3176,
        82.9739
      ],
      "keywords": [
        "VARANASI",
        "BANARAS",
        "KASHI",
        "BABATPUR",
        "SARNATH",
        "MUGHAL SARAI"
      ]
    },
    {
      "place": "Panki Power & Defence Corridor",
      "district": "Kanpur Nagar",
      "coords": [
        26.4499,
        80.3319
      ],
      "keywords": [
        "KANPUR",
        "PANKI",
        "CHAKERI",
        "KALYANPUR",
        "ROOMA"
      ]
    },
    {
      "place": "Naini Multi-Modal Industrial Hub",
      "district": "Prayagraj",
      "coords": [
        25.4358,
        81.8463
      ],
      "keywords": [
        "PRAYAGRAJ",
        "ALLAHABAD",
        "NAINI",
        "PHAPHAMAU",
        "BAMRAULI",
        "JHUSI"
      ]
    },
    {
      "place": "Agra Metro & Foundry Nagar",
      "district": "Agra",
      "coords": [
        27.1767,
        78.0081
      ],
      "keywords": [
        "AGRA",
        "FATEHABAD",
        "KHERIA",
        "TAJ EXPRESSWAY"
      ]
    },
    {
      "place": "GIDA & AIIMS Gorakhpur",
      "district": "Gorakhpur",
      "coords": [
        26.7606,
        83.3732
      ],
      "keywords": [
        "GORAKHPUR",
        "GIDA",
        "SAHJANWA",
        "BHITI",
        "KUSHMHI"
      ]
    },
    {
      "place": "Maharishi Valmiki Airport & Ayodhya Dham",
      "district": "Ayodhya",
      "coords": [
        26.7922,
        82.1998
      ],
      "keywords": [
        "AYODHYA",
        "FAIZABAD",
        "MAHARISHI VALMIKI",
        "SARYU"
      ]
    },
    {
      "place": "Delhi-Meerut RRTS RapidX Axis",
      "district": "Meerut",
      "coords": [
        28.9845,
        77.7064
      ],
      "keywords": [
        "MEERUT",
        "RRTS",
        "MODINAGAR",
        "PARTHAPUR"
      ]
    },
    {
      "place": "Bareilly Ring Road & Airbase",
      "district": "Bareilly",
      "coords": [
        28.367,
        79.4304
      ],
      "keywords": [
        "BAREILLY",
        "IZZATNAGAR",
        "CB GANJ",
        "CLUTTERBUCKGANJ"
      ]
    },
    {
      "place": "Jhansi Defence Industrial Corridor",
      "district": "Jhansi",
      "coords": [
        25.4484,
        78.5685
      ],
      "keywords": [
        "JHANSI",
        "BABINA",
        "BHEL JHANSI",
        "BUNDELKHAND"
      ]
    },
    {
      "place": "Singrauli UP / Anpara Thermal",
      "district": "Sonbhadra",
      "coords": [
        24.685,
        83.0678
      ],
      "keywords": [
        "SONBHADRA",
        "ANPARA",
        "OBRA",
        "RIHAND",
        "SHAKTI NAGAR"
      ]
    }
  ],
  "ANDHRA PRADESH": [
    {
      "place": "Kadapa Airport & Kopparthy EMC",
      "district": "YSR Kadapa",
      "coords": [
        14.51,
        78.7725
      ],
      "keywords": [
        "KADAPA",
        "YSR",
        "PULIVENDULA",
        "JAMMALAMADUGU",
        "KOPPARTHY"
      ]
    },
    {
      "place": "Vijayawada Airport & Multi-Modal Hub",
      "district": "NTR (Vijayawada)",
      "coords": [
        16.53,
        80.7968
      ],
      "keywords": [
        "VIJAYAWADA",
        "NTR",
        "GANNAVARAM",
        "IBRAHIMPATNAM",
        "GOLLAPUDI"
      ]
    },
    {
      "place": "Rajahmundry Airport & Godavari Bridge",
      "district": "East Godavari",
      "coords": [
        17.1104,
        81.8182
      ],
      "keywords": [
        "RAJAHMUNDRY",
        "EAST GODAVARI",
        "KOVVUR",
        "SAMALKOT"
      ]
    },
    {
      "place": "Visakhapatnam Port & Steel Plant",
      "district": "Visakhapatnam",
      "coords": [
        17.6868,
        83.2185
      ],
      "keywords": [
        "VISAKHAPATNAM",
        "VIZAG",
        "DUVVADA",
        "GAJUWAKA",
        "SIMHACHALAM",
        "RINL",
        "STEEL PLANT"
      ]
    },
    {
      "place": "Bhogapuram International Airport",
      "district": "Vizianagaram",
      "coords": [
        18.0,
        83.5
      ],
      "keywords": [
        "BHOGAPURAM",
        "VIZIANAGARAM",
        "BOBBILI",
        "SALUR"
      ]
    },
    {
      "place": "Amaravati Capital Expressway",
      "district": "Guntur",
      "coords": [
        16.51,
        80.51
      ],
      "keywords": [
        "GUNTUR",
        "AMARAVATI",
        "TENALI",
        "MANGALAGIRI",
        "TADEPALLE"
      ]
    },
    {
      "place": "Sri City Multi-Product SEZ",
      "district": "Tirupati",
      "coords": [
        13.53,
        80.02
      ],
      "keywords": [
        "TIRUPATI",
        "RENIGUNTA",
        "SRI CITY",
        "SRIKALAHASTI",
        "NAIDUPETA"
      ]
    },
    {
      "place": "Kurnool Ultra Mega Solar Hub",
      "district": "Kurnool",
      "coords": [
        15.8281,
        78.0373
      ],
      "keywords": [
        "KURNOOL",
        "ORVAKAL",
        "DHONE",
        "NANDYAL CORRIDOR"
      ]
    }
  ],
  "BIHAR": [
    {
      "place": "Bihta Civil Enclave Airport & Express",
      "district": "Patna",
      "coords": [
        25.5683,
        84.8778
      ],
      "keywords": [
        "BIHTA",
        "PATNA",
        "DANAPUR",
        "DIDARGANJ",
        "FATUHA",
        "PATLIPUTRA",
        "PHULWARI"
      ]
    },
    {
      "place": "Barauni Refinery & Fertilizer",
      "district": "Begusarai",
      "coords": [
        25.46,
        85.98
      ],
      "keywords": [
        "BARAUNI",
        "BEGUSARAI",
        "TEGHRA",
        "BAKHRI"
      ]
    },
    {
      "place": "Dobhi Industrial Node (AKIC)",
      "district": "Gaya",
      "coords": [
        24.7914,
        85.0002
      ],
      "keywords": [
        "DOBHI",
        "GAYA",
        "BODHGAYA",
        "SHERGATI",
        "MANPUR"
      ]
    },
    {
      "place": "Vikramshila 4-Lane Ganga Bridge",
      "district": "Bhagalpur",
      "coords": [
        25.2425,
        87.0139
      ],
      "keywords": [
        "BHAGALPUR",
        "VIKRAMSHILA",
        "KAHALGAON",
        "SULTANGANJ",
        "NTPC KAHALGAON"
      ]
    },
    {
      "place": "Kanti Power & 4-Lane Highway",
      "district": "Muzaffarpur",
      "coords": [
        26.1209,
        85.3647
      ],
      "keywords": [
        "MUZAFFARPUR",
        "KANTI",
        "MOTIPUR",
        "KUDHNI"
      ]
    },
    {
      "place": "Darbhanga Airport & AIIMS",
      "district": "Darbhanga",
      "coords": [
        26.1542,
        85.8918
      ],
      "keywords": [
        "DARBHANGA",
        "KABIR CHAK",
        "BAHERA",
        "BENIPUR"
      ]
    },
    {
      "place": "Hajipur Rail Zonal Headquarters",
      "district": "Vaishali",
      "coords": [
        25.6858,
        85.2146
      ],
      "keywords": [
        "HAJIPUR",
        "VAISHALI",
        "MAHNAR",
        "LALGANJ"
      ]
    },
    {
      "place": "Sasaram Dedicated Freight Corridor",
      "district": "Rohtas",
      "coords": [
        24.95,
        84.03
      ],
      "keywords": [
        "SASARAM",
        "ROHTAS",
        "DEHRI",
        "DALMIANAGAR"
      ]
    }
  ],
  "LADAKH": [
    {
      "place": "Zojila All-Weather Strategic Tunnel",
      "district": "Kargil",
      "coords": [
        34.28,
        75.52
      ],
      "keywords": [
        "ZOJILA",
        "KARGIL",
        "DRAS",
        "SANKOO",
        "PADUM",
        "ZANSKAR"
      ]
    },
    {
      "place": "Pang Solar 13 GW & Leh Airport",
      "district": "Leh",
      "coords": [
        34.1526,
        77.5771
      ],
      "keywords": [
        "LEH",
        "PANG",
        "NIMOO",
        "CHUSHUL",
        "NUBRA",
        "KHALTSI"
      ]
    }
  ],
  "RAJASTHAN": [
    {
      "place": "Bhadla 2245 MW Solar Park",
      "district": "Jodhpur",
      "coords": [
        27.53,
        71.91
      ],
      "keywords": [
        "BHADLA",
        "JODHPUR",
        "OSIAN",
        "PIPAR",
        "LUNI",
        "PHALODI"
      ]
    },
    {
      "place": "HPCL Rajasthan Refinery Pachpadra",
      "district": "Barmer",
      "coords": [
        25.92,
        72.24
      ],
      "keywords": [
        "PACHPADRA",
        "BARMER",
        "BALOTRA",
        "UTTARLAI",
        "REFINERY RAJASTHAN"
      ]
    },
    {
      "place": "Bikaner Renewable Energy Zone 20 GW",
      "district": "Bikaner",
      "coords": [
        28.0229,
        73.3119
      ],
      "keywords": [
        "BIKANER",
        "NOKHA",
        "KHAJUWALA",
        "LUNKARANSAR",
        "SOLAR BIKANER"
      ]
    },
    {
      "place": "Jaipur Ring Road 6-Lane Expressway",
      "district": "Jaipur",
      "coords": [
        26.9124,
        75.7873
      ],
      "keywords": [
        "JAIPUR",
        "SANGANER",
        "BAGRU",
        "CHOMU",
        "RING ROAD JAIPUR"
      ]
    }
  ]
};

export const STATE_COORDINATES: Record<string, [number, number]> = {
  "ANDHRA PRADESH": [16.5062, 80.6480],
  "ARUNACHAL PRADESH": [27.0844, 93.6053],
  "ASSAM": [26.1445, 91.7362],
  "BIHAR": [25.5941, 85.1376],
  "CHANDIGARH": [30.7333, 76.7794],
  "CHHATTISGARH": [21.2514, 81.6296],
  "DADRA & NAGAR HAVELI AND DAMAN & DIU": [20.4283, 72.8397],
  "DELHI": [28.6139, 77.2090],
  "GOA": [15.4909, 73.8278],
  "GUJARAT": [23.2156, 72.6369],
  "HARYANA": [29.0588, 76.0856],
  "HIMACHAL PRADESH": [31.1048, 77.1734],
  "JAMMU & KASHMIR": [34.0837, 74.7973],
  "JHARKHAND": [23.3441, 85.3096],
  "KARNATAKA": [12.9716, 77.5946],
  "KERALA": [8.5241, 76.9366],
  "LADAKH": [34.1526, 77.5771],
  "LAKSHADWEEP": [10.5667, 72.6417],
  "MADHYA PRADESH": [23.2599, 77.4126],
  "MAHARASHTRA": [19.0760, 72.8777],
  "MANIPUR": [24.8170, 93.9368],
  "MEGHALAYA": [25.5788, 91.8933],
  "MIZORAM": [23.7271, 92.7176],
  "NAGALAND": [25.6751, 94.1086],
  "ODISHA": [20.2961, 85.8245],
  "PUDUCHERRY": [11.9416, 79.8083],
  "PUNJAB": [30.9010, 75.8573],
  "RAJASTHAN": [26.9124, 75.7873],
  "SIKKIM": [27.3389, 88.6065],
  "TAMIL NADU": [13.0827, 80.2707],
  "TELANGANA": [17.3850, 78.4867],
  "TRIPURA": [23.8315, 91.2868],
  "UTTAR PRADESH": [26.8467, 80.9462],
  "UTTARAKHAND": [30.3165, 78.0322],
  "WEST BENGAL": [22.5726, 88.3639],
  "ANDAMAN & NICOBAR": [11.6234, 92.7265],
  "OFFSHORE": [19.2000, 71.5000],
  "MULTI-STATE": [23.5000, 78.5000],
};

export function normalizeStateName(rawState: string = ""): string {
  const s = rawState.trim();
  const sUpper = s.toUpperCase();
  if (sUpper.includes("MULTI") || sUpper.includes("PAN INDIA") || s.includes(",")) return "MULTI-STATE";
  if (sUpper.includes("OFFSHORE")) return "OFFSHORE";
  if (sUpper.includes("ODISHA") || sUpper.includes("ORISSA")) return "ODISHA";
  if (sUpper.includes("UTTARAKHAND") || sUpper.includes("UTTARANCHAL")) return "UTTARAKHAND";
  if (sUpper.includes("JAMMU")) return "JAMMU & KASHMIR";
  if (sUpper.includes("ANDAMAN")) return "ANDAMAN & NICOBAR";
  if (sUpper.includes("DADRA") || sUpper.includes("DAMAN") || sUpper.includes("DIU")) return "DADRA & NAGAR HAVELI AND DAMAN & DIU";
  if (sUpper.includes("PUDUCHERRY") || sUpper.includes("PONDICHERRY")) return "PUDUCHERRY";
  if (sUpper.includes("SIKKIM")) return "SIKKIM";
  if (sUpper.includes("GUJARAT")) return "GUJARAT";
  if (sUpper.includes("MAHARASHTRA")) return "MAHARASHTRA";
  if (sUpper.includes("UTTAR PRADESH")) return "UTTAR PRADESH";
  if (sUpper.includes("ANDHRA PRADESH")) return "ANDHRA PRADESH";
  if (sUpper.includes("BIHAR")) return "BIHAR";
  if (sUpper.includes("ASSAM")) return "ASSAM";
  if (sUpper.includes("MANIPUR")) return "MANIPUR";
  if (sUpper.includes("MIZORAM")) return "MIZORAM";
  if (sUpper.includes("NAGALAND")) return "NAGALAND";
  if (sUpper.includes("ARUNACHAL")) return "ARUNACHAL PRADESH";
  if (sUpper.includes("MEGHALAYA")) return "MEGHALAYA";
  if (sUpper.includes("TRIPURA")) return "TRIPURA";
  if (sUpper.includes("LADAKH")) return "LADAKH";
  if (sUpper.includes("GOA")) return "GOA";

  for (const k of Object.keys(STATE_GEO_KNOWLEDGE)) {
    if (sUpper.includes(k)) return k;
  }
  return sUpper;
}

export function projectMatchesState(projectState: string = "", filterState: string = ""): boolean {
  if (!filterState || filterState === "all") return true;
  const pNorm = normalizeStateName(projectState);
  const fNorm = normalizeStateName(filterState);
  if (pNorm === fNorm) return true;

  const pUpper = projectState.toUpperCase();
  const fUpper = filterState.toUpperCase();
  if (pUpper.includes(fUpper) || fUpper.includes(pUpper)) return true;
  return false;
}

export function getProjectLocation(
  project: { id?: string; project_name?: string; state?: string; sector?: string; district?: string | null; place?: string | null; latitude?: number | null; longitude?: number | null },
  index: number = 0
): { state: string; district: string; place: string; coords: [number, number]; category: string } {
  const rawState = project.state || "Delhi";
  const pUpper = (project.project_name || "").toUpperCase();

  // 1. If project has valid DB coordinates
  if (project.latitude != null && project.longitude != null && !isNaN(project.latitude) && !isNaN(project.longitude)) {
    return {
      state: rawState,
      district: project.district || `${rawState} District`,
      place: project.place || `${rawState} Corridor`,
      coords: [project.latitude, project.longitude],
      category: project.sector || "Infrastructure",
    };
  }

  // 2. Check Interstate Border Corridors
  for (const ic of INTERSTATE_CORRIDORS) {
    if (ic.keywords.some((kw) => pUpper.includes(kw))) {
      const angle = (index * 137.5 * Math.PI) / 180.0;
      const radius = ((index % 10) + 1) * 0.0012;
      const lat = ic.coords[0] + radius * Math.cos(angle);
      const lng = ic.coords[1] + radius * Math.sin(angle);
      return {
        state: rawState,
        district: ic.district,
        place: ic.place,
        coords: [Math.round(lat * 1000000) / 1000000, Math.round(lng * 1000000) / 1000000],
        category: project.sector || "Infrastructure",
      };
    }
  }

  // 3. State-level keyword matching
  const stKey = normalizeStateName(rawState);
  const placesList = STATE_GEO_KNOWLEDGE[stKey] || [];
  let matched = placesList.find((p) => p.keywords?.some((kw) => pUpper.includes(kw)));
  if (!matched && placesList.length > 0) {
    matched = placesList[index % placesList.length];
  }

  if (!matched) {
    const center = STATE_COORDINATES[stKey] || [22.5937, 78.9629];
    matched = {
      place: `${rawState} Infrastructure Corridor`,
      district: `${rawState} Central District`,
      coords: center,
    };
  }

  const angle = (index * 137.5 * Math.PI) / 180.0;
  const radius = ((index % 15) + 1) * 0.0015;
  const lat = matched.coords[0] + radius * Math.cos(angle);
  const lng = matched.coords[1] + radius * Math.sin(angle);

  return {
    state: rawState,
    district: matched.district,
    place: matched.place,
    coords: [Math.round(lat * 1000000) / 1000000, Math.round(lng * 1000000) / 1000000],
    category: project.sector || "Infrastructure",
  };
}

export function aggregateDistrictData(projects: any[]): DistrictSummary[] {
  const map = new Map<string, DistrictSummary>();

  projects.forEach((p, idx) => {
    const loc = getProjectLocation(p, idx);
    const distName = loc.district;
    const stName = p.state || loc.state;

    if (!map.has(distName)) {
      map.set(distName, {
        district: distName,
        state: stName,
        projectCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalCostCr: 0,
        avgProgress: 0,
        coords: loc.coords,
        places: [],
      });
    }

    const item = map.get(distName)!;
    item.projectCount += 1;
    item.totalCostCr += p.revised_cost_cr || p.original_cost_cr || 0;
    item.avgProgress += p.physical_progress_pct || 0;

    if (!item.places.includes(loc.place)) {
      item.places.push(loc.place);
    }

    const tier = (p.risk_tier || "low").toLowerCase();
    if (tier === "critical") item.criticalCount += 1;
    else if (tier === "high") item.highCount += 1;
    else if (tier === "medium") item.mediumCount += 1;
    else item.lowCount += 1;
  });

  return Array.from(map.values())
    .map((d) => ({
      ...d,
      totalCostCr: Math.round(d.totalCostCr),
      avgProgress: d.projectCount > 0 ? Math.round(d.avgProgress / d.projectCount) : 0,
    }))
    .sort((a, b) => b.projectCount - a.projectCount);
}

export function aggregateStateData(projects: any[]): {
  state: string;
  projectCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCostCr: number;
  avgProgress: number;
  coords: [number, number];
}[] {
  const map = new Map<string, {
    state: string;
    projectCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalCostCr: number;
    avgProgress: number;
    coords: [number, number];
  }>();

  projects.forEach((p, idx) => {
    const st = p.state || "National / Pan-India";
    const stKey = normalizeStateName(st);
    const coords = STATE_COORDINATES[stKey] || [22.5937, 78.9629];

    if (!map.has(st)) {
      map.set(st, {
        state: st,
        projectCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalCostCr: 0,
        avgProgress: 0,
        coords,
      });
    }

    const item = map.get(st)!;
    item.projectCount += 1;
    item.totalCostCr += p.revised_cost_cr || p.original_cost_cr || 0;
    item.avgProgress += p.physical_progress_pct || 0;

    const tier = (p.risk_tier || "low").toLowerCase();
    if (tier === "critical") item.criticalCount += 1;
    else if (tier === "high") item.highCount += 1;
    else if (tier === "medium") item.mediumCount += 1;
    else item.lowCount += 1;
  });

  return Array.from(map.values())
    .map((s) => ({
      ...s,
      totalCostCr: Math.round(s.totalCostCr),
      avgProgress: s.projectCount > 0 ? Math.round(s.avgProgress / s.projectCount) : 0,
    }))
    .sort((a, b) => b.projectCount - a.projectCount);
}

export const STATE_DISTRICTS_DATA: Record<string, any[]> = {};
export const STATE_DISTRICT_PLACES: Record<string, any[]> = {};
