P7.7.2 ONLINE-P1.1 — SKLANDESNIO PIEŠIMO KANDIDATĖ

Pakeitimai nuo ONLINE-P1:
- Gyvas nuotolinis brūkšnys nebeištrinamas pointerup momentu.
- Galutinė gyva brūkšnio kopija laikoma tol, kol tas pats stroke ID patvirtinamas nuolatiniame workspace/drawing.
- Tik tada gyva kopija pašalinama (su 70 ms perdengimu), todėl neturi būti tarpinio dingimo / sublyksėjimo.
- Vienam klientui liveStrokes dabar gali laikyti kelis dar nepatvirtintus brūkšnius, todėl greitai rašant vieną raidę po kitos ankstesnis brūkšnys nedingsta.
- Gyvo piešimo siuntimo intervalas sutrumpintas nuo 55 ms iki 40 ms (~25 atnaujinimų/s).
- Paliktas 2,5 s avarinis live įrašo išvalymas, jei persistavimo patvirtinimas neateitų.

Testas:
1. Atidaryti tą patį ?room= kodą dviejuose įrenginiuose.
2. Greitai parašyti kelias raides / skaičius viename.
3. Kitame ekrane stebėti, ar pakėlus pieštuką brūkšniai nebedingsta ir nebeatsiranda.
4. Patikrinti trintuką abiem kryptimis.
