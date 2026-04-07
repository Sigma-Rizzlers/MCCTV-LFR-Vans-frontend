import { useEffect, useState } from "react";
import MissionRequestForm from "./MissionRequestForm";
import { loadAdminMissionPanel, subscribeAdminMissionPanel } from "../../../utils/adminMissionPanel";
import { loadAdminMissionFile } from "../../../utils/adminMissionFileStore";

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

const emptyFilePreviewState = {
  url: "",
  type: "",
  loading: false,
  error: "",
  isImage: false,
  isPdf: false
};

function toText(value) {
  return String(value ?? "").trim();
}

function formatMissionTime(value) {
  const text = toText(value);
  if (!text) {
    return "-";
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getFileExtension(fileName) {
  const normalizedFileName = toText(fileName);
  const segments = normalizedFileName.split(".");
  return segments.length > 1 ? toText(segments.at(-1)).toLowerCase() : "";
}

function isImageFile(fileType, fileName) {
  const normalizedType = toText(fileType).toLowerCase();
  const extension = getFileExtension(fileName);

  return normalizedType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension);
}

function isPdfFile(fileType, fileName) {
  return toText(fileType).toLowerCase() === "application/pdf" || getFileExtension(fileName) === "pdf";
}

function createFilePreviewState(fileUrl, fileType, fileName) {
  return {
    url: fileUrl,
    type: fileType,
    loading: false,
    error: "",
    isImage: isImageFile(fileType, fileName),
    isPdf: isPdfFile(fileType, fileName)
  };
}

function getFileBadgeLabel(fileName) {
  const extension = getFileExtension(fileName);
  return extension ? extension.toUpperCase() : "FILE";
}

function openFileInNewTab(fileUrl) {
  if (typeof window === "undefined" || !fileUrl) {
    return;
  }

  const previewWindow = window.open(fileUrl, "_blank");
  if (previewWindow) {
    previewWindow.opener = null;
    previewWindow.focus();
    return;
  }

  const previewLink = document.createElement("a");
  previewLink.href = fileUrl;
  previewLink.target = "_blank";
  previewLink.rel = "noopener noreferrer";
  document.body.appendChild(previewLink);
  previewLink.click();
  document.body.removeChild(previewLink);
}

function getFileStatusText(filePreview) {
  if (filePreview.error) {
    return filePreview.error;
  }

  if (filePreview.loading) {
    return "កំពុងរៀបចំការមើលឯកសារដែលបានភ្ជាប់...";
  }

  if (filePreview.isPdf) {
    return "ឯកសារ PDF អាចមើលបានហើយ។";
  }

  if (filePreview.isImage) {
    return "រូបភាពអាចមើលបានហើយ។";
  }

  if (filePreview.url) {
    return "អាចបើកឯកសារនេះសម្រាប់ពិនិត្យមើលបាន។";
  }

  return "ការមើលឯកសារនឹងបង្ហាញនៅទីនេះ នៅពេលមានទិន្នន័យរួចរាល់។";
}

function FilePreviewOverlay({ isOpen, fileName, fileUrl, isImage, isPdf, onClose, onOpenInNewTab }) {
  if (!isOpen || !fileUrl) {
    return null;
  }

  return (
    <div className="file-review-overlay" role="dialog" aria-modal="true" aria-labelledby="fileReviewTitle">
      <div className="file-review-shell">
        <div className="file-review-header">
          <div>
            <p className="file-review-kicker">ការពិនិត្យឯកសារ</p>
            <h3 id="fileReviewTitle">{fileName || "ឯកសារភ្ជាប់"}</h3>
          </div>
          <div className="file-review-actions">
            <button className="ghost" type="button" onClick={onOpenInNewTab}>
              បើកផ្ទាំងថ្មី
            </button>
            <button className="primary" type="button" onClick={onClose}>
              បិទ
            </button>
          </div>
        </div>

        <div className="file-review-body">
          {isImage ? <img className="file-review-image" src={fileUrl} alt={fileName || "ការមើលឯកសារភ្ជាប់"} /> : null}
          {isPdf ? <iframe className="file-review-frame" src={fileUrl} title={fileName || "ការមើលឯកសារ PDF"} /> : null}
          {!isImage && !isPdf ? (
            <div className="file-review-fallback">
              <h4>ប្រភេទឯកសារនេះមិនអាចមើលផ្ទាល់បានពេញលេញទេ។</h4>
              <p>សូមប្រើប៊ូតុងខាងលើ ដើម្បីបើកឯកសារដែលបានភ្ជាប់ពីផ្ទាំងអ្នកគ្រប់គ្រង។</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MissionPanelCard({ panel, filePreview, onReviewFile }) {
  const hasRequestPlanFile = Boolean(panel.requestPlanFileName);
  const overviewItems = [
    { label: "កម្មវិធី", value: panel.missionTitle || "-" },
    { label: "ទីតាំង", value: panel.missionPlace || "-" },
    { label: "ពេលវេលា", value: formatMissionTime(panel.missionTime) },
    { label: "តាមរយៈ", value: panel.missionVia || "-" }
  ];
  const fileStatusText = getFileStatusText(filePreview);

  return (
    <div className="bundle-card mission-panel-card">
      <div className="bundle-header mission-panel-header">
        <div>
          <h2>ព័ត៌មានកម្មវិធី</h2>
        </div>
        <div className="mission-panel-highlight">
          <span className="mission-panel-highlight-label">អ្នកចូលរួម</span>
          <strong className="mission-panel-highlight-value">{panel.participantCount || "-"}</strong>
        </div>
      </div>

      <div className="mission-panel-grid">
        {overviewItems.map((item) => (
          <article className="mission-panel-item" key={item.label}>
            <span className="mission-panel-item-label">{item.label}</span>
            <strong className="mission-panel-item-value">{item.value}</strong>
          </article>
        ))}
      </div>

      {hasRequestPlanFile ? (
        <section className="mission-file-card">
          <div className="mission-file-copy">
            <span className="mission-file-badge">{getFileBadgeLabel(panel.requestPlanFileName)}</span>
            <h3>ឯកសារស្នើសុំផែនការ កំលាំង និងសម្ភារៈបច្ចេកទេស</h3>
            <p className="mission-file-name">{panel.requestPlanFileName}</p>
            <p className={`mission-file-note${filePreview.error ? " error" : ""}`}>{fileStatusText}</p>
          </div>
          <div className="mission-file-actions">
            <button
              className="primary"
              type="button"
              onClick={onReviewFile}
              disabled={filePreview.loading || !filePreview.url}
            >
              {filePreview.loading ? "កំពុងរៀបចំ..." : "ពិនិត្យឯកសារ"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DefaultBundleCard() {
  return (
    <div className="bundle-card mission-panel-card mission-panel-empty">
      <div className="bundle-header mission-panel-header">
        <div>
          <h2>ព័ត៌មានកម្មវិធី</h2>
          <p>មិនទាន់មានព័ត៌មានកម្មវិធី</p>
        </div>
      </div>
    </div>
  );
}

export default function RequestSection({ isActive, formProps }) {
  const [missionPanel, setMissionPanel] = useState(() => loadAdminMissionPanel() || fallbackMissionPanel);
  const [filePreview, setFilePreview] = useState(emptyFilePreviewState);
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);

  useEffect(() => {
    setMissionPanel(loadAdminMissionPanel() || fallbackMissionPanel);
    return subscribeAdminMissionPanel((nextPanel) => {
      setMissionPanel(nextPanel || fallbackMissionPanel);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    let nextObjectUrl = "";
    const requestPlanFileName = toText(missionPanel?.requestPlanFileName);
    const requestPlanFileType = toText(missionPanel?.requestPlanFileType);
    const requestPlanFileDataUrl = toText(missionPanel?.requestPlanFileDataUrl);
    const requestPlanFileKey = toText(missionPanel?.requestPlanFileKey);

    setIsFilePreviewOpen(false);

    if (!requestPlanFileName) {
      setFilePreview(emptyFilePreviewState);
      return () => {};
    }

    if (requestPlanFileDataUrl) {
      setFilePreview(createFilePreviewState(requestPlanFileDataUrl, requestPlanFileType, requestPlanFileName));
      return () => {};
    }

    if (!requestPlanFileKey) {
      setFilePreview({
        ...emptyFilePreviewState,
        error: "មិនមានទិន្នន័យភ្ជាប់ឯកសារទេ។"
      });
      return () => {};
    }

    setFilePreview({
      ...emptyFilePreviewState,
      loading: true
    });

    loadAdminMissionFile(requestPlanFileKey)
      .then((file) => {
        if (!isMounted) {
          return;
        }

        if (!(file instanceof Blob)) {
          throw new Error("Missing mission file blob.");
        }

        nextObjectUrl = URL.createObjectURL(file);
        setFilePreview(createFilePreviewState(nextObjectUrl, file.type || requestPlanFileType, requestPlanFileName));
      })
      .catch((error) => {
        console.error(error);
        if (!isMounted) {
          return;
        }

        setFilePreview({
          ...emptyFilePreviewState,
          error: "មិនអាចផ្ទុកការមើលឯកសារបានទេ។"
        });
      });

    return () => {
      isMounted = false;

      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [
    missionPanel?.requestPlanFileDataUrl,
    missionPanel?.requestPlanFileKey,
    missionPanel?.requestPlanFileName,
    missionPanel?.requestPlanFileType
  ]);

  useEffect(() => {
    if (!isFilePreviewOpen) {
      return () => {};
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsFilePreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilePreviewOpen]);

  function handleReviewFile() {
    if (!filePreview.url || filePreview.loading) {
      return;
    }

    setIsFilePreviewOpen(true);
  }

  function handleOpenFileInNewTab() {
    openFileInNewTab(filePreview.url);
  }

  const hasMissionPanel =
    Boolean(missionPanel?.missionTitle) ||
    Boolean(missionPanel?.missionPlace) ||
    Boolean(missionPanel?.missionTime) ||
    Boolean(missionPanel?.participantCount) ||
    Boolean(missionPanel?.missionVia) ||
    Boolean(missionPanel?.requestPlanFileName);
  const missionPanelContent = hasMissionPanel ? (
    <MissionPanelCard panel={missionPanel} filePreview={filePreview} onReviewFile={handleReviewFile} />
  ) : (
    <DefaultBundleCard />
  );

  return (
    <>
      <section id="request" className={`page-section ${isActive ? "active" : ""}`}>
        <MissionRequestForm {...formProps} missionPanelContent={missionPanelContent} />
      </section>
      <FilePreviewOverlay
        isOpen={isFilePreviewOpen}
        fileName={missionPanel?.requestPlanFileName}
        fileUrl={filePreview.url}
        isImage={filePreview.isImage}
        isPdf={filePreview.isPdf}
        onClose={() => setIsFilePreviewOpen(false)}
        onOpenInNewTab={handleOpenFileInNewTab}
      />
    </>
  );
}
