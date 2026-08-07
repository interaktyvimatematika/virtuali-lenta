P7.7.2-ONLINE-P1.1.8.2

Pataisymai po realaus vartotojo testo:
1. VBE išorinio modulio užduoties sąlygos po kiekvieno renderTask() iš naujo perduodamos MathJax. Taip formulės turi būti atvaizduojamos ir perėjus į kitą užduotį, ir atkūrus užduotį iš bendros Firebase būsenos.
2. Išorinio pratybų modulio lango dydis nebenaudoja seno 760/980 px puslapinių pratybų limito. Dydis saugomas pasaulio koordinatėmis ir layoutBoardObjects() naudoja tą patį skaičiavimą, todėl keičiant lentos mastelį nustatytas dydis turi išlikti.

P7.7.2-ONLINE-P1.1.1 patvirtintas piešimo/trynimo mechanizmas nekeistas.
