"""
Script to generate a comprehensive, publication-grade presentation briefing PDF for SIH 2026 teammates.
Generates an HTML document with professional print-ready CSS and compiles it to PDF using Microsoft Edge headless.
"""

import os
import sys
import base64
import subprocess
import pymupdf

def get_base64_image(image_path):
    if os.path.exists(image_path):
        with open(image_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
            ext = os.path.splitext(image_path)[1].lower().replace(".", "")
            if ext == "jpg":
                ext = "jpeg"
            return f"data:image/{ext};base64,{encoded}"
    return ""

def build_presentation_html(logo_base64=""):
    logo_tag = f"<img src='{logo_base64}' style='height: 42pt; max-width: 140pt; object-fit: contain;' />" if logo_base64 else "<div style='font-size: 20pt; font-weight: 900; color: #1e3a8a;'>⚡ PRISM</div>"
    
    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>PRISM - SIH 2026 Project Presentation & Briefing Guide</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {
    size: A4 portrait;
    margin: 14mm 14mm 16mm 14mm;
    @bottom-center {
      content: "PRISM · SIH 2026 · Project Presentation Briefing & Defense Guide";
      font-size: 8pt;
      color: #64748b;
    }
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background: #ffffff;
    font-size: 8.5pt;
    line-height: 1.42;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Utilities */
  .page-break {
    page-break-after: always;
    break-after: page;
  }

  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Typography */
  h1, h2, h3, h4, h5 {
    color: #0f172a;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  h1 { font-size: 19pt; line-height: 1.2; }
  h2 { 
    font-size: 12.5pt; 
    line-height: 1.3; 
    margin-top: 10pt; 
    margin-bottom: 5pt; 
    border-bottom: 1.5pt solid #e2e8f0; 
    padding-bottom: 3pt;
    display: flex;
    align-items: center;
    gap: 6pt;
  }
  h3 { font-size: 10pt; margin-top: 7pt; margin-bottom: 3pt; color: #1e3a8a; }
  h4 { font-size: 9pt; margin-top: 5pt; margin-bottom: 2pt; color: #334155; }
  p { margin-bottom: 4pt; }

  code, pre {
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 7.8pt;
  }

  code {
    background: #f1f5f9;
    padding: 1pt 3pt;
    border-radius: 3pt;
    color: #0f766e;
  }

  /* Cover Page */
  .cover-container {
    min-height: 94vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12mm 8mm;
    border: 1.5pt solid #cbd5e1;
    border-radius: 8pt;
    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 60%, #eff6ff 100%);
    position: relative;
  }

  .cover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2pt solid #1e3a8a;
    padding-bottom: 10pt;
  }

  .sih-badge-group {
    text-align: right;
  }

  .cover-title-block {
    margin-top: 25pt;
    margin-bottom: 15pt;
    text-align: center;
  }

  .project-acronym {
    font-size: 38pt;
    font-weight: 900;
    color: #1e3a8a;
    letter-spacing: -0.03em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8pt;
  }

  .project-tagline {
    font-size: 13pt;
    font-weight: 600;
    color: #2563eb;
    margin-top: 4pt;
  }

  .project-subtitle {
    font-size: 9.5pt;
    color: #475569;
    margin-top: 6pt;
    max-width: 88%;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.4;
  }

  .meta-chips {
    display: flex;
    justify-content: center;
    gap: 6pt;
    margin-top: 12pt;
    flex-wrap: wrap;
  }

  .chip {
    padding: 3pt 8pt;
    border-radius: 12pt;
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .chip-blue { background: #dbeafe; color: #1e40af; border: 0.5pt solid #93c5fd; }
  .chip-amber { background: #fef3c7; color: #92400e; border: 0.5pt solid #fcd34d; }
  .chip-green { background: #d1fae5; color: #065f46; border: 0.5pt solid #6ee7b7; }
  .chip-purple { background: #f3e8ff; color: #6b21a8; border: 0.5pt solid #d8b4fe; }

  /* Cover Stats Grid */
  .cover-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8pt;
    margin-top: 15pt;
    margin-bottom: 15pt;
  }

  .cover-stat-card {
    background: #ffffff;
    border: 1pt solid #cbd5e1;
    border-radius: 6pt;
    padding: 10pt 6pt;
    text-align: center;
    box-shadow: 0 1pt 3pt rgba(0,0,0,0.05);
  }

  .stat-value {
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
  }

  .stat-label {
    font-size: 7.2pt;
    color: #64748b;
    font-weight: 600;
    margin-top: 3pt;
    text-transform: uppercase;
  }

  .cover-footer {
    border-top: 1pt solid #cbd5e1;
    padding-top: 10pt;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 8pt;
    color: #475569;
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 1.5pt 5pt;
    border-radius: 3pt;
    font-size: 6.8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    vertical-align: middle;
  }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-blue { background: #e0e7ff; color: #3730a3; }
  .badge-slate { background: #f1f5f9; color: #334155; }

  /* Callout Boxes */
  .alert-box {
    padding: 5pt 9pt;
    border-radius: 4pt;
    margin: 5pt 0;
    font-size: 8pt;
    border-left: 3.5pt solid;
  }
  .alert-info { background: #f0f9ff; border-color: #0284c7; color: #0369a1; }
  .alert-warning { background: #fffbeb; border-color: #d97706; color: #92400e; }
  .alert-danger { background: #fef2f2; border-color: #dc2626; color: #991b1b; }
  .alert-success { background: #f0fdf4; border-color: #16a34a; color: #15803d; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 5pt 0;
    font-size: 7.8pt;
  }

  th, td {
    padding: 4pt 5.5pt;
    text-align: left;
    border: 0.5pt solid #cbd5e1;
  }

  th {
    background: #1e293b;
    color: #f8fafc;
    font-weight: 600;
    font-size: 7.8pt;
    letter-spacing: 0.02em;
  }

  tr:nth-child(even) {
    background: #f8fafc;
  }

  /* Grids and Cards */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7pt;
    margin: 5pt 0;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 5pt;
    margin: 5pt 0;
  }

  .card {
    background: #ffffff;
    border: 1pt solid #e2e8f0;
    border-radius: 4pt;
    padding: 6pt 8pt;
    box-shadow: 0 0.5pt 1.5pt rgba(0,0,0,0.03);
  }

  .card-header {
    font-weight: 700;
    color: #0f172a;
    font-size: 8.5pt;
    margin-bottom: 2.5pt;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* Slide Blueprint Cards */
  .slide-card {
    background: #ffffff;
    border: 1pt solid #cbd5e1;
    border-left: 3pt solid #2563eb;
    border-radius: 3.5pt;
    padding: 5pt 7pt;
    margin-bottom: 4.5pt;
  }

  .slide-title {
    font-weight: 700;
    color: #1e3a8a;
    font-size: 8.2pt;
    display: flex;
    justify-content: space-between;
  }

  /* QA Cards */
  .qa-card {
    background: #f8fafc;
    border: 1pt solid #e2e8f0;
    border-radius: 4pt;
    padding: 5.5pt 8pt;
    margin-bottom: 5pt;
  }

  .qa-q {
    font-weight: 700;
    color: #0f172a;
    font-size: 8.2pt;
    margin-bottom: 2.5pt;
    display: flex;
    align-items: flex-start;
    gap: 4pt;
  }

  .qa-q-num {
    background: #1e3a8a;
    color: #ffffff;
    font-size: 6.8pt;
    font-weight: 800;
    padding: 1pt 3.5pt;
    border-radius: 2pt;
    flex-shrink: 0;
    margin-top: 1pt;
  }

  .qa-a {
    font-size: 7.8pt;
    color: #334155;
    line-height: 1.38;
    padding-left: 16pt;
  }

  .qa-pro-tip {
    margin-top: 3pt;
    padding: 2.5pt 5pt;
    background: #eff6ff;
    border-radius: 2.5pt;
    font-size: 7.2pt;
    color: #1d4ed8;
    font-weight: 600;
  }

  /* Running Header */
  .running-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1pt solid #e2e8f0;
    padding-bottom: 3.5pt;
    margin-bottom: 7pt;
    font-size: 7.2pt;
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .running-header-right {
    color: #2563eb;
  }
</style>
</head>
<body>

<!-- ==================== PAGE 1: COVER PAGE ==================== -->
<div class="cover-container">
  <div class="cover-header">
    <div style="display: flex; align-items: center; gap: 8pt;">
      __LOGO_TAG__
      <div>
        <div style="font-size: 9pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Ministry of Statistics & Programme Implementation</div>
        <div style="font-size: 7.5pt; color: #64748b; font-weight: 600;">Government of India · Central Sector Infrastructure Monitoring</div>
      </div>
    </div>
    <div class="sih-badge-group">
      <div style="font-size: 10.5pt; font-weight: 800; color: #b45309;">SMART INDIA HACKATHON 2026</div>
      <div style="font-size: 8pt; font-weight: 700; color: #1e3a8a;">Problem Statement: SIH26103</div>
    </div>
  </div>

  <div class="cover-title-block">
    <div class="project-acronym">
      <span>⚡ PRISM</span>
    </div>
    <div class="project-tagline">Predictive Risk & Infrastructure Status Monitoring Platform</div>
    <div class="project-subtitle">
      Comprehensive Project Master Briefing, Architecture Blueprint, Live Demonstration Script, and Jury Q&A Defense Guide for SIH 2026 Teammates.
    </div>

    <div class="meta-chips">
      <span class="chip chip-blue">Enterprise GovTech</span>
      <span class="chip chip-purple">Dual XGBoost 2.0 + TreeSHAP</span>
      <span class="chip chip-amber">Dynamic S-Curve Analytics</span>
      <span class="chip chip-green">100% Inland Geospatial GIS</span>
      <span class="chip chip-blue">Next.js 16 + FastAPI ASGI</span>
    </div>
  </div>

  <div class="cover-stats-grid">
    <div class="cover-stat-card">
      <div class="stat-value" style="color: #1e3a8a;">1,981</div>
      <div class="stat-label">Monitored Mega-Projects</div>
      <div style="font-size: 6.5pt; color: #94a3b8; margin-top: 2pt;">MoSPI PAIMANA April 2026</div>
    </div>
    <div class="cover-stat-card">
      <div class="stat-value" style="color: #047857;">₹42.78L Cr</div>
      <div class="stat-label">Total Monitored Outlay</div>
      <div style="font-size: 6.5pt; color: #94a3b8; margin-top: 2pt;">Central Sector Capital Outlay</div>
    </div>
    <div class="cover-stat-card">
      <div class="stat-value" style="color: #b45309;">&lt; 40 sec</div>
      <div class="stat-label">160+ Page PDF Ingestion</div>
      <div style="font-size: 6.5pt; color: #94a3b8; margin-top: 2pt;">Table 6 Boundary Extraction</div>
    </div>
    <div class="cover-stat-card">
      <div class="stat-value" style="color: #b91c1c;">100%</div>
      <div class="stat-label">Inland Spatial Validity</div>
      <div style="font-size: 6.5pt; color: #94a3b8; margin-top: 2pt;">Survey of India Polygon Audit</div>
    </div>
  </div>

  <div class="alert-box alert-info avoid-break" style="text-align: center; font-size: 7.8pt;">
    <strong>🎯 Presentation Objective</strong>: This guide ensures every teammate has unified command of the technical architecture, live demo flows, slide strategy, and jury defense responses to achieve a winning presentation at SIH 2026.
  </div>

  <div class="cover-footer">
    <div>
      <div style="font-weight: 700; color: #0f172a;">Team PRISM (SIH 2026 Finalists)</div>
      <div style="font-size: 7pt; color: #64748b;">Repository: <code>github.com/vedant1506/SIH-26</code> · Production Release v2.0</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; color: #0f172a;">Date of Briefing: September 2026</div>
      <div style="font-size: 7pt; color: #64748b;">Ministry: MoSPI (Infrastructure & Project Monitoring Division)</div>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- ==================== PAGE 2: PROBLEM STATEMENT & EXECUTIVE SUMMARY ==================== -->
<div class="running-header">
  <span>PRISM · SIH 2026 Master Briefing</span>
  <span class="running-header-right">1. Executive Overview & Problem Context</span>
</div>

<h2>🏛️ 1. Executive Summary & The National Infrastructure Challenge</h2>

<p>
  Under the Government of India's infrastructure governance framework, the <strong>Infrastructure and Project Monitoring Division (IPMD) of MoSPI</strong> is tasked with tracking all Central Sector infrastructure projects costing <strong>₹150 Crore and above</strong>. Across 1,981+ active capital assets, this encompasses an astronomical public outlay of over <strong>₹42.78 Lakh Crore</strong>.
</p>

<div class="grid-2">
  <div class="card avoid-break" style="border-left: 3pt solid #dc2626;">
    <div class="card-header">
      <span>❌ The Status Quo Problem</span>
      <span class="badge badge-red">Legacy Breakdown</span>
    </div>
    <ul style="padding-left: 11pt; font-size: 7.5pt; color: #475569; line-height: 1.4;">
      <li><strong>Unstructured Flash Reports</strong>: Monthly monitoring depends on 160+ page unstructured PDF tables (e.g. Table 6) that take days of manual review to parse and analyze.</li>
      <li><strong>Lagging Post-Hoc Reviews</strong>: Reviews occur months after project milestones have already slipped, meaning ministerial interventions arrive far too late.</li>
      <li><strong>Compounding Financial Overruns</strong>: Over 334+ projects suffer chronic milestone slippage; time overruns average 36.8%, driving silent cost escalations.</li>
      <li><strong>Blind Trust in Contractor Claims</strong>: No automated triangulation connecting contractor bills with satellite GIS, citizen ground evidence, or bank disbursals.</li>
    </ul>
  </div>

  <div class="card avoid-break" style="border-left: 3pt solid #16a34a;">
    <div class="card-header">
      <span>⚡ The PRISM Solution</span>
      <span class="badge badge-green">AI-Powered Next-Gen</span>
    </div>
    <ul style="padding-left: 11pt; font-size: 7.5pt; color: #475569; line-height: 1.4;">
      <li><strong>Predictive Dual Machine Learning</strong>: Dual XGBoost forecasts both delay probability (months) and cost escalation (₹ Cr) before milestone breaches occur.</li>
      <li><strong>Autonomous Ephemeral Ingestion</strong>: Instantaneous extraction of Table 6 from 160+ page PDFs in &lt;40s with 0 database contamination.</li>
      <li><strong>Dynamic S-Curve & Financial Burn</strong>: Logistic curve benchmarking against physical completion to spot "Severe Capital Overburn" (&gt;20% gap).</li>
      <li><strong>Triangulated Ground Truth</strong>: Geotagged citizen evidence (within 5km) + 100% Survey of India verified inland geospatial mapping.</li>
    </ul>
  </div>
</div>

<h3>📊 The Macro Dimensions of India's Infrastructure Oversight</h3>
<table>
  <thead>
    <tr>
      <th>Dimension / Parameter</th>
      <th>Legacy MoSPI Oversight</th>
      <th>PRISM AI Platform Capability</th>
      <th>Strategic National Advantage</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Data Ingestion Frequency</strong></td>
      <td>Monthly static PDF upload (days of review)</td>
      <td><strong>Autonomous Sub-40s Ingestion</strong> + Real-time APIs</td>
      <td>Zero review latency; instantaneous cabinet briefings</td>
    </tr>
    <tr>
      <td><strong>Risk Assessment Model</strong></td>
      <td>Lagging post-mortem ("How delayed are we?")</td>
      <td><strong>Explainable Predictive AI</strong> ("Which will slip next?")</td>
      <td>Early intervention 6–12 months prior to deadline breach</td>
    </tr>
    <tr>
      <td><strong>Financial Burn vs Progress</strong></td>
      <td>Static cumulative expenditure totals</td>
      <td><strong>3-State Dynamic S-Curve Burn Divergence</strong></td>
      <td>Catches contractor front-loading & fund misallocations</td>
    </tr>
    <tr>
      <td><strong>Geospatial Integrity</strong></td>
      <td>Rough district tags; frequent ocean/drift errors</td>
      <td><strong>100% Survey of India Inland Validation</strong></td>
      <td>Eliminates territorial drift; ready for PM GatiShakti sync</td>
    </tr>
    <tr>
      <td><strong>Document Integrity & Audits</strong></td>
      <td>Scattered unindexed PDF archives</td>
      <td><strong>SHA-256 Deduplication + Automated OCR</strong></td>
      <td>Prevents duplicate billings and ensures strict auditability</td>
    </tr>
    <tr>
      <td><strong>Governance Remediation</strong></td>
      <td>Informal committee memos without timers</td>
      <td><strong>Tamper-Evident State Machine + SLA Timers</strong></td>
      <td>Enforced accountability; immutable officer audit history</td>
    </tr>
  </tbody>
</table>

<div class="alert-box alert-warning avoid-break">
  <strong>🔥 Crucial Hackathon Pitch Hook</strong>: "Judges, India is investing ₹42.78 Lakh Crore in infrastructure. A mere 1% reduction in project delays across this portfolio saves the Indian taxpayer over <strong>₹42,000 Crore</strong>. PRISM provides MoSPI with the automated predictive intelligence to achieve exactly this."
</div>

<div class="page-break"></div>

<!-- ==================== PAGE 3: THE 4 TECHNOLOGICAL BREAKTHROUGHS ==================== -->
<div class="running-header">
  <span>PRISM · SIH 2026 Master Briefing</span>
  <span class="running-header-right">2. Core Innovations & Breakthroughs</span>
</div>

<h2>🚀 2. The Four Technological Breakthroughs of PRISM</h2>

<p>
  PRISM is not a simple CRUD dashboard. It is engineered around four novel technical breakthroughs designed to solve real-world government pain points:
</p>

<div class="grid-2">
  <!-- Breakthrough 1 -->
  <div class="card avoid-break" style="border-top: 3pt solid #1e3a8a;">
    <div class="card-header">
      <span>1. Dual XGBoost 2.0 + TreeSHAP Engine</span>
      <span class="badge badge-blue">Explainable AI</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Dual machine learning core evaluating 7 features without temporal leakage:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.3pt; color: #475569; line-height: 1.35;">
      <li><strong>Model A (Delay Classifier)</strong>: Predicts probability of milestone slippage & expected delay in months.</li>
      <li><strong>Model B (Cost Regressor)</strong>: Predicts severity of cost overrun in ₹ Crore.</li>
      <li><strong>TreeSHAP Attributions</strong>: Every prediction produces a local waterfall decomposition showing exact driver contributions (e.g. burn progress gap +18.4%, elapsed ratio +12.1%).</li>
      <li><strong>Fine-Tuned LLM Synthesizer</strong>: Qwen-2.5-1.5B translates mathematical SHAP vectors into 7–14 day immediate & 30–90 day structural roadmaps.</li>
    </ul>
  </div>

  <!-- Breakthrough 2 -->
  <div class="card avoid-break" style="border-top: 3pt solid #059669;">
    <div class="card-header">
      <span>2. Autonomous Ephemeral PDF Ingestion</span>
      <span class="badge badge-green">&lt;40s Ingestion</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Multi-pass extraction engine capable of handling complex government PDFs:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.3pt; color: #475569; line-height: 1.35;">
      <li><strong>Table 6 Boundary Snapping</strong>: Combines PyMuPDF vector coordinates with pdfplumber table isolation to extract all ongoing projects from 160+ page Flash Reports in &lt;40 seconds.</li>
      <li><strong>Stacked Cell De-aggregation</strong>: Correctly untangles multi-line cells containing original and revised costs without column shifts.</li>
      <li><strong>Zero DB Contamination Guarantee</strong>: Ingestion runs entirely in volatile RAM sessions (TTL = 2 hrs). Ad-hoc ministerial simulations never corrupt the master database.</li>
    </ul>
  </div>
</div>

<div class="grid-2">
  <!-- Breakthrough 3 -->
  <div class="card avoid-break" style="border-top: 3pt solid #d97706;">
    <div class="card-header">
      <span>3. Dynamic S-Curve & 3-State Burn Triangulation</span>
      <span class="badge badge-yellow">Early Warning</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Mathematical construction cadence modeling:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.3pt; color: #475569; line-height: 1.35;">
      <li><strong>Logistic Progress Function</strong>: Calculates expected progress P_expected(t) = 100 / (1 + exp(-k * (t - 0.5))) based on elapsed duration.</li>
      <li><strong>Burn Variance Check</strong>: Tracks divergence B_var = Expenditure_Burn_Pct - Physical_Progress_Pct.</li>
      <li><strong>3-State Classification</strong>:
        <span class="badge badge-red">Severe Overburn (&gt;20%)</span>,
        <span class="badge badge-yellow">Moderate (5–20%)</span>,
        <span class="badge badge-green">Disciplined (&le;5%)</span>.
      </li>
      <li><strong>Dynamic Priority Sorting</strong>: Bubble-sorts projects with acute capital burn divergence directly to cabinet attention.</li>
    </ul>
  </div>

  <!-- Breakthrough 4 -->
  <div class="card avoid-break" style="border-top: 3pt solid #7c3aed;">
    <div class="card-header">
      <span>4. Geospatial & Citizen Ground Verification</span>
      <span class="badge badge-purple">Triangulated Truth</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Cross-checks contractor reports with verifiable ground evidence:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.3pt; color: #475569; line-height: 1.35;">
      <li><strong>100% Inland GIS Integrity</strong>: Validates coordinates against Survey of India bounding polygons, eliminating offshore drift or territorial inaccuracies.</li>
      <li><strong>Citizen Crowdsourcing with EXIF Validation</strong>: Accepts public photo reports, extracts hardware EXIF GPS, and enforces Haversine radius (&le;5.0 km).</li>
      <li><strong>Fraud & Ghost Milestone Detection</strong>: Detects claims where contractor claims 80% completion but citizen evidence shows foundation work.</li>
    </ul>
  </div>
</div>

<h3>📐 Mathematical Risk Formulation</h3>
<div class="card avoid-break" style="background: #f8fafc; font-size: 7.8pt; padding: 6pt 10pt;">
  <p>PRISM calculates a normalized Composite Predictive Risk Score R_comp in [0, 1]:</p>
  <div style="text-align: center; margin: 4pt 0; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #1e3a8a;">
    R_comp = 0.55 × P(Delay) + 0.45 × min(1.0, ΔCost / Sanctioned_Cost)
  </div>
  <p style="font-size: 7.2pt; color: #64748b; margin-top: 2pt;">
    Risk Tiers: <span class="badge badge-red">Critical (&ge; 0.75)</span> · <span class="badge badge-yellow">High (0.50 – 0.74)</span> · <span class="badge badge-blue">Medium (0.25 – 0.49)</span> · <span class="badge badge-green">Low (&lt; 0.25)</span>.
  </p>
</div>

<div class="page-break"></div>

<!-- ==================== PAGE 4: SYSTEM ARCHITECTURE & TECH STACK ==================== -->
<div class="running-header">
  <span>PRISM · SIH 2026 Master Briefing</span>
  <span class="running-header-right">3. System Topology & Technology Stack</span>
</div>

<h2>📐 3. System Architecture & Technical Specifications</h2>

<p>
  PRISM follows an asynchronous, decoupled <strong>n-tier reactive architecture</strong> ensuring sub-40ms response times, 100% offline edge resilience, and high-concurrency database connection pooling.
</p>

<!-- Architecture Flow Representation -->
<div class="card avoid-break" style="background: #0f172a; color: #f8fafc; padding: 7pt 10pt; margin: 5pt 0;">
  <div style="font-size: 7.8pt; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 4pt;">PRISM Macro Architecture Topology</div>
  <div style="display: flex; justify-content: space-between; align-items: center; text-align: center; font-size: 7.2pt;">
    <div style="background: #1e293b; border: 1pt solid #334155; border-radius: 4pt; padding: 4.5pt; width: 22%;">
      <div style="color: #60a5fa; font-weight: 700;">Client Presentation Tier</div>
      <div style="color: #cbd5e1; font-size: 6.5pt; margin-top: 2pt;">Next.js 16 (Turbopack)<br>React 19 · Leaflet GIS<br>Recharts · Framer Motion</div>
    </div>
    <div style="color: #94a3b8; font-weight: 700;">➔ REST / WS ➔</div>
    <div style="background: #1e293b; border: 1pt solid #334155; border-radius: 4pt; padding: 4.5pt; width: 22%;">
      <div style="color: #34d399; font-weight: 700;">FastAPI ASGI Gateway</div>
      <div style="color: #cbd5e1; font-size: 6.5pt; margin-top: 2pt;">JWT Bearer Auth<br>RBAC Permission Guards<br>CORS & Rate Limiting</div>
    </div>
    <div style="color: #94a3b8; font-weight: 700;">➔ Microservices ➔</div>
    <div style="background: #1e293b; border: 1pt solid #334155; border-radius: 4pt; padding: 4.5pt; width: 22%;">
      <div style="color: #f472b6; font-weight: 700;">AI & Service Engine</div>
      <div style="color: #cbd5e1; font-size: 6.5pt; margin-top: 2pt;">Dual XGBoost 2.0<br>TreeSHAP Explainer<br>PyMuPDF · S-Curve</div>
    </div>
    <div style="color: #94a3b8; font-weight: 700;">➔ SQLAlchemy ➔</div>
    <div style="background: #1e293b; border: 1pt solid #334155; border-radius: 4pt; padding: 4.5pt; width: 22%;">
      <div style="color: #fbbf24; font-weight: 700;">Dual Storage Persistence</div>
      <div style="color: #cbd5e1; font-size: 6.5pt; margin-top: 2pt;">PostgreSQL (PgBouncer)<br>SQLite Edge Fallback<br>SHA-256 Document Vault</div>
    </div>
  </div>
</div>

<h3>🛠️ Technology Stack Breakdown</h3>
<table>
  <thead>
    <tr>
      <th>Layer / Component</th>
      <th>Technology Selected</th>
      <th>Version / Spec</th>
      <th>Architectural Rationale</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Frontend Framework</strong></td>
      <td>Next.js (App Router, Turbopack)</td>
      <td>v16.3.3</td>
      <td>Server-side rendering, instant builds, high-speed virtualized data tables</td>
    </tr>
    <tr>
      <td><strong>Core UI & State</strong></td>
      <td>React 19 + TypeScript</td>
      <td>v19.2.8 / TS 5</td>
      <td>Component concurrency, zero type errors across 1,981+ project payloads</td>
    </tr>
    <tr>
      <td><strong>Geospatial GIS Engine</strong></td>
      <td>Leaflet + MapLibre GL</td>
      <td>v1.9.4</td>
      <td>100% Inland Survey of India polygon clamping, responsive marker clustering</td>
    </tr>
    <tr>
      <td><strong>Backend ASGI Core</strong></td>
      <td>FastAPI + Starlette</td>
      <td>v0.115+</td>
      <td>Asynchronous high-throughput gateway; automatic OpenAPI documentation</td>
    </tr>
    <tr>
      <td><strong>Data Validation</strong></td>
      <td>Pydantic v2</td>
      <td>v2.7+</td>
      <td>Rust-backed JSON validation, sub-millisecond serialization across large portfolios</td>
    </tr>
    <tr>
      <td><strong>Machine Learning Core</strong></td>
      <td>XGBoost (Classifier & Regressor)</td>
      <td>v2.0.3</td>
      <td>Handles tabular project features with non-linear tree splits & high generalization</td>
    </tr>
    <tr>
      <td><strong>Model Explainability</strong></td>
      <td>TreeSHAP</td>
      <td>v0.45+</td>
      <td>Exact Shapley additive attributions for delay and cost escalation drivers</td>
    </tr>
    <tr>
      <td><strong>Document Intelligence</strong></td>
      <td>PyMuPDF (fitz) + pdfplumber</td>
      <td>v1.24+</td>
      <td>Ultra-fast C-native table extraction; parses 160+ page MoSPI PDFs in &lt;40s</td>
    </tr>
    <tr>
      <td><strong>Production Database</strong></td>
      <td>PostgreSQL + PgBouncer</td>
      <td>Port 6543 pool</td>
      <td>Transaction connection pooling; prevents socket starvation during peak scans</td>
    </tr>
    <tr>
      <td><strong>Offline Edge Replica</strong></td>
      <td>SQLite Fallback (sql_app.db)</td>
      <td>SQLAlchemy 2.0</td>
      <td>Seamless failover ensures field officers retain 100% utility without internet</td>
    </tr>
  </tbody>
</table>

<h3>🛡️ Enterprise Resilience & Fault Tolerance Guarantees</h3>
<div class="grid-3">
  <div class="card avoid-break">
    <div class="card-header" style="color: #1e3a8a;">⚡ Sub-40ms Queries</div>
    <div style="font-size: 7.3pt; color: #475569;">Optimized multi-column DB indices on <code>(state, sector, risk_tier)</code> combined with Pydantic v2 ensure sub-40 millisecond response times.</div>
  </div>
  <div class="card avoid-break">
    <div class="card-header" style="color: #059669;">🔌 PgBouncer Pooling</div>
    <div style="font-size: 7.3pt; color: #475569;">Transaction-mode connection pooler prevents PostgreSQL thread starvation during concurrent cabinet-level portfolio drills across 1,981 projects.</div>
  </div>
  <div class="card avoid-break">
    <div class="card-header" style="color: #d97706;">📶 Offline Edge Fallback</div>
    <div style="font-size: 7.3pt; color: #475569;">If remote connection drops, backend switches automatically to local SQLite database with zero user-facing errors or crashed sessions.</div>
  </div>
</div>

<div class="page-break"></div>

<!-- ==================== PAGE 5: CORE PLATFORM MODULES (PART 1) ==================== -->
<div class="running-header">
  <span>PRISM · SIH 2026 Master Briefing</span>
  <span class="running-header-right">4. Complete Platform Modules (1 to 7)</span>
</div>

<h2>💻 4. Comprehensive Platform Modules & Features (Part 1)</h2>

<p>
  PRISM delivers 13 unified modules addressing every phase of central infrastructure governance:
</p>

<div class="grid-2">
  <!-- Module 1 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>1. Executive Command Center</span>
      <span class="badge badge-blue">Portfolio KPIs</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      The central cockpit for Ministry leadership (MoSPI Secretary, Cabinet Secretariat, PMO):
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>Macro statistics: Total Projects (1,981), Sanctioned Outlay (₹42.78L Cr), Delayed Trajectories (334), Critical Assets (106).</li>
      <li>Interactive risk tier distribution & financial exposure heatmaps.</li>
      <li>Instant filtering by Ministry, Sector, and State with multi-variable sorting.</li>
    </ul>
  </div>

  <!-- Module 2 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>2. Dynamic Early Warning Intelligence</span>
      <span class="badge badge-yellow">S-Curve Engine</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Identifies schedule and budget deterioration months ahead of target dates:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>Calculates mathematical S-curve expected progress vs actual completion.</li>
      <li>Triangulates 3-state financial burn (Severe Overburn &gt;20%, Moderate, Disciplined).</li>
      <li>Synthesizes sector-specific triggers: RoW delays, forest clearance, contractor velocity.</li>
    </ul>
  </div>
</div>

<div class="grid-2">
  <!-- Module 3 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>3. Geospatial GIS Command Map</span>
      <span class="badge badge-green">100% Inland GIS</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      High-precision interactive spatial mapping across Indian states & UTs:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>100% inland coordinate compliance audited against Survey of India polygons.</li>
      <li>Toggle between Risk Tier Mode (Critical/High/Medium/Low) and Sector Mode.</li>
      <li>Slide-out project inspection drawers with direct deep-links to milestone histories.</li>
    </ul>
  </div>

  <!-- Module 4 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>4. Explainable AI & TreeSHAP Hub</span>
      <span class="badge badge-purple">Transparent ML</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Opens the "black box" of machine learning predictions for administrative confidence:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>Visual Waterfall Attribution: Exact positive and negative feature drivers per project.</li>
      <li>Identifies whether delays stem from cash flow choke, milestone stagnation, or scope creep.</li>
      <li>Model Governance view showing ROC-AUC curves, calibration curves, and feature importances.</li>
    </ul>
  </div>
</div>

<div class="grid-2">
  <!-- Module 5 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>5. Governance Action Tracker</span>
      <span class="badge badge-blue">SLA State Machine</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Enforces closed-loop accountability for remediation and mitigation directives:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>Strict State Machine: PENDING ➔ ASSIGNED ➔ IN_PROGRESS ➔ REVIEW ➔ VERIFIED ➔ CLOSED.</li>
      <li>Automatic SLA countdown timers with automated escalation upon deadline breach.</li>
      <li>Cryptographically preserved audit history in intervention_action_history table.</li>
    </ul>
  </div>

  <!-- Module 6 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>6. Intelligent Document Vault</span>
      <span class="badge badge-slate">OCR & SHA-256</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Enterprise document repository for DPRs, contractor invoices, and inspection logs:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>SHA-256 content hashing instantly rejects duplicate document submissions.</li>
      <li>PyMuPDF OCR pipeline extracts project milestones, financial figures, and dates.</li>
      <li>Full-screen inline PDF preview modal with AI-generated executive summaries.</li>
    </ul>
  </div>
</div>

<!-- Module 7 Full Width -->
<div class="card avoid-break" style="border-left: 3pt solid #1e3a8a;">
  <div class="card-header">
    <span>7. Ephemeral Flash Report Analysis Hub (Zero DB Contamination)</span>
    <span class="badge badge-blue">Novel Capability</span>
  </div>
  <p style="font-size: 7.5pt; color: #334155;">
    Solves the official Ministry need to analyze newly published 160+ page monthly Flash Reports without writing unverified data into the production database:
  </p>
  <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
    <li>Extracts <strong>Table 6 (Pan-India All Ongoing Projects)</strong> via vector coordinate snapping in <strong>&lt;40 seconds</strong>.</li>
    <li>Runs batch XGBoost inference entirely in volatile RAM sessions (TTL = 2 hours).</li>
    <li>Allows officers to download the verified canonical 19-column MoSPI CSV export or discard the session cleanly with zero database writes.</li>
  </ul>
</div>

<div class="page-break"></div>

<!-- ==================== PAGE 6: CORE PLATFORM MODULES (PART 2) & DATA BENCHMARKS ==================== -->
<div class="running-header">
  <span>PRISM · SIH 2026 Master Briefing</span>
  <span class="running-header-right">5. Modules (8 to 13) & Real Data Validation</span>
</div>

<h2>💻 5. Platform Modules (Part 2) & Real MoSPI Data Validation</h2>

<div class="grid-2">
  <!-- Module 8 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>8. Fraud & Red-Flag Anomaly Triangulation</span>
      <span class="badge badge-red">Integrity Shield</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Triangulates multiple operational data feeds to spot corruption or misreporting:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li><strong>Ghost Progress Detection</strong>: Flags projects claiming 80%+ progress when ground inspection or citizen photos show zero construction.</li>
      <li><strong>Bid Rigging & Vendor Concentration</strong>: Flags instances where a single contractor captures &gt;70% of tenders in a single district.</li>
      <li><strong>Rapid Escalation Abuse</strong>: Alerts on 3+ consecutive cost revisions.</li>
    </ul>
  </div>

  <!-- Module 9 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>9. Cross-Sector Benchmarking</span>
      <span class="badge badge-blue">Comparative KPIs</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Empowers planners with cross-ministry efficiency comparisons:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>Tracks cost-per-kilometer across NHAI highway projects vs state PWDs.</li>
      <li>Evaluates railway electrification pacing against historical baselines.</li>
      <li>Enables peer-to-peer contractor performance scorecards.</li>
    </ul>
  </div>
</div>

<div class="grid-2">
  <!-- Module 10 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>10. Cost Escalation Drivers & AI Mitigation</span>
      <span class="badge badge-yellow">Root Causes</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Deconstructs the macroeconomic drivers behind capital escalations:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>Analyzes raw material inflation (steel, cement, bitumen) vs land acquisition spikes.</li>
      <li>Fine-tuned Qwen LLM synthesizes structured, step-by-step mitigation roadmaps tailored to specific sectoral constraints.</li>
    </ul>
  </div>

  <!-- Module 11 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>11. National Digital Ecosystem Bus</span>
      <span class="badge badge-green">Interoperability</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Connects MoSPI with vital national digital public infrastructure:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li><strong>PM GatiShakti</strong>: Real-time GeoJSON spatial vector synchronization.</li>
      <li><strong>PFMS</strong>: Financial disbursals & utilization certificates reconciliation.</li>
      <li><strong>GeM</strong>: Contractor procurement histories & tender timelines.</li>
      <li><strong>CRIS & NHAI</strong>: Real-time telemetry on railway & highway progress.</li>
    </ul>
  </div>
</div>

<div class="grid-2">
  <!-- Module 12 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>12. Citizen Transparency Portal</span>
      <span class="badge badge-purple">Public Participation</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Engages local communities to protect public infrastructure:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>Citizens upload geotagged photos of local public works.</li>
      <li>Automated EXIF extraction and 5km Haversine geofence verification.</li>
      <li>Public status tracking with unique grievance ticket references.</li>
    </ul>
  </div>

  <!-- Module 13 -->
  <div class="card avoid-break">
    <div class="card-header">
      <span>13. Model Governance & Drift Tracking</span>
      <span class="badge badge-slate">MLOps Integrity</span>
    </div>
    <p style="font-size: 7.5pt; color: #334155;">
      Guarantees that predictive algorithms maintain audit-ready accuracy:
    </p>
    <ul style="padding-left: 10pt; font-size: 7.2pt; color: #475569; line-height: 1.35;">
      <li>Monitors ROC-AUC, calibration error, and feature distribution shift over time.</li>
      <li>Ensures zero future-leakage through strict chronological temporal splits.</li>
    </ul>
  </div>
</div>

<h3>📈 Real MoSPI Data Validation & Demonstration Portfolio</h3>
<table>
  <thead>
    <tr>
      <th>Audit Dataset</th>
      <th>Monitored Assets</th>
      <th>Total Capital Outlay</th>
      <th>Delayed Trajectories</th>
      <th>Critical Risk Assets</th>
      <th>Spatial Validity</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>MoSPI Master (April 2026)</strong></td>
      <td><strong>Exactly 1,981 Projects</strong></td>
      <td><strong>₹42.78 Lakh Crore</strong></td>
      <td><strong>334 Projects (&gt;50% prob)</strong></td>
      <td><strong>106 Assets</strong></td>
      <td><strong>100% Survey of India Valid</strong></td>
    </tr>
    <tr>
      <td><strong>Flash Report (May 2026)</strong></td>
      <td><strong>Exactly 1,987 Projects</strong></td>
      <td><strong>₹37.10 Lakh Crore</strong></td>
      <td>345 Projects</td>
      <td>108 Assets</td>
      <td>100% Inland Verified</td>
    </tr>
    <tr>
      <td><strong>Flash Report (July 2026)</strong></td>
      <td><strong>Exactly 1,775 Projects</strong></td>
      <td><strong>₹34.49 Lakh Crore</strong></td>
      <td>370 Projects</td>
      <td>97 Assets</td>
      <td>100% Inland Verified</td>
    </tr>
    <tr>
      <td><strong>Historical Longitudinal Audits</strong></td>
      <td><strong>20,544 Records (14 CSVs)</strong></td>
      <td>Longitudinal (2025–2026)</td>
      <td>Historical Ground Truth</td>
      <td>Continuously Calibrated</td>
      <td>Audited Across All States</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- ==================== PAGE 7: PRESENTATION SLIDE DECK STRATEGY ==================== -->
<div class="running-header">
  <span>PRISM · SIH 2026 Master Briefing</span>
  <span class="running-header-right">6. Presentation Slide Deck Blueprint</span>
</div>

<h2>🎯 6. Hackathon Presentation Slide Deck Blueprint</h2>

<p>
  Follow this proven <strong>10-slide structure</strong> during your SIH presentation (Target: 7–8 minutes pitch + 3–5 minutes live demo):
</p>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 1: Hook & The ₹42.78 Lakh Crore National Challenge</span>
    <span class="badge badge-blue">Time: 45 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: High-impact stat card: ₹42.78 Lakh Crore, 1,981 Projects, MoSPI Logo, Problem SIH26103.<br>
    <strong>Key Talking Point</strong>: "Judges, India is building the world's most ambitious infrastructure. But oversight is paralyzed by 160-page PDF tabular reports released months after delays occur. We built PRISM to replace lagging post-mortems with predictive AI."
  </div>
</div>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 2: The Core Problem: Why Projects Fail in Silence</span>
    <span class="badge badge-blue">Time: 45 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: Diagram showing the 4 blindspots: Lagging data, front-loaded burn without progress, black-box contractors, and unindexed PDFs.<br>
    <strong>Key Talking Point</strong>: "When capital drains at 80% while physical work is at 30%, nobody notices until the scheduled completion date expires. That is when cost escalations explode."
  </div>
</div>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 3: Introducing PRISM: The Predictive Intelligence Platform</span>
    <span class="badge badge-blue">Time: 45 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: Hero screenshot of PRISM Command Center showing portfolio risk tiers and macro metrics.<br>
    <strong>Key Talking Point</strong>: "PRISM is an enterprise platform that unifies AI predictions, dynamic S-curves, geospatial mapping, and tamper-evident governance workflows."
  </div>
</div>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 4: Breakthrough 1: Explainable Dual-Engine AI & TreeSHAP</span>
    <span class="badge badge-blue">Time: 50 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: XGBoost architecture + TreeSHAP Waterfall plot highlighting exact feature contributions.<br>
    <strong>Key Talking Point</strong>: "We don't use opaque heuristics. Our dual XGBoost models predict delay probability and cost escalation, while TreeSHAP tells the Minister exactly *why* (e.g. burn progress gap +18.4%)."
  </div>
</div>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 5: Breakthrough 2: Dynamic S-Curve & 3-State Burn Triangulation</span>
    <span class="badge badge-blue">Time: 45 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: S-Curve chart showing expected progress vs actual progress and the 3-state burn indicator.<br>
    <strong>Key Talking Point</strong>: "Our logistic S-curve calculates expected milestones. When expenditure burn diverges from physical progress by &gt;20%, it triggers an automatic Severe Overburn alert."
  </div>
</div>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 6: Breakthrough 3 & 4: 40s Ephemeral Ingestion & Citizen GIS</span>
    <span class="badge badge-blue">Time: 45 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: Split view: 160-page PDF extraction flow on left; 100% Inland GIS map and citizen photo verification on right.<br>
    <strong>Key Talking Point</strong>: "We parse 160+ page Table 6 Flash Reports in under 40 seconds with zero DB contamination, and triangulate contractor claims with EXIF-verified citizen ground photos."
  </div>
</div>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 7: Enterprise System Topology & Tech Stack</span>
    <span class="badge badge-blue">Time: 40 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: Architecture diagram (Next.js 16 + FastAPI ASGI + PostgreSQL/PgBouncer + SQLite Edge Fallback).<br>
    <strong>Key Talking Point</strong>: "Engineered for national scale: sub-40ms queries, PgBouncer connection pooling for 1,981+ assets, and seamless offline edge fallback for remote site offices."
  </div>
</div>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 8: Transition to Live Product Demonstration</span>
    <span class="badge badge-blue">Time: 15 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: "Live Demonstration on 1,981 Authentic MoSPI Capital Assets."<br>
    <strong>Key Talking Point</strong>: "Now, let us show you PRISM live on 1,981 authentic MoSPI projects across India."
  </div>
</div>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 9: Measurable Impact, ROI & Policy Alignment</span>
    <span class="badge badge-blue">Time: 40 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: Impact scorecard: ₹42,000 Cr potential savings, PM GatiShakti sync, MoSPI compliance.<br>
    <strong>Key Talking Point</strong>: "Just a 1% delay reduction saves ₹42,000 Crore. PRISM directly accelerates Viksit Bharat 2047 infrastructure goals."
  </div>
</div>

<div class="slide-card avoid-break">
  <div class="slide-title">
    <span>Slide 10: Conclusion & National Roadmap</span>
    <span class="badge badge-blue">Time: 30 sec</span>
  </div>
  <div style="font-size: 7.3pt; color: #475569; margin-top: 2pt;">
    <strong>Visual</strong>: 30-60-90 day deployment roadmap: MoSPI pilot ➔ PM GatiShakti integration ➔ Pan-India rollout.<br>
    <strong>Key Talking Point</strong>: "PRISM is production-ready today. Thank you, and we welcome your questions."
  </div>
</div>

<div class="page-break"></div>

<!-- ==================== PAGE 8: LIVE DEMO WALKTHROUGH SCRIPT ==================== -->
<div class="running-header">
  <span>PRISM · SIH 2026 Master Briefing</span>
  <span class="running-header-right">7. Live Demonstration Walkthrough Script</span>
</div>

<h2>🎬 7. Live Demonstration Walkthrough Script</h2>

<p>
  This script provides the exact sequence of clicks, screens, and accompanying narration for the <strong>3 to 5-minute live demonstration</strong>. Assign one team member to drive the laptop while another narrates:
</p>

<table>
  <thead>
    <tr>
      <th style="width: 12%;">Time / Step</th>
      <th style="width: 25%;">Screen & Action to Perform</th>
      <th style="width: 48%;">What to Say (Exact Pitch Script)</th>
      <th style="width: 15%;">Visual Focus</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>0:00 – 0:45</strong><br>Step 1</td>
      <td><strong>Command Center Dashboard</strong><br>• Show Macro KPI tiles.<br>• Filter by Ministry (e.g. Road Transport or Railways).</td>
      <td>"We begin at the Executive Command Center. Here, MoSPI leadership sees the entire ₹42.78 Lakh Crore portfolio across 1,981 active projects. The system immediately surfaces 106 Critical Risk assets and 334 delayed trajectories. Notice how filtering by Ministry instantly recalculates portfolio exposure in real-time."</td>
      <td>Macro KPI cards, Risk Distribution bar, Exposure table</td>
    </tr>
    <tr>
      <td><strong>0:45 – 1:30</strong><br>Step 2</td>
      <td><strong>Geospatial Command Map</strong><br>• Navigate to Map tab.<br>• Toggle between Risk Tier Mode and Sector Mode.<br>• Click a Critical red pin.</td>
      <td>"Next, our Geospatial Command Map. Every single coordinate is validated against Survey of India bounding polygons—100% inland accuracy with zero ocean drift. We can toggle between Risk Tiers and Infrastructure Sectors. Clicking this critical pin in Assam opens the project drawer with immediate access to budget burn, delay predictions, and contractor details."</td>
      <td>Leaflet Map, Marker clusters, Project detail drawer</td>
    </tr>
    <tr>
      <td><strong>1:30 – 2:15</strong><br>Step 3</td>
      <td><strong>Dynamic Early Warning & S-Curve</strong><br>• Open Early Warning tab.<br>• Highlight a project with 'Severe Overburn'.<br>• Show logistic S-curve.</td>
      <td>"This is our Early Warning Intelligence. Instead of waiting for milestone deadlines to fail, our mathematical logistic S-curve models expected progress against elapsed timeline. Look at this Highway project: cumulative expenditure is 78%, but physical progress is only 42%. The system automatically triggers a 'Severe Overburn' alert and sorts it to the top for immediate review."</td>
      <td>S-Curve graph, Burn progress gap, Deterioration triggers</td>
    </tr>
    <tr>
      <td><strong>2:15 – 3:00</strong><br>Step 4</td>
      <td><strong>Project Detail & TreeSHAP Waterfall</strong><br>• Drill into project detail.<br>• Click 'Run AI Risk Inference'.<br>• Reveal TreeSHAP waterfall.</td>
      <td>"Now let's examine why our AI flagged this asset. Clicking Run Prediction executes our dual XGBoost model. Below, TreeSHAP provides full explainability. It shows that the Burn Progress Gap (+18.4%) and Milestone Slippage (+14.2%) pushed this asset into Critical tier. The fine-tuned LLM then synthesizes an immediate 14-day field audit roadmap."</td>
      <td>Dual XGBoost gauges, SHAP waterfall bars, AI Roadmap</td>
    </tr>
    <tr>
      <td><strong>3:00 – 3:45</strong><br>Step 5</td>
      <td><strong>Ephemeral Flash Report Upload</strong><br>• Go to Flash Report Analysis.<br>• Upload 160+ page PDF.<br>• Show parsing in &lt;40 seconds.</td>
      <td>"A massive innovation for MoSPI: parsing official monthly Flash Reports. We upload a 160+ page PDF. In under 40 seconds, our vector snapping engine extracts Table 6, standardizes all 19 columns, and computes batch predictions—entirely in volatile RAM with zero database contamination. Officers can simulate impact and export clean canonical CSVs."</td>
      <td>Progress bar, Table 6 preview, Zero DB write badge</td>
    </tr>
    <tr>
      <td><strong>3:45 – 4:30</strong><br>Step 6</td>
      <td><strong>Governance Action Tracker & Citizen Proof</strong><br>• Show Action State Machine.<br>• Show Citizen Grievance with EXIF photo.</td>
      <td>"Finally, closing the governance loop. High-risk alerts automatically spawn Action Items in our tamper-evident state machine with SLA timers. We also triangulate contractor claims with Citizen ground reports: camera EXIF coordinates are checked against official sites within a 5km radius to eliminate ghost progress claims."</td>
      <td>State machine steps, SLA countdown, Citizen photo modal</td>
    </tr>
  </tbody>
</table>

<div class="alert-box alert-success avoid-break">
  <strong>💡 Demo Golden Rule</strong>: Keep the browser at 100% zoom, make clicks deliberate, and ensure the speaker speaks smoothly without waiting for loading bars (the app loads in &lt;40ms!).
</div>

<div class="page-break"></div>

<!-- ==================== PAGE 9: JURY Q&A DEFENSE HANDBOOK (PART 1) ==================== -->
<div class="running-header">
  <span>PRISM · SIH 2026 Master Briefing</span>
  <span class="running-header-right">8. Jury Q&A Defense Guide (Questions 1 to 6)</span>
</div>

<h2>🛡️ 8. Jury Q&A Defense Handbook (Questions 1 to 6)</h2>

<p>
  Judges will ask sharp technical and domain questions. Use these battle-tested, authoritative answers:
</p>

<!-- Q1 -->
<div class="qa-card avoid-break">
  <div class="qa-q">
    <span class="qa-q-num">Q1</span>
    <span>"Why use XGBoost instead of Deep Learning or a pure Large Language Model (LLM)?"</span>
  </div>
  <div class="qa-a">
    <strong>Winning Answer</strong>: "Judges, MoSPI infrastructure data is structured tabular data with non-linear numerical boundaries (expenditure ratios, milestone slippage, elapsed time). In empirical machine learning literature (including NeurIPS benchmarks), gradient boosted decision trees like XGBoost consistently outperform deep neural networks on tabular datasets by 15–20% while requiring a fraction of the compute. Furthermore, XGBoost integrates with <strong>TreeSHAP</strong> for mathematically exact local explainability (f(x) = phi_0 + sum phi_i). We use LLMs (specifically a fine-tuned Qwen-2.5-1.5B via LoRA) strictly for what they excel at: synthesizing human-readable mitigation roadmaps from the structured SHAP vectors."
    <div class="qa-pro-tip">💡 Pro-Tip: Emphasize that in government auditing (CAG/CVC), black-box neural networks are rejected because decisions must be legally explainable.</div>
  </div>
</div>

<!-- Q2 -->
<div class="qa-card avoid-break">
  <div class="qa-q">
    <span class="qa-q-num">Q2</span>
    <span>"How do you ensure zero data leakage when training predictive models on longitudinal project data?"</span>
  </div>
  <div class="qa-a">
    <strong>Winning Answer</strong>: "We enforce strict <strong>chronological temporal partitioning</strong>. We never use random k-fold cross-validation, which would leak future project milestones into past evaluations. Our training pipeline trains strictly on pre-2025 longitudinal data and validates forward on 2025–2026 monthly snapshots. Additionally, derived features like <code>burn_progress_gap</code> and <code>time_elapsed_ratio</code> are computed strictly as of the snapshot evaluation date T_eval, guaranteeing that no future milestone information is accessible during inference."
  </div>
</div>

<!-- Q3 -->
<div class="qa-card avoid-break">
  <div class="qa-q">
    <span class="qa-q-num">Q3</span>
    <span>"What happens if a brand new project is registered with zero physical progress (cold-start problem)?"</span>
  </div>
  <div class="qa-a">
    <strong>Winning Answer</strong>: "PRISM implements a dual-tier inference strategy: For cold-start projects (time elapsed &lt; 5%), the model utilizes sector-specific historical priors—such as average Right-of-Way clearance duration in that specific state and implementing agency track record (e.g. NHAI vs State PWD). As soon as cumulative expenditure and the first milestone are recorded, the dynamic S-curve activates automatically."
  </div>
</div>

<!-- Q4 -->
<div class="qa-card avoid-break">
  <div class="qa-q">
    <span class="qa-q-num">Q4</span>
    <span>"How does PRISM ensure government database integrity when officers upload unverified Flash Reports?"</span>
  </div>
  <div class="qa-a">
    <strong>Winning Answer</strong>: "Through our <strong>Zero Database Contamination Guarantee</strong>. The Flash Report parser runs in an isolated ephemeral memory vault (TTL = 2 hours) implemented in <code>temp_analysis_service.py</code>. The 160+ page Table 6 extraction, schema normalization, and batch XGBoost inference happen purely in RAM. It never issues a single <code>INSERT</code> or <code>UPDATE</code> statement to the PostgreSQL production master. Only when an authorized Super Administrator explicitly certifies the import are verified rows migrated to the master register."
  </div>
</div>

<!-- Q5 -->
<div class="qa-card avoid-break">
  <div class="qa-q">
    <span class="qa-q-num">Q5</span>
    <span>"How do you prevent malicious or fake citizen grievance submissions from spamming the system?"</span>
  </div>
  <div class="qa-a">
    <strong>Winning Answer</strong>: "Every citizen photo upload undergoes a two-step cryptographic and spatial validation: First, our backend extracts hardware EXIF camera metadata (GPS coordinates and timestamp). Second, we compute the Haversine distance between the photo location and the official Survey of India project centroid. If the distance exceeds 5.0 km, the submission is automatically flagged as <code>LOCATION_MISMATCH_SUSPECT</code>. Furthermore, citizen submissions are triangulated against contractor claims, requiring multi-citizen consensus before triggering vigilance alerts."
  </div>
</div>

<!-- Q6 -->
<div class="qa-card avoid-break">
  <div class="qa-q">
    <span class="qa-q-num">Q6</span>
    <span>"What happens if a site engineer at a remote border or mountain project loses internet access?"</span>
  </div>
  <div class="qa-a">
    <strong>Winning Answer</strong>: "PRISM features built-in <strong>Offline Edge Resilience</strong>. Our database layer uses SQLAlchemy 2.0 with a dual-persistence failover: if network connectivity to our primary PostgreSQL database (on port 6543) drops, the backend automatically falls back to an embedded SQLite local edge database (<code>sql_app.db</code>). Field officers can continue inspecting milestones and submitting evidence offline. When connectivity is re-established, the records synchronize securely."
  </div>
</div>

<div class="page-break"></div>

<!-- ==================== PAGE 10: JURY Q&A DEFENSE HANDBOOK (PART 2) & TEAM ROLES ==================== -->
<div class="running-header">
  <span>PRISM · SIH 2026 Master Briefing</span>
  <span class="running-header-right">9. Jury Q&A (7 to 12) & Team Role Assignments</span>
</div>

<h2>🛡️ 9. Jury Q&A Defense Handbook (Questions 7 to 12)</h2>

<!-- Q7 -->
<div class="qa-card avoid-break">
  <div class="qa-q">
    <span class="qa-q-num">Q7</span>
    <span>"How can you compute TreeSHAP values for thousands of projects without slowing down the dashboard?"</span>
  </div>
  <div class="qa-a">
    <strong>Winning Answer</strong>: "TreeSHAP leverages the exact tree structure of our trained XGBoost ensemble, which has an algorithmic complexity of O(T × L × D^2) where D is maximum tree depth. Because our tree depth is capped at 6 and we have 7 core features, computing SHAP values takes less than <strong>1.5 milliseconds per project</strong>. For macro portfolio views, we pre-calculate and cache SHAP vectors asynchronously, allowing instant interactive filtering."
  </div>
</div>

<!-- Q8 -->
<div class="qa-card avoid-break">
  <div class="qa-q">
    <span class="qa-q-num">Q8</span>
    <span>"How does PRISM fit into existing government portals like PM GatiShakti and PFMS?"</span>
  </div>
  <div class="qa-a">
    <strong>Winning Answer</strong>: "PRISM is designed as an <strong>analytical intelligence nucleus</strong>, not a siloed competitor. Through our National Digital Gateway Connectors, PRISM consumes spatial corridor GeoJSON vectors from <strong>PM GatiShakti</strong>, reconciles expenditure outlays with <strong>PFMS central disbursals</strong>, cross-references contractor award rates via <strong>GeM</strong>, and ingests telemetry from <strong>Railways CRIS</strong> and <strong>NHAI</strong>. We supply these portals with the predictive risk score they currently lack."
  </div>
</div>

<!-- Q9 -->
<div class="qa-card avoid-break">
  <div class="qa-q">
    <span class="qa-q-num">Q9</span>
    <span>"What concrete financial ROI does PRISM deliver to the Indian Government?"</span>
  </div>
  <div class="qa-a">
    <strong>Winning Answer</strong>: "The central sector infrastructure portfolio monitored by MoSPI stands at <strong>₹42.78 Lakh Crore</strong>. Historical data shows that delayed projects experience an average cost escalation of 18–22%. If PRISM's early warning and automated mitigation workflows prevent even a modest 1% delay across this capital base, it delivers over <strong>₹42,000 Crore in direct taxpayer savings</strong>, while expediting national economic growth."
  </div>
</div>

<h2>👥 10. Team Member Roles & Presentation Assignments</h2>

<p>
  Assign specific presentation topics to team members so everyone speaks with authority during the pitch:
</p>

<table>
  <thead>
    <tr>
      <th style="width: 20%;">Speaker / Role</th>
      <th style="width: 28%;">Primary Presentation Sections</th>
      <th style="width: 32%;">Key Demonstration Responsibilities</th>
      <th style="width: 20%;">Q&A Defense Domain</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Speaker 1<br>(Team Lead)</strong></td>
      <td>• Slide 1: National Challenge<br>• Slide 2: Status Quo Breakdown<br>• Slide 9-10: Impact & Roadmap</td>
      <td>Sets the stage, introduces team, pitches MoSPI policy relevance, delivers closing remarks.</td>
      <td>Policy impact, MoSPI alignment, ROI, PM GatiShakti sync.</td>
    </tr>
    <tr>
      <td><strong>Speaker 2<br>(AI / ML Lead)</strong></td>
      <td>• Slide 4: Dual XGBoost & TreeSHAP<br>• Slide 5: Dynamic S-Curve Engine</td>
      <td>Drives Step 3 & Step 4: Runs AI inference live, explains TreeSHAP waterfall and S-curve burn gap.</td>
      <td>ML architecture, TreeSHAP formulation, data leakage, cold start.</td>
    </tr>
    <tr>
      <td><strong>Speaker 3<br>(Backend / Architect)</strong></td>
      <td>• Slide 6: 40s Ephemeral Ingestion<br>• Slide 7: Enterprise System Topology</td>
      <td>Drives Step 5: Uploads 160+ page PDF, demonstrates Table 6 boundary snapping & zero DB contamination.</td>
      <td>FastAPI ASGI, PgBouncer, ephemeral memory vault, offline edge.</td>
    </tr>
    <tr>
      <td><strong>Speaker 4<br>(Frontend / GIS)</strong></td>
      <td>• Slide 3: Command Center Cockpit<br>• Slide 6: 100% Inland GIS Map</td>
      <td>Drives Step 1 & Step 2: Demonstrates responsive filters, marker clustering, and project drawers.</td>
      <td>Next.js 16 App Router, Turbopack, Survey of India GIS audit.</td>
    </tr>
    <tr>
      <td><strong>Speaker 5<br>(Security / Gov Lead)</strong></td>
      <td>• Governance State Machine<br>• Citizen Portal & Anti-Fraud</td>
      <td>Drives Step 6: Shows Action Tracker SLA timers, EXIF verification, and fraud anomaly detection.</td>
      <td>RBAC matrix, JWT tokens, citizen geotagging, audit logs.</td>
    </tr>
  </tbody>
</table>

<div class="alert-box alert-info avoid-break" style="margin-top: 8pt; text-align: center;">
  <strong>🏆 Final Team Advice for SIH 2026</strong>: Be bold, confident, and professional. You have built a production-grade, audited platform backed by real data across ₹42.78 Lakh Crore of Indian infrastructure. Go win Smart India Hackathon 2026!
</div>

</body>
</html>
"""
    return html.replace("__LOGO_TAG__", logo_tag)

def main():
    print("[*] Generating presentation HTML briefing...")
    logo_path = os.path.abspath("logo.jpg")
    logo_b64 = get_base64_image(logo_path)
    
    html_content = build_presentation_html(logo_b64)
    
    temp_html_path = os.path.abspath("scratch/presentation_briefing.html")
    output_pdf_path = os.path.abspath("PRISM_SIH2026_Project_Presentation_Guide.pdf")
    
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    print(f"[*] HTML written to {temp_html_path} ({len(html_content)} bytes)")
    
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_path):
        print("[-] Edge not found at standard path!")
        return 1
        
    print("[*] Invoking Microsoft Edge headless print-to-pdf...")
    cmd = [
        edge_path,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={output_pdf_path}",
        "--no-pdf-header-footer",
        temp_html_path
    ]
    
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[-] Edge command failed: {res.stderr}")
        return 1
        
    if not os.path.exists(output_pdf_path):
        print("[-] Output PDF not created!")
        return 1
        
    pdf_size = os.path.getsize(output_pdf_path)
    print(f"[+] Successfully generated PDF: {output_pdf_path}")
    print(f"[+] PDF File Size: {pdf_size / 1024:.1f} KB")
    
    # Verify with PyMuPDF
    doc = pymupdf.open(output_pdf_path)
    print(f"[+] Total Pages in PDF: {len(doc)}")
    for i in range(len(doc)):
        page = doc[i]
        text = page.get_text()
        first_line = text.split("\n")[0] if text else "EMPTY"
        print(f"    Page {i+1}: {len(text)} chars | Header: {first_line[:50]}")
    doc.close()
    
    # Cleanup scratch html
    if os.path.exists(temp_html_path):
        os.remove(temp_html_path)
        
    print("[+] All done! PDF is ready to share with teammates.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
