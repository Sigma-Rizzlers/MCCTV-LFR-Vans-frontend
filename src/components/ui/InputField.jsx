export default function InputField({
  id,
  label,
  placeholder,
  className = "",
  type = "text",
  ...props
}) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      <input id={id} type={type} placeholder={placeholder} {...props} />
    </div>
  );
}
