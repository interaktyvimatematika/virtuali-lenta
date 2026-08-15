(() => {
  'use strict';

  // P1.7.9.49-M2.7: MathLive / matematinio laukelio branduolys.
  // UI juostos kategorijos ir konkrečių mygtukų semantika lieka app.js.
  function createEngine(options = {}) {
    const deps = options.deps || {};
    const hooks = options.hooks || {};

    const formatNumber = deps.formatNumber;
    const precedence = deps.precedence;
    const parseEquation = deps.parseEquation;
    const parseSolutionSetInput = deps.parseSolutionSetInput;
    const formatSupportedRoot = deps.formatSupportedRoot;
    const parseExpression = deps.parseExpression;

    const captureMathFieldSelection = (...args) => hooks.captureMathFieldSelection?.(...args) ?? null;
    const ensureMathFieldVisible = (...args) => hooks.ensureMathFieldVisible?.(...args);
    const registerMathField = (...args) => hooks.registerMathField?.(...args);
    const reaffirmMathEditSession = (...args) => hooks.reaffirmMathEditSession?.(...args) ?? false;
    const scheduleMathFieldPreview = (...args) => hooks.scheduleMathFieldPreview?.(...args);
    const renderMathFieldPreview = (...args) => hooks.renderMathFieldPreview?.(...args) ?? Promise.resolve();
    const updateMathToolbarUi = (...args) => hooks.updateMathToolbarUi?.(...args);
    const setActiveDirectMathField = (...args) => hooks.setActiveDirectMathField?.(...args);
    const mixedEditorFromNode = (...args) => hooks.mixedEditorFromNode?.(...args) ?? null;
    const clearMathEditSession = (...args) => hooks.clearMathEditSession?.(...args);
    const placeTextCaretAfter = (...args) => hooks.placeTextCaretAfter?.(...args);
    const placeTextCaretBefore = (...args) => hooks.placeTextCaretBefore?.(...args);
    const getActiveDirectMathField = () => hooks.getActiveDirectMathField?.() ?? null;
    let generatedMathFieldKey = 0;

    function astNodeToLatex(node, parentPrecedence = 0) {
      if (!node) return '';
      if (node.type === 'number') return formatNumber(node.value).replace(',', '.');
      if (node.type === 'variable') return node.name;
      if (node.mixedDisplay) {
        return `${node.mixedDisplay.whole}\\frac{${node.mixedDisplay.numerator}}{${node.mixedDisplay.denominator}}`;
      }
      if (node.type === 'unary') return `-${astNodeToLatex(node.value, 3)}`;
      if (node.type !== 'binary') return '';
      const current = precedence(node);
      let result = '';
      if (node.operator === '/') result = `\\frac{${astNodeToLatex(node.left, 0)}}{${astNodeToLatex(node.right, 0)}}`;
      else if (node.operator === '^') result = `${astNodeToLatex(node.left, 4)}^{${astNodeToLatex(node.right, 0)}}`;
      else {
        const operator = node.operator === '*' ? '\\cdot ' : node.operator;
        result = `${astNodeToLatex(node.left, current)}${operator}${astNodeToLatex(node.right, node.operator === '-' ? current + 1 : current)}`;
      }
      return current < parentPrecedence ? `\\left(${result}\\right)` : result;
    }
    
    function sourceToLatex(source, kind = 'expression') {
      const value = String(source || '').trim();
      if (!value) return '';
      try {
        if (kind === 'equation') {
          const equation = parseEquation(value);
          return `${astNodeToLatex(equation.left)}=${astNodeToLatex(equation.right)}`;
        }
        if (kind === 'solution-set') {
          const set = parseSolutionSetInput(value);
          if (set.kind === 'none') return '\\varnothing';
          if (set.kind === 'finite') return `\\left\\{${set.values.map(formatSupportedRoot).join(';')}\\right\\}`;
        }
        return astNodeToLatex(parseExpression(value));
      } catch (_) {
        return value
          .replace(/∅/g, '\\varnothing')
          .replace(/√/g, '\\sqrt{}')
          .replace(/:/g, '/');
      }
    }
    
    function normalizeMathLiveAscii(value) {
      let source = String(value || '')
        .replace(/\\left|\\right/g, '')
        .replace(/[−–—]/g, '-')
        .replace(/[·×]/g, '*')
        .replace(/\\cdot|cdot/g, '*')
        .replace(/\\times|times/g, '*')
        .replace(/\\varnothing|\\emptyset|emptyset|O\//g, '∅')
        .replace(/([A-Za-z])_\(?([0-9]+)\)?/g, '$1$2')
        .replace(/\s+/g, ' ')
        .trim();
      // MathLive ASCII can return a whole number immediately followed by a parenthesized fraction.
      source = source.replace(/(^|[^0-9])(-?\d+)\s*\((-?\d+)\)\s*\/\s*\((\d+)\)/g, '$1$2 $3/$4');
      source = source.replace(/(^|[^0-9])(-?\d+)\s+\((-?\d+)\)\s*\/\s*\((\d+)\)/g, '$1$2 $3/$4');
      return source;
    }
    
    function readDirectMathField(field) {
      try {
        if (typeof field.getValue === 'function') return normalizeMathLiveAscii(field.getValue('ascii-math'));
        if (typeof field.value === 'string') return normalizeMathLiveAscii(field.value);
      } catch (_) {}
      return normalizeMathLiveAscii(field.dataset.source || field.textContent || '');
    }
    
    // P2.4.7.7.5 – vektorius naudoja tokį patį natyvų MathLive #? placeholderį
    // kaip trupmenos, šaknys ir kitos Matematikos juostos struktūros.
    // Užbaigiant formulę pašaliname placeholderio apvalkalą tik tada, kai jis
    // yra tiesioginis mūsų \mathord{\overrightarrow{...}} turinys.
    function readLatexGroup(source, openIndex) {
      if (source[openIndex] !== '{') return null;
      let depth = 0;
      for (let i = openIndex; i < source.length; i += 1) {
        if (source[i] === '{' && source[i - 1] !== '\\') depth += 1;
        else if (source[i] === '}' && source[i - 1] !== '\\') {
          depth -= 1;
          if (depth === 0) return { body: source.slice(openIndex + 1, i), close: i };
        }
      }
      return null;
    }
    
    function rawDirectMathLatex(field) {
      if (!field) return '';
      try {
        if (typeof field.getValue === 'function') return String(field.getValue('latex') || field.getValue() || '');
        if (typeof field.value === 'string') return String(field.value || '');
      } catch (_) {}
      return String(field.dataset?.latex || field.dataset?.source || field.textContent || '');
    }
    
    // P2.4.7.7.9 – vieninga vektoriaus redagavimo sutartis.
    // Vektoriaus struktūrą atpažįstame pagal tikrą MathLive LaTeX, o ne pagal
    // vizualią žymeklio padėtį. Tai leidžia vienodai sutvarkyti Backspace/Delete
    // atvejus, kai ištrinamas vektoriaus turinys, bet lieka tuščias overrightarrow.
    function scanVbeVectors(latex) {
      const source = String(latex || '');
      const marker = '\\mathord{\\overrightarrow{';
      const result = [];
      let cursor = 0;
      while (cursor < source.length) {
        const start = source.indexOf(marker, cursor);
        if (start < 0) break;
        const vectorOpen = start + '\\mathord{\\overrightarrow'.length;
        const vectorGroup = readLatexGroup(source, vectorOpen);
        if (!vectorGroup) break;
        const mathordClose = vectorGroup.close + 1 < source.length && source[vectorGroup.close + 1] === '}'
          ? vectorGroup.close + 1
          : vectorGroup.close;
        const placeholderBody = unwrapVectorPlaceholderBody(vectorGroup.body);
        const body = placeholderBody === null ? vectorGroup.body : placeholderBody;
        result.push({
          start,
          end: mathordClose + 1,
          bodyStart: vectorOpen + 1,
          bodyEnd: vectorGroup.close,
          body,
          rawBody: vectorGroup.body,
          empty: String(body || '').trim() === ''
        });
        cursor = mathordClose + 1;
      }
      return result;
    }
    
    function findInsertedVbeVectorIndex(beforeLatex, afterLatex) {
      const before = scanVbeVectors(beforeLatex);
      const after = scanVbeVectors(afterLatex);
      if (after.length <= before.length) return -1;
      let i = 0;
      while (i < before.length && i < after.length) {
        const left = String(before[i].body || '').replace(/\s+/g, '');
        const right = String(after[i].body || '').replace(/\s+/g, '');
        if (left !== right) break;
        i += 1;
      }
      return Math.min(i, after.length - 1);
    }
    
    function clearVbeVectorPromptState(field) {
      if (!field) return;
      field.__vbeVectorPromptActive = false;
      field.__vbeVectorPromptIndex = -1;
    }
    
    function vbeVectorDeleteSnapshot(field) {
      const raw = rawDirectMathLatex(field);
      return {
        raw,
        vectors: scanVbeVectors(raw).map(item => ({ empty: item.empty, body: item.body })),
        position: Number(field?.position),
        active: field?.__vbeVectorPromptActive === true,
        activeIndex: Number.isInteger(field?.__vbeVectorPromptIndex) ? field.__vbeVectorPromptIndex : -1
      };
    }
    
    function latexWithEmptyVbeVectorPlaceholder(latex, index) {
      const raw = String(latex || '');
      const vectors = scanVbeVectors(raw);
      const vector = vectors[index];
      if (!vector) return raw;
      return `${raw.slice(0, vector.bodyStart)}\\placeholder{}${raw.slice(vector.bodyEnd)}`;
    }
    
    function activateEmptyVbeVectorPlaceholder(field, index, preferredPosition, baseLatex = '') {
      if (!field || index < 0) return false;
      let raw = rawDirectMathLatex(field);
      let vectors = scanVbeVectors(raw);
      let vector = vectors[index];
    
      // Jei MathLive po paskutinio simbolio trynimo paliko tuščią vektoriaus kūną,
      // pirmiausia bandome įdėti standartinį #? placeholderį tiesiai dabartinėje
      // žymeklio vietoje. Taip išsaugome natūralią MathLive redagavimo būseną.
      if (vector?.empty && !String(vector.rawBody || '').startsWith('\\placeholder')) {
        try {
          const options = {
            insertionMode: 'replaceSelection',
            selectionMode: 'placeholder',
            focus: true,
            scrollIntoView: false,
            format: 'latex'
          };
          if (typeof field.insert === 'function') field.insert('#?', options);
          else if (typeof field.executeCommand === 'function') field.executeCommand(['insert', '#?', options]);
        } catch (_) {}
        raw = rawDirectMathLatex(field);
        vectors = scanVbeVectors(raw);
        vector = vectors[index];
      }
    
      if (vector?.empty && String(vector.rawBody || '').startsWith('\\placeholder')) {
        field.__vbeVectorPromptActive = true;
        field.__vbeVectorPromptIndex = index;
        field.__syncDirectMathField?.();
        return true;
      }
    
      // Atsarginis kelias: atstatome tiksliai tą patį vektorių su normaliu MathLive
      // placeholderiu. Tai naudojama, jei native delete jau spėjo pašalinti visą atomą
      // arba žymeklis po trynimo atsidūrė ne jo body šakoje.
      const source = String(baseLatex || raw || '');
      const expected = latexWithEmptyVbeVectorPlaceholder(source, index);
      if (!expected || expected === source && !scanVbeVectors(expected)[index]?.empty) return false;
      try {
        if (typeof field.setValue === 'function') field.setValue(expected, { suppressChangeNotifications: true });
        else if ('value' in field) field.value = expected;
        else return false;
        const last = Number(field.lastOffset);
        const oldPos = Number(preferredPosition);
        if (Number.isFinite(last) && Number.isFinite(oldPos)) {
          field.position = Math.max(0, Math.min(last, oldPos));
        }
        // Iš dabartinės vietos pasirenkame artimiausią ankstesnį placeholderį;
        // jei MathLive jo neperkelia, pats placeholderis vis tiek lieka gyvas ir
        // pasiekiamas įprastomis rodyklėmis / ⇤ ⇥.
        try { field.executeCommand?.('moveToPreviousPlaceholder'); } catch (_) {}
        field.__vbeVectorPromptActive = true;
        field.__vbeVectorPromptIndex = index;
        field.dataset.latex = unwrapVbeVectorPrompts(expected);
        field.__syncDirectMathField?.();
        return true;
      } catch (_) {
        return false;
      }
    }
    
    function removeVbeVectorExactly(field, index, preferredPosition) {
      if (!field) return false;
      const raw = rawDirectMathLatex(field);
      const vectors = scanVbeVectors(raw);
      const vector = vectors[index];
      if (!vector || !vector.empty) return false;
      const next = `${raw.slice(0, vector.start)}${raw.slice(vector.end)}`;
      try {
        if (typeof field.setValue === 'function') {
          field.setValue(next, { suppressChangeNotifications: true });
        } else if ('value' in field) {
          field.value = next;
        } else {
          return false;
        }
        const last = Number(field.lastOffset);
        const oldPos = Number(preferredPosition);
        if (Number.isFinite(last) && Number.isFinite(oldPos)) {
          // Pašalinome vieną struktūrinį atomą. Vienu offsetu į kairę dažniausiai
          // yra būtent buvusi vektoriaus vieta; visada apribojame teisėta sritimi.
          field.position = Math.max(0, Math.min(last, oldPos - 1));
        }
        field.dataset.latex = unwrapVbeVectorPrompts(next);
        clearVbeVectorPromptState(field);
        field.__syncDirectMathField?.();
        return true;
      } catch (_) {
        return false;
      }
    }
    
    function removeActiveEmptyVbeVector(field, index, preferredPosition) {
      if (!field) return false;
      const rawBefore = rawDirectMathLatex(field);
      const vectorsBefore = scanVbeVectors(rawBefore);
      const vectorBefore = vectorsBefore[index];
      if (!vectorBefore || !vectorBefore.empty) return false;
      const expected = `${rawBefore.slice(0, vectorBefore.start)}${rawBefore.slice(vectorBefore.end)}`;
    
      // Pirmiausia bandome natyvų MathLive kelią, kad išliktų jo Undo istorija:
      // tuščio vektoriaus viduje išeiname per abu mūsų tėvinius lygius
      // (overrightarrow -> mathord) ir triname visą atomą į kairę.
      let nativeDeleted = false;
      try {
        if (typeof field.executeCommand === 'function') {
          for (let i = 0; i < 2; i += 1) field.executeCommand('moveAfterParent');
          nativeDeleted = field.executeCommand('deleteBackward') === true;
        }
      } catch (_) {
        nativeDeleted = false;
      }
    
      const afterNative = rawDirectMathLatex(field);
      const sameAsExpected = afterNative.replace(/\s+/g, '') === expected.replace(/\s+/g, '');
      clearVbeVectorPromptState(field);
      if (nativeDeleted && sameAsExpected) {
        field.__syncDirectMathField?.();
        return true;
      }
    
      // Jei MathLive pasirinko kitą hierarchinį trynimo kelią, neatspėjame:
      // atkuriame tiksliai laukiamą formulę, kad niekada neliktų „negyvos“ rodyklės
      // ir nebūtų netyčia pašalinta išorinė trupmena / šaknis / kita struktūra.
      try {
        if (typeof field.setValue === 'function') field.setValue(expected, { suppressChangeNotifications: true });
        else if ('value' in field) field.value = expected;
        const last = Number(field.lastOffset);
        const oldPos = Number(preferredPosition);
        if (Number.isFinite(last) && Number.isFinite(oldPos)) {
          field.position = Math.max(0, Math.min(last, oldPos - 1));
        }
        field.dataset.latex = unwrapVbeVectorPrompts(expected);
        field.__syncDirectMathField?.();
        return true;
      } catch (_) {
        return false;
      }
    }
    
    function beginVbeVectorDeletion(field) {
      if (!field) return { handled: false, snapshot: null };
      const snapshot = vbeVectorDeleteSnapshot(field);
      const vectors = scanVbeVectors(snapshot.raw);
      const index = snapshot.activeIndex;
    
      // Jei aktyvus vektoriaus laukelis jau tuščias, kitas Backspace/Delete turi
      // pašalinti visą vektorių – ne palikti tuščią rodyklę, kurioje trynimas stringa.
      if (snapshot.active && index >= 0 && vectors[index]?.empty) {
        return {
          handled: removeActiveEmptyVbeVector(field, index, snapshot.position),
          snapshot: null
        };
      }
    
      field.__vbeVectorDeletePending = snapshot;
      return { handled: false, snapshot };
    }
    
    function finishVbeVectorDeletion(field) {
      const snapshot = field?.__vbeVectorDeletePending;
      if (!field || !snapshot) return false;
      field.__vbeVectorDeletePending = null;
    
      const afterRaw = rawDirectMathLatex(field);
      const after = scanVbeVectors(afterRaw);
      const before = snapshot.vectors || [];
    
      // Aktyvaus vektoriaus VIDUJE paskutinio simbolio trynimas neturi kartais
      // panaikinti visos rodyklės, o kartais palikti „negyvą“ tuščią struktūrą.
      // Vienodiname taisyklę: pirmas trynimas palieka standartinį mažą MathLive
      // placeholderį; kitas Backspace/Delete iš tuščio placeholderio pašalina vektorių.
      if (snapshot.active && snapshot.activeIndex >= 0 && after.length < before.length) {
        const was = before[snapshot.activeIndex];
        if (was && !was.empty) {
          return activateEmptyVbeVectorPlaceholder(
            field,
            snapshot.activeIndex,
            snapshot.position,
            snapshot.raw
          );
        }
        clearVbeVectorPromptState(field);
        return false;
      }
    
      let newlyEmpty = -1;
      for (let i = 0; i < Math.min(before.length, after.length); i += 1) {
        if (!before[i].empty && after[i].empty) {
          newlyEmpty = i;
          break;
        }
      }
      if (newlyEmpty < 0) {
        if (after.length < before.length && snapshot.active) clearVbeVectorPromptState(field);
        return false;
      }
    
      return activateEmptyVbeVectorPlaceholder(
        field,
        newlyEmpty,
        Number(field.position),
        afterRaw
      );
    }
    
    function unwrapVectorPlaceholderBody(body) {
      const source = String(body || '');
      if (!source.startsWith('\\placeholder')) return null;
      let cursor = '\\placeholder'.length;
      if (source[cursor] === '[') {
        const idEnd = source.indexOf(']', cursor + 1);
        if (idEnd < 0) return null;
        cursor = idEnd + 1;
      }
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
      if (source[cursor] !== '{') return null;
      const group = readLatexGroup(source, cursor);
      if (!group) return null;
      if (source.slice(group.close + 1).trim()) return null;
      return group.body;
    }
    
    function unwrapVbeVectorPrompts(latex) {
      let source = String(latex || '');
      const marker = '\\mathord{\\overrightarrow{';
      let cursor = 0;
      while (cursor < source.length) {
        const start = source.indexOf(marker, cursor);
        if (start < 0) break;
        const vectorOpen = start + '\\mathord{\\overrightarrow'.length;
        const vectorGroup = readLatexGroup(source, vectorOpen);
        if (!vectorGroup) break;
        const cleanBody = unwrapVectorPlaceholderBody(vectorGroup.body);
        if (cleanBody === null) {
          cursor = vectorGroup.close + 1;
          continue;
        }
        const replacement = `\\mathord{\\overrightarrow{${cleanBody}}}`;
        // marker already starts at the outer mathord; consume both closing braces:
        // one closes overrightarrow, the next closes mathord.
        const mathordClose = vectorGroup.close + 1 < source.length && source[vectorGroup.close + 1] === '}'
          ? vectorGroup.close + 1
          : vectorGroup.close;
        source = `${source.slice(0, start)}${replacement}${source.slice(mathordClose + 1)}`;
        cursor = start + replacement.length;
      }
      return source;
    }
    
    function finalizeVbeVectorPrompts(field) {
      if (!field) return false;
      try {
        const raw = typeof field.getValue === 'function'
          ? String(field.getValue('latex') || field.getValue() || '')
          : String(field.value || '');
        const clean = unwrapVbeVectorPrompts(raw);
        if (clean === raw) return false;
        if (typeof field.setValue === 'function') {
          field.setValue(clean, { suppressChangeNotifications: true });
        } else if ('value' in field) {
          field.value = clean;
        }
        field.dataset.latex = clean;
        return true;
      } catch (_) {
        return false;
      }
    }
    
    function readDirectMathLatex(field) {
      try {
        if (typeof field.getValue === 'function') return unwrapVbeVectorPrompts(String(field.getValue('latex') || field.getValue() || ''));
        if (typeof field.value === 'string') return unwrapVbeVectorPrompts(String(field.value || ''));
      } catch (_) {}
      return unwrapVbeVectorPrompts(String(field.dataset.latex || field.dataset.source || field.textContent || ''));
    }
    
    // P2.4.7.7.7 – operatorių po vektoriaus nebetaisome po vieną.
    // Problema kyla tada, kai žymeklis vizualiai jau atrodo išėjęs iš
    // \overrightarrow{...}, bet dar lieka išoriniame \mathord{...} lygyje.
    // Todėl prieš bet kurį įprastą binarinį / santykio operatorių pirmiausia
    // išvedame žymeklį už visos vektoriaus struktūros ir paliekame MathLive
    // pačiam įterpti operatorių bei pritaikyti jo natūralius tarpus.
    function mathFieldLatexBeforeCaret(field) {
      if (!field || typeof field.getValue !== 'function') return '';
      try {
        const position = Number(field.position);
        if (!Number.isFinite(position) || position <= 0) return '';
        return String(field.getValue(0, position, 'latex') || '');
      } catch (_) {
        return '';
      }
    }
    
    function caretFollowsVbeVector(field) {
      if (!field) return false;
      try {
        if (field.selectionIsCollapsed === false) return false;
      } catch (_) {}
      const prefix = mathFieldLatexBeforeCaret(field).trimEnd();
      if (!prefix) return false;
      return /\\mathord\{\\overrightarrow\{[\s\S]*\}\}\s*$/.test(prefix);
    }
    
    const VBE_VECTOR_KEYBOARD_EXIT_OPERATORS = new Set(['+', '-', '=', '<', '>', ':', '*', '/']);
    const VBE_VECTOR_TOOLBAR_EXIT_INSERTS = new Set([
      '+', '-', '\\cdot ', ':', '=', '\\ne ', '<', '>', '\\le ', '\\ge ',
      '\\approx ', '\\equiv ', '\\pm ', '\\mp ', '\\propto '
    ]);
    
    function isVbeVectorKeyboardExitOperator(key) {
      return VBE_VECTOR_KEYBOARD_EXIT_OPERATORS.has(String(key || ''));
    }
    
    function isVbeVectorToolbarExitOperator(insert) {
      return VBE_VECTOR_TOOLBAR_EXIT_INSERTS.has(String(insert || ''));
    }
    
    function insertVbeBinaryPlus(field) {
      if (!field) return false;
      const options = {
        insertionMode: 'replaceSelection',
        selectionMode: 'after',
        focus: true,
        scrollIntoView: false,
        format: 'latex'
      };
      try {
        let result = false;
        if (typeof field.insert === 'function') result = field.insert('\\mathbin{+}', options);
        else if (typeof field.executeCommand === 'function') result = field.executeCommand(['insert', '\\mathbin{+}', options]);
        if (result === false) return false;
        field.__syncDirectMathField?.();
        queueMicrotask(() => {
          if (!field.isConnected) return;
          captureMathFieldSelection(field);
          ensureMathFieldVisible(field);
        });
        return true;
      } catch (_) {
        return false;
      }
    }
    
    
    // P2.4.7.7.9 – pilnai išeiname iš mūsų vektoriaus redagavimo hierarchijos.
    // Ankstesnė versija bandė spręsti pagal prieš žymeklį serializuotą LaTeX.
    // MathLive gali serializuoti uždarą \mathord{\overrightarrow{...}} net tada,
    // kai žymeklis hierarchiškai dar yra išoriniame \mathord lygyje. Dėl to po
    // rankinio ArrowRight operatorius (ypač „*“ -> \cdot) kartais likdavo mathord
    // viduje ir prarasdavo tarpą iki kito skaičiaus.
    //
    // Mūsų konstrukcija turi daugiausia tris tėvinius redagavimo lygius
    // (#? placeholder -> overrightarrow -> mathord), todėl moveAfterParent
    // vykdome iki trijų kartų ir stabdome tik tada, kai pats MathLive praneša,
    // kad daugiau kilti nebegalima. Nesiremiame field.position pokyčiu: pereinant
    // per tėvinę ribą plokščias offsetas gali likti toks pats.
    function exitActiveVbeVectorPrompt(field) {
      if (!field || field.__vbeVectorPromptActive !== true) return false;
      try {
        if (field.selectionIsCollapsed === false) return false;
      } catch (_) {}
      if (typeof field.executeCommand !== 'function') return false;
    
      let moved = false;
      for (let i = 0; i < 3; i += 1) {
        let result = false;
        try { result = field.executeCommand('moveAfterParent'); } catch (_) { result = false; }
        if (result !== true) break;
        moved = true;
      }
    
      // Po bandymo laikome vektoriaus promptą užbaigtu. Jei jau buvome aukščiausiame
      // lygyje, pirmas moveAfterParent tiesiog grąžina false ir nieko nepajudina.
      clearVbeVectorPromptState(field);
      return moved;
    }
    
    function insertPlusAfterActiveVbeVectorPrompt(field) {
      if (!field || field.__vbeVectorPromptActive !== true) return false;
      const exited = exitActiveVbeVectorPrompt(field);
      if (!exited) return false;
      clearVbeVectorPromptState(field);
      return insertVbeBinaryPlus(field);
    }
    
    function replaceFollowingPlusAfterWrappedVector(field) {
      if (!field || typeof field.getValue !== 'function') return false;
      try {
        const position = Number(field.position);
        const lastOffset = Number(field.lastOffset);
        if (!Number.isFinite(position) || !Number.isFinite(lastOffset) || position >= lastOffset) return false;
        const suffix = String(field.getValue(position, lastOffset, 'latex') || '');
        if (!/^\s*\+/.test(suffix) || /^\s*\\mathbin\s*\{\+\}/.test(suffix)) return false;
        let deleted = false;
        if (typeof field.executeCommand === 'function') deleted = field.executeCommand('deleteForward') === true;
        if (!deleted) return false;
        return insertVbeBinaryPlus(field);
      } catch (_) {
        return false;
      }
    }
    
    function setDirectMathFieldValue(field, source, kind = 'expression', latexSource = '') {
      const plain = String(source || '');
      const latex = String(latexSource || sourceToLatex(plain, kind));
      field.dataset.source = plain;
      field.dataset.latex = latex;
      field.dataset.kind = kind;
      const apply = () => {
        try {
          if (typeof field.setValue === 'function') field.setValue(latex, { suppressChangeNotifications: true });
          else if ('value' in field) field.value = latex;
          else field.textContent = latex;
        } catch (_) { field.textContent = plain; }
      };
      apply();
      if (window.customElements?.whenDefined) {
        const initialLatex = latex;
        customElements.whenDefined('math-field').then(() => {
          if (!field.isConnected) return;
          installVbeMathMacros(field);
          // Neperrašome vartotojo įvesties, jeigu laukas buvo pakeistas dar prieš whenDefined mikro-užduotį.
          if (String(field.dataset.latex || '') === initialLatex) apply();
          renderMathFieldPreview(field);
        }).catch(() => {});
      }
      requestAnimationFrame(() => {
        if (field.isConnected) renderMathFieldPreview(field);
      });
    }
    
    function focusAdjacentMathField(field, direction = 1) {
      const fields = [...document.querySelectorAll('math-field.direct-math-field')].filter(item => item.isConnected && !item.hasAttribute('disabled'));
      const index = fields.indexOf(field);
      if (index < 0) return false;
      const next = fields[index + direction];
      if (!next) return false;
      try { next.focus({ preventScroll: true }); } catch (_) { next.focus(); }
      setActiveDirectMathField(next, next.dataset.mathContext || 'Matematinis laukas');
      return true;
    }
    
    function moveMathPlaceholderOrField(field, direction) {
      const before = selectionSignature(captureMathFieldSelection(field));
      let commandResult = false;
      try {
        if (typeof field.executeCommand === 'function') {
          commandResult = field.executeCommand(direction > 0 ? 'moveToNextPlaceholder' : 'moveToPreviousPlaceholder');
        }
      } catch (_) { commandResult = false; }
      const afterSelection = captureMathFieldSelection(field);
      const movedInside = commandResult === true || selectionSignature(afterSelection) !== before;
      if (movedInside) return;
    
      const wrapper = field?.closest?.('.mixed-inline-formula');
      const editor = wrapper ? mixedEditorFromNode(wrapper) : null;
      if (wrapper && editor) {
        clearMathEditSession();
        if (direction > 0) placeTextCaretAfter(wrapper, editor);
        else placeTextCaretBefore(wrapper, editor);
        return;
      }
      focusAdjacentMathField(field, direction);
    }
    
    const VBE_MATH_MACROS = Object.freeze({
      // P2.4.7.7.5: tik senų testinių įrašų suderinamumui.
      // Vektorius laikomas mathord, kad MathLive aplink operatorius išlaikytų taisyklingus tarpus.
      vctinput: Object.freeze({
        args: 1,
        def: '\\mathord{\\overrightarrow{#1}}',
        captureSelection: false
      })
    });
    
    function installVbeMathFieldStyles(field) {
      // P2.4.7.7.5: jokių piešiamų vektoriaus rodyklių.
      // Funkcija palikta kaip no-op, kad nekeistume kitų MathLive inicijavimo kelių.
      return field;
    }
    
    function installVbeMathMacros(field) {
      if (!field) return false;
      const apply = () => {
        try {
          if (!('macros' in field)) return false;
          field.macros = { ...(field.macros || {}), ...VBE_MATH_MACROS };
          return true;
        } catch (_) {
          return false;
        }
      };
      if (apply()) return true;
      if (window.customElements?.whenDefined) {
        customElements.whenDefined('math-field').then(() => {
          if (field.isConnected || field.ownerDocument) apply();
        }).catch(() => {});
      }
      return false;
    }
    
    function createDirectMathField({ source = '', latexSource = '', kind = 'expression', fieldKey = '', testid = '', placeholder = '', contextLabel = 'Matematinis laukas', onCommit, onEnter }) {
      const field = document.createElement('math-field');
      field.className = 'direct-math-field';
      field.setAttribute('virtual-keyboard-mode', 'manual');
      field.setAttribute('math-virtual-keyboard-policy', 'manual');
      field.setAttribute('smart-mode', 'false');
      field.setAttribute('smart-fence', 'true');
      field.setAttribute('aria-label', placeholder || 'Matematinis įvedimo laukas');
      if (placeholder) field.setAttribute('placeholder', placeholder);
      if (testid) field.dataset.testid = testid;
      field.dataset.mathContext = contextLabel;
      field.dataset.mathFieldKey = String(fieldKey || testid || `math-field-${++generatedMathFieldKey}`);
      installVbeMathFieldStyles(field);
      installVbeMathMacros(field);
      setDirectMathFieldValue(field, source, kind, latexSource);
      registerMathField(field);
    
      const reaffirm = options => reaffirmMathEditSession(field, contextLabel, options);
      const sync = () => {
        // Android fizinė / ekraninė klaviatūra gali trumpam pakeisti naršyklės focus būseną.
        // Pats įvedimo įvykis yra patikimas signalas, kad šis MathLive laukas tebėra aktyvus.
        reaffirm({ ensureVisible: false });
        const plain = readDirectMathField(field);
        const latex = readDirectMathLatex(field);
        field.dataset.source = plain;
        field.dataset.latex = latex;
        captureMathFieldSelection(field);
        scheduleMathFieldPreview(field);
        onCommit?.(plain, latex);
        queueMicrotask(() => {
          if (field.isConnected) reaffirm({ ensureVisible: false });
        });
      };
      field.__syncDirectMathField = sync;
      field.addEventListener('focusin', () => reaffirm({ ensureVisible: true }));
      field.addEventListener('focusout', () => {
        // Android klaviatūra gali trumpam perkelti focus į MathLive keyboard-sink arba naršyklę.
        // Neuždarome sesijos vien dėl blur/focusout: ją uždaro tik aiškus pointerdown už lauko.
        window.setTimeout(() => {
          if (!field.isConnected || getActiveDirectMathField() !== field) return;
          const active = document.activeElement;
          if (active === field || field.matches(':focus-within')) reaffirm({ ensureVisible: false });
          else updateMathToolbarUi();
        }, 80);
      });
      field.addEventListener('pointerdown', () => {
        field.__suppressMathReaffirmUntil = 0;
        field.__vbeVectorPointerReposition = true;
        reaffirm({ ensureVisible: false, explicit: true });
      });
      field.addEventListener('pointerup', () => {
        reaffirm({ ensureVisible: false });
        // Jei vartotojas pats pele / lietimu pasirinko žymeklio vietą, pasitikime
        // MathLive pozicija ir nebetaikome automatinio „išėjimo iš ką tik sukurto
        // vektoriaus“ operatoriams. Tai apsaugo nuo peršokimo per išorines struktūras.
        if (field.__vbeVectorPointerReposition) clearVbeVectorPromptState(field);
        field.__vbeVectorPointerReposition = false;
        captureMathFieldSelection(field);
        ensureMathFieldVisible(field);
      });
      field.addEventListener('beforeinput', event => {
        reaffirm({ ensureVisible: false });
        // P2.4.7.7.9.4: fizinį „*“ perimame dokumento CAPTURE fazėje, dar prieš
        // MathLive vidinius klaviatūros handlerius. Čia jo papildomai nebeįterpiame.
    
        // Android / ekraninė klaviatūra ne visada duoda patikimą keydown.
        // Jei kitas operatorius rašomas dar esant mūsų vektoriaus įvedimo kontekste,
        // prieš natūralų MathLive įterpimą išeiname už visos vektoriaus struktūros.
        // Event'o nestabdome: operatorių įterpia pats MathLive.
        if (!event.isComposing && event.inputType === 'insertText'
          && isVbeVectorKeyboardExitOperator(event.data)
          && field.__vbeVectorPromptActive === true) {
          exitActiveVbeVectorPrompt(field);
        }
      });
      field.addEventListener('compositionstart', () => reaffirm({ ensureVisible: false }));
      field.addEventListener('compositionupdate', () => reaffirm({ ensureVisible: false }));
      field.addEventListener('compositionend', sync);
      field.addEventListener('selection-change', () => {
        reaffirm({ ensureVisible: false });
        captureMathFieldSelection(field);
      });
      field.addEventListener('keyup', () => {
        reaffirm({ ensureVisible: false });
        captureMathFieldSelection(field);
      });
      field.addEventListener('input', () => {
        sync();
        if (field.__vbeVectorDeletePending) {
          queueMicrotask(() => {
            if (!field.isConnected) return;
            finishVbeVectorDeletion(field);
          });
        }
      });
      field.addEventListener('change', () => {
        finalizeVbeVectorPrompts(field);
        sync();
      });
      field.addEventListener('keydown', event => {
        reaffirm({ ensureVisible: false });
        if (!event.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey
          && (event.key === 'Backspace' || event.key === 'Delete')) {
          const deletion = beginVbeVectorDeletion(field);
          if (deletion.handled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          // Kai natyvus MathLive trynimas nesukelia input (pvz. jau tuščioje
          // sudėtinėje struktūroje), vis tiek užbaigiame patikrą po keydown ciklo.
          window.setTimeout(() => {
            if (field.isConnected && field.__vbeVectorDeletePending) finishVbeVectorDeletion(field);
          }, 0);
        }
        // P2.4.7.7.9.4: „*“ jau būna pilnai perimtas dokumento CAPTURE fazėje.
        // Kiti fizinės klaviatūros operatoriai paliekami natūraliam MathLive įterpimui,
        // tačiau prieš juos, jei reikia, pilnai išeiname iš aktyvaus vektoriaus.
        if (isVbeVectorKeyboardExitOperator(event.key)
          && !event.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey
          && field.__vbeVectorPromptActive === true) {
          exitActiveVbeVectorPrompt(field);
        }
        if (event.key === 'Tab') {
          clearVbeVectorPromptState(field);
          event.preventDefault();
          moveMathPlaceholderOrField(field, event.shiftKey ? -1 : 1);
          return;
        }
        if (event.key === 'Escape') {
          clearVbeVectorPromptState(field);
          event.preventDefault();
          finalizeVbeVectorPrompts(field);
          sync();
          field.blur();
          clearMathEditSession();
          return;
        }
        if (event.key === 'Enter' && !event.isComposing) {
          clearVbeVectorPromptState(field);
          event.preventDefault();
          event.stopPropagation();
          finalizeVbeVectorPrompts(field);
          sync();
          onEnter?.();
        }
      });
      field.addEventListener('move-out', event => {
        const wrapper = field.closest?.('.mixed-inline-formula');
        const editor = wrapper ? mixedEditorFromNode(wrapper) : null;
        if (!wrapper || !editor) return;
        const direction = event.detail?.direction;
        if (!['forward', 'backward'].includes(direction)) return;
        event.preventDefault();
        finalizeVbeVectorPrompts(field);
        sync();
        clearMathEditSession();
        if (direction === 'forward') placeTextCaretAfter(wrapper, editor);
        else placeTextCaretBefore(wrapper, editor);
      });
      return field;
    }

    return Object.freeze({
      normalizeMathLiveAscii,
      readDirectMathField,
      rawDirectMathLatex,
      scanVbeVectors,
      findInsertedVbeVectorIndex,
      clearVbeVectorPromptState,
      unwrapVbeVectorPrompts,
      finalizeVbeVectorPrompts,
      beginVbeVectorDeletion,
      finishVbeVectorDeletion,
      readDirectMathLatex,
      isVbeVectorToolbarExitOperator,
      exitActiveVbeVectorPrompt,
      moveMathPlaceholderOrField,
      createDirectMathField,
      sourceToLatex,
      installVbeMathMacros
    });
  }

  window.P772BoardMathField = Object.freeze({
    version: 'P1.7.9.49-M2.7',
    createEngine
  });
})();
