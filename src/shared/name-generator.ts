// Random name generator for provider configurations

const ADJECTIVES = [
  'swift',
  'brave',
  'clever',
  'quick',
  'bold',
  'calm',
  'keen',
  'wild',
  'bright',
  'warm',
  'fierce',
  'gentle',
  'silent',
  'steady',
  'noble',
  'agile',
  'proud',
  'sharp',
  'vivid',
  'lively'
]

const NOUNS = [
  'falcon',
  'tiger',
  'fox',
  'eagle',
  'wolf',
  'hawk',
  'lion',
  'bear',
  'raven',
  'owl',
  'panther',
  'phoenix',
  'dragon',
  'otter',
  'lynx',
  'cobra',
  'heron',
  'jaguar',
  'condor',
  'viper'
]

/**
 * Generate a random name using the pattern: adjective-noun
 * Example: "swift-falcon", "brave-tiger"
 */
export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj}-${noun}`
}
