import { useState } from "react";
import { exportReportToPdfBlob, openPrintFallbackFromElement, saveBlobToFile } from "../utils/pdfExport";

function formatDate(value) {
  if (!value) {
    return "មិនបានបញ្ចូល";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function renderValue(value) {
  return String(value ?? "").trim() || "មិនបានបញ្ចូល";
}

function createPdfFileName(requestId) {
  const safeId = String(requestId ?? "")
    .trim()
    .replace(/[^A-Za-z0-9-_]/g, "-");
  return `MCCTV-request-${safeId || "unknown"}.pdf`;
}

export default function PdfTemplate({ report, onClose, onDelete }) {
  const [isSavingFile, setIsSavingFile] = useState(false);
  if (!report) {
    return null;
  }

  const { formData, requestId, submittedAt, supportFileName, members, vehicles, equipmentItems, adminPanel } = report;
  const requesterName = renderValue(formData.name);
  const filledMembers = Array.isArray(members) ? members : [];
  const filledVehicles = Array.isArray(vehicles) ? vehicles : [];
  const filledEquipment = Array.isArray(equipmentItems) ? equipmentItems : [];
  const pdfTitleText = "បង្កាន់ដៃសំណើរថយន្តបេសកកម្ម";

  async function handleSavePdfFile() {
    if (isSavingFile) {
      return;
    }

    setIsSavingFile(true);

    try {
      const fileName = createPdfFileName(requestId);
      const pdfElement = document.getElementById("pdfTemplate");
      const pdfBlob = await exportReportToPdfBlob(report, { element: pdfElement });
      await saveBlobToFile(pdfBlob, fileName, null);
    } catch (error) {
      console.error(error);
      const pdfElement = document.getElementById("pdfTemplate");
      const opened = openPrintFallbackFromElement(pdfElement, createPdfFileName(requestId));
      if (!opened) {
        window.alert("Cannot save PDF right now. Please try again.");
      }
    } finally {
      setIsSavingFile(false);
    }
  }

  return (
    <div className="pdf-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="pdfTitle">
      <div className="pdf-preview-shell">
        <div className="pdf-preview-actions">
          <button className="ghost" type="button" onClick={onClose}>បិទ</button>
          <button className="primary" type="button" onClick={handleSavePdfFile} disabled={isSavingFile}>
            {isSavingFile ? "កំពុងរក្សាទុក..." : "រក្សាទុកទៅកុំព្យូទ័រ"}
          </button>
          {onDelete ? (
            <button
              type="button"
              className="ghost"
              style={{ color: "#b3261e", borderColor: "rgba(179,38,30,0.3)", marginLeft: "auto" }}
              onClick={() => {
                if (window.confirm("តើអ្នកពិតជាចង់លុបសំណើនេះមែនទេ?")) {
                  onDelete();
                }
              }}
            >
              លុបសំណើ
            </button>
          ) : null}
        </div>

        <article id="pdfTemplate" className="pdf-document">
          <header className="pdf-document-header">
            <div className="pdf-header-main">
              <div className="pdf-seal">
                <img className="pdf-logo" src="/about-moi-logo.png" alt="Ministry of Interior logo" />
              </div>
              <div>
                <h2 id="pdfTitle" className="pdf-main-title">
                  {pdfTitleText}
                </h2>
                <div className="pdf-main-subtitle">អង្គភាពប្រតិបត្តិការ MCCTV - ប្រព័ន្ធគ្រប់គ្រងកញ្ចប់រថយន្ត</div>
              </div>
            </div>
            <div className="pdf-request-box">
              <div className="pdf-request-label">លេខសំណើ</div>
              <div className="pdf-request-id">{requestId}</div>
              <div className="pdf-request-time">បង្កើត៖ {formatDateTime(submittedAt)}</div>
            </div>
          </header>

          <section className="pdf-grid">
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
                    <th>អាហារ</th>
                    <th>កន្លែង</th>
                    <th>ចំនួន</th>
                    <th>ចំនួនស្រី</th>
                    <th>ការទូទាត់</th>
                    <th>អ្នករួមចំណែក</th>
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
                    <tr>
                      <th>ល.រ</th>
                      <th>ម៉ាករថយន្ត</th>
                      <th>ស្លាកលេខ</th>
                    </tr>
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
                    <tr>
                      <th>ល.រ</th>
                      <th>ប្រភេទ</th>
                      <th>ចំនួន</th>
                    </tr>
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
          <footer className="pdf-document-footer">
            <span>បង្កើតដោយប្រព័ន្ធ MCCTV Fleet</span>
            <span>{formatDateTime(submittedAt)}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}









