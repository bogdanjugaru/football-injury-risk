const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  LevelFormat, ExternalHyperlink, TableOfContents
} = require('docx');
const fs = require('fs');
const path = require('path');

// Screenshot paths - we'll use placeholder images if not available
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

function readImageOrNull(filename) {
  const p = path.join(SCREENSHOTS_DIR, filename);
  if (fs.existsSync(p)) return fs.readFileSync(p);
  return null;
}

function imgParagraph(filename, width, height, caption) {
  const data = readImageOrNull(filename);
  const paras = [];
  if (data) {
    paras.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new ImageRun({
          type: 'png',
          data,
          transformation: { width, height },
          altText: { title: caption, description: caption, name: caption }
        })
      ]
    }));
  }
  paras.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 240 },
    children: [
      new TextRun({ text: caption, italics: true, size: 20, color: '555555' })
    ]
  }));
  return paras;
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { before: 0, after: 240 },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Arial' })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, font: 'Arial' })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial' })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 120, after: 120, line: 360 },
    children: [new TextRun({ text, size: 24, font: 'Arial', ...opts })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 24, font: 'Arial' })]
  });
}

function metricRow(name, lr, mlp, rf, xgb, best) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cellOpts = (val, isHeader, isHighlight) => ({
    borders,
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    shading: isHeader
      ? { fill: '1B3A6B', type: ShadingType.CLEAR }
      : isHighlight
      ? { fill: 'E8F4E8', type: ShadingType.CLEAR }
      : { fill: 'FFFFFF', type: ShadingType.CLEAR },
    children: [new Paragraph({
      alignment: isHeader ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: [new TextRun({
        text: String(val),
        bold: isHeader || isHighlight,
        size: 20,
        font: 'Arial',
        color: isHeader ? 'FFFFFF' : '000000'
      })]
    })]
  });

  return new TableRow({
    children: [
      new TableCell({ ...cellOpts(name, false, false), width: { size: 2500, type: WidthType.DXA } }),
      new TableCell({ ...cellOpts(lr, false, best === 'lr'), width: { size: 1680, type: WidthType.DXA } }),
      new TableCell({ ...cellOpts(mlp, false, best === 'mlp'), width: { size: 1680, type: WidthType.DXA } }),
      new TableCell({ ...cellOpts(rf, false, best === 'rf'), width: { size: 1680, type: WidthType.DXA } }),
      new TableCell({ ...cellOpts(xgb, false, best === 'xgb'), width: { size: 1680, type: WidthType.DXA } }),
    ]
  });
}

function headerRow(cols) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: '0A2351' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new TableRow({
    tableHeader: true,
    children: cols.map((c, i) => new TableCell({
      borders,
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      shading: { fill: '1B3A6B', type: ShadingType.CLEAR },
      width: { size: i === 0 ? 2500 : 1680, type: WidthType.DXA },
      children: [new Paragraph({
        children: [new TextRun({ text: c, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })]
      })]
    }))
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 24 } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: '1B3A6B' },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: '2E5FA3' },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '1F4E79' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1800 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1B3A6B', space: 1 } },
          children: [new TextRun({ text: 'Capitolul 3 – Descrierea Aplicației Realizate', size: 18, font: 'Arial', color: '555555', italics: true })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: '1B3A6B', space: 1 } },
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'FootballRisk Analytics – Lucrare de Licență 2026   |   Pagina ', size: 18, font: 'Arial', color: '555555' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '555555' })
          ]
        })]
      })
    },
    children: [

      // ═══════════════════════════════════════════════════
      // TITLU CAPITOL
      // ═══════════════════════════════════════════════════
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: false,
        spacing: { before: 0, after: 300 },
        children: [new TextRun({ text: 'CAPITOLUL 3. DESCRIEREA APLICAȚIEI REALIZATE', bold: true, size: 36, font: 'Arial', color: '1B3A6B' })]
      }),

      // ═══════════════════════════════════════════════════
      // 3.1 PREZENTARE GENERALĂ
      // ═══════════════════════════════════════════════════
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 160 },
        children: [new TextRun({ text: '3.1. Prezentarea generală a aplicației', bold: true, size: 28, font: 'Arial', color: '2E5FA3' })]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: '3.1.1. Scopul și obiectivele aplicației', bold: true, size: 24, font: 'Arial', color: '1F4E79' })]
      }),

      para('Aplicația FootballRisk Analytics reprezintă o platformă web de tip full-stack dedicată analizei și predicției riscului de accidentare la jucătorii de fotbal profesioniști. Scopul principal al sistemului este de a oferi staff-ului tehnic și medical al cluburilor de fotbal un instrument bazat pe inteligență artificială pentru identificarea proactivă a jucătorilor cu risc ridicat de accidentare, permițând astfel luarea unor decizii informate privind gestionarea încărcăturii de antrenament și recuperarea.'),

      para('Obiectivele principale ale aplicației sunt:'),
      bullet('Centralizarea și vizualizarea datelor medicale și de performanță pentru 176 de jucători profesioniști, îmbogățite cu date reale de accidentare scraperiate de pe platforma Transfermarkt.'),
      bullet('Antrenarea și compararea a patru algoritmi de Machine Learning (Logistic Regression, Random Forest, MLP Neural Network, XGBoost) pentru predicția riscului de accidentare, utilizând 27 de variabile predictive.'),
      bullet('Generarea de predicții de risc pe orizonturi multiple de timp: 7, 14, 30, 60 și 90 de zile, bazate pe probabilitate cumulativă epidemiologică cu calibrare post-model pentru vârstă și poziție.'),
      bullet('Oferirea de explicabilitate a deciziilor modelului prin valorile SHAP (SHapley Additive exPlanations).'),
      bullet('Implementarea unui modul de analiză What-If care permite simularea modificărilor parametrilor și vizualizarea impactului în timp real.'),
      bullet('Vizualizarea istoricului de accidentări prin hartă corporală interactivă și timeline cronologic.'),
      bullet('Predicția timpului de recuperare estimat în urma unei accidentări, utilizând un model de regresie separat (R²=0.87).'),
      bullet('Generarea de rapoarte PDF individuale per jucător, conținând toate datele de predicție și recomandările personalizate.'),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: '3.1.2. Cerințele funcționale și nefuncționale', bold: true, size: 24, font: 'Arial', color: '1F4E79' })]
      }),

      para('Cerințele funcționale ale sistemului acoperă toate interacțiunile utilizatorului cu platforma:'),
      bullet('CF01 – Sistemul trebuie să permită vizualizarea listei complete de jucători cu filtrare după poziție, club și nivel de risc.'),
      bullet('CF02 – Sistemul trebuie să calculeze scorul de risc pentru orice jucător din baza de date sau pentru parametri introduși manual.'),
      bullet('CF03 – Sistemul trebuie să afișeze predicții pe 5 orizonturi de timp (7, 14, 30, 60, 90 zile).'),
      bullet('CF04 – Sistemul trebuie să permită compararea simultană a 2–3 jucători prin grafice radar și tabele comparative.'),
      bullet('CF05 – Sistemul trebuie să afișeze distribuția riscului pentru toți jucătorii unui club selectat.'),
      bullet('CF06 – Sistemul trebuie să permită exportul raportului complet în format PDF.'),
      bullet('CF07 – Sistemul trebuie să ofere predicția timpului de recuperare pentru accidentări simulate.'),
      bullet('CF08 – Sistemul trebuie să suporte tema clară (light) și întunecoasă (dark mode), cu persistență în localStorage.'),

      para('Cerințele nefuncționale definesc calitatea sistemului:'),
      bullet('CN01 – Performanță: Timpul de răspuns al API-ului pentru o predicție completă nu trebuie să depășească 2 secunde.'),
      bullet('CN02 – Scalabilitate: Arhitectura REST permite extinderea bazei de date fără modificări structurale majore.'),
      bullet('CN03 – Securitate: Toate interogările bazei de date se realizează prin ORM (SQLAlchemy), eliminând riscul de SQL injection.'),
      bullet('CN04 – Portabilitate: Aplicația rulează pe Windows, Linux și macOS prin configurare simplă cu Python/Node.js.'),
      bullet('CN05 – Mentenabilitate: Codul frontend este organizat în componente React reutilizabile; backend-ul urmează structura MVC cu FastAPI.'),

      // ═══════════════════════════════════════════════════
      // 3.2 INTERFAȚA UTILIZATOR
      // ═══════════════════════════════════════════════════
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: true,
        spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: '3.2. Interfața utilizator și funcționalitățile principale', bold: true, size: 28, font: 'Arial', color: '2E5FA3' })]
      }),

      para('Interfața grafică a aplicației FootballRisk Analytics a fost dezvoltată utilizând React 18 cu Vite ca bundler și Tailwind CSS v4 pentru stilizare. Designul urmează principiile unui dashboard analitic profesional, cu suport pentru modul întunecat (dark mode) și cel clar (light mode), comutabil dintr-un singur buton în bara superioară.'),

      para('Navigarea se realizează printr-o bară laterală fixă (sidebar) cu 9 secțiuni principale: Dashboard, Jucători, Predicție Risc, Comparare Jucători, Risc Echipă, Istoric & Recuperare, Statistici, Comparare Modele și Model ML.'),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: '3.2.1. Pagina Dashboard', bold: true, size: 24, font: 'Arial', color: '1F4E79' })]
      }),

      para('Pagina Dashboard reprezintă punctul de intrare în aplicație și oferă o vedere de ansamblu asupra întregii baze de date. Aceasta este compusă din mai multe elemente vizuale:'),
      bullet('6 carduri KPI (Key Performance Indicators) care afișează: numărul total de jucători (176), numărul total de accidentări înregistrate (1335), media zilelor de absență per accidentare (27 zile), rata intervențiilor chirurgicale (4.9%), rata de recidivă (5.6%) și numărul de jucători cu risc ridicat (76).'),
      bullet('Un paragraf de analiză narativă generată dinamic, care sintetizează în limbaj natural principalele statistici.'),
      bullet('Grafic de bare reprezentând evoluția numărului de accidentări pe sezoane (2019-20 până în 2023-24).'),
      bullet('Grafic circular (donut chart) pentru distribuția severității accidentărilor (ușoară, moderată, severă, foarte severă).'),

      ...imgParagraph('dashboard.png', 580, 380, 'Figura 3.1 – Pagina Dashboard cu KPI-uri și grafice de sinteză'),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: '3.2.2. Pagina Jucători', bold: true, size: 24, font: 'Arial', color: '1F4E79' })]
      }),

      para('Pagina Jucători afișează lista completă a celor 176 de jucători din baza de date, organizată sub forma unui tabel interactiv cu sortare și filtrare avansată. Fiecare rând din tabel include:'),
      bullet('Avatar cu inițialele jucătorului, colorat în funcție de nivelul de risc.'),
      bullet('Informații de bază: nume, club, poziție, vârstă, naționalitate.'),
      bullet('Numărul total de accidentări înregistrate.'),
      bullet('Scorul de risc vizualizat ca bară de progres colorată (verde < 25%, galben 25–50%, roșu 50–75%, violet > 75%).'),
      bullet('Badge-ul nivelului de risc: Scăzut, Moderat, Ridicat sau Foarte Ridicat.'),
      bullet('Scorul de fitness curent.'),

      para('Tabelul suportă filtrare simultană după poziție (GK, CB, ST etc.), club (Real Madrid, Arsenal, Inter Miami etc.) și sortare descrescătoare după scorul de risc, fitness sau numărul de accidentări.'),

      ...imgParagraph('players.png', 580, 380, 'Figura 3.2 – Pagina Jucători cu tabel interactiv sortabil și filtrabil'),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: '3.2.3. Pagina Predicție Risc', bold: true, size: 24, font: 'Arial', color: '1F4E79' })]
      }),

      para('Pagina de Predicție Risc reprezintă funcționalitatea centrală a aplicației și permite calcularea scorului de risc de accidentare în două moduri distincte:'),

      para('Modul „Jucător din baza de date" permite selectarea unui jucător prin câmpul de căutare (cu autocompletare), după care sistemul încarcă automat datele din ultimul sezon și calculează predicția. Modul „Introducere manuală" permite introducerea liberă a tuturor parametrilor prin câmpuri numerice, util pentru analiza jucătorilor care nu se află în baza de date.'),

      para('După calcularea predicției, pagina afișează o serie de componente vizuale:'),
      bullet('Metrul de risc semicircular (gauge chart) cu scorul procentual și culoarea aferentă nivelului de risc.'),
      bullet('Butonul „Descarcă Raport PDF" care generează și descarcă un document PDF complet cu toate datele de analiză.'),
      bullet('Graficul orizonturilor de timp (Area Chart) care prezintă probabilitatea cumulativă de accidentare pentru 7, 14, 30, 60 și 90 de zile.'),
      bullet('Graficul valorilor SHAP (waterfall chart orizontal) care explică contribuția fiecărui factor la decizia modelului, cu roșu pentru factorii care cresc riscul și verde pentru cei care îl reduc.'),
      bullet('Lista top factori de risc cu importanța procentuală și z-score-ul față de media populației.'),
      bullet('Recomandări personalizate generate dinamic pe baza profilului de risc.'),
      bullet('Secțiunea Benchmark vs. Poziție care compară jucătorul selectat cu media tuturor jucătorilor de pe aceeași poziție din baza de date, oferind percentila pentru fiecare metrică.'),
      bullet('Analiza What-If cu 6 slidere interactive (Fitness, Încărcare, Accidentări anterioare, Vârstă, Meciuri, Minute) care recalculează predicția în timp real la modificarea oricărui parametru.'),

      ...imgParagraph('prediction_result.png', 580, 380, 'Figura 3.3 – Pagina Predicție cu scorul de risc, orizonturi de timp și valori SHAP'),
      ...imgParagraph('prediction_shap.png', 580, 380, 'Figura 3.4 – Secțiunea Benchmark vs. Poziție și Analiza What-If'),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: '3.2.4. Pagina Statistici și funcționalități avansate', bold: true, size: 24, font: 'Arial', color: '1F4E79' })]
      }),

      para('Aplicația include mai multe pagini specializate pentru analiza aprofundată a datelor:'),

      para('Pagina Statistici & Analiză Detaliată prezintă distribuția statistică a celor 1335 de accidentări înregistrate prin: grafice de bare pentru cele mai frecvente 15 tipuri de accidentare, durata medie de absență pe tip, distribuția pe mecanism (contact/non-contact/suprasolicitare) și pe contextul producerii (meci/antrenament).'),

      ...imgParagraph('statistics.png', 580, 360, 'Figura 3.5 – Pagina Statistici cu analiza detaliată a accidentărilor'),

      para('Pagina Comparare Jucători permite selecția a 2–3 jucători simultan și afișează o comparație vizuală prin: grafic radar multidimensional normalizat (6 axe: risc, fitness, accidentări, zile absente, vârstă, meciuri), grafice de bare comparative pentru metricile cheie și un tabel de statistici detaliate side-by-side.'),

      ...imgParagraph('compare.png', 580, 360, 'Figura 3.6 – Pagina Comparare Jucători cu selecție multiplă'),

      para('Pagina Risc per Echipă oferă o vedere agregată asupra profilului de risc al unui club selectat. Conține 4 carduri KPI (număr jucători, risc mediu, număr cu risc ridicat, număr critic), graficul de distribuție a nivelurilor de risc (pie chart), graficul riscului mediu per poziție și lista completă a jucătorilor sortați descrescător după scor.'),

      ...imgParagraph('squad.png', 580, 380, 'Figura 3.7 – Pagina Risc per Echipă cu profilul complet Arsenal FC'),

      para('Pagina Istoric & Recuperare combină două instrumente complementare: timeline-ul cronologic al accidentărilor unui jucător și predictorul de timp de recuperare. Timeline-ul include harta corporală SVG anatomică cu zone de intensitate variabilă (hotspot-uri pulsante), graficul accidentărilor pe sezoane, distribuția pe severitate și lista cronologică a fiecărui incident cu toate detaliile. Predictorul de recuperare utilizează un model RandomForestRegressor (R² = 0.87, MAE = 9.78 zile) care estimează durata de recuperare pe baza caracteristicilor jucătorului și tipului de accidentare.'),

      ...imgParagraph('timeline.png', 580, 380, 'Figura 3.8 – Pagina Istoric & Recuperare cu hartă corporală anatomică și predictor recuperare'),

      // ═══════════════════════════════════════════════════
      // 3.3 REZULTATELE MODELELOR
      // ═══════════════════════════════════════════════════
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: true,
        spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: '3.3. Rezultatele modelelor de predicție', bold: true, size: 28, font: 'Arial', color: '2E5FA3' })]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: '3.3.1. Metricile de evaluare și rezultatele comparative', bold: true, size: 24, font: 'Arial', color: '1F4E79' })]
      }),

      para('Toate cele patru modele au fost antrenate pe același set de date (804 observații sezon-jucător, split 80/20 stratificat) și evaluate prin 5-fold cross-validation, utilizând 27 de variabile predictive, inclusiv trei features noi ingineritate în versiunea finală: interacțiunea vârstă×poziție, ponderea temporală a accidentărilor și zilele de la ultima accidentare. Datele de antrenare includ 1335 accidentări reale, din care 689 au fost îmbogățite prin scraperarea platformei Transfermarkt. Tabelul următor prezintă rezultatele comparative:'),

      // Metrics Table - versiune actualizata cu noile features
      new Table({
        width: { size: 9220, type: WidthType.DXA },
        columnWidths: [2500, 1680, 1680, 1680, 1680],
        spacing: { before: 200, after: 200 },
        rows: [
          headerRow(['Metrică', 'Logistic Reg.', 'MLP (Rețea N.)', 'Random Forest', 'XGBoost']),
          metricRow('Accuracy (%)',   '60.9', '58.4', '55.3', '54.7', 'lr'),
          metricRow('AUC-ROC (%)',    '63.3', '50.3', '58.2', '55.1', 'lr'),
          metricRow('Precision (%)',  '51.7', '47.6', '44.1', '43.5', 'lr'),
          metricRow('Recall (%)',     '47.7', '30.8', '40.0', '41.5', 'lr'),
          metricRow('F1-Score (%)',   '49.6', '37.4', '41.9', '42.5', 'lr'),
          metricRow('CV AUC-ROC (%)', '69.5 ±6.7', '66.5 ±9.4', '63.7 ±8.1', '62.3 ±4.3', 'lr'),
        ]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 200 },
        children: [new TextRun({ text: 'Tabelul 3.1 – Compararea metricilor de evaluare pentru cele 4 modele ML cu 27 features, antrenate pe 1335 accidentări reale (verde = cel mai bun scor per metrică)', italics: true, size: 20, color: '555555', font: 'Arial' })]
      }),

      para('Modelul câștigător este Logistic Regression, cu cel mai bun scor AUC-ROC de 63.3% și Accuracy de 60.9%. Față de un clasificator aleatoriu (50% AUC-ROC), modelul aduce o îmbunătățire de 13.3 pp, demonstrând că variabilele construite au putere discriminatorie. Cele 3 features noi (interacțiunea vârstă×poziție, ponderea temporală a accidentărilor, zilele de la ultima accidentare) contribuie la 16.8% din importanța globală a modelului. Metricile mai reduse față de versiunile antrenate exclusiv pe date sintetice reflectă complexitatea crescută a datelor reale din Transfermarkt – un model antrenat pe 1335 accidentări reale are mai multă variabilitate și zgomot, dar predicțiile sunt mai reprezentative biologic.'),

      para('Distribuția claselor în setul de antrenare a fost 478 negativ / 326 pozitiv (rata 1.47:1), situație gestionată prin parametrul class_weight="balanced" la modelele sklearn. Cross-validarea 5-fold AUC-ROC de 69.5% (±6.7%) confirmă că modelul este stabil și generalizează rezonabil pe date nevăzute.'),

      ...imgParagraph('model_comparison.png', 580, 380, 'Figura 3.9 – Pagina Comparare Modele ML cu tabel comparativ și curbe ROC'),
      ...imgParagraph('model_info.png', 580, 380, 'Figura 3.10 – Pagina Model ML cu metricile modelului activ și importanța variabilelor'),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: '3.3.2. Analiza factorilor de risc identificați', bold: true, size: 24, font: 'Arial', color: '1F4E79' })]
      }),

      para('Prin analiza coeficienților modelului Logistic Regression și a valorilor SHAP globale calculate pe setul de test, au fost identificați principalii factori asociați cu riscul de accidentare. Cei mai importanți 10 predictori din modelul final cu 27 de features sunt:'),

      bullet('Accidentări anterioare totale (29.4%) – cel mai puternic predictor unic; jucătorii cu istoric bogat de accidentări au un risc semnificativ mai mare, confirmat de datele reale Transfermarkt.'),
      bullet('Accidentări recente ponderate (14.2%) – feature nou; accidentările din ultimele 2 sezoane (ponderate 3×) sunt predictori mai relevanți decât cele din urmă cu 5 ani.'),
      bullet('Frecvența accidentărilor per sezon (9.9%) – captează tiparul de vulnerabilitate repetat al jucătorului.'),
      bullet('Severitatea maximă a accidentărilor anterioare (9.3%) – accidentările grave lasă sechele structurale pe termen lung.'),
      bullet('Sprinturi totale (5.0%) – volum sprint corelat cu risc de leziuni musculare la ischio-sural și cvadriceps.'),
      bullet('Interacțiunea vârstă×poziție (4.4%) – feature nou inginerit; un atacant de 38 de ani (38×3=114) are risc structural mult mai mare decât un portar de 38 de ani (38×0).'),
      bullet('Greutatea corporală (3.6%) – masă musculară mare corelată cu solicitări mecanice mai intense pe tendoane și ligamente.'),
      bullet('Variația încărcăturii față de sezonul anterior (3.5%) – creșterile bruște ale volumului de antrenament reprezintă factor de risc acut.'),
      bullet('Intensitate sprinturi/km (2.9%) – raport sprinturi per distanță, indicator de intensitate neuromusculară.'),
      bullet('Zile de la ultima accidentare (inclus în model) – feature nou; revenire recentă în joc (< 90 zile) crește semnificativ riscul de recidivă.'),

      para('Acești factori sunt consistenți cu literatura de specialitate în medicină sportivă. Dominanța predictoarelor legate de istoricul de accidentări (>53% importanță combinată) confirmă că trecutul medical al jucătorului este cel mai relevant indicator pentru riscul viitor, justificând efortul de îmbogățire a bazei de date cu date reale din Transfermarkt.'),

      // ═══════════════════════════════════════════════════
      // 3.4 TESTAREA ȘI VALIDAREA
      // ═══════════════════════════════════════════════════
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: true,
        spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: '3.4. Testarea și validarea aplicației', bold: true, size: 28, font: 'Arial', color: '2E5FA3' })]
      }),

      para('Validarea aplicației FootballRisk Analytics a fost realizată la trei niveluri: validarea modelelor ML, validarea funcțională a endpoint-urilor API și validarea vizuală a interfeței.'),

      para('Validarea modelelor ML a utilizat 5-fold stratified cross-validation, asigurând că distribuția claselor pozitive/negative este menținută în fiecare fold. Rezultatele cross-validare confirmă scorurile obținute pe setul de test: AUC-ROC CV 69.5% (±6.7%) față de 63.3% pe testul hold-out, cu variație normală pentru un set de date cu zgomot real. Diferența dintre CV și test reflectă variabilitatea biologică intrinsecă a datelor Transfermarkt.'),

      para('Modelul de predicție a timpului de recuperare (RandomForestRegressor) a obținut pe setul de test un coeficient de determinare R² = 0.87, indicând că 87% din variația timpului de recuperare este explicată de variabilele de intrare. Eroarea medie absolută de 9.78 zile este considerată acceptabilă pentru un predictor de recuperare, ținând cont de variabilitatea biologică individuală.'),

      para('Validarea funcțională a endpoint-urilor FastAPI a verificat corectitudinea răspunsurilor pentru toate cele 15 endpoint-uri implementate:'),
      bullet('GET /api/players – listare jucători cu filtrare și paginare (176 jucători)'),
      bullet('GET /api/players/{id}/predict – predicție completă cu SHAP, orizonturi și recomandări'),
      bullet('GET /api/players/compare?ids=... – comparare multi-jucător'),
      bullet('GET /api/players/squad?club=... – profilul de risc al unui club'),
      bullet('GET /api/players/timeline/{id} – istoricul de accidentări cronologic'),
      bullet('GET /api/players/benchmark/{id} – benchmark față de media poziției'),
      bullet('POST /api/prediction/risk – predicție manuală cu parametri liberi'),
      bullet('POST /api/prediction/recovery – predicție timp recuperare'),
      bullet('GET /api/export/player/{id}/pdf – generare și descărcare raport PDF'),
      bullet('GET /api/model/comparison – compararea metricilor tuturor modelelor antrenate'),

      para('Validarea vizuală a confirmat comportamentul corect al componentelor React pentru toate scenariile de utilizare testate: căutare și selectare jucător, comutare temă light/dark, ajustare slidere What-If, selectare orizont de timp, hover pe harta corporală și generare PDF.'),

      para('Calitatea predicțiilor a fost evaluată calitativ prin verificarea scoreurilor pentru jucători cu profile cunoscute. Calibrarea post-model folosește ajustări aditive mici (nu multiplicative) pentru vârstă și poziție, evitând dubla numărare a factorilor deja incluși ca features ML: Luka Modric (40 ani, CM) – risc 73.3%, cel mai ridicat din baza de date, consistent cu vârsta maximă și istoricul de accidentări; Roberto Firmino (34 ani, ST) – risc 72.3%, reflectând frecvența ridicată a accidentărilor la atacanți; Neymar Jr (34 ani, LW) – risc 65.9%, reflectând istoricul de 24 accidentări documentate și 1472 zile totale absente; Luis Suarez (39 ani, ST) – risc 55.2%, mai modest datorită numărului redus de accidentări documentate pentru clubul actual (Nacional). Scorul maxim din baza de date este 73.3%, eliminând valorile nerealiste de 97%+ care ar sugera certitudinea accidentării.'),

      para('Îmbogățirea bazei de date cu accidentări reale scraperiate de pe Transfermarkt a adăugat 689 de înregistrări noi pentru toți cei 176 de jucători, crescând baza de date de la 646 la 1335 de accidentări documentate – o creștere de 106.6%. Această îmbogățire substanțială a contribuit la un set de antrenare mai reprezentativ pentru variabilitatea reală a accidentărilor din fotbalul profesionist, chiar dacă metricile modelului reflectă complexitatea crescută a datelor reale față de cele sintetice.'),

      para('În concluzie, aplicația FootballRisk Analytics reprezintă un sistem funcțional, validat tehnic și clinic, care îmbină analiza datelor sportive cu tehnici moderne de Machine Learning pentru a oferi suport decizional în prevenirea accidentărilor în fotbalul profesionist. Prin iterațiile de îmbunătățire implementate — calibrare vârstă-poziție, ponderi temporale, feature engineering avansat (27 variabile) și îmbogățire cu 689 accidentări reale din Transfermarkt — sistemul a atins o acuratețe de 60.9% și AUC-ROC de 63.3% pe un set de 1335 accidentări reale, cu cross-validare de 69.5%. Rezultatele modelului, deși mai reduse față de bazele de date sintetice, reflectă o predicție mai autentică din punct de vedere medical, capabilă să generalizeze pe profiluri reale de jucători.'),

      // END
    ]
  }]
});

const SKILL_BASE = process.env.SKILL_BASE || __dirname;
const outPath = 'C:/Users/BogdanJ/Desktop/Licenta/Capitolul_3.docx';

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('SUCCESS: ' + outPath);
}).catch(err => { console.error('ERROR:', err); process.exit(1); });
