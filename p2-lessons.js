(() => {
  'use strict';

  // M1.1: built-in practice lesson data extracted mechanically from p2-ui.js.
  // No task content or lesson identifiers are changed here.
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

  const GRADE9_REVIEW_LESSON = Object.freeze({
    "id": "p2-grade9-review-01",
    "contentVersion": 1,
    "title": "9 klasės matematikos pakartojimas",
    "shortTitle": "9 klasės pakartojimas",
    "description": "30 įvairių 9 klasės kurso kartojimo užduočių: skaičių sekos, kvadratinės lygtys, racionalieji reiškiniai, lygčių sistemos, tiesinės ir kvadratinės funkcijos, apskritimo geometrija, trigonometrija ir duomenų interpretavimas.",
    "taskCount": 30,
    "classCount": 20,
    "selfCount": 10,
    "tasks": [
        {
            "id": "g9-01",
            "type": "choice",
            "section": "class",
            "label": "Sekos",
            "title": "Sekos formulė",
            "prompt": "Sekos n-tasis narys aprašytas formule a_n = 3n - 2. Koks yra a_8?",
            "promptDisplay": "Sekos \\(n\\)-tasis narys: \\(a_n=3n-2\\). Koks yra \\(a_8\\)?",
            "choices": [
                "20",
                "22",
                "24",
                "26"
            ],
            "answer": "22",
            "hint": "Į formulę vietoje n įrašyk 8."
        },
        {
            "id": "g9-02",
            "type": "input",
            "section": "class",
            "label": "Sekos",
            "title": "Rekurentinė seka",
            "prompt": "Duota a_1 = 5, a_{n+1} = a_n + 4. Rask a_5.",
            "promptDisplay": "Duota \\(a_1=5\\), \\(a_{n+1}=a_n+4\\). Rask \\(a_5\\).",
            "answer": "21",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Kiekvienas kitas narys yra 4 didesnis."
        },
        {
            "id": "g9-03",
            "type": "input",
            "section": "class",
            "label": "Kvadratinės lygtys",
            "title": "Kvadratinė lygtis",
            "prompt": "Išspręsk x² - 7x + 12 = 0. Įrašyk didesnį sprendinį.",
            "promptDisplay": "Išspręsk \\(x^2-7x+12=0\\). Įrašyk didesnį sprendinį.",
            "answer": "4",
            "answerType": "number",
            "inputLabel": "x =",
            "placeholder": "Įrašyk skaičių",
            "hint": "Išskaidyk: (x−3)(x−4)=0."
        },
        {
            "id": "g9-04",
            "type": "choice",
            "section": "class",
            "label": "Kvadratinės lygtys",
            "title": "Diskriminantas",
            "prompt": "Kiek realiųjų sprendinių turi lygtis 2x² + 3x + 5 = 0?",
            "promptDisplay": "Kiek realiųjų sprendinių turi lygtis \\(2x^2+3x+5=0\\)?",
            "choices": [
                "0",
                "1",
                "2",
                "3"
            ],
            "answer": "0",
            "hint": "Apskaičiuok diskriminantą."
        },
        {
            "id": "g9-05",
            "type": "input",
            "section": "class",
            "label": "Kvadratinės lygtys",
            "title": "Kvadratinės lygties formulė",
            "prompt": "Lygties x² - 2x - 8 = 0 sprendiniai yra -2 ir 4. Kokia jų suma?",
            "promptDisplay": "Lygties \\(x^2-2x-8=0\\) sprendiniai yra \\(-2\\) ir \\(4\\). Kokia jų suma?",
            "answer": "2",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Sudėk abu sprendinius."
        },
        {
            "id": "g9-06",
            "type": "choice",
            "section": "class",
            "label": "Raidiniai reiškiniai",
            "title": "Kvadratinio trinario skaidymas",
            "prompt": "Kuris išskaidymas teisingas? x² + x - 12",
            "promptDisplay": "Kuris išskaidymas teisingas? \\(x^2+x-12\\)",
            "choices": [
                "(x+4)(x−3)",
                "(x−4)(x+3)",
                "(x−6)(x+2)",
                "(x+6)(x−2)"
            ],
            "answer": "(x+4)(x−3)",
            "hint": "Reikia dviejų skaičių, kurių sandauga −12, o suma 1."
        },
        {
            "id": "g9-07",
            "type": "choice",
            "section": "class",
            "label": "Racionalieji reiškiniai",
            "title": "Apibrėžimo sritis",
            "prompt": "Kuri x reikšmė neleistina reiškiniui (x+2)/(x−5)?",
            "promptDisplay": "Kuri \\(x\\) reikšmė neleistina reiškiniui \\(\\frac{x+2}{x-5}\\)?",
            "choices": [
                "−5",
                "−2",
                "2",
                "5"
            ],
            "answer": "5",
            "hint": "Vardiklis negali būti lygus nuliui."
        },
        {
            "id": "g9-08",
            "type": "choice",
            "section": "class",
            "label": "Racionalieji reiškiniai",
            "title": "Reiškinio prastinimas",
            "prompt": "Kai x ≠ 3, kam lygu (x²−9)/(x−3)?",
            "promptDisplay": "Kai \\(x\\ne3\\), kam lygu \\(\\frac{x^2-9}{x-3}\\)?",
            "choices": [
                "x−3",
                "x+3",
                "x²+3",
                "1"
            ],
            "answer": "x+3",
            "hint": "Skaitiklį išskaidyk kaip kvadratų skirtumą."
        },
        {
            "id": "g9-09",
            "type": "choice",
            "section": "class",
            "label": "Lygčių sistemos",
            "title": "Tiesinė ir kvadratinė lygtis",
            "prompt": "Kuri pora tenkina sistemą y=x+2 ir y=x²?",
            "promptDisplay": "Kuri pora tenkina sistemą \\(y=x+2\\) ir \\(y=x^2\\)?",
            "choices": [
                "(−1;1)",
                "(1;3)",
                "(2;4)",
                "(3;5)"
            ],
            "answer": "(2;4)",
            "hint": "Patikrink porą abiejose lygtyse."
        },
        {
            "id": "g9-10",
            "type": "input",
            "section": "class",
            "label": "Funkcijos",
            "title": "Funkcijos reikšmė",
            "prompt": "Duota f(x)=2x²−3. Apskaičiuok f(−2).",
            "promptDisplay": "Duota \\(f(x)=2x^2-3\\). Apskaičiuok \\(f(-2)\\).",
            "answer": "5",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Pakelk −2 kvadratu ir tik tada daugink iš 2."
        },
        {
            "id": "g9-11",
            "type": "choice",
            "section": "class",
            "label": "Funkcijos",
            "title": "Funkcijos apibrėžimo sritis",
            "prompt": "Kokia funkcijos f(x)=1/(x+4) apibrėžimo srities išimtis?",
            "promptDisplay": "Kokia funkcijos \\(f(x)=\\frac1{x+4}\\) apibrėžimo srities išimtis?",
            "choices": [
                "x ≠ −4",
                "x ≠ 0",
                "x ≠ 4",
                "x > −4"
            ],
            "answer": "x ≠ −4",
            "hint": "Vardiklis negali būti 0."
        },
        {
            "id": "g9-12",
            "type": "choice",
            "section": "class",
            "label": "Tiesinė funkcija",
            "title": "Krypties koeficientas",
            "prompt": "Tiesės y=−3x+7 krypties koeficientas yra:",
            "promptDisplay": "Tiesės \\(y=-3x+7\\) krypties koeficientas yra:",
            "choices": [
                "−3",
                "3",
                "7",
                "−7"
            ],
            "answer": "−3",
            "hint": "Formoje y=kx+b krypties koeficientas yra k."
        },
        {
            "id": "g9-13",
            "type": "choice",
            "section": "class",
            "label": "Tiesinė funkcija",
            "title": "Tiesės lygtis",
            "prompt": "Kuri tiesė eina per taškus (0;2) ir (2;6)?",
            "promptDisplay": "Kuri tiesė eina per taškus \\((0;2)\\) ir \\((2;6)\\)?",
            "choices": [
                "y=x+2",
                "y=2x+2",
                "y=2x−2",
                "y=3x+2"
            ],
            "answer": "y=2x+2",
            "hint": "Rask pokytį: y padidėja 4, kai x padidėja 2."
        },
        {
            "id": "g9-14",
            "type": "input",
            "section": "class",
            "label": "Kvadratinė funkcija",
            "title": "Parabolės viršūnė",
            "prompt": "Funkcijos y=(x−3)²−5 viršūnės x koordinatė yra:",
            "promptDisplay": "Funkcijos \\(y=(x-3)^2-5\\) viršūnės \\(x\\) koordinatė yra:",
            "answer": "3",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Viršūnės forma y=a(x−m)²+n turi viršūnę (m;n)."
        },
        {
            "id": "g9-15",
            "type": "choice",
            "section": "class",
            "label": "Kvadratinė funkcija",
            "title": "Parabolės nulinės reikšmės",
            "prompt": "Funkcijos y=(x−1)(x−5) nulinės reikšmės yra:",
            "promptDisplay": "Funkcijos \\(y=(x-1)(x-5)\\) nulinės reikšmės yra:",
            "choices": [
                "−1 ir −5",
                "1 ir 5",
                "−1 ir 5",
                "1 ir −5"
            ],
            "answer": "1 ir 5",
            "hint": "Sandauga lygi 0, kai bent vienas daugiklis lygus 0."
        },
        {
            "id": "g9-16",
            "type": "choice",
            "section": "class",
            "label": "Funkcijų transformacijos",
            "title": "Parabolės postūmis",
            "prompt": "Kaip iš y=x² grafiko gauti y=(x−2)²+3 grafiką?",
            "promptDisplay": "Kaip iš \\(y=x^2\\) grafiko gauti \\(y=(x-2)^2+3\\) grafiką?",
            "choices": [
                "2 į kairę ir 3 žemyn",
                "2 į dešinę ir 3 aukštyn",
                "2 į dešinę ir 3 žemyn",
                "3 į dešinę ir 2 aukštyn"
            ],
            "answer": "2 į dešinę ir 3 aukštyn",
            "hint": "x−2 reiškia postūmį į dešinę, +3 – aukštyn."
        },
        {
            "id": "g9-17",
            "type": "input",
            "section": "class",
            "label": "Apskritimas",
            "title": "Įbrėžtinis kampas",
            "prompt": "Centrinis kampas, remiantis į tą patį lanką, yra 120°. Koks įbrėžtinis kampas?",
            "promptDisplay": "Centrinis kampas, remiantis į tą patį lanką, yra \\(120^\\circ\\). Koks įbrėžtinis kampas?",
            "answer": "60",
            "answerType": "number",
            "inputLabel": "Kampas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Įbrėžtinis kampas yra perpus mažesnis už centrinį.",
            "inputSuffix": "°"
        },
        {
            "id": "g9-18",
            "type": "input",
            "section": "class",
            "label": "Apskritimas",
            "title": "Liestinė ir spindulys",
            "prompt": "Koks kampas tarp apskritimo liestinės ir į lietimosi tašką nubrėžto spindulio?",
            "promptDisplay": "Koks kampas tarp apskritimo liestinės ir į lietimosi tašką nubrėžto spindulio?",
            "answer": "90",
            "answerType": "number",
            "inputLabel": "Kampas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Liestinė lietimosi taške yra statmena spinduliui.",
            "inputSuffix": "°"
        },
        {
            "id": "g9-19",
            "type": "input",
            "section": "class",
            "label": "Apskritimas",
            "title": "Susikertančios stygos",
            "prompt": "Dvi apskritimo stygos susikerta. Vienos dalys yra 3 ir 8, kitos – 4 ir x. Rask x.",
            "promptDisplay": "Dvi apskritimo stygos susikerta. Vienos dalys yra \\(3\\) ir \\(8\\), kitos – \\(4\\) ir \\(x\\). Rask \\(x\\).",
            "answer": "6",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Susikertančių stygų dalių sandaugos yra lygios."
        },
        {
            "id": "g9-20",
            "type": "input",
            "section": "class",
            "label": "Trigonometrija",
            "title": "Sinusas stačiajame trikampyje",
            "prompt": "Stačiojo trikampio įžambinė 10, o prieš kampą α esantis statinis 6. Rask sin α.",
            "promptDisplay": "Stačiojo trikampio įžambinė \\(10\\), o prieš kampą \\(\\alpha\\) esantis statinis \\(6\\). Rask \\(\\sin\\alpha\\).",
            "answer": "0,6",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "sin α = priešpriešinis statinis : įžambinė.",
            "acceptedAnswers": [
                "0,6",
                "0.6"
            ]
        },
        {
            "id": "g9-21",
            "type": "input",
            "section": "self",
            "label": "Trigonometrija",
            "title": "Kosinusas",
            "prompt": "Stačiojo trikampio įžambinė 13, o prie kampo α esantis statinis 5. Rask cos α.",
            "promptDisplay": "Stačiojo trikampio įžambinė \\(13\\), o prie kampo \\(\\alpha\\) esantis statinis \\(5\\). Rask \\(\\cos\\alpha\\).",
            "answer": "0,3846",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "cos α = gretimas statinis : įžambinė. Atsakymą pateik keturių skaitmenų po kablelio tikslumu.",
            "acceptedAnswers": [
                "0,3846",
                "0.3846"
            ]
        },
        {
            "id": "g9-22",
            "type": "input",
            "section": "self",
            "label": "Trigonometrija",
            "title": "Tangentas",
            "prompt": "Stačiojo trikampio statiniai yra 6 ir 8. Kampui α priešingas statinis yra 6, gretimas – 8. Rask tg α.",
            "promptDisplay": "Kampui \\(\\alpha\\) priešingas statinis yra \\(6\\), gretimas – \\(8\\). Rask \\(\\tg\\alpha\\).",
            "answer": "0,75",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "tg α = priešpriešinis statinis : gretimas.",
            "acceptedAnswers": [
                "0,75",
                "0.75"
            ]
        },
        {
            "id": "g9-23",
            "type": "input",
            "section": "self",
            "label": "Trigonometrija",
            "title": "Praktinis uždavinys",
            "prompt": "Iš 20 m atstumo medžio viršūnė matoma 45° pakilimo kampu. Stebėtojo akių aukščio nepaisyk. Koks medžio aukštis?",
            "promptDisplay": "Iš \\(20\\text{ m}\\) atstumo medžio viršūnė matoma \\(45^\\circ\\) kampu. Koks medžio aukštis?",
            "answer": "20",
            "answerType": "number",
            "inputLabel": "Aukštis",
            "placeholder": "Įrašyk skaičių",
            "hint": "tg 45° = 1.",
            "inputSuffix": "m"
        },
        {
            "id": "g9-24",
            "type": "choice",
            "section": "self",
            "label": "Duomenys",
            "title": "Koreliacija",
            "prompt": "Sklaidos diagramoje taškai išsidėstę arti kylančios tiesės. Koks ryšys labiausiai tikėtinas?",
            "promptDisplay": "Sklaidos diagramoje taškai išsidėstę arti kylančios tiesės. Koks ryšys labiausiai tikėtinas?",
            "choices": [
                "Stipri teigiama koreliacija",
                "Stipri neigiama koreliacija",
                "Ryšio nėra",
                "Tiksliai funkcinis ryšys"
            ],
            "answer": "Stipri teigiama koreliacija",
            "hint": "Kylanti tendencija rodo teigiamą koreliaciją."
        },
        {
            "id": "g9-25",
            "type": "choice",
            "section": "self",
            "label": "Duomenys",
            "title": "Koreliacija ir priežastingumas",
            "prompt": "Nustatyta stipri koreliacija tarp dviejų dydžių. Kuri išvada visada teisinga?",
            "promptDisplay": "Nustatyta stipri koreliacija tarp dviejų dydžių. Kuri išvada visada teisinga?",
            "choices": [
                "Vienas dydis būtinai sukelia kitą",
                "Dydžiai yra statistiškai susiję",
                "Ryšys būtinai tiesinis visoje populiacijoje",
                "Duomenyse nėra išskirčių"
            ],
            "answer": "Dydžiai yra statistiškai susiję",
            "hint": "Koreliacija pati savaime neįrodo priežastinio ryšio."
        },
        {
            "id": "g9-26",
            "type": "choice",
            "section": "self",
            "label": "Duomenys",
            "title": "Tiesinės tendencijos interpretacija",
            "prompt": "Tendencijos tiesė y=2,5x+10 sieja mokymosi valandas x ir testo taškus y. Ką reiškia koeficientas 2,5?",
            "promptDisplay": "Tendencijos tiesė \\(y=2{,}5x+10\\). Ką reiškia koeficientas \\(2{,}5\\)?",
            "choices": [
                "Pridėjus 1 mokymosi valandą prognozuojama apie 2,5 taško daugiau",
                "Pradinis rezultatas yra 2,5",
                "Maksimalus rezultatas yra 10",
                "Kiekvienas mokinys būtinai gauna 2,5 taško"
            ],
            "answer": "Pridėjus 1 mokymosi valandą prognozuojama apie 2,5 taško daugiau",
            "hint": "Krypties koeficientas rodo prognozuojamą y pokytį, kai x padidėja 1."
        },
        {
            "id": "g9-27",
            "type": "input",
            "section": "self",
            "label": "Kvadratinės lygtys",
            "title": "Tekstinis modelis",
            "prompt": "Stačiakampio kraštinės yra x ir x+3, o plotas 40. Rask trumpesnę kraštinę.",
            "promptDisplay": "Stačiakampio kraštinės yra \\(x\\) ir \\(x+3\\), o plotas \\(40\\). Rask trumpesnę kraštinę.",
            "answer": "5",
            "answerType": "number",
            "inputLabel": "Ilgis",
            "placeholder": "Įrašyk skaičių",
            "hint": "Sudaryk x(x+3)=40 ir atrink teigiamą sprendinį."
        },
        {
            "id": "g9-28",
            "type": "choice",
            "section": "self",
            "label": "Funkcijos",
            "title": "Funkcijos ženklas",
            "prompt": "Funkcija y=(x−2)(x+1). Kuriame intervale jos reikšmės neigiamos?",
            "promptDisplay": "Funkcija \\(y=(x-2)(x+1)\\). Kuriame intervale jos reikšmės neigiamos?",
            "choices": [
                "x<−1",
                "−1<x<2",
                "x>2",
                "x<−1 arba x>2"
            ],
            "answer": "−1<x<2",
            "hint": "Parabolė atsidaro aukštyn, todėl tarp šaknų yra žemiau x ašies."
        },
        {
            "id": "g9-29",
            "type": "choice",
            "section": "self",
            "label": "Racionalieji reiškiniai",
            "title": "Apibrėžimo sritis ir prastinimas",
            "prompt": "Kuri sąlyga būtina prastinant (x²−4)/(x−2)=x+2?",
            "promptDisplay": "Kuri sąlyga būtina prastinant \\(\\frac{x^2-4}{x-2}=x+2\\)?",
            "choices": [
                "x ≠ −2",
                "x ≠ 0",
                "x ≠ 2",
                "x > 2"
            ],
            "answer": "x ≠ 2",
            "hint": "Pradiniame reiškinyje vardiklis negali būti nulis."
        },
        {
            "id": "g9-30",
            "type": "choice",
            "section": "self",
            "label": "Funkcijos",
            "title": "Parabolės padėtis",
            "prompt": "Jei kvadratinės funkcijos y=ax²+bx+c diskriminantas D<0 ir a>0, tai jos grafikas:",
            "promptDisplay": "Jei \\(D<0\\) ir \\(a>0\\), tai parabolė:",
            "choices": [
                "Kerta x ašį du kartus",
                "Liečia x ašį",
                "Visa yra virš x ašies",
                "Visa yra žemiau x ašies"
            ],
            "answer": "Visa yra virš x ašies",
            "hint": "D<0 reiškia, kad nėra šaknų, o a>0 – parabolė atsidaro aukštyn."
        }
    ]
});

  const GRADE10_REVIEW_LESSON = Object.freeze({
    "id": "p2-grade10-review-01",
    "contentVersion": 4,
    "title": "10 klasės matematikos pakartojimas",
    "shortTitle": "10 klasės pakartojimas",
    "description": "30 įvairių 10 klasės kurso kartojimo užduočių: proporcingoji dalyba, sudėtiniai procentai ir mišiniai, racionaliosios lygtys, kvadratinės nelygybės, lygčių sistemos, panašumas, trikampių ir apskritimų geometrija, trigonometrija, statistika, kombinatorika ir tikimybės.",
    "taskCount": 30,
    "classCount": 20,
    "selfCount": 10,
    "tasks": [
        {
            "id": "g10-01",
            "type": "input",
            "section": "class",
            "label": "Proporcingumas",
            "title": "Proporcingoji dalyba",
            "prompt": "420 padalink santykiu 2:5. Kokia didesnioji dalis?",
            "promptDisplay": "Skaičių \\(420\\) padalink santykiu \\(2:5\\). Kokia didesnioji dalis?",
            "answer": "300",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Iš viso yra 7 santykio dalys."
        },
        {
            "id": "g10-02",
            "type": "input",
            "section": "class",
            "label": "Procentai",
            "title": "Sudėtiniai procentai",
            "prompt": "1000 Eur indėlis kasmet padidėja 5 %. Kiek eurų bus po 2 metų?",
            "promptDisplay": "\\(1000\\text{ Eur}\\) indėlis kasmet padidėja \\(5\\%\\). Kiek bus po \\(2\\) metų?",
            "answer": "1102,5",
            "answerType": "number",
            "inputLabel": "Suma",
            "placeholder": "Įrašyk skaičių",
            "hint": "Skaičiuok 1000·1,05².",
            "inputSuffix": "Eur",
            "acceptedAnswers": [
                "1102,5",
                "1102.5"
            ]
        },
        {
            "id": "g10-03",
            "type": "input",
            "section": "class",
            "label": "Mišiniai",
            "title": "Tirpalo koncentracija",
            "prompt": "Sumaišyta 200 g 10 % tirpalo ir 300 g 20 % tirpalo. Kokia gauto tirpalo koncentracija procentais?",
            "promptDisplay": "Sumaišyta \\(200\\text{ g}\\) \\(10\\%\\) ir \\(300\\text{ g}\\) \\(20\\%\\) tirpalo. Kokia koncentracija?",
            "answer": "16",
            "answerType": "number",
            "inputLabel": "Koncentracija",
            "placeholder": "Įrašyk skaičių",
            "hint": "Rask grynosios medžiagos masę abiejuose tirpaluose ir padalink iš 500 g.",
            "inputSuffix": "%"
        },
        {
            "id": "g10-04",
            "type": "choice",
            "section": "class",
            "label": "Sekos",
            "title": "Fibonačio seka",
            "prompt": "Koks kitas Fibonačio sekos 3, 5, 8, 13, ... narys?",
            "promptDisplay": "Koks kitas sekos \\(3,5,8,13,\\ldots\\) narys?",
            "choices": [
                "18",
                "20",
                "21",
                "26"
            ],
            "answer": "21",
            "hint": "Kiekvienas narys yra dviejų ankstesnių suma."
        },
        {
            "id": "g10-05",
            "type": "input",
            "section": "class",
            "label": "Racionaliosios lygtys",
            "title": "Trupmeninė lygtis",
            "prompt": "Išspręsk 3/(x−1)=1. Įrašyk x.",
            "promptDisplay": "Išspręsk \\(\\frac{3}{x-1}=1\\).",
            "answer": "4",
            "answerType": "number",
            "inputLabel": "x =",
            "placeholder": "Įrašyk skaičių",
            "hint": "Padaugink abi lygties puses iš x−1."
        },
        {
            "id": "g10-06",
            "type": "choice",
            "section": "class",
            "label": "Racionaliosios lygtys",
            "title": "Neleistina reikšmė",
            "prompt": "Sprendžiant lygtį (x+2)/(x−3)=0, kuri reikšmė neleistina?",
            "promptDisplay": "Sprendžiant \\(\\frac{x+2}{x-3}=0\\), kuri reikšmė neleistina?",
            "choices": [
                "−3",
                "−2",
                "2",
                "3"
            ],
            "answer": "3",
            "hint": "Vardiklis negali būti 0."
        },
        {
            "id": "g10-07",
            "type": "choice",
            "section": "class",
            "label": "Kvadratinės nelygybės",
            "title": "Nelygybės sprendiniai",
            "prompt": "Išspręsk nelygybę x²−5x+6<0. Pasirink sprendinių intervalą.",
            "promptDisplay": "Išspręsk nelygybę \\(x^2-5x+6<0\\). Pasirink sprendinių intervalą.",
            "choices": [
                "(−∞;2)",
                "(2;3)",
                "(3;+∞)",
                "(−∞;2)∪(3;+∞)"
            ],
            "choicesDisplay": [
                "\\(({-}\\infty;2)\\)",
                "\\((2;3)\\)",
                "\\((3;+\\infty)\\)",
                "\\(({-}\\infty;2)\\cup(3;+\\infty)\\)"
            ],
            "answer": "(2;3)",
            "hint": "Išskaidyk (x−2)(x−3) ir nustatyk, kur sandauga neigiama."
        },
        {
            "id": "g10-08",
            "type": "choice",
            "section": "class",
            "label": "Kvadratinės nelygybės",
            "title": "Parabolė ir nelygybė",
            "prompt": "Išspręsk nelygybę x²−4≥0. Pasirink sprendinių aibę intervalais.",
            "promptDisplay": "Išspręsk nelygybę \\(x^2-4\\ge0\\). Pasirink sprendinių aibę intervalais.",
            "choices": [
                "[−2;2]",
                "(−∞;−2]∪[2;+∞)",
                "(−∞;−2)∪(2;+∞)",
                "(−∞;+∞)"
            ],
            "choicesDisplay": [
                "\\([{-}2;2]\\)",
                "\\(({-}\\infty;{-}2]\\cup[2;+\\infty)\\)",
                "\\(({-}\\infty;{-}2)\\cup(2;+\\infty)\\)",
                "\\(({-}\\infty;+\\infty)\\)"
            ],
            "answer": "(−∞;−2]∪[2;+∞)",
            "hint": "Kvadratų skirtumas (x−2)(x+2) yra neneigiamas už šaknų intervalo."
        },
        {
            "id": "g10-09",
            "type": "choice",
            "section": "class",
            "label": "Lygčių sistemos",
            "title": "Tiesė ir parabolė",
            "prompt": "Kuris taškas tenkina lygčių sistemą y=x² ir y=2x?",
            "promptDisplay": "Kuris taškas tenkina lygčių sistemą \\(\\begin{cases}y=x^2\\\\y=2x\\end{cases}\\)?",
            "choicesDisplay": [
                "\\((1;2)\\)",
                "\\((2;4)\\)",
                "\\((3;6)\\)",
                "\\((-2;-4)\\)"
            ],
            "choices": [
                "(1;2)",
                "(2;4)",
                "(3;6)",
                "(−2;−4)"
            ],
            "answer": "(2;4)",
            "hint": "Sulygink x²=2x."
        },
        {
            "id": "g10-10",
            "type": "input",
            "section": "class",
            "label": "Lygčių sistemos",
            "title": "Tekstinis modelis",
            "prompt": "Dviejų skaičių suma 14, o sandauga 48. Koks didesnysis skaičius?",
            "promptDisplay": "Dviejų skaičių suma \\(14\\), o sandauga \\(48\\). Koks didesnysis skaičius?",
            "answer": "8",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Skaičiai yra kvadratinės lygties t²−14t+48=0 šaknys."
        },
        {
            "id": "g10-11",
            "type": "input",
            "section": "class",
            "label": "Panašumas",
            "title": "Panašių figūrų perimetrai",
            "prompt": "Panašių trikampių mastelio koeficientas 3. Mažesniojo perimetras 12 cm. Koks didesniojo perimetras?",
            "promptDisplay": "Panašių trikampių mastelio koeficientas \\(3\\). Mažesniojo trikampio perimetras yra \\(12\\text{ cm}\\). Koks didesniojo trikampio perimetras?",
            "answer": "36",
            "answerType": "number",
            "inputLabel": "Perimetras",
            "placeholder": "Įrašyk skaičių",
            "hint": "Perimetrai keičiasi tuo pačiu mastelio koeficientu.",
            "inputSuffix": "cm"
        },
        {
            "id": "g10-12",
            "type": "input",
            "section": "class",
            "label": "Panašumas",
            "title": "Panašių figūrų plotai",
            "prompt": "Panašių figūrų ilgių mastelio koeficientas 4. Kiek kartų didesnis didesniosios figūros plotas?",
            "promptDisplay": "Dviejų panašių figūrų ilgių mastelio koeficientas yra \\(4\\). Kiek kartų didesnis didesniosios figūros plotas?",
            "answer": "16",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Plotų santykis lygus mastelio koeficiento kvadratui."
        },
        {
            "id": "g10-13",
            "type": "input",
            "section": "class",
            "label": "Trikampiai",
            "title": "Pusiaukampinės savybė",
            "prompt": "Trikampyje ABC kampo A pusiaukampinė AD kerta kraštinę BC taške D. BD=6 cm, DC=9 cm, AB=8 cm. Rask kraštinės AC ilgį.",
            "promptDisplay": "Trikampyje \\(ABC\\) kampo \\(A\\) pusiaukampinė \\(AD\\) kerta kraštinę \\(BC\\) taške \\(D\\). Duota \\(BD=6\\text{ cm}\\), \\(DC=9\\text{ cm}\\), \\(AB=8\\text{ cm}\\). Rask kraštinės \\(AC\\) ilgį.",
            "diagram": {
                "type": "angle-bisector"
            },
            "answer": "12",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Pusiaukampinė dalija priešingą kraštinę proporcingai gretimoms kraštinėms.",
            "inputSuffix": "cm"
        },
        {
            "id": "g10-14",
            "type": "choice",
            "section": "class",
            "label": "Trikampiai",
            "title": "Sunkio centras",
            "prompt": "Trikampio ABC pusiaukraštinės susikerta sunkio centre G. Kokiu santykiu sunkio centras G dalija kiekvieną pusiaukraštinę, skaičiuojant nuo viršūnės?",
            "promptDisplay": "Trikampio \\(ABC\\) pusiaukraštinės susikerta sunkio centre \\(G\\). Kokiu santykiu taškas \\(G\\) dalija kiekvieną pusiaukraštinę, skaičiuojant nuo viršūnės?",
            "diagram": {
                "type": "centroid"
            },
            "choices": [
                "1:1",
                "2:1 nuo viršūnės",
                "3:1 nuo viršūnės",
                "1:2 nuo viršūnės"
            ],
            "answer": "2:1 nuo viršūnės",
            "hint": "Sunkio centras yra arčiau kraštinės negu viršūnės."
        },
        {
            "id": "g10-15",
            "type": "input",
            "section": "class",
            "label": "Įbrėžtas apskritimas",
            "title": "Trikampio plotas S=rp",
            "prompt": "Trikampio ABC pusperimetris p=15 cm. Į trikampį įbrėžto apskritimo spindulys r=4 cm. Rask trikampio plotą.",
            "promptDisplay": "Trikampio \\(ABC\\) pusperimetris \\(p=15\\text{ cm}\\). Į trikampį įbrėžto apskritimo spindulys \\(r=4\\text{ cm}\\). Rask trikampio plotą.",
            "diagram": {
                "type": "incircle"
            },
            "answer": "60",
            "answerType": "number",
            "inputLabel": "Plotas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Naudok formulę S=rp.",
            "inputSuffix": "cm²"
        },
        {
            "id": "g10-16",
            "type": "input",
            "section": "class",
            "label": "Apibrėžtas apskritimas",
            "title": "Trikampio plotas S=abc/(4R)",
            "prompt": "Trikampio ABC kraštinių ilgiai yra 6 cm, 8 cm ir 10 cm. Apie trikampį apibrėžto apskritimo spindulys R=5 cm. Rask trikampio plotą.",
            "promptDisplay": "Trikampio \\(ABC\\) kraštinės yra \\(6\\text{ cm}\\), \\(8\\text{ cm}\\) ir \\(10\\text{ cm}\\). Apie trikampį apibrėžto apskritimo spindulys \\(R=5\\text{ cm}\\). Rask trikampio plotą.",
            "diagram": {
                "type": "circumcircle"
            },
            "answer": "24",
            "answerType": "number",
            "inputLabel": "Plotas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Naudok S=abc/(4R).",
            "inputSuffix": "cm²"
        },
        {
            "id": "g10-17",
            "type": "input",
            "section": "class",
            "label": "Keturkampiai",
            "title": "Įbrėžtinis keturkampis",
            "prompt": "Keturkampis ABCD įbrėžtas į apskritimą. Kampas A=112°. Rask jam priešingo kampo C dydį.",
            "promptDisplay": "Keturkampis \\(ABCD\\) įbrėžtas į apskritimą. Duota \\(\\angle A=112^\\circ\\). Rask jam priešingo kampo \\(\\angle C\\) dydį.",
            "diagram": {
                "type": "cyclic-quadrilateral"
            },
            "answer": "68",
            "answerType": "number",
            "inputLabel": "Kampas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Priešingų kampų suma yra 180°.",
            "inputSuffix": "°"
        },
        {
            "id": "g10-18",
            "type": "choice",
            "section": "class",
            "label": "Trigonometrija",
            "title": "Sinusas bukajam kampui",
            "prompt": "Kam lygu sin 150°?",
            "promptDisplay": "Kam lygu \\(\\sin150^\\circ\\)?",
            "choices": [
                "−1/2",
                "1/2",
                "√3/2",
                "−√3/2"
            ],
            "choicesDisplay": [
                "\\(-\\frac12\\)",
                "\\(\\frac12\\)",
                "\\(\\frac{\\sqrt3}{2}\\)",
                "\\(-\\frac{\\sqrt3}{2}\\)"
            ],
            "answer": "1/2",
            "hint": "sin(180°−α)=sin α."
        },
        {
            "id": "g10-19",
            "type": "choice",
            "section": "class",
            "label": "Trigonometrija",
            "title": "Kosinusas bukajam kampui",
            "prompt": "Kam lygu cos 120°?",
            "promptDisplay": "Kam lygu \\(\\cos120^\\circ\\)?",
            "choices": [
                "−1/2",
                "1/2",
                "√3/2",
                "−√3/2"
            ],
            "choicesDisplay": [
                "\\(-\\frac12\\)",
                "\\(\\frac12\\)",
                "\\(\\frac{\\sqrt3}{2}\\)",
                "\\(-\\frac{\\sqrt3}{2}\\)"
            ],
            "answer": "−1/2",
            "hint": "cos(180°−α)=−cos α."
        },
        {
            "id": "g10-20",
            "type": "input",
            "section": "class",
            "label": "Trigonometrija",
            "title": "Trikampio plotas",
            "prompt": "Trikampyje ABC kraštinių AC ir BC ilgiai yra 8 cm ir 10 cm, o kampas C tarp šių kraštinių lygus 30°. Rask trikampio ABC plotą.",
            "promptDisplay": "Trikampyje \\(ABC\\) duota \\(AC=8\\text{ cm}\\), \\(BC=10\\text{ cm}\\), o kampas tarp šių kraštinių \\(\\angle C=30^\\circ\\). Rask trikampio \\(ABC\\) plotą.",
            "diagram": {
                "type": "included-angle"
            },
            "answer": "20",
            "answerType": "number",
            "inputLabel": "Plotas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Naudok formulę S=1/2·AC·BC·sin C.",
            "inputSuffix": "cm²"
        },
        {
            "id": "g10-21",
            "type": "choice",
            "section": "self",
            "label": "Trigonometrija",
            "title": "Kosinusų teorema",
            "prompt": "Trikampyje ABC kraštinių AC ir BC ilgiai yra 5 cm ir 7 cm, o kampas C tarp šių kraštinių lygus 60°. Rask trečiosios kraštinės AB ilgį.",
            "promptDisplay": "Trikampyje \\(ABC\\) duota \\(AC=5\\text{ cm}\\), \\(BC=7\\text{ cm}\\), o kampas tarp šių kraštinių \\(\\angle C=60^\\circ\\). Rask trečiosios kraštinės \\(AB\\) ilgį.",
            "diagram": {
                "type": "cosine-law"
            },
            "choices": [
                "√39 cm",
                "√74 cm",
                "39 cm",
                "74 cm"
            ],
            "choicesDisplay": [
                "\\(\\sqrt{39}\\text{ cm}\\)",
                "\\(\\sqrt{74}\\text{ cm}\\)",
                "\\(39\\text{ cm}\\)",
                "\\(74\\text{ cm}\\)"
            ],
            "answer": "√39 cm",
            "hint": "Pagal kosinusų teoremą: AB²=AC²+BC²−2·AC·BC·cos C."
        },
        {
            "id": "g10-22",
            "type": "input",
            "section": "self",
            "label": "Trigonometrija",
            "title": "Sinusų teorema",
            "prompt": "Trikampyje ABC kraštinės a=BC ilgis yra 10 cm, kampas A=30°, o kampas B=90°. Rask kraštinės b=AC ilgį.",
            "promptDisplay": "Trikampyje \\(ABC\\) duota \\(a=BC=10\\text{ cm}\\), \\(\\angle A=30^\\circ\\), \\(\\angle B=90^\\circ\\). Rask kraštinės \\(b=AC\\) ilgį.",
            "diagram": {
                "type": "sine-law"
            },
            "answer": "20",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Naudok sinusų teoremą: a/sin A = b/sin B.",
            "inputSuffix": "cm"
        },
        {
            "id": "g10-23",
            "type": "choice",
            "section": "self",
            "label": "Statistika",
            "title": "Standartinis nuokrypis",
            "prompt": "Kuris duomenų rinkinys turi didesnį standartinį nuokrypį?",
            "promptDisplay": "Kuris duomenų rinkinys turi didesnį standartinį nuokrypį?",
            "choices": [
                "A: 9, 10, 10, 11",
                "B: 2, 8, 12, 18",
                "Abu vienodą",
                "Neįmanoma pasakyti"
            ],
            "answer": "B: 2, 8, 12, 18",
            "hint": "B duomenys gerokai labiau išsisklaidę."
        },
        {
            "id": "g10-24",
            "type": "choice",
            "section": "self",
            "label": "Statistika",
            "title": "Skirstinio forma",
            "prompt": "Jei dauguma reikšmių telkiasi kairėje, o ilga uodega tęsiasi į dešinę, skirstinys yra:",
            "promptDisplay": "Jei ilga uodega tęsiasi į dešinę, skirstinys yra:",
            "choices": [
                "simetriškas",
                "dešiniškai asimetriškas",
                "kairiškai asimetriškas",
                "vienodas"
            ],
            "answer": "dešiniškai asimetriškas",
            "hint": "Asimetrijos kryptį nusako ilgosios uodegos kryptis."
        },
        {
            "id": "g10-25",
            "type": "input",
            "section": "self",
            "label": "Kombinatorika",
            "title": "Daugybos taisyklė",
            "prompt": "Yra 4 marškinėliai ir 3 kelnės. Kiek skirtingų aprangos derinių galima sudaryti pasirenkant po vieną?",
            "promptDisplay": "Yra \\(4\\) marškinėliai ir \\(3\\) kelnės. Kiek derinių?",
            "answer": "12",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Taikyk kombinatorikos daugybos taisyklę."
        },
        {
            "id": "g10-26",
            "type": "input",
            "section": "self",
            "label": "Kombinatorika",
            "title": "Tvarka svarbi",
            "prompt": "Iš 5 mokinių reikia išrinkti pirmininką ir pavaduotoją. Kiek skirtingų pasirinkimų?",
            "promptDisplay": "Iš \\(5\\) mokinių reikia išrinkti pirmininką ir pavaduotoją. Kiek pasirinkimų?",
            "answer": "20",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Pirmininką gali rinktis 5 būdais, pavaduotoją – 4."
        },
        {
            "id": "g10-27",
            "type": "input",
            "section": "self",
            "label": "Tikimybės",
            "title": "Klasikinė tikimybė",
            "prompt": "Metamas taisyklingas šešiasienis kauliukas. Kokia tikimybė išmesti lyginį skaičių? Atsakymą gali pateikti paprastąja trupmena, dešimtainiu skaičiumi arba procentais.",
            "promptDisplay": "Metamas taisyklingas šešiasienis kauliukas. Kokia tikimybė išmesti lyginį skaičių? Atsakymą gali pateikti paprastąja trupmena, dešimtainiu skaičiumi arba procentais.",
            "answer": "0,5",
            "answerType": "probability",
            "inputLabel": "Tikimybė",
            "placeholder": "Pvz., 1/2, 0,5 arba 50 %",
            "hint": "Palankūs 2, 4, 6 – trys iš šešių."
        },
        {
            "id": "g10-28",
            "type": "input",
            "section": "self",
            "label": "Tikimybės",
            "title": "Klasikinė tikimybė",
            "prompt": "Dėžėje yra 3 raudoni ir 2 mėlyni vienodi rutuliukai. Atsitiktinai ištraukiamas vienas rutuliukas. Kokia tikimybė, kad jis bus mėlynas? Atsakymą gali pateikti paprastąja trupmena, dešimtainiu skaičiumi arba procentais.",
            "promptDisplay": "Dėžėje yra \\(3\\) raudoni ir \\(2\\) mėlyni vienodi rutuliukai. Atsitiktinai ištraukiamas vienas. Kokia tikimybė, kad jis bus mėlynas? Atsakymą gali pateikti trupmena, dešimtainiu skaičiumi arba procentais.",
            "answer": "0,4",
            "answerType": "probability",
            "inputLabel": "Tikimybė",
            "placeholder": "Pvz., 2/5, 0,4 arba 40 %",
            "hint": "2 palankūs rezultatai iš 5 vienodai galimų."
        },
        {
            "id": "g10-29",
            "type": "choice",
            "section": "self",
            "label": "Kvadratinės nelygybės",
            "title": "Grafinė interpretacija",
            "prompt": "Parabolė y=x²−9 kerta x ašį taškuose, kurių x koordinatės −3 ir 3. Kuriame intervale y<0?",
            "promptDisplay": "Parabolė \\(y=x^2-9\\) kerta \\(x\\) ašį ties \\(x=-3\\) ir \\(x=3\\). Kuriame intervale \\(y<0\\)?",
            "choices": [
                "(−∞;−3)",
                "(−3;3)",
                "(3;+∞)",
                "(−∞;−3)∪(3;+∞)"
            ],
            "choicesDisplay": [
                "\\(({-}\\infty;{-}3)\\)",
                "\\(({-}3;3)\\)",
                "\\((3;+\\infty)\\)",
                "\\(({-}\\infty;{-}3)\\cup(3;+\\infty)\\)"
            ],
            "answer": "(−3;3)",
            "hint": "Aukštyn atversta parabolė žemiau x ašies yra tarp šaknų."
        },
        {
            "id": "g10-30",
            "type": "choice",
            "section": "self",
            "label": "Racionaliosios lygtys",
            "title": "Sprendinio tikrinimas",
            "prompt": "Lygtis 1/(x−2)=1/(4−x). Kuris x yra jos sprendinys?",
            "promptDisplay": "Lygtis \\(\\frac1{x-2}=\\frac1{4-x}\\). Kuris \\(x\\) yra sprendinys?",
            "choices": [
                "2",
                "3",
                "4",
                "6"
            ],
            "answer": "3",
            "hint": "Sulygink vardiklius, bet nepamiršk x≠2 ir x≠4."
        }
    ]
});

  const GRADE11B_REVIEW_LESSON = Object.freeze({
    "id": "p2-grade11b-review-01",
    "contentVersion": 1,
    "title": "11 klasės matematikos B kurso pakartojimas",
    "shortTitle": "11 klasės B kartojimas",
    "description": "30 įvairių III gimnazijos klasės bendrojo (B) kurso kartojimo užduočių: aibės, moduliai, šaknys, racionalieji laipsniai, logaritmai, trigonometrija, aritmetinės ir geometrinės progresijos, funkcijos, rodiklinės, logaritminės, iracionaliosios lygtys bei nelygybės.",
    "taskCount": 30,
    "classCount": 20,
    "selfCount": 10,
    "tasks": [
        {
            "id": "g11b-01",
            "type": "choice",
            "section": "class",
            "label": "Aibės",
            "title": "Aibių sankirta",
            "prompt": "A={1,2,3,4}, B={3,4,5}. Kokia A∩B?",
            "promptDisplay": "\\(A=\\{1,2,3,4\\}\\), \\(B=\\{3,4,5\\}\\). Kokia \\(A\\cap B\\)?",
            "choices": [
                "{1,2}",
                "{3,4}",
                "{4,5}",
                "{1,2,5}"
            ],
            "answer": "{3,4}",
            "hint": "Sankirta – bendri abiejų aibių elementai."
        },
        {
            "id": "g11b-02",
            "type": "choice",
            "section": "class",
            "label": "Aibės",
            "title": "Aibių skirtumas",
            "prompt": "A={1,2,3,4}, B={3,4,5}. Kokia A\\B?",
            "promptDisplay": "\\(A=\\{1,2,3,4\\}\\), \\(B=\\{3,4,5\\}\\). Kokia \\(A\\setminus B\\)?",
            "choices": [
                "{1,2}",
                "{3,4}",
                "{5}",
                "{1,2,5}"
            ],
            "answer": "{1,2}",
            "hint": "Palik A elementus, kurių nėra B."
        },
        {
            "id": "g11b-03",
            "type": "input",
            "section": "class",
            "label": "Modulis",
            "title": "Skaičiaus modulis",
            "prompt": "Apskaičiuok |−7|+|3−8|.",
            "promptDisplay": "Apskaičiuok \\(|-7|+|3-8|\\).",
            "answer": "12",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Modulis yra atstumas iki nulio."
        },
        {
            "id": "g11b-04",
            "type": "input",
            "section": "class",
            "label": "Modulis",
            "title": "Šaknis iš kvadrato",
            "prompt": "Kai a=−6, kam lygu √(a²)?",
            "promptDisplay": "Kai \\(a=-6\\), kam lygu \\(\\sqrt{a^2}\\)?",
            "answer": "6",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "√(a²)=|a|."
        },
        {
            "id": "g11b-05",
            "type": "input",
            "section": "class",
            "label": "Šaknys",
            "title": "Ketvirtojo laipsnio šaknis",
            "prompt": "Apskaičiuok ketvirtojo laipsnio šaknį iš 81.",
            "promptDisplay": "Apskaičiuok \\(\\sqrt[4]{81}\\).",
            "answer": "3",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "3⁴=81."
        },
        {
            "id": "g11b-06",
            "type": "input",
            "section": "class",
            "label": "Šaknys",
            "title": "Šaknų savybės",
            "prompt": "Apskaičiuok √12 · √3.",
            "promptDisplay": "Apskaičiuok \\(\\sqrt{12}\\cdot\\sqrt3\\).",
            "answer": "6",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Sujunk po viena šaknimi: √36."
        },
        {
            "id": "g11b-07",
            "type": "choice",
            "section": "class",
            "label": "Šaknys",
            "title": "Vardiklio racionalizavimas",
            "prompt": "Kuris reiškinys lygus 1/√5?",
            "promptDisplay": "Kuris reiškinys lygus \\(\\frac1{\\sqrt5}\\)?",
            "choices": [
                "√5",
                "√5/5",
                "5/√5",
                "1/5"
            ],
            "answer": "√5/5",
            "hint": "Padaugink skaitiklį ir vardiklį iš √5."
        },
        {
            "id": "g11b-08",
            "type": "input",
            "section": "class",
            "label": "Laipsniai",
            "title": "Racionalusis rodiklis",
            "prompt": "Apskaičiuok 27^(2/3).",
            "promptDisplay": "Apskaičiuok \\(27^{2/3}\\).",
            "answer": "9",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "27^(1/3)=3, tada pakelk kvadratu."
        },
        {
            "id": "g11b-09",
            "type": "input",
            "section": "class",
            "label": "Laipsniai",
            "title": "Laipsnių veiksmai",
            "prompt": "Apskaičiuok 2^(3/2) · 2^(1/2).",
            "promptDisplay": "Apskaičiuok \\(2^{3/2}\\cdot2^{1/2}\\).",
            "answer": "4",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Sudėk tos pačios bazės laipsnių rodiklius."
        },
        {
            "id": "g11b-10",
            "type": "input",
            "section": "class",
            "label": "Logaritmai",
            "title": "Logaritmo reikšmė",
            "prompt": "Apskaičiuok log₂32.",
            "promptDisplay": "Apskaičiuok \\(\\log_2 32\\).",
            "answer": "5",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "2⁵=32."
        },
        {
            "id": "g11b-11",
            "type": "input",
            "section": "class",
            "label": "Logaritmai",
            "title": "Logaritmų suma",
            "prompt": "Apskaičiuok log₁₀2 + log₁₀5.",
            "promptDisplay": "Apskaičiuok \\(\\log_{10}2+\\log_{10}5\\).",
            "answer": "1",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Log a + log b = log(ab)."
        },
        {
            "id": "g11b-12",
            "type": "input",
            "section": "class",
            "label": "Logaritmai",
            "title": "Logaritmų skirtumas",
            "prompt": "Apskaičiuok log₃27 − log₃3.",
            "promptDisplay": "Apskaičiuok \\(\\log_3 27-\\log_3 3\\).",
            "answer": "2",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Tai log₃(27/3)=log₃9."
        },
        {
            "id": "g11b-13",
            "type": "choice",
            "section": "class",
            "label": "Trigonometrija",
            "title": "Neigiamas kampas",
            "prompt": "Kam lygu sin(−30°)?",
            "promptDisplay": "Kam lygu \\(\\sin(-30^\\circ)\\)?",
            "choices": [
                "−1/2",
                "1/2",
                "−√3/2",
                "√3/2"
            ],
            "answer": "−1/2",
            "hint": "Sinusas yra nelyginė funkcija."
        },
        {
            "id": "g11b-14",
            "type": "choice",
            "section": "class",
            "label": "Trigonometrija",
            "title": "Kampas vienetiniame apskritime",
            "prompt": "Kam lygu cos 240°?",
            "promptDisplay": "Kam lygu \\(\\cos240^\\circ\\)?",
            "choices": [
                "1/2",
                "−1/2",
                "√3/2",
                "−√3/2"
            ],
            "answer": "−1/2",
            "hint": "240°=180°+60°, trečiame ketvirtyje kosinusas neigiamas."
        },
        {
            "id": "g11b-15",
            "type": "choice",
            "section": "class",
            "label": "Trigonometrija",
            "title": "Tangentas",
            "prompt": "Kam lygu tg 225°?",
            "promptDisplay": "Kam lygu \\(\\tg225^\\circ\\)?",
            "choices": [
                "−1",
                "0",
                "1",
                "√3"
            ],
            "answer": "1",
            "hint": "225°=180°+45°, tangentas kartojasi kas 180°."
        },
        {
            "id": "g11b-16",
            "type": "input",
            "section": "class",
            "label": "Atvirkštinės trigonometrinės funkcijos",
            "title": "Arksinusas",
            "prompt": "Apskaičiuok arcsin(1/2) laipsniais.",
            "promptDisplay": "Apskaičiuok \\(\\arcsin(1/2)\\) laipsniais.",
            "answer": "30",
            "answerType": "number",
            "inputLabel": "Kampas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Pagrindinė arcsin reikšmė yra intervale [−90°;90°].",
            "inputSuffix": "°"
        },
        {
            "id": "g11b-17",
            "type": "input",
            "section": "class",
            "label": "Progresijos",
            "title": "Aritmetinės progresijos narys",
            "prompt": "Aritmetinėje progresijoje a₁=4, d=3. Rask a₁₀.",
            "promptDisplay": "\\(a_1=4\\), \\(d=3\\). Rask \\(a_{10}\\).",
            "answer": "31",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "a_n=a₁+d(n−1)."
        },
        {
            "id": "g11b-18",
            "type": "input",
            "section": "class",
            "label": "Progresijos",
            "title": "Aritmetinės progresijos suma",
            "prompt": "Aritmetinėje progresijoje a₁=2, a₁₀=20. Rask S₁₀.",
            "promptDisplay": "\\(a_1=2\\), \\(a_{10}=20\\). Rask \\(S_{10}\\).",
            "answer": "110",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "S_n=(a₁+a_n)n/2."
        },
        {
            "id": "g11b-19",
            "type": "input",
            "section": "class",
            "label": "Progresijos",
            "title": "Geometrinės progresijos narys",
            "prompt": "Geometrinėje progresijoje b₁=3, q=2. Rask b₆.",
            "promptDisplay": "\\(b_1=3\\), \\(q=2\\). Rask \\(b_6\\).",
            "answer": "96",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "b_n=b₁q^(n−1)."
        },
        {
            "id": "g11b-20",
            "type": "input",
            "section": "class",
            "label": "Progresijos",
            "title": "Geometrinės progresijos suma",
            "prompt": "Geometrinėje progresijoje b₁=2, q=3. Rask pirmųjų 4 narių sumą.",
            "promptDisplay": "\\(b_1=2\\), \\(q=3\\). Rask \\(S_4\\).",
            "answer": "80",
            "answerType": "number",
            "inputLabel": "Atsakymas",
            "placeholder": "Įrašyk skaičių",
            "hint": "Nariai: 2, 6, 18, 54."
        },
        {
            "id": "g11b-21",
            "type": "choice",
            "section": "self",
            "label": "Funkcijos",
            "title": "Lyginė funkcija",
            "prompt": "Kuri funkcija yra lyginė?",
            "promptDisplay": "Kuri funkcija yra lyginė?",
            "choices": [
                "f(x)=x³",
                "f(x)=x²+1",
                "f(x)=x+1",
                "f(x)=1/x"
            ],
            "answer": "f(x)=x²+1",
            "hint": "Lyginei funkcijai f(−x)=f(x)."
        },
        {
            "id": "g11b-22",
            "type": "choice",
            "section": "self",
            "label": "Funkcijų transformacijos",
            "title": "Grafiko postūmis",
            "prompt": "Jei y=f(x), ką reiškia y=f(x)+4?",
            "promptDisplay": "Jei \\(y=f(x)\\), ką reiškia \\(y=f(x)+4\\)?",
            "choices": [
                "Grafiką 4 į kairę",
                "Grafiką 4 į dešinę",
                "Grafiką 4 aukštyn",
                "Grafiką 4 žemyn"
            ],
            "answer": "Grafiką 4 aukštyn",
            "hint": "Prie funkcijos reikšmės pridėjus 4, visos y koordinatės padidėja 4."
        },
        {
            "id": "g11b-23",
            "type": "choice",
            "section": "self",
            "label": "Rodiklinė funkcija",
            "title": "Rodiklinės funkcijos pagrindas",
            "prompt": "Funkcija y=a^x eina per tašką (2;9), a>0. Kokia a reikšmė?",
            "promptDisplay": "Funkcija \\(y=a^x\\) eina per tašką \\((2;9)\\). Kokia \\(a\\)?",
            "choices": [
                "2",
                "3",
                "4,5",
                "9"
            ],
            "answer": "3",
            "hint": "a²=9 ir a>0."
        },
        {
            "id": "g11b-24",
            "type": "input",
            "section": "self",
            "label": "Rodiklinės lygtys",
            "title": "Rodiklinė lygtis",
            "prompt": "Išspręsk 3^(x+1)=27.",
            "promptDisplay": "Išspręsk \\(3^{x+1}=27\\).",
            "answer": "2",
            "answerType": "number",
            "inputLabel": "x =",
            "placeholder": "Įrašyk skaičių",
            "hint": "27=3³, todėl x+1=3."
        },
        {
            "id": "g11b-25",
            "type": "input",
            "section": "self",
            "label": "Logaritminės lygtys",
            "title": "Logaritminė lygtis",
            "prompt": "Išspręsk log₂(x−1)=3.",
            "promptDisplay": "Išspręsk \\(\\log_2(x-1)=3\\).",
            "answer": "9",
            "answerType": "number",
            "inputLabel": "x =",
            "placeholder": "Įrašyk skaičių",
            "hint": "x−1=2³ ir x>1."
        },
        {
            "id": "g11b-26",
            "type": "input",
            "section": "self",
            "label": "Iracionaliosios lygtys",
            "title": "Lygtis su šaknimi",
            "prompt": "Išspręsk √(x+1)=3.",
            "promptDisplay": "Išspręsk \\(\\sqrt{x+1}=3\\).",
            "answer": "8",
            "answerType": "number",
            "inputLabel": "x =",
            "placeholder": "Įrašyk skaičių",
            "hint": "Pakelk abi puses kvadratu."
        },
        {
            "id": "g11b-27",
            "type": "choice",
            "section": "self",
            "label": "Racionaliosios nelygybės",
            "title": "Intervalų metodas",
            "prompt": "Išspręsk (x−1)/(x+2)>0.",
            "promptDisplay": "Išspręsk \\(\\frac{x-1}{x+2}>0\\).",
            "choices": [
                "−2<x<1",
                "x<−2 arba x>1",
                "x≤−2 arba x≥1",
                "x<1"
            ],
            "answer": "x<−2 arba x>1",
            "hint": "Ženklas teigiamas, kai skaitiklis ir vardiklis vienodo ženklo; x=−2 neleistinas."
        },
        {
            "id": "g11b-28",
            "type": "choice",
            "section": "self",
            "label": "Rodiklinės nelygybės",
            "title": "Rodiklinė nelygybė",
            "prompt": "Išspręsk 2^x > 8.",
            "promptDisplay": "Išspręsk \\(2^x>8\\).",
            "choices": [
                "x>2",
                "x>3",
                "x<3",
                "x≥3"
            ],
            "answer": "x>3",
            "hint": "8=2³, o bazė 2>1."
        },
        {
            "id": "g11b-29",
            "type": "choice",
            "section": "self",
            "label": "Logaritminės nelygybės",
            "title": "Logaritminė nelygybė",
            "prompt": "Išspręsk log₂x > 3.",
            "promptDisplay": "Išspręsk \\(\\log_2 x>3\\).",
            "choices": [
                "x>8",
                "x≥8",
                "0<x<8",
                "x<8"
            ],
            "answer": "x>8",
            "hint": "Bazė 2>1, todėl nelygybės kryptis nesikeičia."
        },
        {
            "id": "g11b-30",
            "type": "choice",
            "section": "self",
            "label": "Trigonometrinės lygtys",
            "title": "Paprasta trigonometrinė lygtis",
            "prompt": "Kuri x reikšmė intervale [0°;360°] tenkina cos x=0?",
            "promptDisplay": "Kuri \\(x\\) reikšmė intervale \\([0^\\circ;360^\\circ]\\) tenkina \\(\\cos x=0\\)?",
            "choices": [
                "0°",
                "45°",
                "90°",
                "180°"
            ],
            "answer": "90°",
            "hint": "Kosinusas lygus nuliui ties 90° ir 270°; iš pateiktų variantų tinka 90°."
        }
    ]
});

  const LESSON_CATALOG = Object.freeze([DEMO_LESSON, GRADE5_REVIEW_LESSON, GRADE7_REVIEW_LESSON, GRADE9_REVIEW_LESSON, GRADE10_REVIEW_LESSON, GRADE11B_REVIEW_LESSON]);

  window.P772BuiltInLessons = Object.freeze({
    DEMO_LESSON,
    GRADE5_REVIEW_LESSON,
    GRADE7_REVIEW_LESSON,
    GRADE9_REVIEW_LESSON,
    GRADE10_REVIEW_LESSON,
    GRADE11B_REVIEW_LESSON,
    LESSON_CATALOG
  });
})();
