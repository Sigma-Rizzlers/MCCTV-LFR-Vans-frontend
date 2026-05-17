import { useApiOnline } from "../context/ApiStatusContext";
import { DATA_MODE } from "../utils/dataMode";

export default function OfflineBanner() {
  const apiOnline = useApiOnline();
  if (apiOnline || DATA_MODE === "local") return null;
  return (
    <div
      role="alert"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#fff3cd",
        borderBottom: "1px solid #ffc107",
        padding: "8px 16px",
        fontSize: 13,
        color: "#856404",
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <span>⚠️</span>
      <span>មិនអាចភ្ជាប់ Server — កំពុងបង្ហាញទិន្នន័យ Cache</span>
    </div>
  );
}
