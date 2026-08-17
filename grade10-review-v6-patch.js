(() => {
  'use strict';

  // P3.2.7.10.10.1: 10 klasės pakartojimo turinio patikslinimų antras ratas.
  // Rinkinys klonuojamas prieš p2-catalog.js inicializaciją, kad nauji priskyrimai
  // gautų contentVersion 6, o jau priskirtų contentSnapshot kopijos nesikeistų.
  const source = window.P772BuiltInLessons;
  const original = source?.GRADE10_REVIEW_LESSON;
  if (!source || !original || !Array.isArray(original.tasks)) return;

  const lesson = JSON.parse(JSON.stringify(original));
  lesson.contentVersion = Math.max(6, Number(original.contentVersion || 1));

  const byId = new Map(lesson.tasks.map(task => [String(task?.id || ''), task]));
  const task = id => byId.get(id);

  // 2. Tikslesnė indėlio klausimo formuluotė.
  Object.assign(task('g10-02') || {}, {
    prompt: '1000 Eur indėlis kasmet padidėja 5 %. Koks bus indėlis po 2 metų?',
    promptDisplay: '\\(1000\\text{ Eur}\\) indėlis kasmet padidėja \\(5\\%\\). Koks bus indėlis po \\(2\\) metų?'
  });

  // 11–12. Vartojame matematikos vadovėliams įprastą „panašumo koeficiento“ terminiją.
  Object.assign(task('g10-11') || {}, {
    prompt: 'Panašių trikampių panašumo koeficientas yra 3. Mažesniojo trikampio perimetras yra 12 cm. Koks didesniojo trikampio perimetras?',
    promptDisplay: 'Panašių trikampių panašumo koeficientas yra \\(3\\). Mažesniojo trikampio perimetras yra \\(12\\text{ cm}\\). Koks didesniojo trikampio perimetras?',
    hint: 'Perimetrų santykis lygus panašumo koeficientui.'
  });
  Object.assign(task('g10-12') || {}, {
    prompt: 'Dviejų panašių figūrų panašumo koeficientas yra 4. Kiek kartų didesnis didesniosios figūros plotas?',
    promptDisplay: 'Dviejų panašių figūrų panašumo koeficientas yra \\(4\\). Kiek kartų didesnis didesniosios figūros plotas?',
    hint: 'Plotų santykis lygus panašumo koeficiento kvadratui.'
  });

  // 6. Apibrėžimo sritis: atviras įrašomas atsakymas vietoje pasirinkimų.
  Object.assign(task('g10-06') || {}, {
    type: 'input',
    title: 'Apibrėžimo sritis',
    prompt: 'Sprendžiant lygtį (x+2)/(x−3)=0, kuri reikšmė nepriklauso lygties apibrėžimo sričiai?',
    promptDisplay: 'Sprendžiant \\(\\frac{x+2}{x-3}=0\\), kuri reikšmė nepriklauso lygties apibrėžimo sričiai?',
    answer: '3',
    answerType: 'number',
    inputLabel: 'Reikšmė',
    placeholder: 'Įrašyk skaičių',
    hint: 'Vardiklis negali būti 0.'
  });
  if (task('g10-06')) {
    delete task('g10-06').choices;
    delete task('g10-06').choicesDisplay;
  }

  // 14. Sąlygoje nevartojame „sunkio centro“ sąvokos.
  Object.assign(task('g10-14') || {}, {
    title: 'Pusiaukraštinių susikirtimo taškas',
    prompt: 'Trikampio ABC pusiaukraštinės susikerta taške G. Kokiu santykiu taškas G dalija kiekvieną pusiaukraštinę, skaičiuojant nuo viršūnės?',
    promptDisplay: 'Trikampio \\(ABC\\) pusiaukraštinės susikerta taške \\(G\\). Kokiu santykiu taškas \\(G\\) dalija kiekvieną pusiaukraštinę, skaičiuojant nuo viršūnės?',
    hint: 'Taškas G yra arčiau kraštinės negu viršūnės.'
  });

  // 15–16. Formulės lieka pagalboje, bet neberodomos užduoties antraštėje.
  if (task('g10-15')) task('g10-15').title = 'Trikampio plotas';
  if (task('g10-16')) task('g10-16').title = 'Trikampio plotas';

  // 22. Atsisakome perteklinių a ir b kraštinių žymenų sąlygoje.
  Object.assign(task('g10-22') || {}, {
    prompt: 'Trikampyje ABC duota BC=10 cm, kampas A=30°, o kampas B=90°. Rask kraštinės AC ilgį.',
    promptDisplay: 'Trikampyje \\(ABC\\) duota \\(BC=10\\text{ cm}\\), \\(\\angle A=30^\\circ\\), \\(\\angle B=90^\\circ\\). Rask kraštinės \\(AC\\) ilgį.'
  });

  // 24. Lietuvos vadovėliuose vartojama teigiamos / neigiamos asimetrijos terminija.
  Object.assign(task('g10-24') || {}, {
    choices: ['simetriškas', 'teigiamai asimetriškas', 'neigiamai asimetriškas', 'vienodas'],
    answer: 'teigiamai asimetriškas'
  });

  // 25. Tiksliai įvardijame, kokias pasirinkimo poras skaičiuojame.
  Object.assign(task('g10-25') || {}, {
    prompt: 'Yra 4 marškinėliai ir 3 kelnės. Kiek skirtingų marškinėlių ir kelnių pasirinkimo porų galima sudaryti?',
    promptDisplay: 'Yra \\(4\\) marškinėliai ir \\(3\\) kelnės. Kiek skirtingų marškinėlių ir kelnių pasirinkimo porų galima sudaryti?'
  });

  // 30. Racionalioji lygtis: mokinys pats įrašo sprendinį, o ne renkasi iš variantų.
  Object.assign(task('g10-30') || {}, {
    type: 'input',
    prompt: 'Išspręsk lygtį 1/(x−2)=1/(4−x).',
    promptDisplay: 'Išspręsk lygtį \\(\\frac1{x-2}=\\frac1{4-x}\\).',
    answer: '3',
    answerType: 'number',
    inputLabel: 'x =',
    placeholder: 'Įrašyk skaičių',
    hint: 'Sulygink vardiklius, bet nepamiršk x≠2 ir x≠4.'
  });
  if (task('g10-30')) {
    delete task('g10-30').choices;
    delete task('g10-30').choicesDisplay;
  }

  const catalog = Array.isArray(source.LESSON_CATALOG)
    ? source.LESSON_CATALOG.map(item => item?.id === lesson.id ? lesson : item)
    : [];

  window.P772BuiltInLessons = Object.freeze({
    ...source,
    GRADE10_REVIEW_LESSON: Object.freeze(lesson),
    LESSON_CATALOG: Object.freeze(catalog)
  });
})();
