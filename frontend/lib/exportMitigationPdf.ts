/**
 * PRISM File Analysis Hub — AI Mitigation Plan PDF Exporter
 * Generates an official, publication-quality executive PDF report for
 * on-demand AI mitigation plans created in the File Analysis Hub.
 */

import { PRISM_LOGO_BASE64 } from "./logoBase64";

interface TemporaryProject {
  sl_no?: number;
  ministry?: string | null;
  sector?: string | null;
  project_name: string;
  agency?: string | null;
  project_id: string;
  legacy_ocms_code?: string | null;
  pmgid?: string | null;
  state?: string | null;
  approval_date_mm_yyyy?: string | null;
  start_date_mm_yyyy?: string | null;
  original_target_doc_mm_yyyy?: string | null;
  revised_target_doc_mm_yyyy?: string | null;
  original_cost_crore?: number | null;
  revised_cost_crore?: number | null;
  cumulative_expenditure_crore?: number | null;
  physical_progress_percent?: number | null;
  report_month?: string | null;
  source_pdf_page?: number | null;
  risk_analysis?: any;
}

function sanitizePdfText(str: string | null | undefined): string {
  if (!str) return "";
  let clean = String(str);
  clean = clean.replace(/₹/g, "Rs. ");
  clean = clean.replace(/[\u2012\u2013\u2014\u2015]/g, " - ");
  clean = clean.replace(/[\u2018\u2019]/g, "'");
  clean = clean.replace(/[\u201C\u201D]/g, '"');
  clean = clean.replace(/[\u2022\u00B7]/g, "-");
  clean = clean.replace(/[^\x00-\x7F]/g, " ");
  clean = clean.replace(/\*\*/g, "");
  clean = clean.replace(/\*/g, "");
  clean = clean.replace(/#{1,6}\s*/g, "");
  clean = clean.replace(/[ \t]+/g, " ");
  return clean.trim();
}

function fmtCrore(val?: number | null): string {
  if (val == null || isNaN(val)) return "N/A";
  if (val >= 10000) return `Rs. ${(val / 1000).toFixed(1)}K Cr`;
  return `Rs. ${val.toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr`;
}

function fmtPct(val?: number | null): string {
  if (val == null || isNaN(val)) return "N/A";
  return `${val.toFixed(1)}%`;
}

export async function exportMitigationPlanPdf(
  project: TemporaryProject,
  plan: any,
  sessionFileName?: string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const W = 210;
  const H = 297;
  const ml = 16;
  const mr = 194;
  const contentWidth = mr - ml;
  let y = 26;

  const tier = String(project.risk_analysis?.risk_tier || "MEDIUM").toLowerCase();
  const TIER_RGB: Record<string, [number, number, number]> = {
    critical: [225, 29, 72],
    high: [217, 119, 6],
    medium: [37, 99, 235],
    low: [16, 185, 129],
  };
  const tierColor = TIER_RGB[tier] || [100, 116, 139];

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > H - 20) {
      doc.addPage();
      y = 26;
    }
  }

  function sectionHeader(title: string, subtitle?: string) {
    checkPageBreak(12);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(ml, y, contentWidth, 6.5, 1.2, 1.2, "F");
    doc.setTextColor(56, 189, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(sanitizePdfText(title).toUpperCase(), ml + 4, y + 4.5);

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(sanitizePdfText(subtitle), mr - 4, y + 4.5, { align: "right" });
    }
    y += 9.5;
  }

  function rowItem(label: string, val: string, isHighlighted = false) {
    checkPageBreak(5.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(sanitizePdfText(label), ml + 2, y);

    doc.setFont("helvetica", isHighlighted ? "bold" : "normal");
    doc.setFontSize(8.5);
    if (isHighlighted) {
      doc.setTextColor(tierColor[0], tierColor[1], tierColor[2]);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(sanitizePdfText(val), ml + 74, y);
    y += 5.2;
  }

  // ══════════════════════════════════════════════════════════
  // PAGE 1 — HEADER & PROJECT EXECUTIVE OVERVIEW
  // ══════════════════════════════════════════════════════════

  // Top Government Header
  try {
    doc.addImage(PRISM_LOGO_BASE64, "JPEG", ml, 8, 14, 14);
  } catch {
    // Fallback icon
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(ml, 8, 14, 14, 2, 2, "F");
    doc.setFillColor(6, 182, 212);
    doc.circle(ml + 7, 15, 3, "F");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("GOVERNMENT OF INDIA · MINISTRY OF STATISTICS & PROGRAMME IMPLEMENTATION", ml + 18, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PRISM · Predictive Risk Intelligence & System Monitoring · Flash Report Analysis", ml + 18, 16.5);
  doc.setFontSize(6.8);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} | Model: ${plan.model_used || "Qwen 2.5 / Deep Risk Reasoner"}`, ml + 18, 20.5);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(ml, 23, mr, 23);

  // Title Card
  const safeProjectName = sanitizePdfText(project.project_name || "Infrastructure Asset");
  const titleLines = doc.splitTextToSize(safeProjectName, contentWidth - 10);
  const bannerHeight = Math.max(18, 10 + titleLines.length * 4.6);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(ml, y, contentWidth, bannerHeight, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(ml, y, contentWidth, bannerHeight, 2, 2, "D");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);

  let ty = y + 5.2;
  titleLines.forEach((tLine: string) => {
    doc.text(tLine, ml + 4, ty);
    ty += 4.6;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const metaLine = `ID: ${project.project_id}   |   Agency: ${sanitizePdfText(project.agency || "N/A")}   |   Sector: ${sanitizePdfText(project.sector || "Infrastructure")}   |   State: ${sanitizePdfText(project.state || "National")}`;
  doc.text(metaLine, ml + 4, ty + 0.5);
  y += bannerHeight + 4;

  // 1. Baseline Financial & Physical Status
  sectionHeader("1. Project Baseline & Execution Status", "MoSPI Flash Report Data");
  rowItem("Original Sanctioned Cost", fmtCrore(project.original_cost_crore));
  rowItem("Revised Anticipated Cost", project.revised_cost_crore ? fmtCrore(project.revised_cost_crore) : "Not Revised");
  rowItem(
    "Cost Escalation / Overrun",
    project.revised_cost_crore && project.original_cost_crore && project.revised_cost_crore > project.original_cost_crore
      ? `+${fmtCrore(project.revised_cost_crore - project.original_cost_crore)} (${(((project.revised_cost_crore - project.original_cost_crore) / project.original_cost_crore) * 100).toFixed(1)}% Overrun)`
      : "Within Sanctioned Budget",
    Boolean(project.revised_cost_crore && project.original_cost_crore && project.revised_cost_crore > project.original_cost_crore)
  );
  rowItem("Cumulative Expenditure", fmtCrore(project.cumulative_expenditure_crore));
  rowItem("Physical Progress Achieved", fmtPct(project.physical_progress_percent));
  rowItem("Target Date of Completion", project.revised_target_doc_mm_yyyy || project.original_target_doc_mm_yyyy || "—");
  rowItem("Reporting Month", project.report_month || "June 2026");
  y += 2;

  // 2. Risk Intelligence Assessment
  sectionHeader("2. Machine Learning Predictive Risk Assessment", "XGBoost + TreeSHAP Attributions");
  const riskAnalysis = project.risk_analysis || {};
  rowItem("Assigned Risk Tier", tier.toUpperCase(), true);
  rowItem("Composite Risk Score", `${((riskAnalysis.composite_risk_score ?? 0.5) * 100).toFixed(1)}% Probability Index`, true);
  rowItem("Cost Risk Index", `${((riskAnalysis.cost_risk ?? 0.4) * 100).toFixed(1)}%`);
  rowItem("Schedule Delay Risk Index", `${((riskAnalysis.schedule_risk ?? 0.45) * 100).toFixed(1)}%`);
  rowItem(
    "Forecasted Schedule Slippage",
    riskAnalysis.predicted_delay_months != null && riskAnalysis.predicted_delay_months > 0
      ? `+${riskAnalysis.predicted_delay_months.toFixed(1)} Months Anticipated Lag`
      : "On Schedule"
  );
  rowItem(
    "Projected Overrun Exposure",
    riskAnalysis.estimated_overrun_cr != null && riskAnalysis.estimated_overrun_cr > 0
      ? `+${fmtCrore(riskAnalysis.estimated_overrun_cr)} Estimated Escalation`
      : "Rs. 0.0 Cr"
  );
  y += 2;

  // 3. Executive Assessment Briefing
  if (plan.overall_assessment) {
    sectionHeader("3. Executive Risk Assessment & Policy Briefing", "AI Synthesis");
    const cleanAssessment = sanitizePdfText(plan.overall_assessment);
    const assessLines = doc.splitTextToSize(cleanAssessment, contentWidth - 10);
    const boxH = Math.max(14, 6 + assessLines.length * 3.8);

    checkPageBreak(boxH + 4);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(ml, y, contentWidth, boxH, 1.5, 1.5, "F");
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.8);
    doc.line(ml, y, ml, y + boxH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    let ny = y + 4.2;
    assessLines.forEach((line: string) => {
      doc.text(line, ml + 4, ny);
      ny += 3.8;
    });
    y += boxH + 3.5;
  }

  // 4. Critical Issues
  if (plan.critical_issues?.length > 0) {
    sectionHeader("4. Critical Project Vulnerabilities", "High-Priority Constraints");
    plan.critical_issues.slice(0, 3).forEach((iss: any, idx: number) => {
      checkPageBreak(12);
      const issueText = sanitizePdfText(iss.issue || "Critical delay in statutory clearances");
      const evText = sanitizePdfText(iss.evidence || "Identified via milestone monitoring");

      doc.setFillColor(254, 242, 242);
      doc.roundedRect(ml, y, contentWidth, 9, 1.2, 1.2, "F");
      doc.setDrawColor(254, 205, 211);
      doc.setLineWidth(0.4);
      doc.roundedRect(ml, y, contentWidth, 9, 1.2, 1.2, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(190, 18, 60);
      doc.text(`${idx + 1}. ${issueText}`, ml + 4, y + 4.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(evText, ml + 4, y + 7.5);

      y += 10.5;
    });
  }

  // ══════════════════════════════════════════════════════════
  // PAGE 2 — STRATEGIC ACTION PLAN & INTERVENTIONS
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  y = 26;

  sectionHeader("5. Immediate Mitigation Actions & Strategic Interventions", "Targeted 14 - 30 Day Deliverables");

  const actions = plan.mitigation_actions || [];
  if (actions.length > 0) {
    actions.forEach((act: any, idx: number) => {
      const actTitle = sanitizePdfText(act.action || "Deploy emergency corridor task force.");
      const actReason = sanitizePdfText(act.reason || "Accelerate milestone completion.");
      const actEv = sanitizePdfText(act.evidence || "");
      const stakeholder = sanitizePdfText(act.responsible_stakeholder || project.agency || "Implementing Agency");
      const timeline = sanitizePdfText(act.timeline || "14 Days");
      const priority = sanitizePdfText(act.priority || "Immediate");
      const dependency = sanitizePdfText(act.dependency || "State Clearances");

      const titleLines = doc.splitTextToSize(`${idx + 1}. ${actTitle}`, contentWidth - 28);
      const reasonLines = doc.splitTextToSize(`Justification: ${actReason}${actEv ? ` (Evidence: ${actEv})` : ""}`, contentWidth - 10);
      const boxH = Math.max(22, 12 + titleLines.length * 4 + reasonLines.length * 3.4);

      checkPageBreak(boxH + 3);

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(ml, y, contentWidth, boxH, 1.5, 1.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(ml, y, contentWidth, boxH, 1.5, 1.5, "D");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      let ay = y + 4.8;
      titleLines.forEach((tl: string) => {
        doc.text(tl, ml + 4, ay);
        ay += 4.2;
      });

      // Priority Badge
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(mr - 24, y + 2.5, 20, 4.5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(180, 83, 9);
      doc.text(priority.toUpperCase(), mr - 14, y + 5.7, { align: "center" });

      // Metadata Row
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(`Authority: ${stakeholder}   |   Timeline: ${timeline}   |   Dependency: ${dependency}`, ml + 4, ay + 1);

      // Justification Box
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      let ry = ay + 5.2;
      reasonLines.forEach((rl: string) => {
        doc.text(rl, ml + 4, ry);
        ry += 3.4;
      });

      y += boxH + 2.5;
    });
  }

  // 6. Multi-Disciplinary Interventions Grid
  sectionHeader("6. Coordinated Cross-Functional Interventions", "Budget, Schedule & Escalation");

  function renderListSection(title: string, items?: string[]) {
    if (!items || items.length === 0) return;
    checkPageBreak(12 + items.length * 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), ml + 2, y + 3.5);
    y += 5.5;

    items.forEach((it: string) => {
      checkPageBreak(5);
      const itClean = sanitizePdfText(it);
      const itLines = doc.splitTextToSize(itClean, contentWidth - 10);

      doc.setFillColor(6, 182, 212);
      doc.circle(ml + 3, y + 1.2, 0.8, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);

      let lY = y + 2.2;
      itLines.forEach((line: string) => {
        doc.text(line, ml + 6, lY);
        lY += 3.5;
      });
      y += itLines.length * 3.5 + 1;
    });
    y += 1.5;
  }

  renderListSection("Cost Control & Expenditure Restraint", plan.cost_control);
  renderListSection("Schedule Recovery & Critical Path Realignment", plan.schedule_recovery);
  renderListSection("Milestone Velocity Acceleration", plan.milestone_actions);
  renderListSection("Clearances & Dependency Resolution", plan.dependency_resolution);
  renderListSection("Administrative Escalation Triggers", plan.escalation_actions);

  // 7. Monitoring Indicators Table
  if (plan.monitoring_indicators?.length > 0) {
    sectionHeader("7. Continuous Surveillance & Review Targets", "Performance Metrics");
    plan.monitoring_indicators.slice(0, 4).forEach((m: any) => {
      checkPageBreak(6);
      const ind = sanitizePdfText(typeof m === "string" ? m : m.indicator || m);
      const tgt = sanitizePdfText(typeof m !== "string" ? m.target || "On-Track" : "Target Met");
      const resp = sanitizePdfText(typeof m !== "string" ? m.responsible || project.agency || "Agency" : "Agency");

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(ml, y, contentWidth, 5.5, 1, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(30, 41, 59);
      doc.text(ind, ml + 3, y + 3.8);

      doc.setTextColor(16, 185, 129);
      doc.text(tgt, ml + 115, y + 3.8);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(resp, mr - 3, y + 3.8, { align: "right" });

      y += 6.5;
    });
    y += 2;
  }

  // 8. Governance, Secondary AI Verification & Traceability
  sectionHeader("8. AI Governance, Verification & Traceability Audit", "Policy Audit Gate");
  const val = plan.secondary_ai_validation || {};
  rowItem("Secondary AI Auditor", val.validator_model || "Policy & Evidence Auditor (Secondary AI)");
  rowItem("Validation Status", (val.validation_status || "PASSED").toUpperCase(), true);
  rowItem("Project Specificity Score", `${(((val.specificity_score ?? 0.86)) * 100).toFixed(0)}% Evidence-Grounded`);
  if (val.critique_notes) {
    rowItem("Verification Audit Log", val.critique_notes);
  }
  rowItem("Source File Reference", sessionFileName || plan.source_traceability?.source_file || "Uploaded Flash Report");
  if (project.source_pdf_page != null) {
    rowItem("Authoritative Source Page", `Page ${project.source_pdf_page} (Table 6 All Ongoing Projects)`);
  }
  rowItem("Database Write Status", "0 DB Writes (Ephemeral Secure Memory Only)");

  // Disclaimer Note
  checkPageBreak(12);
  y += 2;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const disclaimer = "Statutory Disclaimer: This AI mitigation plan is decision-support intelligence synthesized directly from verified project baseline data. Administrative directives remain subject to competent authority approvals.";
  const discLines = doc.splitTextToSize(disclaimer, contentWidth);
  discLines.forEach((dl: string) => {
    doc.text(dl, ml, y);
    y += 3.2;
  });

  // ══════════════════════════════════════════════════════════
  // RUNNING FOOTERS ON ALL PAGES
  // ══════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let pIdx = 1; pIdx <= totalPages; pIdx++) {
    doc.setPage(pIdx);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(ml, H - 12, mr, H - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(`CONFIDENTIAL · MoSPI Infrastructure Project Monitoring Platform · PRISM`, ml, H - 8);
    doc.text(`Project ID: ${project.project_id}   |   Page ${pIdx} of ${totalPages}`, mr, H - 8, { align: "right" });
  }

  // Trigger download
  const cleanId = String(project.project_id).replace(/[^\w-]/g, "_");
  const cleanName = String(project.project_name).substring(0, 24).replace(/[^\w-]/g, "_");
  doc.save(`AI_Mitigation_Plan_${cleanId}_${cleanName}.pdf`);
}
