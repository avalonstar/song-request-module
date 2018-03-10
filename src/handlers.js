const globals = require('./globals');
const fetch = require('node-fetch');

const songList = '/song-request/song-list'
const userList = '/song-request/user-list'

const test = () => {
  return {
    status: 200,
    message: 'sup',
  }
}

const createRequest = async(values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel, user, song } = values;
  if (!channel || !user | !song) return { error: 'invalid paramaters found'};
  const listRef = `${channel}/${songList}`;
  const userRef = `${channel}/${userList}`;
  try {
    const video = await getVideoInfo(song);
    console.log(video)
    if (video.error) return video.error;

    const requestCount = await findUser(userRef, user);
    if (!requestCount || requestCount < 5) {
      globals.db.ref().child(`${userRef}`).update({ [user.toLowerCase()]: requestCount + 1 });
      globals.db.ref().child(`${listRef}`).push({
        ...video,
        user
      });
      return {status: 200, ...video, user, message: 'success'};
    } else {
      return {status: 200, error: 'too many requests in queue'};
    }
  } catch (e) {
    return e
  }
}

const getNext = async(values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel } = values;
  if (!channel) return {error: 'invalid paramaters'}
  try {
    const snap = await globals.db.ref().child(`${channel}/${songList}`).limitToFirst(2).once('value', (snap) => {
      return snap;
    });
    if (snap.val() === {}) return null;
    return Object.values(snap.val())[1];
  } catch (e) {
    return e
  }
}

const getCurrent = async(values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel } = values;
  if (!channel) return {error: 'invalid paramaters'}
  try {
    const snap = await globals.db.ref().child(`${channel}/${songList}`).limitToFirst(1).once('value', (snap) => {
      return snap;
    });
    if (snap.val() === {}) return null;
    return Object.values(snap.val())[0];
  } catch (e) {
    return e
  }
}



module.exports = {
  test,
  createRequest,
  getNext,
  getCurrent,
};

const findUser = async(ref, user) => {
  try {
    const snap = await globals.db.ref().child(ref).child(`${user}`).once('value', (snap) => {
      return snap;
    });
    return snap.val();
  } catch (e) {
    return e
  }
}

const getVideoInfo = async(song) => {
  if (!song) return { error: 'song not found' };
  const youtubeRegex = /(youtube.com\/watch\?v=)|(youtu.be\/)/gi
  let split = song.split(youtubeRegex)
  try {
    if (split.length > 1) {
      const info = await fetch(`https://www.youtube.com/oembed?url=https://youtu.be/${split.pop()}&format=json`);
      const data = await info.json();
      return {
        title: data.title,
        provider: data.provider_name,
        authorName: data.author_name,
        url: song,
      };
    } else {
      const info = await fetch(`https://www.youtube.com/oembed?url=https://youtu.be/${song}&format=json`);
      const data = await info.json();
      return {
        title: data.title,
        provider: data.provider_name,
        authorName: data.author_name,
        url: `https://youtu.be/${song}`
      };
    }
  } catch (e) {
    return { error: 'song not found' };
  }
}
