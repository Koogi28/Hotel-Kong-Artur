# Feature Specification: Bookinger, nøgletal og barsalg

**Feature Branch**: `001-booking-kpi-bar`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Hotel Kong Arthur ønsker et system til bookinger, nøgletal og barsalg.
Receptionisten opretter, retter og afbestiller bookinger på hotellets 214 værelser,
hoteladministratoren ser belægningsgrad, omsætning og gruppens nøgletal (mest solgte drink i
antal enheder for kaffe og cocktails), og bartender Helene Christine registrerer barsalg.
Data fra https://github.com/ITAKEA/hoteldata bruges som startdata og må ikke ændres eller
opdigtes."

## Clarifications

### Session 2026-10-27

- Q: Hvilke datoer hører til hver sæson? → A: Sæsonen afgøres alene ud fra ankomstdatoens måned
  (afrejsedatoen indgår ikke). Lavsæson: januar–februar og november. Mellemsæson: marts–maj og
  september–oktober. Højsæson: juni–august og december.
- Q: Hvilken pris pr. nat skal en ny booking have? → A: Lavsæson = laveste pris i intervallet,
  mellemsæson = midterprisen, højsæson = højeste pris.
- Q: Tæller historiske data uden datoer med i årets tal? → A: Ja. Alle registrerede data ligger
  inden for det samme år.
- Q: Skal en ny booking have en afrejsedato? → A: Nej. En ny booking har ankomstdato og antal
  nætter; afrejsedato fjernes (konstitution v4.0.0, princip VI).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Oprettelse og styring af bookinger (Priority: P1)

Som receptionist vil jeg kunne oprette, rette og slette bookinger for gæster, så hotellets
belægning altid er opdateret. Receptionisten indtaster gæstedetaljer (fornavn, efternavn og land),
værelsestype, ankomstdato og antal nætter. Systemet udregner sæson og pris. Alle
handlinger kan udføres fra browseren og er dokumenteret i Swagger UI.

**Why this priority**: Bookinger er grundlaget for både belægningsgrad og omsætning. Uden dem har
nøgletallene ingen nye data at vise.

**Independent Test**: Kan testes alene ved at oprette, fremsøge, rette og afbestille en booking fra
browseren, ved at forsøge at gemme en booking med ugyldig dato, ugyldigt antal nætter eller
manglende felter og ved at
afprøve de samme handlinger i Swagger UI.

**Acceptance Scenarios**:

1. **Given** receptionisten har gæstens oplysninger, **When** receptionisten indtaster fornavn,
   efternavn, land, værelsestype, ankomstdato og antal nætter og gemmer, **Then** oprettes bookingen
   med udregnet sæson og samlet pris, og den kan ses i bookinglisten.
2. **Given** en eksisterende booking, **When** receptionisten søger på gæstens navn, **Then** vises
   bookingen i søgeresultatet (både nye og historiske bookinger).
3. **Given** en eksisterende ny booking, **When** receptionisten ændrer gæstedetaljer,
   værelsestype, ankomstdato eller antal nætter og gemmer, **Then** gemmes ændringen, og sæson og
   pris udregnes igen.
4. **Given** en eksisterende booking, **When** receptionisten afbestiller den, **Then** slettes den
   fra bookinglisten og tæller ikke længere med i belægning eller omsætning.
5. **Given** ankomstdatoen er ugyldig (fx 31. februar eller forkert format), eller antal nætter er
   mindre end 1 eller ikke et helt tal, **When** receptionisten forsøger at gemme, **Then** afvises
   bookingen med en forståelig fejlbesked, der nævner det ugyldige felt.
6. **Given** et eller flere obligatoriske felter mangler, **When** receptionisten forsøger at gemme,
   **Then** afvises bookingen med en forståelig fejlbesked, der nævner de manglende felter.
7. **Given** systemet kører, **When** en bruger åbner Swagger UI, **Then** er opret, hent, ret og
   slet af bookinger dokumenteret og kan afprøves derfra.

---

### User Story 2 - Live overblik over belægning og omsætning (Priority: P2)

Som hoteladministrator vil jeg se belægningsgrad og omsætning, så jeg kan optimere prissætning og
markedsføring. Overblikket viser årets samlede indtjening, indtjening fordelt på gæsteland,
værelsestype og sæson, belægningsgraden og gruppens eget nøgletal: den mest solgte drink målt i
antal solgte enheder for henholdsvis kaffe og cocktails.

**Why this priority**: Overblikket er hotellets beslutningsgrundlag, men det bygger på data fra
bookinger (US1) og barsalg (US3).

**Independent Test**: Kan testes alene på startdataene ved at sammenligne de viste tal med tal
udregnet manuelt fra datafilerne og derefter oprette én ny booking og opdatere siden.

**Acceptance Scenarios**:

1. **Given** startdataene er indlæst, **When** administratoren åbner overblikket, **Then** vises
   årets samlede indtjening.
2. **Given** startdataene er indlæst, **When** administratoren åbner overblikket, **Then** vises
   indtjeningen fordelt på gæsteland, på værelsestype og på sæson, og hver fordeling summerer til
   den samlede indtjening.
3. **Given** der findes bookinger med ankomstdato, **When** administratoren vælger en nat, **Then** vises
   belægningsgraden som antal bookede værelser den nat divideret med 214, angivet i procent.
4. **Given** der findes barsalg, **When** administratoren åbner overblikket, **Then** vises den
   kaffe og den cocktail, der er solgt flest enheder af, med antal enheder.
5. **Given** overblikket er åbent, **When** receptionisten opretter en ny booking, og
   administratoren opdaterer siden, **Then** indgår den nye booking i alle relevante nøgletal.
6. **Given** nøgletallene er tilgængelige, **When** de hentes ind i et Tableau-dashboard, **Then**
   viser dashboardet de samme tal som overblikket.

---

### User Story 3 - Registrering af barsalg (Priority: P3)

Som bartender (Helene Christine) vil jeg nemt kunne registrere salg af kaffe og cocktails i
lobbybaren, så omsætningen pr. drikkevare kan følges løbende.

**Why this priority**: Barsalget er en selvstændig, mindre del af hotellets omsætning og afhænger
ikke af bookingerne.

**Independent Test**: Kan testes alene ved at registrere et salg og se, at Helenes samlede salg,
omsætningen pr. drikkevare og fordelingen mellem kaffe og cocktails ændrer sig tilsvarende.

**Acceptance Scenarios**:

1. **Given** menuen med 20 cocktails og 10 kaffetyper, **When** Helene vælger en drikkevare, angiver
   antal og registrerer salget, **Then** gemmes salget med drikkevare, antal og tidspunkt.
2. **Given** der er registreret salg, **When** Helene åbner barens oversigt, **Then** vises, hvor
   meget hun har solgt i alt i år (antal enheder og omsætning i DKK).
3. **Given** der er registreret salg, **When** barens oversigt vises, **Then** vises den samlede
   omsætning pr. drikkevare for alle 30 drikkevarer.
4. **Given** der er registreret salg, **When** barens oversigt vises, **Then** vises den procentvise
   fordeling af omsætningen mellem kaffe og cocktails, og de to procenter summerer til 100.
5. **Given** barens nøgletal er tilgængelige, **When** de hentes ind i et Tableau-dashboard,
   **Then** viser dashboardet de samme tal som barens oversigt.
6. **Given** Helene angiver antal 0 eller et negativt antal, **When** hun forsøger at registrere,
   **Then** afvises salget med en forståelig fejlbesked.

---

### Edge Cases

- En booking, der strækker sig over et månedsskifte til en anden sæson, får hele opholdet prissat
  efter ankomstmånedens sæson (fx ankomst 30. november → lavsæson for alle nætter).
- Historiske bookinger uden datoer indgår ikke i belægningsgraden.
- Historiske bookinger kan fremsøges og vises, men deres sæson, antal nætter og pris kan ikke
  ændres, da data fra datafilen ikke må ændres.
- Hvis der ikke er registreret barsalg eller bookinger i den valgte periode, vises 0 og ikke en fejl.
- Hvis to drikkevarer har lige mange solgte enheder, vises begge som mest solgt.
- Ukendt værelsestype eller drikkevare afvises med en forståelig fejlbesked.

## Requirements *(mandatory)*

### Functional Requirements

**Startdata**

- **FR-001**: Systemet SKAL ved første opstart indlæse de 1000 historiske bookinger og de 30
  drikkevarer fra datafilerne i https://github.com/ITAKEA/hoteldata.
- **FR-002**: Historiske bookinger SKAL gemmes med fornavn, efternavn, land, værelsestype, antal
  nætter, sæson og pris præcis som i datafilen og uden datoer.
- **FR-003**: Systemet MÅ IKKE ændre, supplere eller opdigte data fra datafilerne (fx må der ikke
  tildeles datoer til historiske bookinger eller tidspunkter til historiske barsalg).

**Bookinger (US1)**

- **FR-004**: Receptionisten SKAL kunne oprette en booking med fornavn, efternavn, land,
  værelsestype, ankomstdato og antal nætter; alle felter er påkrævede.
- **FR-005**: Systemet SKAL afvise en booking med ugyldig ankomstdato (ikke-eksisterende dato eller
  forkert format), et antal nætter der ikke er et helt tal på mindst 1, eller hvor et obligatorisk
  felt mangler; fejlbeskeden SKAL være forståelig og nævne de berørte felter.
- **FR-006**: Bookingens periode SKAL være nætterne fra ankomstdatoen og antal nætter frem
  (fx ankomst 6. december og 3 nætter = nætterne 6., 7. og 8. december).
- **FR-007**: Systemet SKAL fastsætte bookingens sæson alene ud fra ankomstdatoens måned;
  alle nætter i bookingen får ankomstmånedens sæson:

  | Sæson | Måneder |
  |-------|---------|
  | Lavsæson | januar, februar, november |
  | Mellemsæson | marts, april, maj, september, oktober |
  | Højsæson | juni, juli, august, december |

- **FR-008**: Systemet SKAL fastsætte prisen pr. nat ud fra værelsestype og sæson efter casens
  prisintervaller: laveste pris i lavsæson, midterprisen i mellemsæson og højeste pris i
  højsæson. Alle priser er hele kroner (DKK pr. nat):

  | Værelsestype | Casens interval | Lavsæson | Mellemsæson | Højsæson |
  |--------------|-----------------|---------:|------------:|---------:|
  | Standard Single | 900–1.200 | 900 | 1.050 | 1.200 |
  | Grand Lit | 1.100–1.400 | 1.100 | 1.250 | 1.400 |
  | Standard Double | 1.200–1.600 | 1.200 | 1.400 | 1.600 |
  | Superior Double | 1.400–2.000 | 1.400 | 1.700 | 2.000 |
  | Junior Suite | 1.800–2.500 | 1.800 | 2.150 | 2.500 |
  | Spa Executive | 2.000–2.800 | 2.000 | 2.400 | 2.800 |
  | Suite | 2.500–3.500 | 2.500 | 3.000 | 3.500 |
  | LOFT Suite | 3.000–4.000 | 3.000 | 3.500 | 4.000 |

- **FR-009**: Bookingens samlede pris SKAL være prisen pr. nat × antal nætter.
- **FR-010**: Receptionisten SKAL kunne fremsøge bookinger på gæstens for- eller efternavn.
- **FR-011**: Receptionisten SKAL kunne rette gæstedetaljer, værelsestype, ankomstdato og antal
  nætter på en ny booking; sæson og pris udregnes igen ved hver ændring.
- **FR-012**: Receptionisten SKAL kunne afbestille (slette) en booking, hvorefter den ikke indgår i belægning
  eller omsætning.
- **FR-013**: Hver booking optager præcis ét værelse.
- **FR-014**: Receptionisten SKAL kunne oprette, fremsøge, rette og slette bookinger fra browseren.
- **FR-015**: Opret, hent, ret og slet af bookinger SKAL være dokumenteret i Swagger UI og kunne
  afprøves derfra.

**Overblik og nøgletal (US2)**

- **FR-016**: Systemet SKAL vise årets samlede indtjening fra bookinger; alle registrerede data,
  både historiske og nye, ligger inden for det samme år og tæller med.
- **FR-017**: Systemet SKAL vise indtjeningen fordelt på gæsteland, på værelsestype og på sæson.
- **FR-018**: Systemet SKAL vise belægningsgraden for en valgt nat som antal bookede værelser den nat
  divideret med 214, kun ud fra bookinger med ankomstdato.
- **FR-019**: Systemet SKAL vise gruppens nøgletal: den kaffe og den cocktail, der er solgt flest
  enheder af, med antal enheder.
- **FR-020**: Alle nøgletal SKAL udregnes ud fra de aktuelle data, hver gang de vises, så nye
  bookinger og barsalg indgår, når siden opdateres.
- **FR-021**: Nøgletallene SKAL kunne hentes ind i og vises i et Tableau-dashboard.

**Barsalg (US3)**

- **FR-022**: Helene SKAL kunne registrere et salg ved at vælge en drikkevare fra menuen og angive et
  antal på mindst 1; tidspunktet sættes automatisk til registreringstidspunktet.
- **FR-023**: Et salg SKAL gemmes med drikkevare, antal og tidspunkt; der registreres ingen
  medarbejder, da Helene Christine er barens eneste medarbejder.
- **FR-024**: Systemet SKAL vise Helenes samlede salg i år i antal enheder og omsætning (DKK).
- **FR-025**: Systemet SKAL vise den samlede omsætning pr. drikkevare (pris × solgte enheder).
- **FR-026**: Systemet SKAL vise den procentvise fordeling af omsætningen mellem kaffe og cocktails.
- **FR-027**: Barens nøgletal SKAL kunne hentes ind i og vises i et Tableau-dashboard.

### Key Entities *(include if feature involves data)*

- **Booking**: Én gæsts ophold på ét værelse. Har fornavn, efternavn, land, værelsestype, antal
  nætter, sæson og samlet pris. Nye bookinger har desuden en ankomstdato; historiske
  bookinger fra datafilen har ingen datoer og er markeret som historiske.
- **Værelsestype**: En af de otte typer i datafilen: Standard Single, Standard Double, Superior
  Double, Grand Lit, Junior Suite, Spa Executive, Suite og LOFT Suite. Har et prisinterval pr. nat
  for hver sæson.
- **Sæson**: Lav, mellem eller høj. Bestemmer prisen pr. nat for nye bookinger.
- **Drikkevare**: En af de 30 varer på menuen med navn, kategori (kaffe eller cocktail) og pris i DKK.
  Datafilen indeholder desuden et historisk antal solgte enheder pr. drikkevare uden tidspunkter.
- **Barsalg**: Ét registreret salg med drikkevare, antal og tidspunkt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Receptionisten kan oprette en ny booking på under 2 minutter.
- **SC-002**: 100 % af nye bookinger får den sæson og samlede pris, der følger af ankomstmåneden,
  værelsestypen og antal nætter (FR-007–FR-009).
- **SC-003**: Helene kan registrere et salg på under 15 sekunder.
- **SC-004**: En ny booking eller et nyt barsalg indgår i alle relevante nøgletal første gang siden
  opdateres efter registreringen.
- **SC-005**: Samlet indtjening og fordelinger beregnet på startdataene stemmer 100 % overens med
  tal udregnet manuelt fra datafilerne.
- **SC-006**: Efter indlæsning findes præcis 1000 historiske bookinger og 30 drikkevarer, og alle
  værdier er identiske med datafilerne.
- **SC-007**: Tableau-dashboardet viser de samme tal som systemets egne oversigter.

## Assumptions

- Receptionist, hoteladministrator og bartender bruger systemet på hotellets egne computere; login
  og adgangsstyring er uden for scope.
- Hver booking svarer til ét værelse, ligesom hver række i datafilen.
- Datafilernes priser er i DKK; den historiske bookingpris er bookingens samlede pris (alle nætter).
- Sæsonerne i datafilen (low, mid, high) svarer til lav-, mellem- og højsæson.
- Prisintervallerne i FR-008 er casens intervaller; midterprisen er gennemsnittet af laveste og
  højeste pris. De historiske bookinger i datafilen kan have priser uden for intervallerne (fx
  op til 1.498 DKK pr. nat for Standard Single); de bevares uændrede.
- Alle registrerede data, både historiske bookinger, historiske solgte enheder og nye
  registreringer, ligger inden for det samme år. Nøgletal "i år" medregner derfor alt.
- Gruppens nøgletal "mest solgte drink" medregner både datafilens historiske antal solgte enheder og
  nye registrerede salg.
- Belægningsgraden vises pr. nat; et gennemsnit over en periode er uden for scope.
- Afbestilte bookinger slettes og gemmes ikke som historik.
- Valuta er DKK; der er ingen rabatter, moms-opdeling eller betaling i systemet.
