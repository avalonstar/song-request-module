const globals = require('./globals');
const fetch = require('node-fetch');
const formurlencoded = require('form-urlencoded');
const axios = require('axios');

const songList = '/song-request/song-list';
const userList = '/song-request/user-list';
const settingsRef = '/song-request/settings';

const test = async (values) => {
  const video = await getVideoInfo(values.song);
  console.log(video);
  return video;
};

const spotifyAuth = () => {
  const auth = new Buffer(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  axios
    .request({
      method: 'POST',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      data: formurlencoded({
        grant_type: 'client_credentials',
      }),
    })
    .then((response) => {
      const { data } = response;
      globals.db
        .ref()
        .child(`authentication/song-request/spotify`)
        .update(data);
    })
    .catch((error) => {
      const { status, statusText } = error
      return { status, statusText }
    });
};

const createRequest = async (values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel, user, song } = values;
  if (!channel || !user | !song) return { error: 'invalid paramaters' };
  const listRef = `${channel}/${songList}`;
  const userRef = `${channel}/${userList}`;
  try {
    const settings = await getSettings(channel);
    if (!settings.isOn) return { error: 'song requests are not on' };
    const video = await getVideoInfo(song);
    if (video.error) return video.error;

    const requestCount = await findUser(userRef, user);
    if (!requestCount || requestCount <= settings.limit) {
      globals.db
        .ref()
        .child(`${userRef}`)
        .update({ [user.toLowerCase()]: requestCount + 1 });
      globals.db
        .ref()
        .child(`${listRef}`)
        .push({
          ...video,
          user,
        });
      return { status: 200, ...video, user, message: 'success' };
    } else {
      return { status: 200, error: 'too many requests in queue' };
    }
  } catch (e) {
    return e;
  }
};

const getNext = async (values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel } = values;
  if (!channel) return { error: 'invalid paramaters' };
  try {
    const settings = await getSettings(channel);
    if (!settings.isOn) return { error: 'song requests are not on' };
    const snap = await globals.db
      .ref()
      .child(`${channel}/${songList}`)
      .limitToFirst(2)
      .once('value', (snap) => {
        return snap;
      });
    if (snap.val() === {}) return null;
    return Object.values(snap.val())[1];
  } catch (e) {
    return e;
  }
};

const getCurrent = async (values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel } = values;
  if (!channel) return { error: 'invalid paramaters' };
  try {
    const settings = await getSettings(channel);
    if (!settings.isOn) return { error: 'song requests are not on' };
    const snap = await globals.db
      .ref()
      .child(`${channel}/${songList}`)
      .limitToFirst(1)
      .once('value', (snap) => {
        return snap;
      });
    if (snap.val() === {}) return null;
    return Object.values(snap.val())[0];
  } catch (e) {
    return e;
  }
};

const setStatus = async (values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel, status } = values;
  if ((!channel, !status)) return { error: 'invalid parameters' };
  try {
    await globals.db
      .ref()
      .child(`${channel}/${settingsRef}`)
      .update({ isOn: status });
    return {};
  } catch (e) {
    return e;
  }
};

const setLimit = async (values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel, limit } = values;
  try {
    await globals.db
      .ref()
      .child(`${channel}/${settingsRef}`)
      .update({ limit: limit });
    return {};
  } catch (e) {
    return e;
  }
};

const playNext = async (values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel } = values;
  try {
    const next = await globals.db
      .ref()
      .child(`${channel}/${songList}`)
      .limitToFirst(2)
      .once('value', (snap) => {
        return snap;
      });
    await globals.db
      .ref()
      .child(`${channel}/${songList}`)
      .update({
        [Object.keys(next.val())[0]]: null,
      });
    return Object.values(next.val())[1] || {};
  } catch (e) {
    console.log(e);
    return { error: 'error fetching next' };
  }
};

module.exports = {
  test,
  createRequest,
  getNext,
  getCurrent,
  setStatus,
  setLimit,
  playNext,
  spotifyAuth,
};

const findUser = async (ref, user) => {
  try {
    const snap = await globals.db
      .ref()
      .child(ref)
      .child(`${user}`)
      .once('value', (snap) => {
        return snap;
      });
    return snap.val();
  } catch (e) {
    return e;
  }
};

const getSettings = async (channel) => {
  try {
    const snap = await globals.db
      .ref()
      .child(`${channel}/${settingsRef}`)
      .once('value', (snap) => {
        return snap;
      });
    if (!snap.val()) {
      await globals.db
        .ref()
        .child(`${channel}/${settingsRef}`)
        .set({ limit: 5, isOn: true });
      return {
        limit: 5,
        isOn: true,
      };
    } else {
      return snap.val();
    }
  } catch (e) {
    return { error: 'failed' };
  }
};

const getSpotifyAuth = async () => {
  try {
    const snap = await globals.db
      .ref()
      .child(`authentication/song-request/spotify`)
      .once('value', (snap) => {
        return snap;
      });
    return snap.val().access_token;
  } catch (e) {}
};

const getVideoInfo = async (song) => {
  const youtubeRegex1 = /(?:youtube.com\/watch\?v=)([a-zA-Z0-9]+)/gi;
  const youtubeRegex2 = /(?:youtu.be\/)([a-zA-Z0-9]+)/gi;
  const spotifyRegex1 = /(?:open.spotify.com\/track\/)([a-zA-Z0-9]+)/gi;
  const spotifyRegex2 = /(?:spotify:track:)([a-zA-Z0-9]+)/gi;
  const youtubeMatch1 = youtubeRegex1.exec(song);
  const youtubeMatch2 = youtubeRegex2.exec(song);
  const spotifyMatch1 = spotifyRegex1.exec(song);
  const spotifyMatch2 = spotifyRegex2.exec(song);

  try {
    if (youtubeMatch1 || youtubeMatch2) {
      const id = youtubeMatch1 || youtubeMatch2;

      const info = await fetch(
        `https://www.youtube.com/oembed?url=https://youtu.be/${
          id[1]
        }&format=json`
      );
      const data = await info.json();
      return {
        title: data.title,
        provider: data.provider_name,
        artist: data.author_name,
        url: song,
      };
    } else if (spotifyMatch1 || spotifyMatch2) {
      const tokens = await getSpotifyAuth();
      const id = spotifyMatch1 || spotifyMatch2;
      const info = await fetch(`https://api.spotify.com/v1/tracks/${id[1]}`, {
        headers: { Authorization: `Bearer ${tokens}` },
      });
      const data = await info.json();
      return {
        title: data.name,
        provider: 'Spotify',
        artist: data.artists.name,
        url: data.uri,
      };
    } else {
      const info = await fetch(
        `https://www.youtube.com/oembed?url=https://youtu.be/${song}&format=json`
      );
      const data = await info.json();
      return {
        title: data.title,
        provider: data.provider_name,
        artist: data.author_name,
        url: `https://youtu.be/${song}`,
      };
    }
  } catch (e) {
    console.log(e);
    return { error: 'song not found' };
  }
};
