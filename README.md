# 💘 LoverBoy App

> *Liebe ist Pflicht. Fehler kosten.*

Das offizielle Strafregister der LoverBoys: Wer gegen den Kodex verstößt, bekommt Strafpunkte. Wer bestimmte Punktestände erreicht, dreht am Glücksrad und muss eine Strafe erledigen.

## Features

- **Login nur auf Einladung:** Der erste Account wird Admin und verschickt Einladungslinks (auch direkt per WhatsApp).
- **Hall of Shame:** Rangliste mit Titeln von 😇 *Unschuldsengel* bis 🌹 *Casanova a.D.*
- **Verstoß melden:** Person und Regel wählen, Tathergang und Beweisfoto anhängen. Selbstanzeigen zählen sofort.
- **Abstimmung:** Ein Punkt zählt erst nach X "Schuldig"-Stimmen (Standard 3). Melder und Angeklagter stimmen nicht mit, der Angeklagte kann sich verteidigen. Der Admin kann ein Machtwort sprechen.
- **Strafstufen:** 5 / 10 / 15 Punkte, danach alle 5 Punkte eine neue Strafe (alles im Admin-Bereich änderbar).
- **Glücksrad 🎡:** Der Server würfelt die Strafe aus dem Pool der Stufe aus, das Rad dreht sich dorthin (kein Schummeln möglich).
- **Strafe erledigt:** Ein *anderer* LoverBoy muss bestätigen.
- **Profile** mit Vorstrafenregister, Lieblingssünde, Petz-Score und Profilbild.
- **Admin-Bereich:** Mitglieder, Einladungen, Kodex, Stufen, Strafen-Pool und Spielregeln.
- Mobile-first und als App auf den Homescreen installierbar.

## Technik

Next.js 16 (App Router, Server Actions) · Tailwind CSS 4 · PostgreSQL (`pg`, eigene Migrationen in `db/migrations.mjs`) · Login mit scrypt-Passwörtern und Sessions in der DB · Bilder werden im Browser verkleinert und in Postgres gespeichert.

## 🚂 Deployment auf Railway

1. Auf [railway.com](https://railway.com) ein **New Project → Deploy from GitHub repo** wählen und dieses Repo auswählen.
2. Im Projekt **+ Create → Database → PostgreSQL** hinzufügen.
3. Beim App-Service unter **Variables** anlegen:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
4. Unter **Settings → Networking → Generate Domain** eine öffentliche URL erzeugen.
5. Deploy abwarten. Die Datenbank-Tabellen werden beim Start automatisch angelegt.
6. **Sofort** die URL öffnen: Du landest auf `/setup` und legst deinen Admin-Account an. Danach ist `/setup` gesperrt.
7. Im Admin-Bereich (👑) Einladungslinks erstellen und an die Jungs schicken.

## Lokal entwickeln

```bash
cp .env.example .env.local     # DATABASE_URL anpassen
npm install
npm run db:migrate
npm run dev
```

Neue Datenbank-Änderungen immer als **neuen** Eintrag unten in `db/migrations.mjs` anhängen, bestehende Migrationen nie ändern.
