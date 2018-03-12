const globals = require('./globals');
const fetch = require('node-fetch');
const formurlencoded = require('form-urlencoded');

const songList = '/song-request/song-list';
const userList = '/song-request/user-list';
const settingsRef = '/song-request/settings';

const test = async (values) => {
  const video = await getVideoInfo(values.song);
  console.log(video);
  return video;
};

const spotifyAuth = async () => {
  const auth = new Buffer(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  const ops = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: formurlencoded({
      grant_type: 'client_credentials',
    }),
  };
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', ops);
    console.log(r);
  } catch (e) {
    console.log(e);
  }
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

const getVideoInfo = async (song) => {
  if (!song) return { error: 'song not found' };
  const youtubeRegex = /(youtube.com\/watch\?v=)|(youtu.be\/)/gi;
  const spotifyRegex = /(open.spotify.com\/track)|(spotify:track)/gi;
  let youtubeSplit = song.split(youtubeRegex);
  let spotifySplit = song.split(spotifyRegex);
  try {
    if (youtubeSplit.length > 1) {
      const info = await fetch(
        `https://www.youtube.com/oembed?url=https://youtu.be/${split.pop()}&format=json`
      );
      const data = await info.json();
      return {
        title: data.title,
        provider: data.provider_name,
        authorName: data.author_name,
        url: song,
      };
    } else if (spotifySplit.length > 1) {
      return { song };
    } else {
      const info = await fetch(
        `https://www.youtube.com/oembed?url=https://youtu.be/${song}&format=json`
      );
      const data = await info.json();
      return {
        title: data.title,
        provider: data.provider_name,
        authorName: data.author_name,
        url: `https://youtu.be/${song}`,
      };
    }
  } catch (e) {
    return { error: 'song not found' };
  }
};
