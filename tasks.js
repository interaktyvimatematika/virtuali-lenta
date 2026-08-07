(() => {
  'use strict';

  /*
   * P7.7.2 bendro modelio sutartis. Mokytojo režimas redaguoja tą patį objektą, kurį vėliau galės generuoti DI.
   * Sąsaja neatpažįsta konkrečių temų pagal pavadinimą. Ji žiūri tik į:
   *   response.renderer  – kokį mokinio darbo lauką parodyti;
   *   response.validator – kuriam tikrintuvo moduliui perduoti atsakymą.
   * Tokį patį objektą ateityje galės sukurti DI, rankinis redagavimo režimas
   * arba užduočių biblioteka.
   */
  window.PRACTICE_PACKAGE = {
    schemaVersion: 1,
    contract: 'interactive-practice-package@1',
    id: 'p3-authoring-demo',
    title: 'Universalios matematikos pratybos',
    eyebrow: 'DI TINKAMAS PRATYBŲ MODELIS · P7.7.2',
    tasks: [
      {
        id: 'expression-001',
        title: 'Suprastink reiškinį',
        instruction: 'Iškelk bendrąjį daugiklį ir įrašyk galutinį, kuo paprastesnį reiškinį.',
        difficulty: 'Pagrindai',
        prompt: { kind: 'expression', value: '(2x^2 + 4x) : (2x)' },
        note: 'Pradinio reiškinio apibrėžimo sąlyga: x ≠ 0',
        hint: 'Skaitiklyje iškelk 2x: 2x(x + 2). Tada sutrumpink bendrąjį daugiklį 2x.',
        response: {
          renderer: 'single-math-input',
          valueType: 'expression',
          label: 'Galutinis reiškinys',
          placeholder: 'Pvz., x + 2',
          validator: 'expression-equivalence',
          options: {
            expected: 'x + 2',
            requireSimplified: true,
            domain: 'x ≠ 0',
            samples: [-7, -3, -1, 0.5, 2, 5, 11]
          }
        }
      },
      {
        id: 'expression-002',
        title: 'Pritaikyk kvadratų skirtumo formulę',
        instruction: 'Sutrumpink trupmeną ir įrašyk galutinį reiškinį. Sistema turi vertinti matematinę lygybę, o ne teksto sutapimą.',
        difficulty: 'Formulės',
        prompt: { kind: 'expression', value: '(x^2 - 9) : (x - 3)' },
        note: 'Pradinio reiškinio apibrėžimo sąlyga: x ≠ 3',
        hint: 'x² − 9 = (x − 3)(x + 3). Sutrumpink bendrąjį daugiklį x − 3.',
        response: {
          renderer: 'single-math-input',
          valueType: 'expression',
          label: 'Galutinis reiškinys',
          placeholder: 'Pvz., x + 3',
          validator: 'expression-equivalence',
          options: {
            expected: 'x + 3',
            requireSimplified: true,
            domain: 'x ≠ 3',
            samples: [-7, -2, 0, 1, 2.5, 4, 8]
          }
        }
      },
      {
        id: 'expression-003',
        title: 'Įrašyk mišrųjį skaičių',
        instruction: 'Paversk netaisyklingąją trupmeną mišriuoju skaičiumi. Įvesties pavyzdys: 2 1/3.',
        difficulty: 'Matematinė įvestis',
        prompt: { kind: 'expression', value: '7 : 3' },
        note: 'Galutinis atsakymas turi būti užrašytas mišriuoju skaičiumi, kaip prašoma instrukcijoje.',
        hint: '7 padalijus iš 3 gauname 2 sveikuosius ir lieka 1 trečdalis.',
        assessment: {
          mode: 'single-condition',
          criteria: [
            { id: 'mathematical-correctness', type: 'validator', role: 'primary', label: 'Teisinga trupmenos reikšmė' },
            { id: 'mixed-number-form', type: 'required-answer-form', role: 'primary', label: 'Trupmena perrašyta mišriuoju skaičiumi', expected: 'mixed-number' }
          ]
        },
        response: {
          renderer: 'single-math-input',
          valueType: 'expression',
          label: 'Mišrusis skaičius',
          placeholder: 'Pvz., 2 1/3',
          validator: 'expression-equivalence',
          options: {
            expected: '7/3',
            expectedDisplay: '2 1/3',
            requiredAnswerForm: 'mixed-number',
            requireSimplified: false,
            domain: 'vardiklis nelygus 0',
            samples: [-7, -2, 0, 1, 3, 8]
          }
        }
      },
      {
        id: 'equation-001',
        title: 'Išspręsk tiesinę lygtį',
        instruction: 'Įrašyk sprendimo žingsnius. Kiekvienoje eilutėje rašyk visą naują lygtį. Tikrintuvas ieškos pirmojo žingsnio, pakeitusio sprendinių aibę.',
        difficulty: 'Sprendimo eiga',
        prompt: { kind: 'equation', value: '2x + 4 = 10' },
        note: 'Tikslas: gauti lygtį, kurioje x yra izoliuotas.',
        hint: 'Pirmiausia atimk 4 iš abiejų lygties pusių, tada abi puses padalyk iš 2.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Pvz., 2x = 6',
          validator: 'linear-equation-chain',
          options: {
            initial: '2x + 4 = 10',
            expectedVariable: 'x',
            expectedValue: 3,
            minimumSteps: 1
          }
        }
      },
      {
        id: 'equation-002',
        title: 'Išspręsk lygtį su skliaustais',
        instruction: 'Tvarkyk lygtį žingsniais ir užbaik izoliuotu kintamuoju. Galima pridėti tiek eilučių, kiek reikia.',
        difficulty: 'Sprendimo eiga',
        prompt: { kind: 'equation', value: '3(x - 2) + 5 = 2x + 7' },
        note: 'Kiekvienas žingsnis turi išlaikyti tą pačią sprendinių aibę.',
        hint: 'Išskleisk skliaustus: 3x − 6 + 5 = 2x + 7. Sutrauk narius ir perkelk 2x į kairę pusę.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Pvz., 3x - 1 = 2x + 7',
          validator: 'linear-equation-chain',
          options: {
            initial: '3(x - 2) + 5 = 2x + 7',
            expectedVariable: 'x',
            expectedValue: 8,
            minimumSteps: 1
          }
        }
      },
      {
        id: 'equation-003',
        title: 'Lygtis su mišriuoju sprendiniu',
        instruction: 'Išspręsk lygtį ir galutinėje eilutėje atsakymą įrašyk mišriuoju skaičiumi.',
        difficulty: 'Matematinė įvestis',
        prompt: { kind: 'equation', value: '3x = 7' },
        note: 'Galutinę eilutę galima rašyti x = 2 1/3 arba x = 2 1:3.',
        hint: 'Abi lygties puses padalyk iš 3.',
        assessment: {
          mode: 'multi-condition',
          criteria: [
            { id: 'mathematical-correctness', type: 'validator', role: 'primary', label: 'Rastas teisingas lygties sprendinys' },
            { id: 'mixed-number-form', type: 'required-answer-form', role: 'secondary', label: 'Atsakymas pateiktas mišriuoju skaičiumi', expected: 'mixed-number' }
          ]
        },
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Pvz., x = 2 1/3',
          validator: 'linear-equation-chain',
          options: {
            initial: '3x = 7',
            expectedVariable: 'x',
            expectedValue: 7 / 3,
            expectedDisplay: '2 1/3',
            requiredAnswerForm: 'mixed-number',
            minimumSteps: 1
          }
        }
      },
      {
        id: 'quadratic-001',
        title: 'Kvadratinė lygtis su dviem sprendiniais',
        instruction: 'Išspręsk kvadratinę lygtį, parodydamas sprendimo eigą. Kai gauni kelis galimus atvejus, rašyk juos greta toje pačioje sprendimo eilutėje.',
        difficulty: 'Kvadratinės lygtys',
        prompt: { kind: 'equation', value: 'x^2 - 5x + 6 = 0' },
        note: 'Kiekvieną gautą atvejį spręsk atskirai, o pabaigoje pateik visus sprendinius.',
        hint: 'Išskaidyk trinario daugianarį dauginamaisiais: rask du skaičius, kurių sandauga 6, o suma −5.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Pvz., (x - 2)(x - 3) = 0',
          validator: 'quadratic-equation-chain',
          options: {
            initial: 'x^2 - 5x + 6 = 0',
            expectedVariable: 'x',
            expectedValues: [2, 3],
            expectedDisplay: 'x = 2; x = 3',
            minimumSteps: 2,
            autoDerived: true
          }
        }
      },
      {
        id: 'quadratic-002',
        title: 'Kvadratinė lygtis su dvigubu sprendiniu',
        instruction: 'Išspręsk kvadratinę lygtį, parodydamas sprendimo eigą.',
        difficulty: 'Kvadratinės lygtys',
        prompt: { kind: 'equation', value: 'x^2 - 6x + 9 = 0' },
        note: 'Ši lygtis turi vieną dvigubą sprendinį.',
        hint: 'Atpažink pilnojo kvadrato formulę.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Pvz., (x - 3)^2 = 0',
          validator: 'quadratic-equation-chain',
          options: {
            initial: 'x^2 - 6x + 9 = 0',
            expectedVariable: 'x',
            expectedValues: [3],
            expectedDisplay: 'x = 3',
            minimumSteps: 2,
            autoDerived: true
          }
        }
      },
      {
        id: 'quadratic-003',
        title: 'Kvadratinė lygtis be realiųjų sprendinių',
        instruction: 'Ištirk lygtį ir parodyk, kodėl ji neturi realiųjų sprendinių. Pabaigoje įrašyk „sprendinių nėra“ arba ∅.',
        difficulty: 'Kvadratinės lygtys',
        prompt: { kind: 'equation', value: 'x^2 + 1 = 0' },
        note: 'Sprendžiama realiųjų skaičių aibėje.',
        hint: 'Realiųjų skaičių kvadratas negali būti neigiamas.',
        response: {
          renderer: 'math-step-list',
          valueType: 'equation',
          label: 'Sprendimo eiga',
          placeholder: 'Pvz., x^2 = -1',
          validator: 'quadratic-equation-chain',
          options: {
            initial: 'x^2 + 1 = 0',
            expectedVariable: 'x',
            expectedValues: [],
            expectedDisplay: 'sprendinių nėra',
            solutionKind: 'none',
            minimumSteps: 1,
            autoDerived: true
          }
        }
      }

    ]
  };
})();
