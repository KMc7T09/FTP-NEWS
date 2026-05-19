const blockedTerms = [
  'abuse',
  'vulgar',
  'hateword',
  'stupid',
  'idiot',
  'pagal',
  'chutiya',
  'chutia',
  'mc',
  'bc',
  'bkl',
  'gandu',
  'haraami',
  'harami',
  'sala',
  'salaa',
  'ଶଳା',
  'ଗାଳି',
];

export function hasVulgarContent(text = '') {
  const normalized = text.toLowerCase();
  return blockedTerms.some((term) => normalized.includes(term));
}

export function getModerationReason(text = '') {
  const normalized = text.toLowerCase();
  const found = blockedTerms.find((term) => normalized.includes(term));
  return found ? `Possible abusive/slang word: ${found}` : '';
}
