P7.7.2-ONLINE-P1.1.8.3

Pataisyta interaktyvaus VBE modulio atsakymo tikrinimo būsena bendroje lentoje.

Problema P1.1.8.2:
- pasirinkus atsakymo variantą ir paspaudus „Tikrinti“, žalias arba geltonas pranešimas trumpam pasirodydavo,
  bet po Firebase / parent būsenos sinchronizacijos iframe būdavo perpiešiamas;
- pasirinktas atsakymas, pirmo neteisingo bandymo užuomina ir teisingo atsakymo būsena DOM'e nebuvo atkuriami.

P1.1.8.3:
- ignoruoja identišką savo būsenos aidą iš tėvinės lentos;
- po tikro nuotolinio atnaujinimo atkuria pasirinktus atsakymo variantus ir įvestus laukus;
- atkuria žalią teisingo atsakymo būseną bei mygtuką „Toliau“;
- atkuria geltoną pirmo neteisingo bandymo pranešimą ir pirmąją užuominą;
- atkuria „Kartoti“, pataisyto atsakymo ir parodyto sprendimo būsenas.

Sąmoningai nekeista pedagoginė eiga: po teisingo atsakymo į kitą klausimą automatiškai neperšokama – mokinys paspaudžia „Toliau“.
