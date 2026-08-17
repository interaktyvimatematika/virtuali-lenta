(() => {
  'use strict';

  // P3.2.7.10.10: 10 klasės pakartojimo turinio patikslinimai.
  // Rinkinys klonuojamas prieš p2-catalog.js inicializaciją, kad nauji priskyrimai
  // gautų contentVersion 5, o jau priskirtų contentSnapshot kopijos nesikeistų.
  const source = window.P772BuiltInLessons;
  const original = source?.GRADE10_REVIEW_LESSON;
  if (!source || !original || !Array.isArray(original.tasks)) return;

  const lesson = JSON.parse(JSON.stringify(original));
  lesson.contentVersion = Math.max(5, Number(original.contentVersion || 1) + 1);

  const byId = new Map(lesson.tasks.map(task => [String(task?.id || ''), task]));
  const task = id => byId.get(id);

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

  const catalog = Array.isArray(source.LESSON_CATALOG)
    ? source.LESSON_CATALOG.map(item => item?.id === lesson.id ? lesson : item)
    : [];

  window.P772BuiltInLessons = Object.freeze({
    ...source,
    GRADE10_REVIEW_LESSON: Object.freeze(lesson),
    LESSON_CATALOG: Object.freeze(catalog)
  });
})();
