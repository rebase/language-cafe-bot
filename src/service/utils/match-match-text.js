// Submissions are grouped by this normalized form so that the closed, open and
// hyphenated spellings of one answer (waterfall / water fall / water-fall)
// count as the same word.
export const normalizeMatchMatchText = (value) => value.toUpperCase().replace(/[\s-]+/g, '');

export default normalizeMatchMatchText;
