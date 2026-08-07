P7.7.2-ONLINE-P1.1.4

Pataisa nuo stabilios ONLINE-P1.1.3 bazės.

Pataisyta:
- Mokinys nebemato „Mokinys / Mokytojas“ jungiklio.
- Mokytojas taip pat nebemato vidinio režimų jungiklio; jo rolė yra fiksuota.
- Mokinys nebemato „Biblioteka“, „Išvalyti P7.7.2“, „Nauja sesija“,
  „Kopijuoti mokinio nuorodą“ ir „Peržiūrėti kaip mokinys“ valdiklių.
- Pataisa veikia ir siauresniuose telefono / planšetės išdėstymuose.

Priežastis:
P1.1.3 naudojo HTML `hidden`, tačiau ankstesnėje CSS buvo responsive taisyklė
`.topbar-actions .library-open-button { display: inline-flex !important; }`, kuri
siauresniuose ekranuose galėjo vėl parodyti Bibliotekos mygtuką. P1.1.4 rolėms
naudoja aiškias `display: none !important` taisykles pagal `data-online-role`.

Piešimo, trynimo, Firebase sinchronizacijos ir naujos sesijos mechanizmai nekeisti.
