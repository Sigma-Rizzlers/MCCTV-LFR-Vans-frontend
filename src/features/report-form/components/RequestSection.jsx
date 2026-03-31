import { useEffect, useState } from "react";
import MissionRequestForm from "./MissionRequestForm";
import { loadAdminMissionPanel, subscribeAdminMissionPanel } from "../../../utils/adminMissionPanel";

const fallbackMissionPanel = {
  missionTitle: "",
  missionPlace: "",
  missionTime: "",
  participantCount: "",
  missionVia: "",
  requestPlanFileName: "",
  requestPlanFileDataUrl: "",
  requestPlanFileKey: "",
  requestPlanFileType: ""
};

function MissionPanelCard({ panel }) {
  const hasRequestPlanFile = Boolean(panel.requestPlanFileName);

  return (
    <div className="bundle-card">
      <div className="bundle-header">
        <div>
          <h2>ពត៌មានកម្មវិធី</h2>
        </div>
      </div>
      <div className="van-grid">
        <div className="van-item">
          <h3>កម្មវិធី</h3>
          <div className="van-meta">{panel.missionTitle || "-"}</div>
        </div>
        <div className="van-item">
          <h3>ទីតាំង</h3>
          <div className="van-meta">{panel.missionPlace || "-"}</div>
        </div>
        <div className="van-item">
          <h3>ពេលវេលា</h3>
          <div className="van-meta">{panel.missionTime || "-"}</div>
        </div>
        <div className="van-item">
          <h3>ទំហអ្នកចូលរួម</h3>
          <div className="van-meta">{panel.participantCount || "-"}</div>
        </div>
        <div className="van-item">
          <h3>តាមរយៈ</h3>
          <div className="van-meta">{panel.missionVia || "-"}</div>
        </div>
      </div>
      {hasRequestPlanFile ? (
        <div className="van-grid mission-file-grid">
          <div className="van-item">
            <h3>ឯកសារស្នើសុំផែនការ កំលាំង និងសម្ភារៈបច្ចេកទេស</h3>
            <div className="van-meta">{panel.requestPlanFileName}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DefaultBundleCard() {
  return (
    <div className="bundle-card">
      <div className="bundle-header">
        <div>
          <h2>ពត៌មានកម្មវិធី</h2>
          <p>មិនទាន់មានពត៌មានកម្មវិធី</p>
        </div>
      </div>
    </div>
  );
}

export default function RequestSection({ isActive, formProps }) {
  const [missionPanel, setMissionPanel] = useState(() => loadAdminMissionPanel() || fallbackMissionPanel);

  useEffect(() => {
    setMissionPanel(loadAdminMissionPanel() || fallbackMissionPanel);
    return subscribeAdminMissionPanel((nextPanel) => {
      setMissionPanel(nextPanel || fallbackMissionPanel);
    });
  }, []);

  const hasMissionPanel =
    Boolean(missionPanel?.missionTitle) ||
    Boolean(missionPanel?.missionPlace) ||
    Boolean(missionPanel?.missionTime) ||
    Boolean(missionPanel?.participantCount) ||
    Boolean(missionPanel?.missionVia) ||
    Boolean(missionPanel?.requestPlanFileName);
  const missionPanelContent = hasMissionPanel ? <MissionPanelCard panel={missionPanel} /> : <DefaultBundleCard />;

  return (
    <section id="request" className={`page-section ${isActive ? "active" : ""}`}>
      <MissionRequestForm {...formProps} missionPanelContent={missionPanelContent} />
    </section>
  );
}
