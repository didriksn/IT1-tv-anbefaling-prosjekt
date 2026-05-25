const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use(express.static("public"));


const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key INTEGER,
      title TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      series_id INTEGER,
      stars INTEGER,
      comment TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(series_id) REFERENCES series(id)
    )
  `);

  const users = [
    [1, "Didrik"],
    [2, "Olai"],
    [3, "Håvard"],
  ];

  users.forEach(([id, name]) => {
    db.run(
      `
        INSERT OR IGNORE INTO users (id, name)
        VALUES (?, ?)
      `,
      [id, name]
    );
  });
});





app.post("/reviews", (req, res) => {
  const { user_id, series_id, stars, comment } = req.body;
  const numericUserId = Number(user_id);
  const numericSeriesId = Number(series_id);

  if (!Number.isFinite(numericUserId) || !Number.isFinite(numericSeriesId)) {
    return res.status(400).json({ error: "Ugyldig bruker eller serie." });
  }

  db.get(
    `
      SELECT id
      FROM reviews
      WHERE user_id = ? AND series_id = ?
    `,
    [numericUserId, numericSeriesId],
    (err, existingReview) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingReview) {
        return res.status(409).json({
          error: "Du har allerede lagt til en anmeldelse til denne serien. Du må slette den om du vil lage en ny.",
        });
      }

      db.run(
        `
          INSERT INTO reviews (user_id, series_id, stars, comment)
          VALUES (?, ?, ?, ?)
        `,
        [numericUserId, numericSeriesId, stars, comment],
        (insertErr) => {
          if (insertErr) {
            res.status(500).json({ error: insertErr.message });
          } else {
            res.json({ message: "Anmeldelse lagret" });
          }
        }
      );
    }
  );

});

app.delete("/reviews/:id", (req, res) => {
  const reviewId = Number(req.params.id);
  const userId = Number(req.body.user_id);

  if (!Number.isFinite(reviewId) || !Number.isFinite(userId)) {
    return res.status(400).json({ error: "Ugyldig anmeldelse eller bruker." });
  }

  db.get(
    `
      SELECT id, user_id
      FROM reviews
      WHERE id = ?
    `,
    [reviewId],
    (err, review) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!review) {
        return res.status(404).json({ error: "Fant ikke anmeldelsen." });
      }

      if (Number(review.user_id) !== userId) {
        return res.status(403).json({ error: "Du kan bare slette dine egne anmeldelser." });
      }

      db.run(
        `
          DELETE FROM reviews
          WHERE id = ?
        `,
        [reviewId],
        (deleteErr) => {
          if (deleteErr) {
            return res.status(500).json({ error: deleteErr.message });
          }

          res.json({ message: "Anmeldelse slettet" });
        }
      );
    }
  );
});

app.get("/reviews", (req, res) => {
  const { series_id } = req.query;
  const queryParams = [];
  let whereClause = "";

  if (series_id) {
    whereClause = "WHERE reviews.series_id = ?";
    queryParams.push(series_id);
  }

  db.all(
    `
      SELECT reviews.id,
             reviews.user_id,
             reviews.series_id,
             reviews.stars,
             reviews.comment,
             users.name AS user_name
      FROM reviews
      LEFT JOIN users ON users.id = reviews.user_id
      ${whereClause}
      ORDER BY reviews.id DESC
    `,
    queryParams,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});

app.listen(5501, () => {
  console.log("Server is running on port 5501");
});