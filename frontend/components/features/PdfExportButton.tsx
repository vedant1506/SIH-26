"use client";
import { useState } from "react";
import type { Project, RiskPrediction } from "@/lib/types";
import { PRISM_LOGO_BASE64 } from "@/lib/logoBase64";
import { generateMitigation } from "@/lib/api";

interface Props {
  project: Project;
  prediction: RiskPrediction | null;
  mitigationPlan?: string | null;
  onMitigationFetched?: (text: string, model: string) => void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
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

export default function PdfExportButton({
  project: p,
  prediction: pred,
  mitigationPlan,
  onMitigationFetched,
  label = "Export Executive PDF Report",
  className = "btn btn-secondary",
  style,
}: Props) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);

    try {
      // 1. Ensure we have the full AI mitigation plan
      let activePlan = mitigationPlan;

      // Check if prediction narrative already contains the complete 3-phase plan
      if (!activePlan && pred?.ai_risk_narrative && /PHASE\s*1/i.test(pred.ai_risk_narrative)) {
        activePlan = pred.ai_risk_narrative;
      }

      // If not yet available, automatically fetch from the AI mitigation model
      if (!activePlan && p?.id) {
        try {
          const res = await generateMitigation(p.id);
          if (res?.mitigation_text) {
            activePlan = res.mitigation_text;
            onMitigationFetched?.(res.mitigation_text, res.model || "Hugging Face Qwen 2.5");
          }
        } catch (fetchErr) {
          console.warn("Auto-fetching mitigation plan for PDF failed, using standard roadmap fallback:", fetchErr);
        }
      }

      const logoBase64 = PRISM_LOGO_BASE64;
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const W = 210;
      const H = 297;
      const ml = 16;
      const mr = 194;
      const contentWidth = mr - ml;
      let y = 28;

      const TIER_RGB: Record<string, [number, number, number]> = {
        critical: [225, 29, 72],
        high: [217, 119, 6],
        medium: [37, 99, 235],
        low: [16, 185, 129],
      };
      const tierColor: [number, number, number] = pred
        ? TIER_RGB[pred.risk_tier] || [100, 116, 139]
        : [100, 116, 139];

      function checkPageBreak(neededHeight: number) {
        if (y + neededHeight > H - 22) {
          doc.addPage();
          y = 28;
        }
      }

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

      function sectionHeader(title: string, subtitle?: string) {
        checkPageBreak(12);
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(ml, y, contentWidth, 6.5, 1.5, 1.5, "F");
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
        doc.text(sanitizePdfText(val), ml + 72, y);
        y += 5.2;
      }

      // ================= PAGE 1 =================
      // Document Title Banner Card
      const safeProjectName = sanitizePdfText(p.project_name || "Infrastructure Project");
      const titleLines = doc.splitTextToSize(safeProjectName, contentWidth - 10);
      const bannerHeight = Math.max(18, 11 + titleLines.length * 4.8);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(ml, y, contentWidth, bannerHeight, 2.5, 2.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(ml, y, contentWidth, bannerHeight, 2.5, 2.5, "D");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);

      let ty = y + 5.5;
      titleLines.forEach((tLine: string) => {
        doc.text(tLine, ml + 4, ty);
        ty += 4.8;
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const metaText = `Ministry: ${sanitizePdfText(p.ministry || "N/A")}   |   Sector: ${sanitizePdfText(p.sector || "N/A")}   |   State: ${sanitizePdfText(p.state || "India")}`;
      doc.text(metaText, ml + 4, ty + 0.5);
      y += bannerHeight + 4;

      // Section 1: Executive Risk Summary
      sectionHeader("1. Risk Assessment & Predictive Inference", "XGBoost + QLoRA Engine");
      if (pred) {
        rowItem("Assigned Risk Tier", (pred.risk_tier || "N/A").toUpperCase(), true);
        rowItem("Composite Risk Score", `${(pred.composite_risk_score * 100).toFixed(1)}% Index`, true);
        rowItem("Schedule Delay Probability", `${(pred.delay_probability * 100).toFixed(1)}%`);
        rowItem(
          "Forecasted Schedule Delay",
          pred.delay_duration_months > 0
            ? `+${pred.delay_duration_months.toFixed(1)} Months Lag`
            : "On Scheduled Track"
        );
        rowItem("Cost Overrun Probability", `${(pred.cost_overrun_probability * 100).toFixed(1)}%`);
        rowItem(
          "Projected Fiscal Exposure",
          pred.cost_overrun_amount_cr > 0
            ? `+Rs. ${pred.cost_overrun_amount_cr.toFixed(2)} Crore`
            : "Rs. 0.00 Crore"
        );
      }
      y += 2.5;

      // Section 2: Financial & Physical Baseline
      sectionHeader("2. Financial Expenditure & Progress Audit", "MoSPI Baseline");
      rowItem(
        "Original Sanctioned Cost",
        `Rs. ${(p.original_cost_cr || 0).toLocaleString("en-IN")} Crore`
      );
      rowItem(
        "Revised Sanctioned Cost",
        p.revised_cost_cr != null ? `Rs. ${p.revised_cost_cr.toLocaleString("en-IN")} Crore` : "Not Revised"
      );
      rowItem(
        "Cumulative Expenditure",
        p.cumulative_expenditure_cr != null
          ? `Rs. ${p.cumulative_expenditure_cr.toLocaleString("en-IN")} Crore (${p.burn_rate_pct != null ? p.burn_rate_pct.toFixed(1) : "—"}% Budget Burn)`
          : "N/A"
      );
      rowItem(
        "Physical Progress Achieved",
        p.physical_progress_pct != null ? `${p.physical_progress_pct.toFixed(1)}% Completion` : "N/A"
      );
      rowItem(
        "Expenditure vs Progress Gap",
        p.burn_progress_gap != null
          ? `${p.burn_progress_gap > 0 ? "+" : ""}${p.burn_progress_gap.toFixed(1)}% Spend Lead`
          : "N/A",
        true
      );
      rowItem(
        "Timeline Elapsed Ratio",
        p.time_elapsed_ratio != null ? `${(p.time_elapsed_ratio * 100).toFixed(1)}% of Scheduled Horizon` : "N/A"
      );
      y += 2.5;

      // Section 3: MoSPI Executive Risk Assessment Briefing
      if (pred?.ai_risk_narrative) {
        sectionHeader("3. MoSPI Executive Risk Assessment Briefing", "AI Policy Synthesis");

        let cleanNarrative = sanitizePdfText(
          pred.ai_risk_narrative
            .replace(/\[.*?Briefing\]/gi, "")
            .replace(/(?:Recommended Resolution|Recommended Action Plan|EXECUTIVE MITIGATION PLAN|Mitigation Plan)[\s\S]*$/i, "")
        );

        const narrativeLines = doc.splitTextToSize(cleanNarrative, contentWidth - 10);
        const boxH = Math.max(16, 6 + narrativeLines.length * 3.8);

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(ml, y, contentWidth, boxH, 2, 2, "F");
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.8);
        doc.line(ml, y, ml, y + boxH);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);

        let ny = y + 4.2;
        narrativeLines.forEach((line: string) => {
          doc.text(line, ml + 4, ny);
          ny += 3.8;
        });
        y += boxH + 3.5;
      }

      // Section 4: SHAP Risk Drivers (rendered on Page 1)
      sectionHeader("4. Key Risk Drivers (SHAP Feature Attribution)", "Inference Attribution");

      if (pred?.shap_values && pred.shap_values.length > 0) {
        pred.shap_values.slice(0, 3).forEach((sv, idx) => {
          const sign = sv.direction === "positive" ? "+" : "-";
          const impactStr = `${sign}${(Math.abs(sv.value) * 100).toFixed(0)}%`;
          const isLag = sv.direction === "positive";

          doc.setFillColor(248, 250, 252);
          doc.roundedRect(ml, y, contentWidth, 8.5, 1.5, 1.5, "F");
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.4);
          doc.roundedRect(ml, y, contentWidth, 8.5, 1.5, 1.5, "D");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(`${idx + 1}. ${sanitizePdfText(sv.label)}`, ml + 4, y + 5.5);

          doc.setFillColor(isLag ? 225 : 16, isLag ? 29 : 185, isLag ? 72 : 129);
          doc.roundedRect(mr - 28, y + 2, 24, 4.8, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.text(`Impact ${impactStr}`, mr - 16, y + 5.2, { align: "center" });

          y += 10;
        });
      }

      // ================= PAGE 2: AI MITIGATION PLAN =================
      doc.addPage();
      y = 28;

      sectionHeader("5. AI-Generated Mitigation Strategy & Strategic Action Plan", "Hugging Face Qwen 2.5 Engine");

      if (activePlan) {
        const rawLines = activePlan
          .split("\n")
          .map((l) => sanitizePdfText(l))
          .filter((l) => l.length > 0);

        let overviewLines: string[] = [];
        const phases: Array<{ title: string; items: string[] }> = [];
        let currentPhase: { title: string; items: string[] } | null = null;

        for (const line of rawLines) {
          if (/^PHASE\s*\d+/i.test(line) || /^Phase\s*\d+/i.test(line)) {
            if (currentPhase) phases.push(currentPhase);
            currentPhase = { title: line, items: [] };
          } else if (/^\d+[\.\)]\s+/.test(line)) {
            if (currentPhase) {
              currentPhase.items.push(line);
            } else {
              currentPhase = { title: "PHASE 1: IMMEDIATE MOBILIZATION & FIELD ACTIONS (0 - 30 DAYS)", items: [line] };
            }
          } else if (line.startsWith("Status:") || line.startsWith("Context:") || line.startsWith("EXECUTIVE MITIGATION")) {
            overviewLines.push(line);
          } else if (currentPhase && currentPhase.items.length > 0) {
            currentPhase.items[currentPhase.items.length - 1] += " " + line;
          } else if (currentPhase) {
            currentPhase.items.push(line);
          } else {
            overviewLines.push(line);
          }
        }
        if (currentPhase) phases.push(currentPhase);

        // Render Overview Box
        if (overviewLines.length > 0) {
          checkPageBreak(18);
          const ovClean = overviewLines.join("   |   ");
          const splitOv = doc.splitTextToSize(ovClean, contentWidth - 8);
          const ovH = Math.max(10, 5 + splitOv.length * 3.6);

          doc.setFillColor(240, 253, 250);
          doc.roundedRect(ml, y, contentWidth, ovH, 1.5, 1.5, "F");
          doc.setDrawColor(13, 148, 136);
          doc.setLineWidth(0.7);
          doc.line(ml, y, ml, y + ovH);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(13, 148, 136);

          let ovy = y + 3.8;
          splitOv.forEach((ol: string) => {
            doc.text(ol, ml + 3, ovy);
            ovy += 3.6;
          });
          y += ovH + 3;
        }

        // Render All Phases & Action Items
        phases.forEach((phase) => {
          checkPageBreak(24);

          // Phase Header Banner
          doc.setFillColor(238, 242, 255);
          doc.roundedRect(ml, y, contentWidth, 6, 1.5, 1.5, "F");
          doc.setDrawColor(99, 102, 241);
          doc.setLineWidth(0.4);
          doc.roundedRect(ml, y, contentWidth, 6, 1.5, 1.5, "D");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(67, 56, 202);
          doc.text(phase.title.toUpperCase(), ml + 4, y + 4.2);
          y += 8;

          // Phase Action Items
          phase.items.forEach((itemText) => {
            checkPageBreak(14);

            let numPrefix = "-";
            let descPart = itemText;
            const numMatch = itemText.match(/^(\d+[\.\)]\s*)(.*)/);
            if (numMatch) {
              numPrefix = numMatch[1].trim();
              descPart = numMatch[2].trim();
            }

            const colonIdx = descPart.indexOf(":");
            let titlePart = "";
            if (colonIdx > 0 && colonIdx < 45) {
              titlePart = descPart.substring(0, colonIdx + 1).trim();
              descPart = descPart.substring(colonIdx + 1).trim();
            }

            const fullItemText = titlePart ? `${titlePart} ${descPart}` : descPart;
            const itemLines = doc.splitTextToSize(fullItemText, contentWidth - 14);
            const itemBoxH = Math.max(8, 4 + itemLines.length * 3.6);

            doc.setFillColor(255, 255, 255);
            doc.roundedRect(ml, y, contentWidth, itemBoxH, 1, 1, "F");
            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.3);
            doc.roundedRect(ml, y, contentWidth, itemBoxH, 1, 1, "D");

            // Number Badge Pill
            doc.setFillColor(243, 244, 246);
            doc.roundedRect(ml + 2.5, y + 1.8, 6, 4.2, 0.8, 0.8, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(75, 85, 99);
            doc.text(numPrefix.replace(/\D/g, "") || "-", ml + 5.5, y + 4.8, { align: "center" });

            // Content
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(30, 41, 59);

            let lineY = y + 4.2;
            itemLines.forEach((il: string) => {
              doc.text(il, ml + 11, lineY);
              lineY += 3.6;
            });

            y += itemBoxH + 2;
          });
          y += 1.5;
        });
      } else {
        // Fallback standard roadmap
        const roadmapMap: Record<string, string[]> = {
          critical: [
            "1. Issue formal notice to contractor for joint site and financial audit within 48 hours.",
            "2. Escalate project oversight to Secretary level; establish daily monitoring committee.",
            "3. Mandate milestone-linked escrow account disbursements to prevent capital mis-allocation.",
            "4. Deploy fast-track mechanized construction shifts to accelerate lagging civil works.",
          ],
          high: [
            "1. Schedule mandatory site inspection by Ministry Regional Officer within 7 days.",
            "2. Instruct contractor to deploy secondary workforce shifts to accelerate progress.",
            "3. Expedite land acquisition and Right of Way (ROW) clearances with state administration.",
            "4. Institute weekly micro-milestone reporting on PRAGATI & PRISM portals.",
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
          checkPageBreak(8);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(sanitizePdfText(stepText), ml + 2, y);
          y += 5.5;
        });
      }

      // Official Signature & Seal Block
      checkPageBreak(25);
      y += 4;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(ml, y + 10, ml + 60, y + 10);
      doc.line(mr - 60, y + 10, mr, y + 10);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("Authorized Project Director / Officer", ml, y + 14);
      doc.text("PRISM AI Verification & Audit Seal", mr, y + 14, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(`Digital Sign-off: MoSPI-ID #${p.id.slice(0, 12).toUpperCase()}`, ml, y + 17.5);
      doc.text(`Verified On: ${new Date().toLocaleDateString("en-IN")}`, mr, y + 17.5, { align: "right" });

      // Global Header & Footer Pass
      const totalPages = doc.getNumberOfPages();
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum);

        // Top Primary Bar
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, W, 20, "F");

        // PRISM Official Logo Image
        if (logoBase64) {
          try {
            doc.addImage(logoBase64, "JPEG", ml, 2.5, 15, 15);
          } catch {
            drawFallbackLogo(ml, 2.5);
          }
        } else {
          drawFallbackLogo(ml, 2.5);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.text("PRISM - Predictive Risk & Infrastructure Status Monitoring", ml + 20, 9);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Ministry of Statistics & Programme Implementation - Government of India", ml + 20, 15);

        // Classification Badge
        doc.setFillColor(...tierColor);
        doc.roundedRect(mr - 36, 3.5, 36, 13, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text("RISK TIER", mr - 18, 8, { align: "center" });
        doc.setFontSize(8.5);
        doc.text((pred ? pred.risk_tier : "PENDING").toUpperCase(), mr - 18, 13.5, { align: "center" });

        // Footer Divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(ml, H - 12, mr, H - 12);

        // Footer Content
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "bold");
        doc.text("CONFIDENTIAL // EXECUTIVE DECISION SUPPORT REPORT", ml, H - 7.5);
        doc.setFont("helvetica", "normal");
        doc.text(
          `DOC-ID: PRISM-2026-${p.id.slice(0, 8).toUpperCase()} - Generated: ${new Date().toLocaleDateString("en-IN")}`,
          ml,
          H - 4
        );
        doc.text(`Page ${pageNum} of ${totalPages}`, mr, H - 4, { align: "right" });
      }

      // Save PDF
      const safeFilename = safeProjectName.replace(/[^a-z0-9]/gi, "_").slice(0, 30);
      doc.save(`PRISM_Executive_Report_${safeFilename}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please ensure your browser supports PDF generation.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      id="pdf-export-btn"
      className={className}
      style={style}
      onClick={handleExport}
      disabled={exporting}
      title="Download Comprehensive Executive Risk & AI Mitigation Report (PDF)"
    >
      {exporting ? "Generating PDF Report..." : label}
    </button>
  );
}
