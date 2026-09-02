// ============================================================================
// State & District Geospatial Engine (April 2026 Flash Report Dataset)
// Strictly State-Strict District Plotting across all 36 States & Union Territories
// ============================================================================

export interface DistrictInfo {
  district: string;
  coords: [number, number];
  keywords?: string[];
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
}

export const STATE_DISTRICTS_MAP: Record<string, DistrictInfo[]> = {
  "SIKKIM": [
    {
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
        "JPCL"
      ]
    },
    {
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
        "CSMT"
      ]
    },
    {
      "district": "Mumbai Suburban",
      "coords": [
        19.076,
        72.8777
      ],
      "keywords": [
        "BKC",
        "BANDRA",
        "ANDHERI",
        "BORIVALI",
        "KURLA",
        "GHATKOPAR",
        "SANTA CRUZ"
      ]
    },
    {
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
        "KASARA"
      ]
    },
    {
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
        "RAMTEK"
      ]
    },
    {
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
        "MAL EGAON",
        "IGATPURI",
        "OZAR"
      ]
    },
    {
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
      "district": "Solapur",
      "coords": [
        17.6599,
        75.9064
      ],
      "keywords": [
        "SOLAPUR",
        "PANDHARPUR",
        "AKKALKOT",
        "BARSHI"
      ]
    },
    {
      "district": "Raigad",
      "coords": [
        18.6468,
        72.8789
      ],
      "keywords": [
        "RAIGAD",
        "NAVI MUMBAI",
        "JNPT",
        "NHAVA SHEVA",
        "PANVEL",
        "ROHA",
        "ALIBAG",
        "TALOJA"
      ]
    },
    {
      "district": "Kolhapur",
      "coords": [
        16.705,
        74.2433
      ],
      "keywords": [
        "KOLHAPUR",
        "ICHALKARANJI",
        "KAGAL",
        "SHIROL"
      ]
    },
    {
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
      "district": "Amravati",
      "coords": [
        20.9374,
        77.7796
      ],
      "keywords": [
        "AMRAVATI",
        "NANDGAON",
        "BADNERA",
        "ACHALPUR"
      ]
    },
    {
      "district": "Nanded",
      "coords": [
        19.1383,
        77.321
      ],
      "keywords": [
        "NANDED",
        "DEGLOOR",
        "LOHA",
        "MUDKHED"
      ]
    },
    {
      "district": "Jalgaon",
      "coords": [
        21.0077,
        75.5626
      ],
      "keywords": [
        "JALGAON",
        "BHUSAWAL",
        "AMALNER",
        "CHALISGAON"
      ]
    }
  ],
  "UTTAR PRADESH": [
    {
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
      "district": "Gautam Buddha Nagar",
      "coords": [
        28.5355,
        77.391
      ],
      "keywords": [
        "NOIDA",
        "GREATER NOIDA",
        "JEWAR",
        "YAMUNA EXPRESSWAY",
        "DADRI",
        "YEIDA"
      ]
    },
    {
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
      "district": "Aligarh",
      "coords": [
        27.8974,
        78.088
      ],
      "keywords": [
        "ALIGARH",
        "TALANAGRI",
        "KHAIR",
        "ATRAULI"
      ]
    },
    {
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
        "SINGRAULI UP",
        "SHAKTI NAGAR"
      ]
    }
  ],
  "ANDHRA PRADESH": [
    {
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
      "district": "NTR (Vijayawada)",
      "coords": [
        16.5062,
        80.648
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
      "district": "YSR Kadapa",
      "coords": [
        14.4673,
        78.8242
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
      "district": "Guntur",
      "coords": [
        16.3067,
        80.4365
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
      "district": "Tirupati",
      "coords": [
        13.6288,
        79.4192
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
    },
    {
      "district": "Vizianagaram",
      "coords": [
        18.1067,
        83.3956
      ],
      "keywords": [
        "VIZIANAGARAM",
        "BHOGAPURAM",
        "BOBBILI",
        "SALUR"
      ]
    },
    {
      "district": "East Godavari",
      "coords": [
        17.0005,
        81.804
      ],
      "keywords": [
        "RAJAHMUNDRY",
        "EAST GODAVARI",
        "KOVVUR",
        "SAMALKOT"
      ]
    },
    {
      "district": "Kakinada",
      "coords": [
        16.9891,
        82.2475
      ],
      "keywords": [
        "KAKINADA",
        "PEDDAPURAM",
        "PITHAPURAM",
        "CORINGA"
      ]
    },
    {
      "district": "SPSR Nellore",
      "coords": [
        14.4426,
        79.9865
      ],
      "keywords": [
        "NELLORE",
        "KRISHNAPATNAM",
        "KAVALI",
        "GUDUR"
      ]
    },
    {
      "district": "Anantapur",
      "coords": [
        14.6819,
        77.6006
      ],
      "keywords": [
        "ANANTAPUR",
        "GOOTY",
        "TADIPATRI",
        "GUNTAKAL"
      ]
    }
  ],
  "GUJARAT": [
    {
      "district": "Ahmedabad",
      "coords": [
        23.0225,
        72.5714
      ],
      "keywords": [
        "AHMEDABAD",
        "DHOLERA",
        "SANAND",
        "SABARMATI",
        "VIRAMGAM",
        "BAWLA"
      ]
    },
    {
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
        "OLPAD"
      ]
    },
    {
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
        "PADRA"
      ]
    },
    {
      "district": "Kutch",
      "coords": [
        23.242,
        69.6669
      ],
      "keywords": [
        "KUTCH",
        "BHUJ",
        "MUNDRA",
        "KANDLA",
        "KHAVDA",
        "GANDHIDHAM",
        "ANJAR"
      ]
    },
    {
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
        "GONDAL"
      ]
    },
    {
      "district": "Bharuch",
      "coords": [
        21.7051,
        72.9959
      ],
      "keywords": [
        "BHARUCH",
        "DAHEJ",
        "ANKLESHWAR",
        "PCPIR",
        "JAGHADIA"
      ]
    },
    {
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
        "RELIANCE JAMNAGAR"
      ]
    },
    {
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
        "KUDASAN"
      ]
    }
  ],
  "BIHAR": [
    {
      "district": "Patna",
      "coords": [
        25.5941,
        85.1376
      ],
      "keywords": [
        "PATNA",
        "BIHTA",
        "DANAPUR",
        "DIDARGANJ",
        "FATUHA",
        "PATLIPUTRA",
        "PHULWARI"
      ]
    },
    {
      "district": "Begusarai",
      "coords": [
        25.4182,
        86.1272
      ],
      "keywords": [
        "BEGUSARAI",
        "BARAUNI",
        "TEGHRA",
        "BAKHRI"
      ]
    },
    {
      "district": "Gaya",
      "coords": [
        24.7914,
        85.0002
      ],
      "keywords": [
        "GAYA",
        "DOBHI",
        "BODHGAYA",
        "SHERGATI",
        "MANPUR"
      ]
    },
    {
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
      "district": "Purnea",
      "coords": [
        25.7771,
        87.4753
      ],
      "keywords": [
        "PURNEA",
        "KASBA",
        "BANMANKHI",
        "GULABBAGH"
      ]
    },
    {
      "district": "Vaishali",
      "coords": [
        25.6858,
        85.2146
      ],
      "keywords": [
        "VAISHALI",
        "HAJIPUR",
        "MAHNAR",
        "LALGANJ"
      ]
    },
    {
      "district": "Rohtas",
      "coords": [
        24.95,
        84.03
      ],
      "keywords": [
        "ROHTAS",
        "SASARAM",
        "DEHRI",
        "DALMIANAGAR"
      ]
    },
    {
      "district": "Saran",
      "coords": [
        25.7796,
        84.7499
      ],
      "keywords": [
        "SARAN",
        "CHAPRA",
        "SONEPUR",
        "MARHAURA"
      ]
    }
  ],
  "ASSAM": [
    {
      "district": "Kamrup Metropolitan",
      "coords": [
        26.1445,
        91.7362
      ],
      "keywords": [
        "GUWAHATI",
        "BORJHAR",
        "DISPUR",
        "PALTAN BAZAR",
        "AMINGAON",
        "JALUKBARI"
      ]
    },
    {
      "district": "Dibrugarh",
      "coords": [
        27.4728,
        94.912
      ],
      "keywords": [
        "DIBRUGARH",
        "BOGIBEEL",
        "CHABUA",
        "MORAN",
        "NAHARKATIA"
      ]
    },
    {
      "district": "Golaghat",
      "coords": [
        26.5167,
        93.9667
      ],
      "keywords": [
        "GOLAGHAT",
        "NUMALIGARH",
        "BOKAKHAT",
        "DERGAON"
      ]
    },
    {
      "district": "Cachar",
      "coords": [
        24.8333,
        92.7789
      ],
      "keywords": [
        "SILCHAR",
        "CACHAR",
        "LAKHIPUR",
        "UDHARBOND",
        "BADARPUR"
      ]
    },
    {
      "district": "Sonitpur",
      "coords": [
        26.65,
        92.8
      ],
      "keywords": [
        "TEZPUR",
        "SONITPUR",
        "DHEKIAJULI",
        "BISWANATH"
      ]
    },
    {
      "district": "Bongaigaon",
      "coords": [
        26.5,
        90.55
      ],
      "keywords": [
        "BONGAIGAON",
        "NEW BONGAIGAON",
        "ABHAYAPURI",
        "BIJNI"
      ]
    },
    {
      "district": "Jorhat",
      "coords": [
        26.7509,
        94.2037
      ],
      "keywords": [
        "JORHAT",
        "MARIANI",
        "TITABAR",
        "TEOK"
      ]
    }
  ],
  "MANIPUR": [
    {
      "district": "Imphal West",
      "coords": [
        24.817,
        93.9368
      ],
      "keywords": [
        "IMPHAL WEST",
        "IMPHAL",
        "LANGJING",
        "LAMPHELPAT",
        "AIRPORT MANIPUR"
      ]
    },
    {
      "district": "Imphal East",
      "coords": [
        24.8,
        94.0
      ],
      "keywords": [
        "IMPHAL EAST",
        "POROMPAT",
        "LAMLAI",
        "SAWOMBUNG"
      ]
    },
    {
      "district": "Tengnoupal (Moreh)",
      "coords": [
        24.24,
        94.31
      ],
      "keywords": [
        "MOREH",
        "TENGNOUPAL",
        "ICP MOREH",
        "ASIAN HIGHWAY 1"
      ]
    },
    {
      "district": "Churachandpur",
      "coords": [
        24.3333,
        93.6667
      ],
      "keywords": [
        "CHURACHANDPUR",
        "TUINIM",
        "SINGNGAT",
        "LAMKA"
      ]
    },
    {
      "district": "Senapati",
      "coords": [
        25.2667,
        94.0167
      ],
      "keywords": [
        "SENAPATI",
        "MAO",
        "MARAM",
        "NH-2 MANIPUR"
      ]
    },
    {
      "district": "Thoubal",
      "coords": [
        24.6333,
        93.999
      ],
      "keywords": [
        "THOUBAL",
        "WANGJING",
        "LILONG",
        "KAKCHING"
      ]
    },
    {
      "district": "Noney",
      "coords": [
        24.85,
        93.65
      ],
      "keywords": [
        "NONEY",
        "TUPUL",
        "JIRIBAM-IMPHAL",
        "MAKESH"
      ]
    }
  ],
  "MIZORAM": [
    {
      "district": "Aizawl",
      "coords": [
        23.7271,
        92.7176
      ],
      "keywords": [
        "AIZAWL",
        "SAIRANG",
        "LENGPUI",
        "DURTLANG",
        "ZEMABAWK"
      ]
    },
    {
      "district": "Kolasib",
      "coords": [
        24.225,
        92.678
      ],
      "keywords": [
        "KOLASIB",
        "BAIRABI",
        "VAIRENGTE",
        "KAWNPUITHA"
      ]
    },
    {
      "district": "Lunglei",
      "coords": [
        22.8671,
        92.7656
      ],
      "keywords": [
        "LUNGLEI",
        "TUIDAM",
        "HNAHTHIAL",
        "KALADAN"
      ]
    },
    {
      "district": "Champhai",
      "coords": [
        23.475,
        93.328
      ],
      "keywords": [
        "CHAMPHAI",
        "ZOKHAWTHAR",
        "KHAWZAWL"
      ]
    }
  ],
  "NAGALAND": [
    {
      "district": "Kohima",
      "coords": [
        25.6751,
        94.1086
      ],
      "keywords": [
        "KOHIMA",
        "ZUBZA",
        "MEDZIPHEMA",
        "TSUMINYU",
        "SECHU"
      ]
    },
    {
      "district": "Dimapur",
      "coords": [
        25.9095,
        93.7266
      ],
      "keywords": [
        "DIMAPUR",
        "CHUMOUKEDIMA",
        "PURANA BAZAR",
        "RANGAPAHAR"
      ]
    },
    {
      "district": "Mokokchung",
      "coords": [
        26.326,
        94.521
      ],
      "keywords": [
        "MOKOKCHUNG",
        "CHANGTONGYA",
        "TULI"
      ]
    }
  ],
  "ARUNACHAL PRADESH": [
    {
      "district": "Papum Pare",
      "coords": [
        27.0844,
        93.6053
      ],
      "keywords": [
        "ITANAGAR",
        "PAPUM PARE",
        "HOLLONGI",
        "NAHARLAGUN",
        "DONYI POLO",
        "BANDERDEWA"
      ]
    },
    {
      "district": "Tawang",
      "coords": [
        27.5861,
        91.8653
      ],
      "keywords": [
        "TAWANG",
        "SELA TUNNEL",
        "JANG",
        "LUM LA"
      ]
    },
    {
      "district": "West Kameng",
      "coords": [
        27.2645,
        92.4172
      ],
      "keywords": [
        "BOMDILA",
        "DIRANG",
        "WEST KAMENG",
        "BHARALU",
        "BHALUKPONG"
      ]
    },
    {
      "district": "East Siang",
      "coords": [
        28.0667,
        95.3333
      ],
      "keywords": [
        "PASIGHAT",
        "EAST SIANG",
        "RUKTIN",
        "MEBO"
      ]
    },
    {
      "district": "Lower Dibang Valley",
      "coords": [
        28.14,
        95.84
      ],
      "keywords": [
        "DIBANG",
        "ROING",
        "LOWER DIBANG",
        "DAMBUK"
      ]
    }
  ],
  "MEGHALAYA": [
    {
      "district": "East Khasi Hills",
      "coords": [
        25.5788,
        91.8933
      ],
      "keywords": [
        "SHILLONG",
        "EAST KHASI",
        "NEW SHILLONG",
        "MAWLYNNOUNG",
        "SOHRA"
      ]
    },
    {
      "district": "Ri-Bhoi",
      "coords": [
        25.9,
        91.88
      ],
      "keywords": [
        "RI-BHOI",
        "NONGPOH",
        "BYRNIHAT",
        "UMROI",
        "UMIAM"
      ]
    },
    {
      "district": "West Garo Hills",
      "coords": [
        25.514,
        90.203
      ],
      "keywords": [
        "TURA",
        "WEST GARO",
        "PHULBARI",
        "TIKRICKILLA"
      ]
    }
  ],
  "TRIPURA": [
    {
      "district": "West Tripura",
      "coords": [
        23.8315,
        91.2868
      ],
      "keywords": [
        "AGARTALA",
        "WEST TRIPURA",
        "MBB AIRPORT",
        "AKHAURA",
        "BODHJUNGNAGAR"
      ]
    },
    {
      "district": "South Tripura",
      "coords": [
        23.16,
        91.5
      ],
      "keywords": [
        "BELONIA",
        "SOUTH TRIPURA",
        "SABROOM",
        "MAITRI SETU",
        "SANTIRBAZAR"
      ]
    },
    {
      "district": "Gomati",
      "coords": [
        23.53,
        91.48
      ],
      "keywords": [
        "UDAIPUR TRIPURA",
        "GOMATI",
        "MATABARI",
        "AMARPUR"
      ]
    }
  ],
  "LADAKH": [
    {
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
    },
    {
      "district": "Kargil",
      "coords": [
        34.5539,
        76.1349
      ],
      "keywords": [
        "KARGIL",
        "ZOJILA",
        "DRAS",
        "SANKOO",
        "PADUM",
        "ZANSKAR"
      ]
    }
  ],
  "JAMMU & KASHMIR": [
    {
      "district": "Srinagar",
      "coords": [
        34.0837,
        74.7973
      ],
      "keywords": [
        "SRINAGAR",
        "DAL LAKE",
        "PANDRETHAN",
        "NOWGAM",
        "LAL CHOWK"
      ]
    },
    {
      "district": "Jammu",
      "coords": [
        32.7266,
        74.857
      ],
      "keywords": [
        "JAMMU",
        "NAGROTA",
        "VIJAYPUR",
        "BISHNAH",
        "AKHNOOR"
      ]
    },
    {
      "district": "Reasi",
      "coords": [
        33.0827,
        74.8322
      ],
      "keywords": [
        "REASI",
        "KATRA",
        "CHENAB BRIDGE",
        "VAISHNO DEVI"
      ]
    },
    {
      "district": "Anantnag",
      "coords": [
        33.7311,
        75.1522
      ],
      "keywords": [
        "ANANTNAG",
        "QAZIGUND",
        "BIJBEHARA",
        "PAHALGAM"
      ]
    },
    {
      "district": "Baramulla",
      "coords": [
        34.198,
        74.3636
      ],
      "keywords": [
        "BARAMULLA",
        "SOPORE",
        "URI",
        "PATTAN"
      ]
    }
  ],
  "GOA": [
    {
      "district": "North Goa",
      "coords": [
        15.55,
        73.85
      ],
      "keywords": [
        "PANAJI",
        "MOPA",
        "NORTH GOA",
        "MAPUSA",
        "TIVIM",
        "CALANGUTE",
        "PORVORIM"
      ]
    },
    {
      "district": "South Goa",
      "coords": [
        15.28,
        73.98
      ],
      "keywords": [
        "MARGAO",
        "SOUTH GOA",
        "VASCO",
        "MORMUGAO",
        "DABOLIM",
        "CUNCOLIM",
        "PONDA"
      ]
    }
  ],
  "DELHI": [
    {
      "district": "New Delhi",
      "coords": [
        28.6139,
        77.209
      ],
      "keywords": [
        "CENTRAL VISTA",
        "NEW DELHI",
        "PRAGATI MAIDAN",
        "CONNAUGHT PLACE",
        "MINISTRIES"
      ]
    },
    {
      "district": "South West Delhi",
      "coords": [
        28.58,
        77.05
      ],
      "keywords": [
        "DWARKA",
        "UER-II",
        "IGI AIRPORT",
        "PALAM",
        "BIJWASAN"
      ]
    },
    {
      "district": "East Delhi",
      "coords": [
        28.628,
        77.295
      ],
      "keywords": [
        "AKSHARDHAM",
        "EAST DELHI",
        "MAYUR VIHAR",
        "ANAND VIHAR"
      ]
    },
    {
      "district": "North Delhi",
      "coords": [
        28.72,
        77.16
      ],
      "keywords": [
        "NORTH DELHI",
        "BURARI",
        "ALIPUR",
        "MUKARBA"
      ]
    }
  ],
  "HARYANA": [
    {
      "district": "Gurugram",
      "coords": [
        28.4595,
        77.0266
      ],
      "keywords": [
        "GURUGRAM",
        "GURGAON",
        "MANESAR",
        "CYBER CITY",
        "SOHNA",
        "DWARKA EXPRESSWAY HARYANA"
      ]
    },
    {
      "district": "Faridabad",
      "coords": [
        28.4089,
        77.3178
      ],
      "keywords": [
        "FARIDABAD",
        "BALLABGARH",
        "NEHARPAR",
        "BADKHAL"
      ]
    },
    {
      "district": "Panipat",
      "coords": [
        29.3909,
        76.9635
      ],
      "keywords": [
        "PANIPAT",
        "SAMALKHA",
        "REFINERY PANIPAT",
        "ISRANA"
      ]
    },
    {
      "district": "Sonipat",
      "coords": [
        28.9931,
        77.0151
      ],
      "keywords": [
        "SONIPAT",
        "KUNDLI",
        "RAI",
        "GANAUR",
        "KMP EXPRESSWAY"
      ]
    }
  ],
  "PUNJAB": [
    {
      "district": "Ludhiana",
      "coords": [
        30.901,
        75.8573
      ],
      "keywords": [
        "LUDHIANA",
        "SAHNEWAL",
        "KHANNA",
        "DORAHI",
        "JAGRAON"
      ]
    },
    {
      "district": "Amritsar",
      "coords": [
        31.634,
        74.8723
      ],
      "keywords": [
        "AMRITSAR",
        "ATTARI",
        "RAJA SANSI",
        "BEAS"
      ]
    },
    {
      "district": "Jalandhar",
      "coords": [
        31.326,
        75.5762
      ],
      "keywords": [
        "JALANDHAR",
        "PHAGWARA CORRIDOR",
        "ADAMPUR",
        "NAKODAR"
      ]
    },
    {
      "district": "SAS Nagar (Mohali)",
      "coords": [
        30.7046,
        76.7179
      ],
      "keywords": [
        "MOHALI",
        "SAS NAGAR",
        "KHARAR",
        "DERABASSI",
        "ZIRAKPUR"
      ]
    },
    {
      "district": "Bathinda",
      "coords": [
        30.211,
        74.9455
      ],
      "keywords": [
        "BATHINDA",
        "TALWANDI SABO",
        "RAMPURA PHUL"
      ]
    }
  ],
  "RAJASTHAN": [
    {
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
    },
    {
      "district": "Jodhpur",
      "coords": [
        26.2389,
        73.0243
      ],
      "keywords": [
        "JODHPUR",
        "BHADLA",
        "OSIAN",
        "PIPAR",
        "LUNI"
      ]
    },
    {
      "district": "Barmer",
      "coords": [
        25.7521,
        71.3967
      ],
      "keywords": [
        "BARMER",
        "PACHPADRA",
        "BALOTRA",
        "UTTARLAI",
        "REFINERY RAJASTHAN"
      ]
    },
    {
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
      "district": "Udaipur",
      "coords": [
        24.5854,
        73.7125
      ],
      "keywords": [
        "UDAIPUR",
        "DEBARI",
        "DABOK",
        "KHERWARA"
      ]
    },
    {
      "district": "Kota",
      "coords": [
        25.2138,
        75.8648
      ],
      "keywords": [
        "KOTA",
        "RAWATBHATA",
        "RAMGANJ MANDI",
        "KOTA THERMAL"
      ]
    }
  ],
  "MADHYA PRADESH": [
    {
      "district": "Bhopal",
      "coords": [
        23.2599,
        77.4126
      ],
      "keywords": [
        "BHOPAL",
        "MANDIDEEP",
        "BERASIA",
        "KAMLAPATI",
        "BHEL BHOPAL"
      ]
    },
    {
      "district": "Indore",
      "coords": [
        22.7196,
        75.8577
      ],
      "keywords": [
        "INDORE",
        "PITHAMPUR",
        "SANWER",
        "MHOW",
        "DEWAS CORRIDOR"
      ]
    },
    {
      "district": "Singrauli",
      "coords": [
        24.1997,
        82.6644
      ],
      "keywords": [
        "SINGRAULI",
        "WAIDHAN",
        "JAYANT",
        "VINDHYACHAL",
        "NCL",
        "NTPC VINDHYACHAL"
      ]
    },
    {
      "district": "Jabalpur",
      "coords": [
        23.1815,
        79.9864
      ],
      "keywords": [
        "JABALPUR",
        "KHAMARIA",
        "SIHORA",
        "BARGI"
      ]
    },
    {
      "district": "Gwalior",
      "coords": [
        26.2183,
        78.1828
      ],
      "keywords": [
        "GWALIOR",
        "MALANPUR",
        "GHATIGAON",
        "DABRA"
      ]
    }
  ],
  "CHHATTISGARH": [
    {
      "district": "Raipur",
      "coords": [
        21.2514,
        81.6296
      ],
      "keywords": [
        "RAIPUR",
        "NAVA RAIPUR",
        "TILDAL",
        "ABHANPUR",
        "BIRGAON"
      ]
    },
    {
      "district": "Korba",
      "coords": [
        22.3595,
        82.7501
      ],
      "keywords": [
        "KORBA",
        "GEVRA",
        "DIPKA",
        "KUSMUNDA",
        "SECL",
        "NTPC KORBA"
      ]
    },
    {
      "district": "Durg",
      "coords": [
        21.1904,
        81.2849
      ],
      "keywords": [
        "BHILAI",
        "DURG",
        "KUMHARI",
        "STEEL PLANT BHILAI",
        "CHARODA"
      ]
    },
    {
      "district": "Bilaspur",
      "coords": [
        22.0797,
        82.1409
      ],
      "keywords": [
        "BILASPUR",
        "SIPAT",
        "KOTA CG",
        "BODRI",
        "SECL HQ"
      ]
    }
  ],
  "JHARKHAND": [
    {
      "district": "Ranchi",
      "coords": [
        23.3441,
        85.3096
      ],
      "keywords": [
        "RANCHI",
        "HATIA",
        "DHURWA",
        "NAMKUM",
        "ORMANJHI",
        "HEC"
      ]
    },
    {
      "district": "Dhanbad",
      "coords": [
        23.7957,
        86.4304
      ],
      "keywords": [
        "DHANBAD",
        "JHARIA",
        "KARKEND",
        "KATRAS",
        "BCCL",
        "GOVINDPUR"
      ]
    },
    {
      "district": "East Singhbhum (Jamshedpur)",
      "coords": [
        22.8046,
        86.2029
      ],
      "keywords": [
        "JAMSHEDPUR",
        "EAST SINGHBHUM",
        "TELCO",
        "ADITYAPUR",
        "TATA STEEL"
      ]
    },
    {
      "district": "Bokaro",
      "coords": [
        23.6693,
        86.1511
      ],
      "keywords": [
        "BOKARO",
        "CHAS",
        "BERMO",
        "DUGDA",
        "STEEL PLANT BOKARO"
      ]
    },
    {
      "district": "Hazaribagh",
      "coords": [
        23.9925,
        85.3637
      ],
      "keywords": [
        "HAZARIBAGH",
        "BARHI",
        "BARKAGAON",
        "NTPC PANKRI"
      ]
    }
  ],
  "ODISHA": [
    {
      "district": "Khordha (Bhubaneswar)",
      "coords": [
        20.2961,
        85.8245
      ],
      "keywords": [
        "BHUBANESWAR",
        "KHORDHA",
        "INFOVALLEY",
        "JATNI",
        "CHANDAKA"
      ]
    },
    {
      "district": "Jagatsinghpur (Paradip)",
      "coords": [
        20.3165,
        86.6114
      ],
      "keywords": [
        "PARADIP",
        "JAGATSINGHPUR",
        "PORT PARADIP",
        "IOCL PARADIP",
        "KUJANG"
      ]
    },
    {
      "district": "Sundargarh (Rourkela)",
      "coords": [
        22.2604,
        84.8536
      ],
      "keywords": [
        "ROURKELA",
        "SUNDARGARH",
        "SAIL ROURKELA",
        "RAJGANGPUR",
        "BONAI"
      ]
    },
    {
      "district": "Angul",
      "coords": [
        20.8444,
        85.1511
      ],
      "keywords": [
        "ANGUL",
        "TALCHER",
        "NALCO",
        "MCL",
        "NTPC TALCHER",
        "BANARPAL"
      ]
    },
    {
      "district": "Sambalpur",
      "coords": [
        21.4669,
        83.9812
      ],
      "keywords": [
        "SAMBALPUR",
        "HIRAKUD",
        "BURIA",
        "REDRHAKHOL",
        "MCL HQ"
      ]
    },
    {
      "district": "Cuttack",
      "coords": [
        20.4625,
        85.8828
      ],
      "keywords": [
        "CUTTACK",
        "CHOUDHWAR",
        "ATHAGARH",
        "BANKI"
      ]
    },
    {
      "district": "Jharsuguda",
      "coords": [
        21.855,
        84.006
      ],
      "keywords": [
        "JHARSUGUDA",
        "VEER SURENDRA SAI AIRPORT",
        "BRAJRAJNAGAR",
        "BELPAHAR"
      ]
    }
  ],
  "WEST BENGAL": [
    {
      "district": "Kolkata",
      "coords": [
        22.5726,
        88.3639
      ],
      "keywords": [
        "KOLKATA",
        "CALCUTTA",
        "SEALDAH",
        "HOWRAH BRIDGE",
        "PARK STREET",
        "UNDERWATER METRO"
      ]
    },
    {
      "district": "North 24 Parganas",
      "coords": [
        22.72,
        88.48
      ],
      "keywords": [
        "SALT LAKE",
        "NEW TOWN",
        "DUM DUM",
        "BARASAT",
        "NSCB AIRPORT"
      ]
    },
    {
      "district": "Purba Medinipur (Haldia)",
      "coords": [
        22.0667,
        88.0698
      ],
      "keywords": [
        "HALDIA",
        "PURBA MEDINIPUR",
        "PORT HALDIA",
        "TAMLUK",
        "DIGHA"
      ]
    },
    {
      "district": "Paschim Bardhaman (Durgapur/Asansol)",
      "coords": [
        23.5204,
        87.3119
      ],
      "keywords": [
        "DURGAPUR",
        "ASANSOL",
        "ANDAL",
        "RANIGANJ",
        "ECL",
        "DSP"
      ]
    },
    {
      "district": "Darjeeling",
      "coords": [
        27.041,
        88.2663
      ],
      "keywords": [
        "DARJEELING",
        "SILIGURI",
        "BAGDOGRA",
        "KURSEONG",
        "MATIGARA"
      ]
    }
  ],
  "TAMIL NADU": [
    {
      "district": "Chennai",
      "coords": [
        13.0827,
        80.2707
      ],
      "keywords": [
        "CHENNAI",
        "MADRAS",
        "MEENAMBAKKAM",
        "GUINDY",
        "AVADI",
        "ENNORE",
        "PORT CHENNAI"
      ]
    },
    {
      "district": "Coimbatore",
      "coords": [
        11.0168,
        76.9558
      ],
      "keywords": [
        "COIMBATORE",
        "PEELAMEDU",
        "SULUR",
        "POLLACHI",
        "METTUPALAYAM"
      ]
    },
    {
      "district": "Thoothukudi (Tuticorin)",
      "coords": [
        8.7642,
        78.1348
      ],
      "keywords": [
        "THOOTHUKUDI",
        "TUTICORIN",
        "VOC PORT",
        "SPIC"
      ]
    },
    {
      "district": "Chengalpattu",
      "coords": [
        12.6841,
        79.9836
      ],
      "keywords": [
        "CHENGALPATTU",
        "MAHINDRA WORLD CITY",
        "MARAIMALAI",
        "SRIPERUMBUDUR TN"
      ]
    },
    {
      "district": "Tiruchirappalli",
      "coords": [
        10.7905,
        78.7047
      ],
      "keywords": [
        "TIRUCHIRAPPALLI",
        "TRICHY",
        "PONMALAI",
        "THUVAKUDI",
        "BHEL TRICHY"
      ]
    }
  ],
  "TELANGANA": [
    {
      "district": "Hyderabad",
      "coords": [
        17.385,
        78.4867
      ],
      "keywords": [
        "HYDERABAD",
        "HITEC CITY",
        "SECUNDERABAD",
        "CHARMINAR",
        "SHAMSHABAD AIRPORT",
        "ORR"
      ]
    },
    {
      "district": "Medchal-Malkajgiri",
      "coords": [
        17.6297,
        78.4814
      ],
      "keywords": [
        "MEDCHAL",
        "MALKAJGIRI",
        "GHATKESAR",
        "KEESARA",
        "GENOME VALLEY"
      ]
    },
    {
      "district": "Peddapalli (Ramagundam)",
      "coords": [
        18.7562,
        79.5167
      ],
      "keywords": [
        "RAMAGUNDAM",
        "PEDDAPALLI",
        "NTPC RAMAGUNDAM",
        "GODAVARIKHANI",
        "SCCL"
      ]
    },
    {
      "district": "Warangal",
      "coords": [
        17.9689,
        79.5941
      ],
      "keywords": [
        "WARANGAL",
        "HANAMKONDA",
        "KAZIPET",
        "KAKATIYA"
      ]
    },
    {
      "district": "Bhadradri Kothagudem",
      "coords": [
        17.55,
        80.6167
      ],
      "keywords": [
        "KOTHAGUDEM",
        "BHADRADRI",
        "PALONCHA",
        "SCCL HQ"
      ]
    }
  ],
  "KERALA": [
    {
      "district": "Thiruvananthapuram",
      "coords": [
        8.5241,
        76.9366
      ],
      "keywords": [
        "THIRUVANANTHAPURAM",
        "TRIVANDRUM",
        "VIZHINJAM",
        "TECHNOPARK",
        "KAZHAKOOTTAM"
      ]
    },
    {
      "district": "Ernakulam (Kochi)",
      "coords": [
        9.9816,
        76.2999
      ],
      "keywords": [
        "KOCHI",
        "COCHIN",
        "ERNAKULAM",
        "WILLINGDON",
        "KALAMASSERY",
        "BPCL KOCHI"
      ]
    },
    {
      "district": "Kozhikode",
      "coords": [
        11.2588,
        75.7804
      ],
      "keywords": [
        "KOZHIKODE",
        "CALICUT",
        "KARIPUR",
        "FEROKE",
        "BEYPORE"
      ]
    },
    {
      "district": "Kannur",
      "coords": [
        11.8745,
        75.3704
      ],
      "keywords": [
        "KANNUR",
        "MATTANNUR",
        "THALASSERY",
        "PAYYANUR"
      ]
    }
  ],
  "HIMACHAL PRADESH": [
    {
      "district": "Shimla",
      "coords": [
        31.1048,
        77.1734
      ],
      "keywords": [
        "SHIMLA",
        "JUBBARHATTI",
        "RAMPUR",
        "THEOG",
        "SJVN"
      ]
    },
    {
      "district": "Kullu",
      "coords": [
        31.9579,
        77.1095
      ],
      "keywords": [
        "KULLU",
        "MANALI",
        "ATAL TUNNEL",
        "BHUNTAR",
        "LARJI"
      ]
    },
    {
      "district": "Solan",
      "coords": [
        30.9045,
        77.0967
      ],
      "keywords": [
        "SOLAN",
        "BADDI",
        "NALAGARH",
        "PARWANOO",
        "KANDAGHAT"
      ]
    },
    {
      "district": "Mandi",
      "coords": [
        31.5892,
        76.9182
      ],
      "keywords": [
        "MANDI",
        "SUNDERNAGAR",
        "KARSOG",
        "IIT MANDI"
      ]
    }
  ],
  "UTTARAKHAND": [
    {
      "district": "Dehradun",
      "coords": [
        30.3165,
        78.0322
      ],
      "keywords": [
        "DEHRADUN",
        "RISHIKESH",
        "JOLLY GRANT",
        "VIKASNAGAR",
        "SELAQUI"
      ]
    },
    {
      "district": "Haridwar",
      "coords": [
        29.9457,
        78.1642
      ],
      "keywords": [
        "HARIDWAR",
        "ROORKEE",
        "SIIDCUL",
        "BHAGWANPUR",
        "BHEL HARIDWAR"
      ]
    },
    {
      "district": "Tehri Garhwal",
      "coords": [
        30.38,
        78.48
      ],
      "keywords": [
        "TEHRI",
        "THDC",
        "KOTESHWAR",
        "CHAMBA UK",
        "NEW TEHRI"
      ]
    },
    {
      "district": "Udham Singh Nagar",
      "coords": [
        28.98,
        79.4
      ],
      "keywords": [
        "PANTNAGAR",
        "RUDRAPUR",
        "KASHIPUR",
        "KICHHA"
      ]
    }
  ],
  "ANDAMAN & NICOBAR": [
    {
      "district": "South Andaman (Port Blair)",
      "coords": [
        11.6234,
        92.7265
      ],
      "keywords": [
        "PORT BLAIR",
        "SOUTH ANDAMAN",
        "VEER SAVARKAR",
        "HAVELOCK",
        "FERRARGUNJ"
      ]
    },
    {
      "district": "Great Nicobar",
      "coords": [
        7.0,
        93.8
      ],
      "keywords": [
        "NICOBAR",
        "GREAT NICOBAR",
        "GALATHEA",
        "CAMPBELL BAY"
      ]
    }
  ],
  "LAKSHADWEEP": [
    {
      "district": "Lakshadweep Islands",
      "coords": [
        10.5667,
        72.6417
      ],
      "keywords": [
        "LAKSHADWEEP",
        "KAVARATTI",
        "AGATTI",
        "MINICOY",
        "ANDROTT"
      ]
    }
  ],
  "CHANDIGARH": [
    {
      "district": "Chandigarh Urban",
      "coords": [
        30.7333,
        76.7794
      ],
      "keywords": [
        "CHANDIGARH",
        "SECTOR 17",
        "MANIMAJRA"
      ]
    }
  ],
  "PUDUCHERRY": [
    {
      "district": "Puducherry",
      "coords": [
        11.9416,
        79.8083
      ],
      "keywords": [
        "PUDUCHERRY",
        "PONDICHERRY",
        "OULGARET",
        "VILLIANUR",
        "KARAIKAL"
      ]
    }
  ],
  "DADRA & NAGAR HAVELI AND DAMAN & DIU": [
    {
      "district": "Dadra and Nagar Haveli",
      "coords": [
        20.1809,
        73.0169
      ],
      "keywords": [
        "SILVASSA",
        "DADRA",
        "NAGAR HAVELI",
        "KHANVEL"
      ]
    },
    {
      "district": "Daman & Diu",
      "coords": [
        20.4283,
        72.8397
      ],
      "keywords": [
        "DAMAN",
        "DIU",
        "MOTI DAMAN",
        "NANIDAMAN"
      ]
    }
  ],
  "OFFSHORE": [
    {
      "district": "Offshore Western Basin",
      "coords": [
        19.2,
        71.5
      ],
      "keywords": [
        "MUMBAI HIGH",
        "OFFSHORE",
        "WESTERN BASIN",
        "BASSEIN",
        "HEERA"
      ]
    },
    {
      "district": "Offshore Eastern Basin",
      "coords": [
        16.5,
        82.5
      ],
      "keywords": [
        "KG BASIN",
        "KG-D6",
        "RAVVA",
        "EAST COAST OFFSHORE"
      ]
    }
  ],
  "MULTI-STATE": [
    {
      "district": "National Dedicated Freight Corridor",
      "coords": [
        25.5,
        81.5
      ],
      "keywords": [
        "FREIGHT CORRIDOR",
        "DFCCIL",
        "EDFC",
        "WDFC",
        "RAIL CORRIDOR"
      ]
    },
    {
      "district": "National Highway Multi-State Corridor",
      "coords": [
        23.5,
        78.5
      ],
      "keywords": [
        "MULTI-STATES",
        "INTERSTATE HIGHWAY",
        "BHARATMALA",
        "CORRIDOR"
      ]
    },
    {
      "district": "National Energy & Gas Grid",
      "coords": [
        24.0,
        80.0
      ],
      "keywords": [
        "GAS GRID",
        "POWERGRID",
        "INTERSTATE TRANSMISSION",
        "GREEN ENERGY CORRIDOR"
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
  if (sUpper.includes("MANIPUR")) return "MANIPUR";
  if (sUpper.includes("MIZORAM")) return "MIZORAM";
  if (sUpper.includes("NAGALAND")) return "NAGALAND";
  if (sUpper.includes("ARUNACHAL")) return "ARUNACHAL PRADESH";
  if (sUpper.includes("MEGHALAYA")) return "MEGHALAYA";
  if (sUpper.includes("TRIPURA")) return "TRIPURA";
  if (sUpper.includes("LADAKH")) return "LADAKH";
  if (sUpper.includes("GOA")) return "GOA";

  for (const k of Object.keys(STATE_DISTRICTS_MAP)) {
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
  project: { id?: string; project_name?: string; state?: string; sector?: string; district?: string | null; latitude?: number | null; longitude?: number | null },
  index: number = 0
): { state: string; district: string; coords: [number, number]; category: string } {
  const rawState = project.state || "Delhi";
  const stKey = normalizeStateName(rawState);
  const distList = STATE_DISTRICTS_MAP[stKey] || STATE_DISTRICTS_MAP["MULTI-STATE"];

  // 1. If project already has valid coordinates from database
  if (project.latitude != null && project.longitude != null && !isNaN(project.latitude) && !isNaN(project.longitude)) {
    // Find matching district if present
    let matchedDist = project.district || distList[0]?.district || "Main District";
    return {
      state: rawState,
      district: matchedDist,
      coords: [project.latitude, project.longitude],
      category: project.sector || "Infrastructure",
    };
  }

  // 2. Search project title strictly in that state's district keyword list
  const pUpper = (project.project_name || "").toUpperCase();
  let matched = distList.find((d) => d.keywords?.some((kw) => pUpper.includes(kw)));
  if (!matched) {
    matched = distList[index % distList.length];
  }

  const angle = (index * 137.5 * Math.PI) / 180.0;
  const radius = ((index % 12) + 1) * 0.0018;
  const lat = matched.coords[0] + radius * Math.cos(angle);
  const lng = matched.coords[1] + radius * Math.sin(angle);

  return {
    state: rawState,
    district: matched.district,
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
      });
    }

    const item = map.get(distName)!;
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

export const STATE_DISTRICTS_DATA: Record<string, any[]> = STATE_DISTRICTS_MAP;
export const STATE_DISTRICT_PLACES: Record<string, any[]> = {};
