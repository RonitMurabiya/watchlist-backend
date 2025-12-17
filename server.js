const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- FILE PATHS ----------------
const dataFile = path.join(__dirname, "data.json");
const instrumentsFile = path.join(__dirname, "instruments.json");

// ---------------- SAFE JSON HELPERS ----------------
function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      // create file with fallback content
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }

    const text = fs.readFileSync(filePath, "utf8");

    if (!text || !text.trim()) {
      // empty file → rewrite fallback
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }

    return JSON.parse(text);
  } catch (err) {
    console.error("❌ Failed to parse JSON:", filePath, err);
    return fallback;
  }
}

function writeJsonSafe(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Failed to write JSON:", filePath, err);
  }
}

// ----------------------------------------------
// DEFAULT STRUCTURES
// ----------------------------------------------
const WATCHLIST_FALLBACK = {
  last: "",
  theme: "dark",
  watchlists: {
    default: [],
  },
  tabs: [],
};

// ---------------- GET WATCHLIST ----------------
app.get("/api/watchlist", (req, res) => {
  const json = readJsonSafe(dataFile, WATCHLIST_FALLBACK);
  res.json(json);
});

// ---------------- UPDATE WATCHLIST ----------------
app.post("/api/watchlist/update", (req, res) => {
  const newWatchlist = req.body.watchlist;
  const watchlistName = req.body.name || "default";

  if (!Array.isArray(newWatchlist)) {
    return res.status(400).json({ error: "watchlist must be an array" });
  }

  // Load existing JSON safely
  const json = readJsonSafe(dataFile, WATCHLIST_FALLBACK);

  if (!json.watchlists) {
    json.watchlists = { default: [] };
  }

  json.watchlists[watchlistName] = newWatchlist;

  writeJsonSafe(dataFile, json);

  res.json({
    status: "success",
    message: "Watchlist updated",
    watchlists: json.watchlists,
  });
});

// ---------------- UPDATE TABS ----------------
app.post("/api/tabs/update", (req, res) => {
  const newTabs = req.body.tabs;
  const activeTab = req.body.activeTab; // Optionally save active tab

  if (!Array.isArray(newTabs)) {
    return res.status(400).json({ error: "tabs must be an array" });
  }

  const json = readJsonSafe(dataFile, WATCHLIST_FALLBACK);
  json.tabs = newTabs;

  if (activeTab !== undefined) {
    json.last = activeTab; // Saving active tab as 'last' or separate field
  }

  writeJsonSafe(dataFile, json);

  res.json({
    status: "success",
    message: "Tabs updated",
    tabs: json.tabs,
  });
});

// ---------------- DELETE WATCHLIST ----------------
app.post("/api/watchlist/delete", (req, res) => {
  const watchlistName = req.body.name;

  if (!watchlistName) {
    return res.status(400).json({ error: "watchlist name is required" });
  }

  if (watchlistName === "default") {
    return res.status(400).json({ error: "Cannot delete default watchlist" });
  }

  // Load existing JSON safely
  const json = readJsonSafe(dataFile, WATCHLIST_FALLBACK);

  if (json.watchlists && json.watchlists[watchlistName]) {
    delete json.watchlists[watchlistName];
    writeJsonSafe(dataFile, json);
  }

  res.json({
    status: "success",
    message: "Watchlist deleted",
    watchlists: json.watchlists || {},
  });
});

// ---------------- RENAME WATCHLIST ----------------
app.post("/api/watchlist/rename", (req, res) => {
  const { oldName, newName } = req.body;

  if (!oldName || !newName) {
    return res.status(400).json({ error: "oldName and newName are required" });
  }

  if (oldName === "default" || newName === "default") {
    return res.status(400).json({ error: "Cannot rename default watchlist" });
  }

  // Load existing JSON safely
  const json = readJsonSafe(dataFile, WATCHLIST_FALLBACK);

  if (!json.watchlists || !json.watchlists[oldName]) {
    return res.status(404).json({ error: "Watchlist not found" });
  }

  if (json.watchlists[newName]) {
    return res.status(400).json({ error: "Target name already exists" });
  }

  // Perform rename
  json.watchlists[newName] = json.watchlists[oldName];
  delete json.watchlists[oldName];

  writeJsonSafe(dataFile, json);

  res.json({
    status: "success",
    message: "Watchlist renamed",
    watchlists: json.watchlists,
  });
});

// ---------------- GET INSTRUMENTS LIST ----------------
// ---------------- GET INSTRUMENTS LIST ----------------
app.get("/api/instruments", (req, res) => {
  if (fs.existsSync(instrumentsFile)) {
    res.sendFile(instrumentsFile);
  } else {
    res.json([]);
  }
});

// ---------------- START SERVER ----------------
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`✅ API running safely on http://localhost:${PORT}`)
);
