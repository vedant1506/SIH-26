"use client";
import type { Project, RiskPrediction } from "@/lib/types";
import { PRISM_LOGO_BASE64 } from "@/lib/logoBase64";

interface Props {
  project: Project;
  prediction: RiskPrediction | null;
  mitigationPlan?: string | null;
  label?: string;
  className?: string;
}

export default function PdfExportButton({ project: p, prediction: pred, mitigationPlan, label = "📄 Executive PDF Report", className = "btn btn-secondary" }: Props) {
  async function handleExport() {
    const logoBase64 = PRISM_LOGO_BASE64;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const W = 210;
    const H = 297;
    const ml = 16;
    const mr = 194;
    let y = 0;

    const TIER_RGB: Record<string, [number, number, number]> = {
      critical: [225, 29, 72],
      high: [217, 119, 6],
      medium: [37, 99, 235],
      low: [16, 185, 129],
    };
    const tierColor: [number, number, number] = pred ? TIER_RGB[pred.risk_tier] || [100, 116, 139] : [100, 116, 139];

    // Helper: Fallback Emblem Logo
    function drawFallbackLogo(x: number, startY: number) {
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(x, startY, 15, 15, 3, 3, "F");
      doc.setDrawColor(56, 189, 248);
      doc.setLineWidth(0.6);
      doc.line(x + 7.5, startY + 2, x + 13, startY + 7.5);
      doc.line(x + 13, startY + 7.5, x + 7.5, startY + 13);
      doc.line(x + 7.5, startY + 13, x + 2, startY + 7.5);
      doc.line(x + 2, startY + 7.5, x + 7.5, startY + 2);
      doc.setFillColor(56, 189, 248);
      doc.circle(x + 7.5, startY + 7.5, 2, "F");
    }

    // Helper: Page Frame Header & Footer
    function drawPageHeaderFooter(pageNum: number, totalPages: number) {
      // Top Primary Bar
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, W, 22, "F");

      // PRISM Official Logo Image
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, "JPEG", ml, 3, 16, 16);
        } catch (e) {
          drawFallbackLogo(ml, 3.5);
        }
      } else {
        drawFallbackLogo(ml, 3.5);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("PRISM — Predictive Risk & Infrastructure Status Monitoring", ml + 20, 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Ministry of Statistics & Programme Implementation  •  Government of India", ml + 20, 16);

      // Classification Badge
      doc.setFillColor(...tierColor);
      doc.roundedRect(mr - 36, 4, 36, 14, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("RISK TIER", mr - 18, 9, { align: "center" });
      doc.setFontSize(9);
      doc.text(pred ? pred.risk_tier.toUpperCase() : "PENDING", mr - 18, 15, { align: "center" });

      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(ml, H - 14, mr, H - 14);

      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.text("CONFIDENTIAL  //  EXECUTIVE DECISION SUPPORT REPORT", ml, H - 9);
      doc.setFont("helvetica", "normal");
      doc.text(`DOC-ID: PRISM-2026-${p.id.slice(0, 8).toUpperCase()}  •  Generated: ${new Date().toLocaleDateString("en-IN")}`, ml, H - 5);
      doc.text(`Page ${pageNum} of ${totalPages}`, mr, H - 5, { align: "right" });
    }

    // Page 1 Setup
    drawPageHeaderFooter(1, 2);
    y = 30;

    // Document Title Banner
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(ml, y, mr - ml, 20, 3, 3, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(ml, y, mr - ml, 20, 3, 3, "D");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(p.project_name, ml + 5, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Ministry: ${p.ministry}   |   Sector: ${p.sector}   |   State: ${p.state}`, ml + 5, y + 15);
    y += 26;

    // Section Header Helper
    function sectionHeader(title: string) {
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(ml, y, mr - ml, 7, 2, 2, "F");
      doc.setTextColor(56, 189, 248);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(title.toUpperCase(), ml + 4, y + 5);
      y += 11;
    }

    function rowItem(label: string, val: string, isHighlighted = false) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(label, ml + 2, y);
      doc.setFont("helvetica", isHighlighted ? "bold" : "normal");
      doc.setFontSize(9);
      doc.setTextColor(isHighlighted ? tierColor[0] : 15, isHighlighted ? tierColor[1] : 23, isHighlighted ? tierColor[2] : 42);
      doc.text(val, ml + 75, y);
      y += 6;
    }

    // Section 1: Executive Risk Summary
    sectionHeader("1. Risk Assessment & Predictive Inference");
    if (pred) {
      rowItem("Active Model Architecture", "AI Predictive Engine (XGBoost + QLoRA)");
      rowItem("Composite Risk Score", `${(pred.composite_risk_score * 100).toFixed(1)}%`, true);
      rowItem("Assigned Risk Tier", pred.risk_tier.toUpperCase(), true);
      rowItem("Schedule Delay Probability", `${(pred.delay_probability * 100).toFixed(1)}%`);
      rowItem("Estimated Schedule Delay", `~${pred.delay_duration_months.toFixed(1)} months`);
      rowItem("Cost Overrun Risk Probability", `${(pred.cost_overrun_probability * 100).toFixed(1)}%`);
      rowItem("Estimated Cost Overrun", `₹${pred.cost_overrun_amount_cr.toFixed(2)} Crore`);
    }
    y += 4;

    // Section 2: Financial & Physical Baseline
    sectionHeader("2. Financial Expenditure & Progress Audit");
    rowItem("Original Sanctioned Budget", `₹${p.original_cost_cr.toLocaleString("en-IN")} Crore`);
    rowItem("Revised Estimate Cost", p.revised_cost_cr ? `₹${p.revised_cost_cr.toLocaleString("en-IN")} Crore` : "Not Revised");
    rowItem("Cumulative Expenditure", p.cumulative_expenditure_cr ? `₹${p.cumulative_expenditure_cr.toLocaleString("en-IN")} Crore` : "N/A");
    rowItem("Physical Progress Achieved", p.physical_progress_pct != null ? `${p.physical_progress_pct.toFixed(1)}%` : "N/A");
    rowItem("Financial Burn Rate", p.burn_rate_pct != null ? `${p.burn_rate_pct.toFixed(1)}%` : "N/A");
    rowItem("Burn Rate vs Progress Gap", p.burn_progress_gap != null ? `${p.burn_progress_gap > 0 ? "+" : ""}${p.burn_progress_gap.toFixed(1)}%` : "N/A", true);
    rowItem("Time Elapsed Ratio", p.time_elapsed_ratio != null ? `${(p.time_elapsed_ratio * 100).toFixed(1)}%` : "N/A");
    y += 4;

    // Section 3: MoSPI Executive Risk Assessment Briefing
    if (pred?.ai_risk_narrative) {
      sectionHeader("3. MoSPI Executive Risk Assessment Briefing");

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(ml, y, mr - ml, 22, 2, 2, "F");
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.8);
      doc.line(ml, y, ml, y + 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      let cleanNarrative = pred.ai_risk_narrative
        .replace(/\[.*?Briefing\]/gi, "")
        .replace(/(?:Recommended Resolution|Recommended Action Plan):\s*[\s\S]+$/i, "")
        .trim();

      const narrativeLines = doc.splitTextToSize(cleanNarrative, mr - ml - 8);
      let ny = y + 4.5;
      narrativeLines.slice(0, 4).forEach((line: string) => {
        doc.text(line, ml + 4, ny);
        ny += 4;
      });
      y += 26;
    }

    // Page 2 Setup
    doc.addPage();
    drawPageHeaderFooter(2, 2);
    y = 30;

    // Section 4: AI Risk Drivers (SHAP Analysis)
    sectionHeader("4. Key Risk Drivers (SHAP Analysis)");
    if (pred?.shap_values && pred.shap_values.length > 0) {
      pred.shap_values.slice(0, 3).forEach((sv, idx) => {
        const sign = sv.direction === "positive" ? "+" : "-";
        const impactStr = `${sign}${(Math.abs(sv.value) * 100).toFixed(0)}%`;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(ml, y, mr - ml, 11, 2, 2, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(ml, y, mr - ml, 11, 2, 2, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${idx + 1}. ${sv.label}`, ml + 4, y + 7);

        doc.setFillColor(sv.direction === "positive" ? 225 : 16, sv.direction === "positive" ? 29 : 185, sv.direction === "positive" ? 72 : 129);
        doc.roundedRect(mr - 28, y + 3, 24, 5, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(`Impact ${impactStr}`, mr - 16, y + 6.5, { align: "center" });

        y += 14;
      });
    }

    // Section 5: AI-Generated Mitigation Plan (Fine-Tuned Model)
    y += 2;
    sectionHeader("5. AI-Generated Mitigation Plan & Action Items");

    if (mitigationPlan) {
      doc.setFillColor(240, 253, 250);
      doc.roundedRect(ml, y, mr - ml, 52, 2, 2, "F");
      doc.setDrawColor(13, 148, 136);
      doc.setLineWidth(0.8);
      doc.line(ml, y, ml, y + 52);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(13, 148, 136);
      doc.text("AI ACTION PLAN (Fine-Tuned Policy Model):", ml + 4, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      const planLines = doc.splitTextToSize(mitigationPlan, mr - ml - 8);
      let py = y + 12;
      planLines.slice(0, 9).forEach((line: string) => {
        doc.text(line, ml + 4, py);
        py += 4.2;
      });
      y += 56;
    } else {
      // Fallback standard roadmap if not generated yet
      const roadmapMap: Record<string, string[]> = {
        critical: [
          "1. Issue formal notice to contractor for joint site and financial audit within 48 hours.",
          "2. Escalate project oversight to Secretary level; establish daily monitoring committee.",
          "3. Mandate milestone-linked escrow account disbursements to prevent capital mis-allocation.",
        ],
        high: [
          "1. Schedule mandatory site inspection by Ministry Regional Officer within 7 days.",
          "2. Instruct contractor to deploy secondary workforce shifts to accelerate progress.",
          "3. Expedite land acquisition and Right of Way (ROW) clearances with state administration.",
        ],
        medium: [
          "1. Require monthly progress velocity reports to be submitted directly to project director.",
          "2. Expedite pending regulatory approvals and utility shifting clearances.",
          "3. Conduct quarterly risk re-assessment utilizing PRISM AI predictive model.",
        ],
        low: [
          "1. Maintain standard monthly milestone monitoring and reporting schedule.",
          "2. Continue routine financial disbursements aligned with certified progress reports.",
        ],
      };
      const steps = pred ? roadmapMap[pred.risk_tier] || roadmapMap.low : roadmapMap.low;
      steps.forEach((stepText) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(stepText, ml + 2, y);
        y += 5.5;
      });
      y += 8;
    }

    // Signature Block
    doc.setDrawColor(203, 213, 225);
    doc.line(ml, y + 15, ml + 60, y + 15);
    doc.line(mr - 60, y + 15, mr, y + 15);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Authorized Officer Signature", ml, y + 19);
    doc.text("PRISM AI Verification Seal", mr, y + 19, { align: "right" });

    doc.save(`PRISM_Executive_Report_${p.project_name.replace(/[^a-z0-9]/gi, "_").slice(0, 25)}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <button id="pdf-export-btn" className={className} onClick={handleExport} title="Download Executive Risk Report with Official PRISM Logo (PDF)">
      {label}
    </button>
  );
}
