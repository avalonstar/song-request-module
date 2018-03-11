# Setup

Requires an express server and a Firebase database.

```
const app = require('express')();
const db = require('./db'); // Firebase reference
const srmodule = require('song-request-module')(db); // Pass in the Firebase reference

app.use('/song-request', srmodule);

app.listen(process.env.PORT, () => {
  console.log(`http://localhost:${process.env.PORT}`)
});
```

# Routes

All POSTs expect a json body.

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
}
```

### POST `/create`

Required POST body

```
{
	channel: String,
  user: String,
  song: String,
}
```

Response:

```
{
  "authorName": String,
  "provider": String,
  "title": String,
  "url": String,
  "user": String
}
```

### POST `/toggle`

Required POST body

```
{
	channel: String,
  status: Boolean
}
```

### POST `/limit`

Required POST body

```
{
	channel: String,
  limit: Integer
}
```

### POST `/play/next`

```
{
	channel: String
}
```

### GET `/next/:channel`

This gets the next song in the queue.
Response:

```
{
  "authorName": String,
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
  "authorName": String,
  "provider": String,
  "title": String,
  "url": String,
  "user": String
}
```
