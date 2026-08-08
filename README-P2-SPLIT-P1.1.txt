P7.7.2 · P2-SPLIT-P1.1

Tikslinė pataisa po P2-SPLIT-P1 realaus naudojimo testo.

Pataisyta:
- rašant bendros lentos teksto laukelyje laukas nebeturi prarasti focus po pirmos raidės;
- rašant formulę naujas simbolis nebeturi perrašyti ankstesnio simbolio;
- Firebase lokalaus kliento ankstesni būsenos echo laikomi patvirtinimu, o ne nauja nuotoline būsena, todėl aktyvus contenteditable / MathLive DOM neperpiešiamas;
- piešimo, trynimo, room, rolių ir P2 split vaizdo logika nekeista.

Patikra:
1. Tekstas: vienu aktyvavimu parašyti bent 20–30 simbolių sakinį.
2. Formulė: vienu aktyvavimu įrašyti x^2+3x-4=0, dalį simbolių renkant Matematikos juostoje.
3. Patikrinti abu veiksmus mokytojo ir mokinio languose.
4. Patikrinti, kad įrašas pasirodo kitame įrenginyje po trumpo sinchronizacijos intervalo, bet rašančiojo laukas nepraranda žymeklio.
