export default function PolicySection({ isActive }) {
  return (
    <section id="policy" className={`page-section ${isActive ? "active" : ""}`}>
      <div className="policy-layout">
        <div className="policy-block">
          <h2>គោលការណ៍សេវាកម្ម</h2>
          <p>
            ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្មនេះបង្កើតឡើងដើម្បីសម្របសម្រួលការងារផ្លូវការ
            និងការត្រួតពិនិត្យការប្រើប្រាស់រថយន្តក្នុងលក្ខខណ្ឌរដ្ឋាភិបាល។
          </p>
          <div className="policy-highlight">
            សំណើមួយគឺស្មើនឹងការស្នើសុំរថយន្ត ៣ គ្រឿង ហើយត្រូវបានចាត់ទុកជាបេសកកម្មអាទិភាព។
          </div>
        </div>
        <div className="policy-block">
          <h3>លំហាត់ការងារ</h3>
          <ol className="policy-steps">
            <li>បំពេញព័ត៌មានស្នើសុំរថយន្តក្នុងទម្រង់។</li>
            <li>ប្រព័ន្ធបង្កើត PDF និងរក្សាទុកសំណើក្នុងប្រវត្តិ។</li>
            <li>ប្រធានអនុម័តពិនិត្យ និងសម្រេចលើសំណើ។</li>
            <li>បន្ទាប់ពីអនុម័ត អ្នកអាចទាញយកឯកសារ PDF សម្រាប់ការបោះពុម្ព។</li>
          </ol>
        </div>
      </div>
    </section>
  );
}



