P7.7.2 ONLINE-P1.1.1 — naujos sesijos pataisa

Bazė: ONLINE-P1.1 (rašymo mechanizmas nekeistas).

Pataisyta:
- „Nauja sesija“ sukuria naują tuščią Firebase kambarį.
- Atidarius pagrindinį adresą be ?room= sukuriama nauja tuščia lenta.
- Tuščias naujas Firebase kambarys nebėra užpildomas sena localStorage lenta.
- Vienkartinis ?new=1 ženklas po įkrovimo pašalinamas iš URL, todėl bendrinama nuoroda nebeišvalo sesijos kitam dalyviui.
- Sena ONLINE-P1.1 piešimo / live-stroke logika palikta nepakeista.

TESTAS:
1. Atnaujinti GitHub Pages failus.
2. Atidaryti pagrindinį adresą be ?room=.
3. Turi atsirasti naujas room kodas ir TUŠČIA lenta.
4. Nupiešti kelis ženklus.
5. Spausti „Nauja sesija“.
6. Room kodas turi pasikeisti, o lenta iškart išsituštinti.
7. Nukopijuoti naujos sesijos nuorodą į kitą įrenginį — jo prisijungimas neturi išvalyti lentos.
