(() => {
  'use strict';

  const VERSION = 'P1.7.9.49-P3.2.6.3';
  const KNOWN_FUNCTIONS = new Set(['sqrt']);

  function normalizeSource(value) {
    return String(value ?? '')
      .replace(/[−–—]/g, '-')
      .replace(/[×·⋅]/g, '*')
      .replace(/÷/g, '/')
      .replace(/[＝]/g, '=')
      .replace(/₀/g, '_0')
      .replace(/₁/g, '_1')
      .replace(/₂/g, '_2')
      .replace(/₃/g, '_3')
      .replace(/₄/g, '_4')
      .replace(/₅/g, '_5')
      .replace(/₆/g, '_6')
      .replace(/₇/g, '_7')
      .replace(/₈/g, '_8')
      .replace(/₉/g, '_9')
      .trim();
  }

  function baseIdentifier(value) {
    const source = String(value || '').trim();
    const match = source.match(/^([A-Za-z])(?:_?\d+)?$/);
    return match ? match[1] : '';
  }

  function lexicalIdentifiers(source) {
    const input = normalizeSource(source);
    const matches = input.match(/[A-Za-z][A-Za-z0-9_]*/g) || [];
    const variables = new Set();
    const unknownWords = new Set();
    for (const token of matches) {
      if (KNOWN_FUNCTIONS.has(token.toLowerCase())) continue;
      const base = baseIdentifier(token);
      if (base) variables.add(base);
      else unknownWords.add(token);
    }
    return { variables: [...variables], unknownWords: [...unknownWords] };
  }

  function scanBrackets(source) {
    const input = normalizeSource(source);
    const pairs = { ')': '(', ']': '[', '}': '{' };
    const stack = [];
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      if ('([{'.includes(char)) stack.push(char);
      else if (')]}'.includes(char)) {
        if (!stack.length || stack.pop() !== pairs[char]) {
          return { status: 'unsupported', message: 'Uždarytas skliaustas neturi poros.' };
        }
      }
    }
    if (stack.length) return { status: 'incomplete', message: 'Eilutėje dar neuždaryti skliaustai.' };
    return { status: 'ok', message: '' };
  }

  function splitTopLevelEqualities(source) {
    const input = normalizeSource(source);
    const parts = [];
    const stack = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };
    let start = 0;
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      if ('([{'.includes(char)) stack.push(char);
      else if (')]}'.includes(char)) {
        if (!stack.length || stack.pop() !== pairs[char]) throw new Error('Uždarytas skliaustas neturi poros.');
      } else if (char === '=' && stack.length === 0) {
        parts.push(input.slice(start, index).trim());
        start = index + 1;
      }
    }
    if (stack.length) throw new Error('Eilutėje dar neuždaryti skliaustai.');
    parts.push(input.slice(start).trim());
    return parts;
  }

  function splitTopLevelStatements(source) {
    const input = normalizeSource(source);
    const parts = [];
    const stack = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };
    let start = 0;
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      if ('([{'.includes(char)) stack.push(char);
      else if (')]}'.includes(char)) {
        if (!stack.length || stack.pop() !== pairs[char]) throw new Error('Uždarytas skliaustas neturi poros.');
      } else if ((char === ';' || char === ',') && stack.length === 0) {
        const tail = input.slice(index + 1);
        // Kablelį laikome atskyrikliu tik tada, kai po jo akivaizdžiai prasideda
        // naujas simbolio priskyrimas. Taip dešimtainis kablelis lieka skaičiaus dalimi.
        if (char === ',' && !/^\s*[A-Za-z](?:_?\d+)?\s*=/.test(tail)) continue;
        const part = input.slice(start, index).trim();
        if (part) parts.push(part);
        start = index + 1;
      }
    }
    if (stack.length) throw new Error('Eilutėje dar neuždaryti skliaustai.');
    const tail = input.slice(start).trim();
    if (tail) parts.push(tail);
    return parts;
  }

  function looksIncomplete(source, parts = null) {
    const input = normalizeSource(source);
    if (!input) return true;
    if (/[=+\-*/^:,]$/.test(input)) return true;
    if (/\bsqrt\s*\($/i.test(input)) return true;
    const equalityParts = parts || (() => {
      try { return splitTopLevelEqualities(input); }
      catch (_) { return null; }
    })();
    if (equalityParts && equalityParts.some(part => !part)) return true;
    return false;
  }

  function unsupportedCharacter(source) {
    const input = normalizeSource(source);
    // Sąmoningai leidžiame mokyklinėje matematikoje dažnus simbolius. Šis sluoksnis
    // tikrina, ar užrašą mokame perskaityti, o ne ar jis matematiškai teisingas.
    const stripped = input
      .replace(/[a-zA-Z0-9_\s.+\-*/^=(),;:{}\[\]|<>≤≥≠∈∅√]/g, '');
    return stripped ? [...stripped][0] : '';
  }

  function detectPrimaryVariable(source) {
    const input = normalizeSource(source);
    if (!input) return { ok: false, status: 'empty', variable: '', message: 'Pradinė lygtis dar neįrašyta.' };
    const bracket = scanBrackets(input);
    if (bracket.status !== 'ok') return { ok: false, status: bracket.status, variable: '', message: bracket.message };
    if (looksIncomplete(input)) return { ok: false, status: 'incomplete', variable: '', message: 'Pradinė lygtis dar nebaigta.' };
    const lexical = lexicalIdentifiers(input);
    if (lexical.unknownWords.length) {
      return { ok: false, status: 'unsupported', variable: '', message: `Neatpažintas užrašas „${lexical.unknownWords[0]}“.` };
    }
    const variables = lexical.variables;
    if (!variables.length) return { ok: false, status: 'unsupported', variable: '', message: 'Pradinėje lygtyje nerastas nežinomasis.' };
    if (variables.length > 1) {
      return {
        ok: false,
        status: 'unsupported',
        variable: '',
        variables,
        message: `Pradinėje lygtyje rasti keli neapibrėžti simboliai (${variables.join(', ')}). Pirmiausia reikia aiškaus vieno nežinomojo.`
      };
    }
    return { ok: true, status: 'understood', variable: variables[0], variables, message: `Atpažintas nežinomasis ${variables[0]}.` };
  }

  function simpleDeclaredSymbol(value) {
    const input = normalizeSource(value).replace(/[{}()\s]/g, '');
    return baseIdentifier(input);
  }

  function analyzeLine(source, context = {}) {
    const input = normalizeSource(source);
    const primaryVariable = baseIdentifier(context.primaryVariable) || String(context.primaryVariable || '');
    if (!input) return { status: 'empty', kind: 'empty', message: '', declarations: [] };

    const bracket = scanBrackets(input);
    if (bracket.status !== 'ok') return { status: bracket.status, kind: 'syntax', message: bracket.message, declarations: [] };
    const badCharacter = unsupportedCharacter(input);
    if (badCharacter) {
      return { status: 'unsupported', reason: 'syntax-unsupported', kind: 'syntax', message: `Šio simbolio „${badCharacter}“ tikrintuvas kol kas nesupranta.`, declarations: [] };
    }
    const lexical = lexicalIdentifiers(input);
    if (lexical.unknownWords.length) {
      return { status: 'unsupported', reason: 'syntax-unsupported', kind: 'syntax', message: `Šio užrašo „${lexical.unknownWords[0]}“ tikrintuvas kol kas nesupranta.`, declarations: [] };
    }

    let parts;
    try { parts = splitTopLevelEqualities(input); }
    catch (error) { return { status: 'unsupported', reason: 'syntax-unsupported', kind: 'syntax', message: String(error?.message || error), declarations: [] }; }
    if (looksIncomplete(input, parts)) {
      return { status: 'incomplete', kind: 'syntax', message: 'Eilutė dar nebaigta.', declarations: [] };
    }

    // P3.2.6.2: keli aiškūs simbolių priskyrimai vienoje eilutėje
    // (pvz. p=1; q=5; r=6) yra normalios deklaracijos, o ne lygybių grandinė.
    let statements = null;
    try { statements = splitTopLevelStatements(input); }
    catch (error) { return { status: 'unsupported', reason: 'syntax-unsupported', kind: 'syntax', message: String(error?.message || error), declarations: [] }; }
    if (statements.length > 1) {
      const declared = [];
      let allDefinitions = true;
      for (const statement of statements) {
        let statementParts;
        try { statementParts = splitTopLevelEqualities(statement); }
        catch (_) { allDefinitions = false; break; }
        if (statementParts.length !== 2 || looksIncomplete(statement, statementParts)) { allDefinitions = false; break; }
        const symbol = simpleDeclaredSymbol(statementParts[0]);
        if (!symbol || symbol === primaryVariable) { allDefinitions = false; break; }
        declared.push(symbol);
      }
      if (allDefinitions && declared.length) {
        return {
          status: 'understood',
          kind: 'definitions',
          message: '',
          declarations: [...new Set(declared)],
          identifiers: lexical.variables
        };
      }
    }

    if (parts.length === 1) {
      // Sprendinių aibės / atsakymo eilutėje lygybė nebūtinai reikalinga.
      if (context.allowValueOnly || /[;∈∅{}]/.test(input)) {
        return { status: 'understood', kind: 'value', message: '', declarations: [] };
      }
      return {
        status: 'unsupported',
        reason: 'syntax-unsupported',
        kind: 'syntax',
        message: 'Šios eilutės tikrintuvas kol kas nesupranta kaip sprendimo žingsnio. Jei tai lygybė, įrašyk „=“.',
        declarations: []
      };
    }

    const declarations = [];
    const first = simpleDeclaredSymbol(parts[0]);
    const knownSymbols = new Set((Array.isArray(context.knownSymbols) ? context.knownSymbols : []).map(baseIdentifier).filter(Boolean));
    // Jei eilutė atrodo kaip konkretaus kintamojo reikšmės / šaknies grandinė
    // (x₁=...=...), jos bazinis simbolis turi sutapti su sąlygos nežinomuoju,
    // nebent toks simbolis anksčiau aiškiai apibrėžtas. Tai dar nėra teisingumo
    // vertinimas – tik semantinio konteksto perspėjimas.
    const rawLeftIdentifier = normalizeSource(parts[0]).replace(/[{}()\s]/g, '');
    const indexedSolutionSymbol = /^[A-Za-z](?:_?[12])$/.test(rawLeftIdentifier);
    if (parts.length > 2 && indexedSolutionSymbol && first && first !== primaryVariable && !knownSymbols.has(first)) {
      return {
        status: 'unsupported',
        reason: 'unexpected-primary-symbol',
        kind: 'context',
        message: `Pradinės lygties nežinomasis yra ${primaryVariable || 'kitas simbolis'}, o čia naudojamas neapibrėžtas ${first}.`,
        declarations: [],
        identifiers: lexical.variables
      };
    }
    if (parts.length === 2 && first && first !== primaryVariable) {
      declarations.push(first);
      return {
        status: 'understood',
        kind: 'definition',
        message: '',
        declarations,
        identifiers: lexical.variables
      };
    }

    // Daugiau nei vienas „=“ yra normali lygybių grandinė. Jos teisingumą tikrina
    // validatorius; čia tik patvirtiname, kad struktūra yra perskaitoma.
    return {
      status: 'understood',
      kind: parts.length > 2 ? 'equality-chain' : 'equation',
      message: '',
      declarations,
      identifiers: lexical.variables
    };
  }

  function analyzeSolution(initialSource, steps = []) {
    const initial = detectPrimaryVariable(initialSource);
    const primaryVariable = initial.ok ? initial.variable : '';
    const knownSymbols = new Set(primaryVariable ? [primaryVariable] : []);
    const stepResults = [];

    for (const rawStep of Array.isArray(steps) ? steps : []) {
      const step = rawStep && typeof rawStep === 'object' ? rawStep : { type: 'equation', values: [String(rawStep ?? '')] };
      const values = Array.isArray(step.values) ? step.values : [step.value ?? ''];
      const branchResults = values.map(value => analyzeLine(value, {
        primaryVariable,
        knownSymbols: [...knownSymbols],
        allowValueOnly: step.type === 'solution-set'
      }));
      branchResults.forEach(result => result.declarations?.forEach(symbol => knownSymbols.add(symbol)));
      const visible = branchResults.filter(result => result.status !== 'empty');
      let status = 'empty';
      if (visible.some(result => result.status === 'unsupported')) status = 'unsupported';
      else if (visible.some(result => result.status === 'incomplete')) status = 'incomplete';
      else if (visible.length) status = 'understood';
      const firstMessage = visible.find(result => result.status === status && result.message)?.message || '';
      stepResults.push({ status, message: firstMessage, branches: branchResults });
    }

    return {
      status: initial.ok ? 'ready' : initial.status,
      primaryVariable,
      initial,
      knownSymbols: [...knownSymbols],
      stepResults
    };
  }

  window.P772MathSemanticInput = Object.freeze({
    version: VERSION,
    normalizeSource,
    baseIdentifier,
    lexicalIdentifiers,
    splitTopLevelEqualities,
    splitTopLevelStatements,
    detectPrimaryVariable,
    analyzeLine,
    analyzeSolution
  });
})();
