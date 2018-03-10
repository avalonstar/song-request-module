const globals = require('./globals');
const fetch = require('node-fetch');

const test = () => {
  return {
    status: 200,
    message: 'sup',
  }
}

const createRequest = async(values) => {
  if (!globals.db) return { error: 'no db found' };
  const { channel, user, song } = values;
  const listRef = `${channel}/song-request/song-list`;
  const userRef = `${channel}/song-request/user-list`;
  try {
    const video = await getVideoInfo(song);
    console.log(video)
    if (video.error) return video.error;

    const requestCount = await findUser(userRef, user);
    if (!requestCount || requestCount < 5) {
      globals.db.ref().child(`${userRef}`).update({ [user.toLowerCase()]: requestCount + 1 });
      globals.db.ref().child(`${listRef}`).push({
        ...video,
        url: song,
        user
      });
    }
    return {status: 200, ...video, user};
  } catch (e) {
    return e
  }
}


module.exports = {
  test,
  createRequest,
}

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
      };
    }
  } catch (e) {
    return { error: 'bad song url' };
  }
}
