// ============================================================
// Phase 2 Hybrid Zero-Crash Fallback Verification Test Suite
// ============================================================

import {
  listProjects,
  getProject,
  getPortfolioSummary,
  getEarlyWarnings,
  getCostDrivers,
  getBenchmarking,
  getModelMetrics,
  getFraudAndCartelAnalytics,
  predictProject,
  generateMitigationPlan,
  getDataMode,
  isFallbackMode,
  setSimulateApiFailure,
  setSimulateTimeout,
  FALLBACK_LABEL,
  FALLBACK_PROJECTS,
} from "../lib/api";

async function runTests() {
  console.log("============================================================");
  console.log("  PHASE 2 — HYBRID ZERO-CRASH FALLBACK VERIFICATION SUITE");
  console.log("============================================================\n");

  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    testsTotal++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
    }
  }

  // ------------------------------------------------------------
  // TEST 1: Normal Live-Data Test
  // ------------------------------------------------------------
  console.log("--- 1. Normal Live-Data Mode Verification ---");
  setSimulateApiFailure(false);
  setSimulateTimeout(0);

  try {
    const liveProjects = await listProjects({ limit: 5 });
    const liveSummary = await getPortfolioSummary();
    const modeAfterSuccess = getDataMode();

    assert(modeAfterSuccess === "LIVE DATA MODE", "Mode reports LIVE DATA MODE when API succeeds");
    assert(Array.isArray(liveProjects) && liveProjects.length > 0, "Live projects returned successfully", `Count: ${liveProjects?.length}`);
    assert(liveSummary && liveSummary.total_projects > 0, "Live portfolio summary returned with positive project count");
    assert(!liveProjects[0].is_fallback, "Live records are NOT marked as fallback records (Isolation Rule)");
  } catch (err: any) {
    console.error("Live test encountered error:", err.message);
    assert(false, "Live data fetching executed without uncaught exception", err.message);
  }

  // ------------------------------------------------------------
  // TEST 2: Simulated API Failure Test
  // ------------------------------------------------------------
  console.log("\n--- 2. Simulated API Failure & Offline Fallback Mode ---");
  setSimulateApiFailure(true);

  try {
    const fallbackProjects = await listProjects();
    const modeInFailure = getDataMode();

    assert(modeInFailure === "OFFLINE FALLBACK MODE", "Mode switches to OFFLINE FALLBACK MODE upon API failure");
    assert(isFallbackMode() === true, "isFallbackMode() returns true");
    assert(Array.isArray(fallbackProjects) && fallbackProjects.length === FALLBACK_PROJECTS.length, "All rich fallback projects available offline");

    const sample = fallbackProjects[0];
    assert(sample.data_source === FALLBACK_LABEL, `Fallback record explicitly labeled with '${FALLBACK_LABEL}'`);
    assert(sample.is_fallback === true, "Fallback record contains is_fallback: true");

    // Required fields verification
    assert(Boolean(sample.id), "Contains project ID", sample.id);
    assert(Boolean(sample.project_name), "Contains project name", sample.project_name);
    assert(Boolean(sample.state), "Contains state", sample.state);
    assert(Boolean(sample.district), "Contains district", sample.district || "N/A");
    assert(Boolean(sample.sector), "Contains sector", sample.sector);
    assert(typeof sample.latitude === "number" && typeof sample.longitude === "number", "Contains valid GIS coordinates", `${sample.latitude}, ${sample.longitude}`);
    assert(typeof sample.physical_progress_pct === "number", "Contains physical progress %", `${sample.physical_progress_pct}%`);
    assert(typeof sample.burn_rate_pct === "number" && typeof sample.cumulative_expenditure_cr === "number", "Contains financial progress (burn rate & expenditure)");
    assert(typeof sample.composite_risk_score === "number", "Contains composite risk score", `${sample.composite_risk_score}`);
    assert(["critical", "high", "medium", "low"].includes(sample.risk_tier || ""), "Contains authoritative risk tier", sample.risk_tier || "N/A");
    assert(typeof sample.delay_probability === "number", "Contains delay prediction probability", `${sample.delay_probability}`);
    assert(typeof sample.cost_overrun_probability === "number", "Contains cost overrun prediction probability", `${sample.cost_overrun_probability}`);
    assert(Boolean(sample.anomaly_information?.anomaly_type), "Contains anomaly information", sample.anomaly_information?.anomaly_type);
    assert(Array.isArray(sample.warnings) && sample.warnings.length > 0, "Contains warnings array", sample.warnings?.[0]);
    assert(Array.isArray(sample.shap_factors) && sample.shap_factors.length > 0, "Contains SHAP factors array", `${sample.shap_factors?.length} features`);
    assert(Boolean(sample.source_document), "Contains source document citation", sample.source_document);
    assert(typeof sample.source_pdf_page === "number", "Contains source PDF page citation", `Page ${sample.source_pdf_page}`);
  } catch (err: any) {
    assert(false, "Simulated API failure executed with zero crashes", err.message);
  }

  // ------------------------------------------------------------
  // TEST 3: Interactivity Verification in Fallback Mode
  // ------------------------------------------------------------
  console.log("\n--- 3. Interactivity in Fallback Mode (Search, Filters, Charts, GIS) ---");
  try {
    // Search
    const searchRes = await listProjects({ search: "Kadapa" });
    assert(searchRes.length > 0 && searchRes[0].project_name.includes("Kadapa"), "Project search interactive in fallback mode");

    // Risk Tier Filter
    const criticalRes = await listProjects({ risk_tier: "critical" });
    const allCritical = criticalRes.every((p) => p.risk_tier === "critical");
    assert(criticalRes.length > 0 && allCritical, "Risk filter (critical) interactive and accurate in fallback mode");

    // State Filter
    const apRes = await listProjects({ state: "Andhra Pradesh" });
    const allAP = apRes.every((p) => p.state === "Andhra Pradesh");
    assert(apRes.length > 0 && allAP, "State filter (Andhra Pradesh) interactive and accurate in fallback mode");

    // Sector Filter
    const railRes = await listProjects({ sector: "Railways" });
    const allRail = railRes.every((p) => p.sector === "Railways");
    assert(railRes.length > 0 && allRail, "Sector filter (Railways) interactive and accurate in fallback mode");

    // GIS Coordinates Integrity for Map & Region Jumping
    const allHaveCoords = FALLBACK_PROJECTS.every((p) => typeof p.latitude === "number" && typeof p.longitude === "number");
    assert(allHaveCoords, "100% of fallback projects have valid geographic coordinates for GIS map & region jumping");

    // Project Dossier & Predictions
    const dossierProject = await getProject("fb-proj-001");
    const dossierPred = await predictProject("fb-proj-001");
    const dossierMitigation = await generateMitigationPlan("fb-proj-001");
    assert(dossierProject && dossierProject.id === "fb-proj-001", "Project Dossier resolves successfully offline");
    assert(dossierPred && dossierPred.shap_values.length > 0, "AI prediction with SHAP waterfall values resolves offline");
    assert(dossierMitigation.success && dossierMitigation.plan.mitigation_actions.length > 0, "Structured AI mitigation plan resolves offline");

    // Early Warnings, Cost Drivers, Benchmarking, Forensics
    const warningsRes = await getEarlyWarnings();
    const costDriversRes = await getCostDrivers();
    const benchRes = await getBenchmarking();
    const metricsRes = await getModelMetrics();
    const fraudRes = await getFraudAndCartelAnalytics();

    assert(warningsRes && warningsRes.warnings.length > 0, "Early Warning signals and severity counts resolve offline");
    assert(costDriversRes && costDriversRes.drivers.length > 0, "Cost drivers and sector profiles resolve offline");
    assert(benchRes && benchRes.sector_benchmarks.length > 0, "Benchmarking sector metrics resolve offline");
    assert(metricsRes && metricsRes.accuracy > 0.8, "Model validation metrics resolve offline");
    assert(fraudRes && fraudRes.phantom_projects.length > 0, "Procurement forensics anomaly tables resolve offline");
  } catch (err: any) {
    assert(false, "Interactive components resolved without uncaught exception", err.message);
  }

  // ------------------------------------------------------------
  // TEST 4: Timeout Test
  // ------------------------------------------------------------
  console.log("\n--- 4. Request Timeout Resilience Test ---");
  try {
    setSimulateApiFailure(false);
    setSimulateTimeout(150); // Simulate network latency/timeout

    const timeoutProjects = await listProjects({ limit: 3 });
    assert(isFallbackMode() === true, "Timeout automatically triggers transition to OFFLINE FALLBACK MODE");
    assert(timeoutProjects.length > 0 && timeoutProjects[0].is_fallback === true, "Fallback intelligence returned gracefully during timeout");
  } catch (err: any) {
    assert(false, "Timeout handled with zero crashes", err.message);
  } finally {
    setSimulateTimeout(0);
  }

  // ------------------------------------------------------------
  // TEST 5: Recovery to Live Data Mode
  // ------------------------------------------------------------
  console.log("\n--- 5. API Recovery & Live Data Mode Restoration ---");
  try {
    setSimulateApiFailure(false);
    setSimulateTimeout(0);

    const recoveredProjects = await listProjects({ limit: 5 });
    const recoveredMode = getDataMode();

    assert(recoveredMode === "LIVE DATA MODE", "Mode cleanly restored to LIVE DATA MODE once API is reachable");
    assert(isFallbackMode() === false, "isFallbackMode() returns false after recovery");
    assert(recoveredProjects.length > 0 && !recoveredProjects[0].is_fallback, "Live data returned without fallback contamination");
  } catch (err: any) {
    assert(false, "Recovery executed without exception", err.message);
  }

  console.log("\n============================================================");
  console.log(`  VERIFICATION RESULT: ${testsPassed}/${testsTotal} TESTS PASSED (${((testsPassed / testsTotal) * 100).toFixed(0)}%)`);
  console.log("============================================================\n");

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
