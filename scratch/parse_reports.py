import os
import re
import json
import pypdf
from datetime import datetime

PDF_DIR = "data pdf"
OUTPUT_PATH = "scratch/parsed_projects_history.json"

STATES = [
    "DELHI", "MAHARASHTRA", "KARNATAKA", "TAMIL NADU", "WEST BENGAL",
    "UTTAR PRADESH", "GUJARAT", "RAJASTHAN", "TELANGANA", "ANDHRA PRADESH",
    "MADHYA PRADESH", "BIHAR", "ODISHA", "ASSAM", "PUNJAB", "HARYANA",
    "KERALA", "JHARKHAND", "CHHATTISGARH", "JAMMU & KASHMIR", "HIMACHAL PRADESH",
    "UTTARAKHAND", "GOA", "SIKKIM", "TRIPURA", "MEGHALAYA", "MIZORAM",
    "NAGALAND", "ARUNACHAL PRADESH", "MANIPUR", "ANDAMAN & NICOBAR", "PUDUCHERRY"
]

def get_report_date(filename):
    # Map filenames like FlashReport_January_2026.pdf or FlashReport_May2026.pdf to Date
    name = filename.replace("_", " ").replace("(", "").replace(")", "").replace("1", "").strip()
    match = re.search(r"([a-zA-Z]+)\s*(\d{4})", name)
    if match:
        month_str = match.group(1).title()
        year_str = match.group(2)
        try:
            dt = datetime.strptime(f"{month_str} {year_str}", "%B %Y")
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass
    # Default fallbacks
    if "April2026" in filename: return "2026-04-01"
    if "May2026" in filename: return "2026-05-01"
    return None

def clean_name(name):
    # Remove line breaks and clean whitespace
    name = re.sub(r"\s+", " ", name).strip()
    return name

def parse_pdf(filepath, report_date):
    print(f"Parsing {filepath} ({report_date})...")
    reader = pypdf.PdfReader(filepath)
    projects = []
    
    # Ingest and join the text of all pages containing Table 6
    page_texts = []
    for page_idx in range(53, len(reader.pages)):
        txt = reader.pages[page_idx].extract_text()
        if txt:
            page_texts.append(txt)
            
    full_text = "\n".join(page_texts)
    lines = [l.strip() for l in full_text.splitlines() if l.strip()]
    
    # Parse project blocks
    i = 0
    while i < len(lines):
        # Check if line is a Sl.No (starts a project block)
        if re.match(r"^\d+$", lines[i]):
            sl_no = int(lines[i])
            
            # Gather lines in this block until the next Sl.No or end of file
            block_lines = []
            j = i + 1
            while j < len(lines) and not re.match(r"^\d+$", lines[j]):
                block_lines.append(lines[j])
                j += 1
            
            # Analyze block lines
            if len(block_lines) >= 4:
                # Find Project ID (6-digit code in parentheses or alone)
                proj_id = None
                agency = ""
                state = None
                
                for idx, line in enumerate(block_lines):
                    id_match = re.search(r"\((\d{6})\)", line)
                    if id_match:
                        proj_id = id_match.group(1)
                        agency = block_lines[max(0, idx - 1)] if idx > 0 else ""
                        break
                    elif re.match(r"^\d{6}$", line):
                        proj_id = line
                        agency = block_lines[max(0, idx - 1)] if idx > 0 else ""
                        break
                
                if proj_id:
                    # Project name is everything before agency
                    name_end_idx = block_lines.index(agency) if agency in block_lines else 1
                    proj_name = clean_name(" ".join(block_lines[:name_end_idx]))
                    
                    # Find State
                    for line in block_lines:
                        for st in STATES:
                            if st in line.upper():
                                state = st
                                break
                        if state:
                            break
                    
                    # Extract dates
                    dates = []
                    last_date_idx = -1
                    for idx, line in enumerate(block_lines):
                        matches = re.findall(r"\d{2}/\d{4}", line)
                        if matches:
                            dates.extend(matches)
                            last_date_idx = idx

                    # Extract decimal numbers only from lines after the last date
                    nums = []
                    cost_lines = block_lines[last_date_idx + 1:] if last_date_idx != -1 else block_lines
                    for line in cost_lines:
                        matches = re.findall(r"[\d,]+\.\d+|\b\d{2}\b(?:\.\d+)?", line)
                        if not matches and not any(c in line for c in ["(", ")", "-"]):
                            break
                        for m in matches:
                            try:
                                val = float(m.replace(",", ""))
                                nums.append(val)
                            except ValueError:
                                continue

                    if len(nums) >= 2:
                        orig_cost = nums[0]
                        rev_cost = nums[1] if len(nums) > 2 else orig_cost
                        exp = nums[2] if len(nums) > 3 else (nums[1] if len(nums) == 3 else 0.0)
                        progress = nums[-1] if len(nums) >= 3 else 0.0
                        
                        projects.append({
                            "official_id": int(proj_id),
                            "project_name": proj_name,
                            "state": state or "NATIONAL PORTFOLIO",
                            "original_cost_cr": orig_cost,
                            "revised_cost_cr": rev_cost,
                            "cumulative_expenditure_cr": exp,
                            "physical_progress_pct": progress,
                            "dates": dates
                        })
            
            i = j - 1
        i += 1
            
    return projects

def main():
    all_history = {}
    
    # Process all PDFs
    files = sorted([f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")])
    for filename in files:
        report_date = get_report_date(filename)
        if not report_date:
            continue
            
        filepath = os.path.join(PDF_DIR, filename)
        projects = parse_pdf(filepath, report_date)
        
        for p in projects:
            pid = p["official_id"]
            if pid not in all_history:
                all_history[pid] = {
                    "official_id": pid,
                    "project_name": p["project_name"],
                    "state": p["state"],
                    "original_cost_cr": p["original_cost_cr"],
                    "timeline": {}
                }
            
            # Record timeline entry
            all_history[pid]["timeline"][report_date] = {
                "revised_cost_cr": p["revised_cost_cr"],
                "cumulative_expenditure_cr": p["cumulative_expenditure_cr"],
                "physical_progress_pct": p["physical_progress_pct"],
                "dates": p["dates"]
            }
            
    # Save output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(all_history, f, indent=2)
        
    print(f"\n[SUCCESS] Successfully parsed and aggregated {len(all_history)} unique projects across all PDFs!")

if __name__ == "__main__":
    main()
