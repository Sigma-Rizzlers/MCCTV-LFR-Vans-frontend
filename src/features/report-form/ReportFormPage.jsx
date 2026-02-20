import { useRef, useState } from "react";
import Button from "../../components/ui/Button";
import IconButton from "../../components/ui/IconButton";
import InputField from "../../components/ui/InputField";
import TextAreaField from "../../components/ui/TextAreaField";
import "./ReportFormPage.css";

const initialForm = {
  name: "",
  gender: "",
  age: "",
  contact: "",
  description: "",
  plate: "",
  vehicle: "",
  vehicleNote: "",
  distance: "",
  location: ""
};

export default function ReportFormPage() {
  const [formData, setFormData] = useState(initialForm);
  const [mainPhoto, setMainPhoto] = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const mainPhotoInputRef = useRef(null);
  const extraImagesInputRef = useRef(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleMainPhotoChange(event) {
    const file = event.target.files?.[0] ?? null;
    setMainPhoto(file);
  }

  function handleExtraImagesChange(event) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }
    setExtraImages((current) => [...current, ...files]);
    event.target.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitMessage("");
    setIsSubmitting(true);

    try {
      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });

      if (mainPhoto) {
        payload.append("mainPhoto", mainPhoto);
      }

      extraImages.forEach((file) => {
        payload.append("extraImages", file);
      });

      const response = await fetch("/api/reports", {
        method: "POST",
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Submit failed with status ${response.status}`);
      }

      setSubmitMessage("ទិន្នន័យត្រូវបានបញ្ជូនដោយជោគជ័យ");
      setFormData(initialForm);
      setMainPhoto(null);
      setExtraImages([]);
    } catch (error) {
      console.error(error);
      setSubmitMessage("បញ្ជូនមិនបានទេ។ សូមព្យាយាមម្តងទៀត");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="report-shell">
      <form className="report-card" onSubmit={handleSubmit}>
        <div className="logo-wrap" aria-label="Organization logo">
          <div className="logo-mark">LOGO</div>
        </div>

        <InputField
          id="name"
          name="name"
          label="ឈ្មោះ"
          placeholder="បញ្ចូលឈ្មោះ"
          value={formData.name}
          onChange={handleChange}
        />

        <div className="row two-col">
          <InputField
            id="gender"
            name="gender"
            label="ភេទ"
            placeholder="បញ្ចូលភេទ"
            value={formData.gender}
            onChange={handleChange}
          />
          <InputField
            id="age"
            name="age"
            label="អាយុ"
            placeholder="បញ្ចូលអាយុ"
            value={formData.age}
            onChange={handleChange}
          />
        </div>

        <InputField
          id="contact"
          name="contact"
          label="លេខទូរស័ព្ទ"
          placeholder="បញ្ចូលលេខទូរស័ព្ទ"
          value={formData.contact}
          onChange={handleChange}
        />

        <div className="photo-row">
          <div className="avatar-placeholder" aria-hidden="true" />
          <Button className="small" onClick={() => mainPhotoInputRef.current?.click()}>
            បញ្ចូលរូបភាព
          </Button>
        </div>
        <input
          ref={mainPhotoInputRef}
          className="hidden-input"
          type="file"
          accept="image/*"
          onChange={handleMainPhotoChange}
        />
        {mainPhoto ? <p className="file-hint">{mainPhoto.name}</p> : null}

        <TextAreaField
          id="description"
          name="description"
          label="មូលហេតុ"
          placeholder="សរសេរព័ត៌មានលម្អិត"
          rows={4}
          value={formData.description}
          onChange={handleChange}
        />

        <div className="row two-col">
          <InputField
            id="plate"
            name="plate"
            label="លេខរថយន្ត"
            placeholder="បញ្ចូលលេខរថយន្ត"
            value={formData.plate}
            onChange={handleChange}
          />
          <InputField
            id="vehicle"
            name="vehicle"
            label="ប្រភេទ"
            placeholder="បញ្ចូលប្រភេទ"
            value={formData.vehicle}
            onChange={handleChange}
          />
        </div>

        <InputField
          id="vehicle-note"
          name="vehicleNote"
          label="ព័ត៌មានបន្ថែម"
          placeholder="បញ្ចូលព័ត៌មានបន្ថែម"
          value={formData.vehicleNote}
          onChange={handleChange}
        />

        <div className="inline-action">
          <IconButton />
          <InputField
            id="distance"
            name="distance"
            label="ចម្ងាយ (គម/ម៉)"
            placeholder="បញ្ចូលចម្ងាយ"
            value={formData.distance}
            onChange={handleChange}
          />
        </div>

        <p className="section-label">ទីតាំង</p>
        <div className="map-box">MAP / LOCATION</div>
        <input
          name="location"
          className="map-input"
          placeholder="បញ្ចូលទីតាំង"
          value={formData.location}
          onChange={handleChange}
        />

        <div className="inline-action compact">
          <IconButton onClick={() => extraImagesInputRef.current?.click()} />
          <span>រូបភាពបន្ថែម</span>
        </div>
        <input
          ref={extraImagesInputRef}
          className="hidden-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleExtraImagesChange}
        />
        {extraImages.length ? <p className="file-hint">បានជ្រើសរើស {extraImages.length} រូប</p> : null}

        {submitMessage ? <p className="submit-message">{submitMessage}</p> : null}

        <Button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "កំពុងបញ្ជូន..." : "ដាក់ស្នើ"}
        </Button>
      </form>
    </main>
  );
}
