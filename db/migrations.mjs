// Datenbank-Migrationen der LoverBoy App.
// Neue Änderungen immer als NEUEN Eintrag unten anhängen, bestehende nie verändern.

export const migrations = [
  {
    id: 1,
    name: "init",
    sql: `
      CREATE TABLE media (
        id SERIAL PRIMARY KEY,
        mime TEXT NOT NULL,
        data BYTEA NOT NULL,
        uploaded_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE members (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        active BOOLEAN NOT NULL DEFAULT true,
        avatar_emoji TEXT NOT NULL DEFAULT '😎',
        avatar_media_id INT REFERENCES media(id) ON DELETE SET NULL,
        bio TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX sessions_member_idx ON sessions(member_id);

      CREATE TABLE invites (
        code TEXT PRIMARY KEY,
        created_by INT REFERENCES members(id) ON DELETE SET NULL,
        used_by INT REFERENCES members(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        used_at TIMESTAMPTZ
      );

      CREATE TABLE rules (
        id SERIAL PRIMARY KEY,
        emoji TEXT NOT NULL DEFAULT '⚠️',
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        points INT NOT NULL DEFAULT 1 CHECK (points > 0),
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE reports (
        id SERIAL PRIMARY KEY,
        accused_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        reporter_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        rule_id INT NOT NULL REFERENCES rules(id),
        points INT NOT NULL CHECK (points > 0),
        description TEXT NOT NULL DEFAULT '',
        defense TEXT NOT NULL DEFAULT '',
        evidence_media_id INT REFERENCES media(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        resolved_by_admin BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        resolved_at TIMESTAMPTZ
      );
      CREATE INDEX reports_accused_idx ON reports(accused_id);
      CREATE INDEX reports_status_idx ON reports(status);

      CREATE TABLE votes (
        report_id INT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        approve BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (report_id, member_id)
      );

      CREATE TABLE tiers (
        id SERIAL PRIMARY KEY,
        threshold INT NOT NULL UNIQUE CHECK (threshold > 0),
        name TEXT NOT NULL,
        emoji TEXT NOT NULL DEFAULT '💔',
        description TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE punishments (
        id SERIAL PRIMARY KEY,
        tier_id INT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE assigned_punishments (
        id SERIAL PRIMARY KEY,
        member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        tier_id INT REFERENCES tiers(id) ON DELETE SET NULL,
        milestone INT NOT NULL,
        punishment_id INT REFERENCES punishments(id) ON DELETE SET NULL,
        punishment_title TEXT,
        punishment_description TEXT,
        status TEXT NOT NULL DEFAULT 'spin' CHECK (status IN ('spin', 'open', 'done')),
        confirmed_by INT REFERENCES members(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        spun_at TIMESTAMPTZ,
        done_at TIMESTAMPTZ,
        UNIQUE (member_id, milestone)
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT INTO settings (key, value) VALUES
        ('votes_required', '3'),
        ('rejects_required', '3'),
        ('repeat_every', '5');

      INSERT INTO rules (emoji, title, description, points, sort_order) VALUES
        ('🚗', 'Jungs beim Abholen warten lassen',
         '"Bin in 5 Minuten unten" heißt 5 Minuten, nicht 25. Wer abgeholt wird, steht draußen, wenn das Auto kommt.', 1, 1),
        ('💔', 'Die Jungs für ein Mädchen hängen lassen',
         'Plan mit den Jungs steht? Dann steht er. Absagen, weil "sie" plötzlich geschrieben hat, ist Hochverrat.', 1, 2),
        ('📵', 'Gruppenchat auf "Gelesen" lassen',
         'Wichtige Fragen (Wann? Wo? Wer fährt?) gelesen und eiskalt ignoriert.', 1, 3),
        ('🕐', 'Last-Minute-Absage',
         'Weniger als eine Stunde vorher absagen, ohne echten Notfall.', 1, 4),
        ('🤥', 'Fake-Ausrede',
         'Nachweislich gelogene Ausrede, z. B. "bin krank", aber Story aus dem Café gepostet.', 1, 5),
        ('🙊', 'Jungs-Geheimnis ausplaudern',
         'Was unter den Jungs besprochen wird, bleibt unter den Jungs.', 1, 6);

      INSERT INTO tiers (threshold, name, emoji, description) VALUES
        (5, 'Kleiner Herzschmerz', '💌', 'Die erste Warnung. Peinlich, aber harmlos.'),
        (10, 'Gebrochenes Herz', '💔', 'Jetzt wird es öffentlich.'),
        (15, 'Hoffnungsloser Romantiker', '🥀', 'Die Königsklasse. Ab hier gibt es alle 5 Punkte eine neue Strafe.');

      INSERT INTO punishments (tier_id, title, description)
      SELECT t.id, p.title, p.description FROM tiers t
      JOIN (VALUES
        (5, 'Liebesgedicht', 'Schreib ein Liebesgedicht über einen der Jungs und trag es im nächsten Call mit Gefühl vor.'),
        (5, 'Herz-Sprachnachricht', 'Sing 30 Sekunden eines Liebeslieds als Sprachnachricht in die Gruppe.'),
        (5, 'Runde ausgeben', 'Beim nächsten Treffen zahlst du Getränke oder Snacks für alle.'),
        (5, 'Profilbild der Schande', '24 Stunden ein Profilbild, das die Gruppe aussucht.'),
        (10, 'Chauffeur der Woche', 'Eine Woche lang Fahr- und Abholdienst für die Jungs. Pünktlich, natürlich.'),
        (10, 'Romantik-Story', 'Poste eine peinlich-romantische Story, die die Gruppe aussucht (24h online).'),
        (10, 'Serenade', 'Sing ein Liebeslied in der Öffentlichkeit, die Jungs filmen.'),
        (10, 'Butler-Tag', 'Einen Tag lang Butler der Gruppe, inklusive "Sehr wohl, mein Herr".'),
        (15, 'Das große Geständnis', 'Gestehe einem Mädchen eurer Wahl die Liebe. Die Jungs wählen, du lieferst.'),
        (15, 'Liebesbrief', 'Handgeschriebener Liebesbrief an ein Mädchen eurer Wahl, persönlich übergeben.'),
        (15, 'Rosenkavalier', 'Kauf eine Rose und überreiche sie mit einem selbstgeschriebenen Gedicht einem Mädchen eurer Wahl.'),
        (15, 'Ausflug spendieren', 'Plane und bezahle einen Ausflug für die ganze Gruppe.')
      ) AS p(threshold, title, description) ON p.threshold = t.threshold;
    `,
  },
];
