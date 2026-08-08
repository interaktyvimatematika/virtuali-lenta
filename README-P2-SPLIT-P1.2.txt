P2-SPLIT-P1.2

Tikslinė pataisa po realaus testo, kai bendros lentos teksto laukas prarasdavo fokusą, o formulės simboliai pakeisdavo ankstesnį turinį.

Pakeitimai:
- Firebase notes sinchronizacijai naudojamas kanoninis (rikiuotų raktų) fingerprintas;
- notes pakeitimas tame pačiame atominiame workspace atnaujinime pažymimas jo autoriaus žyma;
- mūsų pačių notes echo niekada neperpiešia aktyvaus contenteditable / MathLive DOM;
- aktyviai redaguojant teksto/formulės lauką kito įrenginio notes atnaujinimas atidedamas iki redagavimo pabaigos;
- lokali notes remote-cache būsena atnaujinama optimistiškai, kad lėtas Firebase round-trip negalėtų sugrąžinti senesnės mūsų pačių būsenos.

Piešimo, trynimo, room, rolių ir P2 split vaizdo mechanizmai nekeisti.
