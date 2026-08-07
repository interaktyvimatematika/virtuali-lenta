P7.7.2 ONLINE-P1.3 — mobiliojo realaus laiko rašymo ir trynimo optimizacija

Tikslas
- Sumažinti telefono / planšetės -> kompiuterio vėlavimą piešiant ir trinant.
- Išlaikyti P1.1 perėjimą be mirktelėjimo ir P1.2 gyvų taškų gabalų siuntimą.

Pakeitimai
1. Vietinis piešimas ir trynimas dabar vykdomas inkrementiškai: kiekvienam judesiui nebevalomas ir nebeperpiešiamas visas didelis canvas.
2. Naudojamas pointerrawupdate, kai jį palaiko naršyklė.
3. Toliau naudojami getCoalescedEvents() tarpiniai taškai.
4. Pridėtas touchmove fallback su passive:false mobiliesiems įrenginiams.
5. Pointer capture išlaikomas visam brūkšniui; praradus capture brūkšnys tvarkingai užbaigiamas.
6. Dubliuoti pointermove / pointerrawupdate / touchmove taškai atmetami.
7. Live sinchronizacijos intervalas ~24 ms; siunčiami tik nauji taškai, ne visas brūkšnys.
8. Tas pats mechanizmas taikomas pieštukui ir trintukui.

Tikslinis testas
A. Telefonas -> kompiuteris: 5 s neatitraukiant piršto / rašiklio piešti spiralę. Ji kompiuteryje turi augti rašymo metu, o ne atsirasti pabaigoje.
B. Telefonas -> kompiuteris: greitai trinti zigzagu 5 s. Trynimo trajektorija turi judėti kartu be ilgo atsivijimo.
C. Pakartoti A/B kompiuteris -> telefonas ir palyginti kryptis.
D. Patikrinti, kad brūkšnio pabaigoje nėra mirktelėjimo.

Pastaba
Visiškai nulinė interneto delsa neįmanoma, tačiau abiejų krypčių elgsena turi būti artima ir tinkama gyvai pamokai.
