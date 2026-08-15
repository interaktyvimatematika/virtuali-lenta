(() => {
  'use strict';

  // P1.7.9.49-M2.8.1: universalios matematikos juostos duomenys, įterpimo
  // semantika ir UI puslapiavimas. MathLive lauko branduolys lieka
  // board-math-field.js, o mišraus teksto redaktoriaus gyvavimo ciklas – app.js.
  function createEngine(options = {}) {
    const refs = options.refs || {};
    const state = options.state || {};
    const mathSelectionByKey = options.mathSelectionByKey || new Map();
    const hooks = options.hooks || {};

    const resolveActiveMathField = (...args) => hooks.resolveActiveMathField?.(...args) ?? null;
    const clearMathEditSession = (...args) => hooks.clearMathEditSession?.(...args);
    const showToast = (...args) => hooks.showToast?.(...args);
    const captureMathFieldSelection = (...args) => hooks.captureMathFieldSelection?.(...args) ?? null;
    const mathFieldKey = (...args) => hooks.mathFieldKey?.(...args) ?? '';
    const restoreMathFieldSelection = (...args) => hooks.restoreMathFieldSelection?.(...args) ?? false;
    const setActiveDirectMathField = (...args) => hooks.setActiveDirectMathField?.(...args);
    const mathSelectionHasContent = (...args) => hooks.mathSelectionHasContent?.(...args) ?? false;
    const rawDirectMathLatex = (...args) => hooks.rawDirectMathLatex?.(...args) ?? '';
    const isVbeVectorToolbarExitOperator = (...args) => hooks.isVbeVectorToolbarExitOperator?.(...args) ?? false;
    const exitActiveVbeVectorPrompt = (...args) => hooks.exitActiveVbeVectorPrompt?.(...args) ?? false;
    const beginVbeVectorDeletion = (...args) => hooks.beginVbeVectorDeletion?.(...args) ?? { handled: false };
    const finishVbeVectorDeletion = (...args) => hooks.finishVbeVectorDeletion?.(...args);
    const moveMathPlaceholderOrField = (...args) => hooks.moveMathPlaceholderOrField?.(...args) ?? false;
    const findInsertedVbeVectorIndex = (...args) => hooks.findInsertedVbeVectorIndex?.(...args) ?? -1;
    const scanVbeVectors = (...args) => hooks.scanVbeVectors?.(...args) ?? [];
    const clearVbeVectorPromptState = (...args) => hooks.clearVbeVectorPromptState?.(...args);
    const reaffirmMathEditSession = (...args) => hooks.reaffirmMathEditSession?.(...args) ?? false;
    const ensureMathFieldVisible = (...args) => hooks.ensureMathFieldVisible?.(...args);
    const getActiveMathContext = () => hooks.getActiveMathContext?.() ?? '';
    const getActiveMixedTextEditor = () => hooks.getActiveMixedTextEditor?.() ?? null;
    const activateExplicitMathMode = (...args) => hooks.activateExplicitMathMode?.(...args) ?? null;
    const toolbarTextRangeForMixedEditor = (...args) => hooks.toolbarTextRangeForMixedEditor?.(...args) ?? null;
    const deactivateMathForMixedTextRange = (...args) => hooks.deactivateMathForMixedTextRange?.(...args);
    const resolveMixedMathTarget = (...args) => hooks.resolveMixedMathTarget?.(...args) ?? null;
    const scheduleSave = (...args) => hooks.scheduleSave?.(...args);

    const MATH_CATEGORIES = Object.freeze([
      'Pagrindiniai',
      'Veiksmai ir palyginimai',
      'Logika',
      'Skliaustai',
      'Struktūros',
      'Raidės',
      'Funkcijos',
      'Sistemos',
      'Intervalai',
      'Analizė',
      'Vektoriai'
    ]);

    const PINNED_MATH_KEYS = Object.freeze([
      { label: '𝑥', action: 'math-mode', aria: 'Matematinis režimas – paversti pažymėtą arba prieš žymeklį esantį fragmentą formule', title: 'Matematinis režimas (Alt+=)' }
    ]);

    const DIRECT_MATH_KEYS = Object.freeze([
      // Pagrindiniai — dažniausi veiksmai pirmiausia, kad juosta būtų suprantama ir jaunesniems mokiniams.
      { category: 'Pagrindiniai', label: '+', insert: '+', aria: 'Sudėtis' },
      { category: 'Pagrindiniai', label: '−', insert: '-', aria: 'Atimtis' },
      { category: 'Pagrindiniai', label: '·', insert: '\\cdot ', aria: 'Daugyba' },
      { category: 'Pagrindiniai', label: ':', insert: ':', aria: 'Dalyba' },
      { category: 'Pagrindiniai', label: '=', insert: '=', aria: 'Lygybė' },
      { category: 'Pagrindiniai', label: 'x²', insert: '^2', aria: 'Kvadratas' },
      { category: 'Pagrindiniai', label: 'xⁿ', visual: 'power', structure: 'power', aria: 'Laipsnis' },
      { category: 'Pagrindiniai', label: '√', visual: 'root', structure: 'root', aria: 'Kvadratinė šaknis' },
      { category: 'Pagrindiniai', label: 'a⁄b', visual: 'fraction', structure: 'fraction', aria: 'Trupmena' },
      { category: 'Pagrindiniai', label: '( )', structure: 'parentheses', aria: 'Apvalieji skliaustai' },

      // Veiksmai ir palyginimai
      { category: 'Veiksmai ir palyginimai', label: '+', insert: '+' },
      { category: 'Veiksmai ir palyginimai', label: '−', insert: '-' },
      { category: 'Veiksmai ir palyginimai', label: '·', insert: '\\cdot ' },
      { category: 'Veiksmai ir palyginimai', label: ':', insert: ':' },
      { category: 'Veiksmai ir palyginimai', label: '=', insert: '=' },
      { category: 'Veiksmai ir palyginimai', label: '≠', insert: '\\ne ' },
      { category: 'Veiksmai ir palyginimai', label: '<', insert: '<' },
      { category: 'Veiksmai ir palyginimai', label: '>', insert: '>' },
      { category: 'Veiksmai ir palyginimai', label: '≤', insert: '\\le ' },
      { category: 'Veiksmai ir palyginimai', label: '≥', insert: '\\ge ' },
      { category: 'Veiksmai ir palyginimai', label: '≈', insert: '\\approx ' },
      { category: 'Veiksmai ir palyginimai', label: '≡', insert: '\\equiv ' },
      { category: 'Veiksmai ir palyginimai', label: '±', insert: '\\pm ' },
      { category: 'Veiksmai ir palyginimai', label: '∓', insert: '\\mp ' },
      { category: 'Veiksmai ir palyginimai', label: '∝', insert: '\\propto ' },
      { category: 'Veiksmai ir palyginimai', label: '∞', insert: '\\infty' },

      // Matematinė logika — dažniausi loginiai ryšiai ir kvantoriai.
      { category: 'Logika', label: '⇒', insert: '\\Rightarrow ', aria: 'Implikacija' },
      { category: 'Logika', label: '⇔', insert: '\\Leftrightarrow ', aria: 'Ekvivalencija' },
      { category: 'Logika', label: '¬', insert: '\\neg ', aria: 'Neigimas' },
      { category: 'Logika', label: '∧', insert: '\\land ', aria: 'Loginė konjunkcija' },
      { category: 'Logika', label: '∨', insert: '\\lor ', aria: 'Loginė disjunkcija' },
      { category: 'Logika', label: '∀', insert: '\\forall ', aria: 'Universalusis kvantorius' },
      { category: 'Logika', label: '∃', insert: '\\exists ', aria: 'Egzistavimo kvantorius' },

      // Skliaustai
      { category: 'Skliaustai', label: '( )', structure: 'parentheses', aria: 'Apvalieji skliaustai' },
      { category: 'Skliaustai', label: '[ ]', structure: 'brackets', aria: 'Laužtiniai skliaustai' },
      { category: 'Skliaustai', label: '{ }', structure: 'braces', aria: 'Figūriniai skliaustai' },
      { category: 'Skliaustai', label: '|x|', structure: 'absolute', aria: 'Modulis' },
      { category: 'Skliaustai', label: '‖x‖', structure: 'norm', aria: 'Norma' },
      { category: 'Skliaustai', label: '⌊x⌋', structure: 'floor', aria: 'Apatinė sveikoji dalis' },
      { category: 'Skliaustai', label: '⌈x⌉', structure: 'ceil', aria: 'Viršutinė sveikoji dalis' },

      // Struktūros
      { category: 'Struktūros', label: 'a⁄b', visual: 'fraction', structure: 'fraction', aria: 'Trupmena' },
      { category: 'Struktūros', label: '√', visual: 'root', structure: 'root', aria: 'Kvadratinė šaknis' },
      { category: 'Struktūros', label: 'ⁿ√', visual: 'nth-root', structure: 'nth-root', aria: 'N-tojo laipsnio šaknis' },
      { category: 'Struktūros', label: 'x²', insert: '^2', aria: 'Kvadratas' },
      { category: 'Struktūros', label: 'xⁿ', visual: 'power', structure: 'power', aria: 'Laipsnis' },
      { category: 'Struktūros', label: 'xₙ', structure: 'subscript', aria: 'Apatinis indeksas' },
      { category: 'Struktūros', label: '(n k)', visual: 'binomial', structure: 'binomial', aria: 'Binominis koeficientas' },
      { category: 'Struktūros', label: 'x̅', structure: 'overline', aria: 'Brūkšnys virš reiškinio' },

      // Sistemos
      { category: 'Sistemos', label: '⎧2', visual: 'system-2', structure: 'system-2', aria: 'Dviejų lygčių sistema' },
      { category: 'Sistemos', label: '⎧3', visual: 'system-3', structure: 'system-3', aria: 'Trijų lygčių sistema' },
      { category: 'Sistemos', label: '+ lygtis', visual: 'system-add-row', command: 'addRowAfter', mutates: true, requiresArray: true, aria: 'Pridėti lygtį po dabartinės eilutės' },
      { category: 'Sistemos', label: '− lygtis', visual: 'system-remove-row', command: 'removeRow', mutates: true, requiresArray: true, aria: 'Pašalinti dabartinę sistemos eilutę' },

      // Intervalai
      { category: 'Intervalai', label: '(a;b)', structure: 'interval-open', aria: 'Atviras intervalas' },
      { category: 'Intervalai', label: '[a;b]', structure: 'interval-closed', aria: 'Uždaras intervalas' },
      { category: 'Intervalai', label: '(a;b]', structure: 'interval-left-open', aria: 'Kairėje atviras intervalas' },
      { category: 'Intervalai', label: '[a;b)', structure: 'interval-right-open', aria: 'Dešinėje atviras intervalas' },
      { category: 'Intervalai', label: '(−∞;a)', structure: 'interval-minus-infinity', aria: 'Intervalas nuo minus begalybės' },
      { category: 'Intervalai', label: '(a;+∞)', structure: 'interval-plus-infinity', aria: 'Intervalas iki plius begalybės' },
      { category: 'Intervalai', label: '∈', insert: '\\in ' },
      { category: 'Intervalai', label: '∉', insert: '\\notin ' },
      { category: 'Intervalai', label: '∪', insert: '\\cup ' },
      { category: 'Intervalai', label: '∩', insert: '\\cap ' },
      { category: 'Intervalai', label: '⊂', insert: '\\subset ' },
      { category: 'Intervalai', label: '⊆', insert: '\\subseteq ' },
      { category: 'Intervalai', label: '∅', insert: '\\varnothing' },

      // Raidės ir konstantos — atskirai nuo pradinių aritmetinių veiksmų.
      { category: 'Raidės', label: 'x', insert: 'x' },
      { category: 'Raidės', label: 'y', insert: 'y' },
      { category: 'Raidės', label: 'z', insert: 'z' },
      { category: 'Raidės', label: 'a', insert: 'a' },
      { category: 'Raidės', label: 'b', insert: 'b' },
      { category: 'Raidės', label: 'n', insert: 'n' },
      { category: 'Raidės', label: 'π', insert: '\\pi' },
      { category: 'Raidės', label: 'e', insert: 'e' },
      { category: 'Raidės', label: 'α', insert: '\\alpha' },
      { category: 'Raidės', label: 'β', insert: '\\beta' },
      { category: 'Raidės', label: 'γ', insert: '\\gamma' },
      { category: 'Raidės', label: 'θ', insert: '\\theta' },
      { category: 'Raidės', label: 'λ', insert: '\\lambda' },
      { category: 'Raidės', label: 'μ', insert: '\\mu' },

      // Funkcijos
      { category: 'Funkcijos', label: 'f(x)', structure: 'function-f' },
      { category: 'Funkcijos', label: 'sin', structure: 'sin' },
      { category: 'Funkcijos', label: 'cos', structure: 'cos' },
      { category: 'Funkcijos', label: 'tg', structure: 'tan' },
      { category: 'Funkcijos', label: 'ctg', structure: 'cot' },
      { category: 'Funkcijos', label: 'log', structure: 'log' },
      { category: 'Funkcijos', label: 'ln', structure: 'ln' },
      { category: 'Funkcijos', label: 'eˣ', structure: 'exp' },

      // Analizė
      { category: 'Analizė', label: 'lim', visual: 'limit', structure: 'limit', aria: 'Riba' },
      { category: 'Analizė', label: "f′", structure: 'derivative', aria: 'Pirmoji išvestinė' },
      { category: 'Analizė', label: "f″", structure: 'second-derivative', aria: 'Antroji išvestinė' },
      { category: 'Analizė', label: '∫', visual: 'integral', structure: 'integral', aria: 'Neapibrėžtinis integralas' },
      { category: 'Analizė', label: '∫ᵃᵇ', visual: 'definite-integral', structure: 'definite-integral', aria: 'Apibrėžtinis integralas' },
      { category: 'Analizė', label: 'Σ', visual: 'sum', structure: 'sum', aria: 'Suma' },
      { category: 'Analizė', label: 'Π', visual: 'product', structure: 'product', aria: 'Sandauga' },
      { category: 'Analizė', label: '∞', insert: '\\infty' },

      // Vektoriai ir matricos
      { category: 'Vektoriai', label: 'a⃗', visual: 'vector', structure: 'vector', aria: 'Vektorius' },
      { category: 'Vektoriai', label: '(x;y)', visual: 'vector-2', structure: 'vector-2', aria: 'Dviejų koordinačių vektorius' },
      { category: 'Vektoriai', label: '(x;y;z)', visual: 'vector-3', structure: 'vector-3', aria: 'Trijų koordinačių vektorius' },
      { category: 'Vektoriai', label: 'a⃗·b⃗', visual: 'dot-product', structure: 'dot-product', aria: 'Skaliarinė sandauga' },
      { category: 'Vektoriai', label: '‖a⃗‖', visual: 'vector-norm', structure: 'vector-norm', aria: 'Vektoriaus modulis' },
      { category: 'Vektoriai', label: 'M₂', visual: 'matrix-2', structure: 'matrix-2', aria: 'Dviejų eilučių ir dviejų stulpelių matrica' },
      { category: 'Vektoriai', label: 'M₃', visual: 'matrix-3', structure: 'matrix-3', aria: 'Trijų eilučių ir trijų stulpelių matrica' },
      { category: 'Vektoriai', label: '|M₂|', visual: 'determinant-2', structure: 'determinant-2', aria: 'Antros eilės determinantė' },
      { category: 'Vektoriai', label: '+ eil.', visual: 'matrix-add-row', command: 'addRowAfter', mutates: true, requiresArray: true, aria: 'Pridėti matricos eilutę' },
      { category: 'Vektoriai', label: '+ st.', visual: 'matrix-add-column', command: 'addColumnAfter', mutates: true, requiresArray: true, aria: 'Pridėti matricos stulpelį' },
      { category: 'Vektoriai', label: '− eil.', visual: 'matrix-remove-row', command: 'removeRow', mutates: true, requiresArray: true, aria: 'Pašalinti matricos eilutę' },
      { category: 'Vektoriai', label: '− st.', visual: 'matrix-remove-column', command: 'removeColumn', mutates: true, requiresArray: true, aria: 'Pašalinti matricos stulpelį' }
    ]);

    const MATH_CONTROL_KEYS = Object.freeze([
      { label: '←', command: 'moveToPreviousChar', aria: 'Žymeklis kairėn' },
      { label: '→', command: 'moveToNextChar', aria: 'Žymeklis dešinėn' },
      { label: '⇤', command: 'moveToPreviousPlaceholder', aria: 'Ankstesnė formulės vieta' },
      { label: '⇥', command: 'moveToNextPlaceholder', aria: 'Kita formulės vieta' },
      { label: '⌫', command: 'deleteBackward', aria: 'Trinti į kairę' },
      { label: '⌦', command: 'deleteForward', aria: 'Trinti į dešinę' },
      { label: '↶', command: 'undo', aria: 'Atšaukti' },
      { label: '↷', command: 'redo', aria: 'Pakartoti' }
    ]);

    function mathStructureTemplate(type, hasSelection) {
      const selected = hasSelection ? '#0' : '#?';
      if (type === 'fraction') return hasSelection ? '\\frac{#0}{#?}' : '\\frac{#?}{#?}';
      if (type === 'root') return `\\sqrt{${selected}}`;
      if (type === 'nth-root') return hasSelection ? '\\sqrt[#?]{#0}' : '\\sqrt[#?]{#?}';
      if (type === 'power') return hasSelection ? '{#0}^{#?}' : '^{#?}';
      if (type === 'subscript') return hasSelection ? '{#0}_{#?}' : '_{#?}';
      if (type === 'binomial') return hasSelection ? '\\binom{#0}{#?}' : '\\binom{#?}{#?}';
      if (type === 'overline') return `\\overline{${selected}}`;
      if (type === 'parentheses') return `\\left(${selected}\\right)`;
      if (type === 'brackets') return `\\left[${selected}\\right]`;
      if (type === 'braces') return `\\left\\{${selected}\\right\\}`;
      if (type === 'absolute') return `\\left|${selected}\\right|`;
      if (type === 'norm') return `\\left\\|${selected}\\right\\|`;
      if (type === 'floor') return `\\left\\lfloor ${selected}\\right\\rfloor`;
      if (type === 'ceil') return `\\left\\lceil ${selected}\\right\\rceil`;
      if (type === 'system-2') return hasSelection
        ? '\\begin{cases}#0\\\\#?\\end{cases}'
        : '\\begin{cases}#?\\\\#?\\end{cases}';
      if (type === 'system-3') return hasSelection
        ? '\\begin{cases}#0\\\\#?\\\\#?\\end{cases}'
        : '\\begin{cases}#?\\\\#?\\\\#?\\end{cases}';
      if (type === 'interval-open') return '\\left(#?;#?\\right)';
      if (type === 'interval-closed') return '\\left[#?;#?\\right]';
      if (type === 'interval-left-open') return '\\left(#?;#?\\right]';
      if (type === 'interval-right-open') return '\\left[#?;#?\\right)';
      if (type === 'interval-minus-infinity') return '\\left(-\\infty;#?\\right)';
      if (type === 'interval-plus-infinity') return '\\left(#?;+\\infty\\right)';
      if (type === 'function-f') return `f\\left(${selected}\\right)`;
      if (type === 'sin') return `\\sin\\left(${selected}\\right)`;
      if (type === 'cos') return `\\cos\\left(${selected}\\right)`;
      if (type === 'tan') return `\\tan\\left(${selected}\\right)`;
      if (type === 'cot') return `\\cot\\left(${selected}\\right)`;
      if (type === 'log') return `\\log_{#?}\\left(${selected}\\right)`;
      if (type === 'ln') return `\\ln\\left(${selected}\\right)`;
      if (type === 'exp') return `e^{${selected}}`;
      if (type === 'limit') return hasSelection
        ? '\\lim_{#?\\to #?}#0'
        : '\\lim_{#?\\to #?}#?';
      if (type === 'derivative') return hasSelection
        ? '\\frac{d}{d#?}\\left(#0\\right)'
        : '\\frac{d}{d#?}\\left(#?\\right)';
      if (type === 'second-derivative') return hasSelection
        ? '\\frac{d^2}{d#?^2}\\left(#0\\right)'
        : '\\frac{d^2}{d#?^2}\\left(#?\\right)';
      if (type === 'integral') return hasSelection
        ? '\\displaystyle\\int #0\\,d#?'
        : '\\displaystyle\\int #?\\,d#?';
      if (type === 'definite-integral') return hasSelection
        ? '\\displaystyle\\int_{#?}^{#?}#0\\,d#?'
        : '\\displaystyle\\int_{#?}^{#?}#?\\,d#?';
      if (type === 'sum') return hasSelection
        ? '\\displaystyle\\sum_{#?}^{#?}#0'
        : '\\displaystyle\\sum_{#?}^{#?}#?';
      if (type === 'product') return hasSelection
        ? '\\displaystyle\\prod_{#?}^{#?}#0'
        : '\\displaystyle\\prod_{#?}^{#?}#?';
      if (type === 'vector') return hasSelection ? '\\mathord{\\overrightarrow{#0}}' : '\\mathord{\\overrightarrow{#?}}';
      if (type === 'vector-2') return '\\begin{pmatrix}#?\\\\#?\\end{pmatrix}';
      if (type === 'vector-3') return '\\begin{pmatrix}#?\\\\#?\\\\#?\\end{pmatrix}';
      if (type === 'dot-product') return '\\mathord{\\overrightarrow{#?}}\\cdot\\mathord{\\overrightarrow{#?}}';
      if (type === 'vector-norm') return hasSelection
        ? '\\left\\|\\mathord{\\overrightarrow{#0}}\\right\\|'
        : '\\left\\|\\mathord{\\overrightarrow{#?}}\\right\\|';
      if (type === 'matrix-2') return '\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}';
      if (type === 'matrix-3') return '\\begin{pmatrix}#?&#?&#?\\\\#?&#?&#?\\\\#?&#?&#?\\end{pmatrix}';
      if (type === 'determinant-2') return '\\begin{vmatrix}#?&#?\\\\#?&#?\\end{vmatrix}';
      return '';
    }

    function insertIntoDirectMathField(field, key) {
      const target = field?.isConnected ? field : resolveActiveMathField();
      if (!target) {
        clearMathEditSession();
        showToast('Pirmiausia pasirink matematinį lauką pratybose arba mišriame tekste');
        return;
      }
      const savedSelection = captureMathFieldSelection(target) || mathSelectionByKey.get(mathFieldKey(target));
      try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
      restoreMathFieldSelection(target, savedSelection);
      setActiveDirectMathField(target, target.dataset.mathContext || getActiveMathContext(), { ensureVisible: false });
      const hasSelection = mathSelectionHasContent(savedSelection || target.selection);
      const vectorLatexBeforeInsert = key.structure === 'vector' && !hasSelection ? rawDirectMathLatex(target) : '';
      let insert = key.structure ? mathStructureTemplate(key.structure, hasSelection) : key.insert;
      // Matematikos juostos operatoriai elgiasi taip pat kaip klaviatūros:
      // jei dar esame ką tik sukurto vektoriaus vidinėje struktūroje, pirmiausia
      // išeiname už viso vektoriaus, o tada įterpiame originalų operatorių.
      // Taip nereikia atskirų \mathbin / \mathrel lopų kiekvienam ženklui.
      if (!key.structure && !hasSelection && isVbeVectorToolbarExitOperator(key.insert)
        && target.__vbeVectorPromptActive === true) {
        exitActiveVbeVectorPrompt(target);
      }
      // P2.4.7.7.5: naudoti lygiai tokį patį #? placeholderį kaip šaknyse ir trupmenose.
      // Jokio atskiro vektoriaus prompto / didesnės dėžutės nekuriame.
      if (key.structure === 'vector' && !hasSelection) {
        insert = '\\mathord{\\overrightarrow{#?}}';
      }
      let usedNativeInsert = false;
      try {
        if (key.command && typeof target.executeCommand === 'function') {
          const isDeleteCommand = key.command === 'deleteBackward' || key.command === 'deleteForward';
          if (isDeleteCommand) {
            const deletion = beginVbeVectorDeletion(target);
            if (deletion.handled) {
              queueMicrotask(() => {
                if (target.isConnected) captureMathFieldSelection(target);
              });
              return;
            }
          }
          const result = target.executeCommand(key.command);
          if (isDeleteCommand && target.__vbeVectorDeletePending) {
            queueMicrotask(() => {
              if (target.isConnected && target.__vbeVectorDeletePending) finishVbeVectorDeletion(target);
            });
          }
          if (key.command === 'moveToNextPlaceholder' && result !== true) moveMathPlaceholderOrField(target, 1);
          if (key.command === 'moveToPreviousPlaceholder' && result !== true) moveMathPlaceholderOrField(target, -1);
          if (key.requiresArray && result !== true) {
            showToast('Padėk žymeklį sistemos arba matricos viduje');
          }
          if (key.mutates && result === true) target.__syncDirectMathField?.();
        } else {
          const options = {
            insertionMode: 'replaceSelection',
            selectionMode: key.structure === 'vector' && hasSelection ? 'after' : (key.structure ? 'placeholder' : 'after'),
            focus: true,
            scrollIntoView: false,
            format: 'latex'
          };
          if (typeof target.insert === 'function') {
            target.insert(insert, options);
            usedNativeInsert = true;
          } else if (typeof target.executeCommand === 'function') {
            target.executeCommand(['insert', insert, options]);
            usedNativeInsert = true;
          } else {
            const plainFallback = insert
              ?.replace(/\\cdot\s*/g, '*')
              .replace(/\\pi/g, 'π')
              .replace(/\\varnothing/g, '∅')
              .replace(/\\left|\\right/g, '')
              .replace(/\\frac\{#\?\}\{#\?\}/g, '()/()')
              .replace(/\\frac\{#0\}\{#\?\}/g, '()/()')
              .replace(/\\sqrt\{#\?\}/g, 'sqrt()')
              .replace(/#0|#\?/g, '');
            target.textContent = `${target.textContent || ''}${plainFallback || ''}`;
          }


        }
      } catch (_) {}

      // Įsimename tik ką Matematikos juosta sukurtą vektoriaus #? įvedimo vietą.
      // Ši būsena reikalinga tam, kad paspaudus „+“ galėtume iš pradžių išeiti
      // iš vektoriaus struktūros, o ne įterpti operatorių jos viduje.
      if (key.structure === 'vector' && !hasSelection && usedNativeInsert) {
        target.__vbeVectorPromptActive = true;
        target.__vbeVectorPromptIndex = findInsertedVbeVectorIndex(vectorLatexBeforeInsert, rawDirectMathLatex(target));
        if (target.__vbeVectorPromptIndex < 0) {
          const vectors = scanVbeVectors(rawDirectMathLatex(target));
          target.__vbeVectorPromptIndex = Math.max(0, vectors.length - 1);
        }
      }

      // Jei vektorius uždedamas jau pažymėtam turiniui, esami operatoriai
      // lieka pagrindiniame MathLive lygyje ir jų perrašyti nereikia.
      if (key.structure === 'vector' && hasSelection && usedNativeInsert) {
        clearVbeVectorPromptState(target);
      }

      // MathLive dispatches its own input event. We update the model directly as well,
      // without emitting a second bubbling input event that the parent contenteditable could misread.
      if (!key.command) target.__syncDirectMathField?.();
      queueMicrotask(() => {
        if (!target.isConnected) return;
        reaffirmMathEditSession(target, target.dataset.mathContext || getActiveMathContext(), { ensureVisible: false });
        captureMathFieldSelection(target);
      });
      requestAnimationFrame(() => {
        if (!target.isConnected) return;
        captureMathFieldSelection(target);
        ensureMathFieldVisible(target);
      });
      if (!usedNativeInsert && !key.command) target.__syncDirectMathField?.();
    }

    function handleUniversalMathKey(key) {
      const activeEditor = getActiveMixedTextEditor();
        const editor = activeEditor?.isConnected ? activeEditor : null;
      if (key.action === 'math-mode') {
        activateExplicitMathMode(editor);
        return;
      }
      const textRange = editor ? toolbarTextRangeForMixedEditor(editor) : null;
      let field = null;
      if (editor && textRange && (key.insert || key.structure)) {
        // P2.4.7: tikras teksto žymeklis yra svarbesnis už anksčiau aktyvią formulę.
        // Paspaudus juostos simbolį teksto vietoje kuriama / tęsiama formulė būtent ten,
        // o ne atsitiktinai ankstesniame MathLive laukelyje. Gretimos formulės automatinis
        // tęsimas paliekamas klaviatūros išmaniajam operatorių įvedimui.
        deactivateMathForMixedTextRange(editor, textRange);
        field = resolveMixedMathTarget(editor, { allowEmpty: true, preferNewFormula: true });
      } else {
        field = resolveActiveMathField();
        if (!field && editor && (key.insert || key.structure)) field = resolveMixedMathTarget(editor, { allowEmpty: true, preferNewFormula: true });
      }
      if (!field) {
        showToast(editor ? 'Pasirink matematinį simbolį ar struktūrą' : 'Pirmiausia aktyvuok teksto arba matematinį lauką');
        return;
      }
      insertIntoDirectMathField(field, key);
    }

    function mathKeyVisualMarkup(name) {
      const cell = '<i></i>';
      const cells = count => cell.repeat(count);
      const map = {
        'fraction': '<span class="mi mi-fraction" aria-hidden="true"><span>a</span><span>b</span></span>',
        'nth-root': '<span class="mi mi-nth-root" aria-hidden="true"><sup>n</sup><b>√</b><i>x</i></span>',
        'binomial': '<span class="mi mi-binomial" aria-hidden="true"><b>(</b><span><i>n</i><i>k</i></span><b>)</b></span>',
        'system-2': '<span class="mi mi-system" aria-hidden="true"><b>{</b><span class="mi-system-lines"><i></i><i></i></span></span>',
        'system-3': '<span class="mi mi-system mi-system-3" aria-hidden="true"><b>{</b><span class="mi-system-lines"><i></i><i></i><i></i></span></span>',
        'system-add-row': '<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-system mi-system-small"><b>{</b><span class="mi-system-lines"><i></i><i></i></span></span><em>+</em><small>lygt.</small></span>',
        'system-remove-row': '<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-system mi-system-small"><b>{</b><span class="mi-system-lines"><i></i><i></i></span></span><em>−</em><small>lygt.</small></span>',
        'limit': '<span class="mi mi-limit" aria-hidden="true"><b>lim</b><small>x→a</small></span>',
        'root': '<span class="mi mi-basic-root" aria-hidden="true"><b>√</b><i>x</i></span>',
        'power': '<span class="mi mi-basic-power" aria-hidden="true"><i>x</i><sup>n</sup></span>',
        'integral': '<span class="mi mi-integral" aria-hidden="true"><b>∫</b></span>',
        'definite-integral': '<span class="mi mi-definite-integral" aria-hidden="true"><b>∫</b><sup>b</sup><sub>a</sub><i>f</i></span>',
        'sum': '<span class="mi mi-large-op" aria-hidden="true"><sup>n</sup><b>Σ</b><sub>i=1</sub></span>',
        'product': '<span class="mi mi-large-op" aria-hidden="true"><sup>n</sup><b>Π</b><sub>i=1</sub></span>',
        'vector': '<span class="mi mi-vector-symbol" aria-hidden="true"><span class="mi-vector-arrow">→</span><i>a</i></span>',
        'vector-2': '<span class="mi mi-column-vector" aria-hidden="true"><b>(</b><span><i>x</i><i>y</i></span><b>)</b></span>',
        'vector-3': '<span class="mi mi-column-vector mi-column-vector-3" aria-hidden="true"><b>(</b><span><i>x</i><i>y</i><i>z</i></span><b>)</b></span>',
        'dot-product': '<span class="mi mi-dot-product" aria-hidden="true"><span class="mi-vector-symbol"><span class="mi-vector-arrow">→</span><i>a</i></span><b>·</b><span class="mi-vector-symbol"><span class="mi-vector-arrow">→</span><i>b</i></span></span>',
        'vector-norm': '<span class="mi mi-vector-norm" aria-hidden="true"><b>‖</b><span class="mi-vector-symbol"><span class="mi-vector-arrow">→</span><i>a</i></span><b>‖</b></span>',
        'matrix-2': `<span class="mi mi-matrix mi-matrix-2" aria-hidden="true"><span>${cells(4)}</span></span>`,
        'matrix-3': `<span class="mi mi-matrix mi-matrix-3" aria-hidden="true"><span>${cells(9)}</span></span>`,
        'determinant-2': `<span class="mi mi-matrix mi-determinant mi-matrix-2" aria-hidden="true"><span>${cells(4)}</span></span>`,
        'matrix-add-row': `<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-matrix mi-matrix-2"><span>${cells(4)}</span></span><em>+</em><small>eil.</small></span>`,
        'matrix-add-column': `<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-matrix mi-matrix-2"><span>${cells(4)}</span></span><em>+</em><small>st.</small></span>`,
        'matrix-remove-row': `<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-matrix mi-matrix-2"><span>${cells(4)}</span></span><em>−</em><small>eil.</small></span>`,
        'matrix-remove-column': `<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-matrix mi-matrix-2"><span>${cells(4)}</span></span><em>−</em><small>st.</small></span>`
      };
      return map[name] || '';
    }

    function createUniversalMathButton(key, extraClass = '') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `math-key${key.structure ? ' is-structure-key' : ''}${key.action === 'math-mode' ? ' is-math-mode-key' : ''}${key.visual ? ' has-rich-icon' : ''}${extraClass ? ` ${extraClass}` : ''}`;
      if (key.category) button.dataset.category = key.category;
      if (key.visual) {
        button.innerHTML = mathKeyVisualMarkup(key.visual);
        button.dataset.visual = key.visual;
      } else {
        button.textContent = key.label;
      }
      button.setAttribute('aria-label', key.aria || key.label);
      button.title = key.title || key.aria || key.label;
      let pointerHandledAt = 0;
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        pointerHandledAt = performance.now();
        handleUniversalMathKey(key);
      });
      button.addEventListener('click', () => {
        if (performance.now() - pointerHandledAt < 500) return;
        handleUniversalMathKey(key);
      });
      return button;
    }

    let mathKeyboardPageLayoutRaf = 0;
    let mathKeyboardPagerInstalled = false;

    function updateUniversalMathKeyboardPager() {
      const keyboard = refs.universalMathKeyboard;
      const panel = keyboard?.closest?.('.universal-math-panel');
      if (!keyboard || !panel) return;
      const prev = panel.querySelector('.math-keyboard-nav-prev');
      const next = panel.querySelector('.math-keyboard-nav-next');
      if (!prev || !next) return;
      const overflow = keyboard.scrollWidth > keyboard.clientWidth + 3;
      panel.classList.toggle('has-keyboard-overflow', overflow);
      prev.hidden = !overflow;
      next.hidden = !overflow;
      if (!overflow) return;
      prev.disabled = keyboard.scrollLeft <= 3;
      next.disabled = keyboard.scrollLeft + keyboard.clientWidth >= keyboard.scrollWidth - 3;
    }

    function scrollUniversalMathKeyboardPage(direction) {
      const keyboard = refs.universalMathKeyboard;
      if (!keyboard) return;
      const style = getComputedStyle(keyboard);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const pageWidth = Math.max(120, Math.floor(keyboard.clientWidth - paddingLeft - paddingRight));
      const currentPage = Math.round(keyboard.scrollLeft / pageWidth);
      const target = Math.max(0, (currentPage + direction) * pageWidth);
      keyboard.scrollTo({ left: target, behavior: 'smooth' });
      window.setTimeout(updateUniversalMathKeyboardPager, 260);
    }

    function installUniversalMathKeyboardPager() {
      if (mathKeyboardPagerInstalled) return;
      const keyboard = refs.universalMathKeyboard;
      const panel = keyboard?.closest?.('.universal-math-panel');
      if (!keyboard || !panel) return;
      mathKeyboardPagerInstalled = true;
      const make = (direction, cls, label, glyph) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `math-keyboard-nav ${cls}`;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.textContent = glyph;
        button.hidden = true;
        button.addEventListener('pointerdown', event => {
          event.preventDefault();
          scrollUniversalMathKeyboardPage(direction);
        });
        return button;
      };
      panel.append(
        make(-1, 'math-keyboard-nav-prev', 'Ankstesni matematikos simboliai', '‹'),
        make(1, 'math-keyboard-nav-next', 'Daugiau matematikos simbolių', '›')
      );
      keyboard.addEventListener('scroll', updateUniversalMathKeyboardPager, { passive: true });
    }

    function layoutUniversalMathKeyboardPages() {
      const keyboard = refs.universalMathKeyboard;
      if (!keyboard) return;
      keyboard.querySelectorAll('.math-key-page-gap').forEach(node => node.remove());
      keyboard.querySelectorAll('.math-key-page-start').forEach(node => node.classList.remove('math-key-page-start'));

      const style = getComputedStyle(keyboard);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const gap = parseFloat(style.columnGap || style.gap) || 0;
      const pageWidth = Math.floor(keyboard.clientWidth - paddingLeft - paddingRight);
      if (pageWidth < 120) return;

      const items = Array.from(keyboard.children);
      let used = 0;
      let firstOnPage = true;
      items.forEach(item => {
        const width = Math.ceil(item.getBoundingClientRect().width);
        if (!width) return;
        const needed = (used > 0 ? gap : 0) + width;
        if (used > 0 && used + needed > pageWidth) {
          const spacer = document.createElement('span');
          spacer.className = 'math-key-page-gap';
          spacer.setAttribute('aria-hidden', 'true');
          const remaining = Math.max(0, pageWidth - used - (gap * 2));
          spacer.style.setProperty('--math-page-gap', `${remaining}px`);
          item.before(spacer);
          used = width;
          firstOnPage = true;
        } else {
          used += needed;
        }
        if (firstOnPage && item.matches('.math-key')) {
          item.classList.add('math-key-page-start');
          firstOnPage = false;
        }
      });

      requestAnimationFrame(updateUniversalMathKeyboardPager);
    }

    function scheduleUniversalMathKeyboardPageLayout() {
      if (mathKeyboardPageLayoutRaf) cancelAnimationFrame(mathKeyboardPageLayoutRaf);
      mathKeyboardPageLayoutRaf = requestAnimationFrame(() => {
        mathKeyboardPageLayoutRaf = 0;
        layoutUniversalMathKeyboardPages();
      });
    }

    function renderUniversalMathKeyboard() {
      const keyboard = refs.universalMathKeyboard;
      if (!keyboard) return;
      keyboard.replaceChildren();
      keyboard.scrollLeft = 0;
      PINNED_MATH_KEYS.forEach(key => keyboard.appendChild(createUniversalMathButton(key, 'is-pinned-key')));

      const separatorA = document.createElement('span');
      separatorA.className = 'math-key-separator';
      separatorA.setAttribute('aria-hidden', 'true');
      keyboard.appendChild(separatorA);

      DIRECT_MATH_KEYS
        .filter(key => key.category === state.mathToolbarCategory)
        .forEach(key => keyboard.appendChild(createUniversalMathButton(key)));

      const separatorB = document.createElement('span');
      separatorB.className = 'math-key-separator';
      separatorB.setAttribute('aria-hidden', 'true');
      keyboard.appendChild(separatorB);
      MATH_CONTROL_KEYS.forEach(key => keyboard.appendChild(createUniversalMathButton(key, 'is-control-key')));
      scheduleUniversalMathKeyboardPageLayout();
    }

    function setMathToolbarCategory(category, { save = true } = {}) {
      const next = MATH_CATEGORIES.includes(category) ? category : 'Pagrindiniai';
      state.mathToolbarCategory = next;
      refs.universalMathCategories?.querySelectorAll('.math-category-tab').forEach(tab => {
        const active = tab.dataset.category === next;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
      });
      renderUniversalMathKeyboard();
      const activeTab = refs.universalMathCategories?.querySelector(`[data-category="${CSS.escape(next)}"]`);
      activeTab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      if (save) scheduleSave();
    }

    window.addEventListener('resize', scheduleUniversalMathKeyboardPageLayout, { passive: true });

    function initializeUniversalMathKeyboard() {
      installUniversalMathKeyboardPager();
      const categories = refs.universalMathCategories;
      if (categories) {
        categories.replaceChildren();
        MATH_CATEGORIES.forEach(category => {
          const tab = document.createElement('button');
          tab.type = 'button';
          tab.className = 'math-category-tab';
          tab.dataset.category = category;
          tab.textContent = category;
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-controls', 'universalMathKeyboard');
          let pointerHandledAt = 0;
          tab.addEventListener('pointerdown', event => {
            event.preventDefault();
            pointerHandledAt = performance.now();
            setMathToolbarCategory(category);
          });
          tab.addEventListener('click', () => {
            if (performance.now() - pointerHandledAt < 500) return;
            setMathToolbarCategory(category);
          });
          tab.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const current = MATH_CATEGORIES.indexOf(state.mathToolbarCategory);
            let index = current;
            if (event.key === 'ArrowLeft') index = (current - 1 + MATH_CATEGORIES.length) % MATH_CATEGORIES.length;
            if (event.key === 'ArrowRight') index = (current + 1) % MATH_CATEGORIES.length;
            if (event.key === 'Home') index = 0;
            if (event.key === 'End') index = MATH_CATEGORIES.length - 1;
            setMathToolbarCategory(MATH_CATEGORIES[index]);
            refs.universalMathCategories?.querySelector(`[data-category="${CSS.escape(MATH_CATEGORIES[index])}"]`)?.focus({ preventScroll: true });
          });
          categories.appendChild(tab);
        });
      }
      if (!MATH_CATEGORIES.includes(state.mathToolbarCategory)) state.mathToolbarCategory = 'Pagrindiniai';
      setMathToolbarCategory(state.mathToolbarCategory, { save: false });
      clearMathEditSession();
    }

    return Object.freeze({
      categories: MATH_CATEGORIES,
      pinnedKeys: PINNED_MATH_KEYS,
      directKeys: DIRECT_MATH_KEYS,
      controlKeys: MATH_CONTROL_KEYS,
      mathStructureTemplate,
      insertIntoDirectMathField,
      handleUniversalMathKey,
      renderUniversalMathKeyboard,
      setMathToolbarCategory,
      scheduleUniversalMathKeyboardPageLayout,
      initializeUniversalMathKeyboard
    });
  }

  window.P772BoardMathToolbar = Object.freeze({
    version: 'P1.7.9.49-M2.8.1',
    createEngine
  });
})();
