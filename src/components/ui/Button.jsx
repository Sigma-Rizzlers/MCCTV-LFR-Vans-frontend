export default function Button({ type = "button", className = "", children, ...props }) {
  return (
    <button type={type} className={`ui-button ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
