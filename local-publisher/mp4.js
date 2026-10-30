import {open} from 'node:fs/promises';

const MAX_MOOV_BYTES = 64 * 1024 * 1024;

function fail(message) { throw new Error(message); }

function boxes(data, start = 0, end = data.length) {
  const result = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) fail('MP4 box header is truncated');
      const large = data.readBigUInt64BE(offset + 8);
      if (large > BigInt(Number.MAX_SAFE_INTEGER)) fail('MP4 box is too large');
      size = Number(large);
      header = 16;
    } else if (size === 0) size = end - offset;
    if (size < header || offset + size > end) fail('MP4 box size is invalid');
    result.push({type, start: offset, end: offset + size, header, size});
    offset += size;
  }
  if (offset !== end) fail('MP4 box list has trailing bytes');
  return result;
}

async function readAt(handle, position, length) {
  const buffer = Buffer.alloc(length);
  const {bytesRead} = await handle.read(buffer, 0, length, position);
  if (bytesRead !== length) fail('MP4 file is truncated');
  return buffer;
}

function find(list, type) { return list.find(box => box.type === type) || null; }
function children(buffer, box) { return boxes(buffer, box.start + box.header, box.end); }

function mediaClock(buffer, box, name) {
  if (!box || box.size < 24) fail(`MP4 ${name} box is missing or truncated`);
  const p = box.start + box.header;
  const version = buffer[p];
  if (version === 0) return {timescale: buffer.readUInt32BE(p + 12), duration: buffer.readUInt32BE(p + 16)};
  if (version === 1) {
    const duration = buffer.readBigUInt64BE(p + 24);
    if (duration > BigInt(Number.MAX_SAFE_INTEGER)) fail('MP4 duration is too large');
    return {timescale: buffer.readUInt32BE(p + 20), duration: Number(duration)};
  }
  fail(`Unsupported MP4 ${name} version`);
}

function handlerType(buffer, box) {
  if (!box || box.size < 20) return null;
  return buffer.toString('ascii', box.start + box.header + 8, box.start + box.header + 12);
}

function trackDimensions(buffer, box) {
  if (!box || box.size < 84) return null;
  const p = box.start + box.header;
  const version = buffer[p];
  const at = p + (version === 1 ? 88 : 76);
  if (at + 8 > box.end) return null;
  return {width: buffer.readUInt32BE(at) / 65536, height: buffer.readUInt32BE(at + 4) / 65536};
}

function sampleDescriptions(buffer, box) {
  if (!box || box.size < 16) return [];
  const entries = boxes(buffer, box.start + box.header + 8, box.end);
  return entries.map(entry => {
    const result = {codec: entry.type};
    const at = entry.start + 32;
    if (['avc1','avc3','hvc1','hev1'].includes(entry.type) && at + 4 <= entry.end) {
      result.width = buffer.readUInt16BE(at);
      result.height = buffer.readUInt16BE(at + 2);
    }
    if (entry.type === 'mp4a' && entry.start + 36 <= entry.end)
      result.sampleRate = buffer.readUInt32BE(entry.start + 32) / 65536;
    return result;
  });
}

function frameRate(buffer, box, timescale) {
  if (!box || box.size < 16 || !timescale) return null;
  const p = box.start + box.header;
  const count = buffer.readUInt32BE(p + 4);
  if (count < 1 || count > 100000) fail('MP4 frame timing table is invalid');
  let frames = 0;
  let ticks = 0;
  let offset = p + 8;
  for (let i = 0; i < count; i++, offset += 8) {
    if (offset + 8 > box.end) fail('MP4 frame timing table is truncated');
    const samples = buffer.readUInt32BE(offset);
    const delta = buffer.readUInt32BE(offset + 4);
    frames += samples;
    ticks += samples * delta;
  }
  return ticks > 0 ? frames * timescale / ticks : null;
}

/** Read MP4 container metadata without loading the potentially large media-data box. */
export async function inspectMp4(path) {
  const handle = await open(path, 'r');
  try {
    const {size:fileSize} = await handle.stat();
    if (fileSize < 32) fail('MP4 file is too small');
    let position = 0;
    let fileType = null;
    let movie = null;
    while (position + 8 <= fileSize) {
      const header = await readAt(handle, position, 8);
      let size = header.readUInt32BE(0);
      const type = header.toString('ascii', 4, 8);
      let boxHeader = 8;
      if (size === 1) {
        const extended = await readAt(handle, position + 8, 8);
        const large = extended.readBigUInt64BE(0);
        if (large > BigInt(Number.MAX_SAFE_INTEGER)) fail('MP4 box is too large');
        size = Number(large);
        boxHeader = 16;
      } else if (size === 0) size = fileSize - position;
      if (size < boxHeader || position + size > fileSize) fail('MP4 top-level box is invalid');
      if (type === 'ftyp') {
        if (size > 1024 * 1024) fail('MP4 file-type box is too large');
        fileType = await readAt(handle, position, size);
      } else if (type === 'moov') {
        if (size > MAX_MOOV_BYTES) fail('MP4 metadata exceeds the local inspection limit');
        movie = await readAt(handle, position, size);
      }
      position += size;
    }
    if (!fileType || fileType.toString('ascii', 4, 8) !== 'ftyp' || !movie) fail('MP4 must contain ftyp and moov boxes');
    const movieBoxes = boxes(movie, 8, movie.length);
    const tracks = movieBoxes.filter(box => box.type === 'trak').map(track => {
      const trackBoxes = children(movie, track);
      const tkhd = trackDimensions(movie, find(trackBoxes, 'tkhd'));
      const mdia = find(trackBoxes, 'mdia');
      const mediaBoxes = mdia ? children(movie, mdia) : [];
      const kind = handlerType(movie, find(mediaBoxes, 'hdlr'));
      const clock = mediaClock(movie, find(mediaBoxes, 'mdhd'), 'mdhd');
      const minf = find(mediaBoxes, 'minf');
      const minfBoxes = minf ? children(movie, minf) : [];
      const stbl = find(minfBoxes, 'stbl');
      const tableBoxes = stbl ? children(movie, stbl) : [];
      return {
        kind, ...tkhd, durationSeconds: clock.timescale ? clock.duration / clock.timescale : null,
        fps: kind === 'vide' ? frameRate(movie, find(tableBoxes, 'stts'), clock.timescale) : null,
        samples: sampleDescriptions(movie, find(tableBoxes, 'stsd'))
      };
    });
    const video = tracks.find(track => track.kind === 'vide');
    if (!video || !video.width || !video.height || !video.durationSeconds) fail('MP4 has no usable video track');
    const videoSample = video.samples.find(sample => ['avc1','avc3','hvc1','hev1'].includes(sample.codec));
    if (!videoSample) fail('MP4 video codec must be H.264 or HEVC');
    const audio = tracks.find(track => track.kind === 'soun');
    const audioSample = audio?.samples.find(sample => sample.codec === 'mp4a') || null;
    return {
      format: 'mp4', fileSize, width: Math.round(video.width), height: Math.round(video.height),
      fps: video.fps ? Math.round(video.fps * 100) / 100 : null,
      durationSeconds: Math.round(video.durationSeconds * 1000) / 1000,
      videoCodec: videoSample.codec,
      audioCodec: audio ? (audioSample?.codec || audio.samples[0]?.codec || 'unknown') : null,
      audioSampleRate: audioSample?.sampleRate || null
    };
  } finally { await handle.close(); }
}
