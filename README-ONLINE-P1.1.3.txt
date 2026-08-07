P7.7.2-ONLINE-P1.1.3

Bazė: vartotojo patvirtinta sklandi P7.7.2-ONLINE-P1.1.1 + P1.1.2 sesijų/rolių darbas.

Pakeitimai:
- Mokytojo ir mokinio rolės nebeperjungiamos tame pačiame lange.
- Mokytojo nuoroda visada atidaro mokytojo režimą.
- „Kopijuoti mokinio nuorodą“ sukuria aiškią ?role=student nuorodą.
- Mokinio nuoroda visada užrakina programą mokinio režime ir nerodo Bibliotekos, išvalymo, naujos sesijos ar rengyklės valdymo.
- Mokytojui pridėtas „Peržiūrėti kaip mokinys“: ta pati sesija atidaroma naujame mokinio lange.
- Viršutinis Mokinys/Mokytojas perjungiklis neberodomas nei vienai rolei.
- „Išbandyti kaip mokiniui“ mokytojo rengyklėje nebeperjungia mokytojo lango – atidaro atskirą mokinio vaizdą.
- Naujos sesijos perkėlimas išlaiko kiekvieno dalyvio rolę.

Pastaba: tai rolėmis paremta sąsaja, o ne galutinė serverinė autorizacija. Tikrai saugiai teises vėliau užrakins Firebase Authentication + Database Rules.
