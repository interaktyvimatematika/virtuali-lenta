P7.7.2 ONLINE-P1.3.1

Tikslinė P1.3 regresijos pataisa.

Kas buvo blogai P1.3:
- piešiant telefone vienu metu buvo klausomi pointermove, pointerrawupdate ir touchmove;
- tas pats fizinis judesys galėjo patekti į brūkšnį kelis kartus ir skirtinga tvarka;
- todėl greitai rašant atsirasdavo papildomos / grįžtančios linijos.

Kas pakeista:
- piešimui paliktas vienas Pointer Events judesio srautas: pointermove;
- tarpiniai taškai vis tiek paimami per getCoalescedEvents(), jei naršyklė juos pateikia;
- išlaikytas P1.3 inkrementinis vietinis piešimas (visa lenta neperpiešiama po kiekvieno judesio);
- išlaikytas P1.2/P1.3 Firebase live chunk perdavimas ir P1.1 live→final perėjimas be blyksnio.

Svarbiausias testas:
1. telefone lėtai rašyti S, 8 ir spiralę;
2. patikrinti, kad neatsiranda papildomų tiesių ar grįžtančių segmentų;
3. stebėti kompiuteryje, ar brūkšnys auga dar neatitraukus piršto / rašiklio;
4. pakartoti su trintuku.
