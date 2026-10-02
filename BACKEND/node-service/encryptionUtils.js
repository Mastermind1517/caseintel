const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { KMSClient, GenerateDataKeyCommand, DecryptCommand } = require("@aws-sdk/client-kms");

const isKmsConfigured = Boolean(
  process.env.KMS_MASTER_KEY_ID &&
  !process.env.KMS_MASTER_KEY_ID.includes("xxxx") &&
  process.env.AWS_REGION
);

let kmsClient = null;
let KMS_KEY_ID = null;

if (isKmsConfigured) {
  try {
    kmsClient = new KMSClient({ region: process.env.AWS_REGION });
    KMS_KEY_ID = process.env.KMS_MASTER_KEY_ID;
    console.log("[ENCRYPTION] AWS KMS Client initialized with Key ID:", KMS_KEY_ID);
  } catch (err) {
    console.warn("[ENCRYPTION] Failed to initialize AWS KMS client:", err.message);
  }
} else {
  console.log("[ENCRYPTION] Running in Local Envelope Encryption mode (AES-256 Envelope with Local Master Key).");
}

// Local master key management for fallback envelope encryption
const VAULT_DIR = path.join(__dirname, 'secure_vault');
if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });

const LOCAL_KEY_FILE = path.join(VAULT_DIR, '.local_master.key');
function getLocalMasterKey() {
  if (fs.existsSync(LOCAL_KEY_FILE)) {
    return fs.readFileSync(LOCAL_KEY_FILE);
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(LOCAL_KEY_FILE, key, { mode: 0o600 });
  return key;
}

const encryptStream = async (readStream, writeStream) => {
  let Plaintext;
  let CiphertextBlob;

  if (kmsClient && KMS_KEY_ID) {
    const generateCmd = new GenerateDataKeyCommand({ KeyId: KMS_KEY_ID, KeySpec: "AES_256" });
    const res = await kmsClient.send(generateCmd);
    Plaintext = Buffer.from(res.Plaintext);
    CiphertextBlob = Buffer.from(res.CiphertextBlob);
  } else {
    // Local Envelope Encryption:
    // Generate ephemeral 256-bit data encryption key (DEK)
    Plaintext = crypto.randomBytes(32);
    // Wrap DEK with local master key using AES-256-GCM
    const masterKey = getLocalMasterKey();
    const wrapIv = crypto.randomBytes(12);
    const wrapCipher = crypto.createCipheriv('aes-256-gcm', masterKey, wrapIv);
    const encDek = Buffer.concat([wrapCipher.update(Plaintext), wrapCipher.final()]);
    const tag = wrapCipher.getAuthTag();
    // CiphertextBlob is: [12 bytes wrapIv] + [16 bytes tag] + [encDek]
    CiphertextBlob = Buffer.concat([wrapIv, tag, encDek]);
  }

  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Plaintext, iv);

    const edkLength = Buffer.alloc(2);
    edkLength.writeUInt16BE(CiphertextBlob.length, 0);

    writeStream.write(edkLength);
    writeStream.write(CiphertextBlob);
    writeStream.write(iv);

    readStream.pipe(cipher).pipe(writeStream);

    writeStream.on('finish', () => {
      Plaintext.fill(0); // Zeroize plaintext memory
      resolve();
    });
    writeStream.on('error', reject);
    cipher.on('error', reject);
  });
};

const decryptStream = async (readStream, responseStream) => {
  let headerParsed = false;
  let buffer = Buffer.alloc(0);
  let decipher;

  readStream.on('data', async (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    if (!headerParsed && buffer.length >= 2) {
      const edkLength = buffer.readUInt16BE(0);
      const totalHeaderSize = 2 + edkLength + 16;

      if (buffer.length >= totalHeaderSize) {
        headerParsed = true;

        const edk = buffer.subarray(2, 2 + edkLength);
        const iv = buffer.subarray(2 + edkLength, totalHeaderSize);
        const encryptedFileData = buffer.subarray(totalHeaderSize);

        let Plaintext;
        if (kmsClient && KMS_KEY_ID) {
          const decryptCmd = new DecryptCommand({ CiphertextBlob: edk });
          const res = await kmsClient.send(decryptCmd);
          Plaintext = Buffer.from(res.Plaintext);
        } else {
          // Unwrap DEK using local master key
          const masterKey = getLocalMasterKey();
          const wrapIv = edk.subarray(0, 12);
          const tag = edk.subarray(12, 28);
          const encDek = edk.subarray(28);

          const wrapDecipher = crypto.createDecipheriv('aes-256-gcm', masterKey, wrapIv);
          wrapDecipher.setAuthTag(tag);
          Plaintext = Buffer.concat([wrapDecipher.update(encDek), wrapDecipher.final()]);
        }

        decipher = crypto.createDecipheriv('aes-256-cbc', Plaintext, iv);
        decipher.pipe(responseStream);

        if (encryptedFileData.length > 0) {
          decipher.write(encryptedFileData);
        }
        Plaintext.fill(0); // Zeroize plaintext memory
      }
    } else if (headerParsed && decipher) {
      decipher.write(chunk);
    }
  });

  readStream.on('end', () => {
    if (decipher) decipher.end();
  });

  readStream.on('error', (err) => {
    console.error("ReadStream error:", err);
  });
};

const decryptFileToBuffer = async (filePath) => {
  const encBuffer = fs.readFileSync(filePath);
  if (encBuffer.length < 18) throw new Error("Encrypted payload too short");

  const edkLength = encBuffer.readUInt16BE(0);
  const totalHeaderSize = 2 + edkLength + 16;
  if (encBuffer.length < totalHeaderSize) throw new Error("Corrupted envelope header");

  const edk = encBuffer.subarray(2, 2 + edkLength);
  const iv = encBuffer.subarray(2 + edkLength, totalHeaderSize);
  const encryptedFileData = encBuffer.subarray(totalHeaderSize);

  let Plaintext;
  if (kmsClient && KMS_KEY_ID) {
    const decryptCmd = new DecryptCommand({ CiphertextBlob: edk });
    const res = await kmsClient.send(decryptCmd);
    Plaintext = Buffer.from(res.Plaintext);
  } else {
    const masterKey = getLocalMasterKey();
    const wrapIv = edk.subarray(0, 12);
    const tag = edk.subarray(12, 28);
    const encDek = edk.subarray(28);

    const wrapDecipher = crypto.createDecipheriv('aes-256-gcm', masterKey, wrapIv);
    wrapDecipher.setAuthTag(tag);
    Plaintext = Buffer.concat([wrapDecipher.update(encDek), wrapDecipher.final()]);
  }

  const decipher = crypto.createDecipheriv('aes-256-cbc', Plaintext, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedFileData), decipher.final()]);
  Plaintext.fill(0);
  return decrypted;
};

module.exports = { encryptStream, decryptStream, decryptFileToBuffer };