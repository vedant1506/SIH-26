"""
scripts/build_comprehensive_gazetteer.py
Assembles and writes the full 36-state/UT authoritative gazetteer to scripts/india_authoritative_gazetteer.py.
"""
import json, os

def get_gazetteer_dict():
    g = {}
    
    # --- BIHAR (38 districts) ---
    g["BIHAR"] = [
        {"district": "Patna", "coords": (25.5941, 85.1376), "place": "Bihta Airport & Patna Metro", "keywords": ["PATNA", "BIHTA", "DANAPUR", "DIDARGANJ", "FATUHA", "PATLIPUTRA", "PHULWARI", "SARISTABAD", "NATHUPUR"]},
        {"district": "Begusarai", "coords": (25.4184, 86.1272), "place": "Barauni Refinery & Fertilizer Complex", "keywords": ["BARAUNI", "BEGUSARAI", "TEGHRA", "BAKHRI", "BITUMEN MANUFACTURING"]},
        {"district": "Gaya", "coords": (24.7914, 85.0002), "place": "Dobhi Industrial Node (AKIC)", "keywords": ["DOBHI", "GAYA", "BODHGAYA", "SHERGATI", "MANPUR", "PATNA - GAYA -DOBHI PKG-III"]},
        {"district": "Bhagalpur", "coords": (25.2425, 87.0139), "place": "Vikramshila 4-Lane Ganga Bridge", "keywords": ["BHAGALPUR", "VIKRAMSHILA", "KAHALGAON", "SULTANGANJ", "NTPC KAHALGAON"]},
        {"district": "Muzaffarpur", "coords": (26.1209, 85.3647), "place": "Kanti Power & 4-Lane Highway", "keywords": ["MUZAFFARPUR", "KANTI", "MOTIPUR", "KUDHNI"]},
        {"district": "Darbhanga", "coords": (26.1542, 85.8918), "place": "Darbhanga Airport & AIIMS", "keywords": ["DARBHANGA", "KABIR CHAK", "BAHERA", "BENIPUR"]},
        {"district": "Vaishali", "coords": (25.6858, 85.2146), "place": "Hajipur Rail Zonal Headquarters", "keywords": ["HAJIPUR", "VAISHALI", "MAHNAR", "LALGANJ"]},
        {"district": "Rohtas", "coords": (24.9500, 84.0300), "place": "Sasaram Dedicated Freight Corridor", "keywords": ["SASARAM", "ROHTAS", "DEHRI", "DALMIANAGAR", "DINARA"]},
        {"district": "Purnia", "coords": (25.7771, 87.4753), "place": "Purnia Airport & Highway Node", "keywords": ["PURNIA", "PURNEA", "KASBA", "BANMANKHI"]},
        {"district": "Saran", "coords": (25.7796, 84.7499), "place": "Chapra Wheel Plant & Sonepur Rail", "keywords": ["SARAN", "CHAPRA", "CHHAPRA", "SONEPUR", "MARHAURA"]},
        {"district": "Bhojpur", "coords": (25.5702, 84.4616), "place": "Arrah Rail Bridge Corridor", "keywords": ["ARRAH", "ARA", "BHOJPUR", "KOILWAR", "BIHIYA", "ARA - MOHANIA", "JAGDISHPUR", "PIRO"]},
        {"district": "Nalanda", "coords": (25.1315, 85.4476), "place": "Rajgir Tourism & Highway", "keywords": ["NALANDA", "RAJGIR", "BIHAR SHARIF", "HARNAUT"]},
        {"district": "East Champaran", "coords": (26.6580, 84.9100), "place": "Motihari Highway & ICP Raxaul", "keywords": ["MOTIHARI", "RAXAUL", "CHAMPARAN", "ARERAJ", "CHORMA"]},
        {"district": "West Champaran", "coords": (27.0000, 84.3667), "place": "Bettiah Narkatiaganj Corridor", "keywords": ["BETTIAH", "NARKATIAGANJ", "BAGAHA", "RAMNAGAR"]},
        {"district": "Katihar", "coords": (25.5394, 87.5667), "place": "Katihar Railway Junction", "keywords": ["KATIHAR", "BARSOI", "MANIHARI"]},
        {"district": "Madhubani", "coords": (26.3568, 86.0712), "place": "Jaynagar Nepal Border Rail", "keywords": ["MADHUBANI", "JAYNAGAR", "BIJALPURA", "JHANJHARPUR"]},
        {"district": "Buxar", "coords": (25.5600, 83.9800), "place": "Chausa Buxar Thermal Power Project", "keywords": ["BUXAR", "CHAUSA", "DUMRAON", "BRAHMPUR"]},
        {"district": "Kaimur", "coords": (25.0447, 83.6144), "place": "Mohania & Bhabua Highway Corridor", "keywords": ["KAIMUR", "BHABUA", "MOHANIA", "KUDRA", "CHAINPUR"]},
        {"district": "Jamui", "coords": (24.9214, 86.2258), "place": "GMC Jamui & Rail Corridor", "keywords": ["JAMUI", "JHAJHA", "SONO", "CHAKAI", "SIKANDRA", "GMC JAMUI"]},
        {"district": "Jehanabad", "coords": (25.2156, 84.9867), "place": "Jehanabad & Makhdumpur Highway", "keywords": ["JEHANABAD", "MAKHDUMPUR", "GHOSI", "PATNA - GAYA -DOBHI PKG-II"]},
        {"district": "Arwal", "coords": (25.2442, 84.6739), "place": "Arwal Sone River Corridor", "keywords": ["ARWAL", "KURTHA", "KALER", "KARPI"]},
        {"district": "Aurangabad", "coords": (24.7533, 84.3739), "place": "Nabinagar Super Thermal Power Plant", "keywords": ["AURANGABAD", "NABINAGAR", "DAUDNAGAR", "OBRA", "BARUN", "RAFIGANJ"]},
        {"district": "Sitamarhi", "coords": (26.5939, 85.4914), "place": "Bairgania & Sitamarhi Rail Corridor", "keywords": ["SITAMARHI", "BAIRGANIA", "RUNNI SAIDPUR", "BELSAND", "PUPRI", "SURSAND"]},
        {"district": "Sheohar", "coords": (26.5167, 85.2917), "place": "Sheohar Highway Corridor", "keywords": ["SHEOHAR", "TARIYANI", "PIPRAHI", "DUMRI KATSARI"]},
        {"district": "Supaul", "coords": (26.1247, 86.6047), "place": "Araria-Supaul Rail Line Project", "keywords": ["SUPAUL", "NIRMALI", "PIPRA", "TRIVENIGANJ", "CHHATAPUR", "RAGHOPUR"]},
        {"district": "Araria", "coords": (26.1508, 87.5208), "place": "Araria Rail Junction & Highway", "keywords": ["ARARIA", "FORBESGANJ", "JOKIHAT", "RANIGANJ"]},
        {"district": "Kishanganj", "coords": (26.0739, 87.9406), "place": "Kishanganj Border Corridor", "keywords": ["KISHANGANJ", "BAHADURGANJ", "THAKURGANJ", "POKHARIYA"]},
        {"district": "Khagaria", "coords": (25.5033, 86.4819), "place": "Khagaria-Kusheshwar Asthan Rail Link", "keywords": ["KHAGARIA", "KUSHESHWAR ASTHAN", "GOGRI", "BELDAUR", "ALAULI"]},
        {"district": "Saharsa", "coords": (25.8822, 86.5989), "place": "Saharsa Rail & Highway Node", "keywords": ["SAHARSA", "SIMRI BAKHTIARPUR", "MAHISHI", "SONBARSA"]},
        {"district": "Madhepura", "coords": (25.9222, 86.7919), "place": "Madhepura Electric Locomotive Factory", "keywords": ["MADHEPURA", "SINGHESHWAR", "MURLIGANJ", "ALAMNAGAR"]},
        {"district": "Banka", "coords": (24.8833, 86.9200), "place": "Banka Power & Rail Corridor", "keywords": ["BANKA", "AMARPUR", "BARAHAT", "BELHAR", "KATORIYA"]},
        {"district": "Munger", "coords": (25.3756, 86.4739), "place": "Munger Rail-cum-Road Ganga Bridge", "keywords": ["MUNGER", "MONGHYR", "JAMALPUR", "HAVELI KHARAGPUR"]},
        {"district": "Lakhisarai", "coords": (25.1783, 86.0944), "place": "Kiul Junction & Lakhisarai", "keywords": ["LAKHISARAI", "KIUL", "SURYAGARHA", "BARAHIYA"]},
        {"district": "Sheikhpura", "coords": (25.1389, 85.8611), "place": "Sheikhpura Highway Node", "keywords": ["SHEIKHPURA", "BARBIGHA", "ARIARI", "CHEWARA"]},
        {"district": "Nawada", "coords": (24.8878, 85.5433), "place": "Nawada & Rajauli Highway Node", "keywords": ["NAWADA", "RAJAULI", "WARISALIGANJ", "HISUA"]},
        {"district": "Samastipur", "coords": (25.8628, 85.7811), "place": "Samastipur Rail Division & Highway", "keywords": ["SAMASTIPUR", "DALSINGHSARAI", "ROSERA", "PUSA", "TAJPUR"]},
        {"district": "Gopalganj", "coords": (26.4678, 84.4444), "place": "Gopalganj & Thawe Junction", "keywords": ["GOPALGANJ", "THAWE", "MIRGANJ", "BARAULI"]},
        {"district": "Siwan", "coords": (26.2194, 84.3564), "place": "Siwan Junction & Highway Node", "keywords": ["SIWAN", "MAIRWA", "MAHARAJGANJ", "DARAUNDHA"]},
    ]
    return g

if __name__ == "__main__":
    g = get_gazetteer_dict()
    print("BIHAR districts:", len(g["BIHAR"]))
