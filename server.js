const https = require("https");
const express = require('express');
const app = express();

var previousSearches = [];

function getSearch(query, offset) {
  return new Promise( (resolve, reject) => {
    let searchString = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${process.env.CUSTOM_SEARCH_ID}${offset}&searchType=image&key=${process.env.GOOGLE_API_KEY}`;

    https.get(searchString, res => {
      res.setEncoding("utf8");
      let sb = "";
      res.on("error", err => {
        return reject(err);
      });
      res.on("data", data => {
        sb += data;
      });
      res.on("end", () => {
        return resolve(JSON.parse(sb));
      });
    });
  });
}

function addQuery(newQuery) {
  previousSearches.push({query: newQuery, when: new Date()});
  if (previousSearches.length > 20) {
    previousSearches.shift();
  }
  console.log(newQuery + "added!");
  console.log("current storage is " + previousSearches.length);
  console.log("current: ", previousSearches);
}

app.use(express.static('public'));

app.get("/", (req, res) => {
  return res.sendFile(__dirname + '/views/index.html');
});

app.get("/api/imageSearch", (req, res) => {
  let query = req.query.q;
  if (query === undefined) {
    return res.status(400).send({error: "search parameter can't be empty"});
  }
  let offset = Number.parseInt(req.query.offset)
  console.log(offset);
  if (isNaN(offset) || offset <= 0) {
    offset = ""
  } else {
    offset = "&start=" + offset;
  }
  getSearch(query, offset).then(success => {
    let result = success.items.map(item => {
      return {imageUrl: item.link, alt: item.title, pageUrl: item.image.contextLink}
    });
    addQuery(query);
    res.send(result);
  }).catch(reason => {
    res.status(400).send({error: "improper input"});
  });
});

app.get("/api/latest", (req,res) => {
  res.send(previousSearches);
});

let listener = app.listen(process.env.PORT);