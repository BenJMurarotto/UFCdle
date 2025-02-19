const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;
const path = require('path');
const Papa = require('papaparse');
const fs = require('fs');
const csvFile = fs.readFileSync('./public/countriesbycontinent.csv', 'utf-8');
let countriesToContinent = {}

app.use(express.static(path.join(__dirname, 'public')));

// make sqlite connection
const db = new sqlite3.Database('./back/app/misc/ufcdle.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

//
function parseCountryCSV() {
  Papa.parse(csvFile, {
    header: true, 
    complete: function(results) {
        results.data.forEach(row => {
            const { Country, Continent } = row;  
            countriesToContinent[Country] = Continent;  // reverse mapping (country -> continent) for quicker searching
        });

        console.log(countriesToContinent);
    }
});
}
parseCountryCSV();



app.get('/api/countries', (req, res) => {
  console.log('Sending continentToCountries:', countriesToContinent); // print statement for debugging 
  res.json(countriesToContinent);
});



// this is the api route for ajax search 
//---- update this to accommodate the few fighters which appear in the rankings more than once ----
app.get('/api/data', (req, res) => {
  const searchQuery = req.query.name ? `${req.query.name}%` : '%';
  const sql = `
    SELECT * FROM fighters
    WHERE LOWER(fname) LIKE LOWER(?) OR LOWER(lname) LIKE LOWER(?)
  `;
  db.all(sql, [searchQuery, searchQuery], (err, rows) => { // passing searchQuery twice
    if (err) {
      console.error('Error fetching data:', err.message);
      res.status(500).json({ error: 'Failed to fetch data' });
      return;
    }
    res.json(rows);
  });
});

// this api route is for the server to grab a random fighter from the db which
app.get('/api/data/secretfighter', (req, res) => {
  const searchQuery = req.query.id;
  const sql = 'SELECT * FROM fighters WHERE id = ?';
  db.get(sql, [searchQuery], (err, row) => {
    if (err) {
      console.error('Error fetching data:', err.message);
      res.status(500).json({ error: 'Failed to fetch data' });
      return;
    }
    res.json(row); 
  });
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
