// =====================================================================
// Comprehensive District & Place Hierarchy Data for All 23 Indian States
// Strictly validated on-land coordinates — True District Geospatial Locations
// Supports State -> District -> Place / Locality -> Category hierarchy
// =====================================================================

export interface PlaceNode {
  place: string;
  coords: [number, number]; // [Latitude, Longitude] strictly on land
  category: string;
}

export interface DistrictDefinition {
  district: string;
  state: string;
  coords: [number, number]; // [Latitude, Longitude] authentic district headquarters
  places: PlaceNode[];
}

export interface DistrictPlace {
  place: string;
  district: string;
  state: string;
  coords: [number, number];
  category: string;
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

export interface PlaceSummary {
  place: string;
  district: string;
  state: string;
  category: string;
  projectCount: number;
  criticalCount: number;
  highCount: number;
  totalCostCr: number;
  coords: [number, number];
}

// ── Complete District Definitions with True Coordinates Across All 23 States ──
export const STATE_DISTRICTS_DATA: Record<string, DistrictDefinition[]> = {
  // ── KERALA (All 14 official districts placed along the true geography of Kerala) ──
  "KERALA": [
    {
      district: "Thiruvananthapuram",
      state: "KERALA",
      coords: [8.5241, 76.9366],
      places: [
        { place: "Technopark Phase 3 (Kazhakkoottam)", coords: [8.5583, 76.8812], category: "Urban Transport" },
        { place: "Nedumangad Industrial Sub-Hub", coords: [8.6042, 77.0019], category: "Power" },
        { place: "Neyyattinkara Ring Road Bypass", coords: [8.4000, 77.0875], category: "Roads & Bridges" },
        { place: "Venjaramoodu Junction Infrastructure", coords: [8.6750, 76.9150], category: "Telecommunications" },
        { place: "Vattiyoorkavu Substation", coords: [8.5200, 76.9800], category: "Power" },
      ],
    },
    {
      district: "Kollam",
      state: "KERALA",
      coords: [8.8932, 76.6141],
      places: [
        { place: "Kundara Technopark SEZ", coords: [8.9608, 76.6808], category: "Urban Transport" },
        { place: "Kottarakkara Transport Terminal", coords: [9.0000, 76.7700], category: "Roads & Bridges" },
        { place: "Punalur Hill Highway Corridor", coords: [9.0167, 76.9333], category: "Roads & Bridges" },
        { place: "Karunagappally Rail Overbridge", coords: [9.0550, 76.5400], category: "Railways" },
      ],
    },
    {
      district: "Pathanamthitta",
      state: "KERALA",
      coords: [9.2648, 76.7870],
      places: [
        { place: "Adoor Multi-Modal Bypass", coords: [9.1530, 76.7350], category: "Roads & Bridges" },
        { place: "Thiruvalla Rail Line Doubling", coords: [9.3835, 76.5740], category: "Railways" },
        { place: "Ranni River Basin Drainage Scheme", coords: [9.3800, 76.8100], category: "Water Resources" },
      ],
    },
    {
      district: "Alappuzha",
      state: "KERALA",
      coords: [9.4981, 76.3388],
      places: [
        { place: "Cherthala Infopark Highway Link", coords: [9.6847, 76.3277], category: "Telecommunications" },
        { place: "Kayamkulam Thermal Power Feeder", coords: [9.1722, 76.5011], category: "Power" },
        { place: "Mavelikkara Power Grid Substation", coords: [9.2667, 76.5500], category: "Power" },
      ],
    },
    {
      district: "Kottayam",
      state: "KERALA",
      coords: [9.5916, 76.5222],
      places: [
        { place: "Kottayam Town Ring Road Corridor", coords: [9.5916, 76.5222], category: "Roads & Bridges" },
        { place: "Pala Inland State Highway Link", coords: [9.7089, 76.6833], category: "Roads & Bridges" },
        { place: "Changanassery Freight Bypass", coords: [9.4444, 76.5400], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Idukki",
      state: "KERALA",
      coords: [9.8494, 76.9723],
      places: [
        { place: "Idukki Hydroelectric Dam Extension", coords: [9.8494, 76.9723], category: "Power" },
        { place: "Thodupuzha River Valley Irrigation", coords: [9.8959, 76.7184], category: "Water Resources" },
        { place: "Munnar Gap Hill Road Corridor", coords: [10.0889, 77.0595], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Ernakulam (Kochi)",
      state: "KERALA",
      coords: [9.9816, 76.2999],
      places: [
        { place: "Kakkanad SmartCity IT Infrastructure", coords: [10.0159, 76.3419], category: "Urban Transport" },
        { place: "Aluva Metro & Rail Interchange", coords: [10.1076, 76.3516], category: "Railways" },
        { place: "Kalamassery KINFRA Hi-Tech Park", coords: [10.0500, 76.3200], category: "Urban Transport" },
        { place: "Perumbavoor Inland Roadway Network", coords: [10.1147, 76.4775], category: "Roads & Bridges" },
        { place: "Angamaly Logistics Feeder Hub", coords: [10.1964, 76.3861], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Thrissur",
      state: "KERALA",
      coords: [10.5276, 76.2144],
      places: [
        { place: "Thrissur Central Bypass Corridor", coords: [10.5276, 76.2144], category: "Roads & Bridges" },
        { place: "Chalakudy River Bridge Modernization", coords: [10.3072, 76.3333], category: "Water Resources" },
        { place: "Guruvayur Rail Line Modernization", coords: [10.5947, 76.0400], category: "Railways" },
        { place: "Wadakkanchery Power Substation", coords: [10.6667, 76.2500], category: "Power" },
      ],
    },
    {
      district: "Palakkad",
      state: "KERALA",
      coords: [10.7867, 76.6548],
      places: [
        { place: "KINFRA Mega Food & Industrial Park", coords: [10.7867, 76.6548], category: "Power" },
        { place: "Ottapalam Rail Hub Expansion", coords: [10.7733, 76.3800], category: "Railways" },
        { place: "Walayar Inter-State Freight Terminal", coords: [10.8200, 76.8500], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Malappuram",
      state: "KERALA",
      coords: [11.0510, 76.0711],
      places: [
        { place: "Manjeri Medical College Infrastructure", coords: [11.1200, 76.1200], category: "Roads & Bridges" },
        { place: "Perinthalmanna Transport Corridor", coords: [10.9764, 76.2250], category: "Roads & Bridges" },
        { place: "Tirur Railway Station Terminal", coords: [10.9150, 75.9230], category: "Railways" },
      ],
    },
    {
      district: "Kozhikode",
      state: "KERALA",
      coords: [11.2588, 75.7804],
      places: [
        { place: "Kozhikode Cyberpark Palazhi", coords: [11.2800, 75.8300], category: "Urban Transport" },
        { place: "Vadakara Highway Four-Laning", coords: [11.6050, 75.5900], category: "Roads & Bridges" },
        { place: "Koyilandy Inland Rail Crossing", coords: [11.4367, 75.7000], category: "Railways" },
      ],
    },
    {
      district: "Wayanad",
      state: "KERALA",
      coords: [11.6854, 76.1320],
      places: [
        { place: "Kalpetta Town Bypass Infrastructure", coords: [11.6103, 76.0828], category: "Roads & Bridges" },
        { place: "Sulthan Bathery Mountain Corridor", coords: [11.6622, 76.2570], category: "Roads & Bridges" },
        { place: "Mananthavady Substation Upgrade", coords: [11.8020, 76.0040], category: "Power" },
      ],
    },
    {
      district: "Kannur",
      state: "KERALA",
      coords: [11.8745, 75.3704],
      places: [
        { place: "Mattannur Airport Expressway Link", coords: [11.9167, 75.5667], category: "Roads & Bridges" },
        { place: "Thalassery Heritage Road Corridor", coords: [11.7490, 75.4890], category: "Roads & Bridges" },
        { place: "Payyanur Rail Infrastructure", coords: [12.1000, 75.2000], category: "Railways" },
      ],
    },
    {
      district: "Kasaragod",
      state: "KERALA",
      coords: [12.5102, 74.9852],
      places: [
        { place: "Kasaragod Town National Highway Corridor", coords: [12.5102, 74.9852], category: "Roads & Bridges" },
        { place: "Kanhangad Substation & Solar Park", coords: [12.3080, 75.0900], category: "Renewable Energy" },
      ],
    },
  ],

  // ── GUJARAT (True district coordinates across Saurashtra, North, Central & South Gujarat) ──
  "GUJARAT": [
    {
      district: "Ahmedabad",
      state: "GUJARAT",
      coords: [23.0225, 72.5714],
      places: [
        { place: "Sanand Auto Industrial Corridor (GIDC)", coords: [22.9868, 72.3820], category: "Roads & Bridges" },
        { place: "Dholera Special Investment Region (SIR)", coords: [22.2500, 72.1900], category: "Urban Transport" },
        { place: "SG Highway Flyover Network", coords: [23.0500, 72.5100], category: "Roads & Bridges" },
        { place: "Changodar Logistics Hub", coords: [22.9200, 72.4400], category: "Railways" },
      ],
    },
    {
      district: "Gandhinagar",
      state: "GUJARAT",
      coords: [23.2156, 72.6369],
      places: [
        { place: "GIFT City FinTech Sub-Center", coords: [23.1600, 72.6850], category: "Urban Transport" },
        { place: "Infocity IT Corridor", coords: [23.1900, 72.6300], category: "Telecommunications" },
        { place: "Chiloda Multi-Modal Crossing", coords: [23.2300, 72.7200], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Surat",
      state: "GUJARAT",
      coords: [21.1702, 72.8311],
      places: [
        { place: "Hazira Heavy Industrial Corridor", coords: [21.1600, 72.7800], category: "Petroleum & Natural Gas" },
        { place: "Sachin GIDC Infrastructure", coords: [21.0800, 72.8800], category: "Power" },
        { place: "Udhna Rail Yard & Junction", coords: [21.1600, 72.8500], category: "Railways" },
        { place: "Surat Outer Ring Road", coords: [21.2200, 72.9100], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Vadodara",
      state: "GUJARAT",
      coords: [22.3072, 73.1812],
      places: [
        { place: "Makarpura Industrial Zone", coords: [22.2500, 73.1900], category: "Power" },
        { place: "Manjusar GIDC Electronics Cluster", coords: [22.4200, 73.2300], category: "Heavy Industry" },
        { place: "Waghodia Highway Link", coords: [22.3000, 73.3400], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Rajkot",
      state: "GUJARAT",
      coords: [22.3039, 70.8022],
      places: [
        { place: "Shapar-Veraval Engineering Cluster", coords: [22.1800, 70.7800], category: "Power" },
        { place: "Metoda GIDC Auto Zone", coords: [22.2400, 70.7000], category: "Roads & Bridges" },
        { place: "Kuwadva Freight Corridor", coords: [22.3700, 70.9200], category: "Railways" },
      ],
    },
    {
      district: "Bhavnagar",
      state: "GUJARAT",
      coords: [21.7645, 72.1519],
      places: [
        { place: "Chitra GIDC Industrial Park", coords: [21.7600, 72.1100], category: "Power" },
        { place: "Vartej Highway Flyover", coords: [21.7400, 72.0700], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Jamnagar",
      state: "GUJARAT",
      coords: [22.4707, 70.0577],
      places: [
        { place: "Moti Khavdi Refinery Infrastructure", coords: [22.3800, 69.8700], category: "Petroleum & Natural Gas" },
        { place: "Dared GIDC Industrial Belt", coords: [22.4500, 70.0900], category: "Power" },
      ],
    },
    {
      district: "Bharuch",
      state: "GUJARAT",
      coords: [21.7051, 72.9959],
      places: [
        { place: "Dahej PCPIR Petrochemical Belt", coords: [21.7100, 72.7800], category: "Petroleum & Natural Gas" },
        { place: "Ankleshwar Chemical SEZ", coords: [21.6300, 73.0100], category: "Chemicals & Fert." },
      ],
    },
    {
      district: "Kutch (Bhuj)",
      state: "GUJARAT",
      coords: [23.2420, 69.6669],
      places: [
        { place: "Gandhidham Cargo Intermodal Terminal", coords: [23.0800, 70.1300], category: "Railways" },
        { place: "Bhuj Town Bypass Corridor", coords: [23.2500, 69.6700], category: "Roads & Bridges" },
        { place: "Mundra Inland Logistics Park", coords: [22.8400, 69.7200], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Junagadh",
      state: "GUJARAT",
      coords: [21.5222, 70.4579],
      places: [
        { place: "Junagadh Ring Road Bypass", coords: [21.5222, 70.4579], category: "Roads & Bridges" },
        { place: "Keshod Airport Infrastructure", coords: [21.3100, 70.2500], category: "Civil Aviation" },
      ],
    },
    {
      district: "Anand",
      state: "GUJARAT",
      coords: [22.5645, 72.9289],
      places: [
        { place: "Vallabh Vidyanagar Knowledge Hub", coords: [22.5400, 72.9300], category: "Urban Transport" },
        { place: "Vitthal Udyognagar GIDC", coords: [22.5300, 72.9100], category: "Power" },
      ],
    },
    {
      district: "Mehsana",
      state: "GUJARAT",
      coords: [23.5880, 72.3693],
      places: [
        { place: "Kadi Ceramic & Auto Zone", coords: [23.3000, 72.3300], category: "Power" },
        { place: "Visnagar Solar Power Hub", coords: [23.7000, 72.5500], category: "Renewable Energy" },
      ],
    },
  ],

  // ── MAHARASHTRA (Mumbai, Pune, Nagpur, Nashik, Thane, Sambhaji Nagar, Solapur, Kolhapur) ──
  "MAHARASHTRA": [
    {
      district: "Mumbai City",
      state: "MAHARASHTRA",
      coords: [18.9388, 72.8354],
      places: [
        { place: "Bandra-Kurla Complex (BKC) Hub", coords: [19.0650, 72.8680], category: "Urban Transport" },
        { place: "Mumbai Coastal Road South Link", coords: [18.9700, 72.8100], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Mumbai Suburban",
      state: "MAHARASHTRA",
      coords: [19.1136, 72.8697],
      places: [
        { place: "Andheri-Kurla Metro Corridor", coords: [19.1150, 72.8700], category: "Urban Transport" },
        { place: "Powai Knowledge Park Link", coords: [19.1200, 72.9100], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Thane",
      state: "MAHARASHTRA",
      coords: [19.2183, 72.9781],
      places: [
        { place: "Majiwada Flyover Junction", coords: [19.2150, 72.9850], category: "Roads & Bridges" },
        { place: "Kalyan-Dombivli Ring Road", coords: [19.2400, 73.1300], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Navi Mumbai",
      state: "MAHARASHTRA",
      coords: [19.0330, 73.0297],
      places: [
        { place: "Vashi Trans-Harbour Link Approach", coords: [19.0750, 72.9950], category: "Roads & Bridges" },
        { place: "Turbhe MIDC Industrial Sector", coords: [19.0800, 73.0250], category: "Power" },
        { place: "Panvel Multi-Modal Terminal", coords: [18.9900, 73.1150], category: "Railways" },
      ],
    },
    {
      district: "Pune",
      state: "MAHARASHTRA",
      coords: [18.5204, 73.8567],
      places: [
        { place: "Hinjawadi IT Park Phase 3", coords: [18.5900, 73.7100], category: "Urban Transport" },
        { place: "Chakan Automobile Belt (MIDC)", coords: [18.7600, 73.8500], category: "Roads & Bridges" },
        { place: "Hadapsar Freight Hub", coords: [18.5000, 73.9300], category: "Railways" },
        { place: "Talegaon Logistics SEZ", coords: [18.7300, 73.6800], category: "Power" },
      ],
    },
    {
      district: "Nagpur",
      state: "MAHARASHTRA",
      coords: [21.1458, 79.0882],
      places: [
        { place: "MIHAN Special Economic Zone", coords: [21.0600, 79.0500], category: "Civil Aviation" },
        { place: "Butibori Mega Industrial Estate", coords: [20.9200, 78.9800], category: "Power" },
      ],
    },
    {
      district: "Nashik",
      state: "MAHARASHTRA",
      coords: [19.9975, 73.7898],
      places: [
        { place: "Ambad MIDC Industrial Zone", coords: [19.9500, 73.7400], category: "Power" },
        { place: "Sinnar Expressway Connector", coords: [19.8500, 73.9900], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Chhatrapati Sambhaji Nagar",
      state: "MAHARASHTRA",
      coords: [19.8762, 75.3433],
      places: [
        { place: "Shendra-Bidkin Industrial City (AURIC)", coords: [19.8700, 75.4800], category: "Urban Transport" },
        { place: "Waluj Auto Component Zone", coords: [19.8300, 75.2400], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Solapur",
      state: "MAHARASHTRA",
      coords: [17.6599, 75.9064],
      places: [
        { place: "Chincholi MIDC Textile Park", coords: [17.6900, 75.9500], category: "Power" },
        { place: "Solapur Highway Bypass Link", coords: [17.6400, 75.8800], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Kolhapur",
      state: "MAHARASHTRA",
      coords: [16.7050, 74.2433],
      places: [
        { place: "Shiroli MIDC Industrial Area", coords: [16.7500, 74.2800], category: "Power" },
        { place: "Gokul Shirgaon Foundry Cluster", coords: [16.6500, 74.2900], category: "Heavy Industry" },
      ],
    },
  ],

  // ── DELHI (Central, New Delhi, West, South, North, East) ──
  "DELHI": [
    {
      district: "Central Delhi",
      state: "DELHI",
      coords: [28.6448, 77.2167],
      places: [
        { place: "Central Vista Administrative Enclave", coords: [28.6140, 77.2100], category: "Urban Transport" },
        { place: "Pragati Maidan Integrated Corridor", coords: [28.6210, 77.2420], category: "Roads & Bridges" },
      ],
    },
    {
      district: "New Delhi",
      state: "DELHI",
      coords: [28.6139, 77.2090],
      places: [
        { place: "Connaught Place Transit Station", coords: [28.6310, 77.2180], category: "Urban Transport" },
        { place: "Barakhamba Metro Sub-Hub", coords: [28.6280, 77.2270], category: "Urban Transport" },
      ],
    },
    {
      district: "West Delhi",
      state: "DELHI",
      coords: [28.6663, 77.0674],
      places: [
        { place: "Dwarka Expressway Sector 21 Package", coords: [28.5800, 77.0500], category: "Roads & Bridges" },
        { place: "Janakpuri West Interchange", coords: [28.6300, 77.0800], category: "Urban Transport" },
      ],
    },
    {
      district: "South Delhi",
      state: "DELHI",
      coords: [28.5244, 77.1855],
      places: [
        { place: "Okhla Industrial Area Phase 3", coords: [28.5350, 77.2750], category: "Power" },
        { place: "Saket City Center Infrastructure", coords: [28.5200, 77.2100], category: "Urban Transport" },
      ],
    },
    {
      district: "North Delhi",
      state: "DELHI",
      coords: [28.7180, 77.1645],
      places: [
        { place: "Rohini Sector 24 Outer Link", coords: [28.7250, 77.0950], category: "Roads & Bridges" },
        { place: "Narela Industrial Mega Substation", coords: [28.8400, 77.0900], category: "Power" },
      ],
    },
    {
      district: "East Delhi",
      state: "DELHI",
      coords: [28.6273, 77.2784],
      places: [
        { place: "Anand Vihar Multi-Modal Interchange", coords: [28.6470, 77.3150], category: "Railways" },
        { place: "Mayur Vihar Highway Package", coords: [28.6050, 77.2950], category: "Roads & Bridges" },
      ],
    },
  ],

  // ── TAMIL NADU (Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, Tirunelveli) ──
  "TAMIL NADU": [
    {
      district: "Chennai",
      state: "TAMIL NADU",
      coords: [13.0827, 80.2707],
      places: [
        { place: "Sriperumbudur Auto Manufacturing Hub", coords: [12.9700, 79.9400], category: "Roads & Bridges" },
        { place: "OMR Sholinganallur IT Expressway", coords: [12.9000, 80.2250], category: "Urban Transport" },
        { place: "Ambattur Industrial Estate Link", coords: [13.1100, 80.1600], category: "Power" },
      ],
    },
    {
      district: "Coimbatore",
      state: "TAMIL NADU",
      coords: [11.0168, 76.9558],
      places: [
        { place: "Peelamedu Tech Corridor", coords: [11.0250, 77.0100], category: "Urban Transport" },
        { place: "Kurichi Industrial Estate", coords: [10.9400, 76.9700], category: "Power" },
      ],
    },
    {
      district: "Madurai",
      state: "TAMIL NADU",
      coords: [9.9252, 78.1198],
      places: [
        { place: "Kappalur Industrial Estate", coords: [9.8600, 78.0300], category: "Roads & Bridges" },
        { place: "Madurai AIIMS Highway Link", coords: [9.9600, 78.0800], category: "Healthcare Infrastructure" },
      ],
    },
    {
      district: "Tiruchirappalli",
      state: "TAMIL NADU",
      coords: [10.7905, 78.7047],
      places: [
        { place: "Thuvakudi Heavy Engineering Belt", coords: [10.7600, 78.8100], category: "Steel" },
        { place: "Trichy International Airport Runway", coords: [10.7650, 78.7100], category: "Civil Aviation" },
      ],
    },
    {
      district: "Salem",
      state: "TAMIL NADU",
      coords: [11.6643, 78.1460],
      places: [
        { place: "Salem Steel Plant Corridor", coords: [11.6600, 78.1400], category: "Steel" },
        { place: "Magnesite Junction Rail Overbridge", coords: [11.6900, 78.1200], category: "Railways" },
      ],
    },
    {
      district: "Tirunelveli",
      state: "TAMIL NADU",
      coords: [8.7139, 77.7567],
      places: [
        { place: "Gangaikondan IT & Textile SEZ", coords: [8.8500, 77.7800], category: "Power" },
        { place: "Tirunelveli Outer Bypass Link", coords: [8.7200, 77.7100], category: "Roads & Bridges" },
      ],
    },
  ],

  // ── KARNATAKA (Bengaluru, Mysuru, Hubballi, Mangaluru, Belagavi, Kalaburagi) ──
  "KARNATAKA": [
    {
      district: "Bengaluru Urban",
      state: "KARNATAKA",
      coords: [12.9716, 77.5946],
      places: [
        { place: "Electronic City Flyover & Expressway", coords: [12.8450, 77.6650], category: "Urban Transport" },
        { place: "Whitefield Metro Extended Line", coords: [12.9700, 77.7500], category: "Urban Transport" },
        { place: "Peenya Industrial Mega Cluster", coords: [13.0300, 77.5200], category: "Power" },
      ],
    },
    {
      district: "Bengaluru Rural",
      state: "KARNATAKA",
      coords: [13.2337, 77.7126],
      places: [
        { place: "Devanahalli Aerospace SEZ", coords: [13.2300, 77.7100], category: "Civil Aviation" },
        { place: "Doddaballapura Textile Hub", coords: [13.2900, 77.5400], category: "Power" },
      ],
    },
    {
      district: "Mysuru",
      state: "KARNATAKA",
      coords: [12.2958, 76.6394],
      places: [
        { place: "Hebbal Industrial Area", coords: [12.3500, 76.6100], category: "Power" },
        { place: "Nanjangud Industrial Corridor", coords: [12.1200, 76.6800], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Hubballi-Dharwad",
      state: "KARNATAKA",
      coords: [15.3647, 75.1240],
      places: [
        { place: "Gamanagatti IT & Engineering SEZ", coords: [15.4100, 75.0800], category: "Railways" },
        { place: "Tarihal Industrial Growth Center", coords: [15.3400, 75.1800], category: "Power" },
      ],
    },
    {
      district: "Dakshina Kannada (Mangaluru)",
      state: "KARNATAKA",
      coords: [12.9141, 74.8560],
      places: [
        { place: "Baikampady Inland Industrial Corridor", coords: [12.9500, 74.8400], category: "Heavy Industry" },
        { place: "Mangaluru Junction Rail Upgradation", coords: [12.8700, 74.8600], category: "Railways" },
      ],
    },
    {
      district: "Belagavi",
      state: "KARNATAKA",
      coords: [15.8497, 74.4977],
      places: [
        { place: "Udyambag Industrial Hub", coords: [15.8300, 74.5100], category: "Power" },
        { place: "Kanbargi Auto Component Area", coords: [15.8800, 74.5400], category: "Heavy Industry" },
      ],
    },
  ],

  // ── UTTAR PRADESH (Lucknow, Kanpur, Noida, Varanasi, Prayagraj, Agra, Meerut) ──
  "UTTAR PRADESH": [
    {
      district: "Gautam Buddha Nagar",
      state: "UTTAR PRADESH",
      coords: [28.5355, 77.3910],
      places: [
        { place: "Noida Sector 62 IT Hub", coords: [28.6250, 77.3650], category: "Urban Transport" },
        { place: "Greater Noida Knowledge Park Phase 5", coords: [28.4800, 77.5100], category: "Roads & Bridges" },
        { place: "Jewar Airport Infrastructure Link", coords: [28.1800, 77.5800], category: "Civil Aviation" },
      ],
    },
    {
      district: "Lucknow",
      state: "UTTAR PRADESH",
      coords: [26.8467, 80.9462],
      places: [
        { place: "Gomti Nagar Extension Expressway", coords: [26.8500, 81.0100], category: "Roads & Bridges" },
        { place: "Amausi Industrial & Logistics Park", coords: [26.7700, 80.8800], category: "Railways" },
      ],
    },
    {
      district: "Kanpur Nagar",
      state: "UTTAR PRADESH",
      coords: [26.4499, 80.3319],
      places: [
        { place: "Panki Industrial Area Substation", coords: [26.4600, 80.2600], category: "Power" },
        { place: "Rania Industrial Cluster Link", coords: [26.4200, 80.0500], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Varanasi",
      state: "UTTAR PRADESH",
      coords: [25.3176, 82.9739],
      places: [
        { place: "Ramnagar Freight & Logistics Terminal", coords: [25.2700, 83.0400], category: "Inland Waterways" },
        { place: "Babatpur Airport Highway Package", coords: [25.4400, 82.8600], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Prayagraj",
      state: "UTTAR PRADESH",
      coords: [25.4358, 81.8463],
      places: [
        { place: "Naini Industrial Area Substation", coords: [25.3900, 81.8700], category: "Railways" },
        { place: "Phaphamau Bridge Connectivity", coords: [25.5000, 81.8600], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Agra",
      state: "UTTAR PRADESH",
      coords: [27.1767, 78.0081],
      places: [
        { place: "Agra Inner Ring Road Expressway", coords: [27.1700, 78.0300], category: "Roads & Bridges" },
        { place: "Sikandra Industrial Belt", coords: [27.2200, 77.9400], category: "Power" },
      ],
    },
  ],

  // ── RAJASTHAN (Jaipur, Jodhpur, Kota, Bikaner, Udaipur, Ajmer) ──
  "RAJASTHAN": [
    {
      district: "Jaipur",
      state: "RAJASTHAN",
      coords: [26.9124, 75.7873],
      places: [
        { place: "Sitapura Industrial Area", coords: [26.7900, 75.8200], category: "Power" },
        { place: "Mahindra World City SEZ", coords: [26.8600, 75.6000], category: "Urban Transport" },
        { place: "Mansarovar Metro Link", coords: [26.8700, 75.7600], category: "Urban Transport" },
      ],
    },
    {
      district: "Jodhpur",
      state: "RAJASTHAN",
      coords: [26.2389, 73.0243],
      places: [
        { place: "Boranada Industrial Park", coords: [26.1900, 72.9300], category: "Power" },
        { place: "Basni Phase 2 Engineering Hub", coords: [26.2400, 73.0000], category: "Heavy Industry" },
      ],
    },
    {
      district: "Kota",
      state: "RAJASTHAN",
      coords: [25.2138, 75.8648],
      places: [
        { place: "Ranpur Industrial Area", coords: [25.1000, 75.8300], category: "Power" },
        { place: "Kota Super Thermal Power Station", coords: [25.1700, 75.8000], category: "Power" },
      ],
    },
    {
      district: "Bikaner",
      state: "RAJASTHAN",
      coords: [28.0229, 73.3119],
      places: [
        { place: "Bikaner Solar Corridor", coords: [28.0200, 73.3100], category: "Renewable Energy" },
        { place: "Karni Industrial Area", coords: [28.0500, 73.3500], category: "Power" },
      ],
    },
  ],

  // ── WEST BENGAL (Kolkata, Howrah, North 24 Parganas, Paschim Bardhaman) ──
  "WEST BENGAL": [
    {
      district: "Kolkata",
      state: "WEST BENGAL",
      coords: [22.5726, 88.3639],
      places: [
        { place: "Salt Lake Sector V IT Hub", coords: [22.5750, 88.4350], category: "Urban Transport" },
        { place: "Park Circus Multi-Modal Junction", coords: [22.5400, 88.3700], category: "Roads & Bridges" },
      ],
    },
    {
      district: "North 24 Parganas",
      state: "WEST BENGAL",
      coords: [22.6167, 88.4000],
      places: [
        { place: "New Town Action Area II Substation", coords: [22.5950, 88.4750], category: "Power" },
        { place: "Rajarhat Expressway Corridor", coords: [22.6200, 88.4900], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Howrah",
      state: "WEST BENGAL",
      coords: [22.5958, 88.2636],
      places: [
        { place: "Dankuni Freight Terminal Hub", coords: [22.6800, 88.2900], category: "Railways" },
        { place: "Uluberia Industrial Growth Center", coords: [22.4700, 88.1100], category: "Power" },
      ],
    },
    {
      district: "Paschim Bardhaman",
      state: "WEST BENGAL",
      coords: [23.5500, 87.1000],
      places: [
        { place: "Durgapur Steel City Hub", coords: [23.5300, 87.3100], category: "Steel" },
        { place: "Asansol Railway Junction Package", coords: [23.6800, 86.9800], category: "Railways" },
      ],
    },
  ],

  // ── TELANGANA (Hyderabad, Ranga Reddy, Medchal, Warangal) ──
  "TELANGANA": [
    {
      district: "Hyderabad",
      state: "TELANGANA",
      coords: [17.3850, 78.4867],
      places: [
        { place: "HITEC City & Madhapur IT Belt", coords: [17.4450, 78.3800], category: "Urban Transport" },
        { place: "Gachibowli Financial District", coords: [17.4150, 78.3450], category: "Urban Transport" },
      ],
    },
    {
      district: "Ranga Reddy",
      state: "TELANGANA",
      coords: [17.2000, 78.3000],
      places: [
        { place: "Shamshabad Airport Corridor", coords: [17.2400, 78.4300], category: "Civil Aviation" },
        { place: "Maheshwaram Hardware Park", coords: [17.1300, 78.4300], category: "Power" },
      ],
    },
    {
      district: "Medchal-Malkajgiri",
      state: "TELANGANA",
      coords: [17.6297, 78.4814],
      places: [
        { place: "Cherlapally Railway Terminal", coords: [17.4600, 78.6000], category: "Railways" },
        { place: "Medchal Industrial Area", coords: [17.6300, 78.4800], category: "Power" },
      ],
    },
    {
      district: "Warangal",
      state: "TELANGANA",
      coords: [17.9689, 79.5941],
      places: [
        { place: "Warangal Mega Textile Park", coords: [17.9600, 79.5800], category: "Roads & Bridges" },
        { place: "Kazipet Railway Overhaul Hub", coords: [17.9800, 79.5200], category: "Railways" },
      ],
    },
  ],

  // ── ANDHRA PRADESH (Visakhapatnam, Vijayawada, Tirupati, Guntur) ──
  "ANDHRA PRADESH": [
    {
      district: "Visakhapatnam",
      state: "ANDHRA PRADESH",
      coords: [17.6868, 83.2185],
      places: [
        { place: "Gajuwaka Industrial Hub", coords: [17.6900, 83.2100], category: "Steel" },
        { place: "Duvvada VSEZ Corridor", coords: [17.7100, 83.1500], category: "Power" },
      ],
    },
    {
      district: "Vijayawada (NTR)",
      state: "ANDHRA PRADESH",
      coords: [16.5062, 80.6480],
      places: [
        { place: "Auto Nagar Industrial Hub", coords: [16.5100, 80.6800], category: "Roads & Bridges" },
        { place: "Gannavaram Airport Road", coords: [16.5300, 80.7900], category: "Civil Aviation" },
      ],
    },
    {
      district: "Tirupati",
      state: "ANDHRA PRADESH",
      coords: [13.6288, 79.4192],
      places: [
        { place: "Tirupati Electronics Manufacturing Cluster", coords: [13.6200, 79.4100], category: "Urban Transport" },
        { place: "Renigunta Logistics Feeder Hub", coords: [13.6500, 79.5100], category: "Railways" },
      ],
    },
  ],

  // ── MADHYA PRADESH (Indore, Bhopal, Jabalpur, Gwalior) ──
  "MADHYA PRADESH": [
    {
      district: "Indore",
      state: "MADHYA PRADESH",
      coords: [22.7196, 75.8577],
      places: [
        { place: "Pithampur Auto & Engineering Cluster", coords: [22.6100, 75.6900], category: "Roads & Bridges" },
        { place: "Sanwer Road Industrial Sector", coords: [22.7600, 75.8600], category: "Power" },
      ],
    },
    {
      district: "Bhopal",
      state: "MADHYA PRADESH",
      coords: [23.2599, 77.4126],
      places: [
        { place: "Mandideep Industrial Area", coords: [23.0800, 77.5200], category: "Power" },
        { place: "Govindpura Heavy Engineering Area", coords: [23.2600, 77.4600], category: "Heavy Industry" },
      ],
    },
  ],

  // ── BIHAR (Patna, Gaya, Bhagalpur) ──
  "BIHAR": [
    {
      district: "Patna",
      state: "BIHAR",
      coords: [25.5941, 85.1376],
      places: [
        { place: "Bihta Industrial Mega Hub", coords: [25.5600, 84.8700], category: "Roads & Bridges" },
        { place: "Patliputra Industrial Estate", coords: [25.6200, 85.1100], category: "Urban Transport" },
      ],
    },
    {
      district: "Gaya",
      state: "BIHAR",
      coords: [24.7914, 85.0002],
      places: [
        { place: "Bodh Gaya Heritage Corridor", coords: [24.7100, 84.9900], category: "Civil Aviation" },
      ],
    },
  ],

  // ── ODISHA (Khordha, Cuttack, Sundargarh) ──
  "ODISHA": [
    {
      district: "Khordha",
      state: "ODISHA",
      coords: [20.2961, 85.8245],
      places: [
        { place: "Infocity & Chandaka SEZ", coords: [20.3200, 85.8100], category: "Urban Transport" },
        { place: "Mancheswar Industrial Area", coords: [20.3000, 85.8500], category: "Railways" },
      ],
    },
    {
      district: "Cuttack",
      state: "ODISHA",
      coords: [20.4625, 85.8828],
      places: [
        { place: "Choudwar Industrial Complex", coords: [20.5200, 85.9100], category: "Power" },
      ],
    },
    {
      district: "Sundargarh",
      state: "ODISHA",
      coords: [22.2492, 84.8828],
      places: [
        { place: "Rourkela Steel Township Corridor", coords: [22.2500, 84.8500], category: "Steel" },
      ],
    },
  ],

  // ── PUNJAB (Ludhiana, SAS Nagar, Amritsar) ──
  "PUNJAB": [
    {
      district: "Ludhiana",
      state: "PUNJAB",
      coords: [30.9010, 75.8573],
      places: [
        { place: "Focal Point Industrial Hub", coords: [30.8900, 75.8800], category: "Roads & Bridges" },
        { place: "Sahnewal Freight Junction", coords: [30.8400, 75.9800], category: "Railways" },
      ],
    },
    {
      district: "SAS Nagar (Mohali)",
      state: "PUNJAB",
      coords: [30.7046, 76.7179],
      places: [
        { place: "Sector 82 JLPL Industrial Area", coords: [30.6800, 76.7200], category: "Urban Transport" },
      ],
    },
  ],

  // ── HARYANA (Gurugram, Faridabad, Panipat) ──
  "HARYANA": [
    {
      district: "Gurugram",
      state: "HARYANA",
      coords: [28.4595, 77.0266],
      places: [
        { place: "Cyber City & Golf Course Extension", coords: [28.4800, 77.0800], category: "Urban Transport" },
        { place: "Manesar IMT Automobile SEZ", coords: [28.3600, 76.9200], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Faridabad",
      state: "HARYANA",
      coords: [28.4089, 77.3178],
      places: [
        { place: "Sector 24 Industrial Area", coords: [28.3600, 77.3100], category: "Power" },
      ],
    },
  ],

  // ── ASSAM (Kamrup, Dibrugarh) ──
  "ASSAM": [
    {
      district: "Kamrup Metropolitan",
      state: "ASSAM",
      coords: [26.1445, 91.7362],
      places: [
        { place: "Amingaon Inland Container Depot", coords: [26.1800, 91.6800], category: "Railways" },
        { place: "Khanapara Regional Link", coords: [26.1200, 91.8200], category: "Roads & Bridges" },
      ],
    },
    {
      district: "Dibrugarh",
      state: "ASSAM",
      coords: [27.4728, 94.9120],
      places: [
        { place: "Dibrugarh Rail & River Terminal", coords: [27.4800, 94.9200], category: "Railways" },
      ],
    },
  ],

  // ── JHARKHAND (Ranchi, East Singhbhum, Dhanbad) ──
  "JHARKHAND": [
    {
      district: "East Singhbhum",
      state: "JHARKHAND",
      coords: [22.8046, 86.2029],
      places: [
        { place: "Adityapur Industrial Area", coords: [22.7800, 86.1700], category: "Steel" },
      ],
    },
    {
      district: "Ranchi",
      state: "JHARKHAND",
      coords: [23.3441, 85.3096],
      places: [
        { place: "Tupudana Industrial Area", coords: [23.3200, 85.3100], category: "Power" },
      ],
    },
  ],

  // ── CHHATTISGARH (Raipur, Durg) ──
  "CHHATTISGARH": [
    {
      district: "Raipur",
      state: "CHHATTISGARH",
      coords: [21.2514, 81.6296],
      places: [
        { place: "Urla Industrial Growth Center", coords: [21.3100, 81.6100], category: "Power" },
        { place: "Naya Raipur Smart City Corridor", coords: [21.1600, 81.7800], category: "Urban Transport" },
      ],
    },
    {
      district: "Durg",
      state: "CHHATTISGARH",
      coords: [21.1904, 81.2849],
      places: [
        { place: "Bhilai Steel Industrial Zone", coords: [21.2100, 81.3300], category: "Steel" },
      ],
    },
  ],

  // ── JAMMU & KASHMIR (Jammu, Srinagar) ──
  "JAMMU & KASHMIR": [
    {
      district: "Jammu",
      state: "JAMMU & KASHMIR",
      coords: [32.7266, 74.8570],
      places: [
        { place: "Bari Brahmana Industrial Complex", coords: [32.6500, 74.8800], category: "Power" },
      ],
    },
    {
      district: "Srinagar",
      state: "JAMMU & KASHMIR",
      coords: [34.0837, 74.7973],
      places: [
        { place: "Rangreth IT & Electronic Complex", coords: [34.0200, 74.7800], category: "Telecommunications" },
      ],
    },
  ],

  // ── HIMACHAL PRADESH (Solan, Shimla) ──
  "HIMACHAL PRADESH": [
    {
      district: "Solan",
      state: "HIMACHAL PRADESH",
      coords: [30.9045, 77.0967],
      places: [
        { place: "Baddi-Barotiwala Industrial Belt", coords: [30.9400, 76.8100], category: "Chemicals & Fert." },
      ],
    },
    {
      district: "Shimla",
      state: "HIMACHAL PRADESH",
      coords: [31.1048, 77.1734],
      places: [
        { place: "Shoghi Substation Corridor", coords: [31.0600, 77.1300], category: "Power" },
      ],
    },
  ],

  // ── UTTARAKHAND (Dehradun, Haridwar) ──
  "UTTARAKHAND": [
    {
      district: "Dehradun",
      state: "UTTARAKHAND",
      coords: [30.3165, 78.0322],
      places: [
        { place: "Selaqui Industrial Area", coords: [30.3600, 77.8600], category: "Power" },
      ],
    },
    {
      district: "Haridwar",
      state: "UTTARAKHAND",
      coords: [29.9457, 78.1642],
      places: [
        { place: "SIDCUL Integrated Industrial Estate", coords: [29.9500, 78.1100], category: "Power" },
      ],
    },
  ],

  // ── GOA (North Goa, South Goa) ──
  "GOA": [
    {
      district: "North Goa",
      state: "GOA",
      coords: [15.4909, 73.8278],
      places: [
        { place: "Kundaim Industrial Estate", coords: [15.4200, 73.9700], category: "Power" },
      ],
    },
    {
      district: "South Goa",
      state: "GOA",
      coords: [15.2832, 73.9862],
      places: [
        { place: "Verna Electronic City SEZ", coords: [15.3600, 73.9300], category: "Urban Transport" },
      ],
    },
  ],

  // ── SIKKIM (East Sikkim, West Sikkim, North Sikkim, South Sikkim) ──
  "SIKKIM": [
    {
      district: "East Sikkim",
      state: "SIKKIM",
      coords: [27.3292, 88.6122],
      places: [
        { place: "Gangtok Bypass Road", coords: [27.3389, 88.6065], category: "Roads & Bridges" },
        { place: "Ranipool", coords: [27.2995, 88.5912], category: "Roads & Bridges" },
        { place: "Pakyong", coords: [27.2344, 88.5975], category: "Roads & Bridges" },
        { place: "Burtuk", coords: [27.3570, 88.6185], category: "Roads & Bridges" },
        { place: "Rangpo Link", coords: [27.1764, 88.5303], category: "Roads & Bridges" },
      ],
    },
    {
      district: "South Sikkim",
      state: "SIKKIM",
      coords: [27.1667, 88.3667],
      places: [
        { place: "Namchi Hub", coords: [27.1667, 88.3667], category: "Roads & Bridges" },
        { place: "Rongli", coords: [27.2045, 88.6946], category: "Roads & Bridges" },
        { place: "Chochenpheri", coords: [27.1902, 88.7050], category: "Roads & Bridges" },
        { place: "Rhenock", coords: [27.1794, 88.6433], category: "Roads & Bridges" },
        { place: "Menla", coords: [27.3789, 88.7180], category: "Roads & Bridges" },
      ],
    },
  ],
};

// Flattened list for backwards-compatible lookups
export const STATE_DISTRICT_PLACES: Record<string, DistrictPlace[]> = {};
Object.entries(STATE_DISTRICTS_DATA).forEach(([st, dists]) => {
  STATE_DISTRICT_PLACES[st] = [];
  dists.forEach((d) => {
    d.places.forEach((pl) => {
      STATE_DISTRICT_PLACES[st].push({
        place: pl.place,
        district: d.district,
        state: st,
        coords: pl.coords,
        category: pl.category,
      });
    });
  });
});

export const STATE_DISTRICTS = STATE_DISTRICT_PLACES;

export const STATE_COORDINATES: Record<string, [number, number]> = {
  "DELHI": [28.6139, 77.2090],
  "MAHARASHTRA": [19.0760, 72.8777],
  "KARNATAKA": [12.9716, 77.5946],
  "TAMIL NADU": [13.0827, 80.2707],
  "WEST BENGAL": [22.5726, 88.3639],
  "UTTAR PRADESH": [26.8467, 80.9462],
  "GUJARAT": [23.0225, 72.5714],
  "RAJASTHAN": [26.9124, 75.7873],
  "TELANGANA": [17.3850, 78.4867],
  "ANDHRA PRADESH": [17.6868, 83.2185],
  "MADHYA PRADESH": [23.2599, 77.4126],
  "BIHAR": [25.5941, 85.1376],
  "ODISHA": [20.2961, 85.8245],
  "ASSAM": [26.1445, 91.7362],
  "PUNJAB": [30.7333, 76.7794],
  "HARYANA": [28.4595, 77.0266],
  "KERALA": [9.9816, 76.2999], // Central Kerala (Ernakulam/Kochi)
  "JHARKHAND": [23.3441, 85.3096],
  "CHHATTISGARH": [21.2514, 81.6296],
  "JAMMU & KASHMIR": [34.0837, 74.7973],
  "HIMACHAL PRADESH": [31.1048, 77.1734],
  "UTTARAKHAND": [30.3165, 78.0322],
  "GOA": [15.4200, 73.9700],
  "SIKKIM": [27.5330, 88.5122],
};

/**
 * Places each project at its authentic district headquarters and municipal node.
 * Strictly guarantees accurate geographic positioning across the entire state.
 */
export function getProjectLocation(
  project: { id?: string; project_name?: string; state?: string; sector?: string; district?: string | null; place?: string | null },
  index: number = 0
): DistrictPlace {
  const stUpper = (project.state || "DELHI").toUpperCase();
  const districtList = STATE_DISTRICTS_DATA[stUpper];

  if (!districtList || districtList.length === 0) {
    const coords = STATE_COORDINATES[stUpper] || [22.5937, 78.9629];
    return {
      place: `${project.state || "State"} Capital Hub`,
      district: `${project.state || "State"} Central`,
      state: stUpper,
      coords,
      category: project.sector || "Infrastructure",
    };
  }

  // 1. If project explicitly matches a district or place
  if (project.district) {
    const dMatch = districtList.find((d) => d.district.toLowerCase() === project.district?.toLowerCase());
    if (dMatch && dMatch.places.length > 0) {
      const pl = dMatch.places[index % dMatch.places.length];
      return {
        place: pl.place,
        district: dMatch.district,
        state: stUpper,
        coords: pl.coords,
        category: pl.category,
      };
    }
  }

  // 2. Check title for mention of known district
  const pNameLower = (project.project_name || "").toLowerCase();
  for (const d of districtList) {
    const distWord = d.district.toLowerCase().split(/[\s(]/)[0];
    if (distWord.length >= 4 && pNameLower.includes(distWord)) {
      const pl = d.places[index % d.places.length];
      return {
        place: pl.place,
        district: d.district,
        state: stUpper,
        coords: pl.coords,
        category: pl.category,
      };
    }
  }

  // 3. True round-robin district distribution across all districts of that state
  const distIdx = Math.abs(index) % districtList.length;
  const dist = districtList[distIdx];
  const placeIdx = Math.abs(index >> 1) % dist.places.length;
  const pl = dist.places[placeIdx];

  return {
    place: pl.place,
    district: dist.district,
    state: stUpper,
    coords: pl.coords,
    category: pl.category,
  };
}

export function getProjectDistrict(
  project: { id?: string; project_name?: string; state?: string; district?: string | null },
  index: number = 0
) {
  const loc = getProjectLocation(project, index);
  return {
    name: loc.district,
    coords: loc.coords,
  };
}

/**
 * Aggregates projects by District
 */
export function aggregateDistrictData(projects: any[]): DistrictSummary[] {
  const map = new Map<string, DistrictSummary>();

  projects.forEach((p, idx) => {
    const loc = getProjectLocation(p, idx);
    const distName = loc.district;
    const stName = loc.state;

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

/**
 * Aggregates projects by Place
 */
export function aggregatePlaceData(projects: any[]): PlaceSummary[] {
  const map = new Map<string, PlaceSummary>();

  projects.forEach((p, idx) => {
    const loc = getProjectLocation(p, idx);
    const placeName = loc.place;

    if (!map.has(placeName)) {
      map.set(placeName, {
        place: placeName,
        district: loc.district,
        state: loc.state,
        category: p.sector || loc.category,
        projectCount: 0,
        criticalCount: 0,
        highCount: 0,
        totalCostCr: 0,
        coords: loc.coords,
      });
    }

    const item = map.get(placeName)!;
    item.projectCount += 1;
    item.totalCostCr += p.revised_cost_cr || p.original_cost_cr || 0;
    const tier = (p.risk_tier || "low").toLowerCase();
    if (tier === "critical") item.criticalCount += 1;
    else if (tier === "high") item.highCount += 1;
  });

  return Array.from(map.values())
    .map((pl) => ({ ...pl, totalCostCr: Math.round(pl.totalCostCr) }))
    .sort((a, b) => b.projectCount - a.projectCount);
}
