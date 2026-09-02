const adjectives = ['fast', 'live', 'sharp', 'bold', 'clean', 'bright', 'swift', 'smart', 'cool', 'quick'];
const nouns = ['build', 'code', 'run', 'ship', 'push', 'drop', 'launch', 'hack', 'flow', 'grind'];

export function generateId() {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${randomAdjective}-${randomNoun}-${randomSuffix}`;
}