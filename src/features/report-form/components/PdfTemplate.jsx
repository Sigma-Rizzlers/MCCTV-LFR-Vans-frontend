import { useState } from "react";
import { exportReportToPdfBlob, openPrintFallbackFromElement, saveBlobToFile } from "../utils/pdfExport";

function formatDate(value) {
  if (!value) return "មិនបានបញ្ចូល";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function renderValue(value) {
  return String(value ?? "").trim() || "មិនបានបញ្ចូល";
}

function createPdfFileName(requestId) {
  const safeId = String(requestId ?? "").trim().replace(/[^A-Za-z0-9-_]/g, "-");
  return `MCCTV-request-${safeId || "unknown"}.pdf`;
}

function buildReportSections(report) {
  const fd = report?.formData;
  const formData = (fd && typeof fd === "object") ? fd : {};
  const filledVehicles = Array.isArray(report?.vehicles) ? report.vehicles : [];
  const filledEquipment = Array.isArray(report?.equipmentItems) ? report.equipmentItems : [];
  const adminPanel = report?.adminPanel;

  return (
    <section key="report-sections" className="pdf-grid">
      <section className="pdf-panel pdf-panel-full">
        <h3>ព័ត៌មានបេសកកម្ម</h3>
        <table className="pdf-member-table">
          <tbody>
            <tr><th>កម្មវិធី</th><td>{renderValue(adminPanel?.missionTitle || formData.missionTitle)}</td></tr>
            <tr><th>ទីតាំង</th><td>{renderValue(adminPanel?.missionPlace || formData.missionPlace)}</td></tr>
            <tr><th>ពេលវេលា</th><td>{adminPanel?.missionTime ? formatDateTime(adminPanel.missionTime) : "មិនបានបញ្ចូល"}</td></tr>
            <tr><th>ចំនួនអ្នកចូលរួម</th><td>{renderValue(adminPanel?.participantCount)}</td></tr>
            <tr><th>តាមរយៈ</th><td>{renderValue(adminPanel?.missionVia || formData.mission)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pdf-panel pdf-panel-full">
        <h3>ព័ត៌មានអ្នកស្នើសុំ</h3>
        <table className="pdf-member-table">
          <tbody>
            <tr><th>ចំនួនផែនការ</th><td>{renderValue(formData.planCount)}</td></tr>
            <tr><th>ចំនួនជាក់ស្តែង</th><td>{renderValue(formData.actualCount)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pdf-panel pdf-panel-full">
        <h3>ព័ត៌មានការធ្វើដំណើរ</h3>
        <table className="pdf-member-table">
          <tbody>
            <tr><th>ថ្ងៃចេញដំណើរ</th><td>{formatDate(formData.departDate)}</td></tr>
            <tr><th>ថ្ងៃដល់</th><td>{formatDate(formData.arriveDate)}</td></tr>
            <tr><th>ចម្ងាយផ្លូវ (គម)</th><td>{renderValue(formData.routeDistance)}</td></tr>
            <tr><th>រយៈពេលធ្វើដំណើរ (ម៉ោង)</th><td>{renderValue(formData.travelDuration)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pdf-panel pdf-panel-full">
        <h3>ព័ត៌មានកិច្ចប្រជុំ</h3>
        <table className="pdf-member-table">
          <tbody>
            <tr><th>ចំនួនអ្នកចូលរួម</th><td>{renderValue(formData.meetingParticipantsCount)}</td></tr>
            <tr><th>ចំនួនស្រី</th><td>{renderValue(formData.meetingParticipantsFemale)}</td></tr>
            <tr><th>ម៉ោងចាប់ផ្ដើម</th><td>{renderValue(formData.meetingStartTime)}</td></tr>
            <tr><th>ម៉ោងបញ្ចប់</th><td>{renderValue(formData.meetingEndTime)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pdf-panel pdf-panel-full">
        <h3>ការស្នាក់នៅ</h3>
        <table className="pdf-member-table">
          <tbody>
            <tr><th>កន្លែងស្នាក់នៅ</th><td>{renderValue(formData.lodgingPlace)}</td></tr>
            <tr><th>ចំនួន</th><td>{renderValue(formData.lodgingCount)}</td></tr>
            <tr><th>ចំនួនស្រី</th><td>{renderValue(formData.lodgingFemale)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pdf-panel pdf-panel-full">
        <h3>អាហារ</h3>
        <table className="pdf-member-table">
          <thead>
            <tr>
              <th>អាហារ</th><th>កន្លែង</th><th>ចំនួន</th>
              <th>ចំនួនស្រី</th><th>ការទូទាត់</th><th>អ្នករួមចំណែក</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>អាហារព្រឹក</td>
              <td>{renderValue(formData.breakfastPlace)}</td>
              <td>{renderValue(formData.breakfastCount)}</td>
              <td>{renderValue(formData.breakfastFemale)}</td>
              <td>{renderValue(formData.breakfastPaymentUnit)}</td>
              <td>{renderValue(formData.breakfastSponsor)}</td>
            </tr>
            <tr>
              <td>អាហារថ្ងៃត្រង់</td>
              <td>{renderValue(formData.lunchPlace)}</td>
              <td>{renderValue(formData.lunchCount)}</td>
              <td>{renderValue(formData.lunchFemale)}</td>
              <td>{renderValue(formData.lunchPaymentUnit)}</td>
              <td>{renderValue(formData.lunchSponsor)}</td>
            </tr>
            <tr>
              <td>អាហារពេលល្ងាច</td>
              <td>{renderValue(formData.dinnerPlace)}</td>
              <td>{renderValue(formData.dinnerCount)}</td>
              <td>{renderValue(formData.dinnerFemale)}</td>
              <td>{renderValue(formData.dinnerPaymentUnit)}</td>
              <td>{renderValue(formData.dinnerSponsor)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pdf-panel pdf-panel-full">
        <h3>ការអនុវត្ត</h3>
        <table className="pdf-member-table">
          <tbody>
            <tr><th>ចំនួនផែនការសរុប</th><td>{renderValue(formData.implementationPlanTotal)}</td></tr>
            <tr><th>ចំនួនផែនការស្រី</th><td>{renderValue(formData.implementationPlanFemale)}</td></tr>
            <tr><th>ចំនួនជាក់ស្តែងសរុប</th><td>{renderValue(formData.implementationActualTotal)}</td></tr>
            <tr><th>ចំនួនជាក់ស្តែងស្រី</th><td>{renderValue(formData.implementationActualFemale)}</td></tr>
            <tr><th>រយៈពេលត្រួតពិនិត្យ</th><td>{renderValue(formData.implementationDurationCheck)}</td></tr>
            <tr><th>រយៈពេលគ្រប់គ្រង</th><td>{renderValue(formData.implementationDurationManage)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pdf-panel pdf-panel-full">
        <h3>ការត្រឡប់មកវិញ</h3>
        <table className="pdf-member-table">
          <tbody>
            <tr><th>ម៉ោងចេញដំណើរ</th><td>{renderValue(formData.returnDepartTime)}</td></tr>
            <tr><th>ម៉ោងដល់</th><td>{renderValue(formData.returnArriveTime)}</td></tr>
            <tr><th>សុវត្ថិភាព</th><td>{renderValue(formData.returnSafetyStatus)}</td></tr>
            <tr><th>បញ្ហាជួបប្រទះ</th><td>{renderValue(formData.returnIssue)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pdf-panel pdf-panel-full">
        <h3>បញ្ជីរថយន្ត</h3>
        <table className="pdf-member-table">
          <tbody>
            <tr><th>ចំនួនផែនការ</th><td>{renderValue(formData.vehiclePlanCount)}</td></tr>
            <tr><th>ចំនួនជាក់ស្តែង</th><td>{renderValue(formData.vehicleCount)}</td></tr>
          </tbody>
        </table>
        {filledVehicles.length ? (
          <table className="pdf-member-table">
            <thead>
              <tr><th>ល.រ</th><th>ម៉ាករថយន្ត</th><th>ស្លាកលេខ</th></tr>
            </thead>
            <tbody>
              {filledVehicles.map((vehicle, index) => (
                <tr key={`${vehicle.plate}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{renderValue(vehicle.brand)}</td>
                  <td>{renderValue(vehicle.plate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="pdf-member-table"><tbody><tr><td>មិនមានទិន្នន័យរថយន្តបន្ថែម។</td></tr></tbody></table>
        )}
      </section>

      <section className="pdf-panel pdf-panel-full">
        <h3>បញ្ជីសម្ភារៈបច្ចេកទេស</h3>
        <table className="pdf-member-table">
          <tbody>
            <tr><th>ចំនួនផែនការ</th><td>{renderValue(formData.equipmentPlanCount)}</td></tr>
            <tr><th>ចំនួនជាក់ស្តែង</th><td>{renderValue(formData.equipmentActualCount)}</td></tr>
          </tbody>
        </table>
        {filledEquipment.length ? (
          <table className="pdf-member-table">
            <thead>
              <tr><th>ល.រ</th><th>ប្រភេទ</th><th>ចំនួន</th></tr>
            </thead>
            <tbody>
              {filledEquipment.map((item, index) => (
                <tr key={`${item.type}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{renderValue(item.type)}</td>
                  <td>{renderValue(item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="pdf-member-table"><tbody><tr><td>មិនមានទិន្នន័យសម្ភារៈបន្ថែម។</td></tr></tbody></table>
        )}
      </section>
    </section>
  );
}

export default function PdfTemplate({ report, reports: reportsProp, onClose, onDelete, initialMode }) {
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [pdfMode, setPdfMode] = useState(initialMode ?? "summary");
  const [viewingVersion, setViewingVersion] = useState("current");

  const allReports = reportsProp?.length ? reportsProp : (report ? [report] : []);
  const isCombined = allReports.length > 1;

  if (!allReports.length) return null;

  const primary = allReports[0];
  const { requestId, submittedAt } = primary;
  const adminPanel = (primary?.adminPanel && typeof primary.adminPanel === "object") ? primary.adminPanel : {};
  const pdfTitleText = "បង្កាន់ដៃសំណើរថយន្តបេសកកម្ម";

  // Version history (single-report only)
  const editHistory = !isCombined && Array.isArray(primary.editHistory) ? primary.editHistory : [];
  const hasVersions = editHistory.length > 0;
  const displayReport = (hasVersions && viewingVersion !== "current")
    ? { ...primary, ...editHistory[Number(viewingVersion)] }
    : primary;

  async function handleSavePdfFile() {
    if (isSavingFile) return;
    setIsSavingFile(true);
    try {
      const suffix = isCombined ? (pdfMode === "summary" ? "-summary" : "-full") : "";
      const fileName = createPdfFileName((requestId ?? "combined") + suffix);
      const pdfElement = document.getElementById("pdfTemplate");
      const pdfBlob = await exportReportToPdfBlob(primary, { element: pdfElement });
      await saveBlobToFile(pdfBlob, fileName, null);
    } catch (error) {
      console.error(error);
      const pdfElement = document.getElementById("pdfTemplate");
      const opened = openPrintFallbackFromElement(pdfElement, createPdfFileName(requestId ?? "combined"));
      if (!opened) window.alert("Cannot save PDF right now. Please try again.");
    } finally {
      setIsSavingFile(false);
    }
  }

  const missionHeader = (
    <header className="pdf-document-header">
      <div className="pdf-header-main">
        <div className="pdf-seal">
          <img className="pdf-logo" src="/about-moi-logo.png" alt="Ministry of Interior logo" />
        </div>
        <div>
          <h2 id="pdfTitle" className="pdf-main-title">{pdfTitleText}</h2>
          <div className="pdf-main-subtitle">អង្គភាពប្រតិបត្តិការ MCCTV - ប្រព័ន្ធគ្រប់គ្រងកញ្ចប់រថយន្ត</div>
        </div>
      </div>
      <div className="pdf-request-box">
        {isCombined ? (
          <>
            <div className="pdf-request-label">ចំនួនអង្គភាព</div>
            <div className="pdf-request-id">{allReports.length} អង្គភាព</div>
            <div className="pdf-request-time">{adminPanel.missionTitle || "-"}</div>
          </>
        ) : (
          <>
            <div className="pdf-request-label">លេខសំណើ</div>
            <div className="pdf-request-id">{requestId}</div>
            <div className="pdf-request-time">បង្កើត៖ {formatDateTime(submittedAt)}</div>
          </>
        )}
      </div>
    </header>
  );

  const pdfFooter = (
    <footer className="pdf-document-footer">
      <span>បង្កើតដោយប្រព័ន្ធ MCCTV Fleet</span>
      <span>{formatDateTime(new Date().toISOString())}</span>
    </footer>
  );

  return (
    <div className="pdf-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="pdfTitle">
      <div className="pdf-preview-shell">
        <div className="pdf-preview-actions">
          <button className="ghost" type="button" onClick={onClose}>បិទ</button>

          {isCombined && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#666" }}>ទិដ្ឋភាព:</span>
              <button
                type="button"
                className={pdfMode === "summary" ? "primary" : "ghost"}
                style={{ fontSize: 13, padding: "4px 14px" }}
                onClick={() => setPdfMode("summary")}
              >
                សង្ខេប
              </button>
              <button
                type="button"
                className={pdfMode === "full" ? "primary" : "ghost"}
                style={{ fontSize: 13, padding: "4px 14px" }}
                onClick={() => setPdfMode("full")}
              >
                លម្អិត
              </button>
            </div>
          )}

          <button className="primary" type="button" onClick={handleSavePdfFile} disabled={isSavingFile}>
            {isSavingFile ? "កំពុងរក្សាទុក..." : "រក្សាទុកទៅកុំព្យូទ័រ"}
          </button>

          {onDelete ? (
            <button
              type="button"
              className="ghost"
              style={{ color: "#b3261e", borderColor: "rgba(179,38,30,0.3)", marginLeft: "auto" }}
              onClick={onDelete}
            >
              {isCombined ? "លុបបេសកកម្ម" : "លុបសំណើ"}
            </button>
          ) : null}
        </div>

        {/* ── Single report ── */}
        {!isCombined && (
          <>
            {hasVersions && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#666" }}>កំណែ:</span>
                {editHistory.map((snap, i) => (
                  <button
                    key={i}
                    type="button"
                    className={viewingVersion === String(i) ? "primary" : "ghost"}
                    style={{ fontSize: 12, padding: "3px 10px" }}
                    onClick={() => setViewingVersion(String(i))}
                  >
                    V{i + 1} · {formatDateTime(snap.editedAt)}
                  </button>
                ))}
                <button
                  type="button"
                  className={viewingVersion === "current" ? "primary" : "ghost"}
                  style={{ fontSize: 12, padding: "3px 10px" }}
                  onClick={() => setViewingVersion("current")}
                >
                  V{editHistory.length + 1} (បច្ចុប្បន្ន)
                </button>
              </div>
            )}
            <article id="pdfTemplate" className="pdf-document">
              {missionHeader}
              {buildReportSections(displayReport)}
              {pdfFooter}
            </article>
          </>
        )}

        {/* ── Combined: Summary ── */}
        {isCombined && pdfMode === "summary" && (
          <article id="pdfTemplate" className="pdf-document">
            {missionHeader}
            <section className="pdf-grid">
              <section className="pdf-panel pdf-panel-full">
                <h3>ព័ត៌មានបេសកកម្ម</h3>
                <table className="pdf-member-table">
                  <tbody>
                    <tr><th>កម្មវិធី</th><td>{renderValue(adminPanel.missionTitle)}</td></tr>
                    <tr><th>ទីតាំង</th><td>{renderValue(adminPanel.missionPlace)}</td></tr>
                    <tr><th>ពេលវេលា</th><td>{adminPanel.missionTime ? formatDateTime(adminPanel.missionTime) : "មិនបានបញ្ចូល"}</td></tr>
                    <tr><th>ចំនួនអ្នកចូលរួម</th><td>{renderValue(adminPanel.participantCount)}</td></tr>
                    <tr><th>តាមរយៈ</th><td>{renderValue(adminPanel.missionVia)}</td></tr>
                  </tbody>
                </table>
              </section>

              <section className="pdf-panel pdf-panel-full">
                <h3>បញ្ជីអង្គភាពចូលរួម ({allReports.length} អង្គភាព)</h3>
                <table className="pdf-member-table">
                  <thead>
                    <tr>
                      <th>ល.រ</th>
                      <th>លេខសំណើ</th>
                      <th>ឈ្មោះ</th>
                      <th>ផែនការ / ជាក់ស្តែង</th>
                      <th>រថយន្ត</th>
                      <th>សម្ភារៈ</th>
                      <th>ពេលបញ្ជូន</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allReports.map((r, i) => (
                      <tr key={r.requestId}>
                        <td>{i + 1}</td>
                        <td style={{ fontSize: 11 }}>{r.requestId}</td>
                        <td>{renderValue(r.formData?.name)}</td>
                        <td>{renderValue(r.formData?.planCount)} / {renderValue(r.formData?.actualCount)}</td>
                        <td>{renderValue(r.formData?.vehicleCount)}</td>
                        <td>{renderValue(r.formData?.equipmentActualCount)}</td>
                        <td style={{ fontSize: 11 }}>{formatDateTime(r.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </section>
            {pdfFooter}
          </article>
        )}

        {/* ── Combined: Full per-unit ── */}
        {isCombined && pdfMode === "full" && (
          <article id="pdfTemplate" className="pdf-document">
            {missionHeader}
            {allReports.map((r, i) => (
              <div key={r.requestId}>
                <div style={{
                  borderTop: i > 0 ? "2px solid #c9a96e" : "1px solid #e8d9be",
                  margin: i > 0 ? "24px 0 16px" : "16px 0",
                  paddingTop: i > 0 ? "16px" : 0
                }}>
                  <div style={{
                    background: "#f5ebe0",
                    padding: "6px 14px",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    fontSize: 13,
                    fontWeight: 600
                  }}>
                    អង្គភាព {i + 1}: {renderValue(r.formData?.name)}
                    <span style={{ fontWeight: 400, color: "#9a7840", marginLeft: "12px", fontSize: 12 }}>
                      {r.requestId} · {formatDateTime(r.submittedAt)}
                    </span>
                  </div>
                </div>
                {buildReportSections(r)}
              </div>
            ))}
            {pdfFooter}
          </article>
        )}
      </div>
    </div>
  );
}
