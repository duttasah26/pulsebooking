// Makes one STAFF_ACCOUNTS entry: node scripts/hash-password.mjs <name> "<password>"
// (or: npm run hash-password -- <name> "<password>"). Put the printed line in STAFF_ACCOUNTS; separate people with commas.
import { randomBytes, scryptSync } from 'node:crypto';

const [name, password] = process.argv.slice(2);
if (!name || !password) {
  console.error('Usage: npm run hash-password -- <name> "<password>"');
  process.exit(1);
}
if (/[:,]/.test(name)) {
  console.error('The name cannot contain a colon or a comma.');
  process.exit(1);
}
const salt = randomBytes(16).toString('hex');
console.log(`${name}:scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`);
