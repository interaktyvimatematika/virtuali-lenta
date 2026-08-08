P7.7.2 · P2-SPLIT-P1
=====================

TIKSLAS
Pirmas naujos vaizdavimo architektūros prototipas. Turinys sąmoningai nėra prioritetas.

NAUJA
- Trys nepriklausomi vaizdai: Lenta / Padalintas / Tik pratybos (mokiniui).
- Mokytojo trečias vaizdas vadinasi „Mokinio eiga“.
- Padalintame vaizde lenta ir šoninė sritis yra atskiri UI sluoksniai.
- Tarp jų tempiama pertvara. Santykis išsaugomas tik tame įrenginyje ir NESINCHRONIZUOJAMAS.
- Mokinys dešinėje turi „Mano pratybos“ erdvę.
- Mokytojas dešinėje turi „Mokinio eiga“ erdvę.
- Senas pratybų langas ant canvas šiame P2 prototipe paslėptas.
- Sena bandymų biblioteka pakeista P2 bibliotekos tuščia būsena. Turinį dėsime vėliau.
- Firebase bendros lentos, room, rolės, naujos sesijos ir realaus laiko piešimo mechanizmas neperrašytas.

SVARBU
Tai UI/architektūros prototipas, ne galutinė turinio versija.

TESTAS
1. Įkelk visą aplanką į tą patį GitHub Pages repository.
2. Atidaryk mokytojo nuorodą ir mokinio nuorodą kitame įrenginyje.
3. Patikrink, ar piešimas išliko sklandus abiem kryptimis.
4. Atskirai kiekviename įrenginyje perjunk Lenta / Padalintas / trečią vaizdą.
5. Padalintame vaizde tempk pertvarą. Kito įrenginio pertvara neturi judėti.
6. Mokytojo dešinėje turi būti „Mokinio eiga“, mokinio – „Mano pratybos“.
7. Mokinio režime Bibliotekos neturi būti.
8. Mokytojo Biblioteka šiame etape rodo sąmoningai tuščią P2 būseną.
