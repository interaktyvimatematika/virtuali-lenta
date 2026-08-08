P2-SPLIT-P1.5.1 — pilno „Tik pratybos / Mokinio eiga“ vaizdo pataisa

Pataisyta:
- mokytojo „Mokinio eiga“ pilname režime neberodomas tuščias pilkas ekranas;
- mokinio „Tik pratybos“ pilname režime šoninė pratybų sritis užima visą darbo plotą;
- pašalintas senas papildomas „Tik pratybos“ mygtukas iš mokytojo viršutinės juostos;
- P1.5 split-view UX, P1.4 tekstinių laukų elgsena ir Firebase branduolys nekeisti.

Priežastis:
CSS Grid auto-placement paslėpus lentos ir skirtuko elementus perkeldavo likusį
šoninį langą į pirmą 0 px pločio stulpelį. Dabar pilname režime naudojamas vienas
aiškus 1fr stulpelis.
