const globals = require('./globals');
const formurlencoded = require('form-urlencoded');
const axios = require('axios');
const moment = require('moment');

const SONG_LIST = '/song-request/song-list';
const USER_LIST = '/song-request/user-list';
const SETTINGS_REF = '/song-request/settings';

const spotifyAuth = () => {
  const auth = new Buffer(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  return axios
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
      const newData = {
        ...data,
        expires_in: moment()
          .add(59, 'min')
          .unix(),
      };
      globals.db
        .ref()
        .child(`authentication/song-request/spotify`)
        .update(newData);
      return newData;
    })
    .catch((error) => {
      const { status, statusText } = error;
      return { status, statusText };
    });
};

const createRequest = async (values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel, user, song } = values;
  if (!channel || !user | !song) return { error: 'invalid paramaters' };
  const listRef = `${channel}/${SONG_LIST}`;
  const userRef = `${channel}/${USER_LIST}`;
  try {
    const settings = await getSettings(channel);
    if (!settings.isOn)
      return { user, channel, error: 'song requests are not on' };
    const video = await getVideoInfo(song);
    if (video.error) return { ...video, channel, user, song };

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
      return {
        status: 200,
        user,
        channel,
        error: 'too many requests in queue',
      };
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
      .child(`${channel}/${SONG_LIST}`)
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
      .child(`${channel}/${SONG_LIST}`)
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
      .child(`${channel}/${SETTINGS_REF}`)
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
      .child(`${channel}/${SETTINGS_REF}`)
      .update({ limit: limit });
    return {};
  } catch (e) {
    return e;
  }
};

const playNext = async (values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel } = values;
  const userRef = `${channel}/${USER_LIST}`;
  try {
    const next = await globals.db
      .ref()
      .child(`${channel}/${SONG_LIST}`)
      .limitToFirst(2)
      .once('value', (snap) => {
        return snap;
      });
    globals.db
      .ref()
      .child(`${channel}/${SONG_LIST}`)
      .update({
        [Object.keys(next.val())[0]]: null,
      });
    if (Object.keys(next.val()).length === 1) {
      const user = Object.values(next.val())[0].user;
      const requestCount = await findUser(userRef, user);
      globals.db
        .ref()
        .child(`${userRef}`)
        .update({ [user]: requestCount - 1 });
      return Object.values(next.val())[0];
    }
    const user = Object.values(next.val())[1].user;
    const requestCount = await findUser(userRef, user);
    globals.db
      .ref()
      .child(`${userRef}`)
      .update({ [user]: requestCount - 1 });
    return Object.values(next.val())[1];
  } catch (e) {
    return { error: 'error fetching next' };
  }
};

module.exports = {
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
      .child(`${channel}/${SETTINGS_REF}`)
      .once('value', (snap) => {
        return snap;
      });
    if (!snap.val()) {
      await globals.db
        .ref()
        .child(`${channel}/${SETTINGS_REF}`)
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
    return snap.val();
  } catch (e) {}
};

const getVideoInfo = async (song) => {
  if (/(soundcloud)/.exec(song))
    return { error: 'Soundcloud is not supported' };
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
      return axios
        .get(
          `https://www.youtube.com/oembed?url=https://youtu.be/${
            id[1]
          }&format=json`
        )
        .then((res) => {
          const { title, provider_name, author_name } = res.data;
          return {
            title: title,
            provider: provider_name,
            artist: author_name,
            url: song,
          };
        })
        .catch((err) => {
          return { error: 'Song Not Found' };
        });
    } else if (spotifyMatch1 || spotifyMatch2) {
      let tokens = await getSpotifyAuth();
      const id = spotifyMatch1 || spotifyMatch2;

      if (moment().unix() < tokens.expires_in) {
        tokens = await spotifyAuth();
      }

      return axios
        .get(`https://api.spotify.com/v1/tracks/${id[1]}`, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        .then((res) => {
          const { name, artists, uri } = res.data;
          const artist = artists.map((item) => item.name).join(', ');
          return {
            title: name,
            provider: 'Spotify',
            artist: artist,
            url: uri,
          };
        })
        .catch(async (err) => {
          return { error: 'song not found' };
        });
    } else {
      return axios
        .get(
          `https://www.youtube.com/oembed?url=https://youtu.be/${song}&format=json`
        )
        .then((res) => {
          const { title, provider_name, author_name } = res.data;
          return {
            title: title,
            provider: provider_name,
            artist: author_name,
            url: `https://youtu.be/${song}`,
          };
        })
        .catch((err) => {
          return { error: 'Song Not Found' };
        });
    }
  } catch (e) {
    console.log(e);
    return { error: 'song not found' };
  }
};
