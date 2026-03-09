import { useEffect, useState } from "react";
import MissionRequestForm from "./MissionRequestForm";
import { loadAdminMissionPanel } from "../../../utils/adminMissionPanel";

const fallbackMissionPanel = {
  missionTitle: "",
  missionPlace: "",
  participantCount: "",
  mission: ""
};

function MissionPanelCard({ panel }) {
  return (
    <div className="bundle-card">
      <div className="bundle-header">
        <div>
          <h2>ព័ត៌មានបេសកកម្ម</h2>
        </div>
      </div>
      <div className="van-grid">
        <div className="van-item">
          <h3>បេសកកម្ម</h3>
          <div className="van-meta">{panel.missionTitle || "-"}</div>
        </div>
      </div>
      <div className="van-grid">
        <div className="van-item">
          <h3>ទីកន្លែងបេសកកម្ម</h3>
          <div className="van-meta">{panel.missionPlace || "-"}</div>
        </div>
        <div className="van-item">
          <h3>ចំនួនអ្នកចូលរួម</h3>
          <div className="van-meta">{panel.participantCount || "-"}</div>
        </div>
      </div>
      <div className="bundle-note">{panel.mission || "-"}</div>
    </div>
  );
}

function DefaultBundleCard() {
  return (
    <div className="bundle-card">
      <div className="bundle-header">
        <div>
          <h2>ព័ត៌មានបេសកកម្ម</h2>
          <p>មិនទាន់មានបេសកកម្ម</p>
        </div>
      </div>
    </div>
  );
}

export default function RequestSection({ isActive, formProps }) {
  const [missionPanel, setMissionPanel] = useState(() => loadAdminMissionPanel() || fallbackMissionPanel);

  useEffect(() => {
    setMissionPanel(loadAdminMissionPanel() || fallbackMissionPanel);
  }, []);

  const hasMissionPanel =
    Boolean(missionPanel?.missionTitle) ||
    Boolean(missionPanel?.missionPlace) ||
    Boolean(missionPanel?.participantCount) ||
    Boolean(missionPanel?.mission);

  return (
    <section id="request" className={`page-section ${isActive ? "active" : ""}`}>
      <section className="bundle">
        {hasMissionPanel ? <MissionPanelCard panel={missionPanel} /> : <DefaultBundleCard />}
      </section>

      <MissionRequestForm {...formProps} />
    </section>
  );
}
