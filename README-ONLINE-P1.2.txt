P7.7.2 ONLINE-P1.2 — gyvas piešimas

Tikslas:
- kito dalyvio ekrane brūkšnį rodyti DAR PIEŠIANT, nelaukiant kol pieštukas / pelė bus atitraukta;
- išlaikyti P1.1 pataisą, kad gyvas brūkšnys nemirktelėtų pereidamas į išsaugotą brūkšnį.

Kas pakeista:
1. Gyvas brūkšnys į Firebase siunčiamas nebe vis iš naujo kaip visas augantis taškų masyvas.
2. Siunčiami tik naujai atsiradę taškų gabalai (~kas 28 ms, kai yra naujų taškų).
3. Pirmasis taškas siunčiamas nedelsiant, todėl kitame ekrane piešimas turi pradėti matytis dar neatitraukus pieštuko.
4. Naudojami PointerEvent.getCoalescedEvents() taškai, kai naršyklė juos pateikia — tai ypač naudinga rašikliui / planšetei.
5. Baigus brūkšnį gyva kopija paliekama iki nuolatinės drawing kopijos patvirtinimo, kad nebūtų P1 mirksėjimo.
6. Išlaikytas senų ONLINE-P1 / P1.1 liveStrokes formatų nuskaitymo suderinamumas.

Pastaba:
Tai yra „beveik realus laikas“ per internetą: fizinio nulinio vėlavimo negali būti, nes duomenys keliauja per tinklą ir Firebase. Tikslas — kad kitas žmogus matytų augantį brūkšnį rašymo metu, paprastai su nedidele tinklo delsa, o ne tik pakėlus pieštuką.

Testas:
- atidaryti tą patį ?room=... adresą dviejuose įrenginiuose;
- viename lėtai parašyti ilgą „S“ neatitraukiant pieštuko;
- kitame turi būti matoma, kaip „S“ auga piešimo metu;
- po atitraukimo brūkšnys neturi dingti / sublyksėti;
- pakartoti greitai rašant 12345 ir su trintuku.
