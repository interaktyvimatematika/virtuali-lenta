(() => {
  'use strict';

  const BUILD = 'P2-SPLIT-P2.4.7.19.4.4';
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

  const LESSON_CATALOG = Object.freeze([DEMO_LESSON, GRADE5_REVIEW_LESSON]);

  let assignment = null;
  let pendingAttemptPolicy = { defaultMaxAttempts: 3, taskMaxAttempts: {} };
  let progress = null;
  let selectedAnswers = {};

  function lessonForId(lessonId) {
    const id = String(lessonId || '').trim();
    return LESSON_CATALOG.find(lesson => lesson.id === id) || null;
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
  // Tekstas visada escapinamas, o formulė pateikiama read-only MathLive lauku.
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
      // Skyrybos ženklas turi jungtis prie prieš jį esančios formulės taip pat,
      // kaip jungiasi prie paprasto teksto. Kartu toleruojame AI / autoriaus
      // netyčia paliktus tarpus tarp \(...\) ir . , : ; ? !
      const punctuation = afterMath.match(/^(\s*)([.,:;?!…])/u);
      const punctuationClass = punctuation ? ' p2-inline-math-before-punctuation' : '';
      html += `<math-field class="p2-static-math p2-inline-math${punctuationClass}" read-only tabindex="-1">${escapeHtml(match[1])}</math-field>`;

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
          <div class="p2-student-hero-copy"><span class="p2-label">Mano pratybos</span><h3>Čia atsiras mokytojo priskirtos pamokos</h3><p>Pratybos veiks atskirai nuo bendros lentos, todėl galėsi spręsti savo tempu, o lenta liks bendra darbo erdvė.</p></div>
          <span class="p2-count-badge">0</span>
        </div>
        <div class="p2-empty-card p2-practice-empty">
          <div class="p2-empty-illustration" aria-hidden="true"><span>f(x)</span><i></i></div>
          <strong>Kol kas nėra priskirtų pratybų</strong>
          <p>Kai mokytojas priskirs pamoką, ji atsiras čia. Tada galėsi ją atidaryti „Padalintame“ arba „Tik pratybos“ vaizde.</p>
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
            <span class="p2-label">Priskirta pamoka</span>
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
    return `
      <section class="p2-mini-section" aria-label="Mano pažanga">
        <header><div><span class="p2-label">Mano pažanga</span><h3>Ši pamoka</h3></div><span class="p2-soft-pill">${stats.finished} / ${activeLesson().taskCount}</span></header>
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
    const state = normalizedProgress(progress);
    const stats = progressStats();
    const task = assignment ? currentTask() : null;
    const item = assignment ? currentTaskState() : null;
    const assigned = Boolean(assignment);
    const started = assigned && state.status !== 'not_started';
    const assignmentTitle = assigned ? activeLesson().shortTitle : 'Pamoka dar nepriskirta';
    const currentLabel = task ? `${taskIndex(task.id) + 1} / ${activeLesson().taskCount}` : '— / —';
    const helper = !assigned ? '—' : item?.hintUsed ? 'Naudota' : 'Nenaudota';
    const currentPedagogy = started ? pedagogicalStatus(item, { taskId: task?.id, current: state.status === 'in_progress' && Boolean(task) }) : { key: 'pending', label: '—' };
    const activityTitle = !assigned ? 'Pamoka dar nepriskirta' : !started ? 'Mokinys dar neatidarė pratybų' : state.status === 'completed' ? 'Pratybos atliktos' : `Sprendžiama ${taskIndex(task.id) + 1} užduotis`;
    const activityText = !assigned
      ? 'Priskirk pamoką Bibliotekoje. Mokinys ją iškart pamatys savo „Mano pratybos“ srityje.'
      : !started
        ? 'Pamoka priskirta. Kai mokinys paspaus „Atidaryti“, čia realiu laiku atsiras jo dabartinė užduotis, bandymai ir pagalbos būsena.'
        : `${task?.prompt || ''}`;

    teacherPanel.innerHTML = `
      <div class="p2-learner-card p2-learner-overview">
        <div class="p2-avatar" aria-hidden="true">M</div>
        <div class="p2-learner-copy"><span class="p2-label">Mokinio eiga</span><h3>${studentOnline ? 'Mokinys prisijungęs' : 'Laukiama mokinio'}</h3><p>${studentOnline ? 'Bendra lenta ir individuali pratybų būsena sinchronizuojamos realiu laiku.' : 'Nukopijuok mokinio nuorodą ir atidaryk ją kitame įrenginyje.'}</p></div>
        <span class="p2-presence-pill ${studentOnline ? 'is-online' : ''}">${studentOnline ? 'Prisijungęs' : `${count} įrenginys`}</span>
      </div>
      <div class="p2-teacher-dashboard-grid">
        <div class="p2-progress-card">
          <div class="p2-progress-head"><div><span class="p2-label">Priskirta pamoka</span><h3>${escapeHtml(assignmentTitle)}</h3><p class="p2-teacher-status-line">${assigned ? `${statusLabel(state)} · ${policySummary(assignment)}` : 'Bibliotekoje pasirink pamoką ir priskirk mokiniui.'}</p></div><strong>${assigned ? `${stats.finished} / ${activeLesson().taskCount}` : '— / —'}</strong></div>
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
        <div><span class="p2-label">Mokinio įžvalgos</span><h3>${started ? 'Tarpinė pamokos būsena' : 'Įžvalgos atsiras pradėjus spręsti'}</h3><p>${started ? `Savarankiškai: ${stats.good} · Su pagalba / taisant: ${stats.help} · Kartoti: ${stats.repeat}.` : 'Čia matysi, kuriuos gebėjimus mokinys atlieka savarankiškai, kur naudoja pagalbą ir ką verta pakartoti.'}</p></div>
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
      sideTitle.textContent = isTeacher ? 'Mokinio eiga' : 'Mano pratybos';
    }
    practiceModeButton.textContent = isTeacher ? 'Mokinio eiga' : 'Tik pratybos';
    if (sideRolePill) sideRolePill.textContent = isTeacher ? 'Mokytojas' : 'Mokinys';
    document.querySelectorAll('.p2-teacher-only').forEach(el => el.hidden = !isTeacher);
    const p2LibraryButton = document.getElementById('libraryButton');
    if (p2LibraryButton) p2LibraryButton.hidden = !isTeacher;
    if (!isTeacher && teacherPreviewMode !== 'closed') {
      teacherPreviewMode = 'closed';
      if (teacherPreviewWindow) teacherPreviewWindow.hidden = true;
      body.classList.remove('p2-teacher-preview-maximized');
      sidePane.classList.remove('has-preview-docked');
    }
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
      const icon = lesson.id === GRADE5_REVIEW_LESSON.id ? '5' : 'ƒ';
      const label = lesson.id === GRADE5_REVIEW_LESSON.id ? '5 KLASĖS KARTOJIMAS' : 'LYGČIŲ DIAGNOSTIKA';
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
          detail: { action: 'assign', lessonId: lesson.id, title: lesson.title, taskCount: lesson.taskCount, attemptPolicy }
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
    sideTitle.textContent = previewActive ? 'Pratybų peržiūra' : 'Mokinio eiga';
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
      ? `Mokinys · ${studentIndex} / ${activeLesson().taskCount}`
      : `Mokinys · ${studentIndex} / ${activeLesson().taskCount} · Peržiūri ${previewIndex}`;

    host.innerHTML = `
      <div class="p2-preview-toolbar">
        <div class="p2-preview-location"><span class="p2-live-dot" aria-hidden="true"></span><strong>${locationText}</strong></div>
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
                <span class="p2-label">${escapeHtml(previewTask.label)} · ${previewIndex} užduotis${isStudentTask ? ' · mokinys dabar čia' : ''}</span>
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
        assignment = { lessonId: lesson.id, title: lesson.title, taskCount: lesson.taskCount, attemptPolicy: detail.attemptPolicy || pendingAttemptPolicy, assignedAt: Date.now() };
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
    if (assignment) pendingAttemptPolicy = normalizedAttemptPolicy(assignment);
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
    if (ownLiveEcho) return;
    renderPanels();
    renderTeacherPreview();
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
