import "server-only";

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export function validPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export async function hashPassword(password: string) {
  if (!validPassword(password)) {
    throw new Error("Password does not meet the minimum policy.");
  }

  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });

  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, costValue, blockSizeValue, parallelizationValue, saltValue, keyValue] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !costValue || !blockSizeValue || !parallelizationValue || !saltValue || !keyValue) {
    return false;
  }

  const cost = Number.parseInt(costValue, 10);
  const blockSize = Number.parseInt(blockSizeValue, 10);
  const parallelization = Number.parseInt(parallelizationValue, 10);
  const salt = Buffer.from(saltValue, "base64url");
  const expectedKey = Buffer.from(keyValue, "base64url");
  if (!Number.isInteger(cost) || !Number.isInteger(blockSize) || !Number.isInteger(parallelization) || expectedKey.length !== KEY_LENGTH) {
    return false;
  }

  try {
    const actualKey = await scrypt(password, salt, expectedKey.length, {
      N: cost,
      r: blockSize,
      p: parallelization,
    });
    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}

export async function consumePasswordVerificationTime(password: string) {
  await scrypt(password, Buffer.from("cns-login-dummy-salt", "utf8"), KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
}
