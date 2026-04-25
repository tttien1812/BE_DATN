const mergeSpeakerSegments = (segments, gap = 0.5) => {
  if (!segments.length) return [];

  segments.sort((a, b) => a.start - b.start);

  const result = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const prev = result[result.length - 1];
    const curr = segments[i];

    if (prev.speaker === curr.speaker && curr.start - prev.end < gap) {
      prev.end = curr.end;
    } else {
      result.push({ ...curr });
    }
  }

  return result;
};

export { mergeSpeakerSegments };
