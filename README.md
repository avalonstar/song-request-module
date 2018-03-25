# Setup

Requires an express server and a Firebase database.
Everything will be stored under [user]/song-request

```
const app = require('express')();
const db = require('./db'); // Firebase reference
const SongRequestModule = require('song-request-module')(db); // Pass in the Firebase reference

app.use('/song-request', SongRequestModule);

app.listen(process.env.PORT, () => {
  console.log(`http://localhost:${process.env.PORT}`)
});
```

All POSTs expect a JSON.
All Responses will be JSON.

# Routes

* POST `/create`
* POST `/toggle`
* POST `/limit`
* POST `/play/next`

---

* GET `/next/:channel`
* GET `/current/:channel`

All errors will return:

```
{
  error: String
  channel: String
}
```

### POST `/create`

POST body

```
{
  "url": "spotify:track:0y080AoWs2PLxJZjuhjcEl",
  "channel": "anne",
  "user": "1234567",
}
```

Example response:

```
{
  "status": 200,
  "title": "Fallout",
  "provider": "Spotify",
  "artist": "Marianas Trench",
  "url": "spotify:track:0y080AoWs2PLxJZjuhjcEl",
  "channel": "anne",
  "user": "12345",
  "message": "success"
}
```

### POST `/status`

POST body

```
{
  channel: String,
  status: Boolean
}
```

### POST `/limit`

POST body

```
{
  channel: String,
  limit: Integer
}
```

### POST `/play/next`

POST Body

```
{
  channel: String
}
```

Response

```
{
  "artist": "Marianas Trench",
  "provider": "Spotify",
  "title": "Fallout",
  "url": "spotify:track:0y080AoWs2PLxJZjuhjcEl",
  "user": "chatlurking",
  "channel": "anne"
}
```

### GET `/next/:channel`

This gets the next song in the queue.
Response:

```
{
  "artist": String,
  "provider": String,
  "title": String,
  "url": String,
  "user": String
}
```

### GET `/current/:channel`

This gets the current song that is playing.

```
{
  "artist": String,
  "provider": String,
  "title": String,
  "url": String,
  "user": String
}
```
