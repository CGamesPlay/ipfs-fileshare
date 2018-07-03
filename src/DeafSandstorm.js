// @flow
import memoizeOne from "memoize-one";
import sodium from "libsodium-wrappers";
import base58 from "bs58";
import protobuf from "protobufjs/light";

import protobufSchema from "./message-protobuf.json";

export type UploadResult = {
  key: string,
  hash: string,
};

const Message = protobuf.Root.fromJSON(protobufSchema).lookupType("Message");

const api = {
  // Write the buffer to IPFS and return the resulting hash
  write(buffer: string | ArrayBuffer): Promise<string> {
    if (process.env.NODE_ENV === "development") {
      // Due to CORS, we cannot get the Ipfs-Hash header when using a
      // cross-domain POST request. Instead, target the HTTP API which returns
      // the hash in the response body.
      const body = new FormData();
      body.append("arg", new Blob([buffer]));
      return fetch("http://localhost:5001/api/v0/add?pin=false", {
        method: "POST",
        body,
      }).then(response => {
        if (response.ok) {
          return response.json().then(result => result.Hash);
        } else {
          throw new Error(
            `Failed to write: ${response.status} ${response.statusText}`,
          );
        }
      });
    } else {
      return fetch("/ipfs/", {
        method: "POST",
        body: buffer,
      }).then(response => {
        if (response.ok) {
          return response.headers.get("Ipfs-Hash");
        } else {
          throw new Error(
            `Failed to write: ${response.status} ${response.statusText}`,
          );
        }
      });
    }
  },

  // Download the given hash and return the resulting bytes.
  read(hash: string): Promise<ArrayBuffer> {
    return fetch(
      (process.env.NODE_ENV === "development"
        ? `http://localhost:8080/ipfs/`
        : `/ipfs/`) + hash,
    ).then(response => {
      if (response.ok) {
        return response.arrayBuffer();
      } else {
        throw new Error(
          `Failed to read: ${response.status} ${response.statusText}`,
        );
      }
    });
  },

  // Check if uploading to this IPFS gateway is allowed
  uploadingAllowed: memoizeOne(
    (): Promise<boolean> => {
      return api
        .write("test writable")
        .then(_ => true)
        .catch(_ => false);
    },
  ),

  // Generate a random key
  generateKey(): Promise<Uint8Array> {
    return sodium.ready.then(_ => sodium.crypto_secretbox_keygen());
  },

  // Encrypt the given data with the given key and return a protobuf containing
  // the resulting data.
  encrypt(key: Uint8Array, data: string | Uint8Array): Promise<ArrayBuffer> {
    return sodium.ready.then(_ => {
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
      const ciphertext = sodium.crypto_secretbox_easy(data, nonce, key);
      const version = 1;

      const message = Message.create({ nonce, ciphertext, version });
      const buffer = Message.encode(message).finish();
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteLength);
    });
  },

  // Decrypt the given buffer using the given key and return a buffer containing
  // the result
  decrypt(key: Uint8Array, buffer: ArrayBuffer): Promise<Uint8Array> {
    return sodium.ready.then(_ => {
      const message = Message.decode(new Uint8Array(buffer));
      const { nonce, ciphertext, version } = message;
      if (version !== 1) {
        throw new Error("Encryption format is too new");
      }
      return sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
    });
  },

  // Encrypt and upload the given data
  upload(data: Uint8Array): Promise<UploadResult> {
    return api.generateKey().then(key =>
      api.encrypt(key, data).then(message =>
        api.write(message).then(hash => ({
          key: base58.encode(key),
          hash: hash,
        })),
      ),
    );
  },

  // Download the given hash and decrypt with the given key
  download({ hash, key }: UploadResult): Promise<Uint8Array> {
    return api
      .read(hash)
      .then(message => api.decrypt(base58.decode(key), message));
  },
};

export default api;
