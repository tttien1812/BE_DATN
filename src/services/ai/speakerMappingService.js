const mapTextToSegments = (speakerSegments, sttSegments) => {
  if (!speakerSegments.length || !sttSegments.length) return [];

  return speakerSegments.map((sp) => {
    let textParts = [];

    sttSegments.forEach((seg) => {
      const overlap = Math.min(sp.end, seg.end) - Math.max(sp.start, seg.start);

      const duration = seg.end - seg.start;

      // 🔥 FIX: tăng threshold để tránh dính 2 speaker
      if (overlap > 0 && overlap / duration > 0.2) {
        textParts.push(seg.text.trim());
      }
    });

    return {
      ...sp,
      text: textParts.join(" "),
    };
  });
};

const removeDuplicateSegments = (segments) => {
  if (!segments.length) return [];

  const result = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const prev = result[result.length - 1];
    const curr = segments[i];

    // 🔥 nếu text giống nhau → bỏ
    if (curr.text.trim() === prev.text.trim()) continue;

    result.push(curr);
  }

  return result;
};

export { mapTextToSegments, removeDuplicateSegments };
