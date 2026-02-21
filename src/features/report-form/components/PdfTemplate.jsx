export default function PdfTemplate() {
  return (
    <div id="pdfTemplate" className="pdf-template" aria-hidden="true">
      <div className="pdf-header">
        <div className="pdf-seal">
          <img className="pdf-logo" src="/mcctv-logo.jpg" alt="MCCTV logo" />
        </div>
        <div>
          <div className="pdf-title">សំណើរថយន្តបេសកកម្ម (កញ្ចប់ ៣ រថយន្ត)</div>
          <div className="pdf-subtitle">អង្គភាពប្រតិបត្តិការ MCCTV</div>
        </div>
        <div className="pdf-date">កាលបរិច្ឆេទ៖ -</div>
      </div>
    </div>
  );
}



