(() => {
  'use strict';

  // P3.2.7.10.11.17.3: 11 klasės B kurso kartojimo V2.
  // Minimaliai padidintas užduočių sudėtingumas ir suvienodintas matematikos
  // atvaizdavimas per LaTeX/MathLive. Seni priskyrimų contentSnapshot nesikeičia.
  const PATCH = 'P2-SPLIT-P2.5-P4-P1.7.9.49-P3.2.7.10.11.17.3-GRADE11B-REVIEW-V2-LATEX';
  const LESSON_ID = 'p2-grade11b-review-01';
  const source = window.P772BuiltInLessons;
  if (!source || typeof source !== 'object') return;

  const lessonKey = Object.keys(source).find(key =>
    source[key] && !Array.isArray(source[key]) && String(source[key]?.id || '') === LESSON_ID
  );
  const original = (lessonKey ? source[lessonKey] : null)
    || (Array.isArray(source.LESSON_CATALOG)
      ? source.LESSON_CATALOG.find(item => String(item?.id || '') === LESSON_ID)
      : null);
  if (!original || !Array.isArray(original.tasks)) return;

  const lesson = JSON.parse(JSON.stringify(original));
  const updates = {
  "g11b-01": {
    "answer": "\\(\\{2,3,5\\}\\)",
    "choices": [
      "\\(\\{2,3,5\\}\\)",
      "\\(\\{2,5\\}\\)",
      "\\(\\{1,2,3,5\\}\\)",
      "\\(\\{3,5,7\\}\\)"
    ],
    "choicesDisplay": [
      "\\(\\{2,3,5\\}\\)",
      "\\(\\{2,5\\}\\)",
      "\\(\\{1,2,3,5\\}\\)",
      "\\(\\{3,5,7\\}\\)"
    ],
    "prompt": "Duota \\(A=\\{1,2,3,4,5\\}\\), \\(B=\\{2,3,5,7\\}\\), \\(C=\\{0,2,5,8\\}\\). Rask \\(A\\cap(B\\cup C)\\).",
    "promptDisplay": "Duota \\(A=\\{1,2,3,4,5\\}\\), \\(B=\\{2,3,5,7\\}\\), \\(C=\\{0,2,5,8\\}\\). Rask \\(A\\cap(B\\cup C)\\).",
    "hint": "Pirmiausia rask \\(B\\cup C\\), tada gautą aibę sukirsk su \\(A\\)."
  },
  "g11b-02": {
    "answer": "\\(\\{1,3,5\\}\\)",
    "choices": [
      "\\(\\{1,3,5\\}\\)",
      "\\(\\{2,4,6\\}\\)",
      "\\(\\{1,3,5,8\\}\\)",
      "\\(\\{2,4,6,8\\}\\)"
    ],
    "choicesDisplay": [
      "\\(\\{1,3,5\\}\\)",
      "\\(\\{2,4,6\\}\\)",
      "\\(\\{1,3,5,8\\}\\)",
      "\\(\\{2,4,6,8\\}\\)"
    ],
    "prompt": "Duota \\(A=\\{1,2,3,4,5,6\\}\\), \\(B=\\{2,4,6,8\\}\\). Rask \\(A\\setminus B\\).",
    "promptDisplay": "Duota \\(A=\\{1,2,3,4,5,6\\}\\), \\(B=\\{2,4,6,8\\}\\). Rask \\(A\\setminus B\\).",
    "hint": "Palik tik tuos \\(A\\) elementus, kurių nėra aibėje \\(B\\)."
  },
  "g11b-03": {
    "answer": "14",
    "prompt": "Apskaičiuok \\(|-8|+|3-11|-|-2|\\).",
    "promptDisplay": "Apskaičiuok \\(|-8|+|3-11|-|-2|\\).",
    "hint": "Apskaičiuok kiekvieną modulį atskirai: \\(|-8|\\), \\(|3-11|\\) ir \\(|-2|\\)."
  },
  "g11b-04": {
    "answer": "7",
    "prompt": "Kai \\(a=-4\\), kam lygu \\(\\sqrt{(a-3)^2}\\)?",
    "promptDisplay": "Kai \\(a=-4\\), kam lygu \\(\\sqrt{(a-3)^2}\\)?",
    "hint": "Naudok \\(\\sqrt{u^2}=|u|\\). Čia \\(u=a-3\\)."
  },
  "g11b-05": {
    "answer": "6",
    "prompt": "Apskaičiuok \\(\\sqrt[4]{1296}\\).",
    "promptDisplay": "Apskaičiuok \\(\\sqrt[4]{1296}\\).",
    "hint": "Rask teigiamą skaičių, kurio ketvirtasis laipsnis lygus \\(1296\\): \\(6^4=1296\\)."
  },
  "g11b-06": {
    "answer": "5",
    "prompt": "Apskaičiuok \\(\\frac{\\sqrt{75}}{\\sqrt3}\\).",
    "promptDisplay": "Apskaičiuok \\(\\frac{\\sqrt{75}}{\\sqrt3}\\).",
    "hint": "Naudok \\(\\frac{\\sqrt{75}}{\\sqrt3}=\\sqrt{\\frac{75}{3}}\\)."
  },
  "g11b-07": {
    "answer": "\\(\\frac{2\\sqrt3}{3}\\)",
    "choices": [
      "\\(2\\sqrt3\\)",
      "\\(\\frac{2\\sqrt3}{3}\\)",
      "\\(\\frac{\\sqrt3}{3}\\)",
      "\\(\\frac23\\)"
    ],
    "choicesDisplay": [
      "\\(2\\sqrt3\\)",
      "\\(\\frac{2\\sqrt3}{3}\\)",
      "\\(\\frac{\\sqrt3}{3}\\)",
      "\\(\\frac23\\)"
    ],
    "prompt": "Kuris reiškinys lygus \\(\\frac2{\\sqrt3}\\), kai vardiklis racionalizuotas?",
    "promptDisplay": "Kuris reiškinys lygus \\(\\frac2{\\sqrt3}\\), kai vardiklis racionalizuotas?",
    "hint": "Padaugink skaitiklį ir vardiklį iš \\(\\sqrt3\\)."
  },
  "g11b-08": {
    "answer": "8",
    "prompt": "Apskaičiuok \\(16^{3/4}\\).",
    "promptDisplay": "Apskaičiuok \\(16^{3/4}\\).",
    "hint": "Pirmiausia rask \\(16^{1/4}=2\\), tada rezultatą pakelk trečiuoju laipsniu."
  },
  "g11b-09": {
    "answer": "2",
    "prompt": "Apskaičiuok \\(\\frac{2^{5/3}}{2^{2/3}}\\).",
    "promptDisplay": "Apskaičiuok \\(\\frac{2^{5/3}}{2^{2/3}}\\).",
    "hint": "Dalijant tos pačios bazės laipsnius, rodikliai atimami: \\(\\frac{a^m}{a^n}=a^{m-n}\\)."
  },
  "g11b-10": {
    "answer": "3",
    "prompt": "Apskaičiuok \\(\\log_4 64\\).",
    "promptDisplay": "Apskaičiuok \\(\\log_4 64\\).",
    "hint": "Rask tokį \\(k\\), kad \\(4^k=64\\)."
  },
  "g11b-11": {
    "answer": "2",
    "prompt": "Apskaičiuok \\(\\log_{10}4+\\log_{10}25\\).",
    "promptDisplay": "Apskaičiuok \\(\\log_{10}4+\\log_{10}25\\).",
    "hint": "Naudok \\(\\log a+\\log b=\\log(ab)\\)."
  },
  "g11b-12": {
    "answer": "3",
    "prompt": "Apskaičiuok \\(\\log_2 72-\\log_2 9\\).",
    "promptDisplay": "Apskaičiuok \\(\\log_2 72-\\log_2 9\\).",
    "hint": "Naudok \\(\\log_2 72-\\log_2 9=\\log_2\\!\\left(\\frac{72}{9}\\right)\\)."
  },
  "g11b-13": {
    "answer": "\\(-\\frac12\\)",
    "choices": [
      "\\(-\\frac12\\)",
      "\\(\\frac12\\)",
      "\\(-\\frac{\\sqrt3}{2}\\)",
      "\\(\\frac{\\sqrt3}{2}\\)"
    ],
    "choicesDisplay": [
      "\\(-\\frac12\\)",
      "\\(\\frac12\\)",
      "\\(-\\frac{\\sqrt3}{2}\\)",
      "\\(\\frac{\\sqrt3}{2}\\)"
    ],
    "prompt": "Kam lygu \\(\\sin(-150^\\circ)\\)?",
    "promptDisplay": "Kam lygu \\(\\sin(-150^\\circ)\\)?",
    "hint": "Naudok \\(\\sin(-\\alpha)=-\\sin\\alpha\\) ir \\(\\sin150^\\circ=\\frac12\\)."
  },
  "g11b-14": {
    "answer": "\\(\\frac{\\sqrt3}{2}\\)",
    "choices": [
      "\\(\\frac12\\)",
      "\\(-\\frac12\\)",
      "\\(\\frac{\\sqrt3}{2}\\)",
      "\\(-\\frac{\\sqrt3}{2}\\)"
    ],
    "choicesDisplay": [
      "\\(\\frac12\\)",
      "\\(-\\frac12\\)",
      "\\(\\frac{\\sqrt3}{2}\\)",
      "\\(-\\frac{\\sqrt3}{2}\\)"
    ],
    "prompt": "Kam lygu \\(\\cos330^\\circ\\)?",
    "promptDisplay": "Kam lygu \\(\\cos330^\\circ\\)?",
    "hint": "\\(330^\\circ=360^\\circ-30^\\circ\\), o ketvirtajame ketvirtyje kosinusas teigiamas."
  },
  "g11b-15": {
    "answer": "\\(-1\\)",
    "choices": [
      "\\(-1\\)",
      "\\(0\\)",
      "\\(1\\)",
      "\\(\\sqrt3\\)"
    ],
    "choicesDisplay": [
      "\\(-1\\)",
      "\\(0\\)",
      "\\(1\\)",
      "\\(\\sqrt3\\)"
    ],
    "prompt": "Kam lygu \\(\\operatorname{tg}315^\\circ\\)?",
    "promptDisplay": "Kam lygu \\(\\operatorname{tg}315^\\circ\\)?",
    "hint": "\\(315^\\circ=360^\\circ-45^\\circ\\), o ketvirtajame ketvirtyje tangentas neigiamas."
  },
  "g11b-16": {
    "answer": "-60",
    "prompt": "Apskaičiuok \\(\\arcsin\\!\\left(-\\frac{\\sqrt3}{2}\\right)\\) laipsniais.",
    "promptDisplay": "Apskaičiuok \\(\\arcsin\\!\\left(-\\frac{\\sqrt3}{2}\\right)\\) laipsniais.",
    "hint": "Pagrindinė \\(\\arcsin\\) reikšmė priklauso intervalui \\([-90^\\circ;90^\\circ]\\)."
  },
  "g11b-17": {
    "answer": "46",
    "prompt": "Aritmetinėje progresijoje \\(a_3=10\\), \\(d=4\\). Rask \\(a_{12}\\).",
    "promptDisplay": "Aritmetinėje progresijoje \\(a_3=10\\), \\(d=4\\). Rask \\(a_{12}\\).",
    "hint": "Nuo \\(a_3\\) iki \\(a_{12}\\) yra \\(9\\) žingsniai, todėl \\(a_{12}=a_3+9d\\)."
  },
  "g11b-18": {
    "answer": "155",
    "prompt": "Aritmetinėje progresijoje \\(a_4=11\\), \\(d=3\\). Rask \\(S_{10}\\).",
    "promptDisplay": "Aritmetinėje progresijoje \\(a_4=11\\), \\(d=3\\). Rask \\(S_{10}\\).",
    "hint": "Pirmiausia rask \\(a_1\\) iš \\(a_4=a_1+3d\\), tada naudok \\(S_n=\\frac{(a_1+a_n)n}{2}\\)."
  },
  "g11b-19": {
    "answer": "96",
    "prompt": "Geometrinėje progresijoje \\(b_2=6\\), \\(q=2\\). Rask \\(b_6\\).",
    "promptDisplay": "Geometrinėje progresijoje \\(b_2=6\\), \\(q=2\\). Rask \\(b_6\\).",
    "hint": "Nuo \\(b_2\\) iki \\(b_6\\) yra \\(4\\) dauginimai iš \\(q\\): \\(b_6=b_2q^4\\)."
  },
  "g11b-20": {
    "answer": "93",
    "prompt": "Geometrinėje progresijoje \\(b_1=3\\), \\(q=2\\). Rask \\(S_5\\).",
    "promptDisplay": "Geometrinėje progresijoje \\(b_1=3\\), \\(q=2\\). Rask \\(S_5\\).",
    "hint": "Naudok \\(S_n=b_1\\frac{q^n-1}{q-1}\\), kai \\(q\\ne1\\)."
  },
  "g11b-21": {
    "answer": "\\(f(x)=x^4-3x^2+1\\)",
    "choices": [
      "\\(f(x)=x^3-x\\)",
      "\\(f(x)=x^4-3x^2+1\\)",
      "\\(f(x)=x^2+x\\)",
      "\\(f(x)=\\frac1x+1\\)"
    ],
    "choicesDisplay": [
      "\\(f(x)=x^3-x\\)",
      "\\(f(x)=x^4-3x^2+1\\)",
      "\\(f(x)=x^2+x\\)",
      "\\(f(x)=\\frac1x+1\\)"
    ],
    "prompt": "Kuri funkcija \\(f\\) yra lyginė?",
    "promptDisplay": "Kuri funkcija \\(f\\) yra lyginė?",
    "hint": "Lyginei funkcijai turi galioti \\(f(-x)=f(x)\\)."
  },
  "g11b-22": {
    "answer": "Grafiką \\(3\\) į dešinę ir \\(2\\) aukštyn",
    "choices": [
      "Grafiką \\(3\\) į kairę ir \\(2\\) aukštyn",
      "Grafiką \\(3\\) į dešinę ir \\(2\\) aukštyn",
      "Grafiką \\(2\\) į dešinę ir \\(3\\) aukštyn",
      "Grafiką \\(3\\) į dešinę ir \\(2\\) žemyn"
    ],
    "choicesDisplay": [
      "Grafiką \\(3\\) į kairę ir \\(2\\) aukštyn",
      "Grafiką \\(3\\) į dešinę ir \\(2\\) aukštyn",
      "Grafiką \\(2\\) į dešinę ir \\(3\\) aukštyn",
      "Grafiką \\(3\\) į dešinę ir \\(2\\) žemyn"
    ],
    "prompt": "Jei \\(y=f(x)\\), kaip gaunamas funkcijos \\(y=f(x-3)+2\\) grafikas?",
    "promptDisplay": "Jei \\(y=f(x)\\), kaip gaunamas funkcijos \\(y=f(x-3)+2\\) grafikas?",
    "hint": "Pakeitimas \\(x\\to x-3\\) stumia grafiką \\(3\\) į dešinę, o \\(+2\\) – \\(2\\) aukštyn."
  },
  "g11b-23": {
    "answer": "\\(4\\)",
    "choices": [
      "\\(2\\)",
      "\\(3\\)",
      "\\(4\\)",
      "\\(8\\)"
    ],
    "choicesDisplay": [
      "\\(2\\)",
      "\\(3\\)",
      "\\(4\\)",
      "\\(8\\)"
    ],
    "prompt": "Funkcijos \\(y=a^x\\) grafikas eina per tašką \\((3;64)\\), \\(a>0\\). Kokia \\(a\\) reikšmė?",
    "promptDisplay": "Funkcijos \\(y=a^x\\) grafikas eina per tašką \\((3;64)\\), \\(a>0\\). Kokia \\(a\\) reikšmė?",
    "hint": "Iš taško gauname \\(a^3=64\\)."
  },
  "g11b-24": {
    "answer": "3",
    "prompt": "Išspręsk \\(2^{2x-1}=32\\).",
    "promptDisplay": "Išspręsk \\(2^{2x-1}=32\\).",
    "hint": "Kadangi \\(32=2^5\\), gauname \\(2x-1=5\\)."
  },
  "g11b-25": {
    "answer": "5",
    "prompt": "Išspręsk \\(\\log_3(2x-1)=2\\).",
    "promptDisplay": "Išspręsk \\(\\log_3(2x-1)=2\\).",
    "hint": "Gauname \\(2x-1=3^2\\). Taip pat turi galioti \\(2x-1>0\\)."
  },
  "g11b-26": {
    "answer": "11",
    "prompt": "Išspręsk \\(\\sqrt{2x+3}=5\\).",
    "promptDisplay": "Išspręsk \\(\\sqrt{2x+3}=5\\).",
    "hint": "Pakelk abi lygties puses kvadratu ir patikrink gautą \\(x\\) pradinėje lygtyje."
  },
  "g11b-27": {
    "answer": "\\(x\\in(-3;2]\\)",
    "choices": [
      "\\(x\\in[-3;2]\\)",
      "\\(x\\in(-3;2]\\)",
      "\\(x\\in(-\\infty;-3)\\cup[2;+\\infty)\\)",
      "\\(x\\in(-3;2)\\)"
    ],
    "choicesDisplay": [
      "\\(x\\in[-3;2]\\)",
      "\\(x\\in(-3;2]\\)",
      "\\(x\\in(-\\infty;-3)\\cup[2;+\\infty)\\)",
      "\\(x\\in(-3;2)\\)"
    ],
    "prompt": "Išspręsk \\(\\frac{x-2}{x+3}\\le0\\).",
    "promptDisplay": "Išspręsk \\(\\frac{x-2}{x+3}\\le0\\).",
    "hint": "Kritiniai taškai yra \\(x=-3\\) ir \\(x=2\\). Reikšmė \\(x=-3\\) neleistina, o \\(x=2\\) tenkina nelygybę."
  },
  "g11b-28": {
    "answer": "\\(x>4\\)",
    "choices": [
      "\\(x>3\\)",
      "\\(x>4\\)",
      "\\(x<4\\)",
      "\\(x\\ge4\\)"
    ],
    "choicesDisplay": [
      "\\(x>3\\)",
      "\\(x>4\\)",
      "\\(x<4\\)",
      "\\(x\\ge4\\)"
    ],
    "prompt": "Išspręsk \\(3^{x-1}>27\\).",
    "promptDisplay": "Išspręsk \\(3^{x-1}>27\\).",
    "hint": "Kadangi \\(27=3^3\\) ir \\(3>1\\), gauname \\(x-1>3\\)."
  },
  "g11b-29": {
    "answer": "\\(x\\ge9\\)",
    "choices": [
      "\\(x>8\\)",
      "\\(x\\ge9\\)",
      "\\(1<x\\le9\\)",
      "\\(x\\le9\\)"
    ],
    "choicesDisplay": [
      "\\(x>8\\)",
      "\\(x\\ge9\\)",
      "\\(1<x\\le9\\)",
      "\\(x\\le9\\)"
    ],
    "prompt": "Išspręsk \\(\\log_2(x-1)\\ge3\\).",
    "promptDisplay": "Išspręsk \\(\\log_2(x-1)\\ge3\\).",
    "hint": "Pirma sąlyga: \\(x-1>0\\). Kadangi \\(2>1\\), iš nelygybės gauname \\(x-1\\ge2^3\\)."
  },
  "g11b-30": {
    "answer": "\\(x\\in\\{90^\\circ,270^\\circ\\}\\)",
    "choices": [
      "\\(x\\in\\{0^\\circ,180^\\circ\\}\\)",
      "\\(x\\in\\{90^\\circ,270^\\circ\\}\\)",
      "\\(x\\in\\{45^\\circ,315^\\circ\\}\\)",
      "\\(x\\in\\{90^\\circ,180^\\circ,270^\\circ\\}\\)"
    ],
    "choicesDisplay": [
      "\\(x\\in\\{0^\\circ,180^\\circ\\}\\)",
      "\\(x\\in\\{90^\\circ,270^\\circ\\}\\)",
      "\\(x\\in\\{45^\\circ,315^\\circ\\}\\)",
      "\\(x\\in\\{90^\\circ,180^\\circ,270^\\circ\\}\\)"
    ],
    "prompt": "Išspręsk \\(\\cos x=0\\), kai \\(x\\in[0^\\circ;360^\\circ]\\). Pasirink visų sprendinių aibę.",
    "promptDisplay": "Išspręsk \\(\\cos x=0\\), kai \\(x\\in[0^\\circ;360^\\circ]\\). Pasirink visų sprendinių aibę.",
    "hint": "Intervale \\([0^\\circ;360^\\circ]\\) kosinusas lygus nuliui ties \\(90^\\circ\\) ir \\(270^\\circ\\)."
  }
};

  lesson.tasks = lesson.tasks.map(task => {
    const change = updates[String(task?.id || '')];
    return change ? { ...task, ...change } : task;
  });

  lesson.contentVersion = Math.max(2, Number(original.contentVersion || 1));
  lesson.updatedAt = '2026-08-18T11:24:00.000Z';
  lesson.contentPatch = PATCH;

  const catalog = Array.isArray(source.LESSON_CATALOG)
    ? source.LESSON_CATALOG.map(item => String(item?.id || '') === LESSON_ID ? lesson : item)
    : [];

  window.P772BuiltInLessons = Object.freeze({
    ...source,
    ...(lessonKey ? { [lessonKey]: Object.freeze(lesson) } : {}),
    LESSON_CATALOG: Object.freeze(catalog)
  });
})();
