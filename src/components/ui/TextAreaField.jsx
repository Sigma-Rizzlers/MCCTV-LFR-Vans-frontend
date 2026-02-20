export default function TextAreaField({ id, label, placeholder, rows = 4, className = "", ...props }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      <textarea id={id} rows={rows} placeholder={placeholder} {...props} />
    </div>
  );
}
