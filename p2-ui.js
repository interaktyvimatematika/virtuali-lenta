(() => {
  'use strict';

  const BUILD = 'P2-SPLIT-P2.5-P4-P1.7.3.1';
  const P2_DATA_SCHEMA_VERSION = 1;
  const STORAGE_KEY = 'p772-p2-split-ui-v1';
  const body = document.body;
  const workspace = document.getElementById('p2Workspace');
  const splitter = document.getElementById('p2Splitter');
  const sidePane = document.getElementById('p2SidePane');
  const studentPanel = document.getElementById('p2StudentPanel');
  const teacherPanel = document.getElementById('p2TeacherPanel');
  const sideTitle = document.getElementById('p2SideTitle');
  const sideKicker = document.getElementById('p2SideKicker');
  const practiceModeButton = document.getElementById('p2PracticeModeButton');
  const userCount = document.getElementById('onlineUsers');
  const presencePill = document.getElementById('p2PresencePill');
  const sideRolePill = document.getElementById('p2SideRolePill');
  const boardPresenceText = document.getElementById('p2BoardPresenceText');
  const brandSubtitle = document.querySelector('.brand span');

  if (!workspace || !splitter || !sidePane || !studentPanel || !teacherPanel) return;

  body.classList.add('p2-shell');
  if (brandSubtitle) {
    brandSubtitle.textContent = 'Interaktyvios pratybos';
    brandSubtitle.title = BUILD;
  }

  const legacyPracticeButton = document.getElementById('practiceOnlyButton');
  if (legacyPracticeButton) legacyPracticeButton.hidden = true;

  const DEMO_LESSON = Object.freeze({
    // P2-SPLIT-P2.4.7.18.1: visa Lygčių diagnostika perrašyta į vieną naujausią
    // semantinį sprendimo srautą. Tiesinės ir kvadratinės užduotys naudoja tą patį
    // Word tipo žingsnių modelį: Enter tęsiniai, vertikalios šakos, Atsakymas ir
    // automatinis tinkamo matematinio tikrintuvo parinkimas pagal pradinę lygtį.
    // Sąmoningai paliekamas tas pats lesson id, kad jau priskirta demonstracinė pamoka
    // mokinio lange neprapultų po GitHub atnaujinimo.
    id: 'p2-demo-funkcija-01',
    contentVersion: 1,
    title: 'Lygčių tikrintuvo diagnostika',
    shortTitle: 'Lygčių diagnostika',
    description: '6 tiesinių ir kvadratinių lygčių diagnostikos užduotys, visos naudojančios naujausią semantinį sprendimo srautą.',
    taskCount: 6,
    classCount: 6,
    selfCount: 0,
    tasks: [
      {
        id: 'eqdiag-1',
        type: 'solution',
        section: 'class',
        label: '1 testas',
        title: 'Tiesinė lygtis · kintamasis abiejose pusėse',
        prompt: '4x - 7 = 2x + 9',
        instruction: 'Spręsk kaip sąsiuvinyje: rašyk pagrįstus lygiaverčius žingsnius, o lygybės skaičiavimą gali tęsti naujoje eilutėje pradėdamas =.',
        answer: 'x = 8',
        hint: 'Sutelk narius su x vienoje pusėje, skaičius – kitoje. Programa vertina matematinį perėjimą, ne vieną iš anksto numatytą užrašymo šabloną.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Įrašyk kitą lygties žingsnį',
          validator: 'semantic-equation-chain',
          options: {
            initial: '4x - 7 = 2x + 9',
            expectedVariable: 'x',
            expectedValue: 8,
            expectedDisplay: '8',
            minimumSteps: 2,
            stepTransitionValidation: 'semantic-v3'
          }
        }
      },
      {
        id: 'eqdiag-2',
        type: 'solution',
        section: 'class',
        label: '2 testas',
        title: 'Tiesinė lygtis · skliaustai',
        prompt: '5 - 2(x + 1) = 3x - 7',
        instruction: 'Spręsk pasirinkta tvarka: gali išskleisti skliaustus, perkelti kelis narius vienu žingsniu ir tęsti lygybės skaičiavimą naujoje eilutėje.',
        answer: 'x = 2',
        hint: 'Nėra vieno privalomo kelio: svarbu, kad kiekvienas žingsnis būtų tiesiogiai matematiškai pagrįstas.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Įrašyk kitą lygties žingsnį',
          validator: 'semantic-equation-chain',
          options: {
            initial: '5 - 2(x + 1) = 3x - 7',
            expectedVariable: 'x',
            expectedValue: 2,
            expectedDisplay: '2',
            minimumSteps: 2,
            stepTransitionValidation: 'semantic-v3'
          }
        }
      },
      {
        id: 'eqdiag-3',
        type: 'solution',
        section: 'class',
        label: '3 testas',
        title: 'Kvadratinė lygtis · du sveikieji sprendiniai',
        prompt: 'x^2 - 7x + 12 = 0',
        instruction: 'Išspręsk bet kuriuo teisingu būdu. Gali faktorizuoti, sudaryti pilną kvadratą ar naudoti diskriminantą; formulę gali rašyti simboliais arba iš karto statyti skaičius. Išsišakojus naudok „Šakos“, o Enter tęsia pasirinktą šaką.',
        answer: 'x = 3; x = 4',
        hint: 'Diskriminanto ir koeficientų raides gali pasirinkti pats. Tolesnis sprendimas patikslina jų vaidmenį, o lygybę gali tęsti naujoje eilutėje nuo =.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Įrašyk kitą lygties žingsnį',
          validator: 'semantic-equation-chain',
          options: {
            initial: 'x^2 - 7x + 12 = 0',
            expectedVariable: 'x',
            expectedValues: [3, 4],
            expectedDisplay: 'x = 3; x = 4',
            minimumSteps: 2,
            autoDerived: true,
            stepTransitionValidation: 'semantic-v3'
          }
        }
      },
      {
        id: 'eqdiag-4',
        type: 'solution',
        section: 'class',
        label: '4 testas',
        title: 'Kvadratinė lygtis · dvigubas sprendinys',
        prompt: 'x^2 - 6x + 9 = 0',
        instruction: 'Išspręsk pasirinktu būdu. Dvigubo sprendinio atveju neprivalai kurti dviejų vienodų šakų; vieną formulės ar skaičiavimo grandinę gali tęsti naujomis = eilutėmis.',
        answer: 'x = 3',
        hint: 'Gali atpažinti pilną kvadratą arba naudoti diskriminantą. Jei D = 0, pakanka vienos teisingos sprendinio grandinės.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Įrašyk kitą lygties žingsnį',
          validator: 'semantic-equation-chain',
          options: {
            initial: 'x^2 - 6x + 9 = 0',
            expectedVariable: 'x',
            expectedValues: [3],
            expectedDisplay: 'x = 3',
            minimumSteps: 2,
            autoDerived: true,
            stepTransitionValidation: 'semantic-v3'
          }
        }
      },
      {
        id: 'eqdiag-5',
        type: 'solution',
        section: 'class',
        label: '5 testas',
        title: 'Kvadratinė lygtis · realių sprendinių nėra',
        prompt: 'x^2 + 4x + 5 = 0',
        instruction: 'Išspręsk realiųjų skaičių aibėje pasirinktu būdu. Jei paaiškėja, kad realių sprendinių nėra, pabaigoje naudok „Atsakymas“ ir užrašyk ∅ arba „sprendinių nėra“.',
        answer: 'sprendinių nėra',
        hint: 'Diskriminantas yra neigiamas. Galutiniame sprendinių aibės žingsnyje gali rašyti „sprendinių nėra“ arba ∅.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Įrašyk kitą lygties žingsnį',
          validator: 'semantic-equation-chain',
          options: {
            initial: 'x^2 + 4x + 5 = 0',
            expectedVariable: 'x',
            expectedValues: [],
            expectedDisplay: 'sprendinių nėra',
            minimumSteps: 2,
            autoDerived: true,
            stepTransitionValidation: 'semantic-v3'
          }
        }
      },
      {
        id: 'eqdiag-6',
        type: 'solution',
        section: 'class',
        label: '6 testas',
        title: 'Kvadratinė lygtis · trupmeninis sprendinys',
        prompt: '2x^2 - 5x - 3 = 0',
        instruction: 'Išspręsk bet kuriuo teisingu būdu. Jei naudoji kvadratinės lygties formulę, abi šakos gali būti nevienodo detalumo, o Enter leidžia tęsti kiekvieną šaką vertikaliai.',
        answer: 'x = -1/2; x = 3',
        hint: 'Gali skaidyti dauginamaisiais arba naudoti diskriminantą ir formulę. Bendro simbolinio šablono kartoti kiekvienoje šakoje neprivaloma.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Įrašyk kitą lygties žingsnį',
          validator: 'semantic-equation-chain',
          options: {
            initial: '2x^2 - 5x - 3 = 0',
            expectedVariable: 'x',
            expectedValues: [-0.5, 3],
            expectedDisplay: 'x = -1/2; x = 3',
            minimumSteps: 2,
            autoDerived: true,
            stepTransitionValidation: 'semantic-v3'
          }
        }
      }
    ]
  });

  // P2-SPLIT-P2.4.7.19.4: 5 klasės rinkinio sąlygose ir pasirinkimuose rodomos tikros LaTeX formulės.
  // Sąmoningai naudojami tik testiniai klausimai ir paprasti vienos eilutės
  // atsakymo laukeliai, kad penktokei nereikėtų sudėtingo formulės įvedimo.
  const GRADE5_REVIEW_LESSON = Object.freeze({
    id: 'p2-grade5-review-01',
    contentVersion: 1,
    title: '5 klasės matematikos pakartojimas',
    shortTitle: '5 klasės pakartojimas',
    description: '30 įvairių 5 klasės kurso kartojimo užduočių: skaičiai ir veiksmai, dalumas, trupmenos, dešimtainiai skaičiai, procentai, dėsningumai, paprastos lygtys, geometrija, matavimai, duomenys ir tikimybės.',
    taskCount: 30,
    classCount: 20,
    selfCount: 10,
    tasks: [
      {
        id: 'g5-01', type: 'choice', section: 'class', label: 'Skaičiai',
        title: 'Romėniškieji skaičiai', prompt: 'Kokį skaičių reiškia XLVII?',
        choices: ['42', '47', '52', '57'], answer: '47',
        hint: 'XL = 40, VII = 7.'
      },
      {
        id: 'g5-02', type: 'input', section: 'class', label: 'Skaičiai',
        title: 'Apvalinimas', prompt: 'Suapvalink 68 742 iki tūkstančių.', promptDisplay: 'Suapvalink \\(68\\,742\\) iki tūkstančių.',
        answer: '69000', answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Įrašyk skaičių',
        hint: 'Pažiūrėk į šimtų skaitmenį.'
      },
      {
        id: 'g5-03', type: 'input', section: 'class', label: 'Veiksmai',
        title: 'Veiksmų tvarka', prompt: 'Apskaičiuok: 900 − 24 · 15 + 120 : 6', promptDisplay: 'Apskaičiuok: \\(900-24\\cdot15+120:6\\)',
        answer: '560', answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Įrašyk skaičių',
        hint: 'Pirmiausia atlik daugybą ir dalybą.'
      },
      {
        id: 'g5-04', type: 'input', section: 'class', label: 'Veiksmai',
        title: 'Dalyba', prompt: 'Apskaičiuok: 936 : 26', promptDisplay: 'Apskaičiuok: \\(936:26\\)',
        answer: '36', answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Įrašyk skaičių',
        hint: 'Patikrink, iš kokio skaičiaus reikia padauginti 26, kad gautum 936.'
      },
      {
        id: 'g5-05', type: 'choice', section: 'class', label: 'Dalumas',
        title: 'Dalumo požymiai', prompt: 'Kuris skaičius dalijasi ir iš 3, ir iš 5?',
        choices: ['110', '125', '105', '140'], answer: '105',
        hint: 'Iš 5 dalijasi skaičiai, besibaigiantys 0 arba 5. Iš 3 – kai skaitmenų suma dalijasi iš 3.'
      },
      {
        id: 'g5-06', type: 'choice', section: 'class', label: 'Dalumas',
        title: 'Pirminiai skaičiai', prompt: 'Kuris skaičius yra pirminis?',
        choices: ['27', '31', '39', '49'], answer: '31',
        hint: 'Pirminis skaičius turi tik du daliklius: 1 ir save patį.'
      },
      {
        id: 'g5-07', type: 'choice', section: 'class', label: 'Dalumas',
        title: 'Kartotiniai', prompt: 'Koks yra mažiausias bendras skaičių 4 ir 6 kartotinis?',
        choices: ['8', '10', '12', '24'], answer: '12',
        hint: 'Surašyk kelis pirmuosius 4 ir 6 kartotinius.'
      },
      {
        id: 'g5-08', type: 'choice', section: 'class', label: 'Trupmenos',
        title: 'Lygiavertės trupmenos', prompt: 'Kuri trupmena lygi 3/4?', promptDisplay: 'Kuri trupmena lygi \\(\\frac{3}{4}\\)?',
        choices: ['4/6', '6/8', '5/9', '7/10'], choicesDisplay: ['\\(\\frac{4}{6}\\)', '\\(\\frac{6}{8}\\)', '\\(\\frac{5}{9}\\)', '\\(\\frac{7}{10}\\)'], answer: '6/8',
        hint: 'Skaitiklį ir vardiklį galima padauginti iš to paties skaičiaus.'
      },
      {
        id: 'g5-09', type: 'choice', section: 'class', label: 'Trupmenos',
        title: 'Mišrusis skaičius', prompt: 'Kuris mišrusis skaičius lygus 11/4?', promptDisplay: 'Kuris mišrusis skaičius lygus \\(\\frac{11}{4}\\)?',
        choices: ['2 1/4', '2 2/4', '2 3/4', '3 1/4'], choicesDisplay: ['\\(2\\frac{1}{4}\\)', '\\(2\\frac{2}{4}\\)', '\\(2\\frac{3}{4}\\)', '\\(3\\frac{1}{4}\\)'], answer: '2 3/4',
        hint: '11 : 4 = 2 ir lieka 3.'
      },
      {
        id: 'g5-10', type: 'choice', section: 'class', label: 'Trupmenos',
        title: 'Trupmenų palyginimas', prompt: 'Kuris teiginys teisingas?',
        choices: ['5/6 < 4/5', '5/6 = 4/5', '5/6 > 4/5'], choicesDisplay: ['\\(\\frac{5}{6}<\\frac{4}{5}\\)', '\\(\\frac{5}{6}=\\frac{4}{5}\\)', '\\(\\frac{5}{6}>\\frac{4}{5}\\)'], answer: '5/6 > 4/5',
        hint: 'Gali trupmenas palyginti suvienodinęs vardiklius.'
      },
      {
        id: 'g5-11', type: 'choice', section: 'class', label: 'Trupmenos',
        title: 'Trupmenų sudėtis', prompt: 'Apskaičiuok: 2/7 + 3/7', promptDisplay: 'Apskaičiuok: \\(\\frac{2}{7}+\\frac{3}{7}\\)',
        choices: ['3/7', '4/7', '5/7', '5/14'], choicesDisplay: ['\\(\\frac{3}{7}\\)', '\\(\\frac{4}{7}\\)', '\\(\\frac{5}{7}\\)', '\\(\\frac{5}{14}\\)'], answer: '5/7',
        hint: 'Kai vardikliai vienodi, sudėk skaitiklius.'
      },
      {
        id: 'g5-12', type: 'input', section: 'class', label: 'Trupmenos',
        title: 'Trupmena ir natūralusis skaičius', prompt: 'Apskaičiuok: 3/5 · 10', promptDisplay: 'Apskaičiuok: \\(\\frac{3}{5}\\cdot10\\)',
        answer: '6', answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Įrašyk skaičių',
        hint: '10 padalink į 5 lygias dalis ir paimk 3 dalis.'
      },
      {
        id: 'g5-13', type: 'input', section: 'class', label: 'Dešimtainiai skaičiai',
        title: 'Trupmena ir dešimtainis skaičius', prompt: 'Kaip dešimtainiu skaičiumi užrašyti 75/100?', promptDisplay: 'Kaip dešimtainiu skaičiumi užrašyti \\(\\frac{75}{100}\\)?',
        answer: '0,75', acceptedAnswers: ['0,75', '0.75'], answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Pvz., 0,5',
        hint: 'Šimtosios rašomos dviem skaitmenimis po kablelio.'
      },
      {
        id: 'g5-14', type: 'input', section: 'class', label: 'Dešimtainiai skaičiai',
        title: 'Veiksmai su dešimtainiais skaičiais', prompt: 'Apskaičiuok: 7,4 + 2,85 − 1,25', promptDisplay: 'Apskaičiuok: \\(7{,}4+2{,}85-1{,}25\\)',
        answer: '9', acceptedAnswers: ['9', '9,0', '9,00', '9.0', '9.00'], answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Įrašyk skaičių',
        hint: 'Rašydama stulpeliu sulygiuok kablelius.'
      },
      {
        id: 'g5-15', type: 'choice', section: 'class', label: 'Procentai',
        title: 'Nuolaida', prompt: 'Kuprinė kainavo 80 Eur. Jai pritaikyta 25 % nuolaida. Kiek dabar kainuoja kuprinė?', promptDisplay: 'Kuprinė kainavo \\(80\\text{ Eur}\\). Jai pritaikyta \\(25\\%\\) nuolaida. Kiek dabar kainuoja kuprinė?',
        choices: ['20 Eur', '55 Eur', '60 Eur', '65 Eur'], answer: '60 Eur',
        hint: '25 % yra ketvirtadalis. Rask ketvirtadalį 80 Eur ir jį atimk.'
      },
      {
        id: 'g5-16', type: 'input', section: 'class', label: 'Dėsningumai',
        title: 'Skaičių seka', prompt: 'Rask kitą sekos narį: 4, 9, 14, 19, …', promptDisplay: 'Rask kitą sekos narį: \\(4,\\ 9,\\ 14,\\ 19,\\ \\ldots\\)',
        answer: '24', answerType: 'number', inputLabel: 'Kitas skaičius', placeholder: 'Įrašyk skaičių',
        hint: 'Pažiūrėk, kiek kiekvieną kartą padidėja skaičius.'
      },
      {
        id: 'g5-17', type: 'input', section: 'class', label: 'Dėsningumai',
        title: 'Taisyklės taikymas', prompt: 'Taisyklė: skaičių padaugink iš 3 ir pridėk 2. Koks rezultatas, jei pradinis skaičius yra 5?',
        answer: '17', answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Įrašyk skaičių',
        hint: 'Pirmiausia apskaičiuok 5 · 3.'
      },
      {
        id: 'g5-18', type: 'input', section: 'class', label: 'Lygtys',
        title: 'Paprasta lygtis', prompt: 'Rask x: x + 17 = 42. Įrašyk tik x reikšmę.', promptDisplay: 'Rask \\(x\\): \\(x+17=42\\). Įrašyk tik \\(x\\) reikšmę.',
        answer: '25', answerType: 'number', inputLabel: 'x =', placeholder: 'Įrašyk skaičių',
        hint: 'Kokį skaičių pridėjus prie 17 gausi 42?'
      },
      {
        id: 'g5-19', type: 'input', section: 'class', label: 'Lygtys',
        title: 'Lygtis su daugyba', prompt: 'Rask x: 3x + 6 = 27. Įrašyk tik x reikšmę.', promptDisplay: 'Rask \\(x\\): \\(3x+6=27\\). Įrašyk tik \\(x\\) reikšmę.',
        answer: '7', answerType: 'number', inputLabel: 'x =', placeholder: 'Įrašyk skaičių',
        hint: 'Pirmiausia iš abiejų pusių atimk 6.'
      },
      {
        id: 'g5-20', type: 'choice', section: 'class', label: 'Raidiniai reiškiniai',
        title: 'Panašieji nariai', prompt: 'Kuris reiškinys lygus 4a + 3a?', promptDisplay: 'Kuris reiškinys lygus \\(4a+3a\\)?',
        choices: ['7', '7a', '12a', '12a²'], choicesDisplay: ['\\(7\\)', '\\(7a\\)', '\\(12a\\)', '\\(12a^2\\)'], answer: '7a',
        hint: 'Sudedi keturias ir tris tokias pačias a dalis.'
      },
      {
        id: 'g5-21', type: 'choice', section: 'self', label: 'Geometrija',
        title: 'Kampai', prompt: 'Koks yra 125° kampas?', promptDisplay: 'Koks yra \\(125^\\circ\\) kampas?',
        choices: ['Smailusis', 'Statusis', 'Bukasis', 'Ištiestinis'], answer: 'Bukasis',
        hint: 'Bukasis kampas yra didesnis už 90°, bet mažesnis už 180°.'
      },
      {
        id: 'g5-22', type: 'input', section: 'self', label: 'Geometrija',
        title: 'Trikampio kampai', prompt: 'Du trikampio kampai yra 70° ir 55°. Koks trečiasis kampas?', promptDisplay: 'Du trikampio kampai yra \\(70^\\circ\\) ir \\(55^\\circ\\). Koks trečiasis kampas?',
        answer: '55', answerType: 'number', inputLabel: 'Kampas', inputSuffix: '°', placeholder: 'Įrašyk skaičių',
        hint: 'Visų trikampio kampų suma yra 180°.'
      },
      {
        id: 'g5-23', type: 'choice', section: 'self', label: 'Geometrija',
        title: 'Perimetras ir plotas', prompt: 'Stačiakampio ilgis 8 cm, plotis 5 cm. Kuri pora teisinga?', promptDisplay: 'Stačiakampio ilgis \\(8\\text{ cm}\\), plotis \\(5\\text{ cm}\\). Kuri pora teisinga?',
        choices: ['P = 13 cm, S = 40 cm²', 'P = 26 cm, S = 40 cm²', 'P = 40 cm, S = 26 cm²', 'P = 26 cm, S = 13 cm²'], choicesDisplay: ['\\(P=13\\text{ cm},\\ S=40\\text{ cm}^2\\)', '\\(P=26\\text{ cm},\\ S=40\\text{ cm}^2\\)', '\\(P=40\\text{ cm},\\ S=26\\text{ cm}^2\\)', '\\(P=26\\text{ cm},\\ S=13\\text{ cm}^2\\)'],
        answer: 'P = 26 cm, S = 40 cm²',
        hint: 'Perimetrui sudėk visų kraštinių ilgius, plotui daugink ilgį iš pločio.'
      },
      {
        id: 'g5-24', type: 'input', section: 'self', label: 'Geometrija',
        title: 'Stačiojo trikampio plotas', prompt: 'Stačiojo trikampio statinių ilgiai yra 8 cm ir 5 cm. Koks trikampio plotas?', promptDisplay: 'Stačiojo trikampio statinių ilgiai yra \\(8\\text{ cm}\\) ir \\(5\\text{ cm}\\). Koks trikampio plotas?',
        answer: '20', answerType: 'number', inputLabel: 'Plotas', inputSuffix: 'cm²', placeholder: 'Įrašyk skaičių',
        hint: 'Stačiojo trikampio plotas yra pusė 8 · 5.'
      },
      {
        id: 'g5-25', type: 'input', section: 'self', label: 'Geometrija',
        title: 'Tūris', prompt: 'Stačiakampio gretasienio matmenys: 4 cm × 3 cm × 2 cm. Koks jo tūris?', promptDisplay: 'Stačiakampio gretasienio matmenys: \\(4\\text{ cm}\\times3\\text{ cm}\\times2\\text{ cm}\\). Koks jo tūris?',
        answer: '24', answerType: 'number', inputLabel: 'Tūris', inputSuffix: 'cm³', placeholder: 'Įrašyk skaičių',
        hint: 'Tūrį gausi sudauginusi visus tris matmenis.'
      },
      {
        id: 'g5-26', type: 'input', section: 'self', label: 'Matavimai',
        title: 'Matavimo vienetai', prompt: '2,4 m = kiek centimetrų?', promptDisplay: '\\(2{,}4\\text{ m}\\) = kiek centimetrų?',
        answer: '240', answerType: 'number', inputLabel: 'Atsakymas', inputSuffix: 'cm', placeholder: 'Įrašyk skaičių',
        hint: '1 m = 100 cm.'
      },
      {
        id: 'g5-27', type: 'input', section: 'self', label: 'Judėjimas',
        title: 'Kelias, greitis ir laikas', prompt: 'Automobilis nuvažiavo 180 km, važiuodamas 60 km/h greičiu. Kiek valandų truko kelionė?', promptDisplay: 'Automobilis nuvažiavo \\(180\\text{ km}\\), važiuodamas \\(60\\text{ km/h}\\) greičiu. Kiek valandų truko kelionė?',
        answer: '3', answerType: 'number', inputLabel: 'Laikas', inputSuffix: 'val.', placeholder: 'Įrašyk skaičių',
        hint: 'Laikas = kelias : greitis.'
      },
      {
        id: 'g5-28', type: 'choice', section: 'self', label: 'Transformacijos',
        title: 'Figūrų transformacijos', prompt: 'Figūra perkelta 4 langelius į dešinę, jos nepasukant ir neatspindint. Kokia transformacija atlikta?',
        choices: ['Posūkis', 'Simetrija tiesės atžvilgiu', 'Lygiagretusis postūmis', 'Centrinė simetrija'], answer: 'Lygiagretusis postūmis',
        hint: 'Figūra tik pasislinko, jos forma ir kryptis nepasikeitė.'
      },
      {
        id: 'g5-29', type: 'input', section: 'self', label: 'Duomenys',
        title: 'Vidurkis', prompt: 'Penki mokiniai perskaitė 6, 8, 9, 7 ir 10 puslapių. Kiek puslapių vidutiniškai perskaitė vienas mokinys?',
        answer: '8', answerType: 'number', inputLabel: 'Vidurkis', placeholder: 'Įrašyk skaičių',
        hint: 'Sudėk visus puslapius ir padalink iš 5.'
      },
      {
        id: 'g5-30', type: 'choice', section: 'self', label: 'Tikimybė',
        title: 'Paprasta tikimybė', prompt: 'Maišelyje yra 3 raudoni, 2 mėlyni ir 1 žalias rutuliukas. Kokia tikimybė ištraukti mėlyną?',
        choices: ['1/6', '1/3', '1/2', '2/3'], choicesDisplay: ['\\(\\frac{1}{6}\\)', '\\(\\frac{1}{3}\\)', '\\(\\frac{1}{2}\\)', '\\(\\frac{2}{3}\\)'], answer: '1/3',
        hint: 'Iš viso yra 6 rutuliukai, iš jų 2 mėlyni.'
      }
    ]
  });

  // P2-SPLIT-P2.5-P4-P1.7.2: 7 klasės kurso kartojimo rinkinys pagal atnaujintos
  // matematikos bendrosios programos 7 klasės turinį. Sąlygų formulės rodomos
  // per LaTeX/MathLive, o atsakymai paliekami kuo paprastesni: pasirinkimas arba skaičius.
  const GRADE7_REVIEW_LESSON = Object.freeze({
    id: 'p2-grade7-review-01',
    contentVersion: 1,
    title: '7 klasės matematikos pakartojimas',
    shortTitle: '7 klasės pakartojimas',
    description: '30 įvairių 7 klasės kurso kartojimo užduočių: laipsniai ir standartinė išraiška, procentai ir palūkanos, nelygybės, tiesioginis ir atvirkštinis proporcingumas, koordinačių plokštuma, geometrija, plotai, apskritimas, tūris ir duomenys.',
    taskCount: 30,
    classCount: 20,
    selfCount: 10,
    tasks: [
      {
        id: 'g7-01', type: 'input', section: 'class', label: 'Laipsniai',
        title: 'Laipsnis su natūraliuoju rodikliu', prompt: 'Apskaičiuok: 2^5', promptDisplay: 'Apskaičiuok: \\(2^5\\)',
        answer: '32', answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Įrašyk skaičių',
        hint: 'Laipsnis 2⁵ reiškia penkių dvejetų sandaugą.'
      },
      {
        id: 'g7-02', type: 'input', section: 'class', label: 'Laipsniai',
        title: 'Veiksmai su vienodais pagrindais', prompt: 'Apskaičiuok: 3^4 · 3^2 : 3^3', promptDisplay: 'Apskaičiuok: \\(3^4\\cdot3^2:3^3\\)',
        answer: '27', answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Įrašyk skaičių',
        hint: 'Dauginant vienodo pagrindo laipsnius rodikliai sudedami, dalijant – atimami.'
      },
      {
        id: 'g7-03', type: 'input', section: 'class', label: 'Laipsniai',
        title: 'Laipsnio kėlimas laipsniu', prompt: 'Apskaičiuok: (2^3)^2', promptDisplay: 'Apskaičiuok: \\((2^3)^2\\)',
        answer: '64', answerType: 'number', inputLabel: 'Atsakymas', placeholder: 'Įrašyk skaičių',
        hint: 'Keliant laipsnį laipsniu, rodikliai dauginami.'
      },
      {
        id: 'g7-04', type: 'choice', section: 'class', label: 'Laipsniai',
        title: 'Nulinis rodiklis', prompt: 'Kuri lygybė teisinga?',
        choices: ['7^0 = 0', '7^0 = 1', '7^0 = 7', '7^0 = 49'],
        choicesDisplay: ['\\(7^0=0\\)', '\\(7^0=1\\)', '\\(7^0=7\\)', '\\(7^0=49\\)'], answer: '7^0 = 1',
        hint: 'Bet kurio nuliui nelygaus skaičiaus nulinis laipsnis lygus 1.'
      },
      {
        id: 'g7-05', type: 'choice', section: 'class', label: 'Laipsniai',
        title: 'Neigiamas rodiklis', prompt: 'Kam lygu 10^−3?', promptDisplay: 'Kam lygu \\(10^{-3}\\)?',
        choices: ['1000', '0,001', '−1000', '−0,001'],
        choicesDisplay: ['\\(1000\\)', '\\(0{,}001\\)', '\\(-1000\\)', '\\(-0{,}001\\)'], answer: '0,001',
        hint: '10⁻³ = 1 : 10³.'
      },
      {
        id: 'g7-06', type: 'choice', section: 'class', label: 'Laipsniai',
        title: 'Standartinė skaičiaus išraiška', prompt: 'Kuri standartinė išraiška lygi skaičiui 0,00056?', promptDisplay: 'Kuri standartinė išraiška lygi skaičiui \\(0{,}00056\\)?',
        choices: ['5,6 · 10^−4', '5,6 · 10^−3', '56 · 10^−4', '0,56 · 10^−4'],
        choicesDisplay: ['\\(5{,}6\\cdot10^{-4}\\)', '\\(5{,}6\\cdot10^{-3}\\)', '\\(56\\cdot10^{-4}\\)', '\\(0{,}56\\cdot10^{-4}\\)'], answer: '5,6 · 10^−4',
        hint: 'Standartinėje išraiškoje pirmasis daugiklis turi būti ne mažesnis už 1 ir mažesnis už 10.'
      },
      {
        id: 'g7-07', type: 'input', section: 'class', label: 'Procentai',
        title: 'Pakartotinis procentinis didėjimas', prompt: 'Kaina buvo 200 Eur. Ji du kartus iš eilės padidėjo po 10 %. Kokia tapo kaina?', promptDisplay: 'Kaina buvo \\(200\\text{ Eur}\\). Ji du kartus iš eilės padidėjo po \\(10\\%\\). Kokia tapo kaina?',
        answer: '242', answerType: 'number', inputLabel: 'Kaina', inputSuffix: 'Eur', placeholder: 'Įrašyk skaičių',
        hint: 'Antrą kartą 10 % skaičiuojama jau nuo po pirmojo padidėjimo gautos kainos.'
      },
      {
        id: 'g7-08', type: 'input', section: 'class', label: 'Procentai',
        title: 'Pakartotinis procentinis mažėjimas', prompt: 'Prekė kainavo 500 Eur. Pirmiausia kaina sumažinta 20 %, vėliau dar 10 %. Kokia galutinė kaina?', promptDisplay: 'Prekė kainavo \\(500\\text{ Eur}\\). Pirmiausia kaina sumažinta \\(20\\%\\), vėliau dar \\(10\\%\\). Kokia galutinė kaina?',
        answer: '360', answerType: 'number', inputLabel: 'Kaina', inputSuffix: 'Eur', placeholder: 'Įrašyk skaičių',
        hint: 'Po pirmos nuolaidos lieka 80 % pradinės kainos, o antra nuolaida taikoma naujai kainai.'
      },
      {
        id: 'g7-09', type: 'input', section: 'class', label: 'Finansai',
        title: 'Paprastos palūkanos', prompt: 'Į sąskaitą padėta 600 Eur. Metinė palūkanų norma yra 5 %. Kiek palūkanų bus gauta per vienus metus?', promptDisplay: 'Į sąskaitą padėta \\(600\\text{ Eur}\\). Metinė palūkanų norma yra \\(5\\%\\). Kiek palūkanų bus gauta per vienus metus?',
        answer: '30', answerType: 'number', inputLabel: 'Palūkanos', inputSuffix: 'Eur', placeholder: 'Įrašyk skaičių',
        hint: 'Rask 5 % nuo 600 Eur.'
      },
      {
        id: 'g7-10', type: 'choice', section: 'class', label: 'Nelygybės',
        title: 'Paprasta nelygybė', prompt: 'Kuris atsakymas yra nelygybės x + 4 > 9 sprendinys?', promptDisplay: 'Kuris atsakymas yra nelygybės \\(x+4>9\\) sprendinys?',
        choices: ['x > 5', 'x < 5', 'x ≥ 13', 'x > 13'],
        choicesDisplay: ['\\(x>5\\)', '\\(x<5\\)', '\\(x\\ge13\\)', '\\(x>13\\)'], answer: 'x > 5',
        hint: 'Iš abiejų nelygybės pusių atimk 4.'
      },
      {
        id: 'g7-11', type: 'choice', section: 'class', label: 'Nelygybės',
        title: 'Dalyba iš neigiamo skaičiaus', prompt: 'Išspręsk nelygybę: −3x ≤ 12', promptDisplay: 'Išspręsk nelygybę: \\(-3x\\le12\\)',
        choices: ['x ≤ −4', 'x ≥ −4', 'x ≤ 4', 'x ≥ 4'],
        choicesDisplay: ['\\(x\\le-4\\)', '\\(x\\ge-4\\)', '\\(x\\le4\\)', '\\(x\\ge4\\)'], answer: 'x ≥ −4',
        hint: 'Dalyjant nelygybę iš neigiamo skaičiaus, nelygybės ženklas apsiverčia.'
      },
      {
        id: 'g7-12', type: 'choice', section: 'class', label: 'Nelygybės',
        title: 'Dviguboji nelygybė ir intervalas', prompt: 'Kuris intervalas atitinka nelygybę −2 < x ≤ 5?', promptDisplay: 'Kuris intervalas atitinka nelygybę \\(-2<x\\le5\\)?',
        choices: ['[−2; 5]', '(−2; 5]', '(−2; 5)', '[−2; 5)'],
        choicesDisplay: ['\\([-2;5]\\)', '\\((-2;5]\\)', '\\((-2;5)\\)', '\\([-2;5)\\)'], answer: '(−2; 5]',
        hint: 'Ties −2 ženklas griežtas, todėl galas atviras; 5 priklauso sprendiniams.'
      },
      {
        id: 'g7-13', type: 'choice', section: 'class', label: 'Nelygybės',
        title: 'Nelygybių sistema', prompt: 'Kuris intervalas yra sistemos x ≥ 1 ir x < 4 sprendinių aibė?', promptDisplay: 'Kuris intervalas yra sistemos \\(x\\ge1\\) ir \\(x<4\\) sprendinių aibė?',
        choices: ['(1; 4)', '[1; 4)', '(1; 4]', '[1; 4]'],
        choicesDisplay: ['\\((1;4)\\)', '\\([1;4)\\)', '\\((1;4]\\)', '\\([1;4]\\)'], answer: '[1; 4)',
        hint: 'Reikia skaičių, kurie tenkina abi sąlygas vienu metu.'
      },
      {
        id: 'g7-14', type: 'choice', section: 'class', label: 'Nelygybės',
        title: 'Nelygybė su skliaustais', prompt: 'Išspręsk: 5 − 2x > −1', promptDisplay: 'Išspręsk: \\(5-2x>-1\\)',
        choices: ['x < 3', 'x > 3', 'x < −3', 'x > −3'],
        choicesDisplay: ['\\(x<3\\)', '\\(x>3\\)', '\\(x<-3\\)', '\\(x>-3\\)'], answer: 'x < 3',
        hint: 'Atėmus 5 gausi −2x > −6, tada nepamiršk ženklo pakeitimo.'
      },
      {
        id: 'g7-15', type: 'input', section: 'class', label: 'Proporcingumas',
        title: 'Tiesioginis proporcingumas', prompt: '6 kg obuolių kainuoja 15 Eur. Kiek kainuos 10 kg obuolių, jei kilogramo kaina nekinta?', promptDisplay: '\\(6\\text{ kg}\\) obuolių kainuoja \\(15\\text{ Eur}\\). Kiek kainuos \\(10\\text{ kg}\\) obuolių, jei kilogramo kaina nekinta?',
        answer: '25', answerType: 'number', inputLabel: 'Kaina', inputSuffix: 'Eur', placeholder: 'Įrašyk skaičių',
        hint: 'Pirmiausia rask 1 kg kainą.'
      },
      {
        id: 'g7-16', type: 'input', section: 'class', label: 'Proporcingumas',
        title: 'Atvirkštinis proporcingumas', prompt: '4 vienodai našūs darbininkai darbą atlieka per 15 valandų. Per kiek valandų tokį pat darbą atliktų 10 tokių darbininkų?', promptDisplay: '\\(4\\) vienodai našūs darbininkai darbą atlieka per \\(15\\) valandų. Per kiek valandų tokį pat darbą atliktų \\(10\\) tokių darbininkų?',
        answer: '6', answerType: 'number', inputLabel: 'Laikas', inputSuffix: 'val.', placeholder: 'Įrašyk skaičių',
        hint: 'Darbininkų skaičiaus ir laiko sandauga čia išlieka ta pati.'
      },
      {
        id: 'g7-17', type: 'input', section: 'class', label: 'Proporcingumas',
        title: 'Greitis ir laikas', prompt: 'Reikia nuvažiuoti 240 km. Jei vidutinis greitis 80 km/h, kiek valandų truks kelionė?', promptDisplay: 'Reikia nuvažiuoti \\(240\\text{ km}\\). Jei vidutinis greitis \\(80\\text{ km/h}\\), kiek valandų truks kelionė?',
        answer: '3', answerType: 'number', inputLabel: 'Laikas', inputSuffix: 'val.', placeholder: 'Įrašyk skaičių',
        hint: 'Esant pastoviam keliui, laikas = kelias : greitis.'
      },
      {
        id: 'g7-18', type: 'choice', section: 'class', label: 'Koordinatės',
        title: 'Lygiagretusis postūmis', prompt: 'Taškas A(−2; 5) perkeliamas pagal taisyklę (x; y) → (x + 3; y − 4). Kokios naujo taško koordinatės?', promptDisplay: 'Taškas \\(A(-2;5)\\) perkeliamas pagal taisyklę \\((x;y)\\to(x+3;y-4)\\). Kokios naujo taško koordinatės?',
        choices: ['(1; 1)', '(−5; 9)', '(1; 9)', '(−5; 1)'],
        choicesDisplay: ['\\((1;1)\\)', '\\((-5;9)\\)', '\\((1;9)\\)', '\\((-5;1)\\)'], answer: '(1; 1)',
        hint: 'Prie x koordinatės pridėk 3, iš y koordinatės atimk 4.'
      },
      {
        id: 'g7-19', type: 'choice', section: 'class', label: 'Koordinatės',
        title: 'Atkarpos vidurio taškas', prompt: 'Duoti taškai A(2; −1) ir B(8; 5). Kuris taškas yra atkarpos AB vidurys?', promptDisplay: 'Duoti taškai \\(A(2;-1)\\) ir \\(B(8;5)\\). Kuris taškas yra atkarpos \\(AB\\) vidurys?',
        choices: ['(5; 2)', '(6; 4)', '(3; 3)', '(10; 4)'],
        choicesDisplay: ['\\((5;2)\\)', '\\((6;4)\\)', '\\((3;3)\\)', '\\((10;4)\\)'], answer: '(5; 2)',
        hint: 'Vidurio taško koordinatės yra atitinkamų galų koordinačių vidurkiai.'
      },
      {
        id: 'g7-20', type: 'choice', section: 'class', label: 'Geometrija',
        title: 'Trikampio elementai', prompt: 'Kaip vadinama atkarpa, nubrėžta iš trikampio viršūnės statmenai priešingai kraštinei arba jos tęsiniui?',
        choices: ['Pusiaukampinė', 'Pusiaukraštinė', 'Aukštinė', 'Vidurio linija'], answer: 'Aukštinė',
        hint: 'Svarbiausias žodis sąlygoje – „statmenai“.'
      },
      {
        id: 'g7-21', type: 'input', section: 'self', label: 'Geometrija',
        title: 'Lygiagrečios tiesės', prompt: 'Dvi lygiagrečias tieses kerta trečioji tiesė. Vienas iš atitinkamųjų kampų yra 68°. Koks kitas atitinkamasis kampas?', promptDisplay: 'Dvi lygiagrečias tieses kerta trečioji tiesė. Vienas iš atitinkamųjų kampų yra \\(68^\\circ\\). Koks kitas atitinkamasis kampas?',
        answer: '68', answerType: 'number', inputLabel: 'Kampas', inputSuffix: '°', placeholder: 'Įrašyk skaičių',
        hint: 'Kai tiesės lygiagrečios, atitinkamieji kampai yra lygūs.'
      },
      {
        id: 'g7-22', type: 'choice', section: 'self', label: 'Geometrija',
        title: 'Keturkampių savybės', prompt: 'Kuris teiginys apie lygiagretainį visada teisingas?',
        choices: ['Visi kampai statūs', 'Visos kraštinės lygios', 'Priešingos kraštinės lygiagrečios ir lygios', 'Įstrižainės visada statmenos'], answer: 'Priešingos kraštinės lygiagrečios ir lygios',
        hint: 'Lygiagretainis yra bendresnė figūra negu stačiakampis ar rombas.'
      },
      {
        id: 'g7-23', type: 'input', section: 'self', label: 'Plotai',
        title: 'Trikampio plotas', prompt: 'Trikampio pagrindas 12 cm, o į tą pagrindą nubrėžtos aukštinės ilgis 7 cm. Rask plotą.', promptDisplay: 'Trikampio pagrindas \\(12\\text{ cm}\\), o į tą pagrindą nubrėžtos aukštinės ilgis \\(7\\text{ cm}\\). Rask plotą.',
        answer: '42', answerType: 'number', inputLabel: 'Plotas', inputSuffix: 'cm²', placeholder: 'Įrašyk skaičių',
        hint: 'Trikampio plotas yra pusė pagrindo ir aukštinės sandaugos.'
      },
      {
        id: 'g7-24', type: 'input', section: 'self', label: 'Plotai',
        title: 'Lygiagretainio plotas', prompt: 'Lygiagretainio pagrindas yra 9 cm, o aukštinė į tą pagrindą – 6 cm. Rask plotą.', promptDisplay: 'Lygiagretainio pagrindas yra \\(9\\text{ cm}\\), o aukštinė į tą pagrindą – \\(6\\text{ cm}\\). Rask plotą.',
        answer: '54', answerType: 'number', inputLabel: 'Plotas', inputSuffix: 'cm²', placeholder: 'Įrašyk skaičių',
        hint: 'Lygiagretainio plotas = pagrindas · aukštinė.'
      },
      {
        id: 'g7-25', type: 'input', section: 'self', label: 'Plotai',
        title: 'Trapecijos plotas', prompt: 'Trapecijos pagrindai yra 8 cm ir 14 cm, aukštinė 5 cm. Rask plotą.', promptDisplay: 'Trapecijos pagrindai yra \\(8\\text{ cm}\\) ir \\(14\\text{ cm}\\), aukštinė \\(5\\text{ cm}\\). Rask plotą.',
        answer: '55', answerType: 'number', inputLabel: 'Plotas', inputSuffix: 'cm²', placeholder: 'Įrašyk skaičių',
        hint: 'Sudėk pagrindus, padaugink iš aukštinės ir padalink iš 2.'
      },
      {
        id: 'g7-26', type: 'choice', section: 'self', label: 'Apskritimas',
        title: 'Apskritimo ilgis ir skritulio plotas', prompt: 'Skritulio spindulys yra 5 cm. Imk π ≈ 3,14. Kuri apskritimo ilgio C ir skritulio ploto S pora teisinga?', promptDisplay: 'Skritulio spindulys yra \\(5\\text{ cm}\\). Imk \\(\\pi\\approx3{,}14\\). Kuri apskritimo ilgio \\(C\\) ir skritulio ploto \\(S\\) pora teisinga?',
        choices: ['C = 31,4 cm; S = 78,5 cm²', 'C = 15,7 cm; S = 31,4 cm²', 'C = 78,5 cm; S = 31,4 cm²', 'C = 10 cm; S = 25 cm²'],
        choicesDisplay: ['\\(C=31{,}4\\text{ cm};\\ S=78{,}5\\text{ cm}^2\\)', '\\(C=15{,}7\\text{ cm};\\ S=31{,}4\\text{ cm}^2\\)', '\\(C=78{,}5\\text{ cm};\\ S=31{,}4\\text{ cm}^2\\)', '\\(C=10\\text{ cm};\\ S=25\\text{ cm}^2\\)'], answer: 'C = 31,4 cm; S = 78,5 cm²',
        hint: 'Naudok C = 2πr ir S = πr².'
      },
      {
        id: 'g7-27', type: 'input', section: 'self', label: 'Erdvės figūros',
        title: 'Ritinio tūris', prompt: 'Ritinio pagrindo spindulys 3 cm, aukštis 4 cm. Imk π ≈ 3,14. Rask ritinio tūrį.', promptDisplay: 'Ritinio pagrindo spindulys \\(3\\text{ cm}\\), aukštis \\(4\\text{ cm}\\). Imk \\(\\pi\\approx3{,}14\\). Rask ritinio tūrį.',
        answer: '113,04', acceptedAnswers: ['113,04', '113.04'], answerType: 'number', inputLabel: 'Tūris', inputSuffix: 'cm³', placeholder: 'Įrašyk skaičių',
        hint: 'Ritinio tūris V = πr²h.'
      },
      {
        id: 'g7-28', type: 'choice', section: 'self', label: 'Duomenys',
        title: 'Populiacija ir imtis', prompt: 'Mokykloje mokosi 600 mokinių. Apklausai atsitiktinai pasirinkti 60 mokinių. Kas šioje situacijoje yra imtis?',
        choices: ['Visi 600 mokinių', 'Pasirinkti 60 mokinių', 'Tik apklausą atlikęs mokytojas', 'Visos Lietuvos mokiniai'], answer: 'Pasirinkti 60 mokinių',
        hint: 'Imtis – tai populiacijos dalis, iš kurios renkami duomenys.'
      },
      {
        id: 'g7-29', type: 'choice', section: 'self', label: 'Duomenys',
        title: 'Reprezentatyvi imtis', prompt: 'Norima sužinoti visos mokyklos mokinių nuomonę apie valgyklą. Kuris atrankos būdas tinkamiausias?',
        choices: ['Apklausti tik krepšinio komandos narius', 'Apklausti tik 7A klasę', 'Atsitiktinai parinkti mokinių iš skirtingų klasių', 'Apklausti tik pirmus 30 atėjusių į valgyklą'], answer: 'Atsitiktinai parinkti mokinių iš skirtingų klasių',
        hint: 'Gera imtis turėtų kuo geriau atspindėti visą tiriamą populiaciją.'
      },
      {
        id: 'g7-30', type: 'input', section: 'self', label: 'Duomenys',
        title: 'Skritulinė diagrama', prompt: 'Apklausoje 18 iš 60 mokinių pasirinko variantą A. Kokio dydžio kampas skritulinėje diagramoje turi vaizduoti šią dalį?', promptDisplay: 'Apklausoje \\(18\\) iš \\(60\\) mokinių pasirinko variantą A. Kokio dydžio kampas skritulinėje diagramoje turi vaizduoti šią dalį?',
        answer: '108', answerType: 'number', inputLabel: 'Kampas', inputSuffix: '°', placeholder: 'Įrašyk skaičių',
        hint: '18/60 = 30 %, o visas skritulys yra 360°.'
      }
    ]
  });

  const LESSON_CATALOG = Object.freeze([DEMO_LESSON, GRADE5_REVIEW_LESSON, GRADE7_REVIEW_LESSON]);

  let assignment = null;
  let pendingAttemptPolicy = { defaultMaxAttempts: 3, taskMaxAttempts: {} };
  let progress = null;
  let selectedAnswers = {};

  // P2-SPLIT-P2.5-P2: mokinys yra ilgalaikis objektas, o Room – tik vienos
  // konkrečios pamokos lenta. Čia laikome tik mokytojo mokinių indekso kopiją;
  // tikrasis įrašymas vyksta online-sync.js, atskirai nuo p772Rooms.
  let studentsModal = null;
  let scheduleModal = null;
  let editingScheduleId = '';
  let scheduleCreateMode = false;
  let scheduleSelectedDay = 0;
  let selectedStudentId = null;
  let studentDbSnapshotTimer = null;
  let teacherStudentDb = { profileId: '', meta: {}, students: {}, roomLinks: {}, classSessions: {}, scheduleEntries: {}, scheduleRuns: {} };
  let roomStudentProfile = null;
  let lessonStudentTabs = null;
  let roomSwitching = false;

  function lessonForId(lessonId) {
    const id = String(lessonId || '').trim();
    return LESSON_CATALOG.find(lesson => lesson.id === id) || null;
  }

  function contentHash(value) {
    const text = JSON.stringify(value ?? null);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `fnv1a-${hash.toString(16).padStart(8, '0')}`;
  }

  function lessonContentSnapshot(lesson) {
    if (!lesson) return null;
    const snapshot = {
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      lessonId: String(lesson.id || ''),
      contentVersion: Math.max(1, Math.round(Number(lesson.contentVersion) || 1)),
      title: String(lesson.title || ''),
      shortTitle: String(lesson.shortTitle || lesson.title || ''),
      description: String(lesson.description || ''),
      taskCount: Math.max(0, Number(lesson.taskCount) || 0),
      classCount: Math.max(0, Number(lesson.classCount) || 0),
      selfCount: Math.max(0, Number(lesson.selfCount) || 0),
      taskIds: Array.isArray(lesson.tasks) ? lesson.tasks.map(task => String(task?.id || '')).filter(Boolean) : [],
      tasks: Array.isArray(lesson.tasks) ? JSON.parse(JSON.stringify(lesson.tasks)) : []
    };
    snapshot.contentHash = contentHash(snapshot);
    return snapshot;
  }

  function assignmentContentDetail(lesson) {
    const snapshot = lessonContentSnapshot(lesson);
    return snapshot ? {
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      contentVersion: snapshot.contentVersion,
      contentHash: snapshot.contentHash,
      taskIds: snapshot.taskIds,
      contentSnapshot: snapshot
    } : { schemaVersion: P2_DATA_SCHEMA_VERSION };
  }

  // P1.7.3.1: senų, dar iki turinio versijavimo pradėtų priskyrimų backfill.
  // Čia tik paruošiame katalogo metaduomenis; realų Firebase įrašymą ir
  // saugumo patikras atlieka online-sync.js. Vieną Room per puslapio sesiją
  // siunčiame daugiausia vieną kartą, kad profile onValue nesukeltų ciklo.
  const legacyAssignmentBackfillQueuedRooms = new Set();

  function queueLegacyAssignmentBackfills() {
    if (role() !== 'teacher') return;
    for (const [studentId, student] of Object.entries(teacherStudentDb.students || {})) {
      const lessons = student?.lessons && typeof student.lessons === 'object' ? student.lessons : {};
      for (const [roomId, recordRaw] of Object.entries(lessons)) {
        const record = recordRaw && typeof recordRaw === 'object' ? recordRaw : {};
        const lesson = lessonForId(record.lessonId);
        if (!lesson) continue;
        const linkedStudentId = String(teacherStudentDb.roomLinks?.[roomId]?.studentId || '').trim();
        if (linkedStudentId && linkedStudentId !== studentId) continue;
        const currentKey = String(record.currentAssignmentKey || record.assignmentKey || '').trim();
        const archived = currentKey && record.assignments && typeof record.assignments === 'object'
          ? record.assignments[currentKey]
          : null;
        const missingMetadata = !record.schemaVersion
          || !currentKey
          || !record.contentVersion
          || !record.contentHash
          || !Array.isArray(record.taskIds)
          || !record.taskIds.length
          || !archived
          || typeof archived !== 'object'
          || !archived.contentSnapshot;
        if (!missingMetadata || legacyAssignmentBackfillQueuedRooms.has(roomId)) continue;
        legacyAssignmentBackfillQueuedRooms.add(roomId);
        window.dispatchEvent(new CustomEvent('p2:students-request', {
          detail: {
            action: 'backfill-legacy-assignment',
            studentId,
            roomId,
            lessonId: lesson.id,
            title: record.title || lesson.shortTitle || lesson.title,
            taskCount: Number(record.taskCount || lesson.taskCount) || lesson.taskCount,
            assignedAt: Number(record.createdAt || 0) || null,
            summary: record.summary && typeof record.summary === 'object' ? record.summary : null,
            ...assignmentContentDetail(lesson)
          }
        }));
      }
    }
  }

  function activeLesson() {
    return lessonForId(assignment?.lessonId) || DEMO_LESSON;
  }

  function isSimpleInputTask(task) {
    return task?.type === 'input' || task?.response?.renderer === 'simple-input';
  }

  function parseLocalizedNumber(value) {
    const normalized = String(value ?? '')
      .trim()
      .replace(/\s+/g, '')
      .replace(',', '.')
      .replace(/−/g, '-');
    if (!normalized || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
    return Number(normalized);
  }

  function simpleAnswerMatches(task, value) {
    const candidates = Array.isArray(task?.acceptedAnswers) && task.acceptedAnswers.length
      ? task.acceptedAnswers
      : [task?.answer];
    if (task?.answerType === 'number') {
      const actual = parseLocalizedNumber(value);
      if (!Number.isFinite(actual)) return false;
      return candidates.some(candidate => {
        const expected = parseLocalizedNumber(candidate);
        return Number.isFinite(expected) && Math.abs(actual - expected) < 1e-9;
      });
    }
    const normalize = source => String(source ?? '').trim().toLocaleLowerCase('lt-LT').replace(/\s+/g, ' ');
    const actual = normalize(value);
    return Boolean(actual) && candidates.some(candidate => actual === normalize(candidate));
  }

  let libraryModal = null;
  let teacherPreviewWindow = null;
  // Mokytojo pratybų peržiūra yra lokali: ji NIEKADA nekeičia mokinio aktyvios užduoties.
  let teacherPreviewTaskId = null;
  let teacherFollowStudent = true;
  let teacherPreviewMode = 'closed'; // closed | docked | minimized | maximized
  let teacherPreviewRestoreMode = 'docked';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }

  // Leidžia paprastame sąlygos tekste naudoti LaTeX fragmentus tarp \( ... \).
  // Sąlygose matematika yra tik rodoma, todėl naudojame MathLive statinį
  // <math-span>, o ne redagavimui skirtą <math-field>. Taip formulė tampa
  // natūralia tos pačios teksto eilutės dalimi ir neatsineša įvedimo lauko geometrijos.
  function renderRichMathText(value) {
    const source = String(value ?? '');
    const re = /\\\(([\s\S]*?)\\\)/g;
    let html = '';
    let cursor = 0;
    let match;
    while ((match = re.exec(source))) {
      html += escapeHtml(source.slice(cursor, match.index));

      const mathEnd = match.index + match[0].length;
      const afterMath = source.slice(mathEnd);
      // Skyrybos ženklas turi jungtis prie formulės kaip prie paprasto teksto.
      // Toleruojame ir netyčia tarp \(...\) bei skyrybos paliktus tarpus.
      const punctuation = afterMath.match(/^(\s*)([.,:;?!…])/u);
      html += `<math-span class="p2-inline-math" mode="textstyle">${escapeHtml(match[1])}</math-span>`;

      cursor = mathEnd + (punctuation ? punctuation[1].length : 0);
    }
    html += escapeHtml(source.slice(cursor));
    return html;
  }

  function taskDisplayPrompt(task) {
    return task?.promptDisplay || task?.prompt || '';
  }

  function taskDisplayChoice(task, index, fallback) {
    const displays = Array.isArray(task?.choicesDisplay) ? task.choicesDisplay : [];
    return displays[index] ?? fallback ?? '';
  }

  const practiceEngine = window.P772PracticeEngine || null;
  const liveSolutionTimers = new Map();
  let solutionFocusRequest = null;
  let activeSolutionStep = { taskId: null, index: 0 };
  let branchGroupSequence = 0;
  function createBranchGroupId(taskId = 'task') {
    branchGroupSequence += 1;
    return `branch-${String(taskId || 'task').replace(/[^a-z0-9_-]/gi, '-')}-${Date.now().toString(36)}-${branchGroupSequence}`;
  }

  function deepCopy(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function isSolutionTask(task) {
    return task?.type === 'solution' || task?.response?.renderer === 'math-step-list';
  }

  function isExpressionTask(task) {
    return task?.type === 'expression' || task?.response?.renderer === 'single-math-input';
  }

  function isValidatedMathTask(task) {
    return isSolutionTask(task) || isExpressionTask(task);
  }

  function emptySolutionResponse() {
    const step = practiceEngine?.createStep?.('equation', [''], [''])
      || { type: 'equation', values: [''], latexValues: [''] };
    return { steps: [step] };
  }

  function normalizeSolutionResponse(value) {
    const source = value && typeof value === 'object' ? value : {};
    const steps = practiceEngine?.normalizeSteps?.(source.steps)
      || (Array.isArray(source.steps) && source.steps.length ? source.steps : emptySolutionResponse().steps);
    return { steps: deepCopy(steps) };
  }

  function solutionResponseForItem(item) {
    return normalizeSolutionResponse(item?.liveSolution || item?.lastSolution || emptySolutionResponse());
  }

  function solutionSummary(response) {
    return normalizeSolutionResponse(response).steps
      .map(step => Array.isArray(step.values) ? step.values.filter(Boolean).join(' arba ') : '')
      .filter(Boolean)
      .join(' → ');
  }

  function solutionTaskForEngine(task) {
    return {
      id: task.id,
      title: task.title || 'Išspręsk lygtį',
      instruction: task.instruction || '',
      prompt: { kind: 'equation', value: task.prompt },
      response: deepCopy(task.response)
    };
  }

  function validateSolutionTask(task, response) {
    if (!practiceEngine?.validateTask) {
      return { status: 'incorrect', title: 'Tikrinimo variklis nepasiekiamas', message: 'Perkrauk puslapį ir bandyk dar kartą.', stepResults: [] };
    }
    return practiceEngine.validateTask(solutionTaskForEngine(task), normalizeSolutionResponse(response));
  }

  function emptyExpressionResponse() {
    return { answer: '', answerLatex: '' };
  }

  function normalizeExpressionResponse(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      answer: String(source.answer || ''),
      answerLatex: String(source.answerLatex || '')
    };
  }

  function expressionResponseForItem(item) {
    return normalizeExpressionResponse(item?.liveExpression || item?.lastExpression || emptyExpressionResponse());
  }

  function expressionTaskForEngine(task) {
    return {
      id: task.id,
      title: task.title || 'Suprastink reiškinį',
      instruction: task.instruction || '',
      prompt: { kind: 'expression', value: task.prompt },
      response: deepCopy(task.response)
    };
  }

  function validateExpressionTask(task, response) {
    if (!practiceEngine?.validateTask) {
      return { status: 'incorrect', title: 'Tikrinimo variklis nepasiekiamas', message: 'Perkrauk puslapį ir bandyk dar kartą.' };
    }
    return practiceEngine.validateTask(expressionTaskForEngine(task), normalizeExpressionResponse(response));
  }

  function comparableProgress(value) {
    const copy = deepCopy(value && typeof value === 'object' ? value : {});
    delete copy.updatedAt;
    delete copy.updatedBy;
    return JSON.stringify(copy);
  }

  function studentMathFieldActive() {
    return Boolean(studentPanel.querySelector('math-field.p2-solution-math-field:focus-within, math-field.p2-solution-math-field.math-field-is-active, math-field.p2-expression-math-field:focus-within, math-field.p2-expression-math-field.math-field-is-active, input[data-simple-input]:focus'));
  }

  function publishLiveProgress(next, taskId) {
    progress = normalizedProgress(next);
    progress.updatedAt = Date.now();
    const old = liveSolutionTimers.get(taskId);
    if (old) clearTimeout(old);
    liveSolutionTimers.set(taskId, setTimeout(() => {
      liveSolutionTimers.delete(taskId);
      window.dispatchEvent(new CustomEvent('p2:practice-progress-live-request', { detail: deepCopy(progress) }));
    }, 90));
  }

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }

  const prefs = readPrefs();
  let view = ['board', 'split', 'practice'].includes(prefs.view) ? prefs.view : 'split';
  let ratio = Number.isFinite(Number(prefs.ratio)) ? Number(prefs.ratio) : 55;
  ratio = Math.max(34, Math.min(72, ratio));

  function savePrefs() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, ratio })); } catch (_) {}
  }

  function role() {
    return body.dataset.onlineRole === 'student' ? 'student' : 'teacher';
  }

  function toast(text) {
    window.P772OnlineBridge?.showToast?.(text);
  }

  function applyRatio() {
    workspace.style.setProperty('--p2-split', `${ratio}%`);
  }

  function applyView(next, { persist = true } = {}) {
    view = ['board', 'split', 'practice'].includes(next) ? next : 'split';
    workspace.dataset.view = view;
    body.dataset.p2View = view;
    document.querySelectorAll('[data-p2-view]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.p2View === view));
    splitter.setAttribute('aria-hidden', view !== 'split' ? 'true' : 'false');
    if (persist) savePrefs();
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  document.querySelectorAll('[data-p2-view]').forEach(button => {
    button.addEventListener('click', () => applyView(button.dataset.p2View));
  });

  let drag = null;
  splitter.addEventListener('pointerdown', event => {
    if (view !== 'split') return;
    event.preventDefault();
    splitter.setPointerCapture?.(event.pointerId);
    drag = { pointerId: event.pointerId };
    body.classList.add('p2-resizing');
  });
  splitter.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = workspace.getBoundingClientRect();
    const stacked = matchMedia('(max-width: 900px)').matches;
    const raw = stacked ? ((event.clientY - rect.top) / rect.height * 100) : ((event.clientX - rect.left) / rect.width * 100);
    ratio = Math.max(34, Math.min(72, raw));
    applyRatio();
  });
  const endDrag = event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    body.classList.remove('p2-resizing');
    savePrefs();
    window.dispatchEvent(new Event('resize'));
  };
  splitter.addEventListener('pointerup', endDrag);
  splitter.addEventListener('pointercancel', endDrag);
  splitter.addEventListener('keydown', event => {
    if (view !== 'split') return;
    const stacked = matchMedia('(max-width: 900px)').matches;
    const dec = stacked ? 'ArrowUp' : 'ArrowLeft';
    const inc = stacked ? 'ArrowDown' : 'ArrowRight';
    if (![dec, inc].includes(event.key)) return;
    event.preventDefault();
    ratio = Math.max(34, Math.min(72, ratio + (event.key === inc ? 3 : -3)));
    applyRatio();
    savePrefs();
    window.dispatchEvent(new Event('resize'));
  });

  function emptyProgress() {
    return {
      assignmentId: activeLesson().id,
      status: 'not_started',
      currentTaskId: activeLesson().tasks[0].id,
      taskStates: {},
      startedAt: null,
      updatedAt: Date.now()
    };
  }

  function normalizedProgress(value) {
    const source = value && typeof value === 'object' ? value : {};
    const base = emptyProgress();
    const sourceAssignmentId = String(source.assignmentId || '').trim();
    if (sourceAssignmentId && sourceAssignmentId !== base.assignmentId) return base;
    const merged = {
      ...base,
      ...source,
      assignmentId: base.assignmentId,
      taskStates: source.taskStates && typeof source.taskStates === 'object' ? source.taskStates : {}
    };
    if (!activeLesson().tasks.some(task => task.id === merged.currentTaskId)) merged.currentTaskId = base.currentTaskId;
    return merged;
  }

  function normalizeAttemptLimit(value, fallback = 3) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    if (numeric === 0) return 0; // 0 = neribotai
    return Math.max(1, Math.min(9, Math.round(numeric)));
  }

  function normalizedAttemptPolicy(source = assignment) {
    const legacyDefault = source?.allowRetries === false ? 1 : 3;
    const raw = source?.attemptPolicy && typeof source.attemptPolicy === 'object' ? source.attemptPolicy : {};
    const defaultMaxAttempts = normalizeAttemptLimit(raw.defaultMaxAttempts, legacyDefault);
    const taskMaxAttempts = {};
    const rawOverrides = raw.taskMaxAttempts && typeof raw.taskMaxAttempts === 'object' ? raw.taskMaxAttempts : {};
    activeLesson().tasks.forEach(task => {
      if (!Object.prototype.hasOwnProperty.call(rawOverrides, task.id)) return;
      taskMaxAttempts[task.id] = normalizeAttemptLimit(rawOverrides[task.id], defaultMaxAttempts);
    });
    return { defaultMaxAttempts, taskMaxAttempts };
  }

  function attemptLimitForTask(taskId, source = assignment) {
    const policy = normalizedAttemptPolicy(source);
    return Object.prototype.hasOwnProperty.call(policy.taskMaxAttempts, taskId)
      ? policy.taskMaxAttempts[taskId]
      : policy.defaultMaxAttempts;
  }

  function attemptLimitLabel(limit) {
    return Number(limit) === 0 ? '∞' : String(limit);
  }

  function attemptUsageLabel(item, taskId) {
    const used = Number(item?.attempts || 0);
    const max = attemptLimitForTask(taskId);
    return max === 0 ? `${used} band.` : `${used} / ${max} band.`;
  }

  function attemptsRemaining(item, taskId) {
    const max = attemptLimitForTask(taskId);
    if (max === 0) return Infinity;
    return Math.max(0, max - Number(item?.attempts || 0));
  }

  function isTaskExhausted(item, taskId) {
    if (item?.solved) return false;
    const max = attemptLimitForTask(taskId);
    return max > 0 && Number(item?.attempts || 0) >= max;
  }

  function policySummary(source = assignment) {
    const policy = normalizedAttemptPolicy(source);
    const overrides = Object.keys(policy.taskMaxAttempts).length;
    const base = policy.defaultMaxAttempts === 0 ? 'Neribotai visoms' : `${policy.defaultMaxAttempts} band. pagal nutylėjimą`;
    return overrides ? `${base} · ${overrides} individualūs` : base;
  }

  function currentTask() {
    const state = normalizedProgress(progress);
    return activeLesson().tasks.find(task => task.id === state.currentTaskId) || activeLesson().tasks[0];
  }

  function baseTaskState() {
    return { attempts: 0, wrongAttempts: 0, hintUsed: false, solved: false, status: 'pending', lastAnswer: '' };
  }

  function typedTaskState(taskId) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    const raw = normalizedProgress(progress).taskStates[taskId] || baseTaskState();
    // P2.1 c1 anksčiau buvo testinis klausimas. Jei kambaryje liko seno prototipo
    // A/B/C/D būsena, jos nelaikome naujos sprendžiamos lygties rezultatu.
    if (isSolutionTask(task) && !raw.liveSolution && !raw.lastSolution && (raw.liveAnswer || raw.lastAnswer || raw.solved)) {
      return { ...baseTaskState(), openedAt: raw.openedAt || null };
    }
    // P2.2 c2 anksčiau buvo A/B/C/D klausimas. Senas pasirinkimas negali būti
    // interpretuojamas kaip naujos reiškinio užduoties atsakymas.
    if (isExpressionTask(task) && !raw.liveExpression && !raw.lastExpression && (raw.liveAnswer || raw.lastAnswer || raw.solved)) {
      return { ...baseTaskState(), openedAt: raw.openedAt || null };
    }
    return raw;
  }

  function currentTaskState() {
    return typedTaskState(currentTask().id);
  }

  function taskState(taskId) {
    return typedTaskState(taskId);
  }

  function progressStats() {
    const state = normalizedProgress(progress);
    let solved = 0, good = 0, help = 0, repeat = 0;
    activeLesson().tasks.forEach(task => {
      const item = taskState(task.id);
      if (item.solved) solved += 1;
      if (item.solved) {
        if (item.hintUsed || Number(item.attempts || 0) > 1 || item.status === 'help') help += 1;
        else good += 1;
      } else if (isTaskExhausted(item, task.id)) {
        repeat += 1;
      }
    });
    const finished = solved + repeat;
    return { solved, finished, good, help, repeat, percent: Math.round((finished / activeLesson().taskCount) * 100) };
  }

  function pedagogicalStatus(item, options = {}) {
    const state = item || {};
    const taskId = options.taskId || null;
    if (state.solved) {
      if (state.hintUsed) return { key: 'help', label: 'Su pagalba' };
      if (Number(state.attempts || 0) > 1) return { key: 'help', label: 'Po kelių bandymų' };
      if (state.status === 'help') return { key: 'help', label: 'Su pagalba' };
      return { key: 'good', label: 'Savarankiškai' };
    }
    if (taskId && isTaskExhausted(state, taskId)) return { key: 'repeat', label: 'Kartoti' };
    if (options.current) return { key: 'working', label: 'Vykdoma' };
    if (state.openedAt || Number(state.attempts || 0) > 0) return { key: 'started', label: 'Pradėta' };
    return { key: 'pending', label: 'Nepradėta' };
  }


  function markTaskOpened(next, taskId) {
    if (!taskId) return next;
    const previous = (next.taskStates && next.taskStates[taskId]) || taskState(taskId);
    if (previous.solved || previous.openedAt) return next;
    next.taskStates = { ...next.taskStates, [taskId]: { ...previous, openedAt: Date.now() } };
    return next;
  }

  function publishProgress(next, options = {}) {
    progress = normalizedProgress(next);
    progress.updatedAt = Date.now();
    window.dispatchEvent(new CustomEvent('p2:practice-progress-request', { detail: progress }));
    if (options.render !== false) renderPanels();
  }

  function taskIndex(taskId) {
    return Math.max(0, activeLesson().tasks.findIndex(task => task.id === taskId));
  }

  function nextTaskId(taskId) {
    const index = taskIndex(taskId);
    return activeLesson().tasks[Math.min(activeLesson().tasks.length - 1, index + 1)].id;
  }

  function previousTaskId(taskId) {
    const index = taskIndex(taskId);
    return activeLesson().tasks[Math.max(0, index - 1)].id;
  }

  function sectionForCurrentTask() {
    return currentTask().section;
  }

  function statusLabel(state) {
    if (!state) return 'Nepradėta';
    if (state.status === 'completed') return 'Atlikta';
    if (state.status === 'in_progress') return 'Vykdoma';
    return 'Nepradėta';
  }

  function renderStudentPanel() {
    const stats = progressStats();
    if (!assignment) {
      studentPanel.innerHTML = `
        <div class="p2-student-hero">
          <div class="p2-student-hero-icon" aria-hidden="true">∑</div>
          <div class="p2-student-hero-copy"><span class="p2-label">Mano pratybos</span><h3>Čia atsiras mokytojo priskirtos pratybos</h3><p>Pratybos veiks atskirai nuo bendros lentos, todėl galėsi spręsti savo tempu, o lenta liks bendra darbo erdvė.</p></div>
          <span class="p2-count-badge">0</span>
        </div>
        <div class="p2-empty-card p2-practice-empty">
          <div class="p2-empty-illustration" aria-hidden="true"><span>f(x)</span><i></i></div>
          <strong>Kol kas nėra priskirtų pratybų</strong>
          <p>Kai mokytojas priskirs pratybas, jos atsiras čia. Tada galėsi jas atidaryti „Padalintame“ arba „Tik pratybos“ vaizde.</p>
        </div>
        ${studentProgressSummary(stats)}
      `;
      return;
    }

    const state = normalizedProgress(progress);
    if (state.status === 'not_started') {
      studentPanel.innerHTML = `
        <article class="p2-assigned-lesson-card">
          <div class="p2-assigned-lesson-icon" aria-hidden="true">ƒ</div>
          <div class="p2-assigned-lesson-copy">
            <span class="p2-label">Priskirtos pratybos</span>
            <h3>${escapeHtml(activeLesson().title)}</h3>
            <p>${escapeHtml(activeLesson().description)}</p>
            <div class="p2-assignment-meta"><span>${activeLesson().classCount} pamokoje</span><span>${activeLesson().selfCount} savarankiškai</span><span>${activeLesson().taskCount} užduotys</span></div>
          </div>
          <span class="p2-status-badge is-new">Nepradėta</span>
          <button class="p2-primary p2-open-assignment" type="button" data-action="open-assignment">Atidaryti</button>
        </article>
        ${studentProgressSummary(stats)}
      `;
      bindStudentActions();
      return;
    }

    studentPanel.innerHTML = studentPracticeMarkup(state, stats);
    bindStudentActions();
  }

  function studentProgressSummary(stats) {
    const progressBadge = assignment
      ? `<span class="p2-soft-pill">${stats.finished} / ${activeLesson().taskCount}</span>`
      : '';
    return `
      <section class="p2-mini-section" aria-label="Mano pažanga">
        <header><div><span class="p2-label">Mano pažanga</span><h3>Ši pamoka</h3></div>${progressBadge}</header>
        <div class="p2-student-progress">
          <div><span>Savarankiškai</span><strong>${stats.good}</strong></div>
          <div><span>Su pagalba / taisant</span><strong>${stats.help}</strong></div>
          <div><span>Kartoti</span><strong>${stats.repeat}</strong></div>
        </div>
      </section>`;
  }

  function taskFeedbackMarkup(task, item, { teacher = false } = {}) {
    const maxAttempts = attemptLimitForTask(task.id);
    const exhausted = isTaskExhausted(item, task.id);
    const remaining = attemptsRemaining(item, task.id);
    const extraClass = teacher ? ' p2-teacher-student-feedback' : '';

    if (item.solved) {
      if (item.hintUsed) {
        return `<div class="p2-practice-feedback is-warning${extraClass}">✓ Teisingai${Number(item.attempts || 0) > 1 ? ' su pagalba ir po kelių bandymų' : ' su pagalba'}.</div>`;
      }
      if (Number(item.attempts || 0) > 1) {
        return `<div class="p2-practice-feedback is-warning${extraClass}">✓ Teisingai po kelių bandymų.</div>`;
      }
      return `<div class="p2-practice-feedback is-success${extraClass}">✓ Teisingai. Gali tęsti.</div>`;
    }

    if (exhausted) {
      return `<div class="p2-practice-feedback is-repeat${extraClass}">Išnaudoti visi ${maxAttempts} ${maxAttempts === 1 ? 'bandymas' : 'bandymai'}. Užduotis pažymėta „Kartoti“.</div>`;
    }

    if (Number(item.attempts || 0) > 0) {
      const result = isValidatedMathTask(task) ? item.validationResult : null;
      const detail = result?.message ? `<span>${escapeHtml(result.message)}</span>` : '';
      const title = result?.title ? escapeHtml(result.title) : 'Dar ne.';
      return `<div class="p2-practice-feedback is-warning${extraClass}"><strong>${title}</strong>${detail}<small>${remaining === Infinity ? 'Bandymų skaičius neribojamas.' : `Liko ${remaining} ${remaining === 1 ? 'bandymas' : 'bandymai'}.`}</small></div>`;
    }
    return '';
  }

  function solutionEditorMarkup(task, item) {
    const response = solutionResponseForItem(item);
    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    const stepResults = Array.isArray(item.validationResult?.stepResults) ? item.validationResult.stepResults : [];
    // P2.4.1: vieninga sprendimo lapo sistema taikoma VISOMS sprendimo eigos užduotims.
    // Tiesinė ir kvadratinė lygtis naudoja tą pačią Įprasta / Šakos / Atsakymas juostą;
    // skirtumas lieka tik matematiniame validatoriuje, ne mokinio sąsajoje.
    const structuredModes = true;
    const activeIndex = activeSolutionStep.taskId === task.id
      ? Math.max(0, Math.min(response.steps.length - 1, Number(activeSolutionStep.index || 0)))
      : 0;
    const activeStep = response.steps[activeIndex] || response.steps[0] || { type: 'equation' };

    const rows = response.steps.map((rawStep, index) => {
      const step = practiceEngine?.createStep?.(
        rawStep?.type || 'equation',
        rawStep?.values || [''],
        rawStep?.latexValues || [''],
        { branchGroupId: rawStep?.branchGroupId }
      ) || rawStep;
      const result = stepResults[index] || null;
      const resultClass = result?.status === 'correct' ? ' is-correct' : result?.status === 'incorrect' ? ' is-error' : result?.status === 'warning' ? ' is-warning' : '';
      const stateMark = result?.status === 'correct' ? '✓' : result?.status === 'incorrect' ? '×' : result?.status === 'warning' ? '!' : '';
      const groupId = step.type === 'alternatives' ? String(step.branchGroupId || '') : '';
      const previous = response.steps[index - 1];
      const next = response.steps[index + 1];
      const previousSameGroup = Boolean(groupId && previous?.type === 'alternatives' && previous?.branchGroupId === groupId);
      const nextSameGroup = Boolean(groupId && next?.type === 'alternatives' && next?.branchGroupId === groupId);
      const groupClass = step.type === 'alternatives' && groupId
        ? ` is-branch-group-${previousSameGroup ? (nextSameGroup ? 'middle' : 'end') : (nextSameGroup ? 'start' : 'single')}`
        : '';
      const continuationClass = step.values?.some(value => String(value || '').trim().startsWith('=')) ? ' is-continuation-line' : '';
      const separatorLabel = previousSameGroup ? '' : 'arba';
      const fields = step.type === 'alternatives'
        ? `<div class="p2-solution-branches p2-paper-branches">
            <div class="p2-solution-field-host" data-solution-field="${index}" data-solution-branch="0"></div>
            <span class="p2-solution-branch-separator" aria-hidden="true">${separatorLabel}</span>
            <div class="p2-solution-field-host" data-solution-field="${index}" data-solution-branch="1"></div>
          </div>`
        : `<div class="p2-solution-single-field ${step.type === 'solution-set' ? 'is-answer' : ''}">
            ${step.type === 'solution-set' ? '<span class="p2-solution-answer-prefix">Ats.:</span>' : ''}
            <div class="p2-solution-field-host" data-solution-field="${index}" data-solution-branch="0"></div>
          </div>`;

      return `
        <div class="p2-solution-step p2-paper-step${resultClass}${groupClass}${continuationClass}" data-solution-step="${index}" data-solution-step-type="${escapeHtml(step.type || 'equation')}"${groupId ? ` data-branch-group="${escapeHtml(groupId)}"` : ''}>
          <div class="p2-solution-step-main">
            ${fields}
            <p class="p2-solution-step-message">${result?.message ? escapeHtml(result.message) : ''}</p>
          </div>
          <span class="p2-solution-step-state" aria-hidden="true">${stateMark}</span>
          <button type="button" class="p2-solution-remove p2-paper-remove" data-solution-remove="${index}" aria-label="Pašalinti ${index + 1} eilutę" ${locked || response.steps.length <= 1 ? 'disabled' : ''}>×</button>
        </div>`;
    }).join('');

    const typeToolbar = structuredModes ? `
      <div class="p2-solution-type-toolbar" data-solution-toolbar data-active-step="${activeIndex}">
        <span class="p2-solution-type-label">Eilutės tipas</span>
        <div class="p2-solution-type-options" role="group" aria-label="Aktyvios sprendimo eilutės tipas">
          <button type="button" class="${activeStep.type === 'equation' ? 'is-active' : ''}" data-solution-toolbar-type="equation" ${locked ? 'disabled' : ''}>Įprasta</button>
          <button type="button" class="${activeStep.type === 'alternatives' ? 'is-active' : ''}" data-solution-toolbar-type="alternatives" ${locked ? 'disabled' : ''}>Šakos</button>
          <button type="button" class="${activeStep.type === 'solution-set' ? 'is-active' : ''}" data-solution-toolbar-type="solution-set" ${locked ? 'disabled' : ''}>Atsakymas</button>
        </div>
      </div>` : '';

    return `
      <section class="p2-solution-editor p2-solution-paper ${locked ? 'is-locked' : ''}">
        <header class="p2-solution-editor-head p2-solution-paper-head">
          <div><span>Sprendimas</span><small>${structuredModes ? 'Rašyk kaip lape. Eilutės paskirtį keisk tik tada, kai jos reikia.' : 'Rašyk po vieną sprendimo žingsnį eilutėje.'}</small></div>
          <span><kbd>Enter</kbd> – nauja eilutė; šakoje – tos pačios šakos tęsinys</span>
        </header>
        ${typeToolbar}
        <div class="p2-solution-steps p2-solution-paper-lines">${rows}</div>
        <div class="p2-solution-editor-actions p2-solution-paper-actions">
          <button type="button" class="p2-paper-add-line" data-action="add-solution-step" ${locked ? 'disabled' : ''}>＋ Eilutė</button>
        </div>
      </section>`;
  }

  function expressionEditorMarkup(task, item) {
    const response = expressionResponseForItem(item);
    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    const result = item.validationResult || null;
    const stateClass = result?.status === 'correct' ? ' is-correct' : result?.status === 'incorrect' ? ' is-error' : result?.status === 'warning' ? ' is-warning' : '';
    const stateMark = result?.status === 'correct' ? '✓' : result?.status === 'incorrect' ? '×' : result?.status === 'warning' ? '!' : '';
    return `
      <section class="p2-expression-editor${stateClass} ${locked ? 'is-locked' : ''}">
        <header class="p2-expression-editor-head">
          <div><span>${escapeHtml(task.response?.label || 'Atsakymas')}</span><small>Įrašyk matematinį reiškinį. Tikrinama matematinė lygybė, ne teksto sutapimas.</small></div>
          <b class="p2-expression-state" aria-hidden="true">${stateMark}</b>
        </header>
        <div class="p2-expression-field-host" data-expression-field></div>
        ${result?.message ? `<p class="p2-expression-message">${escapeHtml(result.message)}</p>` : ''}
      </section>`;
  }

  function updateLiveExpression(task, plain, latex) {
    const next = normalizedProgress(progress);
    const previous = taskState(task.id);
    const response = { answer: plain, answerLatex: latex };
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [task.id]: {
        ...previous,
        liveExpression: response,
        expressionUpdatedAt: Date.now(),
        validationResult: null
      }
    };
    publishLiveProgress(next, task.id);
  }

  function hydrateStudentExpressionEditor() {
    const task = currentTask();
    if (!isExpressionTask(task)) return;
    const item = currentTaskState();
    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    const response = expressionResponseForItem(item);
    const host = studentPanel.querySelector('[data-expression-field]');
    if (!host) return;
    if (!practiceEngine?.createMathField) {
      host.textContent = response.answer || '';
      return;
    }
    const field = practiceEngine.createMathField({
      source: response.answer,
      latexSource: response.answerLatex,
      kind: 'expression',
      fieldKey: `p2:${task.id}:expression`,
      testid: 'p2-expression-input',
      placeholder: task.response?.placeholder || 'Įrašyk reiškinį',
      contextLabel: 'P2 pratybų reiškinio atsakymas',
      onCommit: (plain, latex) => updateLiveExpression(task, plain, latex)
    });
    field.classList.add('p2-expression-math-field');
    if (locked) {
      field.setAttribute('read-only', '');
      field.setAttribute('disabled', '');
    }
    host.replaceChildren(field);
  }

  function studentPracticeMarkup(state, stats) {
    const task = currentTask();
    const item = currentTaskState();
    const solutionTask = isSolutionTask(task);
    const expressionTask = isExpressionTask(task);
    const simpleInputTask = isSimpleInputTask(task);
    const selected = (solutionTask || expressionTask || simpleInputTask) ? '' : (selectedAnswers[task.id] ?? item.liveAnswer ?? item.lastAnswer ?? '');
    const simpleValue = simpleInputTask ? String(selectedAnswers[task.id] ?? item.liveAnswer ?? item.lastAnswer ?? '') : '';
    const taskNumber = taskIndex(task.id) + 1;
    const exhausted = isTaskExhausted(item, task.id);
    const feedback = taskFeedbackMarkup(task, item);
    const hint = item.hintUsed ? `<div class="p2-hint-box"><strong>Užuomina</strong><span>${escapeHtml(task.hint)}</span></div>` : '';

    const answerMarkup = solutionTask
      ? solutionEditorMarkup(task, item)
      : expressionTask
        ? expressionEditorMarkup(task, item)
        : simpleInputTask
          ? `<div class="p2-simple-answer">
              <label for="p2-simple-input-${escapeHtml(task.id)}">${escapeHtml(task.inputLabel || 'Atsakymas')}</label>
              <div class="p2-simple-answer-field">
                <input id="p2-simple-input-${escapeHtml(task.id)}" data-simple-input="${escapeHtml(task.id)}" type="text" inputmode="${task.answerType === 'number' ? 'decimal' : 'text'}" autocomplete="off" spellcheck="false" value="${escapeHtml(simpleValue)}" placeholder="${escapeHtml(task.placeholder || 'Įrašyk atsakymą')}" ${(item.solved || exhausted) ? 'disabled' : ''}>
                ${task.inputSuffix ? `<span>${escapeHtml(task.inputSuffix)}</span>` : ''}
              </div>
            </div>`
          : `<div class="p2-choice-list">${(Array.isArray(task.choices) ? task.choices : []).map((choice, index) => {
              const active = selected === choice ? ' is-selected' : '';
              return `<button type="button" class="p2-choice${active}" data-choice="${escapeHtml(choice)}" ${(item.solved || exhausted) ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span><b>${renderRichMathText(taskDisplayChoice(task, index, choice))}</b></button>`;
            }).join('')}</div>`;

    const conditionMarkup = (solutionTask || expressionTask)
      ? `<div class="p2-solution-condition">
          <p class="p2-task-instruction">${escapeHtml(task.instruction || task.title || 'Išspręsk užduotį.')}</p>
          <math-field class="p2-static-math p2-task-equation" read-only tabindex="-1">${escapeHtml(task.prompt)}</math-field>
          ${expressionTask && task.response?.options?.domain ? `<p class="p2-expression-domain">Apibrėžimo sąlyga: ${escapeHtml(task.response.options.domain)}</p>` : ''}
        </div>`
      : `<p class="p2-task-prompt">${renderRichMathText(taskDisplayPrompt(task))}</p>`;

    const dots = activeLesson().tasks.map((candidate, index) => {
      const cstate = taskState(candidate.id);
      const pedagogy = pedagogicalStatus(cstate, { taskId: candidate.id, current: candidate.id === task.id && state.status === 'in_progress' });
      const cls = [candidate.id === task.id ? 'is-current' : '', pedagogy.key === 'good' ? 'is-done' : '', pedagogy.key === 'help' ? 'is-help' : '', pedagogy.key === 'repeat' ? 'is-repeat' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="p2-task-dot ${cls}" data-task-id="${candidate.id}" title="${escapeHtml(candidate.label)} · ${index + 1} · ${pedagogy.label}">${index + 1}</button>`;
    }).join('');

    return `
      <section class="p2-practice-shell">
        <header class="p2-practice-shell-head">
          <div><span class="p2-label">Mano pratybos</span><h3>${escapeHtml(activeLesson().shortTitle)}</h3></div>
          <div class="p2-practice-progress"><span>${taskNumber} / ${activeLesson().taskCount}</span><i><b style="width:${stats.percent}%"></b></i></div>
        </header>
        <div class="p2-tabs p2-live-tabs" role="tablist" aria-label="Pratybų dalys">
          <button type="button" data-section="class" class="${task.section === 'class' ? 'is-active' : ''}">▤ Pamokoje</button>
          <button type="button" data-section="self" class="${task.section === 'self' ? 'is-active' : ''}">⌂ Savarankiškai</button>
        </div>
        <article class="p2-task-card ${(solutionTask || expressionTask) ? 'p2-solution-task-card' : ''}${simpleInputTask ? ' p2-simple-input-task-card' : ''}">
          <div class="p2-task-card-head"><span class="p2-task-number">${taskNumber}.</span><div><span class="p2-label">${escapeHtml(task.label)}</span><h3>${escapeHtml((solutionTask || expressionTask || simpleInputTask) ? (task.title || 'Užduotis') : 'Užduotis')}</h3></div><span class="p2-soft-pill">${attemptUsageLabel(item, task.id)}</span></div>
          ${conditionMarkup}
          ${answerMarkup}
          ${hint}${feedback}
          <div class="p2-task-actions">
            <button type="button" class="p2-secondary" data-action="hint" ${(item.hintUsed || item.solved || exhausted) ? 'disabled' : ''}>💡 Užuomina</button>
            <span class="p2-task-actions-spacer"></span>
            <button type="button" class="p2-secondary" data-action="previous" ${taskNumber === 1 ? 'disabled' : ''}>← Ankstesnė</button>
            ${item.solved || exhausted
              ? '<button type="button" class="p2-primary" data-action="next">Toliau →</button>'
              : `<button type="button" class="p2-primary" data-action="check">${solutionTask ? 'Patikrinti sprendimą' : (expressionTask || simpleInputTask) ? 'Patikrinti atsakymą' : 'Tikrinti'}</button>`}
          </div>
        </article>
        <nav class="p2-task-dots" aria-label="Užduočių navigacija">${dots}</nav>
      </section>
      ${studentProgressSummary(stats)}
    `;
  }

  function updateLiveSolution(task, index, branchIndex, plain, latex, row) {
    const next = normalizedProgress(progress);
    const previous = taskState(task.id);
    const response = solutionResponseForItem(previous);
    while (response.steps.length <= index) response.steps.push(practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] });
    const current = response.steps[index] || practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] };
    const type = ['equation', 'alternatives', 'solution-set'].includes(current.type) ? current.type : 'equation';
    const values = Array.isArray(current.values) ? [...current.values] : [''];
    const latexValues = Array.isArray(current.latexValues) ? [...current.latexValues] : [''];
    while (values.length <= branchIndex) values.push('');
    while (latexValues.length <= branchIndex) latexValues.push('');
    values[branchIndex] = plain;
    latexValues[branchIndex] = latex;
    response.steps[index] = practiceEngine?.createStep?.(type, values, latexValues, { branchGroupId: current.branchGroupId })
      || { type, values, latexValues, ...(current.branchGroupId ? { branchGroupId: current.branchGroupId } : {}) };

    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [task.id]: {
        ...previous,
        liveSolution: response,
        solutionUpdatedAt: Date.now(),
        validationResult: null
      }
    };
    row?.classList.remove('is-correct', 'is-error', 'is-warning');
    const message = row?.querySelector('.p2-solution-step-message');
    const stateMark = row?.querySelector('.p2-solution-step-state');
    if (message) message.textContent = '';
    if (stateMark) stateMark.textContent = '';
    publishLiveProgress(next, task.id);
  }

  function setSolutionStepType(taskId, index, type) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    if (!task || !isSolutionTask(task)) return;
    const previous = taskState(taskId);
    if (previous.solved || isTaskExhausted(previous, taskId)) return;
    const response = solutionResponseForItem(previous);
    const current = response.steps[index] || practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] };
    const firstValue = current.values?.[0] || '';
    const firstLatex = current.latexValues?.[0] || '';
    const branchGroupId = type === 'alternatives'
      ? (current.type === 'alternatives' && current.branchGroupId ? current.branchGroupId : createBranchGroupId(taskId))
      : '';
    response.steps[index] = type === 'alternatives'
      ? (practiceEngine?.createStep?.('alternatives', [firstValue, ''], [firstLatex, ''], { branchGroupId }) || { type: 'alternatives', values: [firstValue, ''], latexValues: [firstLatex, ''], branchGroupId })
      : (practiceEngine?.createStep?.(type, [firstValue], [firstLatex]) || { type, values: [firstValue], latexValues: [firstLatex] });
    const next = normalizedProgress(progress);
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [taskId]: { ...previous, liveSolution: response, validationResult: null, solutionUpdatedAt: Date.now() }
    };
    activeSolutionStep = { taskId, index };
    solutionFocusRequest = { taskId, index, branchIndex: 0 };
    practiceEngine?.holdMathToolbar?.(420);
    publishProgress(next, { render: false });

    if (!replaceSolutionStepInPlace(task, index)) {
      renderPanels();
      return;
    }
    focusStudentSolutionField(index, 0);
  }

  function hydrateStudentSolutionEditor(options = {}) {
    const task = currentTask();
    if (!isSolutionTask(task)) return;
    const item = currentTaskState();
    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    const response = solutionResponseForItem(item);
    studentPanel.querySelectorAll('[data-solution-field]').forEach(host => {
      if (options.onlyEmpty && host.querySelector('math-field')) return;
      const index = Number(host.dataset.solutionField);
      const branchIndex = Math.max(0, Number(host.dataset.solutionBranch || 0));
      const step = response.steps[index] || practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] };
      if (!practiceEngine?.createMathField) {
        host.textContent = step.values?.[branchIndex] || '';
        return;
      }
      const row = host.closest('.p2-solution-step');
      const field = practiceEngine.createMathField({
        source: step.values?.[branchIndex] || '',
        latexSource: step.latexValues?.[branchIndex] || '',
        kind: step.type === 'solution-set' ? 'solution-set' : 'equation',
        fieldKey: `p2:${task.id}:step:${index}:branch:${branchIndex}`,
        testid: branchIndex === 0 ? `p2-step-input-${index}` : `p2-step-input-${index}-${branchIndex}`,
        placeholder: step.type === 'alternatives'
          ? (response.steps[index - 1]?.type === 'alternatives' && response.steps[index - 1]?.branchGroupId && response.steps[index - 1]?.branchGroupId === step.branchGroupId
              ? '= tęsinys'
              : (branchIndex === 0 ? 'Pirmas atvejis' : 'Antras atvejis'))
          : step.type === 'solution-set'
            ? 'Pvz., x = 2; x = 3'
            : (task.response?.placeholder || 'Kita lygtis'),
        contextLabel: step.type === 'alternatives'
          ? `P2 pratybų ${index + 1} eilutės ${branchIndex + 1} sprendimo šaka`
          : step.type === 'solution-set'
            ? 'P2 pratybų galutinis atsakymas'
            : `P2 pratybų ${index + 1} sprendimo eilutė`,
        onCommit: (plain, latex) => updateLiveSolution(task, index, branchIndex, plain, latex, row),
        onEnter: () => {
          if (step.type === 'alternatives') {
            addBranchSolutionLine(task.id, index, branchIndex);
            return;
          }
          addSolutionStep(task.id, index + 1);
        }
      });
      field.classList.add('p2-solution-math-field');
      const markActiveLine = () => setActiveSolutionStep(task.id, index);
      field.addEventListener('focus', markActiveLine);
      field.addEventListener('pointerdown', markActiveLine, { passive: true });
      field.addEventListener('click', markActiveLine);
      if (locked) {
        field.setAttribute('read-only', '');
        field.setAttribute('disabled', '');
      }
      host.replaceChildren(field);
    });

    if (solutionFocusRequest?.taskId === task.id) {
      const targetIndex = solutionFocusRequest.index;
      const targetBranch = solutionFocusRequest.branchIndex || 0;
      solutionFocusRequest = null;
      setActiveSolutionStep(task.id, targetIndex);
      requestAnimationFrame(() => {
        const selector = targetBranch === 0
          ? `[data-testid="p2-step-input-${targetIndex}"]`
          : `[data-testid="p2-step-input-${targetIndex}-${targetBranch}"]`;
        const target = studentPanel.querySelector(selector);
        if (!target) return;
        try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
      });
    } else {
      syncSolutionToolbar();
    }
  }

  function setActiveSolutionStep(taskId, index) {
    activeSolutionStep = { taskId, index: Math.max(0, Number(index || 0)) };
    syncSolutionToolbar();
  }

  function syncSolutionToolbar() {
    const task = currentTask();
    if (!isSolutionTask(task)) return;
    const toolbar = studentPanel.querySelector('[data-solution-toolbar]');
    if (!toolbar) return;
    const response = solutionResponseForItem(currentTaskState());
    if (!response.steps.length) return;
    const index = activeSolutionStep.taskId === task.id
      ? Math.max(0, Math.min(response.steps.length - 1, Number(activeSolutionStep.index || 0)))
      : 0;
    activeSolutionStep = { taskId: task.id, index };
    toolbar.dataset.activeStep = String(index);
    const type = response.steps[index]?.type || 'equation';
    toolbar.querySelectorAll('[data-solution-toolbar-type]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.solutionToolbarType === type);
      button.setAttribute('aria-pressed', button.dataset.solutionToolbarType === type ? 'true' : 'false');
    });
  }

  function solutionFieldSelector(index, branchIndex = 0) {
    return branchIndex === 0
      ? `[data-testid="p2-step-input-${index}"]`
      : `[data-testid="p2-step-input-${index}-${branchIndex}"]`;
  }

  function focusStudentSolutionField(index, branchIndex = 0) {
    requestAnimationFrame(() => {
      const target = studentPanel.querySelector(solutionFieldSelector(index, branchIndex));
      if (!target) return;
      try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
    });
  }

  function bindSolutionRowActions(scope = studentPanel) {
    scope.querySelectorAll('[data-solution-remove]').forEach(button => {
      if (button.dataset.p2Bound === '1') return;
      button.dataset.p2Bound = '1';
      button.addEventListener('click', () => removeSolutionStep(currentTask().id, Number(button.dataset.solutionRemove)));
    });

    scope.querySelectorAll('[data-solution-toolbar-type]').forEach(button => {
      if (button.dataset.p2Bound === '1') return;
      button.dataset.p2Bound = '1';
      // Neišjungiame aktyvaus MathLive lauko vien dėl valdymo juostos paspaudimo.
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => {
        const toolbar = button.closest('[data-solution-toolbar]');
        const index = Number(toolbar?.dataset.activeStep || activeSolutionStep.index || 0);
        setSolutionStepType(currentTask().id, index, button.dataset.solutionToolbarType);
      });
    });
  }

  function replaceSolutionStepInPlace(task, index) {
    const oldRow = studentPanel.querySelector(`[data-solution-step="${index}"]`);
    if (!oldRow) return false;

    const item = currentTaskState();
    const scratch = document.createElement('div');
    scratch.innerHTML = solutionEditorMarkup(task, item);
    const nextRow = scratch.querySelector(`[data-solution-step="${index}"]`);
    if (!nextRow) return false;

    oldRow.replaceWith(nextRow);
    bindSolutionRowActions(nextRow);
    hydrateStudentSolutionEditor({ onlyEmpty: true });
    syncSolutionToolbar();
    return true;
  }

  function appendSolutionStepInPlace(task, index) {
    const stepsHost = studentPanel.querySelector('.p2-solution-steps');
    if (!stepsHost || stepsHost.querySelector(`[data-solution-step="${index}"]`)) return false;

    const item = currentTaskState();
    const response = solutionResponseForItem(item);
    const scratch = document.createElement('div');
    scratch.innerHTML = solutionEditorMarkup(task, item);
    const row = scratch.querySelector(`[data-solution-step="${index}"]`);
    if (!row) return false;

    // P2-SPLIT-P2.3.3: neperpiešiame visos mokinio pratybų skilties vien dėl naujos
    // sprendimo eilutės. Senieji MathLive laukai lieka prijungti prie DOM, todėl
    // universali formulės juosta nepraranda aktyvaus taikinio ir vaizdas nebesumirksi.
    stepsHost.appendChild(row);

    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    studentPanel.querySelectorAll('[data-solution-remove]').forEach(button => {
      button.disabled = locked || response.steps.length <= 1;
    });
    bindSolutionRowActions(row);
    hydrateStudentSolutionEditor({ onlyEmpty: true });
    return true;
  }

  function addBranchSolutionLine(taskId, index, branchIndex = 0) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    if (!task || !isSolutionTask(task)) return;
    const previous = taskState(taskId);
    if (previous.solved || isTaskExhausted(previous, taskId)) return;
    const response = solutionResponseForItem(previous);
    const current = response.steps[index];
    if (!current || current.type !== 'alternatives') return;

    const groupId = current.branchGroupId || createBranchGroupId(taskId);
    if (!current.branchGroupId) {
      response.steps[index] = practiceEngine?.createStep?.('alternatives', current.values, current.latexValues, { branchGroupId: groupId })
        || { ...current, branchGroupId: groupId };
    }

    const nextExisting = response.steps[index + 1];
    if (nextExisting?.type === 'alternatives' && nextExisting.branchGroupId === groupId) {
      activeSolutionStep = { taskId, index: index + 1 };
      practiceEngine?.holdMathToolbar?.(300);
      focusStudentSolutionField(index + 1, branchIndex);
      return;
    }

    const branchCount = Math.max(2, Array.isArray(current.values) ? current.values.length : 2);
    const values = Array.from({ length: branchCount }, () => '');
    const latexValues = Array.from({ length: branchCount }, () => '');
    const added = practiceEngine?.createStep?.('alternatives', values, latexValues, { branchGroupId: groupId })
      || { type: 'alternatives', values, latexValues, branchGroupId: groupId };
    response.steps.splice(index + 1, 0, added);

    const next = normalizedProgress(progress);
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [taskId]: { ...previous, liveSolution: response, validationResult: null, solutionUpdatedAt: Date.now() }
    };
    activeSolutionStep = { taskId, index: index + 1 };
    solutionFocusRequest = { taskId, index: index + 1, branchIndex };
    practiceEngine?.holdMathToolbar?.(420);
    // Įterpiant eilutę branchGroup viduryje keičiasi tolesni indeksai, todėl sąmoningai
    // perpiešiame sprendimo lapą ir atkuriame fokusą toje pačioje šakoje.
    publishProgress(next);
  }

  function addSolutionStep(taskId, focusIndex = null) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    if (!task || !isSolutionTask(task)) return;
    const previous = taskState(taskId);
    if (previous.solved || isTaskExhausted(previous, taskId)) return;
    const response = solutionResponseForItem(previous);
    const nextIndex = focusIndex === null ? response.steps.length : Math.max(0, Number(focusIndex));

    // Jei Enter prašo pereiti į jau egzistuojančią kitą eilutę, nieko neperrenderiname.
    if (nextIndex < response.steps.length) {
      activeSolutionStep = { taskId, index: nextIndex };
      syncSolutionToolbar();
      practiceEngine?.holdMathToolbar?.(300);
      focusStudentSolutionField(nextIndex, 0);
      return;
    }

    response.steps.push(practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] });
    const addedIndex = response.steps.length - 1;
    const next = normalizedProgress(progress);
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [taskId]: { ...previous, liveSolution: response, validationResult: null, solutionUpdatedAt: Date.now() }
    };
    activeSolutionStep = { taskId, index: addedIndex };
    solutionFocusRequest = { taskId, index: addedIndex };
    practiceEngine?.holdMathToolbar?.(420);
    publishProgress(next, { render: false });

    if (!appendSolutionStepInPlace(task, addedIndex)) {
      renderPanels();
      return;
    }
    // hydrateStudentSolutionEditor() suvartoja solutionFocusRequest; jei naršyklė fokusą
    // atideda, papildomas stabilus focus nekoreguoja slinkties.
    focusStudentSolutionField(addedIndex, 0);
  }

  function removeSolutionStep(taskId, index) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    if (!task || !isSolutionTask(task)) return;
    const previous = taskState(taskId);
    if (previous.solved || isTaskExhausted(previous, taskId)) return;
    const response = solutionResponseForItem(previous);
    if (response.steps.length <= 1) return;
    response.steps.splice(index, 1);
    const next = normalizedProgress(progress);
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [taskId]: { ...previous, liveSolution: response, validationResult: null, solutionUpdatedAt: Date.now() }
    };
    solutionFocusRequest = { taskId, index: Math.max(0, Math.min(index, response.steps.length - 1)) };
    practiceEngine?.holdMathToolbar?.(420);
    publishProgress(next);
  }

  function bindStudentActions() {
    studentPanel.querySelector('[data-action="open-assignment"]')?.addEventListener('click', () => {
      const next = normalizedProgress(progress);
      next.status = 'in_progress';
      next.currentTaskId = next.currentTaskId || activeLesson().tasks[0].id;
      next.startedAt = next.startedAt || Date.now();
      markTaskOpened(next, next.currentTaskId);
      publishProgress(next);
    });

    studentPanel.querySelectorAll('[data-simple-input]').forEach(input => {
      input.addEventListener('input', () => {
        const taskId = input.dataset.simpleInput || currentTask().id;
        const task = activeLesson().tasks.find(candidate => candidate.id === taskId) || currentTask();
        if (!isSimpleInputTask(task)) return;
        const value = input.value || '';
        selectedAnswers[task.id] = value;
        const next = normalizedProgress(progress);
        const previous = taskState(task.id);
        next.status = 'in_progress';
        next.taskStates = {
          ...next.taskStates,
          [task.id]: { ...previous, liveAnswer: value, selectionUpdatedAt: Date.now() }
        };
        publishLiveProgress(next, task.id);
      });
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        studentPanel.querySelector('[data-action="check"]')?.click();
      });
    });

    studentPanel.querySelectorAll('[data-choice]').forEach(button => {
      button.addEventListener('click', () => {
        const task = currentTask();
        if (isSolutionTask(task) || isExpressionTask(task)) return;
        const choice = button.dataset.choice || '';
        selectedAnswers[task.id] = choice;
        const next = normalizedProgress(progress);
        const previous = taskState(task.id);
        next.taskStates = {
          ...next.taskStates,
          [task.id]: { ...previous, liveAnswer: choice, selectionUpdatedAt: Date.now() }
        };
        publishProgress(next);
      });
    });

    studentPanel.querySelector('[data-action="hint"]')?.addEventListener('click', () => {
      const task = currentTask();
      const next = normalizedProgress(progress);
      const previous = taskState(task.id);
      next.taskStates = { ...next.taskStates, [task.id]: { ...previous, hintUsed: true } };
      publishProgress(next);
    });

    studentPanel.querySelector('[data-action="add-solution-step"]')?.addEventListener('click', () => addSolutionStep(currentTask().id));
    bindSolutionRowActions(studentPanel);

    studentPanel.querySelector('[data-action="check"]')?.addEventListener('click', () => {
      const task = currentTask();
      const previous = taskState(task.id);
      if (isTaskExhausted(previous, task.id)) { toast('Šiai užduočiai bandymų nebeliko'); return; }

      let correct = false;
      let submittedAnswer = '';
      let validationResult = null;
      let submittedSolution = null;

      if (isSolutionTask(task)) {
        const response = solutionResponseForItem(previous);
        submittedAnswer = solutionSummary(response);
        if (!submittedAnswer) { toast('Įrašyk bent vieną sprendimo žingsnį'); return; }
        validationResult = validateSolutionTask(task, response);
        correct = validationResult.status === 'correct';
        submittedSolution = response;
      } else if (isExpressionTask(task)) {
        const response = expressionResponseForItem(previous);
        submittedAnswer = response.answer.trim();
        if (!submittedAnswer) { toast('Įrašyk reiškinį'); return; }
        validationResult = validateExpressionTask(task, response);
        correct = validationResult.status === 'correct';
      } else if (isSimpleInputTask(task)) {
        const answer = String(selectedAnswers[task.id] ?? previous.liveAnswer ?? '').trim();
        if (!answer) { toast('Įrašyk atsakymą'); return; }
        submittedAnswer = answer;
        correct = simpleAnswerMatches(task, answer);
      } else {
        const answer = selectedAnswers[task.id] ?? previous.liveAnswer ?? '';
        if (!answer) { toast('Pasirink atsakymą'); return; }
        submittedAnswer = answer;
        correct = answer === task.answer;
      }

      const next = normalizedProgress(progress);
      const attempts = Number(previous.attempts || 0) + 1;
      const wrongAttempts = Number(previous.wrongAttempts || 0) + (correct ? 0 : 1);
      const maxAttempts = attemptLimitForTask(task.id);
      const exhaustedAfter = !correct && maxAttempts > 0 && attempts >= maxAttempts;
      const status = correct
        ? (previous.hintUsed || attempts > 1 ? 'help' : 'good')
        : (exhaustedAfter ? 'repeat' : 'pending');
      const state = {
        ...previous,
        attempts,
        wrongAttempts,
        lastAnswer: submittedAnswer,
        lastResult: correct ? 'correct' : (validationResult?.status || 'wrong'),
        submittedAt: Date.now(),
        solved: correct,
        status,
        ...(isSolutionTask(task)
          ? { liveSolution: submittedSolution, lastSolution: submittedSolution, validationResult }
          : isExpressionTask(task)
            ? { liveExpression: expressionResponseForItem(previous), lastExpression: expressionResponseForItem(previous), validationResult }
            : { liveAnswer: submittedAnswer })
      };
      next.taskStates = { ...next.taskStates, [task.id]: state };
      const allFinished = activeLesson().tasks.every(candidate => {
        const candidateState = candidate.id === task.id ? state : taskState(candidate.id);
        return Boolean(candidateState.solved) || isTaskExhausted(candidateState, candidate.id);
      });
      next.status = allFinished ? 'completed' : 'in_progress';
      publishProgress(next);
    });

    studentPanel.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      const task = currentTask();
      const next = normalizedProgress(progress);
      next.currentTaskId = nextTaskId(task.id);
      markTaskOpened(next, next.currentTaskId);
      publishProgress(next);
    });

    studentPanel.querySelector('[data-action="previous"]')?.addEventListener('click', () => {
      const task = currentTask();
      const next = normalizedProgress(progress);
      next.currentTaskId = previousTaskId(task.id);
      markTaskOpened(next, next.currentTaskId);
      publishProgress(next);
    });

    studentPanel.querySelectorAll('[data-task-id]').forEach(button => {
      button.addEventListener('click', () => {
        const next = normalizedProgress(progress);
        next.currentTaskId = button.dataset.taskId;
        markTaskOpened(next, next.currentTaskId);
        publishProgress(next);
      });
    });

    studentPanel.querySelectorAll('[data-section]').forEach(button => {
      button.addEventListener('click', () => {
        const section = button.dataset.section;
        const first = activeLesson().tasks.find(task => task.section === section);
        if (!first) return;
        const next = normalizedProgress(progress);
        next.currentTaskId = first.id;
        markTaskOpened(next, next.currentTaskId);
        publishProgress(next);
      });
    });

    hydrateStudentSolutionEditor();
    hydrateStudentExpressionEditor();
  }

  function renderTeacherPanel() {
    const count = Math.max(0, Number(userCount?.textContent || 0));
    const studentOnline = count >= 2;
    const learnerName = currentStudentName('Mokinys');
    const learnerInitial = String(learnerName || 'M').trim().slice(0, 1).toUpperCase() || 'M';
    const state = normalizedProgress(progress);
    const stats = progressStats();
    const task = assignment ? currentTask() : null;
    const item = assignment ? currentTaskState() : null;
    const assigned = Boolean(assignment);
    const started = assigned && state.status !== 'not_started';
    const assignmentTitle = assigned ? activeLesson().shortTitle : 'Pratybos dar nepriskirtos';
    const currentLabel = task ? `${taskIndex(task.id) + 1} / ${activeLesson().taskCount}` : '— / —';
    const helper = !assigned ? '—' : item?.hintUsed ? 'Naudota' : 'Nenaudota';
    const currentPedagogy = started ? pedagogicalStatus(item, { taskId: task?.id, current: state.status === 'in_progress' && Boolean(task) }) : { key: 'pending', label: '—' };
    const activityTitle = !assigned ? 'Pratybos dar nepriskirtos' : !started ? `${learnerName} dar neatidarė pratybų` : state.status === 'completed' ? 'Pratybos atliktos' : `Sprendžiama ${taskIndex(task.id) + 1} užduotis`;
    const activityText = !assigned
      ? `Priskirk pratybas Bibliotekoje. ${learnerName} jas iškart pamatys savo „Mano pratybos“ srityje.`
      : !started
        ? `Pratybos priskirtos. Kai ${learnerName} paspaus „Atidaryti“, čia realiu laiku atsiras dabartinė užduotis, bandymai ir pagalbos būsena.`
        : `${task?.prompt || ''}`;

    teacherPanel.innerHTML = `
      <div class="p2-learner-card p2-learner-overview">
        <div class="p2-avatar" aria-hidden="true">${escapeHtml(learnerInitial)}</div>
        <div class="p2-learner-copy"><span class="p2-label">${escapeHtml(learnerName)} · eiga</span><h3>${studentOnline ? `Prisijungė: ${escapeHtml(learnerName)}` : `Laukiama: ${escapeHtml(learnerName)}`}</h3><p>${studentOnline ? 'Lenta ir individuali pratybų būsena sinchronizuojamos realiu laiku.' : 'Nukopijuok šio mokinio nuorodą ir atidaryk ją kitame įrenginyje.'}</p></div>
        <span class="p2-presence-pill ${studentOnline ? 'is-online' : ''}">${studentOnline ? 'Prisijungęs' : `${count} įrenginys`}</span>
      </div>
      <div class="p2-teacher-dashboard-grid">
        <div class="p2-progress-card">
          <div class="p2-progress-head"><div><span class="p2-label">Priskirtos pratybos</span><h3>${escapeHtml(assignmentTitle)}</h3><p class="p2-teacher-status-line">${assigned ? `${statusLabel(state)} · ${policySummary(assignment)}` : 'Bibliotekoje pasirink pratybas ir priskirk mokiniui.'}</p></div><strong>${assigned ? `${stats.finished} / ${activeLesson().taskCount}` : '— / —'}</strong></div>
          <div class="p2-progress-line"><span style="width:${assigned ? stats.percent : 0}%"></span></div>
          <div class="p2-metrics">
            <div><span>Dabartinė užduotis</span><strong>${started ? currentLabel : '—'}</strong></div>
            <div><span>Bandymų</span><strong>${started && task ? attemptUsageLabel(item, task.id) : '—'}</strong></div>
            <div><span>Būsena</span><strong class="p2-metric-status status-${currentPedagogy.key}">${started ? currentPedagogy.label : '—'}</strong></div>
          </div>
        </div>
        <div class="p2-current-task-card">
          <div class="p2-card-heading-row"><div><span class="p2-label">Dabartinė veikla</span><h3>${escapeHtml(activityTitle)}</h3></div><span class="p2-soft-pill">${assigned ? statusLabel(state) : 'Laukiama'}</span></div>
          <p>${escapeHtml(activityText)}</p>
          ${started ? `<div class="p2-current-meta"><span>Pagalba: <strong>${helper}</strong></span><span>Istorinė būsena: <strong class="status-${currentPedagogy.key}">${currentPedagogy.label}</strong></span></div>` : ''}
          ${started && item?.lastAnswer ? `<div class="p2-last-answer"><span>Paskutinis atsakymas</span><strong>${escapeHtml(item.lastAnswer)}</strong></div>` : ''}
          <div class="p2-card-actions">
            <button type="button" class="p2-secondary" data-action="teacher-open" ${assigned ? '' : 'disabled'}>Atidaryti pratybas</button>
            <button type="button" class="p2-primary" data-action="teacher-board" disabled title="Bus įgyvendinta kitame etape">Rodyti lentoje</button>
          </div>
        </div>
      </div>
      <div class="p2-insight-card ${started ? '' : 'p2-insight-empty'}">
        <div class="p2-insight-icon" aria-hidden="true">✦</div>
        <div><span class="p2-label">${escapeHtml(learnerName)} · įžvalgos</span><h3>${started ? 'Tarpinė pamokos būsena' : 'Įžvalgos atsiras pradėjus spręsti'}</h3><p>${started ? `Savarankiškai: ${stats.good} · Su pagalba / taisant: ${stats.help} · Kartoti: ${stats.repeat}.` : 'Čia matysi, kuriuos gebėjimus mokinys atlieka savarankiškai, kur naudoja pagalbą ir ką verta pakartoti.'}</p></div>
      </div>
    `;

    teacherPanel.querySelector('[data-action="teacher-open"]')?.addEventListener('click', openTeacherPreview);
  }

  function renderPanels() {
    if (role() === 'teacher') renderTeacherPanel();
    else renderStudentPanel();
    renderLibraryContent();
    if (role() === 'teacher' && teacherPreviewMode === 'docked') teacherPanel.hidden = true;
  }

  function applyRole() {
    const isTeacher = role() === 'teacher';
    studentPanel.hidden = isTeacher;
    teacherPanel.hidden = !isTeacher;
    if (!isTeacher || teacherPreviewMode !== 'docked') {
      sideKicker.textContent = isTeacher ? 'MOKYTOJO STEBĖJIMAS' : 'MOKINIO ERDVĖ';
      sideTitle.textContent = isTeacher ? `${currentStudentName('Mokinys')} · eiga` : 'Mano pratybos';
    }
    practiceModeButton.textContent = isTeacher ? `${currentStudentName('Mokinys')} · eiga` : 'Tik pratybos';
    if (sideRolePill) sideRolePill.textContent = isTeacher ? 'Mokytojas' : currentStudentName('Mokinys');
    document.querySelectorAll('.p2-teacher-only').forEach(el => el.hidden = !isTeacher);
    const p2LibraryButton = document.getElementById('libraryButton');
    if (p2LibraryButton) p2LibraryButton.hidden = !isTeacher;
    const p2StudentsButton = document.getElementById('studentsButton');
    if (p2StudentsButton) p2StudentsButton.hidden = !isTeacher;
    const p2ScheduleButton = document.getElementById('scheduleButton');
    if (p2ScheduleButton) p2ScheduleButton.hidden = !isTeacher;
    if (!isTeacher && studentsModal) studentsModal.hidden = true;
    if (!isTeacher && scheduleModal) scheduleModal.hidden = true;
    if (!isTeacher && teacherPreviewMode !== 'closed') {
      teacherPreviewMode = 'closed';
      if (teacherPreviewWindow) teacherPreviewWindow.hidden = true;
      body.classList.remove('p2-teacher-preview-maximized');
      sidePane.classList.remove('has-preview-docked');
    }
    updateStudentIdentityLabels();
    renderLessonStudentTabs();
    updatePresence();
    renderPanels();
    if (isTeacher && teacherPreviewMode === 'docked') setTeacherSideHeader(true);
  }

  function updatePresence() {
    const count = Math.max(0, Number(userCount?.textContent || 0));
    if (boardPresenceText) boardPresenceText.textContent = count > 1 ? `${count} prisijungę` : 'Prisijungta';
    if (presencePill && role() === 'teacher') {
      presencePill.textContent = count >= 2 ? 'Prisijungęs' : `${count} ${count === 1 ? 'įrenginys' : 'įrenginiai'}`;
      presencePill.classList.toggle('is-online', count >= 2);
    }
    if (role() === 'teacher') renderTeacherPanel();
  }

  if (userCount) new MutationObserver(updatePresence).observe(userCount, { childList: true, subtree: true, characterData: true });


  function currentRoomId() {
    const visible = String(document.getElementById('onlineRoomCode')?.textContent || '').trim().toUpperCase();
    if (/^[A-Z0-9_-]{4,24}$/.test(visible) && visible !== '—') return visible;
    const fromUrl = String(new URL(location.href).searchParams.get('room') || '').trim().toUpperCase();
    return /^[A-Z0-9_-]{4,24}$/.test(fromUrl) ? fromUrl : '';
  }

  function normalizeTeacherStudentDb(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      profileId: String(source.profileId || ''),
      meta: source.meta && typeof source.meta === 'object' ? source.meta : {},
      students: source.students && typeof source.students === 'object' ? source.students : {},
      roomLinks: source.roomLinks && typeof source.roomLinks === 'object' ? source.roomLinks : {},
      classSessions: source.classSessions && typeof source.classSessions === 'object' ? source.classSessions : {},
      scheduleEntries: source.scheduleEntries && typeof source.scheduleEntries === 'object' ? source.scheduleEntries : {},
      scheduleRuns: source.scheduleRuns && typeof source.scheduleRuns === 'object' ? source.scheduleRuns : {}
    };
  }

  function studentList() {
    return Object.entries(teacherStudentDb.students || {})
      .map(([id, value]) => ({ id, ...(value && typeof value === 'object' ? value : {}) }))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'lt'));
  }

  function linkedStudentIdForRoom(roomId = currentRoomId()) {
    return String(teacherStudentDb.roomLinks?.[roomId]?.studentId || '');
  }


  function linkedClassSessionIdForRoom(roomId = currentRoomId()) {
    return String(teacherStudentDb.roomLinks?.[roomId]?.classSessionId || roomStudentProfile?.classSessionId || '');
  }

  function studentRecord(studentId) {
    const id = String(studentId || '').trim();
    return id ? teacherStudentDb.students?.[id] || null : null;
  }

  function currentStudentId() {
    return String(roomStudentProfile?.studentId || linkedStudentIdForRoom() || '').trim();
  }

  function currentStudentName(fallback = 'Mokinys') {
    const id = currentStudentId();
    const fromDb = studentRecord(id)?.name;
    const value = String(roomStudentProfile?.name || fromDb || '').trim();
    return value || fallback;
  }

  function classSessionParticipants(classSessionId = linkedClassSessionIdForRoom()) {
    const session = teacherStudentDb.classSessions?.[classSessionId];
    const entries = Object.entries(session?.students && typeof session.students === 'object' ? session.students : {});
    return entries.map(([studentId, item]) => ({
      studentId,
      roomId: String(item?.roomId || '').trim().toUpperCase(),
      name: String(studentRecord(studentId)?.name || 'Mokinys').trim() || 'Mokinys',
      addedAt: Number(item?.addedAt || 0)
    })).filter(item => item.roomId).sort((a, b) => a.addedAt - b.addedAt || a.name.localeCompare(b.name, 'lt'));
  }

  function ensureLessonStudentTabs() {
    if (lessonStudentTabs) return lessonStudentTabs;
    lessonStudentTabs = document.createElement('nav');
    lessonStudentTabs.id = 'p2LessonStudentTabs';
    lessonStudentTabs.className = 'p2-lesson-student-tabs';
    lessonStudentTabs.setAttribute('aria-label', 'Pamokos mokiniai');
    const topbar = document.querySelector('.topbar');
    if (topbar?.parentNode) topbar.insertAdjacentElement('afterend', lessonStudentTabs);
    return lessonStudentTabs;
  }

  function renderLessonStudentTabs() {
    if (role() !== 'teacher') {
      body.classList.remove('p2-lesson-student-tabs-active');
      if (lessonStudentTabs) lessonStudentTabs.hidden = true;
      return;
    }
    const classSessionId = linkedClassSessionIdForRoom();
    const participants = classSessionParticipants(classSessionId);
    if (!classSessionId || participants.length < 2) {
      body.classList.remove('p2-lesson-student-tabs-active');
      if (lessonStudentTabs) lessonStudentTabs.hidden = true;
      return;
    }
    const bar = ensureLessonStudentTabs();
    const activeRoom = currentRoomId();
    bar.hidden = false;
    bar.innerHTML = `<span class="p2-lesson-tabs-label">Pamokos mokiniai</span><div class="p2-lesson-tabs-scroll">${participants.map(item => {
      const active = item.roomId === activeRoom;
      const initial = String(item.name || 'M').trim().slice(0, 1).toUpperCase() || 'M';
      return `<button type="button" class="p2-lesson-student-tab ${active ? 'is-active' : ''}" data-lesson-student-room="${escapeHtml(item.roomId)}" ${active ? 'aria-current="page"' : ''}><span class="p2-lesson-tab-avatar">${escapeHtml(initial)}</span><span>${escapeHtml(item.name)}</span></button>`;
    }).join('')}</div>`;
    bar.querySelectorAll('[data-lesson-student-room]').forEach(button => button.addEventListener('click', () => {
      const targetRoom = String(button.dataset.lessonStudentRoom || '').trim().toUpperCase();
      if (!targetRoom || targetRoom === activeRoom || roomSwitching) return;
      requestTeacherRoomSwitch(targetRoom);
    }));
    body.classList.add('p2-lesson-student-tabs-active');
  }

  function requestTeacherRoomSwitch(targetRoom, preserveStay = true) {
    const safe = String(targetRoom || '').trim().toUpperCase();
    if (role() !== 'teacher' || !/^[A-Z0-9_-]{4,24}$/.test(safe) || safe === currentRoomId() || roomSwitching) return;
    roomSwitching = true;
    clearTimeout(studentDbSnapshotTimer);
    studentDbSnapshotTimer = null;
    renderLessonStudentTabs();
    window.dispatchEvent(new CustomEvent('p2:room-switch-request', {
      detail: { roomId: safe, preserveStay: preserveStay !== false }
    }));
  }

  function updateStudentIdentityLabels() {
    const isTeacher = role() === 'teacher';
    const name = currentStudentName('Mokinys');
    const hasName = currentStudentId() && name !== 'Mokinys';
    const roleBadge = document.getElementById('onlineRoleBadge');
    if (roleBadge) {
      roleBadge.textContent = isTeacher ? 'Mokytojas' : (hasName ? name : 'Mokinys');
      roleBadge.title = isTeacher ? 'Mokytojo režimas' : (hasName ? `Mokinio režimas · ${name}` : 'Mokinio režimas');
    }
    const boardTitle = document.querySelector('.p2-board-heading strong');
    const boardSubtitle = document.querySelector('.p2-board-subtitle');
    if (boardTitle) boardTitle.textContent = hasName ? `${name} · lenta` : 'Bendra lenta';
    if (boardSubtitle) boardSubtitle.textContent = hasName ? 'Individuali realaus laiko erdvė' : 'Bendra realaus laiko erdvė';
    if (isTeacher) {
      if (teacherPreviewMode !== 'docked' && sideTitle) sideTitle.textContent = `${name} · eiga`;
      if (practiceModeButton) practiceModeButton.textContent = `${name} · eiga`;
    } else if (sideRolePill) {
      sideRolePill.textContent = hasName ? name : 'Mokinys';
    }
  }

  function formatStudentDate(value, compact = false) {
    const stamp = Number(value);
    if (!Number.isFinite(stamp) || stamp <= 0) return '—';
    try {
      return new Intl.DateTimeFormat('lt-LT', compact
        ? { year: 'numeric', month: '2-digit', day: '2-digit' }
        : { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      ).format(new Date(stamp));
    } catch (_) { return new Date(stamp).toLocaleString('lt-LT'); }
  }

  function historicalRoomUrl(roomId, targetRole = 'teacher', useStay = true) {
    const url = new URL(location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('role', targetRole === 'student' ? 'student' : 'teacher');
    if (useStay) url.searchParams.set('stay', '1');
    else url.searchParams.delete('stay');
    url.searchParams.delete('blank');
    return url.toString();
  }

  const STUDENT_HISTORY_RETURN_KEY = 'p2-student-history-return-v1';
  const STUDENT_CARD_REOPEN_KEY = 'p2-student-card-reopen-v1';

  function saveStudentHistoryReturn(studentId = selectedStudentId, targetRoomId = '', targetRole = 'teacher') {
    if (role() !== 'teacher') return;
    const safeStudentId = String(studentId || '').trim();
    const safeTargetRoomId = String(targetRoomId || '').trim().toUpperCase();
    const safeTargetRole = targetRole === 'student' ? 'student' : 'teacher';
    if (!safeStudentId || !safeTargetRoomId) return;
    try {
      sessionStorage.setItem(STUDENT_HISTORY_RETURN_KEY, JSON.stringify({
        url: location.href,
        studentId: safeStudentId,
        targetRoomId: safeTargetRoomId,
        targetRole: safeTargetRole,
        savedAt: Date.now()
      }));
    } catch (_) {}
  }

  function readStudentHistoryReturn() {
    try {
      const value = JSON.parse(sessionStorage.getItem(STUDENT_HISTORY_RETURN_KEY) || 'null');
      if (!value || typeof value !== 'object') return null;
      const url = String(value.url || '');
      const studentId = String(value.studentId || '').trim();
      const targetRoomId = String(value.targetRoomId || '').trim().toUpperCase();
      const targetRole = value.targetRole === 'student' ? 'student' : 'teacher';
      if (!url || !studentId || !targetRoomId) return null;
      if (Number(value.savedAt || 0) && Date.now() - Number(value.savedAt) > 12 * 60 * 60 * 1000) return null;
      return { url, studentId, targetRoomId, targetRole };
    } catch (_) { return null; }
  }

  function installStudentHistoryReturnButton() {
    const state = readStudentHistoryReturn();
    if (!state) return;
    const params = new URL(location.href).searchParams;
    const activeRoomId = String(params.get('room') || '').trim().toUpperCase();
    const activeRole = params.get('role') === 'student' ? 'student' : 'teacher';
    const historical = params.get('stay') === '1';
    if (!activeRoomId || activeRoomId !== state.targetRoomId) return;

    // P2-SPLIT-P2.5-P4-P1.2: grįžimo juosta priklauso tik tam vaizdui,
    // kuris buvo sąmoningai atidarytas iš mokinio kortelės. Grįžus į įprastą
    // mokytojo lentą (be stay=1) senas sessionStorage įrašas nebegali jos
    // klaidingai paversti „Mokinio vaizdu“.
    if (!historical && activeRole !== state.targetRole) {
      try { sessionStorage.removeItem(STUDENT_HISTORY_RETURN_KEY); } catch (_) {}
      return;
    }

    const app = document.getElementById('app');
    const workspace = document.getElementById('p2Workspace');
    if (!app || !workspace || document.getElementById('studentHistoryReturnBar')) return;

    const bar = document.createElement('div');
    bar.className = 'p2-history-return-bar';
    bar.id = 'studentHistoryReturnBar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Grįžimas į mokinio kortelę');
    bar.innerHTML = `<div class="p2-history-return-context"><span aria-hidden="true">${historical ? '◷' : '◉'}</span><strong>${historical ? 'Istorinė pamoka' : 'Mokinio vaizdas'}</strong><code>${escapeHtml(activeRoomId)}</code></div>`;

    const button = document.createElement('button');
    button.className = 'p2-history-return-button';
    button.id = 'studentHistoryReturnButton';
    button.type = 'button';
    button.innerHTML = '<span aria-hidden="true">←</span><span>Grįžti į mokinio kortelę</span>';
    button.title = 'Grįžti į mokinio kortelę tame pačiame naršyklės skirtuke';
    button.addEventListener('click', () => {
      try {
        sessionStorage.setItem(STUDENT_CARD_REOPEN_KEY, state.studentId);
        // Grįžimo tikslas jau perduotas per STUDENT_CARD_REOPEN_KEY, todėl
        // seno vaizdo navigacijos įrašą išvalome dar prieš grįždami.
        sessionStorage.removeItem(STUDENT_HISTORY_RETURN_KEY);
      } catch (_) {}
      location.assign(state.url);
    });
    bar.appendChild(button);
    app.insertBefore(bar, workspace);
    document.body.classList.add('p2-student-history-nav-active');
  }

  function openHistoricalRoom(roomId, targetRole = 'teacher') {
    const safe = String(roomId || '').trim().toUpperCase();
    if (!safe) return;
    const target = targetRole === 'student' ? 'student' : 'teacher';
    const activeRoomId = currentRoomId();

    // P2-SPLIT-P2.5-P2: jei mokytojas iš kortelės atidaro būtent tą pačią
    // aktyvią lentą, jokios istorinės navigacijos nereikia. Tiesiog uždarome
    // kortelę, todėl URL lieka be stay=1 ir aktyvios sesijos funkcijos išlieka.
    if (safe === activeRoomId && target === role()) {
      if (studentsModal) studentsModal.hidden = true;
      return;
    }

    saveStudentHistoryReturn(selectedStudentId, safe, target);
    const isHistoricalRoom = safe !== activeRoomId;
    // Kitai (senesnei) Room pridedame stay=1, kad transition nenukreiptų į
    // naujesnę sesiją. Tos pačios aktyvios Room mokinio vaizdui stay nereikia.
    location.assign(historicalRoomUrl(safe, target, isHistoricalRoom));
  }

  installStudentHistoryReturnButton();

  function requestStudentDb(detail) {
    if (role() !== 'teacher') return;
    window.dispatchEvent(new CustomEvent('p2:students-request', { detail }));
  }

  function ensureStudentsModal() {
    if (studentsModal) return studentsModal;
    studentsModal = document.createElement('div');
    studentsModal.className = 'p2-students-modal';
    studentsModal.hidden = true;
    studentsModal.innerHTML = `
      <div class="p2-students-backdrop" data-students-close></div>
      <section class="p2-students-panel" role="dialog" aria-modal="true" aria-label="Mokiniai">
        <header class="p2-students-header">
          <div><span class="p2-side-kicker">MOKINIŲ DUOMENŲ BAZĖ</span><h2>Mokiniai</h2><p>Pamokų istorija, progresas ir konkrečių pamokų lentos.</p></div>
          <button type="button" data-students-close aria-label="Uždaryti">×</button>
        </header>
        <div class="p2-students-body" id="p2StudentsBody"></div>
      </section>`;
    document.body.appendChild(studentsModal);
    studentsModal.querySelectorAll('[data-students-close]').forEach(el => el.addEventListener('click', () => { studentsModal.hidden = true; }));
    return studentsModal;
  }

  function lessonHistoryForStudent(student) {
    return Object.entries(student?.lessons && typeof student.lessons === 'object' ? student.lessons : {})
      .map(([roomId, item]) => ({ roomId, ...(item && typeof item === 'object' ? item : {}) }))
      .sort((a, b) => Number(b.createdAt || b.linkedAt || 0) - Number(a.createdAt || a.linkedAt || 0));
  }

  function studentProgressLabel(lesson) {
    const summary = lesson?.summary && typeof lesson.summary === 'object' ? lesson.summary : {};
    const taskCount = Math.max(0, Number(lesson?.taskCount || summary.taskCount || 0));
    const finished = Math.max(0, Number(summary.finished || 0));
    if (!lesson?.lessonId) return 'Lenta be pratybų';
    if (!taskCount) return summary.status === 'completed' ? 'Baigta' : 'Pratybos priskirtos';
    return `${finished} / ${taskCount}${summary.status === 'completed' ? ' · baigta' : ''}`;
  }

  function renderStudentsModal() {
    if (!studentsModal || studentsModal.hidden) return;
    const host = studentsModal.querySelector('#p2StudentsBody');
    if (!host) return;
    const students = studentList();
    const roomId = currentRoomId();
    const linkedStudentId = linkedStudentIdForRoom(roomId);
    if (!selectedStudentId || !teacherStudentDb.students?.[selectedStudentId]) {
      selectedStudentId = linkedStudentId && teacherStudentDb.students?.[linkedStudentId]
        ? linkedStudentId
        : students[0]?.id || null;
    }
    const selected = selectedStudentId ? teacherStudentDb.students[selectedStudentId] : null;
    const history = selected ? lessonHistoryForStudent(selected) : [];
    const currentLesson = selected?.lessons?.[roomId] || null;
    const defaultLessonId = currentLesson?.lessonId || assignment?.lessonId || '';
    const linkedToOther = linkedStudentId && linkedStudentId !== selectedStudentId;
    const currentLinkedStudent = linkedStudentId ? teacherStudentDb.students?.[linkedStudentId] || null : null;
    const classSessionId = linkedClassSessionIdForRoom(roomId);
    const classParticipants = classSessionParticipants(classSessionId);
    const selectedClassParticipant = classParticipants.find(item => item.studentId === selectedStudentId) || null;

    const listMarkup = students.length ? students.map(student => {
      const count = lessonHistoryForStudent(student).length;
      const current = linkedStudentId === student.id;
      return `<button class="p2-student-list-item ${student.id === selectedStudentId ? 'is-active' : ''}" type="button" data-student-select="${escapeHtml(student.id)}">
        <span class="p2-student-avatar" aria-hidden="true">${escapeHtml(String(student.name || 'M').trim().slice(0, 1).toUpperCase() || 'M')}</span>
        <span><strong>${escapeHtml(student.name || 'Mokinys')}</strong><small>${count} ${count === 1 ? 'pamoka' : 'pamokos'}${current ? ' · dabartinė sesija' : ''}</small></span>
      </button>`;
    }).join('') : `<div class="p2-students-empty"><strong>Dar nėra mokinių</strong><span>Įrašyk vardą žemiau ir sukurk pirmą mokinio kortelę.</span></div>`;

    let detailMarkup = `<div class="p2-student-detail-empty"><span aria-hidden="true">♟</span><h3>Pasirink mokinį</h3><p>Sukūrus mokinį čia atsiras jo pamokų istorija ir senų lentų nuorodos.</p></div>`;
    if (selected) {
      const lessonOptions = LESSON_CATALOG.map(lesson => `<option value="${escapeHtml(lesson.id)}" ${lesson.id === defaultLessonId ? 'selected' : ''}>${escapeHtml(lesson.shortTitle)} · ${lesson.taskCount} užd.</option>`).join('');
      const historyMarkup = history.length ? history.map(item => {
        const title = item.title || lessonForId(item.lessonId)?.shortTitle || 'Lentos sesija';
        const summary = item.summary || {};
        const percent = Math.max(0, Math.min(100, Number(summary.percent || 0)));
        return `<article class="p2-student-history-item ${item.roomId === roomId ? 'is-current' : ''}">
          <div class="p2-student-history-main">
            <div class="p2-student-history-title"><strong>${escapeHtml(title)}</strong>${item.roomId === roomId ? '<span>Dabartinė</span>' : ''}</div>
            <p>${formatStudentDate(item.createdAt || item.linkedAt)} · Room <code>${escapeHtml(item.roomId)}</code></p>
            <div class="p2-student-history-progress"><i><b style="width:${percent}%"></b></i><span>${escapeHtml(studentProgressLabel(item))}</span></div>
          </div>
          <div class="p2-student-history-actions">
            <button type="button" data-student-open-room="${escapeHtml(item.roomId)}" data-room-role="teacher">Atidaryti lentą</button>
            <button type="button" data-student-open-room="${escapeHtml(item.roomId)}" data-room-role="student">Mokinio vaizdas</button>
            <button class="is-muted" type="button" data-student-unlink-room="${escapeHtml(item.roomId)}">Pašalinti iš istorijos</button>
          </div>
        </article>`;
      }).join('') : `<div class="p2-student-history-empty">Šiam mokiniui dar nepriskirta nė viena pamoka.</div>`;

      detailMarkup = `
        <div class="p2-student-card-head">
          <div class="p2-student-avatar is-large" aria-hidden="true">${escapeHtml(String(selected.name || 'M').trim().slice(0, 1).toUpperCase() || 'M')}</div>
          <div><span class="p2-label">Mokinio kortelė</span><h3>${escapeHtml(selected.name || 'Mokinys')}</h3><p>Sukurta ${formatStudentDate(selected.createdAt, true)}</p></div>
          <button class="p2-student-danger" type="button" data-student-delete>Pašalinti mokinį</button>
        </div>
        <section class="p2-student-edit-card">
          <label><span>Vardas</span><input id="p2StudentNameEdit" value="${escapeHtml(selected.name || '')}" maxlength="80"></label>
          <label><span>Pastabos</span><textarea id="p2StudentNotesEdit" maxlength="600" placeholder="Nebūtina">${escapeHtml(selected.notes || '')}</textarea></label>
          <button type="button" class="p2-secondary" data-student-save>Įrašyti pakeitimus</button>
        </section>
        <section class="p2-student-current-session ${currentLesson || selectedClassParticipant ? 'is-linked' : ''}">
          <div class="p2-student-section-heading"><div><span class="p2-label">Dabartinė pamoka</span><h3>${linkedStudentId ? `${escapeHtml(currentLinkedStudent?.name || 'Mokinys')} · Room ${escapeHtml(roomId || '—')}` : `Room ${escapeHtml(roomId || '—')}`}</h3></div>${currentLesson ? '<span class="p2-status-badge is-assigned">✓ Šio mokinio lenta</span>' : classParticipants.length > 1 ? `<span class="p2-status-badge is-assigned">${classParticipants.length} mokiniai</span>` : ''}</div>
          ${linkedToOther ? (selectedClassParticipant
            ? `<div class="p2-student-class-info"><strong>${escapeHtml(selected.name || 'Mokinys')}</strong> jau yra šioje pamokoje ir turi atskirą lentą <code>${escapeHtml(selectedClassParticipant.roomId)}</code>.</div>`
            : `<div class="p2-student-class-info">Dabar atidaryta <strong>${escapeHtml(currentLinkedStudent?.name || 'kito mokinio')}</strong> lenta. Pasirinktam mokiniui <strong>„${escapeHtml(selected.name || 'Mokinys')}“</strong> bus automatiškai sukurta <strong>atskira lenta</strong>, o viršuje atsiras jo vardinis skirtukas.</div>`)
            : ''}
          ${linkedToOther && selectedClassParticipant
            ? `<div class="p2-student-current-actions"><button type="button" class="p2-primary" data-student-switch-class-room="${escapeHtml(selectedClassParticipant.roomId)}">Atidaryti lentą · ${escapeHtml(selected.name || 'Mokinys')}</button></div>`
            : `<div class="p2-student-assign-row">
                <label><span>Pratybos šiam mokiniui</span><select id="p2StudentLessonSelect"><option value="">Tik lenta / nepriskirti naujų pratybų</option>${lessonOptions}</select></label>
                <button type="button" class="p2-primary" ${linkedToOther ? 'data-student-add-to-class' : 'data-student-link-current'}>${linkedToOther ? 'Pridėti į šią pamoką' : (currentLesson ? 'Atnaujinti pamokos įrašą' : 'Priskirti šią pamoką')}</button>
              </div>`}
          <p class="p2-student-current-help">Kiekvienas mokinys turi savo Room, lentą ir pratybų eigą. Tos pačios pamokos mokinius mokytojas perjungia viršuje esančiais vardiniais skirtukais.</p>
        </section>
        <section class="p2-student-history">
          <div class="p2-student-section-heading"><div><span class="p2-label">Pamokų istorija</span><h3>${history.length} ${history.length === 1 ? 'pamoka' : 'pamokos'}</h3></div></div>
          <div class="p2-student-history-list">${historyMarkup}</div>
        </section>`;
    }

    host.innerHTML = `
      <aside class="p2-students-list-pane">
        <div class="p2-student-create"><label for="p2NewStudentName">Naujas mokinys</label><div><input id="p2NewStudentName" maxlength="80" placeholder="Vardas"><button type="button" data-student-add>＋</button></div></div>
        <div class="p2-students-list">${listMarkup}</div>
        <div class="p2-student-backup-box"><strong>Duomenų sauga</strong><span>Schema v${escapeHtml(String(teacherStudentDb.meta?.schemaVersion || P2_DATA_SCHEMA_VERSION))}. Kopijoje išsaugomi mokiniai, pamokų istorija, rezultatai, tvarkaraštis ir susietų Room lentos.</span><button type="button" class="p2-secondary" data-student-backup>↓ Atsisiųsti atsarginę kopiją</button></div>
        <div class="p2-student-db-id"><span>Šios naršyklės mokytojo bazė</span><code title="Techninis bazės identifikatorius">${escapeHtml(teacherStudentDb.profileId || 'jungiama…')}</code></div>
      </aside>
      <main class="p2-student-detail-pane">${detailMarkup}</main>`;

    host.querySelector('[data-student-backup]')?.addEventListener('click', event => {
      const button = event.currentTarget;
      if (button) { button.disabled = true; button.textContent = 'Ruošiama…'; }
      window.dispatchEvent(new CustomEvent('p2:backup-request'));
    });

    host.querySelectorAll('[data-student-select]').forEach(button => button.addEventListener('click', () => {
      selectedStudentId = button.dataset.studentSelect;
      renderStudentsModal();
    }));
    const addInput = host.querySelector('#p2NewStudentName');
    const addStudent = () => {
      const name = String(addInput?.value || '').trim();
      if (!name) { addInput?.focus(); return; }
      requestStudentDb({ action: 'add', name });
      if (addInput) addInput.value = '';
    };
    host.querySelector('[data-student-add]')?.addEventListener('click', addStudent);
    addInput?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addStudent(); } });

    host.querySelector('[data-student-save]')?.addEventListener('click', () => {
      if (!selectedStudentId) return;
      requestStudentDb({
        action: 'update', studentId: selectedStudentId,
        name: host.querySelector('#p2StudentNameEdit')?.value || selected.name || '',
        notes: host.querySelector('#p2StudentNotesEdit')?.value || ''
      });
    });
    host.querySelector('[data-student-delete]')?.addEventListener('click', () => {
      if (!selectedStudentId) return;
      if (!window.confirm(`Pašalinti mokinį „${selected.name || 'Mokinys'}“ iš mokinių bazės? Senos Room lentos nebus ištrintos.`)) return;
      requestStudentDb({ action: 'delete', studentId: selectedStudentId });
      selectedStudentId = null;
    });
    host.querySelector('[data-student-link-current]')?.addEventListener('click', () => {
      if (!selectedStudentId || !roomId) return;
      const selectedLessonId = String(host.querySelector('#p2StudentLessonSelect')?.value || '');
      const lesson = lessonForId(selectedLessonId);
      requestStudentDb({
        action: 'link-room',
        studentId: selectedStudentId,
        roomId,
        lessonId: lesson?.id || '',
        title: lesson?.shortTitle || '',
        taskCount: lesson?.taskCount || 0,
        attemptPolicy: lesson ? normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy }) : null,
        ...(lesson ? assignmentContentDetail(lesson) : { schemaVersion: P2_DATA_SCHEMA_VERSION })
      });
    });
    host.querySelector('[data-student-add-to-class]')?.addEventListener('click', () => {
      if (!selectedStudentId || !roomId || !linkedStudentId) return;
      const selectedLessonId = String(host.querySelector('#p2StudentLessonSelect')?.value || '');
      const lesson = lessonForId(selectedLessonId);
      requestStudentDb({
        action: 'add-to-class-session',
        studentId: selectedStudentId,
        roomId,
        lessonId: lesson?.id || '',
        title: lesson?.shortTitle || '',
        taskCount: lesson?.taskCount || 0,
        attemptPolicy: lesson ? normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy }) : null,
        ...(lesson ? assignmentContentDetail(lesson) : { schemaVersion: P2_DATA_SCHEMA_VERSION })
      });
    });
    host.querySelector('[data-student-switch-class-room]')?.addEventListener('click', event => {
      const targetRoom = String(event.currentTarget?.dataset.studentSwitchClassRoom || '').trim().toUpperCase();
      if (!targetRoom) return;
      if (studentsModal) studentsModal.hidden = true;
      requestTeacherRoomSwitch(targetRoom);
    });
    host.querySelectorAll('[data-student-open-room]').forEach(button => button.addEventListener('click', () => {
      openHistoricalRoom(button.dataset.studentOpenRoom, button.dataset.roomRole || 'teacher');
    }));
    host.querySelectorAll('[data-student-unlink-room]').forEach(button => button.addEventListener('click', () => {
      const oldRoom = button.dataset.studentUnlinkRoom;
      if (!window.confirm(`Pašalinti Room ${oldRoom} iš šio mokinio pamokų istorijos? Pati lenta Firebase liks nepaliesta.`)) return;
      requestStudentDb({ action: 'unlink-room', studentId: selectedStudentId, roomId: oldRoom });
    }));
  }

  function openStudentsDatabase() {
    if (role() !== 'teacher') return;
    ensureStudentsModal();
    studentsModal.hidden = false;
    renderStudentsModal();
  }

  // P2-SPLIT-P2.5-P4-P1.2: savaitinis tvarkaraštis yra mokytojo profilio dalis,
  // o ne vienos Room būsena. Tvarkaraščio įrašas kartojasi kas savaitę;
  // reali pamoka (classSession + atskiros mokinių Room) sukuriama tik paspaudus „Pradėti“.
  const SCHEDULE_DAYS = Object.freeze([
    { id: 1, short: 'Pr', label: 'Pirmadienis' },
    { id: 2, short: 'An', label: 'Antradienis' },
    { id: 3, short: 'Tr', label: 'Trečiadienis' },
    { id: 4, short: 'Kt', label: 'Ketvirtadienis' },
    { id: 5, short: 'Pn', label: 'Penktadienis' },
    { id: 6, short: 'Št', label: 'Šeštadienis' },
    { id: 7, short: 'Sk', label: 'Sekmadienis' }
  ]);

  function scheduleTodayIndex(date = new Date()) {
    const day = Number(date.getDay());
    return day === 0 ? 7 : day;
  }

  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatScheduleClock(value) {
    const stamp = Number(value);
    if (!Number.isFinite(stamp) || stamp <= 0) return '';
    try { return new Intl.DateTimeFormat('lt-LT', { hour: '2-digit', minute: '2-digit' }).format(new Date(stamp)); }
    catch (_) { return new Date(stamp).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' }); }
  }

  function defaultScheduleTime() {
    const date = new Date();
    let minutes = date.getMinutes();
    minutes = Math.ceil(minutes / 15) * 15;
    if (minutes >= 60) { date.setHours(date.getHours() + 1); minutes = 0; }
    return `${String(date.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function scheduleTimeToMinutes(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || '').trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function scheduleClockFromMinutes(value) {
    const total = Math.max(0, Math.min(24 * 60, Math.round(Number(value) || 0)));
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function scheduleFindConflict(day, start, durationMinutes, excludeScheduleId = '') {
    const startMinutes = scheduleTimeToMinutes(start);
    if (startMinutes === null) return null;
    const duration = Math.max(15, Math.min(180, Math.round(Number(durationMinutes) || 40)));
    const endMinutes = startMinutes + duration;
    return scheduleEntriesList().find(entry => {
      if (String(entry.id || '') === String(excludeScheduleId || '')) return false;
      if (Number(entry.day || 0) !== Number(day || 0)) return false;
      const otherStart = scheduleTimeToMinutes(entry.start);
      if (otherStart === null) return false;
      const otherDuration = Math.max(15, Math.min(180, Math.round(Number(entry.durationMinutes) || 40)));
      const otherEnd = otherStart + otherDuration;
      // Gretimos pamokos leidžiamos: 15:00–15:40 ir 15:40–16:20 nesikerta.
      return startMinutes < otherEnd && endMinutes > otherStart;
    }) || null;
  }

  function scheduleConflictText(conflict) {
    if (!conflict) return '';
    const startMinutes = scheduleTimeToMinutes(conflict.start);
    const duration = Math.max(15, Math.min(180, Math.round(Number(conflict.durationMinutes) || 40)));
    const end = startMinutes === null ? '' : scheduleClockFromMinutes(startMinutes + duration);
    const label = String(conflict.label || '').trim() || 'kita pamoka';
    return `Laikas persidengia su „${label}“ (${conflict.start || '—'}${end ? `–${end}` : ''}).`;
  }

  function scheduleEntriesList() {
    return Object.entries(teacherStudentDb.scheduleEntries || {})
      .map(([id, value]) => ({ id, ...(value && typeof value === 'object' ? value : {}) }))
      .sort((a, b) => Number(a.day || 0) - Number(b.day || 0) || String(a.start || '').localeCompare(String(b.start || '')) || Number(a.createdAt || 0) - Number(b.createdAt || 0));
  }

  function scheduleStudentIds(entry) {
    const raw = entry?.studentIds;
    if (Array.isArray(raw)) return raw.map(String).filter(id => teacherStudentDb.students?.[id]);
    if (raw && typeof raw === 'object') return Object.keys(raw).filter(id => raw[id] && teacherStudentDb.students?.[id]);
    return [];
  }

  function scheduleStudentNames(entry) {
    return scheduleStudentIds(entry).map(id => String(teacherStudentDb.students?.[id]?.name || 'Mokinys').trim() || 'Mokinys');
  }

  function scheduleRunRooms(run) {
    const rooms = run?.rooms && typeof run.rooms === 'object' ? run.rooms : {};
    return Object.values(rooms).map(value => String(value?.roomId || value || '').trim().toUpperCase()).filter(Boolean);
  }

  function requestSchedule(detail) {
    if (role() !== 'teacher') return;
    window.dispatchEvent(new CustomEvent('p2:schedule-request', { detail }));
  }

  function ensureScheduleModal() {
    if (scheduleModal) return scheduleModal;
    scheduleModal = document.createElement('div');
    scheduleModal.className = 'p2-schedule-modal';
    scheduleModal.hidden = true;
    scheduleModal.innerHTML = `
      <div class="p2-schedule-backdrop" data-schedule-close></div>
      <section class="p2-schedule-panel" role="dialog" aria-modal="true" aria-label="Pamokų tvarkaraštis">
        <header class="p2-schedule-header">
          <div><span class="p2-side-kicker">SAVAITINIS PLANAS</span><h2>Tvarkaraštis</h2><p>Pirmiausia sukurk pamoką ir jos laiką. Tada atidaryk pamoką, priskirk mokinius bei pratybas ir vienu mygtuku atverk visą pamoką.</p></div>
          <button type="button" data-schedule-close aria-label="Uždaryti">×</button>
        </header>
        <div class="p2-schedule-body">
          <main class="p2-schedule-week-pane" id="p2ScheduleWeekPane"></main>
          <aside class="p2-schedule-editor-pane" id="p2ScheduleEditorPane"></aside>
        </div>
      </section>`;
    document.body.appendChild(scheduleModal);
    scheduleModal.querySelectorAll('[data-schedule-close]').forEach(el => el.addEventListener('click', () => { scheduleModal.hidden = true; editingScheduleId = ''; scheduleCreateMode = false; }));
    return scheduleModal;
  }

  function renderScheduleModal() {
    if (!scheduleModal || scheduleModal.hidden) return;
    const weekHost = scheduleModal.querySelector('#p2ScheduleWeekPane');
    const editorHost = scheduleModal.querySelector('#p2ScheduleEditorPane');
    if (!weekHost || !editorHost) return;

    const entries = scheduleEntriesList();
    const today = scheduleTodayIndex();
    const selectedDay = scheduleSelectedDay >= 1 && scheduleSelectedDay <= 7 ? scheduleSelectedDay : today;
    scheduleSelectedDay = selectedDay;
    const todayKey = localDateKey();
    const students = studentList();
    const editing = editingScheduleId ? teacherStudentDb.scheduleEntries?.[editingScheduleId] || null : null;
    const editorVisible = Boolean(editing || scheduleCreateMode);
    const scheduleBody = scheduleModal.querySelector('.p2-schedule-body');
    if (scheduleBody) scheduleBody.classList.toggle('is-editor-closed', !editorVisible);
    editorHost.hidden = !editorVisible;

    const dayColumns = SCHEDULE_DAYS.map(day => {
      const dayEntries = entries.filter(item => Number(item.day) === day.id);
      const cards = dayEntries.length ? dayEntries.map(entry => {
        const names = scheduleStudentNames(entry);
        const run = teacherStudentDb.scheduleRuns?.[entry.id]?.[todayKey] || null;
        const practice = entry.lessonId ? (entry.practiceTitle || lessonForId(entry.lessonId)?.shortTitle || 'Pratybos') : '';
        const duration = Math.max(15, Number(entry.durationMinutes || 40));
        const label = String(entry.label || '').trim();
        const conflict = scheduleFindConflict(entry.day, entry.start, duration, entry.id);
        return `<article class="p2-schedule-card ${editingScheduleId === entry.id ? 'is-editing' : ''} ${run ? 'is-started' : ''} ${conflict ? 'has-conflict' : ''}" data-schedule-card="${escapeHtml(entry.id)}">
          <div class="p2-schedule-card-time"><strong>${escapeHtml(entry.start || '—')}</strong><span>${duration} min.</span></div>
          <div class="p2-schedule-card-copy">
            ${label ? `<h4>${escapeHtml(label)}</h4>` : '<h4>Pamoka</h4>'}
            <div class="p2-schedule-card-students">${names.length ? names.map(name => `<span>${escapeHtml(name)}</span>`).join('') : '<em>Mokiniai dar nepriskirti</em>'}</div>
            ${practice ? `<p>▦ ${escapeHtml(practice)}</p>` : '<p>□ Pratybos dar nepriskirtos</p>'}
            ${run ? `<small>✓ Šiandien pirmą kartą atidaryta ${escapeHtml(formatScheduleClock(run.startedAt || 0))}</small>` : ''}
            ${conflict ? '<small class="p2-schedule-conflict">⚠ Persidengia su kita pamoka</small>' : ''}
          </div>
        </article>`;
      }).join('') : '<div class="p2-schedule-day-empty">Pamokų nėra</div>';
      return `<section class="p2-schedule-day ${day.id === today ? 'is-today' : ''} ${day.id === selectedDay ? 'is-selected' : ''}" data-schedule-day="${day.id}">
        <header data-schedule-select-day="${day.id}" title="Pasirinkti ${escapeHtml(day.label)} naujai pamokai"><span>${escapeHtml(day.short)}</span><strong>${escapeHtml(day.label)}</strong>${day.id === today ? '<b>Šiandien</b>' : ''}</header>
        <div class="p2-schedule-day-list">${cards}</div>
      </section>`;
    }).join('');

    weekHost.innerHTML = `
      <div class="p2-schedule-week-toolbar">
        <div><span class="p2-label">Savaitė</span><strong>${entries.length} ${entries.length === 1 ? 'pamoka' : 'pamokos'}</strong></div>
        <button type="button" class="p2-secondary" data-schedule-new>＋ Nauja pamoka</button>
      </div>
      <div class="p2-schedule-week-grid">${dayColumns}</div>`;

    if (scheduleCreateMode && !editing) {
      const editDay = selectedDay;
      const editStart = defaultScheduleTime();
      const dayOptions = SCHEDULE_DAYS.map(day => `<option value="${day.id}" ${day.id === editDay ? 'selected' : ''}>${escapeHtml(day.label)}</option>`).join('');
      editorHost.innerHTML = `
        <div class="p2-schedule-editor-head"><button type="button" class="p2-schedule-editor-close" data-schedule-editor-close aria-label="Uždaryti naujos pamokos formą">×</button><span class="p2-label">NAUJA PAMOKA</span><h3>Sukurti pamoką</h3><p class="p2-schedule-editor-note">Pirmiausia nustatyk tik pamokos vietą tvarkaraštyje. Mokinius ir pratybas priskirsi atidaręs sukurtą pamoką.</p></div>
        <div class="p2-schedule-form">
          <div class="p2-schedule-form-row two">
            <label><span>Savaitės diena</span><select id="p2ScheduleDay">${dayOptions}</select></label>
            <label><span>Pradžia</span><input id="p2ScheduleStart" type="time" value="${escapeHtml(editStart)}" step="300"></label>
          </div>
          <label><span>Trukmė (min.)</span><input id="p2ScheduleDuration" type="number" min="15" max="180" step="5" value="40"></label>
          <label><span>Pavadinimas <small>nebūtina</small></span><input id="p2ScheduleLabel" maxlength="80" value="" placeholder="Pvz. VBE pasiruošimas"></label>
          <div class="p2-schedule-form-actions p2-schedule-form-actions-single">
            <span></span><button type="button" class="p2-primary" data-schedule-create>Sukurti pamoką</button>
          </div>
        </div>`;
    } else if (editing) {
      const editDay = Number(editing.day || today);
      const editStart = String(editing.start || defaultScheduleTime());
      const editDuration = Math.max(15, Math.min(180, Number(editing.durationMinutes || 40)));
      const editLabel = String(editing.label || '');
      const editLessonId = String(editing.lessonId || '');
      const selectedIds = new Set(scheduleStudentIds(editing));
      const run = teacherStudentDb.scheduleRuns?.[editingScheduleId]?.[todayKey] || null;
      const runRooms = scheduleRunRooms(run);
      const dayOptions = SCHEDULE_DAYS.map(day => `<option value="${day.id}" ${day.id === editDay ? 'selected' : ''}>${escapeHtml(day.label)}</option>`).join('');
      const lessonOptions = LESSON_CATALOG.map(lesson => `<option value="${escapeHtml(lesson.id)}" ${lesson.id === editLessonId ? 'selected' : ''}>${escapeHtml(lesson.shortTitle)} · ${lesson.taskCount} užd.</option>`).join('');
      const studentChecks = students.length ? students.map(student => `<label class="p2-schedule-student-check"><input type="checkbox" value="${escapeHtml(student.id)}" ${selectedIds.has(student.id) ? 'checked' : ''}><span class="p2-student-avatar">${escapeHtml(String(student.name || 'M').trim().slice(0,1).toUpperCase() || 'M')}</span><strong>${escapeHtml(student.name || 'Mokinys')}</strong></label>`).join('') : '<div class="p2-schedule-no-students">Pirmiausia sukurk mokinius skiltyje „Mokiniai“.</div>';
      const openCaption = run && runRooms.length ? 'Atidaryti pamoką' : 'Atidaryti pamoką';
      const openHint = run && runRooms.length
        ? `Šiandienos pamoka jau pradėta ${escapeHtml(formatScheduleClock(run.startedAt || 0))}. Atidarysi esamas mokinių lentas.`
        : selectedIds.size
          ? 'Atidarius pirmą kartą kiekvienam priskirtam mokiniui bus sukurta atskira lenta ir mokinių skirtukai.'
          : 'Priskirk bent vieną mokinį, kad galėtum atidaryti visą pamoką.';

      editorHost.innerHTML = `
        <div class="p2-schedule-editor-head"><button type="button" class="p2-schedule-editor-close" data-schedule-editor-close aria-label="Uždaryti pamokos nustatymus">×</button><span class="p2-label">PAMOKA</span><h3>${escapeHtml(editLabel || `${SCHEDULE_DAYS.find(day => day.id === editDay)?.label || 'Pamoka'} ${editStart}`)}</h3><p class="p2-schedule-editor-note">Čia valdai pačią pamoką: jos laiką, dalyvius ir pratybas.</p></div>
        <div class="p2-schedule-form">
          <div class="p2-schedule-form-row two">
            <label><span>Savaitės diena</span><select id="p2ScheduleDay">${dayOptions}</select></label>
            <label><span>Pradžia</span><input id="p2ScheduleStart" type="time" value="${escapeHtml(editStart)}" step="300"></label>
          </div>
          <label><span>Trukmė (min.)</span><input id="p2ScheduleDuration" type="number" min="15" max="180" step="5" value="${editDuration}"></label>
          <label><span>Pavadinimas <small>nebūtina</small></span><input id="p2ScheduleLabel" maxlength="80" value="${escapeHtml(editLabel)}" placeholder="Pvz. VBE pasiruošimas"></label>
          <fieldset class="p2-schedule-students-field"><legend>Pamokos mokiniai</legend><div>${studentChecks}</div></fieldset>
          <label><span>Pratybos <small>nebūtina</small></span><select id="p2ScheduleLesson"><option value="">Tik lenta / pratybas priskirsiu vėliau</option>${lessonOptions}</select></label>
          <div class="p2-schedule-open-box ${run ? 'is-running' : ''}">
            <div><strong>${run ? 'Šiandienos pamoka paruošta' : 'Visa pamoka'}</strong><span>${openHint}</span></div>
            <button type="button" class="p2-primary" data-schedule-open-lesson ${selectedIds.size ? '' : 'disabled'}>${openCaption}</button>
          </div>
          ${run ? '<p class="p2-schedule-run-note">Pakeitimai mokinių sąraše ar pratybose bus naudojami kitą kartą pradedant šią savaitinę pamoką; jau sukurtos šiandienos lentos neperrašomos.</p>' : ''}
          <div class="p2-schedule-form-actions">
            <button type="button" class="p2-student-danger" data-schedule-delete>Pašalinti pamoką</button>
            <button type="button" class="p2-primary" data-schedule-save>Išsaugoti pakeitimus</button>
          </div>
        </div>`;
    }

    weekHost.querySelector('[data-schedule-new]')?.addEventListener('click', () => { editingScheduleId = ''; scheduleCreateMode = true; renderScheduleModal(); });
    const selectScheduleDay = day => {
      if (day < 1 || day > 7) return;
      scheduleSelectedDay = day;
      weekHost.querySelectorAll('[data-schedule-day]').forEach(column => column.classList.toggle('is-selected', Number(column.dataset.scheduleDay || 0) === day));
      if (scheduleCreateMode && !editingScheduleId) {
        const select = editorHost.querySelector('#p2ScheduleDay');
        if (select) select.value = String(day);
      }
    };
    weekHost.querySelectorAll('[data-schedule-select-day]').forEach(header => header.addEventListener('click', () => {
      selectScheduleDay(Number(header.dataset.scheduleSelectDay || 0));
    }));
    weekHost.querySelectorAll('[data-schedule-day]').forEach(column => column.addEventListener('click', event => {
      if (event.target.closest('[data-schedule-card], button, input, select, textarea')) return;
      selectScheduleDay(Number(column.dataset.scheduleDay || 0));
    }));
    // Visa pamokos kortelė yra vienintelis pagrindinis įėjimas į jos informaciją.
    // Atskiro „Tvarkyti“ mygtuko nebėra: vienas paspaudimas bet kurioje laisvoje
    // kortelės vietoje atveria pamokos valdymo panelę.
    weekHost.querySelectorAll('[data-schedule-card]').forEach(card => card.addEventListener('click', event => {
      if (event.target.closest('button, input, select, textarea, a')) return;
      const scheduleId = String(card.dataset.scheduleCard || '');
      if (!scheduleId) return;
      editingScheduleId = scheduleId;
      scheduleCreateMode = false;
      const entry = teacherStudentDb.scheduleEntries?.[scheduleId];
      if (entry) scheduleSelectedDay = Number(entry.day || scheduleSelectedDay || today);
      renderScheduleModal();
    }));


    editorHost.querySelector('[data-schedule-editor-close]')?.addEventListener('click', () => {
      editingScheduleId = '';
      scheduleCreateMode = false;
      renderScheduleModal();
    });

    editorHost.querySelector('[data-schedule-create]')?.addEventListener('click', () => {
      const day = Number(editorHost.querySelector('#p2ScheduleDay')?.value || 0);
      const start = String(editorHost.querySelector('#p2ScheduleStart')?.value || '').trim();
      const durationMinutes = Number(editorHost.querySelector('#p2ScheduleDuration')?.value || 40);
      const label = String(editorHost.querySelector('#p2ScheduleLabel')?.value || '').trim();
      if (!start) { toast('Pasirink pamokos pradžios laiką'); return; }
      const conflict = scheduleFindConflict(day, start, durationMinutes);
      if (conflict) { toast(scheduleConflictText(conflict)); return; }
      scheduleSelectedDay = day;
      const button = editorHost.querySelector('[data-schedule-create]');
      if (button) { button.disabled = true; button.textContent = 'Kuriama…'; }
      requestSchedule({ action: 'add', day, start, durationMinutes, label, studentIds: [], lessonId: '', practiceTitle: '', taskCount: 0, attemptPolicy: null });
    });

    editorHost.querySelector('[data-schedule-save]')?.addEventListener('click', () => {
      if (!editingScheduleId) return;
      const day = Number(editorHost.querySelector('#p2ScheduleDay')?.value || 0);
      const start = String(editorHost.querySelector('#p2ScheduleStart')?.value || '').trim();
      const durationMinutes = Number(editorHost.querySelector('#p2ScheduleDuration')?.value || 40);
      const label = String(editorHost.querySelector('#p2ScheduleLabel')?.value || '').trim();
      const lessonId = String(editorHost.querySelector('#p2ScheduleLesson')?.value || '').trim();
      const lesson = lessonForId(lessonId);
      const studentIds = Array.from(editorHost.querySelectorAll('.p2-schedule-student-check input:checked')).map(input => input.value);
      if (!start) { toast('Pasirink pamokos pradžios laiką'); return; }
      const conflict = scheduleFindConflict(day, start, durationMinutes, editingScheduleId);
      if (conflict) { toast(scheduleConflictText(conflict)); return; }
      scheduleSelectedDay = day;
      requestSchedule({
        action: 'update', scheduleId: editingScheduleId,
        day, start, durationMinutes, label, studentIds,
        lessonId: lesson?.id || '', practiceTitle: lesson?.shortTitle || '', taskCount: lesson?.taskCount || 0,
        attemptPolicy: lesson ? normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy }) : null,
        ...(lesson ? assignmentContentDetail(lesson) : { schemaVersion: P2_DATA_SCHEMA_VERSION })
      });
    });

    const syncScheduleOpenButton = () => {
      const openButton = editorHost.querySelector('[data-schedule-open-lesson]');
      if (!openButton) return;
      const run = teacherStudentDb.scheduleRuns?.[editingScheduleId]?.[todayKey] || null;
      const hasExistingRooms = scheduleRunRooms(run).length > 0;
      const hasSelectedStudents = editorHost.querySelectorAll('.p2-schedule-student-check input:checked').length > 0;
      openButton.disabled = !hasExistingRooms && !hasSelectedStudents;
    };
    editorHost.querySelectorAll('.p2-schedule-student-check input').forEach(input => input.addEventListener('change', syncScheduleOpenButton));

    editorHost.querySelector('[data-schedule-open-lesson]')?.addEventListener('click', () => {
      if (!editingScheduleId) return;
      const run = teacherStudentDb.scheduleRuns?.[editingScheduleId]?.[todayKey] || null;
      const runRooms = scheduleRunRooms(run);
      if (runRooms.length) {
        const button = editorHost.querySelector('[data-schedule-open-lesson]');
        if (button) { button.disabled = true; button.textContent = 'Atidaroma…'; }
        // Net jau pradėtą pamoką atidarome per schedule valdiklį: jis P4-P1.2
        // patikrina / atkuria bendrą classSession indeksą, todėl visų mokinių
        // skirtukai atsiranda ir seniau P4-P1.1 sukurtoms šiandienos pamokoms.
        requestSchedule({ action: 'start', scheduleId: editingScheduleId, dateKey: todayKey });
        return;
      }
      const studentIds = Array.from(editorHost.querySelectorAll('.p2-schedule-student-check input:checked')).map(input => input.value);
      if (!studentIds.length) { toast('Priskirk bent vieną mokinį'); return; }
      // Prieš pirmą atidarymą išsaugome dabartinę pamokos kortelę, kad
      // kuriamos Room tiksliai atitiktų tai, ką mokytojas mato ekrane.
      const day = Number(editorHost.querySelector('#p2ScheduleDay')?.value || 0);
      const start = String(editorHost.querySelector('#p2ScheduleStart')?.value || '').trim();
      const durationMinutes = Number(editorHost.querySelector('#p2ScheduleDuration')?.value || 40);
      const label = String(editorHost.querySelector('#p2ScheduleLabel')?.value || '').trim();
      const lessonId = String(editorHost.querySelector('#p2ScheduleLesson')?.value || '').trim();
      const lesson = lessonForId(lessonId);
      const conflict = scheduleFindConflict(day, start, durationMinutes, editingScheduleId);
      if (conflict) { toast(scheduleConflictText(conflict)); return; }
      scheduleSelectedDay = day;
      const button = editorHost.querySelector('[data-schedule-open-lesson]');
      if (button) { button.disabled = true; button.textContent = 'Atidaroma…'; }
      requestSchedule({
        action: 'update-and-start', scheduleId: editingScheduleId, dateKey: todayKey,
        day, start, durationMinutes, label, studentIds,
        lessonId: lesson?.id || '', practiceTitle: lesson?.shortTitle || '', taskCount: lesson?.taskCount || 0,
        attemptPolicy: lesson ? normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy }) : null,
        ...(lesson ? assignmentContentDetail(lesson) : { schemaVersion: P2_DATA_SCHEMA_VERSION })
      });
    });

    editorHost.querySelector('[data-schedule-delete]')?.addEventListener('click', () => {
      if (!editingScheduleId) return;
      if (!window.confirm('Pašalinti šią pamoką iš savaitinio tvarkaraščio? Jau įvykusių pamokų istorija liks.')) return;
      requestSchedule({ action: 'delete', scheduleId: editingScheduleId });
      editingScheduleId = '';
      scheduleCreateMode = false;
    });
  }

  function openSchedule() {
    if (role() !== 'teacher') return;
    if (scheduleSelectedDay < 1 || scheduleSelectedDay > 7) scheduleSelectedDay = scheduleTodayIndex();
    ensureScheduleModal();
    editingScheduleId = '';
    scheduleCreateMode = false;
    scheduleModal.hidden = false;
    renderScheduleModal();
  }

  const originalStudentsButton = document.getElementById('studentsButton');
  if (originalStudentsButton) originalStudentsButton.addEventListener('click', openStudentsDatabase);
  const originalScheduleButton = document.getElementById('scheduleButton');
  if (originalScheduleButton) originalScheduleButton.addEventListener('click', openSchedule);

  function queueCurrentStudentLessonSnapshot() {
    if (role() !== 'teacher' || roomSwitching) return;
    clearTimeout(studentDbSnapshotTimer);
    const scheduledRoomId = currentRoomId();
    studentDbSnapshotTimer = setTimeout(() => {
      if (roomSwitching || currentRoomId() !== scheduledRoomId) return;
      const roomId = scheduledRoomId;
      const studentId = linkedStudentIdForRoom(roomId);
      if (!roomId || !studentId) return;
      const state = progress ? normalizedProgress(progress) : null;
      let summary = { status: state?.status || 'not_started', finished: 0, solved: 0, good: 0, help: 0, repeat: 0, percent: 0, taskCount: assignment?.taskCount || 0, currentTaskId: state?.currentTaskId || null };
      if (assignment && state) summary = { ...summary, ...progressStats(), status: state.status, taskCount: activeLesson().taskCount, currentTaskId: state.currentTaskId };
      requestStudentDb({
        action: 'snapshot', studentId, roomId,
        lessonId: assignment?.lessonId || '',
        title: assignment ? activeLesson().shortTitle : '',
        taskCount: assignment ? activeLesson().taskCount : 0,
        assignmentKey: assignment?.assignmentKey || '',
        assignedAt: Number(assignment?.assignedAt || 0) || null,
        contentVersion: Number(assignment?.contentVersion || activeLesson()?.contentVersion || 1),
        contentHash: String(assignment?.contentHash || ''),
        taskIds: Array.isArray(assignment?.taskIds) ? assignment.taskIds : activeLesson().tasks.map(task => task.id),
        contentSnapshot: assignment?.contentSnapshot || lessonContentSnapshot(activeLesson()),
        schemaVersion: P2_DATA_SCHEMA_VERSION,
        summary
      });
    }, 450);
  }

  window.addEventListener('p2:room-student-state', event => {
    roomStudentProfile = event.detail && typeof event.detail === 'object' ? event.detail : null;
    updateStudentIdentityLabels();
    renderLessonStudentTabs();
    renderPanels();
    renderTeacherPreview();
    renderStudentsModal();
  });

  window.addEventListener('p2:room-switch-start', () => {
    roomSwitching = true;
    clearTimeout(studentDbSnapshotTimer);
    studentDbSnapshotTimer = null;
    // Senos Room pedagoginę būseną atjungiame lokaliai, bet sąmoningai
    // neuždarome mokytojo pratybų peržiūros režimo. Naujo mokinio assignment
    // ir progress netrukus ateis iš jo Firebase Room.
    roomStudentProfile = null;
    assignment = null;
    progress = null;
    selectedAnswers = {};
  });

  window.addEventListener('p2:room-switch-complete', () => {
    roomSwitching = false;
    updateStudentIdentityLabels();
    renderLessonStudentTabs();
    renderPanels();
    renderTeacherPreview();
    renderStudentsModal();
    queueCurrentStudentLessonSnapshot();
  });

  window.addEventListener('p2:room-switch-error', () => {
    roomSwitching = false;
    renderLessonStudentTabs();
    renderStudentsModal();
    toast('Nepavyko perjungti mokinio lentos');
  });

  window.addEventListener('p2:students-state', event => {
    teacherStudentDb = normalizeTeacherStudentDb(event.detail);
    queueLegacyAssignmentBackfills();
    if (selectedStudentId && !teacherStudentDb.students?.[selectedStudentId]) selectedStudentId = null;
    updateStudentIdentityLabels();
    renderLessonStudentTabs();

    // Grįžus iš istorinės lentos tame pačiame skirtuke, atstatome būtent
    // tą mokinio kortelę, iš kurios pamoka buvo atidaryta.
    if (role() === 'teacher') {
      let reopenStudentId = '';
      try { reopenStudentId = String(sessionStorage.getItem(STUDENT_CARD_REOPEN_KEY) || '').trim(); } catch (_) {}
      if (reopenStudentId && teacherStudentDb.students?.[reopenStudentId]) {
        selectedStudentId = reopenStudentId;
        try {
          sessionStorage.removeItem(STUDENT_CARD_REOPEN_KEY);
          sessionStorage.removeItem(STUDENT_HISTORY_RETURN_KEY);
        } catch (_) {}
        openStudentsDatabase();
        return;
      }
    }
    renderStudentsModal();
    renderScheduleModal();
  });

  const resetBackupButton = () => {
    const button = studentsModal?.querySelector('[data-student-backup]');
    if (button) { button.disabled = false; button.textContent = '↓ Atsisiųsti atsarginę kopiją'; }
  };
  window.addEventListener('p2:backup-complete', resetBackupButton);
  window.addEventListener('p2:backup-error', resetBackupButton);

  window.addEventListener('p2:schedule-saved', event => {
    const scheduleId = String(event.detail?.scheduleId || '').trim();
    if (scheduleId) {
      const entry = teacherStudentDb.scheduleEntries?.[scheduleId];
      if (entry) scheduleSelectedDay = Number(entry.day || scheduleSelectedDay || scheduleTodayIndex());
    }
    editingScheduleId = '';
    scheduleCreateMode = false;
    renderScheduleModal();
  });

  window.addEventListener('p2:schedule-started', event => {
    const firstRoom = String(event.detail?.firstRoom || '').trim().toUpperCase();
    if (scheduleModal) scheduleModal.hidden = true;
    editingScheduleId = '';
    scheduleCreateMode = false;
    if (firstRoom && firstRoom !== currentRoomId()) requestTeacherRoomSwitch(firstRoom, false);
  });

  window.addEventListener('p2:schedule-error', () => {
    renderScheduleModal();
  });

  const originalLibraryButton = document.getElementById('libraryButton');
  if (originalLibraryButton) {
    const button = originalLibraryButton.cloneNode(true);
    originalLibraryButton.replaceWith(button);
    button.id = 'libraryButton';
    button.addEventListener('click', () => {
      if (role() !== 'teacher') return;
      openPrototypeLibrary();
    });
  }

  function ensureLibraryModal() {
    if (libraryModal) return libraryModal;
    libraryModal = document.createElement('div');
    libraryModal.className = 'p2-library-modal';
    libraryModal.innerHTML = `
      <div class="p2-library-backdrop" data-close></div>
      <section class="p2-library-panel p2-library-panel-wide" role="dialog" aria-modal="true" aria-label="Mokytojo biblioteka">
        <header><div><span class="p2-side-kicker">P2 PROTOTIPAS</span><h2>Biblioteka</h2></div><button type="button" data-close aria-label="Uždaryti">×</button></header>
        <div class="p2-library-body" id="p2LibraryBody"></div>
      </section>`;
    document.body.appendChild(libraryModal);
    libraryModal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => libraryModal.hidden = true));
    return libraryModal;
  }

  function openPrototypeLibrary() {
    ensureLibraryModal();
    renderLibraryContent();
    libraryModal.hidden = false;
  }

  function renderLibraryContent() {
    if (!libraryModal) return;
    const host = libraryModal.querySelector('#p2LibraryBody');
    if (!host) return;

    const cards = LESSON_CATALOG.map(lesson => {
      const assigned = assignment?.lessonId === lesson.id;
      const policy = assigned
        ? normalizedAttemptPolicy(assignment)
        : normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy });
      const replacing = Boolean(assignment && !assigned);
      const icon = lesson.id === GRADE5_REVIEW_LESSON.id ? '5'
        : lesson.id === GRADE7_REVIEW_LESSON.id ? '7'
          : 'ƒ';
      const label = lesson.id === GRADE5_REVIEW_LESSON.id ? '5 KLASĖS KARTOJIMAS'
        : lesson.id === GRADE7_REVIEW_LESSON.id ? '7 KLASĖS KARTOJIMAS'
          : 'LYGČIŲ DIAGNOSTIKA';
      return `
        <article class="p2-library-lesson-card ${assigned ? 'is-assigned' : ''}" data-library-lesson="${escapeHtml(lesson.id)}">
          <div class="p2-library-lesson-icon" aria-hidden="true">${icon}</div>
          <div class="p2-library-lesson-copy">
            <span class="p2-label">${label}</span>
            <h3>${escapeHtml(lesson.shortTitle)}</h3>
            <p>${escapeHtml(lesson.description)}</p>
            <div class="p2-assignment-meta"><span>${lesson.taskCount} užduotys</span><span>${lesson.classCount} pamokoje</span><span>${lesson.selfCount} savarankiškai</span></div>
          </div>
          <div class="p2-library-lesson-actions">
            <div class="p2-library-attempt-summary">
              <span>Bandymų nustatymas</span>
              <b>${escapeHtml(policySummary({ attemptPolicy: policy }))}</b>
              <small>${assigned ? 'Keisk išplėstinėje mokytojo pratybų peržiūroje.' : 'Numatyta: 3 bandymai. Po priskyrimo galėsi nustatyti ir kiekvienai užduočiai atskirai.'}</small>
            </div>
            ${assigned
              ? `<span class="p2-status-badge is-assigned">✓ Priskirta</span><button class="p2-secondary" type="button" data-library-action="unassign" data-lesson-id="${escapeHtml(lesson.id)}">Atšaukti priskyrimą</button>`
              : `<button class="p2-primary" type="button" data-library-action="assign" data-lesson-id="${escapeHtml(lesson.id)}">${replacing ? 'Priskirti vietoje dabartinės' : 'Priskirti mokiniui'}</button>`}
          </div>
        </article>`;
    }).join('');

    host.innerHTML = `
      <div class="p2-library-intro"><div><span class="p2-label">Mokytojo biblioteka</span><h3>Pasirink pamoką mokiniui</h3><p>Priskirta pamoka iškart atsiras mokinio „Mano pratybos“ srityje. Vienu metu aktyvi viena pamoka; kitą gali priskirti vėliau.</p></div></div>
      <div class="p2-library-lesson-list">${cards}</div>
      <div class="p2-library-flow"><span>Biblioteka</span><b>→</b><span>Priskirti</span><b>→</b><span>Mokinio „Mano pratybos“</span><b>→</b><span>Mokinio eiga</span></div>
    `;

    host.querySelectorAll('[data-library-action="assign"]').forEach(button => {
      button.addEventListener('click', () => {
        const lesson = lessonForId(button.dataset.lessonId);
        if (!lesson) return;
        if (assignment && assignment.lessonId !== lesson.id) {
          const current = lessonForId(assignment.lessonId);
          const ok = window.confirm(`Dabar priskirta „${current?.shortTitle || assignment.title || 'kita pamoka'}“. Pakeisti ją į „${lesson.shortTitle}“?`);
          if (!ok) return;
        }
        const attemptPolicy = normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy });
        window.dispatchEvent(new CustomEvent('p2:assignment-request', {
          detail: { action: 'assign', lessonId: lesson.id, title: lesson.title, taskCount: lesson.taskCount, attemptPolicy, ...assignmentContentDetail(lesson) }
        }));
        toast('Pamoka priskiriama mokiniui…');
      });
    });

    host.querySelectorAll('[data-library-action="unassign"]').forEach(button => {
      button.addEventListener('click', () => {
        const lesson = lessonForId(button.dataset.lessonId) || activeLesson();
        if (!window.confirm(`Atšaukti pamokos „${lesson.shortTitle}“ priskyrimą ir išvalyti mokinio eigą?`)) return;
        window.dispatchEvent(new CustomEvent('p2:assignment-request', { detail: { action: 'unassign', lessonId: lesson.id } }));
        toast('Priskyrimas atšaukiamas…');
      });
    });
  }

  function ensureTeacherPreviewWindow() {
    if (teacherPreviewWindow) return teacherPreviewWindow;
    teacherPreviewWindow = document.createElement('section');
    teacherPreviewWindow.className = 'p2-teacher-practice-window';
    teacherPreviewWindow.hidden = true;
    teacherPreviewWindow.setAttribute('aria-label', 'Mokytojo pratybų peržiūra');
    teacherPreviewWindow.innerHTML = `
      <header class="p2-practice-window-chrome">
        <div class="p2-practice-window-title">
          <span class="p2-side-kicker">MOKYTOJO PERŽIŪRA</span>
          <strong>${escapeHtml(activeLesson().shortTitle)}</strong>
        </div>
        <div class="p2-practice-window-controls" aria-label="Pratybų peržiūros lango valdymas">
          <button type="button" data-preview-window="minimize" title="Minimizuoti" aria-label="Minimizuoti">—</button>
          <button type="button" data-preview-window="maximize" title="Išplėsti" aria-label="Išplėsti">□</button>
          <button type="button" data-preview-window="close" title="Uždaryti" aria-label="Uždaryti">×</button>
        </div>
      </header>
      <div class="p2-teacher-practice-window-body" id="p2TeacherPreviewBody"></div>`;
    sidePane.appendChild(teacherPreviewWindow);
    teacherPreviewWindow.querySelector('[data-preview-window="minimize"]')?.addEventListener('click', () => {
      setTeacherPreviewMode(teacherPreviewMode === 'minimized' ? 'docked' : 'minimized');
    });
    teacherPreviewWindow.querySelector('[data-preview-window="maximize"]')?.addEventListener('click', () => {
      if (teacherPreviewMode === 'maximized') setTeacherPreviewMode(teacherPreviewRestoreMode || 'docked');
      else setTeacherPreviewMode('maximized');
    });
    teacherPreviewWindow.querySelector('[data-preview-window="close"]')?.addEventListener('click', () => setTeacherPreviewMode('closed'));
    teacherPreviewWindow.querySelector('.p2-practice-window-title')?.addEventListener('dblclick', () => {
      if (teacherPreviewMode === 'minimized') setTeacherPreviewMode('docked');
      else setTeacherPreviewMode(teacherPreviewMode === 'maximized' ? teacherPreviewRestoreMode || 'docked' : 'maximized');
    });
    return teacherPreviewWindow;
  }

  function setTeacherSideHeader(previewActive = false) {
    if (role() !== 'teacher') return;
    sideKicker.textContent = previewActive ? 'MOKYTOJO PERŽIŪRA' : 'MOKYTOJO STEBĖJIMAS';
    sideTitle.textContent = previewActive ? 'Pratybų peržiūra' : `${currentStudentName('Mokinys')} · eiga`;
  }

  function setTeacherPreviewMode(nextMode) {
    if (role() !== 'teacher') return;
    const preview = ensureTeacherPreviewWindow();
    const mode = ['closed','docked','minimized','maximized'].includes(nextMode) ? nextMode : 'docked';
    if (mode === 'maximized' && teacherPreviewMode !== 'maximized') {
      teacherPreviewRestoreMode = teacherPreviewMode === 'minimized' ? 'minimized' : 'docked';
    }
    teacherPreviewMode = mode;
    preview.hidden = mode === 'closed';
    preview.classList.toggle('is-docked', mode === 'docked');
    preview.classList.toggle('is-minimized', mode === 'minimized');
    preview.classList.toggle('is-maximized', mode === 'maximized');
    body.classList.toggle('p2-teacher-preview-maximized', mode === 'maximized');
    sidePane.classList.toggle('has-preview-docked', mode === 'docked');

    if (preview.parentElement !== sidePane) sidePane.appendChild(preview);
    if (teacherPanel) teacherPanel.hidden = mode === 'docked';
    setTeacherSideHeader(mode === 'docked');

    const minButton = preview.querySelector('[data-preview-window="minimize"]');
    const maxButton = preview.querySelector('[data-preview-window="maximize"]');
    if (minButton) {
      minButton.textContent = mode === 'minimized' ? '▣' : '—';
      minButton.title = mode === 'minimized' ? 'Atkurti dešinėje' : 'Minimizuoti';
      minButton.setAttribute('aria-label', minButton.title);
    }
    if (maxButton) {
      maxButton.textContent = mode === 'maximized' ? '❐' : '□';
      maxButton.title = mode === 'maximized' ? 'Atkurti ankstesnį dydį' : 'Išplėsti';
      maxButton.setAttribute('aria-label', maxButton.title);
    }
    if (mode !== 'closed') renderTeacherPreview();
  }

  function openTeacherPreview() {
    if (!assignment) return;
    if (!teacherPreviewTaskId || teacherFollowStudent) teacherPreviewTaskId = currentTask().id;
    setTeacherPreviewMode('docked');
  }

  function teacherPreviewTask() {
    return activeLesson().tasks.find(task => task.id === teacherPreviewTaskId) || currentTask();
  }

  function setAttemptPolicy(nextPolicy, message = 'Bandymų nustatymai atnaujinti') {
    if (!assignment || role() !== 'teacher') return;
    const normalized = normalizedAttemptPolicy({ attemptPolicy: nextPolicy });
    assignment = { ...assignment, attemptPolicy: normalized };
    pendingAttemptPolicy = normalized;
    renderTeacherPanel();
    renderLibraryContent();
    renderTeacherPreview();
    window.dispatchEvent(new CustomEvent('p2:assignment-request', { detail: { action: 'settings', attemptPolicy: normalized } }));
    toast(message);
  }

  function attemptSettingsMarkup(previewTask) {
    const policy = normalizedAttemptPolicy(assignment);
    const global = policy.defaultMaxAttempts;
    const limits = [1, 2, 3, 0];
    const globalButtons = limits.map(limit => `<button type="button" class="${global === limit ? 'is-active' : ''}" data-attempt-global="${limit}">${attemptLimitLabel(limit)}</button>`).join('');
    const taskRows = activeLesson().tasks.map((task, index) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(policy.taskMaxAttempts, task.id);
      const effective = attemptLimitForTask(task.id);
      const item = taskState(task.id);
      const options = [
        `<option value="inherit" ${hasOverride ? '' : 'selected'}>Bendras (${attemptLimitLabel(global)})</option>`,
        ...limits.map(limit => `<option value="${limit}" ${hasOverride && policy.taskMaxAttempts[task.id] === limit ? 'selected' : ''}>${limit === 0 ? 'Neribotai' : `${limit} ${limit === 1 ? 'bandymas' : 'bandymai'}`}</option>`)
      ].join('');
      return `
        <div class="p2-attempt-task-row ${task.id === previewTask.id ? 'is-current' : ''} ${hasOverride ? 'has-override' : ''}">
          <button type="button" class="p2-attempt-task-number" data-attempt-preview-task="${task.id}" title="Rodyti ${index + 1} užduotį">${index + 1}</button>
          <div class="p2-attempt-task-copy"><strong>${escapeHtml(task.label)}</strong><span>${Number(item.attempts || 0)} / ${effective === 0 ? '∞' : effective} panaudota</span></div>
          <select data-attempt-task="${task.id}" aria-label="${index + 1} užduoties bandymų skaičius">${options}</select>
        </div>`;
    }).join('');
    return `
      <aside class="p2-attempt-settings">
        <header class="p2-attempt-settings-head"><div><span class="p2-label">MOKYTOJO NUSTATYMAI</span><h3>Bandymų skaičius</h3></div><span class="p2-attempt-sync">● gyvai</span></header>
        <section class="p2-attempt-global-card">
          <div class="p2-attempt-setting-title"><strong>Bendras nustatymas</strong><span>Taikomas visoms užduotims be individualaus nustatymo.</span></div>
          <div class="p2-attempt-global-actions"><div class="p2-attempt-segment" aria-label="Bendras bandymų skaičius">${globalButtons}</div><button type="button" class="p2-attempt-apply-all" data-attempt-apply-all>Taikyti visoms</button></div>
        </section>
        <div class="p2-attempt-list-head"><strong>Individualiai</strong><span>„Bendras“ reiškia, kad užduotis paveldi aukščiau pasirinktą skaičių.</span></div>
        <div class="p2-attempt-task-list">${taskRows}</div>
        <p class="p2-attempt-note">Pakeitimai iškart perduodami mokiniui. Jei bandymų limitas jau išnaudotas, užduotis užrakinama ir žymima „Kartoti“.</p>
      </aside>`;
  }

  function bindAttemptSettings(host) {
    host.querySelectorAll('[data-attempt-global]').forEach(button => {
      button.addEventListener('click', () => {
        const policy = normalizedAttemptPolicy(assignment);
        policy.defaultMaxAttempts = normalizeAttemptLimit(button.dataset.attemptGlobal, policy.defaultMaxAttempts);
        setAttemptPolicy(policy, `Bendras limitas: ${attemptLimitLabel(policy.defaultMaxAttempts)}`);
      });
    });
    host.querySelector('[data-attempt-apply-all]')?.addEventListener('click', () => {
      const policy = normalizedAttemptPolicy(assignment);
      policy.taskMaxAttempts = {};
      setAttemptPolicy(policy, 'Bendras bandymų skaičius pritaikytas visoms užduotims');
    });
    host.querySelectorAll('[data-attempt-task]').forEach(select => {
      select.addEventListener('change', () => {
        const policy = normalizedAttemptPolicy(assignment);
        const taskId = select.dataset.attemptTask;
        if (select.value === 'inherit') delete policy.taskMaxAttempts[taskId];
        else policy.taskMaxAttempts[taskId] = normalizeAttemptLimit(select.value, policy.defaultMaxAttempts);
        setAttemptPolicy(policy, `${taskIndex(taskId) + 1} užduoties bandymų skaičius atnaujintas`);
      });
    });
    host.querySelectorAll('[data-attempt-preview-task]').forEach(button => {
      button.addEventListener('click', () => {
        teacherPreviewTaskId = button.dataset.attemptPreviewTask;
        teacherFollowStudent = false;
        renderTeacherPreview();
      });
    });
  }

  function teacherSolutionMarkup(task, item) {
    const response = solutionResponseForItem(item);
    const stepResults = Array.isArray(item.validationResult?.stepResults) ? item.validationResult.stepResults : [];
    const rows = response.steps.map((step, index) => {
      const result = stepResults[index] || null;
      const resultClass = result?.status === 'correct' ? ' is-correct' : result?.status === 'incorrect' ? ' is-error' : result?.status === 'warning' ? ' is-warning' : '';
      const stateMark = result?.status === 'correct' ? '✓' : result?.status === 'incorrect' ? '×' : result?.status === 'warning' ? '!' : '';
      const groupId = step?.type === 'alternatives' ? String(step?.branchGroupId || '') : '';
      const previous = response.steps[index - 1];
      const next = response.steps[index + 1];
      const previousSameGroup = Boolean(groupId && previous?.type === 'alternatives' && previous?.branchGroupId === groupId);
      const nextSameGroup = Boolean(groupId && next?.type === 'alternatives' && next?.branchGroupId === groupId);
      const groupClass = step?.type === 'alternatives' && groupId
        ? ` is-branch-group-${previousSameGroup ? (nextSameGroup ? 'middle' : 'end') : (nextSameGroup ? 'start' : 'single')}`
        : '';
      const continuationClass = step?.values?.some(value => String(value || '').trim().startsWith('=')) ? ' is-continuation-line' : '';
      const separatorLabel = previousSameGroup ? '' : 'arba';
      // Teacher preview must render the same LaTeX representation that the student MathLive field uses.
      // `values` is the plain/ASCII form used by validators (e.g. sqrt(D), /, *), and feeding it
      // back into <math-field> as LaTeX makes formulas look broken in the teacher view.
      const latexValues = Array.isArray(step?.latexValues) ? step.latexValues : [];
      const plainValues = Array.isArray(step?.values) ? step.values : [];
      const displayValue = branchIndex => String(latexValues[branchIndex] || plainValues[branchIndex] || '');
      let valueMarkup;
      if (step?.type === 'alternatives') {
        const branchCount = Math.max(plainValues.length, latexValues.length, 2);
        const branches = Array.from({ length: branchCount }, (_, branchIndex) => `<math-field class="p2-static-math p2-teacher-live-math" read-only tabindex="-1">${escapeHtml(displayValue(branchIndex))}</math-field>`);
        valueMarkup = `<div class="p2-teacher-solution-branches">${branches.map((branch, branchIndex) => `${branchIndex ? `<span>${separatorLabel}</span>` : ''}${branch}`).join('')}</div>`;
      } else {
        const value = displayValue(0);
        valueMarkup = `<div class="p2-teacher-solution-single ${step?.type === 'solution-set' ? 'is-answer' : ''}">
          ${step?.type === 'solution-set' ? '<span class="p2-solution-answer-prefix">Ats.:</span>' : ''}
          <math-field class="p2-static-math p2-teacher-live-math" read-only tabindex="-1">${escapeHtml(value)}</math-field>
        </div>`;
      }
      return `
        <div class="p2-solution-step p2-paper-step p2-teacher-solution-step${resultClass}${groupClass}${continuationClass}"${groupId ? ` data-branch-group="${escapeHtml(groupId)}"` : ''}>
          <div class="p2-solution-step-main">
            ${valueMarkup}
            <p class="p2-solution-step-message">${result?.message ? escapeHtml(result.message) : ''}</p>
          </div>
          <span class="p2-solution-step-state" aria-hidden="true">${stateMark}</span>
        </div>`;
    }).join('');
    return `
      <section class="p2-teacher-solution-view p2-solution-paper">
        <header><div><strong>Sprendimas</strong><span>Tas pats mokinio „lapas“ realiu laiku</span></div><b class="p2-live-label">● gyvai</b></header>
        <div class="p2-solution-steps p2-solution-paper-lines">${rows}</div>
      </section>`;
  }


  function teacherExpressionMarkup(task, item) {
    const response = expressionResponseForItem(item);
    const result = item.validationResult || null;
    const stateClass = result?.status === 'correct' ? ' is-correct' : result?.status === 'incorrect' ? ' is-error' : result?.status === 'warning' ? ' is-warning' : '';
    const stateMark = result?.status === 'correct' ? '✓' : result?.status === 'incorrect' ? '×' : result?.status === 'warning' ? '!' : '';
    return `
      <section class="p2-teacher-expression-view${stateClass}">
        <header><div><strong>Mokinio atsakymas</strong><span>Tas pats MathLive laukas realiu laiku</span></div><b class="p2-live-label">● gyvai</b></header>
        <div class="p2-teacher-expression-value">
          <math-field class="p2-static-math p2-teacher-live-math" read-only tabindex="-1">${escapeHtml(response.answerLatex || response.answer || '')}</math-field>
          <b class="p2-expression-state" aria-hidden="true">${stateMark}</b>
        </div>
        ${result?.message ? `<p class="p2-expression-message">${escapeHtml(result.message)}</p>` : ''}
      </section>`;
  }

  function renderTeacherPreview() {
    if (!teacherPreviewWindow || teacherPreviewMode === 'closed') return;
    const host = teacherPreviewWindow.querySelector('#p2TeacherPreviewBody');
    if (!host || !assignment) return;
    const previewTitle = teacherPreviewWindow.querySelector('.p2-practice-window-title strong');
    if (previewTitle) previewTitle.textContent = activeLesson().shortTitle;

    const studentTask = currentTask();
    if (teacherFollowStudent) teacherPreviewTaskId = studentTask.id;
    const previewTask = teacherPreviewTask();
    const previewIndex = taskIndex(previewTask.id) + 1;
    const studentIndex = taskIndex(studentTask.id) + 1;
    const item = taskState(previewTask.id);
    const isStudentTask = previewTask.id === studentTask.id;
    const solutionTask = isSolutionTask(previewTask);
    const expressionTask = isExpressionTask(previewTask);
    const simpleInputTask = isSimpleInputTask(previewTask);
    const pedagogy = pedagogicalStatus(item, { taskId: previewTask.id, current: isStudentTask && normalizedProgress(progress).status === 'in_progress' });
    const answerText = item.lastAnswer ? escapeHtml(item.lastAnswer) : '—';
    const liveAnswer = item.liveAnswer || item.lastAnswer || '';

    let conditionMarkup;
    let answerKeyMarkup;
    let responseMarkup;
    if (solutionTask) {
      conditionMarkup = `
        <h3>${escapeHtml(previewTask.title || 'Išspręsk lygtį')}</h3>
        <p class="p2-preview-instruction">${escapeHtml(previewTask.instruction || '')}</p>
        <math-field class="p2-static-math p2-preview-equation" read-only tabindex="-1">${escapeHtml(previewTask.prompt)}</math-field>`;
      answerKeyMarkup = `<div class="p2-teacher-answer-key p2-teacher-math-answer"><span>Teisingas atsakymas</span><math-field class="p2-static-math p2-answer-equation" read-only tabindex="-1">${escapeHtml(previewTask.answer)}</math-field></div>`;
      responseMarkup = teacherSolutionMarkup(previewTask, item);
    } else if (expressionTask) {
      conditionMarkup = `
        <h3>${escapeHtml(previewTask.title || 'Suprastink reiškinį')}</h3>
        <p class="p2-preview-instruction">${escapeHtml(previewTask.instruction || '')}</p>
        <math-field class="p2-static-math p2-preview-equation" read-only tabindex="-1">${escapeHtml(previewTask.prompt)}</math-field>
        ${previewTask.response?.options?.domain ? `<p class="p2-expression-domain">Apibrėžimo sąlyga: ${escapeHtml(previewTask.response.options.domain)}</p>` : ''}`;
      answerKeyMarkup = `<div class="p2-teacher-answer-key p2-teacher-math-answer"><span>Teisingas atsakymas</span><math-field class="p2-static-math p2-answer-equation" read-only tabindex="-1">${escapeHtml(previewTask.answer)}</math-field></div>`;
      responseMarkup = teacherExpressionMarkup(previewTask, item);
    } else if (simpleInputTask) {
      conditionMarkup = `<h3>${escapeHtml(previewTask.title || 'Užduotis')}</h3><p class="p2-preview-instruction">${renderRichMathText(taskDisplayPrompt(previewTask))}</p>`;
      answerKeyMarkup = `<div class="p2-teacher-answer-key"><span>Teisingas atsakymas</span><strong>${escapeHtml(previewTask.answer)}${previewTask.inputSuffix ? ` ${escapeHtml(previewTask.inputSuffix)}` : ''}</strong></div>`;
      responseMarkup = `<div class="p2-teacher-simple-answer"><span>Mokinio įrašas</span><strong>${liveAnswer ? escapeHtml(liveAnswer) : '—'}${liveAnswer && previewTask.inputSuffix ? ` ${escapeHtml(previewTask.inputSuffix)}` : ''}</strong><small>● gyvai</small></div>`;
    } else {
      const choices = Array.isArray(previewTask.choices) ? previewTask.choices : [];
      const correctIndex = Math.max(0, choices.findIndex(choice => choice === previewTask.answer));
      const correctLetter = String.fromCharCode(65 + correctIndex);
      conditionMarkup = `<h3>${renderRichMathText(taskDisplayPrompt(previewTask))}</h3>`;
      answerKeyMarkup = `<div class="p2-teacher-answer-key"><span>Teisingas atsakymas</span><strong>${correctLetter} · ${renderRichMathText(taskDisplayChoice(previewTask, correctIndex, previewTask.answer))}</strong></div>`;
      const choiceMarkup = choices.map((choice, index) => {
        const isSelected = liveAnswer === choice;
        const classes = ['p2-preview-choice', isSelected ? 'is-student-selected' : ''].filter(Boolean).join(' ');
        return `<div class="${classes}"><span class="p2-preview-choice-letter">${String.fromCharCode(65 + index)}</span><b>${renderRichMathText(taskDisplayChoice(previewTask, index, choice))}</b></div>`;
      }).join('');
      responseMarkup = `<div class="p2-preview-choice-list">${choiceMarkup}</div>`;
    }

    const previewFeedback = taskFeedbackMarkup(previewTask, item, { teacher: true });
    const taskNavigation = activeLesson().tasks.map((task, index) => {
      const taskItem = taskState(task.id);
      const taskPedagogy = pedagogicalStatus(taskItem, { taskId: task.id, current: task.id === studentTask.id && normalizedProgress(progress).status === 'in_progress' });
      const classes = [
        'p2-task-dot',
        task.id === previewTask.id ? 'is-current' : '',
        task.id === studentTask.id ? 'is-student-current' : '',
        taskPedagogy.key === 'good' ? 'is-done' : '',
        taskPedagogy.key === 'help' ? 'is-help' : '',
        taskPedagogy.key === 'repeat' ? 'is-repeat' : ''
      ].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-preview-task="${task.id}" title="${index + 1}. ${escapeHtml(task.title || task.prompt)} · ${taskPedagogy.label}" aria-label="${index + 1} užduotis, ${taskPedagogy.label}">${index + 1}</button>`;
    }).join('');

    const locationText = isStudentTask
      ? `${currentStudentName('Mokinys')} · ${studentIndex} / ${activeLesson().taskCount}`
      : `${currentStudentName('Mokinys')} · ${studentIndex} / ${activeLesson().taskCount} · Peržiūri ${previewIndex}`;

    host.innerHTML = `
      <div class="p2-preview-toolbar">
        <div class="p2-preview-location"><span class="p2-live-dot" aria-hidden="true"></span><strong>${escapeHtml(locationText)}</strong></div>
        <div class="p2-preview-follow-actions">
          ${teacherFollowStudent
            ? '<button type="button" class="p2-secondary is-active" data-preview-action="follow">✓ Sekama</button>'
            : '<button type="button" class="p2-secondary" data-preview-action="return">↩ Grįžti prie mokinio</button>'}
        </div>
      </div>
      <div class="p2-preview-layout">
        <div class="p2-preview-main">
          <article class="p2-preview-detail ${(solutionTask || expressionTask) ? 'p2-solution-preview-detail' : ''}${simpleInputTask ? ' p2-simple-input-preview-detail' : ''}">
            <header class="p2-preview-detail-head">
              <div>
                <span class="p2-label">${escapeHtml(previewTask.label)} · ${previewIndex} užduotis${isStudentTask ? ` · ${escapeHtml(currentStudentName('Mokinys'))} dabar čia` : ''}</span>
                ${conditionMarkup}
                ${answerKeyMarkup}
              </div>
              <span class="p2-preview-badge status-${pedagogy.key}">${pedagogy.label}</span>
            </header>
            ${responseMarkup}
            ${previewFeedback}
            <div class="p2-preview-detail-metrics">
              <span>Bandymų: <b>${attemptUsageLabel(item, previewTask.id)}</b></span>
              <span>Pagalba: <b>${item.hintUsed ? 'naudota' : 'nenaudota'}</b></span>
              <span>Paskutinis pateiktas: <b>${answerText}</b></span>
            </div>
            <div class="p2-preview-hint"><span>Užuomina</span><p>${escapeHtml(previewTask.hint)}</p></div>
            <div class="p2-preview-detail-actions">
              <button type="button" class="p2-secondary" data-preview-action="previous" ${previewIndex === 1 ? 'disabled' : ''}>← Ankstesnė</button>
              <button type="button" class="p2-secondary" data-preview-action="next" ${previewIndex === activeLesson().taskCount ? 'disabled' : ''}>Kita →</button>
              <span></span>
              <button type="button" class="p2-primary" disabled title="Bus įgyvendinta kitame etape">Rodyti lentoje</button>
            </div>
          </article>
          <nav class="p2-task-dots p2-teacher-task-dots" aria-label="Pamokos užduotys">${taskNavigation}</nav>
        </div>
        ${attemptSettingsMarkup(previewTask)}
      </div>`;

    host.querySelectorAll('[data-preview-task]').forEach(button => {
      button.addEventListener('click', () => {
        teacherPreviewTaskId = button.dataset.previewTask;
        teacherFollowStudent = false;
        renderTeacherPreview();
      });
    });
    bindAttemptSettings(host);
    host.querySelector('[data-preview-action="follow"]')?.addEventListener('click', () => {
      teacherFollowStudent = !teacherFollowStudent;
      if (teacherFollowStudent) teacherPreviewTaskId = currentTask().id;
      renderTeacherPreview();
    });
    host.querySelector('[data-preview-action="return"]')?.addEventListener('click', () => {
      teacherFollowStudent = true;
      teacherPreviewTaskId = currentTask().id;
      renderTeacherPreview();
    });
    host.querySelector('[data-preview-action="previous"]')?.addEventListener('click', () => {
      teacherFollowStudent = false;
      teacherPreviewTaskId = previousTaskId(previewTask.id);
      renderTeacherPreview();
    });
    host.querySelector('[data-preview-action="next"]')?.addEventListener('click', () => {
      teacherFollowStudent = false;
      teacherPreviewTaskId = nextTaskId(previewTask.id);
      renderTeacherPreview();
    });
  }

  const legacyLibrary = document.getElementById('libraryModal');
  if (legacyLibrary) legacyLibrary.setAttribute('aria-hidden', 'true');

  // Lokalus index-local.html fallbackas skirtas tik UI peržiūrai be Firebase.
  // Internetinėje versijoje šiuos įvykius apdoroja online-sync.js.
  if (location.protocol === 'file:') {
    window.addEventListener('p2:assignment-request', event => {
      const detail = event.detail || {};
      if (detail.action === 'unassign') {
        assignment = null; progress = null; selectedAnswers = {}; renderPanels(); renderLibraryContent(); return;
      }
      if (detail.action === 'assign') {
        const lesson = lessonForId(detail.lessonId) || DEMO_LESSON;
        assignment = { lessonId: lesson.id, title: lesson.title, taskCount: lesson.taskCount, attemptPolicy: detail.attemptPolicy || pendingAttemptPolicy, assignedAt: Date.now(), assignmentKey: `LOCAL-${Date.now()}`, ...assignmentContentDetail(lesson) };
        pendingAttemptPolicy = normalizedAttemptPolicy(assignment);
        progress = emptyProgress();
        selectedAnswers = {};
        teacherPreviewTaskId = activeLesson().tasks[0]?.id || null;
        renderPanels(); renderLibraryContent();
      }
      if (detail.action === 'settings' && assignment) {
        assignment = { ...assignment, attemptPolicy: normalizedAttemptPolicy({ attemptPolicy: detail.attemptPolicy || assignment.attemptPolicy }) };
        pendingAttemptPolicy = normalizedAttemptPolicy(assignment);
        renderPanels(); renderLibraryContent(); renderTeacherPreview();
      }
    });
    window.addEventListener('p2:practice-progress-request', event => {
      progress = event.detail && typeof event.detail === 'object' ? normalizedProgress(event.detail) : progress;
      renderPanels();
    });
    window.addEventListener('p2:practice-progress-live-request', event => {
      progress = event.detail && typeof event.detail === 'object' ? normalizedProgress(event.detail) : progress;
    });
  }

  window.addEventListener('p2:assignment-state', event => {
    const previousLessonId = assignment?.lessonId || null;
    assignment = event.detail && typeof event.detail === 'object' ? event.detail : null;
    const nextLessonId = assignment?.lessonId || null;
    const lessonChanged = previousLessonId !== nextLessonId;
    if (assignment) {
      pendingAttemptPolicy = normalizedAttemptPolicy(assignment);
      if (role() === 'teacher') {
        const lesson = lessonForId(assignment.lessonId);
        if (lesson && (!assignment.schemaVersion || !assignment.contentVersion || !assignment.contentSnapshot || !assignment.assignmentKey)) {
          window.dispatchEvent(new CustomEvent('p2:assignment-request', {
            detail: {
              action: 'metadata',
              lessonId: lesson.id,
              assignedAt: Number(assignment.assignedAt || 0) || null,
              ...assignmentContentDetail(lesson)
            }
          }));
        }
      }
    }
    if (!assignment || lessonChanged) {
      progress = null;
      selectedAnswers = {};
      teacherPreviewTaskId = assignment ? activeLesson().tasks[0]?.id || null : null;
      teacherFollowStudent = true;
      if (!assignment && role() === 'teacher' && teacherPreviewMode !== 'closed') setTeacherPreviewMode('closed');
    }
    renderPanels();
    renderLibraryContent();
    renderTeacherPreview();
    queueCurrentStudentLessonSnapshot();
    renderStudentsModal();
  });

  window.addEventListener('p2:progress-state', event => {
    const incoming = event.detail && typeof event.detail === 'object' ? normalizedProgress(event.detail) : null;
    const ownLiveEcho = role() === 'student'
      && incoming
      && progress
      && studentMathFieldActive()
      && comparableProgress(incoming) === comparableProgress(progress);
    progress = incoming;
    if (teacherFollowStudent && progress) teacherPreviewTaskId = currentTask().id;
    if (ownLiveEcho) { queueCurrentStudentLessonSnapshot(); return; }
    renderPanels();
    renderTeacherPreview();
    queueCurrentStudentLessonSnapshot();
    renderStudentsModal();
  });

  const roleObserver = new MutationObserver(() => applyRole());
  roleObserver.observe(body, { attributes: true, attributeFilter: ['data-online-role'] });
  document.getElementById('p2SideRefreshButton')?.addEventListener('click', () => {
    updatePresence();
    renderPanels();
  });

  applyRatio();
  applyView(view, { persist: false });
  applyRole();
})();
